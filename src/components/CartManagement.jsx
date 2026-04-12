import React, { useState } from 'react';
import {
  usePosStore,
  selectCurrentCart,
  selectCartTotal,
  selectCartItemCount,
  selectSelectedTable,
} from '../store/usePosStore';
import { cn } from '../utils/cn';
import {
  Minus, Plus, Trash2, ShoppingBag,
  Receipt, ChefHat, Check, Loader2,
  AlertCircle
} from 'lucide-react';
import { posService } from '../api/posApi';
import toast from 'react-hot-toast';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const CartItem = ({ item }) => {
  const updateCartItem = usePosStore(s => s.updateCartItem);

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-50 shadow-sm group hover:border-gold-200 transition-all animate-in slide-in-from-right duration-300">
      <div className="flex-1 min-w-0">
        <h5 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">{item.name}</h5>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs font-black text-gold-600">
            {formatVND(item.price)}
          </p>
          <span className="text-[10px] text-gray-300">×</span>
          <span className="text-[10px] font-bold text-gray-400">{item.quantity}</span>
        </div>
        {item.note && (
          <p className="text-[10px] text-gray-400 italic mt-2 font-medium bg-gray-50 px-2 py-1 rounded-lg inline-block border border-gray-100">
            "{item.note}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 bg-gray-50 rounded-2xl p-1 border border-gray-100 shadow-inner">
        <button
          onClick={() => updateCartItem(item.menuItemId, item.quantity - 1, null)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 transition-all rounded-xl hover:bg-white hover:shadow-sm"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-black w-6 text-center tabular-nums text-gray-900">
          {item.quantity}
        </span>
        <button
          onClick={() => updateCartItem(item.menuItemId, item.quantity + 1, null)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold-600 transition-all rounded-xl hover:bg-white hover:shadow-sm"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

export const CartPanel = () => {
  const { selectedTableId, isSendingOrder, sendOrderToKitchen, clearCart } = usePosStore();
  const cartItems     = usePosStore(selectCurrentCart);
  const total         = usePosStore(selectCartTotal);
  const itemCount     = usePosStore(selectCartItemCount);
  const selectedTable = usePosStore(selectSelectedTable);

  const [billing, setBilling]             = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const handleSend = async () => {
    const orderId = await sendOrderToKitchen();
    if (orderId) {
      setCurrentOrderId(orderId);
    }
  };

  const handleCheckout = async () => {
    if (!currentOrderId) return;
    setBilling(true);
    try {
      const res = await posService.createBill({ orderId: currentOrderId, discount: 0, taxRate: 0 });
      const bill = res?.data;
      toast.success(`🧾 Thanh toán thành công: ${formatVND(bill?.total ?? total)}`);
      clearCart();
      setCurrentOrderId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setBilling(false);
    }
  };

  if (!selectedTableId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
        <div className="w-24 h-24 bg-gold-50 rounded-[2.5rem] flex items-center justify-center shadow-inner mb-8 active:scale-95 transition-transform">
          <ShoppingBag className="text-gold-200" size={48} />
        </div>
        <h3 className="font-black text-gray-900 uppercase tracking-[0.2em] text-sm">Chưa chọn bàn</h3>
        <p className="text-[11px] font-bold text-gray-400 mt-3 max-w-[220px] leading-relaxed uppercase tracking-wider">
          Vui lòng chọn bàn ở sơ đồ bên trái để bắt đầu phục vụ.
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
              <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
              <span className="text-[10px] uppercase font-black text-gold-600 tracking-[0.2em]">
                Đơn hàng hiện tại
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tighter">
              Bàn {selectedTable?.tableNumber ?? `#${selectedTableId}`}
              {currentOrderId && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 shadow-sm animate-in zoom-in duration-300">
                  #{currentOrderId}
                </span>
              )}
            </h3>
          </div>

          <button
            onClick={() => { clearCart(); setCurrentOrderId(null); }}
            className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl border border-transparent hover:border-red-100"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* ── Cart Body (Scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 no-scrollbar">
        {cartItems.length > 0 ? (
          cartItems.map(item => <CartItem key={item.menuItemId} item={item} />)
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-gray-50 active:scale-95 transition-transform">
              <ShoppingBag size={32} className="text-gray-100" />
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Danh sách món trống</p>
            <p className="text-[10px] font-bold text-gray-200 mt-2 uppercase tracking-widest">Chọn món từ menu để thêm vào</p>
          </div>
        )}
      </div>

      {/* ── Footer Actions (Sticky) ── */}
      <div className="p-6 bg-white border-t border-gray-100 space-y-6 shrink-0">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tổng thanh toán</p>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase tracking-tighter">
              {itemCount} món
            </span>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums drop-shadow-sm">
              {formatVND(total)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleSend}
            disabled={cartItems.length === 0 || isSendingOrder}
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden",
              cartItems.length > 0 && !isSendingOrder
                ? "bg-gray-900 text-white hover:bg-black shadow-xl shadow-gray-900/10 active:scale-95"
                : "bg-gray-50 text-gray-300"
            )}
          >
            {isSendingOrder ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <ChefHat size={24} className={cartItems.length > 0 ? "text-gold-500" : "text-gray-200"} />
                Gửi nhà bếp
              </>
            )}
          </button>

          <button
            onClick={handleCheckout}
            disabled={!currentOrderId || billing}
            className={cn(
              "flex flex-col items-center justify-center gap-2 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-xl active:scale-95",
              currentOrderId && !billing
                ? "bg-gold-600 text-white hover:bg-gold-700 shadow-gold-600/20"
                : "bg-gray-50 text-gray-300 shadow-none border border-transparent"
            )}
          >
            {billing ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Receipt size={24} className={currentOrderId ? "text-white" : "text-gray-200"} />
                Thanh toán
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
          <AlertCircle size={12} />
          <span>Vui lòng kiểm tra kỹ đơn trước khi gửi</span>
        </div>
      </div>
    </div>
  );
};
