import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, History, ArrowUpRight, ArrowDownRight, RefreshCw,
  Loader2, Package, AlertCircle, User, Calendar,
} from 'lucide-react';
import { inventoryApi } from '../../api/inventoryApi';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── Skeleton row ──────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/30 border border-white/40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-200/60 shrink-0" />
        <div className="space-y-2">
          <div className="h-2.5 w-16 bg-gray-200/70 rounded-full" />
          <div className="h-3.5 w-32 bg-gray-300/60 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-5 w-14 bg-gray-200/70 rounded-xl" />
        <div className="h-4 w-24 bg-gray-100/60 rounded-full" />
      </div>
    </div>
  );
}

// ─── Formatters ────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'HH:mm · dd/MM/yyyy', { locale: vi }); }
  catch { return d; }
};

// ─── Action type meta ──────────────────────────────────────────────
const getLogMeta = (log) => {
  const delta = getDelta(log);
  const type = (log.actionType ?? '').toUpperCase();
  if (type.includes('CREAT') || delta > 0)
    return { label: type.includes('CREAT') ? 'Tạo mới' : 'Nhập kho', Icon: ArrowUpRight, color: 'emerald' };
  if (type.includes('DELET') || delta < 0)
    return { label: type.includes('DELET') ? 'Xóa bỏ' : 'Xuất kho', Icon: ArrowDownRight, color: 'red' };
  return { label: 'Điều chỉnh', Icon: RefreshCw, color: 'amber' };
};

const getDelta = (log) => {
  const a = log.afterQuantity ?? null, b = log.beforeQuantity ?? null;
  if (a !== null && b !== null) return Number(a) - Number(b);
  return log.quantityChange ?? 0;
};

const colorMap = {
  emerald: {
    icon: 'bg-emerald-50/60 text-emerald-600',
    badge: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    value: 'text-emerald-600',
  },
  red: {
    icon: 'bg-red-50/60 text-red-600',
    badge: 'bg-red-50 border-red-100 text-red-600',
    value: 'text-red-600',
  },
  amber: {
    icon: 'bg-amber-50/60 text-amber-600',
    badge: 'bg-amber-50 border-amber-100 text-amber-600',
    value: 'text-amber-600',
  },
};

// ─── Main Modal ────────────────────────────────────────────────────
export default function InventoryHistoryModal({ isOpen, onClose, selectedItem }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen && selectedItem?.inventoryId) {
      setHistory([]);
      setPage(0);
      setHasError(false);
      fetchHistory(0);
    } else if (!isOpen) {
      setHistory([]);
      setPage(0);
      setTotalPages(0);
      setTotalElements(0);
      setHasError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedItem]);

  const fetchHistory = async (p) => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await inventoryApi.getInventoryHistory(selectedItem.inventoryId, { page: p, size: 10 });
      if (res?.data?.content !== undefined) {
        setHistory(prev => p === 0 ? res.data.content : [...prev, ...res.data.content]);
        setTotalPages(res.data.totalPages ?? 0);
        setTotalElements(res.data.totalElements ?? 0);
        setPage(p);
      }
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const unitSymbol = selectedItem?.unitSymbol ?? '';
  const itemName = selectedItem?.ingredientName ?? selectedItem?.itemName ?? 'Sản phẩm';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={onClose} />

      {/* Modal — Glassmorphism panel */}
      <div className="relative z-10 w-full max-w-2xl bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_32px_80px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col max-h-[88vh]">

        {/* ─── Header ─── */}
        <div className="px-7 pt-5 pb-4 border-b border-white/60 bg-white/40 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gray-900/90 flex items-center justify-center shadow-lg">
              <History size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Lịch sử kho</h3>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-0.5 truncate max-w-[260px]">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition-all active:scale-90 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-gradient-to-b from-white/10 to-white/5">

          {/* Error banner */}
          {hasError && (
            <div className="flex items-start gap-3 p-4 bg-red-50/50 border border-red-100/60 rounded-2xl backdrop-blur-sm">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Không thể tải lịch sử</p>
                <p className="text-xs text-red-500 mt-1">Đã xảy ra lỗi. Vui lòng thử lại.</p>
              </div>
            </div>
          )}

          {/* Skeleton on first load */}
          {loading && page === 0 ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : history.length === 0 && !loading ? (
            /* Empty */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white/60 rounded-3xl flex items-center justify-center border border-white/80 shadow-sm mb-4">
                <Package size={24} className="text-gray-200" />
              </div>
              <p className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Chưa có biến động</p>
              <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                Nguyên liệu này chưa có giao dịch nào.
              </p>
            </div>
          ) : (
            <>
              {history.map((log, idx) => {
                const meta = getLogMeta(log);
                const cls = colorMap[meta.color];
                const delta = getDelta(log);
                const dateStr = log.occurredAt ?? log.createdAt;

                return (
                  <div
                    key={log.id ?? idx}
                    className="group bg-white/50 backdrop-blur-sm border border-white/70 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-white/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-200"
                  >
                    {/* Left */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${cls.icon}`}>
                        <meta.Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${cls.badge}`}>
                            {meta.label}
                          </span>
                          {log.actedByFullName && (
                            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                              <User size={9} />
                              {log.actedByFullName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-700 truncate max-w-[240px] leading-tight">
                          {log.note || log.summary || (meta.label === 'Nhập kho' ? 'Nhập nguyên liệu' : meta.label === 'Xuất kho' ? 'Xuất nguyên liệu' : 'Cập nhật số dư')}
                        </p>
                        <p className="text-[9px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                          <Calendar size={9} />
                          {formatDate(dateStr)}
                        </p>
                      </div>
                    </div>

                    {/* Right: delta */}
                    <div className="shrink-0 text-right">
                      {delta !== 0
                        ? (
                          <span className={`text-base font-black tabular-nums tracking-tighter ${cls.value}`}>
                            {delta > 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(delta)}
                            {unitSymbol && <span className="text-[9px] font-bold ml-1 opacity-50">{unitSymbol}</span>}
                          </span>
                        )
                        : <span className="text-sm text-gray-300 font-bold">—</span>
                      }
                    </div>
                  </div>
                );
              })}

              {/* Load more */}
              {page < totalPages - 1 && (
                <div className="pt-3 pb-1 text-center">
                  <button
                    onClick={() => fetchHistory(page + 1)}
                    disabled={loading}
                    className="px-8 py-3 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-sm text-gray-600 font-bold text-xs uppercase tracking-widest hover:bg-white hover:shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2.5"
                  >
                    {loading
                      ? <Loader2 size={14} className="animate-spin text-orange-500" />
                      : <RefreshCw size={14} className="text-orange-500" />}
                    Tải thêm dữ liệu
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-7 py-4 border-t border-white/60 bg-white/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tổng cộng&nbsp;<span className="text-gray-700 font-black">{totalElements}</span>&nbsp;bản ghi
            </p>
          </div>
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest hidden sm:block">
            Inventory Audit Log
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
