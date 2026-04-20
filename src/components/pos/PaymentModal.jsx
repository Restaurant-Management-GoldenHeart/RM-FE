/**
 * PaymentModal.jsx — Modal thanh toán và hoàn tất đơn hàng
 *
 * Luồng thanh toán thực tế (2 bước, theo BE design):
 *   Bước 1: POST /api/v1/bills           → Tạo hóa đơn
 *   Bước 2: POST /api/v1/bills/{id}/payments → Thêm thanh toán vào hóa đơn
 *
 * ⚠️ NOTE BE: BE chưa có API atomic /checkout.
 * → Nếu bước 2 thất bại sau bước 1 → Hóa đơn bị "treo" (UNPAID).
 * → FE xử lý bằng cách: hiển thị thông báo rõ ràng và hướng dẫn nhân viên.
 *
 * ⚠️ NOTE BE: Tất cả món phải SERVED trước khi tạo bill.
 * → BE sẽ trả 422 nếu còn món chưa SERVED.
 * → FE nên kiểm tra trước để hiển thị thông báo thân thiện hơn.
 */
import React, { useState, useMemo } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useKitchenStore } from '../../store/useKitchenStore';
import paymentApi from '../../services/api/paymentApi';
import tableApi from '../../services/api/tableApi';
import { cn } from '../../utils/cn';
import {
  X, CheckCircle2, CreditCard, Banknote,
  QrCode, ReceiptText, Loader2,
  Percent, DollarSign, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

// Map phương thức thanh toán FE sang format BE chấp nhận
// ⚠️ NOTE BE: BE dùng "CASH", "CARD", "QR_CODE" (không phải "QR")
const METHOD_MAP = {
  CASH:     'CASH',
  TRANSFER: 'CARD',     // BE gọi là CARD
  QR:       'QR_CODE',  // BE gọi là QR_CODE
};

const PaymentModal = ({ isOpen, onClose, table, order }) => {
  const [method, setMethod]     = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate]   = useState(8); // VAT mặc định 8%
  const [isPaying, setIsPaying] = useState(false);

  // ─── Tính tổng tiền (chỉ tính các món KHÔNG BỊ HỦY) ───
  const subTotal = useMemo(() => {
    if (!order) return 0;
    return order.items
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [order]);

  const taxAmount = (subTotal - discount) * (taxRate / 100);
  const total     = subTotal - discount + taxAmount;

  /**
   * Kiểm tra xem còn món nào chưa được phục vụ không.
   * BE sẽ từ chối tạo bill nếu còn món chưa SERVED.
   */
  const hasUnservedItems = useMemo(() => {
    if (!order) return false;
    return order.items.some(i =>
      !['SERVED', 'CANCELLED'].includes(i.status)
    );
  }, [order]);

  /**
   * executePayment — Thực hiện thanh toán theo 2 bước.
   *
   * Bước 1: Tạo hóa đơn (POST /bills)
   * Bước 2: Thêm thanh toán vào hóa đơn (POST /bills/{id}/payments)
   *
   * ⚠️ NOTE BE: Nếu bước 2 thất bại → bill bị treo ở trạng thái UNPAID.
   * → Cần thông báo rõ ràng để nhân viên/quản lý xử lý thủ công.
   */
  const executePayment = async () => {
    if (isPaying) return;

    // Cảnh báo nếu còn món chưa phục vụ (BE sẽ từ chối)
    if (hasUnservedItems) {
      toast.error('⚠️ Còn món chưa được phục vụ. Hãy phục vụ tất cả món trước khi thanh toán!');
      return;
    }

    if (!order?.id) {
      toast.error('Không tìm thấy đơn hàng này!');
      return;
    }

    setIsPaying(true);

    // ── Bước 1: Tạo hóa đơn ───────────────────────────────────────────────
    let bill = null;
    try {
      console.log('[PAYMENT] Bước 1: Tạo hóa đơn cho đơn #' + order.id);

      const billResponse = await paymentApi.createBill({
        orderId: order.id,
        taxRate,
        discount,
        paymentMethod: METHOD_MAP[method] ?? 'CASH',
        paidAmount: 0, // Chưa trả tiền ngay — sẽ trả ở bước 2
      });

      // BE trả về: ApiResponse<Bill>
      bill = billResponse?.data;

      if (!bill?.id) {
        // ⚠️ NOTE BE: Nếu BE không trả về bill.id → không thể tiến hành bước 2
        throw new Error('BE không trả về ID hóa đơn sau khi tạo');
      }

      console.log('[PAYMENT] Bước 1 thành công. Bill ID:', bill.id);

    } catch (err) {
      console.error('[API_ERROR][CREATE_BILL] Lỗi tạo hóa đơn:', {
        endpoint: '/bills',
        orderId: order.id,
        status: err?.status,
        message: err?.message,
      });

      // ⚠️ NOTE BE: 422 = Còn món chưa SERVED
      if (err?.status === 422) {
        toast.error('Không thể tạo hóa đơn: Còn món chưa được phục vụ!');
      } else {
        toast.error(err?.message || 'Không thể tạo hóa đơn. Vui lòng thử lại.');
      }

      setIsPaying(false);
      return;
    }

    // ── Bước 2: Thêm thanh toán vào hóa đơn ──────────────────────────────
    try {
      console.log('[PAYMENT] Bước 2: Thanh toán ' + formatVND(total) + ' vào Bill #' + bill.id);

      await paymentApi.addPayment(
        bill.id,
        total,            // Số tiền cần trả đủ một lần
        METHOD_MAP[method] ?? 'CASH'
      );

      console.log('[PAYMENT] Bước 2 thành công. Thanh toán hoàn tất!');

      // ─── Thanh toán thành công: cập nhật UI ──────────────────────────
      toast.success(`🎉 Thanh toán thành công ${formatVND(total)}!`);

      // 1. Dọn sạch KDS: Xóa tất cả món của order này khỏi màn hình bếp
      // ⇒ Bếp sẽ không còn thấy các món của bàn này sau khi đã thanh toán xong
      useKitchenStore.getState().clearOrderFromKitchen(order.id);

      // 2. Cập nhật trạng thái bàn về CLEANING (chuẩn Master Plan)
      try {
        // Luôn chuyển sang trạng thái CLEANING sau khi thanh toán xong
        await tableApi.updateTableStatus(table.id, 'CLEANING');
      } catch (e) {
        console.warn("[PAYMENT_SYNC_WARNING] Cập nhật trạng thái bàn CLEANING thất bại", e);
      }

      // 3. Đồng bộ lại dữ liệu
      const { useAuthStore } = await import('../../store/useAuthStore');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      await useTableStore.getState().fetchTables(branchId);

      // 4. Close & Reset
      useTableStore.setState({ selectedTableId: null });
      onClose();

    } catch (err) {
      console.error('[API_ERROR][ADD_PAYMENT] Lỗi thêm thanh toán:', {
        endpoint: `/bills/${bill.id}/payments`,
        billId: bill.id,
        amount: total,
        status: err?.status,
        message: err?.message,
      });

      // ⚠️ NOTE BE: Bước 2 thất bại → Bill đang bị TREO ở trạng thái UNPAID!
      // → BE không có transaction bao ngoài → cần xử lý thủ công
      // → Thông báo rõ ràng cho nhân viên
      toast.error(
        `Thanh toán thất bại! Hóa đơn #${bill.id} đang bị treo. Vui lòng liên hệ quản lý.`,
        { duration: 8000 } // Hiển thị lâu hơn vì đây là lỗi nghiêm trọng
      );

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

        {/* Left: Chi tiết hóa đơn */}
        <div className="w-[400px] bg-gray-50/50 border-r border-gray-100 flex flex-col p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">Hoá đơn</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {table.tableNumber} • HD#{order.id}
              </p>
            </div>
          </div>

          {/* Cảnh báo còn món chưa phục vụ */}
          {hasUnservedItems && (
            <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-700 leading-relaxed">
                Còn món chưa được phục vụ. Cần phục vụ hết trước khi thanh toán
                (BE sẽ từ chối tạo hóa đơn).
              </p>
            </div>
          )}

          {/* Danh sách món — CHỈ hiện các món KHÔNG BỊ HỦY */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {order.items.filter(i => i.status !== 'CANCELLED').map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      item.status === 'SERVED'    ? "bg-blue-500" :
                      item.status === 'READY'     ? "bg-green-500" :
                      item.status === 'PREPARING' ? "bg-amber-500 animate-pulse" :
                      item.status === 'SENT'      ? "bg-gray-400" :
                                                    "bg-gold-400"
                    )} />
                    <p className="text-sm font-bold text-gray-800 leading-none">{item.name}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold pl-4">
                    {item.quantity} x {formatVND(item.price)}
                    {/* Cảnh báo nhỏ cho các món chưa xong */}
                    {!['SERVED', 'CANCELLED'].includes(item.status) && (
                      <span className="ml-2 text-amber-500 font-black">(Chưa phục vụ)</span>
                    )}
                  </p>
                </div>
                <p className="text-sm font-black text-gray-900 tabular-nums">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Tổng kết hóa đơn */}
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
               <span className="text-3xl font-black text-gold-600 tracking-tighter tabular-nums">
                 {formatVND(total)}
               </span>
            </div>
          </div>
        </div>

        {/* Right: Chọn phương thức thanh toán */}
        <div className="flex-1 p-10 flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div>
               <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Thanh toán</h2>
               <p className="text-gray-400 text-sm mt-1 font-medium">Chọn phương thức phù hợp để hoàn tất.</p>
            </div>
            <button
              onClick={onClose}
              disabled={isPaying}
              className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Lựa chọn phương thức thanh toán */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { id: 'CASH',     label: 'Tiền mặt',     icon: Banknote,  desc: 'Thanh toán trực tiếp' },
              { id: 'TRANSFER', label: 'Chuyển khoản',  icon: CreditCard, desc: 'Internet Banking'    },
              { id: 'QR',       label: 'VietQR / Momo', icon: QrCode,     desc: 'Quét để trả'         },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                disabled={isPaying}
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-3xl border-2 transition-all disabled:opacity-50",
                  method === m.id
                    ? "bg-gold-50 border-gold-400 ring-4 ring-gold-500/5 shadow-xl shadow-gold-600/5"
                    : "bg-white border-gray-50 hover:border-gold-100"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all",
                  method === m.id ? "bg-gold-600 text-white" : "bg-gray-50 text-gray-400"
                )}>
                  <m.icon size={24} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wider mb-1">{m.label}</h4>
                <p className="text-[10px] text-gray-300 font-bold uppercase leading-none">{m.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-6">
            {/* Hiển thị tổng tiền cần thu */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">
                Số tiền cần thu
              </label>
              <div className="relative">
                <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-500" />
                <input
                  type="text"
                  value={formatVND(total)}
                  readOnly
                  className="w-full bg-gray-50 border border-gray-100 py-5 pl-14 pr-6 rounded-3xl text-xl font-black text-gray-900 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onClose}
                disabled={isPaying}
                className="py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={executePayment}
                disabled={isPaying || hasUnservedItems}
                className={cn(
                  "py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                  isPaying || hasUnservedItems
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-black shadow-xl shadow-gray-900/20 active:scale-95"
                )}
              >
                {isPaying
                  ? <><Loader2 size={24} className="animate-spin" /> Đang xử lý...</>
                  : <><CheckCircle2 size={24} className="text-gold-500" /> Xác nhận thanh toán</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
