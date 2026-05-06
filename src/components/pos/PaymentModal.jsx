import React, { useState, useMemo, useEffect } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useKitchenStore } from '../../store/useKitchenStore';
import paymentApi from '../../services/api/paymentApi';
import tableApi from '../../services/api/tableApi';
import { cn } from '../../utils/cn';
import {
  X, CheckCircle2, CreditCard, Banknote,
  QrCode, ReceiptText, Loader2,
  Percent, DollarSign, AlertTriangle,
  Star, TrendingUp, Gift, Info, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customerTierApi } from '../../api/customerTierApi';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

// Map phương thức thanh toán FE sang format BE chấp nhận
const METHOD_MAP = {
  CASH:     'CASH',
  TRANSFER: 'CARD',     // BE gọi là CARD
  QR:       'QR_CODE',  // BE gọi là QR_CODE
};

const PaymentModal = ({ isOpen, onClose, table, order }) => {
  const [method, setMethod]           = useState('CASH');
  const [discount, setDiscount]       = useState(0);
  const [taxRate, setTaxRate]         = useState(8); // VAT mặc định 8%
  const [isPaying, setIsPaying]       = useState(false);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [tiers, setTiers] = useState([]);

  // Fetch danh sách hạng để tính toán lộ trình thăng hạng
  // apiClient interceptor đã unwrap response: (axiosResponse) => axiosResponse.data
  // Nên response ở đây là ApiResponse { message, data: [...] }
  const fetchTiers = async () => {
    try {
      const apiResponse = await customerTierApi.getCustomerTiers();
      // apiResponse = { message: "...", data: [ {...}, {...} ] }
      const rawTiers = apiResponse?.data ?? [];
      const sortedTiers = Array.isArray(rawTiers)
        ? [...rawTiers].sort((a, b) => (a.minPoints ?? 0) - (b.minPoints ?? 0))
        : [];
      setTiers(sortedTiers);
    } catch (err) {
      console.error('[PaymentModal] fetchTiers lỗi:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTiers();
    }
  }, [isOpen]);

  // ─── Tải dữ liệu Preview từ BE ───
  // Tại sao cần Preview? Để đồng bộ logic tính thuế/chiết khấu với BE,
  // và lấy thông tin điểm thưởng hội viên chính xác.
  const fetchPreview = async () => {
    if (!order?.id || !isOpen) return;

    setIsPreviewLoading(true);
    try {
      // apiClient interceptor trả về ApiResponse { message, data: CheckoutPreviewResponse }
      const apiResponse = await paymentApi.previewCheckout({
        orderId: order.id,
        discount: discount || 0,
        taxRate: taxRate || 0,
        applyLoyaltyDiscount: applyLoyalty,
      });
      setPreviewData(apiResponse?.data ?? null);
    } catch (err) {
      // Không toast để tránh làm phiền khi đang nhập liệu
      // Lỗi thường gặp: 409 khi còn món chưa SERVED
      const status = err?.response?.status;
      if (status === 409) {
        // Vẫn set previewData null nhưng không làm block toàn bộ modal
        setPreviewData(null);
      }
      console.error('[PaymentModal] previewCheckout lỗi:', status, err?.response?.data?.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Tự động tải lại preview khi các thông số thay đổi
  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, discount, taxRate, applyLoyalty, order?.id, order?.customer?.id]);

  // Reset trạng thái khi đóng/mở modal
  useEffect(() => {
    if (isOpen) {
      setApplyLoyalty(false);
      setDiscount(0);
    }
  }, [isOpen]);

  // ─── Tính toán giá trị hiển thị ───
  // Ưu tiên dùng dữ liệu từ previewData (BE), nếu chưa có thì dùng logic FE tạm thời
  const subTotal = useMemo(() => {
    if (previewData) return previewData.subtotal;
    if (!order) return 0;
    return order.items
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [order, previewData]);

  const taxAmount = useMemo(() => {
    if (previewData) return previewData.tax;
    return (subTotal - discount) * (taxRate / 100);
  }, [previewData, subTotal, discount, taxRate]);

  const totalDiscount = useMemo(() => {
    if (previewData) return previewData.totalDiscount;
    return discount;
  }, [previewData, discount]);

  const total = useMemo(() => {
    if (previewData) return previewData.total;
    return subTotal - discount + taxAmount;
  }, [previewData, subTotal, discount, taxAmount]);

  /**
   * Kiểm tra xem còn món nào chưa được phục vụ không.
   */
  const hasUnservedItems = useMemo(() => {
    if (!order) return false;
    return order.items.some(i =>
      !['SERVED', 'CANCELLED'].includes(i.status)
    );
  }, [order]);

  /**
   * executePayment — Thực hiện thanh toán theo 2 bước.
   */
  const executePayment = async () => {
    if (isPaying || isPreviewLoading) return;

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
      // apiClient trả về ApiResponse { message, data: BillResponse }
      const billApiResponse = await paymentApi.createBill({
        orderId: order.id,
        taxRate,
        discount,
        applyLoyaltyDiscount: applyLoyalty,  // ← quan trọng: gửi flag loyalty lên BE
        paymentMethod: METHOD_MAP[method] ?? 'CASH',
        paidAmount: 0,
      });

      // apiClient đã unwrap: billApiResponse = ApiResponse { data: BillResponse }
      bill = billApiResponse?.data;
      if (!bill?.id) throw new Error('BE không trả về ID hóa đơn sau khi tạo');

    } catch (err) {
      console.error('[API_ERROR][CREATE_BILL] Lỗi tạo hóa đơn:', err);
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
      await paymentApi.addPayment(
        bill.id,
        total, 
        METHOD_MAP[method] ?? 'CASH'
      );

      toast.success(`🎉 Thanh toán thành công ${formatVND(total)}!`);

      // Cập nhật UI
      useKitchenStore.getState().clearOrderFromKitchen(order.id);
      try {
        await tableApi.updateTableStatus(table.id, 'CLEANING');
      } catch (e) {
        console.warn('[PAYMENT_SYNC_WARNING] Cập nhật trạng thái bàn CLEANING thất bại', e);
      }

      const { useAuthStore } = await import('../../store/useAuthStore');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;

      await useTableStore.getState().fetchTables(branchId);
      await useTableStore.getState().fetchTables(branchId);

      useTableStore.setState({ selectedTableId: null });
      onClose();

    } catch (err) {
      console.error('[API_ERROR][ADD_PAYMENT] Lỗi thêm thanh toán:', err);
      toast.error(
        `Thanh toán thất bại! Hóa đơn #${bill.id} đang bị treo. Vui lòng liên hệ quản lý.`,
        { duration: 8000 }
      );
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen || !table || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative bg-white w-full max-w-5xl h-[720px] rounded-[2.5rem] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Left: Chi tiết hóa đơn & Loyalty Status */}
        <div className="w-[420px] bg-gray-50/50 border-r border-gray-100 flex flex-col p-8 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
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

          {/* Loyalty Banner — Chỉ hiển thị khi có khách hàng gắn vào đơn */}
          {previewData?.customerName && (
            <div className="mb-6 p-5 bg-white rounded-[2rem] border border-gold-100 shadow-sm space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Star size={48} className="text-gold-500" fill="currentColor" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center text-gold-600 shadow-inner">
                  <Star size={20} fill="currentColor" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Thành viên</p>
                  <h4 className="font-black text-sm text-gray-900">{previewData.customerName}</h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Hạng hiện tại</p>
                  <p className="text-[10px] font-black text-gold-600 uppercase mt-0.5">
                    {previewData.currentTierName || 'Chưa xếp hạng'}
                  </p>
                </div>
                <div className="bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">Điểm hiện có</p>
                  <p className="text-[10px] font-black text-gray-900 mt-0.5">{previewData.currentPoints || 0}</p>
                </div>
              </div>

              {/* Progress Bar & Thăng hạng — Quy đổi điểm thành hạng */}
              {(() => {
                // currentPoints có thể null (khách chưa có điểm) → normalize về 0
                const currentPoints = previewData.currentPoints ?? 0;

                // Nếu tiers chưa load thì hiện skeleton
                if (tiers.length === 0) {
                  return (
                    <div className="h-10 bg-gray-100 rounded-2xl animate-pulse" />
                  );
                }

                // Tìm hạng tiếp theo (hạng có minPoints lớn hơn điểm hiện tại)
                const nextTier = tiers.find(t => (t.minPoints ?? 0) > currentPoints);

                if (!nextTier) {
                  // Đã đạt hạng cao nhất
                  if (currentPoints >= (tiers[tiers.length - 1]?.minPoints ?? Infinity)) {
                    return (
                      <p className="text-[9px] font-black text-emerald-600 text-center py-1">
                        ✨ Đã đạt hạng cao nhất: {tiers[tiers.length - 1].name}
                      </p>
                    );
                  }
                  return null;
                }

                // Tìm hạng ngay trước đó để tính % tiến trình
                const prevTier = [...tiers].reverse().find(t => (t.minPoints ?? 0) <= currentPoints);
                const prevPoints = prevTier?.minPoints ?? 0;
                const pointsRange = nextTier.minPoints - prevPoints;
                const pointsEarned = currentPoints - prevPoints;
                // Tối thiểu 3% để thanh không bị tàng hình
                const progress = pointsRange > 0
                  ? Math.min(100, Math.max(3, (pointsEarned / pointsRange) * 100))
                  : 3;

                return (
                  <div className="space-y-2 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-end">
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Tiến trình lên {nextTier.name}</p>
                      <p className="text-[10px] font-black text-gold-600 tabular-nums">{currentPoints} / {nextTier.minPoints}</p>
                    </div>
                    <div className="h-2 w-full bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Info size={10} className="text-gray-300" />
                      <p className="text-[9px] text-gray-400 font-bold">
                        Cần thêm <span className="text-gray-900 font-black">{nextTier.minPoints - currentPoints}</span> điểm để đạt hạng <span className="text-gold-600 font-black">{nextTier.name}</span>.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-2">
                <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px]">
                  <TrendingUp size={12} />
                  <span>+{previewData.earnedLoyaltyPoints || 0} điểm tích lũy</span>
                </div>
                {previewData.projectedTierName && previewData.projectedTierName !== previewData.currentTierName && (
                  <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded-lg border border-emerald-100 animate-bounce shadow-sm">
                    LÊN HẠNG: {previewData.projectedTierName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Danh sách món */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {order.items.filter(i => i.status !== 'CANCELLED').map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      item.status === 'SERVED' ? "bg-blue-500" : "bg-gold-400"
                    )} />
                    <p className="text-[11px] font-bold text-gray-800 leading-none">{item.name}</p>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 font-bold pl-3">
                    {item.quantity} x {formatVND(item.price)}
                  </p>
                </div>
                <p className="text-[11px] font-black text-gray-900 tabular-nums">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          {/* Tổng kết */}
          <div className="pt-6 border-t border-gray-200 space-y-3 mt-6">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[10px] uppercase tracking-wider">
               <span>Tạm tính</span>
               <span className="text-gray-900">{formatVND(subTotal)}</span>
            </div>
            
            {/* Giảm giá (Manual + Loyalty) */}
            {(discount > 0 || (previewData?.loyaltyDiscount > 0)) && (
              <div className="space-y-2">
                {discount > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Giảm giá trực tiếp</span>
                    <span className="text-red-500 font-black">-{formatVND(discount)}</span>
                  </div>
                )}
                {previewData?.loyaltyDiscount > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider animate-in slide-in-from-right duration-300">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Gift size={10} /> Chiết khấu hội viên
                    </span>
                    <span className="text-emerald-600 font-black">-{formatVND(previewData.loyaltyDiscount)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center text-gray-400 font-bold text-[10px] uppercase tracking-wider">
               <span>Thuế VAT ({taxRate}%)</span>
               <span className="text-gray-900">{formatVND(taxAmount)}</span>
            </div>
            <div className="pt-4 flex justify-between items-end">
               <span className="font-black text-gray-900 uppercase text-xs">Tổng cộng</span>
               <div className="text-right relative">
                 {isPreviewLoading && <Loader2 size={16} className="absolute -left-6 top-1/2 -translate-y-1/2 animate-spin text-gold-400" />}
                 <span className={cn(
                   "text-3xl font-black tracking-tighter tabular-nums transition-colors",
                   isPreviewLoading ? "text-gray-200" : "text-gold-600"
                 )}>
                   {formatVND(total)}
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* Right: Thao tác thanh toán & Tùy chọn nâng cao */}
        {/* flex-col: header cố định trên, nội dung scroll ở giữa, nút pin ở dưới */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Header cố định */}
          <div className="flex justify-between items-start px-8 pt-8 pb-4 shrink-0">
            <div>
               <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Hoàn tất đơn hàng</h2>
               <p className="text-gray-400 text-sm mt-0.5 font-medium">Chọn phương thức và kiểm tra chiết khấu.</p>
            </div>
            <button onClick={onClose} disabled={isPaying} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Phần nội dung cuộn được ở giữa — flex-1 overflow-y-auto đảm bảo nút không bị đẩy ra ngoài */}
          <div className="flex-1 overflow-y-auto px-8 pb-2">
          <div className="grid grid-cols-2 gap-6 mb-4">
            {/* Cột chọn phương thức */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Phương thức</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'CASH', label: 'Tiền mặt', icon: Banknote },
                  { id: 'TRANSFER', label: 'Chuyển khoản', icon: CreditCard },
                  { id: 'QR', label: 'VietQR / Momo', icon: QrCode },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                      method === m.id ? "bg-gold-50 border-gold-400 ring-4 ring-gold-500/5 shadow-md" : "bg-white border-gray-50 hover:border-gold-100"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", method === m.id ? "bg-gold-600 text-white" : "bg-gray-100 text-gray-400")}>
                      <m.icon size={20} />
                    </div>
                    <span className="font-black text-xs uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cột cấu hình chiết khấu & Thuế */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Ưu đãi & Thuế</label>
                
                {/* Manual Discount Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex items-center gap-1">
                    <Percent size={14} />
                    <span className="text-[8px] font-black">Giảm</span>
                  </div>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="Số tiền giảm..."
                    className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-16 pr-4 rounded-2xl text-xs font-black outline-none focus:border-gold-300"
                  />
                </div>

                {/* Tax Rate Selection */}
                <div className="flex gap-2">
                  {[0, 8, 10].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setTaxRate(rate)}
                      className={cn(
                        "flex-1 py-2 rounded-xl border font-black text-[10px] transition-all",
                        taxRate === rate ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                      )}
                    >
                      VAT {rate}%
                    </button>
                  ))}
                </div>

                {/* Loyalty Toggle — Luôn hiển thị để người dùng biết tính năng này tồn tại */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (!previewData?.currentTierName || previewData.currentTierName === 'Chưa xếp hạng') {
                        toast.error('Khách hàng này chưa có hạng để áp dụng chiết khấu.');
                        return;
                      }
                      setApplyLoyalty(!applyLoyalty);
                    }}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all group",
                      applyLoyalty 
                        ? "bg-emerald-50 border-emerald-400 shadow-md shadow-emerald-600/5" 
                        : "bg-white border-gray-100 hover:border-emerald-100",
                      (!previewData?.currentTierName || previewData.currentTierName === 'Chưa xếp hạng') && "opacity-50 grayscale cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                        applyLoyalty ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-400 group-hover:text-emerald-500"
                      )}>
                        <Gift size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">Dùng chiết khấu hội viên</p>
                        <p className={cn("text-[8px] font-bold uppercase", applyLoyalty ? "text-emerald-600" : "text-gray-300")}>
                          {previewData?.currentTierName && previewData.currentTierName !== 'Chưa xếp hạng'
                            ? `${Number(previewData.currentTierDiscountRate || 0).toFixed(0)}% giảm giá hạng ${previewData.currentTierName}`
                            : 'Yêu cầu hạng Bronze trở lên'}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      applyLoyalty ? "bg-emerald-600 border-emerald-600" : "border-gray-200"
                    )}>
                      {applyLoyalty && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                  </button>

                  {/* Bảng quyền lợi hạng — luôn hiển thị, skeleton khi chưa load */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Info size={12} className="text-gold-500" />
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Quyền lợi hạng</span>
                    </div>
                    {tiers.length === 0 ? (
                      // Skeleton khi tiers đang load
                      <div className="space-y-1.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {tiers.map(t => {
                          // Highlight hạng hiện tại của khách
                          const isCurrentTier = previewData?.currentTierName === t.name;
                          return (
                            <div key={t.id} className={cn(
                              "flex justify-between items-center text-[9px] px-2 py-1 rounded-xl transition-colors",
                              isCurrentTier ? "bg-gold-50 border border-gold-100" : ""
                            )}>
                              <span className={cn(
                                "font-black uppercase flex items-center gap-1",
                                isCurrentTier ? "text-gold-600" : "text-gray-400"
                              )}>
                                {isCurrentTier && <Star size={8} fill="currentColor" />}
                                {t.name}
                              </span>
                              <div className="flex-1 border-b border-dotted border-gray-200 mx-2" />
                              <span className={cn(
                                "font-black",
                                isCurrentTier ? "text-gold-700" : "text-gray-700"
                              )}>
                                Giảm {Number(t.discountRate).toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>{/* end grid */}
          </div>{/* end scrollable area */}

          {/* Nút thanh toán — luôn hiển thị ở dưới cùng, không bị ảnh hưởng bởi scroll */}
          <div className="px-8 pb-6 pt-3 border-t border-gray-50 shrink-0 space-y-3 bg-white">
            <div className="relative">
              <div className="relative">
                <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-500" />
                <input
                  type="text"
                  value={formatVND(total)}
                  readOnly
                  className="w-full bg-gray-900 border-none py-4 pl-12 pr-8 rounded-[1.5rem] text-2xl font-black text-white outline-none shadow-xl shadow-gray-900/20"
                />
                {isPreviewLoading && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="animate-spin text-gold-500/50" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={onClose} disabled={isPaying} className="py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all">
                Hủy bỏ
              </button>
              <button
                onClick={executePayment}
                disabled={isPaying || hasUnservedItems || isPreviewLoading}
                className={cn(
                  "py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                  isPaying || hasUnservedItems || isPreviewLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gold-600 text-white hover:bg-gold-700 shadow-xl shadow-gold-600/20 active:scale-95"
                )}
              >
                {isPaying ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />}
                {isPaying ? 'Đang xử lý...' : 'Xác nhận & In hóa đơn'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
