import React, { useState, useMemo, useEffect } from 'react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useKitchenStore } from '../../store/useKitchenStore';
import { useAuthStore } from '../../store/useAuthStore';
import paymentApi from '../../services/api/paymentApi';
import tableApi from '../../services/api/tableApi';
import { cn } from '../../utils/cn';
import {
  X, CheckCircle2, CreditCard, Banknote,
  QrCode, ReceiptText, Loader2,
  Percent, DollarSign, AlertTriangle,
  Star, TrendingUp, Gift, Info, ChevronRight, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customerTierApi } from '../../api/customerTierApi';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const METHOD_MAP = {
  CASH:     'CASH',
  TRANSFER: 'CARD',
  QR:       'QR_CODE',
};

const PaymentModal = ({ isOpen, onClose, table, order }) => {
  const [method, setMethod]           = useState('CASH');
  const [discount, setDiscount]       = useState(0);
  const [taxRate, setTaxRate]         = useState(8);
  const [isPaying, setIsPaying]       = useState(false);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [tiers, setTiers] = useState([]);

  const fetchTiers = async () => {
    try {
      const apiResponse = await customerTierApi.getCustomerTiers();
      const rawTiers = apiResponse?.data ?? [];
      const sortedTiers = Array.isArray(rawTiers)
        ? [...rawTiers].sort((a, b) => (a.minPoints ?? 0) - (b.minPoints ?? 0))
        : [];
      setTiers(sortedTiers);
    } catch (err) {
      console.error('[PaymentModal] fetchTiers error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTiers();
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    if (!order?.id || !isOpen) return;
    setIsPreviewLoading(true);
    try {
      const apiResponse = await paymentApi.previewCheckout({
        orderId: order.id,
        discount: discount || 0,
        taxRate: taxRate || 0,
        applyLoyaltyDiscount: applyLoyalty,
      });
      setPreviewData(apiResponse?.data ?? null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setPreviewData(null);
      console.error('[PaymentModal] preview error:', status);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPreview();
  }, [isOpen, discount, taxRate, applyLoyalty, order?.id, order?.customer?.id]);

  useEffect(() => {
    if (isOpen) {
      setApplyLoyalty(false);
      setDiscount(0);
    }
  }, [isOpen]);

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

  const total = useMemo(() => {
    if (previewData) return previewData.total;
    return subTotal - discount + taxAmount;
  }, [previewData, subTotal, discount, taxAmount]);

  const hasUnservedItems = useMemo(() => {
    if (!order) return false;
    return order.items.some(i => !['SERVED', 'CANCELLED'].includes(i.status));
  }, [order]);

  const executePayment = async () => {
    if (isPaying || isPreviewLoading) return;
    if (hasUnservedItems) {
      toast.error('Còn món chưa phục vụ!');
      return;
    }
    if (!order?.id) return;

    setIsPaying(true);
    let bill = null;
    try {
      const billApiResponse = await paymentApi.createBill({
        orderId: order.id,
        taxRate,
        discount,
        applyLoyaltyDiscount: applyLoyalty,
        paymentMethod: METHOD_MAP[method] ?? 'CASH',
        paidAmount: 0,
      });
      bill = billApiResponse?.data;
      if (!bill?.id) throw new Error('No bill ID');
    } catch (err) {
      setIsPaying(false);
      toast.error(err?.message || 'Lỗi tạo hóa đơn');
      return;
    }

    try {
      await paymentApi.addPayment(bill.id, total, METHOD_MAP[method] ?? 'CASH');
      toast.success('Thanh toán thành công!');
      
      try {
        useKitchenStore.getState().clearOrderFromKitchen(order.id);
        try {
          await tableApi.updateTableStatus(table.id, 'CLEANING');
        } catch (e) {
          if (e?.response?.status !== 409) console.warn('Table status update failed', e);
        }
      } catch (err) {
        console.error('Cleanup error', err);
      }

      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      await useTableStore.getState().fetchTables(branchId);
      useTableStore.setState({ selectedTableId: null });
      onClose();
    } catch (err) {
      toast.error('Thanh toán thất bại!');
    } finally {
      setIsPaying(false);
    }
  };

  const [mobileView, setMobileView] = useState('PAYMENT');

  if (!isOpen || !table || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full lg:max-w-5xl h-[90vh] lg:h-[720px] rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in slide-in-from-bottom-8 mt-auto lg:mt-0">
        
        {/* Left Panel */}
        <div className={cn(
          "lg:w-[400px] bg-gray-50/50 lg:border-r border-gray-100 flex-col p-5 lg:p-8 overflow-hidden",
          mobileView === 'INVOICE' ? 'flex flex-1' : 'hidden lg:flex'
        )}>
          <div className="flex lg:hidden items-center justify-between mb-4">
            <button onClick={() => setMobileView('PAYMENT')} className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
              <ChevronRight size={14} className="rotate-180" /> Quay lại
            </button>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{table.tableNumber}</span>
          </div>

          <div className="hidden lg:flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase text-lg">Hoá đơn</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{table.tableNumber}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
            {order.items.filter(i => i.status !== 'CANCELLED').map(item => (
              <div key={item.id} className="flex justify-between items-start py-0.5">
                <div className="flex-1 pr-3">
                  <p className="text-[10px] font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[8px] text-gray-400 font-bold">{item.quantity} x {formatVND(item.price)}</p>
                </div>
                <p className="text-[10px] font-black text-gray-900 tabular-nums">{formatVND(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 space-y-1.5 mt-3 shrink-0">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[9px] uppercase">
               <span>Tạm tính</span>
               <span className="text-gray-900">{formatVND(subTotal)}</span>
            </div>
            {previewData?.loyaltyDiscount > 0 && (
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-emerald-600">
                <span>Ưu đãi hội viên</span>
                <span className="font-black">-{formatVND(previewData.loyaltyDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-gray-400 font-bold text-[9px] uppercase">
               <span>VAT ({taxRate}%)</span>
               <span className="text-gray-900">{formatVND(taxAmount)}</span>
            </div>
            <div className="pt-2 flex justify-between items-end">
               <span className="font-black text-gray-900 uppercase text-[10px]">Tổng cộng</span>
               <span className="text-xl font-black text-gold-600">{formatVND(total)}</span>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={cn(
          "flex-1 flex-col bg-white overflow-hidden",
          mobileView === 'PAYMENT' ? 'flex' : 'hidden lg:flex'
        )}>
          <div className="flex justify-between items-start px-6 pt-5 pb-2 shrink-0">
            <div>
               <h2 className="text-xl font-black text-gray-900 tracking-tighter">Thanh toán</h2>
               <p className="text-gray-400 text-[10px] font-medium">Chọn phương thức & ưu đãi.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileView('INVOICE')} className="lg:hidden w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gold-600">
                <ShoppingBag size={18} />
              </button>
              <button onClick={onClose} disabled={isPaying} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-2 no-scrollbar">
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase block ml-1">Phương thức</label>
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
                        "flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all",
                        method === m.id ? "bg-gold-50 border-gold-400 shadow-sm" : "bg-white border-gray-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", method === m.id ? "bg-gold-600 text-white" : "bg-gray-100 text-gray-400")}>
                        <m.icon size={16} />
                      </div>
                      <span className="font-black text-[10px] uppercase">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase block ml-1">Ưu đãi & Thuế</label>
                <div className="relative">
                  <Percent size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-100 py-2.5 pl-9 pr-4 rounded-xl text-[10px] font-black outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {[0, 8, 10].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setTaxRate(rate)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg border font-black text-[9px]",
                        taxRate === rate ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-100"
                      )}
                    >
                      VAT {rate}%
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setApplyLoyalty(!applyLoyalty)}
                  className={cn(
                    "w-full p-2.5 rounded-xl border-2 flex items-center justify-between transition-all",
                    applyLoyalty ? "bg-emerald-50 border-emerald-400" : "bg-white border-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", applyLoyalty ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-400")}>
                      <Gift size={14} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase leading-none mb-0.5">Hội viên</p>
                      <p className={cn("text-[7px] font-bold uppercase", applyLoyalty ? "text-emerald-600" : "text-gray-300")}>Dùng ưu đãi tích điểm</p>
                    </div>
                  </div>
                  <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center", applyLoyalty ? "bg-emerald-600 border-emerald-600" : "border-gray-200")}>
                    {applyLoyalty && <CheckCircle2 size={8} className="text-white" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-28 pt-3 border-t border-gray-50 shrink-0 space-y-3 bg-white">
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-500" />
              <input
                type="text"
                value={formatVND(total)}
                readOnly
                className="w-full bg-gray-900 border-none py-3.5 pl-10 pr-6 rounded-2xl text-lg font-black text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onClose} disabled={isPaying} className="py-4 rounded-xl font-black text-[10px] uppercase text-gray-400 border border-gray-100">
                Đóng
              </button>
              <button
                onClick={executePayment}
                disabled={isPaying || hasUnservedItems || isPreviewLoading}
                className={cn(
                  "py-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all",
                  isPaying || hasUnservedItems || isPreviewLoading ? "bg-gray-100 text-gray-400" : "bg-gold-600 text-white shadow-gold-600/20"
                )}
              >
                {isPaying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isPaying ? 'Đang gửi...' : 'Thanh toán'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
