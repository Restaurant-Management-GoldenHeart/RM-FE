/**
 * CartManagement.jsx — Quản lý giỏ hàng & Đơn hàng chi tiết
 *
 * Nghiệp vụ Production:
 *   - Hiển thị 2 phần: Món đã gửi bếp (Sent) và Món mới thêm (Draft).
 *   - Quản lý Batch gửi bếp: Chỉ gửi những món Status = NEW.
 *   - Status tracking từng món: SENT, PREPARING, READY, SERVED.
 *   - Ghi chú riêng cho từng món.
 *   - Tính toán Tổng tạm tính, VAT, Khuyến mãi (giả lập).
 */
import React, { useState, useMemo } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useOrderStore, selectOrderById } from '../store/useOrderStore';
import { useCartStore, selectDraftByTable, selectDraftTotal, selectDraftCount, EMPTY_DRAFT } from '../store/useCartStore';
import { orderApi } from '../api/posApi';
import { cn } from '../utils/cn';
import {
  Minus, Plus, Trash2, ShoppingBag,
  Receipt, ChefHat, Check, Loader2,
  AlertCircle, MessageSquare, Clock, X,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentModal from './pos/PaymentModal';
import CancelReasonModal from './pos/CancelReasonModal';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

// ─── Draft Item Row (Món mới chưa gửi bếp) ───
const DraftItemRow = ({ tableId, item }) => {
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const updateNote     = useCartStore(s => s.updateNote);
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-gold-100 shadow-sm animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-400" />
            <h5 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">{item.name}</h5>
          </div>
          <p className="text-xs font-black text-gold-600 mt-1">{formatVND(item.price)}</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-100">
          <button
            onClick={() => updateQuantity(tableId, item.menuItemId, item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-lg hover:bg-white"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-black w-6 text-center tabular-nums text-gray-900">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(tableId, item.menuItemId, item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gold-600 rounded-lg hover:bg-white"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
           <button
             onClick={() => setShowNote(!showNote)}
             className={cn(
               "w-9 h-9 flex items-center justify-center rounded-xl transition-all border",
               item.note ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-100 text-gray-400"
             )}
           >
             <MessageSquare size={16} />
           </button>
           
           <button
             onClick={() => updateQuantity(tableId, item.menuItemId, 0)}
             className="w-9 h-9 flex items-center justify-center rounded-xl transition-all border border-red-50 text-red-300 hover:text-red-500 hover:bg-red-50"
             title="Xoá món"
           >
             <Trash2 size={16} />
           </button>
        </div>
      </div>

      {showNote && (
        <input
          type="text"
          value={item.note}
          autoFocus
          onChange={(e) => updateNote(tableId, item.menuItemId, e.target.value)}
          placeholder="Thêm ghi chú (ví dụ: ít cay, không hành...)"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:border-gold-300 transition-all font-medium"
        />
      )}
    </div>
  );
};

// ─── Sent Item Row (Món đã gửi bếp) ───
const SentItemRow = ({ item, orderId }) => {
  const cancelItem = useOrderStore(s => s.cancelItem);
  const serveItem  = useOrderStore(s => s.serveItem);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, isForce: false });

  const statusConfig = {
    SENT:      { label: 'Đã gửi', color: 'text-gray-500', bg: 'bg-gray-50', dot: 'bg-gray-400' },
    PREPARING: { label: 'Đang làm', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    READY:     { label: 'Chờ cung ứng', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    SERVED:    { label: 'Đã phục vụ', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    CANCELLED: { label: 'Đã huỷ', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500' }
  };

  const config = statusConfig[item.status] || statusConfig.SENT;

  return (
    <div className={cn(
      "flex flex-col gap-2 p-4 rounded-2xl border transition-all",
      item.status === 'CANCELLED' ? "bg-red-50/30 border-red-50" : "bg-white border-gray-100"
    )}>
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", config.dot)} />
            <h5 className={cn("font-bold text-sm truncate uppercase tracking-tight", item.status === 'CANCELLED' ? "text-gray-400 line-through" : "text-gray-700")}>
              {item.name}
            </h5>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs font-bold text-gray-400">{formatVND(item.price)}</p>
            <span className="text-[10px] text-gray-300">×</span>
            <span className="text-xs font-black text-gray-900">{item.quantity}</span>
          </div>
        </div>

        <div className={cn("px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider", config.label === 'Đã huỷ' ? 'border-red-100 bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500 border-gray-100')}>
          {config.label}
        </div>

        {item.status === 'SENT' && (
          <button
            onClick={() => setCancelModal({ isOpen: true, isForce: false })}
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Huỷ món"
          >
            <X size={16} />
          </button>
        )}

        {item.status === 'PREPARING' && (
          <button
            onClick={() => setCancelModal({ isOpen: true, isForce: true })}
            className="w-8 h-8 flex items-center justify-center text-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Huỷ món đang nấu"
          >
            <AlertCircle size={16} />
          </button>
        )}

        {/* Force Cancel Dialog */}
        <CancelReasonModal
          isOpen={cancelModal.isOpen}
          itemName={item.name}
          isForce={cancelModal.isForce}
          onConfirm={(reason) => cancelItem({ orderId, itemId: item.id, reason })}
          onClose={() => setCancelModal({ ...cancelModal, isOpen: false })}
        />

        {item.status === 'READY' && (
          <button
            onClick={() => serveItem(orderId, item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Check size={14} /> Trả món
          </button>
        )}
      </div>
      {item.note && <p className="text-[10px] text-gray-400 bg-gray-50/50 px-2 py-1 rounded-lg border border-dashed border-gray-100">"{item.note}"</p>}
    </div>
  );
};

export const CartPanel = () => {
  const selectedTableId = useTableStore(s => s.selectedTableId);
  const table           = useTableStore(s => s.tables.find(t => t.id === selectedTableId));
  
  const draftItems = useCartStore(s => s.draftItems[selectedTableId] ?? EMPTY_DRAFT);
  const draftTotal = useMemo(() => draftItems.reduce((s, i) => s + i.price * i.quantity, 0), [draftItems]);
  const isSending  = useCartStore(s => s.isSending);
  const sendToKitchen = useCartStore(s => s.sendToKitchen);
  
  const orderId = table?.currentOrderId;
  const order   = useOrderStore(s => orderId ? s.orders[orderId] : null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  const sentTotal = useMemo(() => {
    if (!order) return 0;
    return order.items
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (i.price * i.quantity), 0);
  }, [order]);

  const handleSend = async () => {
    if (!table?.currentOrderId) {
      toast.error("Vui lòng mở bàn trước khi gửi bếp!");
      return;
    }
    await sendToKitchen({ tableId: selectedTableId, orderId: table.currentOrderId });
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
              <div className={cn("w-2 h-2 rounded-full", table?.status === 'OCCUPIED' ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">
                {table?.status === 'OCCUPIED' ? 'Bàn đang bận' : 'Bàn trống'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tighter">
              Bàn {table?.tableNumber || `#${selectedTableId}`}
              {table?.currentOrderId && (
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl border border-gray-200">
                  #{table.currentOrderId}
                </span>
              )}
            </h3>
          </div>
          {table?.status === 'AVAILABLE' && (
             <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100">
                SẴN SÀNG PHỤC VỤ
             </div>
          )}
        </div>
      </div>

      {/* ── List Area ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 space-y-6 no-scrollbar">
        {/* Section: Draft Items */}
        {draftItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black text-gold-600 uppercase tracking-widest">Món mới chọn ({draftItems.length})</h4>
              <button 
                onClick={() => useCartStore.getState().clearDraft(selectedTableId)}
                className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase"
              >
                Xoá hết
              </button>
            </div>
            <div className="space-y-2">
              {draftItems.map(item => <DraftItemRow key={item.menuItemId} tableId={selectedTableId} item={item} />)}
            </div>
          </div>
        )}

        {/* Section: Sent Items */}
        {order && order.items.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Đã gửi bếp ({order.items.length})</h4>
            <div className="space-y-2">
              {order.items.map(item => <SentItemRow key={item.id} item={item} orderId={order.id} />)}
            </div>
          </div>
        )}

        {draftItems.length === 0 && (!order || order.items.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full py-12 opacity-40">
            <ShoppingBag size={48} className="text-gray-200 mb-4" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giỏ hàng trống</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-6 bg-white border-t border-gray-100 space-y-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="space-y-2">
          {draftTotal > 0 && (
            <div className="flex justify-between items-center text-xs">
               <span className="text-gray-400 font-bold uppercase tracking-wider">Món mới:</span>
               <span className="text-gold-600 font-black tracking-tight">{formatVND(draftTotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tổng tạm tính</p>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase">
                {draftItems.length + (order?.items.length || 0)} món
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums">
                {formatVND(draftTotal + sentTotal)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSend}
            disabled={draftItems.length === 0 || isSending}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
              draftItems.length > 0 && !isSending ? "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/10" : "bg-gray-50 text-gray-200"
            )}
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} className={draftItems.length > 0 ? "text-gold-500" : "text-gray-200"} />}
            Gửi bếp
          </button>

          <button
            onClick={() => setIsPaymentOpen(true)}
            disabled={!table?.currentOrderId || (order?.items?.length === 0 && draftItems.length === 0)}
            className={cn(
               "flex flex-col items-center justify-center gap-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all",
               table?.currentOrderId && (order?.items?.length > 0 || draftItems.length > 0) 
                 ? "bg-gold-600 text-white hover:bg-gold-700 shadow-lg shadow-gold-600/20" 
                 : "bg-gray-50 text-gray-200"
            )}
          >
            <Receipt size={18} className={table?.currentOrderId ? "text-white" : "text-gray-200"} />
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
