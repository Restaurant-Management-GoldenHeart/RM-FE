import React, { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
    ArrowLeft, History, ArrowUpRight, ArrowDownRight, RefreshCw,
    Search, AlertCircle, Package, Clock, ChevronRight,
    Zap, TrendingUp, TrendingDown, Activity, WifiOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../api/inventoryApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── Config ────────────────────────────────────────────────────────
const MAX_ITEMS = 20;
const HISTORY_PER_ITEM = 15;

// ─── Format helpers ────────────────────────────────────────────────
const fmt = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'HH:mm · dd/MM/yyyy', { locale: vi }); }
    catch { return d; }
};
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0);

// ─── Skeleton ──────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="animate-pulse bg-white/50 backdrop-blur-sm border border-white/70 rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-gray-200/60 shrink-0" />
                    <div className="space-y-2.5">
                        <div className="flex gap-2">
                            <div className="h-4 w-16 bg-gray-200/60 rounded-full" />
                            <div className="h-4 w-28 bg-gray-100/60 rounded-full" />
                        </div>
                        <div className="h-5 w-40 bg-gray-300/50 rounded-lg" />
                        <div className="h-3 w-52 bg-gray-100/60 rounded-full" />
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="h-6 w-16 bg-gray-200/60 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// ─── Sidebar stat row ──────────────────────────────────────────────
function StatRow({ label, value, cls = 'text-white' }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-none">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
            <span className={`text-base font-black tabular-nums tracking-tighter ${cls}`}>{value}</span>
        </div>
    );
}

