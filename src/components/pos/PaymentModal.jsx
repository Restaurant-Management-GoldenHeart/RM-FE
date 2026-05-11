import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  ReceiptText,
  Loader2,
  Percent,
  DollarSign,
  Gift,
  ChevronRight,
  ShoppingBag,
  Star,
  UserRound,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useKitchenStore } from '../../store/useKitchenStore';
import paymentApi from '../../services/api/paymentApi';
import tableApi from '../../services/api/tableApi';
import { customerTierApi } from '../../api/customerTierApi';
import { customerApi } from '../../api/customerApi';
import { cn } from '../../utils/cn';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const formatPoints = (points) =>
  new Intl.NumberFormat('vi-VN').format(points ?? 0);

const formatPercent = (rate) => {
  const numericRate = Number(rate ?? 0);
  if (!Number.isFinite(numericRate) || numericRate <= 0) return '0%';
  return `${numericRate % 1 === 0 ? numericRate.toFixed(0) : numericRate.toFixed(1)}%`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const METHOD_MAP = {
  CASH: 'CASH',
  TRANSFER: 'CARD',
  QR: 'QR_CODE',
};

const PaymentModal = ({ isOpen, onClose, table, order }) => {
  const [method, setMethod] = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(8);
  const [isPaying, setIsPaying] = useState(false);
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [mobileView, setMobileView] = useState('PAYMENT');
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  const activeCustomerId = previewData?.customerId ?? order?.customerId ?? order?.customer?.id ?? null;
  const hasCustomer = Boolean(activeCustomerId);
  const customerName = customerProfile?.name || previewData?.customerName || order?.customer?.name || 'Khach le';
  const currentTierRate = Number(
    customerProfile?.tierDiscountRate ?? previewData?.currentTierDiscountRate ?? 0
  );
  const canApplyLoyalty = hasCustomer && currentTierRate > 0;
  const loyaltyApplied = canApplyLoyalty && applyLoyalty;
  const memberDiscountValue = loyaltyApplied ? Number(previewData?.loyaltyDiscount ?? 0) : 0;

  const fetchPreview = useCallback(async () => {
    if (!order?.id || !isOpen) return;
    setIsPreviewLoading(true);
    try {
      const apiResponse = await paymentApi.previewCheckout({
        orderId: order.id,
        discount: discount || 0,
        taxRate: taxRate || 0,
        applyLoyaltyDiscount: loyaltyApplied,
      });
      setPreviewData(apiResponse?.data ?? null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setPreviewData(null);
      console.error('[PaymentModal] preview error:', status);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [activeCustomerId, discount, isOpen, loyaltyApplied, order?.id, taxRate]);

  const fetchTiers = useCallback(async () => {
    if (!isOpen || !hasCustomer) {
      setTiers([]);
      return;
    }

    setTiersLoading(true);
    try {
      const response = await customerTierApi.getCustomerTiers(true);
      setTiers(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error('[PaymentModal] tier fetch error:', err);
      setTiers([]);
    } finally {
      setTiersLoading(false);
    }
  }, [hasCustomer, isOpen]);

  const fetchCustomerProfile = useCallback(async () => {
    if (!isOpen || !activeCustomerId) {
      setCustomerProfile(null);
      return;
    }

    setCustomerLoading(true);
    try {
      const response = await customerApi.getCustomerById(activeCustomerId);
      setCustomerProfile(response?.data ?? null);
    } catch (err) {
      console.error('[PaymentModal] customer fetch error:', err);
      setCustomerProfile(null);
    } finally {
      setCustomerLoading(false);
    }
  }, [activeCustomerId, isOpen]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  useEffect(() => {
    fetchCustomerProfile();
  }, [fetchCustomerProfile]);

  useEffect(() => {
    if (isOpen) {
      setApplyLoyalty(false);
      setDiscount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!canApplyLoyalty && applyLoyalty) {
      setApplyLoyalty(false);
    }
  }, [applyLoyalty, canApplyLoyalty]);

  const loyaltyProgress = useMemo(() => {
    if (!hasCustomer || !previewData) return null;

    const sortedTiers = [...tiers]
      .map((tier) => ({
        ...tier,
        minPoints: Number(tier.minPoints ?? 0),
        discountRate: Number(tier.discountRate ?? 0),
      }))
      .sort((a, b) => a.minPoints - b.minPoints);

    const currentPoints = Number(customerProfile?.loyaltyPoints ?? previewData.currentPoints ?? 0);
    const earnedPoints = Number(previewData.earnedLoyaltyPoints ?? 0);
    const projectedPoints = Number(previewData.projectedPointsAfterPayment ?? currentPoints);
    const currentTier =
      sortedTiers.find((tier) => tier.id === (customerProfile?.tierId ?? previewData.currentTierId)) ||
      [...sortedTiers].reverse().find((tier) => currentPoints >= tier.minPoints) ||
      null;
    const nextTier = sortedTiers.find((tier) => tier.minPoints > currentPoints) || null;

    if (!nextTier) {
      return {
        currentPoints,
        earnedPoints,
        projectedPoints,
        currentTier,
        nextTier: null,
        progress: 100,
        reachesNextTier: false,
        remainingAfterPayment: 0,
      };
    }

    const floorPoints = currentTier?.minPoints ?? 0;
    const targetPoints = nextTier.minPoints;
    const projectedProgress = clamp(
      (projectedPoints - floorPoints) / Math.max(targetPoints - floorPoints, 1),
      0,
      1
    );

    return {
      currentPoints,
      earnedPoints,
      projectedPoints,
      currentTier,
      nextTier,
      progress: Math.round(projectedProgress * 100),
      reachesNextTier: projectedPoints >= targetPoints,
      remainingAfterPayment: Math.max(targetPoints - projectedPoints, 0),
    };
  }, [customerProfile, hasCustomer, previewData, tiers]);

  const subTotal = useMemo(() => {
    if (previewData) return previewData.subtotal;
    if (!order) return 0;
    return order.items
      .filter((item) => item.status !== 'CANCELLED')
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order, previewData]);

  const taxAmount = useMemo(() => {
    if (previewData) return previewData.tax;
    return (subTotal - discount) * (taxRate / 100);
  }, [discount, previewData, subTotal, taxRate]);

  const total = useMemo(() => {
    if (previewData) return previewData.total;
    return subTotal - discount + taxAmount;
  }, [previewData, subTotal, discount, taxAmount]);

  const hasUnservedItems = useMemo(() => {
    if (!order) return false;
    return order.items.some((item) => !['SERVED', 'CANCELLED'].includes(item.status));
  }, [order]);

  const executePayment = async () => {
    if (isPaying || isPreviewLoading) return;
    if (hasUnservedItems) {
      toast.error('Con mon chua phuc vu!');
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
        applyLoyaltyDiscount: loyaltyApplied,
        paymentMethod: METHOD_MAP[method] ?? 'CASH',
        paidAmount: 0,
      });
      bill = billApiResponse?.data;
      if (!bill?.id) throw new Error('No bill ID');
    } catch (err) {
      setIsPaying(false);
      toast.error(err?.message || 'Loi tao hoa don');
      return;
    }

    try {
      await paymentApi.addPayment(bill.id, total, METHOD_MAP[method] ?? 'CASH');
      toast.success('Thanh toan thanh cong!');

      const tableStore = useTableStore.getState();
      try {
        useKitchenStore.getState().clearOrderFromKitchen(order.id);
        useOrderStore.getState().clearOrder(order.id);
        try {
          await tableApi.updateTableStatus(table.id, 'CLEANING');
        } catch (e) {
          if (e?.response?.status !== 409) console.warn('Table status update failed', e);
        }
      } catch (err) {
        console.error('Cleanup error', err);
      }

      tableStore.setCurrentOrderTarget({ type: null, id: null, name: null });
      tableStore.setSelectedTableId(null);

      await tableStore.fetchTables();
      onClose();
    } catch (error) {
      console.error('Payment error', error);
      toast.error('Thanh toan that bai!');
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen || !table || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full lg:max-w-5xl h-[90vh] lg:h-[720px] rounded-t-[2.5rem] lg:rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in slide-in-from-bottom-8 mt-auto lg:mt-0">
        <div
          className={cn(
            'lg:w-[400px] bg-gray-50/50 lg:border-r border-gray-100 flex-col p-5 lg:p-8 overflow-hidden',
            mobileView === 'INVOICE' ? 'flex flex-1' : 'hidden lg:flex'
          )}
        >
          <div className="flex lg:hidden items-center justify-between mb-4">
            <button
              onClick={() => setMobileView('PAYMENT')}
              className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-sm"
            >
              <ChevronRight size={14} className="rotate-180" />
              Quay lai
            </button>
            <span className="text-[9px] font-bold text-gray-400 uppercase">{table.tableNumber}</span>
          </div>

          <div className="hidden lg:flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/20">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase text-lg">Hoa don</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{table.tableNumber}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
            {order.items.filter((item) => item.status !== 'CANCELLED').map((item) => (
              <div key={item.id} className="flex justify-between items-start py-0.5">
                <div className="flex-1 pr-3">
                  <p className="text-[10px] font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[8px] text-gray-400 font-bold">
                    {item.quantity} x {formatVND(item.price)}
                  </p>
                </div>
                <p className="text-[10px] font-black text-gray-900 tabular-nums">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 space-y-1.5 mt-3 shrink-0">
            <div className="flex justify-between items-center text-gray-400 font-bold text-[9px] uppercase">
              <span>Tam tinh</span>
              <span className="text-gray-900">{formatVND(subTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400 font-bold text-[9px] uppercase">
              <span>VAT ({taxRate}%)</span>
              <span className="text-gray-900">{formatVND(taxAmount)}</span>
            </div>
            {hasCustomer && (
              <div className={cn(
                'flex justify-between items-center text-[9px] font-bold uppercase',
                loyaltyApplied ? 'text-emerald-600' : 'text-gray-400'
              )}>
                <span>Member ({formatPercent(currentTierRate)})</span>
                <span className="font-black">
                  {loyaltyApplied ? `-${formatVND(memberDiscountValue)}` : formatVND(0)}
                </span>
              </div>
            )}
            {previewData?.manualDiscount > 0 && (
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-amber-600">
                <span>Giam gia</span>
                <span className="font-black">-{formatVND(previewData.manualDiscount)}</span>
              </div>
            )}

            {previewData?.loyaltyDiscount > 0 && (
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-emerald-600">
                <span>Uu dai hoi vien</span>
                <span className="font-black">-{formatVND(previewData.loyaltyDiscount)}</span>
              </div>
            )}
            <div className="pt-2 flex justify-between items-end">
              <span className="font-black text-gray-900 uppercase text-[10px]">Tong cong</span>
              <span className="text-xl font-black text-gold-600">{formatVND(total)}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex-1 flex-col bg-white overflow-hidden',
            mobileView === 'PAYMENT' ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="flex justify-between items-start px-6 pt-5 pb-2 shrink-0">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tighter">Thanh toan</h2>
              <p className="text-gray-400 text-[10px] font-medium">Chon phuong thuc va uu dai phu hop.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileView('INVOICE')}
                className="lg:hidden w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gold-600"
              >
                <ShoppingBag size={18} />
              </button>
              <button
                onClick={onClose}
                disabled={isPaying}
                className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-2 no-scrollbar">
            <div className="space-y-4 mb-4">
              {hasCustomer ? (
                <div className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-500">
                        Khach hang
                      </p>
                      <h3 className="mt-2 text-sm font-black text-gray-900 truncate">{customerName}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">
                          <UserRound size={10} />
                          {customerProfile?.tierName || previewData?.currentTierName || order?.customer?.tierName || 'Thanh vien'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-gray-200 px-2.5 py-1 text-[9px] font-black uppercase text-gray-600">
                          <Star size={10} />
                          {formatPoints(loyaltyProgress?.currentPoints ?? 0)} diem
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/80 border border-white px-3 py-2 text-right shadow-sm shrink-0">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Hoa don nay</p>
                      <p className="mt-1 text-sm font-black text-emerald-600">
                        +{formatPoints(loyaltyProgress?.earnedPoints ?? 0)}
                      </p>
                    </div>
                  </div>

                  {tiersLoading || customerLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                      <Loader2 size={12} className="animate-spin" />
                      Dang tai thong tin hoi vien
                    </div>
                  ) : loyaltyProgress?.nextTier ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span className="text-gray-500">
                          {loyaltyProgress.currentTier?.name || 'Khoi diem'}
                        </span>
                        <span className="text-emerald-700">{loyaltyProgress.nextTier.name}</span>
                      </div>
                      <div className="mt-2 h-2.5 rounded-full bg-white/80 border border-emerald-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-500"
                          style={{ width: `${loyaltyProgress.progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-gray-600 leading-relaxed">
                        {loyaltyProgress.reachesNextTier
                          ? `Sau hoa don nay khach du dieu kien len hang ${loyaltyProgress.nextTier.name}.`
                          : `Sau hoa don nay con ${formatPoints(loyaltyProgress.remainingAfterPayment)} diem de dat ${loyaltyProgress.nextTier.name}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white/80 border border-amber-100 px-3 py-3">
                      <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                        Khach hang dang o hang cao nhat. Hoa don nay van tiep tuc cong diem tich luy.
                      </p>
                    </div>
                  )}

                  {!tiersLoading && !customerLoading && canApplyLoyalty && (
                    <button
                      onClick={() => setApplyLoyalty((current) => !current)}
                      className={cn(
                        'mt-4 w-full rounded-2xl border px-4 py-3 transition-all text-left',
                        loyaltyApplied
                          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white/90 hover:border-emerald-200 hover:bg-emerald-50/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0',
                              loyaltyApplied
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-gray-300 bg-white text-transparent'
                            )}
                          >
                            <CheckCircle2 size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
                              Giam gia hoi vien
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-emerald-700 leading-relaxed">
                              Bat de ap dung uu dai hang {customerProfile?.tierName || previewData?.currentTierName || 'Thanh vien'} ({formatPercent(currentTierRate)})
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[8px] font-black uppercase text-gray-400">Member</p>
                          <p className={cn(
                            'mt-1 text-sm font-black',
                            loyaltyApplied ? 'text-emerald-600' : 'text-gray-300'
                          )}>
                            {loyaltyApplied ? `-${formatVND(memberDiscountValue)}` : formatVND(0)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!tiersLoading && !customerLoading && hasCustomer && !canApplyLoyalty && (
                    <div className="mt-4 rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md border-2 border-gray-200 bg-gray-50 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                            Giam gia hoi vien
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-gray-500 leading-relaxed">
                            Khach hien tai chua co ty le giam gia theo hang. Hoa don nay van duoc cong diem tich luy.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-gray-200 bg-gray-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">Hoi vien</p>
                      <p className="mt-2 text-[11px] font-bold text-gray-600 leading-relaxed">
                        Gan khach hang vao don de mo uu dai hoi vien va theo doi lo trinh len hang.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase block ml-1">Phuong thuc</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'CASH', label: 'Tien mat', icon: Banknote },
                    { id: 'TRANSFER', label: 'Chuyen khoan', icon: CreditCard },
                    { id: 'QR', label: 'VietQR / Momo', icon: QrCode },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMethod(item.id)}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all',
                        method === item.id ? 'bg-gold-50 border-gold-400 shadow-sm' : 'bg-white border-gray-50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          method === item.id ? 'bg-gold-600 text-white' : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        <item.icon size={16} />
                      </div>
                      <span className="font-black text-[10px] uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-gray-400 uppercase block ml-1">Uu dai va thue</label>
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
                  {[0, 8, 10].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setTaxRate(rate)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg border font-black text-[9px]',
                        taxRate === rate ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'
                      )}
                    >
                      VAT {rate}%
                    </button>
                  ))}
                </div>

              </div>
            </div>
          </div>

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
              <button
                onClick={onClose}
                disabled={isPaying}
                className="py-4 rounded-xl font-black text-[10px] uppercase text-gray-400 border border-gray-100"
              >
                Dong
              </button>
              <button
                onClick={executePayment}
                disabled={isPaying || hasUnservedItems || isPreviewLoading}
                className={cn(
                  'py-4 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg transition-all',
                  isPaying || hasUnservedItems || isPreviewLoading
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gold-600 text-white shadow-gold-600/20'
                )}
              >
                {isPaying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isPaying ? 'Dang gui...' : 'Thanh toan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
