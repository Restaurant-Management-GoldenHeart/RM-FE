/**
 * KitchenPage.jsx — KDS (Kitchen Display System)
 *
 * Mobile: Tab-based layout (1 tab = 1 trạng thái, cuộn dọc)
 * Desktop: 4-cột Kanban ngang như cũ
 *
 * Polling tự động mỗi 3 giây (start mount, stop unmount)
 */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useKitchenStore } from '../store/useKitchenStore';
import toast from 'react-hot-toast';
import KitchenItemCard from '../components/Kitchen/KitchenItemCard';
import {
  ChefHat, RefreshCw, Flame, History,
  CheckCircle2, XCircle, Clock, X, UtensilsCrossed
} from 'lucide-react';
import { cn } from '../utils/cn';

// ─── SKELETON ────────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col gap-3 p-4 rounded-2xl border border-gray-100 bg-white">
    <div className="flex justify-between">
      <div className="h-5 w-1/2 bg-gray-100 rounded-lg" />
      <div className="h-8 w-8 bg-gray-100 rounded-xl" />
    </div>
    <div className="h-14 bg-gray-50 rounded-xl" />
    <div className="h-10 bg-gray-100 rounded-xl" />
  </div>
);

// ─── HISTORY MODAL ───────────────────────────────────────────────────────────

