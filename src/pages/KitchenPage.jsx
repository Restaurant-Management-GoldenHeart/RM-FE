/**
 * KitchenPage.jsx — Màn hình KDS (Kitchen Display System)
 *
 * Kiến trúc:
 *   1. Dùng useKitchenStore để quản lý state bếp
 *   2. Polling tự động mỗi 3 giây (start khi mount, stop khi unmount)
 *   3. Nhóm món theo bàn để bếp dễ xử lý
 *
 * Cấu trúc 4 cột:
 *   Cột 1: Chờ chế biến (PENDING)          — nhóm theo bàn
 *   Cột 2: Đang nấu     (PROCESSING)        — từng món riêng lẻ
 *   Cột 3: Sẵn sàng     (COMPLETED)         — lọc từ historyItems
 *   Cột 4: Đã hủy       (CANCELLED)         — lọc từ historyItems
 *
 * Nút Lịch sử trên Header: mở Modal xem lại 50 món đã xử lý gần nhất.
 *
 * ⚠️ NOTE: Polling là giải pháp tạm thời vì BE chưa có WebSocket.
 * → Khi BE implement WebSocket (SockJS/STOMP) → thay thế polling này.
 */
import React, { useEffect, useCallback, useMemo, useState, Fragment } from 'react';
import { useKitchenStore } from '../store/useKitchenStore';
import toast from 'react-hot-toast';
import KitchenItemCard from '../components/Kitchen/KitchenItemCard';
import {
  ChefHat, RefreshCw, Flame, History,
  CheckCircle2, XCircle, Clock, X
} from 'lucide-react';
import { cn } from '../utils/cn';

/** Hiệu ứng skeleton khi đang tải lần đầu */
const SkeletonCard = () => (
  <div className="animate-pulse flex flex-col gap-4 p-5 rounded-2xl border border-gray-100 bg-white">
    <div className="flex justify-between">
      <div className="h-6 w-2/3 bg-gray-100 rounded-lg" />
      <div className="h-10 w-10 bg-gray-100 rounded-xl" />
    </div>
    <div className="h-16 bg-gray-50 rounded-xl" />
    <div className="h-4 w-1/3 bg-gray-50 rounded" />
    <div className="h-12 bg-gray-50 rounded-xl mt-1" />
  </div>
);

/**
 * HistoryModal — Modal xem lại toàn bộ 50 món đã xử lý gần nhất.
 * Hiển thị cả COMPLETED lẫn CANCELLED theo thứ tự mới nhất lên đầu.
 */
