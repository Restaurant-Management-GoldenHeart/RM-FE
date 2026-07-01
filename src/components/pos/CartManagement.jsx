/**
 * CartManagement.jsx — Quản lý giỏ hàng & Đơn hàng chi tiết
 *
 * Nghiệp vụ Production:
 *   - Hiển thị 2 phần: Món đã gửi bếp (Sent) và Món mới thêm (Draft).
 *   - Quản lý Batch gửi bếp: Chỉ gửi những món Status = NEW.
 *   - Status tracking từng món: SENT, PREPARING, READY, SERVED.
 *   - Ghi chú riêng cho từng món.
 *   - Tính toán Tổng tạm tính, VAT, Khuyến mãi (giả lập).
 *
 * PRODUCTION UPGRADE (Stock Check UI):
 *   - DraftItemRow: Hiển thị border đỏ & cảnh báo nguyên liệu nếu món thiếu hàng.
 *   - Nút "Gửi bếp": Có 2 trạng thái loading: isCheckingStock và isSending.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useCartStore, EMPTY_DRAFT } from '../../store/useCartStore';
import { cn } from '../../utils/cn';
import {
  Minus, Plus, Trash2, ShoppingBag,
  Receipt, ChefHat, Check, Loader2,
  MessageSquare,
  AlertTriangle, PackageX, ChevronDown, Package2
} from 'lucide-react';
import PaymentModal from './PaymentModal';
import CustomerSelector from './CustomerSelector';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

// ─── Draft Item Row (Món mới chưa gửi bếp) ───
//
// UPGRADE: Hỗ trợ hiển thị cảnh báo thiếu nguyên liệu.
// Khi kiểm tra kho phát hiện monk thiếu nguyên liệu,
// useCartStore sẽ lưu vào state.insufficientItems.
// Component này đọc state đó để quyết định border và warning text.
const DraftItemRow = ({ tableId, item }) => {
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const updateNote = useCartStore(s => s.updateNote);
  const [showNote, setShowNote] = useState(false);

  // Lấy thông tin thiếu nguyên liệu của món này (nếu có).
  // Tại sao select từng món thay vì lấy toàn bộ Map?
  //   → Tránh re-render toàn bộ giỏ hàng mỗi khi bất kỳ món nào thay đổi.
  //   → Mỗi DraftItemRow chỉ rerender khi ĐÚNG món đó bị ảnh hưởng.
  const shortages = useCartStore(s => s.insufficientItems[item.menuItemId] ?? null);
  const hasShortage = shortages !== null && shortages.length > 0;

  return (
    <div className={cn(
      "flex flex-col gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm animate-in slide-in-from-right duration-300 transition-all",
      hasShortage ? "bg-red-50/60 border-red-300 ring-1 ring-red-200" : "bg-white border-gold-100"
    )}>
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("w-1.5 md:w-2 h-1.5 md:h-2 rounded-full shrink-0", hasShortage ? "bg-red-500 animate-pulse" : "bg-gold-400")} />
            <h5 className={cn(
              "font-black text-scale-xs md:text-scale-sm truncate uppercase tracking-tight",
              hasShortage ? "text-red-700" : "text-gray-900"
            )}>{item.name}</h5>
          </div>
          <p className={cn("text-[10px] md:text-xs font-black mt-0.5 md:mt-1", hasShortage ? "text-red-400" : "text-gold-600")}>{formatVND(item.price)}</p>
        </div>

        <div className="flex items-center gap-1 md:gap-2 bg-gray-50 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-gray-100">
          <button
            onClick={() => updateQuantity(tableId, item.menuItemId, item.quantity - 1)}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-[11px] md:text-sm font-black w-4 md:w-6 text-center tabular-nums text-gray-900">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(tableId, item.menuItemId, item.quantity + 1)}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-gray-400 hover:text-gold-600 rounded-lg hover:bg-white transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={() => setShowNote(!showNote)}
            className={cn(
              "w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg md:rounded-xl transition-all border",
              item.note ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-100 text-gray-400"
            )}
          >
            <MessageSquare size={14} className="md:w-4 md:h-4" />
          </button>

          <button
            onClick={() => updateQuantity(tableId, item.menuItemId, 0)}
            className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg md:rounded-xl transition-all border border-red-50 text-red-200 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} className="md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {hasShortage && (
        <div className="mt-1 flex flex-col gap-1 px-1">
          {shortages.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <PackageX size={10} className="text-red-500 shrink-0" />
              <p className="text-[9px] md:text-[10px] font-bold text-red-600">
                Hết <span className="font-black">{s.name}</span>: cần {s.needed}, còn {s.inStock}
              </p>
            </div>
          ))}
        </div>
      )}

      {showNote && (
        <input
          type="text"
          value={item.note}
          autoFocus
          onChange={(e) => updateNote(tableId, item.menuItemId, e.target.value)}
          placeholder="Thêm ghi chú..."
          className="w-full px-2.5 py-1.5 md:px-3 md:py-2 bg-gray-50 border border-gray-100 rounded-lg md:rounded-xl text-[10px] md:text-xs outline-none focus:border-gold-300 transition-all font-medium"
        />
      )}
    </div>
  );
};

// ─── Combo Draft Row (Combo chưa gửi bếp) ───
const ComboDraftRow = ({ tableId, item }) => {
  const updateComboQuantity = useCartStore(s => s.updateComboQuantity);
  const insufficientItems = useCartStore(s => s.insufficientItems);
  const [expanded, setExpanded] = useState(false);

  const hasShortage = item.items?.some(ci => {
    const s = insufficientItems[ci.menuItemId];
    return s !== null && s?.length > 0;
  });

  return (
    <div className={cn(
      'flex flex-col gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl md:rounded-2xl border shadow-sm animate-in slide-in-from-right duration-300',
      hasShortage ? 'bg-red-50/60 border-red-300 ring-1 ring-red-200' : 'bg-amber-50/40 border-amber-100'
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Tên combo — click để expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left"
        >
          <span className={cn('w-1.5 md:w-2 h-1.5 md:h-2 rounded-full shrink-0', hasShortage ? 'bg-red-500 animate-pulse' : 'bg-green-500')} />
          <Package2 size={13} className={cn('shrink-0', hasShortage ? 'text-red-400' : 'text-green-600')} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn('font-black text-xs md:text-sm uppercase tracking-tight truncate', hasShortage ? 'text-red-700' : 'text-gray-900')}>
                {item.name}
              </span>
              <span className="shrink-0 bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-full leading-none">
                -{item.discountPct}%
              </span>
            </div>
            <p className={cn('text-[10px] md:text-xs font-black mt-0.5', hasShortage ? 'text-red-400' : 'text-green-600')}>
              {formatVND(item.price)} / combo
            </p>
          </div>
          <ChevronDown
            size={14}
            className={cn('shrink-0 text-gray-400 transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>

        {/* Qty controls */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-gray-100 shrink-0">
          <button
            onClick={() => updateComboQuantity(tableId, item.comboId, item.quantity - 1)}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-[11px] md:text-sm font-black w-4 md:w-6 text-center tabular-nums text-gray-900">{item.quantity}</span>
          <button
            onClick={() => updateComboQuantity(tableId, item.comboId, item.quantity + 1)}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-gray-400 hover:text-gold-600 rounded-lg hover:bg-white transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Delete */}
        <button
          onClick={() => updateComboQuantity(tableId, item.comboId, 0)}
          className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg md:rounded-xl transition-all border border-red-50 text-red-200 hover:text-red-500 hover:bg-red-50 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Danh sách món con — hiện khi expand */}
      {expanded && (
        <div className="ml-5 pl-3 border-l-2 border-dashed border-amber-200 space-y-1 mt-0.5">
          {item.items?.map(ci => (
            <div
              key={ci.menuItemId}
              className={cn(
                'flex items-center gap-2 text-[10px] md:text-xs',
                insufficientItems[ci.menuItemId]?.length > 0 ? 'text-red-500' : 'text-gray-500'
              )}
            >
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              <span className="font-medium flex-1 truncate">{ci.name}</span>
              <span className="text-gray-400 shrink-0">×{ci.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shortage warning */}
      {hasShortage && (
        <div className="flex items-center gap-1.5 px-1 mt-0.5">
          <PackageX size={10} className="text-red-500 shrink-0" />
          <p className="text-[9px] md:text-[10px] font-bold text-red-600">Thiếu nguyên liệu trong combo này</p>
        </div>
      )}
    </div>
  );
};

// ─── Sent Item Row (Món đã gửi bếp) ───
const SentItemRow = ({ item, orderId }) => {
  const serveItems = useOrderStore(s => s.serveItems);
  const [isServing, setIsServing] = useState(false);

  const statusConfig = {
    SENT: { label: 'Đã gửi', dot: 'bg-gray-400', chip: 'border-gray-100 bg-gray-50 text-gray-500' },
    PREPARING: { label: 'Đang làm', dot: 'bg-amber-500', chip: 'border-amber-100 bg-amber-50 text-amber-600' },
    READY: { label: 'Chờ phục vụ', dot: 'bg-emerald-500', chip: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
    SERVED: { label: 'Đã phục vụ', dot: 'bg-blue-500', chip: 'border-blue-100 bg-blue-50 text-blue-600' },
  };

  const primaryStatus = item.status || 'SENT';
  const config = statusConfig[primaryStatus] || statusConfig.SENT;
  const readyOrderItemIds = Array.isArray(item.readyOrderItemIds) ? item.readyOrderItemIds : [];
  const statusBadges = [
    ['SENT', item.sentQuantity],
    ['PREPARING', item.preparingQuantity],
    ['READY', item.readyQuantity],
    ['SERVED', item.servedQuantity],
  ].filter(([, quantity]) => Number(quantity) > 0);

  const handleServeReadyItems = async () => {
    if (!readyOrderItemIds.length || isServing) return;

    setIsServing(true);
    try {
      await serveItems(orderId, readyOrderItemIds);
    } finally {
      setIsServing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all bg-white border-gray-100">
      <div className="flex items-start gap-2.5 md:gap-3">
        <span className={cn("mt-1.5 w-1.5 md:w-2 h-1.5 md:h-2 rounded-full shrink-0", config.dot)} />

        <div className="min-w-0 flex-1">
          <h5 className="font-bold text-scale-xs md:text-scale-sm uppercase tracking-tight text-gray-800 leading-snug break-words">
            {item.name}
          </h5>
          <div className="mt-1 flex flex-wrap items-center gap-2 md:gap-3">
            <p className="text-[10px] md:text-xs font-bold text-gray-400">{formatVND(item.price)}</p>
            <span className="text-[9px] md:text-[10px] text-gray-300">×</span>
            <span className="text-[11px] md:text-xs font-black text-gray-900">{item.quantity}</span>
          </div>
        </div>
      </div>

      <div className="pl-4 md:pl-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {statusBadges.map(([status, quantity]) => (
            <span
              key={status}
              className={cn(
                "px-2.5 py-1 md:px-3 rounded-lg border text-[9px] md:text-[10px] font-black uppercase tracking-wider whitespace-nowrap leading-none",
                statusConfig[status]?.chip || statusConfig.SENT.chip
              )}
            >
              {statusConfig[status]?.label || statusConfig.SENT.label}{Number(quantity) > 1 ? ` ×${quantity}` : ''}
            </span>
          ))}
        </div>

        {readyOrderItemIds.length > 0 && (
          <button
            onClick={handleServeReadyItems}
            disabled={isServing}
            className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 disabled:opacity-60"
          >
            {isServing ? <Loader2 size={12} className="md:w-[14px] md:h-[14px] animate-spin" /> : <Check size={12} className="md:w-[14px] md:h-[14px]" />}
            {Number(item.readyQuantity) > 1 ? `Trả ${item.readyQuantity}` : 'Trả món'}
          </button>
        )}
      </div>

      {item.note && (
        <p className="text-[9px] md:text-[10px] text-gray-400 bg-gray-50/50 px-2 py-1 rounded-lg border border-dashed border-gray-100 ml-3 md:ml-4">
          "{item.note}"
        </p>
      )}
    </div>
  );
};


export const CartPanel = () => {
  const selectedTableId = useTableStore(s => s.selectedTableId);
  const tables = useTableStore(s => s.tables);
  const table = useMemo(
    () => tables.find(t => t.id === selectedTableId) ?? null,
    [selectedTableId, tables]
  );

  const draftItems = useCartStore(s => s.draftItems[selectedTableId] ?? EMPTY_DRAFT);
  const draftTotal = useMemo(() => draftItems.reduce((s, i) => s + i.price * i.quantity, 0), [draftItems]);

  // Lấy cả 2 state loading riêng biệt:
  //   isSending       → đang gọi API gửi bếp
  //   isCheckingStock → đang chạy bước kiểm tra kho (trước khi gửi)
  // Tách 2 state để hiển thị thông báo đúng cho nhân viên:
  //   "Đang kiểm tra kho..." vs "Đang gửi bếp..."
  const isSending = useCartStore(s => s.isSending);
  const isCheckingStock = useCartStore(s => s.isCheckingStock);
  const sendToKitchen = useCartStore(s => s.sendToKitchen);

  // Kiểm tra có bất kỳ món nào đang thiếu nguyên liệu không
  // Dùng để hiển thị banner cảnh báo ở đầu phần draft
  const insufficientItems = useCartStore(s => s.insufficientItems);
  const hasAnyShortage = Object.keys(insufficientItems).length > 0;

  const orderId = table?.currentOrderId || table?.orderId;
  // Fallback: nếu currentOrderId/orderId chưa có (dữ liệu cũ), tìm theo tableId trong order store
  const orderFromStore = useOrderStore(s => {
    if (orderId) {
      return s.orders[orderId] || s.orders[String(orderId)] || null;
    }
    
    // Chỉ tìm theo tableId nếu KHÔNG phải mang về (vì mang về tableId trên BE luôn là null)
    if (!selectedTableId?.startsWith?.('MV')) {
      return Object.values(s.orders).find(
        o => o.tableId === selectedTableId && !['PAID', 'CANCELLED', 'MERGED'].includes(o.status)
      ) ?? null;
    }
    return null;
  });
  const order = orderFromStore;
  const summaryItems = useMemo(() => order?.summaryItems || [], [order]);
  const sentItemQuantity = useMemo(
    () => summaryItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [summaryItems]
  );
  const draftItemQuantity = useMemo(
    () => draftItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [draftItems]
  );
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // ─── Auto-refresh order mỗi 30s để cập nhật trạng thái từ bếp ───
  // Khi bếp mark items COMPLETED, POS cần biết để hiện nút "Trả món".
  // Không dùng WebSocket → dùng polling đơn giản.
  const refreshOrder = useOrderStore(s => s.refreshOrder);
  const activeOrderId = order?.id;
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!activeOrderId) return;
    // Refresh ngay khi orderId thay đổi (vừa chọn bàn)
    refreshOrder(activeOrderId);
    // Sau đó poll mỗi 30s
    pollingRef.current = setInterval(() => {
      refreshOrder(activeOrderId);
    }, 30_000);
    return () => clearInterval(pollingRef.current);
  }, [activeOrderId, refreshOrder]);

  const sentTotal = useMemo(() => {
    if (!order) return 0;
    return summaryItems.reduce((sum, i) => sum + Number(i.lineTotal ?? i.price * i.quantity), 0);
  }, [order, summaryItems]);

  const hasUnservedItems = useMemo(() => {
    if (!order) return false;
    // BE cho phép checkout khi item là SERVED hoặc COMPLETED (= READY trên FE)
    // → FE cần đồng bộ với quy tắc này để tránh lỗi 409
    return order.items.some(i => !['SERVED', 'READY', 'CANCELLED'].includes(i.status));
  }, [order]);

  // isProcessing: Gộp cả 2 trạng thái loading vào 1 flag để disable nút
  // Tại sao gộp? Nhân viên không nên nhấn lại khi đang check hoặc đang gửi.
  const isProcessing = isSending || isCheckingStock;

  const handleSend = async () => {
    await sendToKitchen({ tableId: selectedTableId });
  };

  // ─── Hàm xử lý khi nhấn nút "Thanh toán" ───
  const handlePaymentClick = () => {
    setIsPaymentOpen(true);
  };

  if (!selectedTableId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
        <div className="w-24 h-24 bg-gold-50 rounded-[2.5rem] flex items-center justify-center shadow-inner mb-8 active:scale-95 transition-transform">
          <ShoppingBag className="text-gold-200" size={48} />
        </div>
        <h3 className="font-black text-gray-900 uppercase tracking-[0.2em] text-sm">Chưa chọn bàn</h3>
        <p className="text-[11px] font-bold text-gray-400 mt-3 max-w-[220px] leading-relaxed uppercase tracking-wider">
          Chọn bàn ở sơ đồ để bắt đầu phục vụ.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden outline-none">
      {/* ── Header ── */}
      <div className="p-6 bg-white border-b border-gray-50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn("w-2 h-2 rounded-full",
                table?.status === 'OCCUPIED' ? "bg-amber-500 animate-pulse"
                  : table?.status === 'RESERVED' ? "bg-blue-500"
                    : "bg-emerald-500"
              )} />
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">
                {table?.status === 'OCCUPIED' ? 'Bàn đang bận'
                  : table?.status === 'RESERVED' ? 'Khách đặt trước'
                    : 'Bàn trống'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tighter">
              Bàn {table?.tableNumber || `#${selectedTableId}`}
              {orderId && (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl border border-gray-200">
                  #{orderId}
                </span>
              )}
            </h3>
          </div>
          {(table?.status === 'AVAILABLE' || table?.status === 'RESERVED') && (
            <div className={cn(
              "px-4 py-2 text-[10px] font-black rounded-xl border",
              table?.status === 'RESERVED'
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              {table?.status === 'RESERVED' ? 'ĐẶT TRƯỚC' : 'SẴN SÀNG PHỤC VỤ'}
            </div>
          )}
        </div>
      </div>

      {/* ── List Area ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 space-y-6 no-scrollbar">
        {/* Section: Customer Selection (Gắn khách hàng vào đơn) */}
        {order && (
          <div className="mb-4">
            <CustomerSelector
              orderId={order.id}
              selectedCustomer={order.customer}
            />
          </div>
        )}

        {/* Section: Draft Items */}
        {draftItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h4 className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                // Đổi màu tiêu đề khi có món thiếu nguyên liệu → nhân viên chú ý ngay
                hasAnyShortage ? "text-red-500" : "text-gold-600"
              )}>
                {hasAnyShortage ? '⚠️ Cần kiểm tra kho' : `Món mới chọn (${draftItems.length})`}
              </h4>
              <button
                onClick={() => useCartStore.getState().clearDraft(selectedTableId)}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase"
              >
                Xoá hết
              </button>
            </div>

            {/*
              Banner cảnh báo tổng hợp khi có nhiều món thiếu nguyên liệu.
              Hiển thị thêm nhắc nhở để nhân viên biết phải làm gì.
            */}
            {hasAnyShortage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <PackageX size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold text-red-700 leading-tight">
                  Một số món thiếu nguyên liệu. Vui lòng xóa bớt hoặc liên hệ quản lý bổ sung kho.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {draftItems.map(item =>
                item.type === 'COMBO'
                  ? <ComboDraftRow key={`combo-${item.comboId}`} tableId={selectedTableId} item={item} />
                  : <DraftItemRow key={item.menuItemId} tableId={selectedTableId} item={item} />
              )}
            </div>
          </div>
        )}

        {/* Section: Sent Items */}
        {order && summaryItems.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Đã gửi bếp ({sentItemQuantity})</h4>
            <div className="space-y-2">
              {summaryItems.map((item) => (
                <SentItemRow
                  key={`${item.menuItemId}-${item.price}-${item.note || ''}`}
                  item={item}
                  orderId={order.id}
                />
              ))}
            </div>
          </div>
        )}

        {draftItems.length === 0 && (!order || summaryItems.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full py-12 opacity-40">
            <ShoppingBag size={48} className="text-gray-200 mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giỏ hàng trống</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 md:p-6 bg-white border-t border-gray-100 space-y-3 md:space-y-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="space-y-2">
          {draftTotal > 0 && (
            <div className="flex justify-between items-center text-[10px] md:text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Món mới:</span>
              <span className="text-gold-600 font-black tracking-tight">{formatVND(draftTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-end gap-2">
            <div className="space-y-1 min-w-0">
              <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] truncate">Tổng tạm tính</p>
              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[8px] md:text-[10px] font-black rounded-lg uppercase whitespace-nowrap">
                {draftItemQuantity + sentItemQuantity} món
              </span>
            </div>
            <div className="text-right min-w-0">
              <span className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter tabular-nums truncate block">
                {formatVND(draftTotal + sentTotal)}
              </span>
            </div>
          </div>
        </div>

        {hasUnservedItems && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 leading-tight">
              Cần đợi phục vụ hết món hoặc huỷ món hết nguyên liệu để được thanh toán.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/*
            Nút Gửi bếp có 3 trạng thái:
            1. Normal: Nền đen, icon ChefHat vàng
            2. isCheckingStock: Nền xanh dương nhạt, icon Loader + text "Kiểm tra kho..."
            3. isSending: Nền đen mờ, icon Loader
            Tại sao phân biệt 2 trạng thái loading?
              → Để nhân viên hiểu hệ thống đang làm GÌ, tránh nhấn lại do tưởng bị treo.
          */}
          <button
            onClick={handleSend}
            disabled={draftItems.length === 0 || isProcessing}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
              isCheckingStock
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : draftItems.length > 0 && !isProcessing
                  ? "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/10"
                  : "bg-gray-50 text-gray-200"
            )}
          >
            {isCheckingStock ? (
              // Đang kiểm tra kho
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Kiểm tra kho...</span>
              </>
            ) : isSending ? (
              // Đang gửi API
              <Loader2 size={18} className="animate-spin" />
            ) : (
              // Trạng thái bình thường
              <ChefHat size={18} className={draftItems.length > 0 ? "text-gold-500" : "text-gray-200"} />
            )}
            {!isCheckingStock && 'Gửi bếp'}
          </button>

          <button
            onClick={handlePaymentClick}
            disabled={(!order?.id && draftItems.length === 0) || summaryItems.length === 0 || isProcessing || hasUnservedItems || draftItems.length > 0}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
              (order?.id && summaryItems.length > 0 && !hasUnservedItems && draftItems.length === 0)
                ? "bg-gold-600 text-white hover:bg-gold-700 shadow-lg shadow-gold-600/20"
                : "bg-gray-50 text-gray-200 cursor-not-allowed"
            )}
            title={hasUnservedItems ? "Còn món chưa phục vụ" : draftItems.length > 0 ? "Còn món chưa gửi bếp" : "Thanh toán"}
          >
            <Receipt size={18} className={(order?.id && summaryItems.length > 0 && !hasUnservedItems && draftItems.length === 0) ? "text-white" : "text-gray-200"} />
            Thanh toán
          </button>
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        table={table}
        order={order}
      />
    </div>
  );
};