function HistoryModal({ isOpen, onClose, historyItems }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-900 rounded-xl">
              <History size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Lịch sử xử lý</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{historyItems.length} món gần nhất</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 opacity-30">
              <History size={40} />
              <p className="text-xs font-black uppercase mt-3">Chưa có lịch sử nào</p>
            </div>
          ) : (
            historyItems.map(item => (
              <div
                key={`${item.id}-${item.completedAt}`}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-2xl border',
                  item.status === 'CANCELLED'
                    ? 'bg-red-50/60 border-red-100'
                    : 'bg-emerald-50/60 border-emerald-100'
                )}
              >
                {item.status === 'CANCELLED'
                  ? <XCircle size={20} className="text-red-400 shrink-0" />
                  : <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{item.menuItemName}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {item.tableName} • SL: {item.quantity}
                    {item.status === 'CANCELLED' && item.cancelReason && (
                      <span className="text-red-500"> • {item.cancelReason}</span>
                    )}
                  </p>
                </div>
                <span className={cn(
                  'px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0',
                  item.status === 'CANCELLED'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-700'
                )}>
                  {item.status === 'CANCELLED' ? 'Đã hủy' : 'Xong'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COLUMN (Desktop Kanban) ──────────────────────────────────────────────────

function KitchenColumn({ title, count, color, items, onAction, isProcessing, isDone, isCancelled, isGrouped, emptyIcon }) {
  const groupedItems = useMemo(() => {
    if (!isGrouped) return null;
    const map = new Map();
    items.forEach(item => {
      const key = item.tableName || `Đơn #${item.orderId || item.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [items, isGrouped]);

  return (
    <div className="flex-1 min-w-[300px] max-w-[380px] flex flex-col bg-white/50 rounded-3xl border border-gray-200/50 overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white/80 shrink-0">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full shadow-sm', color)} />
          {title}
        </h2>
        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600 tabular-nums">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-20 grayscale scale-75">
            {emptyIcon}
            <p className="text-[10px] font-black uppercase mt-2">Trống</p>
          </div>
        ) : isGrouped ? (
          groupedItems.map(([tableName, tableItems]) => (
            <div key={tableName} className="bg-gray-50/50 p-2.5 rounded-3xl border border-gray-100/60 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-gray-500 mb-2 px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {tableName}
              </h3>
              <div className="space-y-2.5">
                {tableItems.map(item => (
                  <KitchenItemCard key={item.id} item={item} onAction={onAction} />
                ))}
              </div>
            </div>
          ))
        ) : (
          items.map(item => (
            <KitchenItemCard
              key={item.id} item={item} onAction={onAction}
              isHistory={isCancelled || isDone} isDone={isDone} isCancelled={isCancelled}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── MOBILE TAB PANEL ────────────────────────────────────────────────────────

function MobileTabPanel({ items, onAction, isProcessing, isDone, isCancelled, isGrouped, emptyIcon, isLoading }) {
  const groupedItems = useMemo(() => {
    if (!isGrouped) return null;
    const map = new Map();
    items.forEach(item => {
      const key = item.tableName || `Đơn #${item.orderId || item.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries());
  }, [items, isGrouped]);

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-25">
        {emptyIcon}
        <p className="text-xs font-black uppercase mt-3 tracking-widest">Trống</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 pb-6">
      {isGrouped
        ? groupedItems.map(([tableName, tableItems]) => (
            <div key={tableName} className="bg-gray-50 rounded-3xl p-3 border border-gray-100">
              <h3 className="text-[10px] font-black uppercase text-gray-400 mb-2.5 px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {tableName} — {tableItems.length} món
              </h3>
              <div className="space-y-2.5">
                {tableItems.map(item => (
                  <KitchenItemCard key={item.id} item={item} onAction={onAction} />
                ))}
              </div>
            </div>
          ))
        : items.map(item => (
            <KitchenItemCard
              key={item.id} item={item} onAction={onAction}
              isHistory={isCancelled || isDone} isDone={isDone} isCancelled={isCancelled}
            />
          ))
      }
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'pending',    label: 'Chờ nấu',  shortLabel: 'Chờ',    color: 'bg-gray-500',    textActive: 'text-gray-700',   bgActive: 'bg-gray-100',   dot: 'bg-gray-500'    },
  { id: 'processing', label: 'Đang nấu', shortLabel: 'Nấu',    color: 'bg-amber-500',   textActive: 'text-amber-700',  bgActive: 'bg-amber-50',   dot: 'bg-amber-500'   },
  { id: 'ready',      label: 'Sẵn sàng', shortLabel: 'Xong',   color: 'bg-emerald-500', textActive: 'text-emerald-700',bgActive: 'bg-emerald-50', dot: 'bg-emerald-500' },
  { id: 'cancelled',  label: 'Đã hủy',   shortLabel: 'Hủy',    color: 'bg-red-400',     textActive: 'text-red-700',    bgActive: 'bg-red-50',     dot: 'bg-red-400'     },
];

export default function KitchenPage() {
  const pendingItems        = useKitchenStore(s => s.pendingItems);
  const historyItems        = useKitchenStore(s => s.historyItems);
  const paidOrderIds        = useKitchenStore(s => s.paidOrderIds);
  const isLoading           = useKitchenStore(s => s.isLoading);
  const pollingActive       = useKitchenStore(s => s.pollingActive);
  const startPolling        = useKitchenStore(s => s.startPolling);
  const stopPolling         = useKitchenStore(s => s.stopPolling);
  const fetchPendingOrders  = useKitchenStore(s => s.fetchPendingOrders);
  const completeOrderItem   = useKitchenStore(s => s.completeOrderItem);
  const startCookingItem    = useKitchenStore(s => s.startCookingItem);
  const fetchMenuItems      = useKitchenStore(s => s.fetchMenuItems);
  const fetchInventoryItems = useKitchenStore(s => s.fetchInventoryItems);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeTab, setActiveTab]         = useState('pending');

  useEffect(() => {
    fetchMenuItems();
    fetchInventoryItems();
    startPolling();
    return () => stopPolling();
  }, []);

  const columns = useMemo(() => {
    const pending = pendingItems
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const processing = pendingItems
      .filter(i => i.status === 'PROCESSING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const ready = historyItems
      .filter(i => i.status === 'COMPLETED' && !paidOrderIds.has(i.orderId))
      .slice(0, 20);

    const cancelled = historyItems
      .filter(i => i.status === 'CANCELLED' && !paidOrderIds.has(i.orderId))
      .slice(0, 20);

    return { pending, processing, ready, cancelled };
  }, [pendingItems, historyItems, paidOrderIds]);

  const counts = {
    pending:    columns.pending.length,
    processing: columns.processing.length,
    ready:      columns.ready.length,
    cancelled:  columns.cancelled.length,
  };

  const handleRefresh = useCallback(() => {
    fetchPendingOrders();
    toast.success('Đã cập nhật danh sách mới nhất');
  }, [fetchPendingOrders]);

  const activeTabCfg = TABS.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col h-full bg-[#f4f4f7] overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 px-4 md:px-8 py-3.5 md:py-5 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2.5 md:p-3 bg-gray-900 rounded-xl md:rounded-2xl shadow-lg shrink-0">
            <ChefHat size={20} className="text-white md:w-7 md:h-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 leading-none">
              <span className="truncate">KDS — Điều phối bếp</span>
              <span className={cn(
                'w-2 h-2 rounded-full animate-pulse shrink-0',
                pollingActive ? 'bg-emerald-500' : 'bg-gray-300'
              )} />
            </h1>
            <p className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Tự động cập nhật mỗi 3s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Lịch sử */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-all font-bold text-xs md:text-sm shadow-sm active:scale-95"
          >
            <History size={15} />
            <span className="hidden sm:inline">Lịch sử</span>
            {historyItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center tabular-nums">
                {historyItems.length}
              </span>
            )}
          </button>

          {/* Làm mới */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 transition-all font-bold text-xs md:text-sm shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </header>

      {/* ── MOBILE LAYOUT ────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">

        {/* Status count bar */}
        <div className="shrink-0 px-3 pt-3 pb-1 flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 rounded-2xl border transition-all active:scale-95',
                activeTab === tab.id
                  ? `${tab.bgActive} border-transparent shadow-md`
                  : 'bg-white border-gray-100 shadow-sm'
              )}
            >
              <span className={cn(
                'text-lg font-black leading-none tabular-nums',
                activeTab === tab.id ? tab.textActive : 'text-gray-700'
              )}>
                {counts[tab.id]}
              </span>
              <span className={cn(
                'text-[9px] font-black uppercase tracking-widest mt-1',
                activeTab === tab.id ? tab.textActive : 'text-gray-400'
              )}>
                {tab.shortLabel}
              </span>
              {activeTab === tab.id && (
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5', tab.dot)} />
              )}
            </button>
          ))}
        </div>

        {/* Active tab label */}
        <div className="shrink-0 px-4 py-2 flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', activeTabCfg.dot)} />
          <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">
            {activeTabCfg.label}
            {counts[activeTab] > 0 && (
              <span className="ml-2 text-gray-400">— {counts[activeTab]} món</span>
            )}
          </span>
          {activeTab === 'pending' && counts.pending > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Flame size={10} /> Ưu tiên xử lý
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'pending' && (
            <MobileTabPanel
              items={columns.pending} onAction={startCookingItem}
              isGrouped isLoading={isLoading}
              emptyIcon={<Flame size={44} />}
            />
          )}
          {activeTab === 'processing' && (
            <MobileTabPanel
              items={columns.processing} onAction={completeOrderItem}
              isProcessing isLoading={isLoading}
              emptyIcon={<UtensilsCrossed size={44} />}
            />
          )}
          {activeTab === 'ready' && (
            <MobileTabPanel
              items={columns.ready}
              isDone isHistory isLoading={isLoading}
              emptyIcon={<CheckCircle2 size={44} />}
            />
          )}
          {activeTab === 'cancelled' && (
            <MobileTabPanel
              items={columns.cancelled}
              isCancelled isHistory isLoading={isLoading}
              emptyIcon={<XCircle size={44} />}
            />
          )}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (4 cột Kanban) ────────────────────────── */}
      <main className="hidden md:flex flex-1 gap-4 p-4 overflow-x-auto no-scrollbar bg-[#eef0f4]">
        <KitchenColumn
          title="Chờ chế biến" count={columns.pending.length}
          color="bg-gray-400" emptyIcon={<Flame size={48} />}
          items={columns.pending} onAction={startCookingItem} isGrouped
        />
        <KitchenColumn
          title="Đang nấu" count={columns.processing.length}
          color="bg-amber-500" emptyIcon={<Flame size={48} />}
          items={columns.processing} onAction={completeOrderItem} isProcessing
        />
        <KitchenColumn
          title="Sẵn sàng phục vụ" count={columns.ready.length}
          color="bg-emerald-500" emptyIcon={<CheckCircle2 size={48} />}
          items={columns.ready} isDone
        />
        <KitchenColumn
          title="Món đã hủy" count={columns.cancelled.length}
          color="bg-red-400" emptyIcon={<XCircle size={48} />}
          items={columns.cancelled} isCancelled
        />
      </main>

      {/* ── History Modal ── */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyItems={historyItems}
      />
    </div>
  );
}
