/**
 * PaymentModal.jsx — Modal thanh toán & hoàn tất đơn hàng
 *
 * Nghiệp vụ:
 *   - Hiển thị chi tiết hoá đơn: Tạm tính, VAT, Khuyến mãi.
 *   - Chọn phương thức thanh toán: Tiền mặt, Chuyển khoản, QR.
 *   - Call `paymentApi.payOrder` để hoàn tất.
 *   - Sau khi thanh toán → Đóng bàn (`closeTable`) và Reset store.
 */
import React, { useState, useMemo } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useCartStore } from '../../store/useCartStore';
import { paymentApi } from '../../api/posApi';
import { cn } from '../../utils/cn';
import {
  X, CheckCircle2, CreditCard, Banknote,
  QrCode, ReceiptText, Calculator, Loader2,
  Percent, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const PaymentModal = ({ isOpen, onClose, table, order }) => {
  const [method, setMethod]     = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate]   = useState(8); // Default VAT 8%
  const [isPaying, setIsPaying] = useState(false);

  // ─── Tạm tính ───
  const subTotal = useMemo(() => {
    if (!order) return 0;
    return order.items
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [order]);

  const taxAmount = (subTotal - discount) * (taxRate / 100);
  const total     = subTotal - discount + taxAmount;

  const handlePay = async () => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      const payload = {
        orderId: order.id,
        tableId: table.id,
        discount,
        taxRate,
        method
      };

      const res = await paymentApi.payOrder(payload);
      
      if (res.success) {
        toast.success(`Thanh toán thành công ${formatVND(total)}!`);
        
        // Cập nhật trạng thái bàn về DIRTY (Cần dọn)
        useTableStore.getState().updateTableLocal(table.id, { status: 'DIRTY', currentOrderId: null });
        
        // Xoá order khỏi store hoạt động
        useOrderStore.getState().clearOrder(order.id);
        
        // Reset selected table
        useTableStore.setState({ selectedTableId: null });
        
        onClose();
      }
    } catch (err) {
      toast.error(err?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen || !table || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-4xl h-[600px] rounded-[2.5rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Left: Bill Detail */}
        <div className="w-[400px] bg-gray-50/50 border-r border-gray-100 flex flex-col p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">Hoá đơn</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{table.tableNumber} • HD#{order.id}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {order.items.filter(i => i.status !== 'CANCELLED').map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-gray-800 leading-none">{item.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">{item.quantity} x {formatVND(item.price)}</p>
                </div>
                <p className="text-sm font-black text-gray-900 tabular-nums">{formatVND(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-200 space-y-3 mt-6">
            <div className="flex justify-between items-center text-gray-400 font-bold text-xs uppercase tracking-wider">
               <span>Tạm tính</span>
               <span className="text-gray-900">{formatVND(subTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400 font-bold text-xs uppercase tracking-wider">
               <div className="flex items-center gap-2">
                 <span>Giảm giá</span>
                 <Percent size={12} className="text-gold-500" />
               </div>
               <span className="text-red-500 font-black">-{formatVND(discount)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400 font-bold text-xs uppercase tracking-wider">
               <span>Thuế VAT ({taxRate}%)</span>
               <span className="text-gray-900">{formatVND(taxAmount)}</span>
            </div>
            <div className="pt-4 flex justify-between items-end">
               <span className="font-black text-gray-900 uppercase text-xs">Tổng cộng</span>
               <span className="text-3xl font-black text-gold-600 tracking-tighter tabular-nums">{formatVND(total)}</span>
            </div>
          </div>
        </div>

        {/* Right: Payment Logic */}
        <div className="flex-1 p-10 flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div>
               <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Thanh toán</h2>
               <p className="text-gray-400 text-sm mt-1 font-medium">Chọn phương thức phù hợp để hoàn tất.</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Methods Grid */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { id: 'CASH',     label: 'Tiền mặt',    icon: Banknote,  desc: 'Thanh toán trực tiếp' },
              { id: 'TRANSFER', label: 'Chuyển khoản', icon: CreditCard, desc: 'Internet Banking' },
              { id: 'QR',       label: 'VietQR / Momo', icon: QrCode,     desc: 'Quét để trả' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all",
                  method === m.id ? "bg-gold-50 border-gold-400 ring-4 ring-gold-500/5 shadow-xl shadow-gold-600/5" : "bg-white border-gray-50 hover:border-gold-100"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all", method === m.id ? "bg-gold-600 text-white" : "bg-gray-50 text-gray-400")}>
                  <m.icon size={24} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wider mb-1">{m.label}</h4>
                <p className="text-[10px] text-gray-300 font-bold uppercase leading-none">{m.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Số tiền nhận (Trường hợp mặt)</label>
              <div className="relative group">
                <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-500" />
                <input 
                  type="text" 
                  value={total} 
                  readOnly
                  className="w-full bg-gray-50 border border-gray-100 py-5 pl-14 pr-6 rounded-3xl text-xl font-black text-gray-900 outline-none focus:ring-4 focus:ring-gold-500/5 transition-all"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onClose}
                className="py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all"
              >
                Quay lại
              </button>
              <button 
                onClick={handlePay}
                disabled={isPaying}
                className="py-5 bg-gray-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black shadow-xl shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isPaying ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} className="text-gold-500" />}
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