function HistoryModal({ isOpen, onClose, historyItems }) {
  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 rounded-2xl">
              <History size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                Lịch sử xử lý
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                {historyItems.length} món gần nhất (tối đa 100)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 opacity-30">
              <History size={48} />
              <p className="text-xs font-black uppercase mt-3">Chưa có lịch sử nào</p>
            </div>
          ) : (
            historyItems.map(item => (
              <div
                key={`${item.id}-${item.completedAt}`}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border transition-all',
                  item.status === 'CANCELLED'
                    ? 'bg-red-50/60 border-red-100'
                    : 'bg-emerald-50/60 border-emerald-100'
                )}
              >
                {/* Icon trạng thái */}
                {item.status === 'CANCELLED' ? (
                  <XCircle size={22} className="text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                )}

                {/* Thông tin món */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">
                    {item.menuItemName}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {item.tableName} • SL: {item.quantity}
                    {item.status === 'CANCELLED' && item.cancelReason && (
                      <span className="text-red-500"> • Lý do: {item.cancelReason}</span>
                    )}
                  </p>
                </div>

                {/* Badge trạng thái */}
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0',
                  item.status === 'CANCELLED'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-700'
                )}>
                  {item.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const pendingItems       = useKitchenStore(s => s.pendingItems);
  const historyItems       = useKitchenStore(s => s.historyItems);
  const paidOrderIds       = useKitchenStore(s => s.paidOrderIds);
  const isLoading          = useKitchenStore(s => s.isLoading);
  const pollingActive      = useKitchenStore(s => s.pollingActive);
  const startPolling       = useKitchenStore(s => s.startPolling);
  const stopPolling        = useKitchenStore(s => s.stopPolling);
  const fetchPendingOrders = useKitchenStore(s => s.fetchPendingOrders);
  const completeOrderItem  = useKitchenStore(s => s.completeOrderItem);
  const startCookingItem   = useKitchenStore(s => s.startCookingItem);
  const fetchMenuItems     = useKitchenStore(s => s.fetchMenuItems);
  const fetchInventoryItems = useKitchenStore(s => s.fetchInventoryItems);

  // State mở/đóng Modal lịch sử
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Khởi tạo & Polling ───────────────────────────────────────────────────
  useEffect(() => {
    fetchMenuItems();      // Tải menu items
    fetchInventoryItems(); // Tải inventory nguồn để map đơn vị (FE Upgrade)
    startPolling();
    return () => stopPolling();
  }, []);

  // ── Phân loại & Sắp xếp ─────────────────────────────────────────────────
  const columns = useMemo(() => {
    // 1. CHỜ NẤU: Từ pendingItems, sort cũ nhất lên đầu
    const pending = pendingItems
      .filter(i => i.status === 'PENDING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // 2. ĐANG NẤU: Từ pendingItems, sort cũ nhất lên đầu
    const processing = pendingItems
      .filter(i => i.status === 'PROCESSING')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // 3. SẴN SÀNG: Lấy từ historyItems, chỉ lấy COMPLETED, giới hạn 20 món mới nhất
    // Lọc bỏ các món thuộc order đã thanh toán (đã rời khỏi quy trình phục vụ)
    const ready = historyItems
      .filter(i => i.status === 'COMPLETED' && !paidOrderIds.has(i.orderId))
      .slice(0, 20);

    // 4. ĐÃ HỦY: Lấy từ historyItems, chỉ lấy CANCELLED, giới hạn 20 món mới nhất
    // Lọc bỏ các món thuộc order đã thanh toán
    const cancelled = historyItems
      .filter(i => i.status === 'CANCELLED' && !paidOrderIds.has(i.orderId))
      .slice(0, 20);

    return { pending, processing, ready, cancelled };
  }, [pendingItems, historyItems]);

  const handleRefresh = useCallback(() => {
    fetchPendingOrders();
    toast.success('Đã cập nhật danh sách mới nhất');
  }, [fetchPendingOrders]);

  return (
    <div className="flex flex-col h-full bg-[#f4f4f7] overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 px-8 py-5 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-900 rounded-2xl shadow-lg">
            <ChefHat size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              KDS - ĐIỀU PHỐI BẾP
              <span className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                pollingActive ? "bg-emerald-500" : "bg-gray-300"
              )} />
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Tự động cập nhật mỗi 3s • Tab active: {document.visibilityState === 'visible' ? 'YES' : 'NO'}
            </p>
          </div>
        </div>

        {/* Nhóm nút bên phải */}
        <div className="flex items-center gap-3">
          {/* Nút Lịch sử */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-all font-bold text-sm shadow-sm active:scale-95"
          >
            <History size={16} />
            Lịch sử
            {/* Badge hiển thị số lượng lịch sử */}
            {historyItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center tabular-nums">
                {historyItems.length}
              </span>
            )}
          </button>

          {/* Nút Làm mới */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 transition-all font-bold text-sm shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </header>

      {/* ── Kanban Board ── */}
      <main className="flex-1 flex gap-4 p-4 overflow-x-auto no-scrollbar bg-[#eef0f4]">

        {/* Cột 1: PENDING — nhóm theo bàn */}
        <KitchenColumn
          title="Chờ chế biến"
          count={columns.pending.length}
          color="bg-gray-400"
          emptyIcon={<Flame size={48} />}
          items={columns.pending}
          onAction={startCookingItem}
          isGrouped
        />

        {/* Cột 2: PROCESSING */}
        <KitchenColumn
          title="Đang nấu"
          count={columns.processing.length}
          color="bg-amber-500"
          emptyIcon={<Flame size={48} />}
          items={columns.processing}
          onAction={completeOrderItem}
          isProcessing
        />

        {/* Cột 3: COMPLETED (SẴN SÀNG PHỤC VỤ) — lọc từ historyItems */}
        <KitchenColumn
          title="Sẵn sàng phục vụ"
          count={columns.ready.length}
          color="bg-emerald-500"
          emptyIcon={<CheckCircle2 size={48} />}
          items={columns.ready}
          isDone
        />

        {/* Cột 4: CANCELLED (ĐÃ HỦY) — lọc từ historyItems */}
        <KitchenColumn
          title="Món đã hủy"
          count={columns.cancelled.length}
          color="bg-red-400"
          emptyIcon={<XCircle size={48} />}
          items={columns.cancelled}
          isCancelled
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

/**
 * KitchenColumn — Helper Component cho từng cột Kanban
 */
function KitchenColumn({ title, count, color, items, onAction, isProcessing, isDone, isCancelled, isGrouped, emptyIcon }) {
  // Logic nhóm các món theo bàn (Dành cho cột Chờ chế biến)
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
    <div className="flex-1 min-w-[320px] max-w-[400px] flex flex-col bg-white/50 rounded-3xl border border-gray-200/50 overflow-hidden backdrop-blur-sm shadow-xl">
      {/* Column Header */}
      <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-white/80">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", color)} />
          {title}
        </h2>
        <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600 tabular-nums shadow-inner">
          {count}
        </span>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-20 grayscale scale-75">
            {emptyIcon}
            <p className="text-[10px] font-black uppercase mt-2">Trống</p>
          </div>
        ) : isGrouped ? (
          // Render theo Group (Danh sách Bàn) — dành cho cột Chờ chế biến
          groupedItems.map(([tableName, tableItems]) => (
            <div key={tableName} className="bg-gray-50/50 p-2.5 rounded-3xl border border-gray-100/60 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-gray-500 mb-2.5 mt-0.5 px-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {tableName}
              </h3>
              <div className="space-y-3">
                {tableItems.map(item => (
                  <KitchenItemCard
                    key={item.id}
                    item={item}
                    onAction={onAction}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Render dạng Danh sách dọc thông thường
          items.map(item => (
            <KitchenItemCard
              key={item.id}
              item={item}
              onAction={onAction}
              isHistory={isCancelled || isDone}
              isDone={isDone}
              isCancelled={isCancelled}
            />
          ))
        )}
      </div>
    </div>
  );
}