// ─── Log meta ──────────────────────────────────────────────────────
const getLogMeta = (log) => {
    const type = (log.actionType ?? log.changeType ?? '').toUpperCase();
    const delta = (log.afterQuantity != null && log.beforeQuantity != null)
        ? Number(log.afterQuantity) - Number(log.beforeQuantity)
        : log.quantityChange ?? 0;

    if (type.includes('CREAT') || type.includes('IMPORT') || delta > 0)
        return { label: type.includes('CREAT') ? 'Tạo mới' : 'Nhập kho', Icon: ArrowUpRight, iconCls: 'bg-emerald-50/60 text-emerald-600', badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-100', valCls: 'text-emerald-600' };
    if (type.includes('DELET') || type.includes('EXPORT') || delta < 0)
        return { label: type.includes('DELET') ? 'Xóa' : 'Xuất kho', Icon: ArrowDownRight, iconCls: 'bg-red-50/60 text-red-600', badgeCls: 'bg-red-50 text-red-600 border-red-100', valCls: 'text-red-600' };
    return { label: 'Điều chỉnh', Icon: RefreshCw, iconCls: 'bg-amber-50/60 text-amber-600', badgeCls: 'bg-amber-50 text-amber-600 border-amber-100', valCls: 'text-amber-600' };
};

// ─── Page ──────────────────────────────────────────────────────────
export default function InventoryHistoryPage() {
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // STEP 1: Fetch item list
    const { data: itemsData, isLoading: itemsLoading } = useQuery({
        queryKey: ['inventoryItems-forHistory'],
        queryFn: () => inventoryApi.getInventoryItems({ size: MAX_ITEMS }),
        staleTime: 2 * 60_000,
    });
    const items = useMemo(() => itemsData?.data?.content ?? [], [itemsData]);

    // STEP 2: useQueries — one per item, error-resilient
    const historyQueries = useQueries({
        queries: items.map(item => ({
            queryKey: ['inventoryHistory', item.inventoryId ?? item.id],
            queryFn: () => inventoryApi.getInventoryHistory(item.inventoryId ?? item.id, { page: 0, size: HISTORY_PER_ITEM }),
            enabled: !!(item.inventoryId ?? item.id),
            staleTime: 60_000,
            retry: 1,
            throwOnError: false,
        })),
    });

    // STEP 3: Merge + sort
    const allLogs = useMemo(() => {
        return historyQueries
            .flatMap((q, idx) => {
                const item = items[idx];
                if (!q.data?.data?.content) return [];
                return q.data.data.content.map(log => ({
                    ...log,
                    _itemName: item?.ingredientName ?? item?.itemName ?? 'Unknown',
                    _unitSymbol: item?.unitSymbol ?? '',
                }));
            })
            .sort((a, b) => new Date(b.occurredAt ?? b.createdAt ?? 0) - new Date(a.occurredAt ?? a.createdAt ?? 0));
    }, [historyQueries, items]);

    // STEP 4: Client-side filter
    const filteredLogs = useMemo(() => {
        const s = searchTerm.toLowerCase();
        return allLogs.filter(log => {
            const matchSearch = log._itemName.toLowerCase().includes(s)
                || (log.note ?? '').toLowerCase().includes(s)
                || (log.actedByFullName ?? '').toLowerCase().includes(s);
            const type = (log.actionType ?? '').toUpperCase();
            const matchType = filterType === 'ALL' || type.includes(filterType);
            return matchSearch && matchType;
        });
    }, [allLogs, searchTerm, filterType]);

    // Derived
    const isAnyLoading = itemsLoading || historyQueries.some(q => q.isLoading);
    const failedCount = historyQueries.filter(q => q.isError).length;
    const loadedCount = historyQueries.filter(q => q.isSuccess).length;
    const importCount = allLogs.filter(l => (l.actionType ?? '').includes('CREAT') || (l.actionType ?? '').includes('IMPORT') || (l.quantityChange > 0)).length;
    const exportCount = allLogs.filter(l => (l.actionType ?? '').includes('DELET') || (l.actionType ?? '').includes('EXPORT') || (l.quantityChange < 0)).length;
    const updateCount = allLogs.filter(l => (l.actionType ?? '').includes('UPDAT') || (l.actionType ?? '').includes('ADJUST')).length;

    const getDelta = (log) => {
        const a = log.afterQuantity ?? null, b = log.beforeQuantity ?? null;
        if (a !== null && b !== null) return Number(a) - Number(b);
        return log.quantityChange ?? null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f4f6f9] to-[#ffffff] pb-24">

            {/* ─── Header ─── */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sticky top-0 z-30">
                <div className="max-w-screen-xl mx-auto px-6 h-[72px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/inventory"
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-gray-400 hover:text-orange-500 hover:bg-orange-50/50 transition-all active:scale-90 shadow-sm"
                            aria-label="Quay lại"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gray-900/90 flex items-center justify-center shadow-lg">
                                <History size={17} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight">Lịch sử Kho</h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                    Nhật ký biến động · {MAX_ITEMS} mặt hàng gần nhất
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        {failedCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50/60 border border-red-100/60 rounded-2xl backdrop-blur-sm">
                                <WifiOff size={13} className="text-red-500" />
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">{failedCount} lỗi</span>
                            </div>
                        )}
                        <div className="px-4 py-2 bg-white/60 border border-white/80 rounded-2xl backdrop-blur-sm shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                {isAnyLoading ? 'Đang tải…' : 'Tổng cộng'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {isAnyLoading
                                    ? <RefreshCw size={11} className="animate-spin text-orange-500" />
                                    : <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                                <span className="text-xs font-black text-gray-900">{allLogs.length} bản ghi</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-screen-xl mx-auto px-6 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* ── LEFT: Controls + Log list ── */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* Search + Filter */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="search"
                                    placeholder="Tìm theo tên, ghi chú, người thao tác…"
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-sm text-sm font-semibold text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:bg-white/80 transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-white/60 backdrop-blur-sm p-1 rounded-2xl border border-white/80 shadow-sm gap-0.5 h-[50px]">
                                {[
                                    { id: 'ALL', label: 'Tất cả', icon: Activity },
                                    { id: 'CREAT', label: 'Tạo mới', icon: TrendingUp },
                                    { id: 'UPDAT', label: 'Cập nhật', icon: RefreshCw },
                                    { id: 'DELET', label: 'Xóa', icon: TrendingDown },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setFilterType(id)}
                                        className={`px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterType === id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-800 hover:bg-white/60'
                                            }`}
                                    >
                                        <Icon size={11} />
                                        <span className="hidden sm:inline">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Partial failure banner */}
                        {failedCount > 0 && (
                            <div className="flex items-start gap-3 p-4 bg-yellow-50/50 border border-yellow-100/60 rounded-2xl backdrop-blur-sm">
                                <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider">
                                        {failedCount}/{historyQueries.length} item không tải được
                                    </p>
                                    <p className="text-xs text-yellow-600 mt-1">{loadedCount} item còn lại vẫn hiển thị đầy đủ.</p>
                                </div>
                            </div>
                        )}

                        {/* Log list */}
                        {isAnyLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="bg-white/50 backdrop-blur-sm border border-white/70 rounded-[2.5rem] py-20 text-center">
                                <div className="w-16 h-16 bg-white/60 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/80">
                                    <Package size={24} className="text-gray-200" />
                                </div>
                                <p className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">
                                    {searchTerm || filterType !== 'ALL' ? 'Không tìm thấy kết quả' : 'Chưa có dữ liệu'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {searchTerm || filterType !== 'ALL' ? 'Thử thay đổi bộ lọc.' : 'Chưa có biến động nào được ghi nhận.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredLogs.map((log, idx) => {
                                    const meta = getLogMeta(log);
                                    const delta = getDelta(log);
                                    return (
                                        <div
                                            key={log.id ?? `${log.inventoryId}-${idx}`}
                                            className="group bg-white/50 backdrop-blur-sm border border-white/70 rounded-[1.75rem] px-5 py-4 hover:bg-white/80 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 ${meta.iconCls}`}>
                                                        <meta.Icon size={20} />
                                                    </div>
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${meta.badgeCls}`}>
                                                                {meta.label}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                <Clock size={10} />{fmt(log.occurredAt ?? log.createdAt)}
                                                            </span>
                                                            {log.actedByFullName && (
                                                                <span className="text-[10px] font-bold text-gray-400">· {log.actedByFullName}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-black text-gray-900 tracking-tight truncate max-w-xs">
                                                            {log.ingredientName ?? log._itemName}
                                                        </p>
                                                        {(log.summary || log.note) && (
                                                            <p className="text-xs text-gray-400 truncate max-w-sm">{log.summary || log.note}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pl-16 md:pl-0 border-t md:border-none pt-3 md:pt-0 border-white/50">
                                                    {delta !== null ? (
                                                        <span className={`text-xl font-black tabular-nums tracking-tighter ${meta.valCls}`}>
                                                            {delta > 0 ? '+' : ''}{fmtNum(delta)}
                                                            <span className="text-[10px] uppercase ml-1 opacity-50 font-bold">{log.unitSymbol ?? log._unitSymbol}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-gray-300 font-bold">—</span>
                                                    )}
                                                    <Link
                                                        to="/inventory"
                                                        className="p-2.5 bg-white/60 border border-white/80 text-gray-400 rounded-xl hover:bg-orange-50 hover:text-orange-500 hover:border-orange-100 transition-all shrink-0"
                                                        aria-label="Xem trong kho"
                                                    >
                                                        <ChevronRight size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {historyQueries.some(q => q.isLoading) && (
                                    <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Đang tải thêm…</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── RIGHT: Sidebar ── */}
                    <div className="space-y-4">
                        {/* Summary dark card */}
                        <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl p-7 text-white relative overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-white/5">
                            <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/10 rounded-full -mr-14 -mt-14 blur-2xl pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                        <Zap size={16} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">Tổng kết</p>
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{MAX_ITEMS} items gần nhất</p>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <StatRow label="Tổng bản ghi" value={allLogs.length} />
                                    <StatRow label="Hiển thị" value={filteredLogs.length} cls="text-orange-400" />
                                    <StatRow label="Tạo / Nhập" value={importCount} cls="text-emerald-400" />
                                    <StatRow label="Xóa / Xuất" value={exportCount} cls="text-red-400" />
                                    <StatRow label="Điều chỉnh" value={updateCount} cls="text-sky-400" />
                                </div>
                            </div>
                        </div>

                        {/* Progress card */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Trạng thái tải</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-gray-500">
                                    <span>Đã tải</span>
                                    <span className="tabular-nums">{loadedCount} / {historyQueries.length}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100/80 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-[width] duration-700"
                                        style={{ width: historyQueries.length > 0 ? `${(loadedCount / historyQueries.length) * 100}%` : '0%' }}
                                    />
                                </div>
                                {failedCount > 0 && (
                                    <p className="text-[10px] font-bold text-red-400 flex justify-between">
                                        <span>Bị lỗi</span>
                                        <span>{failedCount} item</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Info note */}
                        <div className="bg-orange-50/50 border border-orange-100/60 rounded-3xl p-5 backdrop-blur-sm flex items-start gap-3">
                            <AlertCircle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-semibold text-orange-700/70 leading-relaxed">
                                Hiển thị {HISTORY_PER_ITEM} bản ghi gần nhất của mỗi item trong {MAX_ITEMS} item mới nhất.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
