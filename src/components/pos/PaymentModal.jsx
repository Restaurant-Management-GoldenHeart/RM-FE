/**
 * Modal thanh toán của POS.
 *
 * File này gom nhiều side-effect:
 * - preview bill, tax, discount và loyalty
 * - tạo bill và thu tiền thủ công
 * - tạo, polling, khôi phục và hủy giao dịch payOS
 * - dọn dẹp state order, kitchen và table sau khi thanh toán xong
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
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
  ChevronRight,
  ShoppingBag,
  Star,
  UserRound,
  ShieldCheck,
  ExternalLink,
  Copy,
  RefreshCw,
  CircleAlert,
} from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useKitchenStore } from '../../store/useKitchenStore';
import orderApi from '../../api/orderApi';
import paymentApi from '../../api/paymentApi';
import tableApi from '../../api/tableApi';
import { reportApi } from '../../api/reportApi';
import { customerTierApi } from '../../api/customerTierApi';
import { customerApi } from '../../api/customerApi';
import { groupOrderItemsForSummary } from '../../api/mappers/orderMapper';
import { cn } from '../../utils/cn';
import { downloadBlobAsFile } from '../../utils/fileDownload';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const formatPoints = (points) =>
  new Intl.NumberFormat('vi-VN').format(points ?? 0);

const formatPercent = (rate) => {
  const numericRate = Number(rate ?? 0);
  if (!Number.isFinite(numericRate) || numericRate <= 0) return '0%';
  return `${numericRate % 1 === 0 ? numericRate.toFixed(0) : numericRate.toFixed(1)}%`;
};

const formatDateTime = (value) => {
  if (!value) return 'Khong co';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const METHOD_MAP = {
  CASH: 'CASH',
  TRANSFER: 'CARD',
  QR: 'QR_CODE',
  PAYOS: 'PAYOS_QR',
};

const PAYOS_STATUS_LABELS = {
  PENDING: 'Dang cho thanh toan',
  PAID: 'Da thanh toan',
  CANCELLED: 'Da huy',
  EXPIRED: 'Het han',
  FAILED: 'That bai',
};

const PAYOS_POLL_INTERVAL = 3000;
const PAYOS_SESSION_PREFIX = 'goldenheart-payos-order-';

// Màu sắc theo hạng thành viên — đồng bộ với TierBadge.jsx
const TIER_PALETTE = {
  dong:     { color: '#b45309', border: '#b453094d', bg: 'rgba(251,191,36,0.07)',  bar: '#f59e0b', label: 'Đồng'     },
  bac:      { color: '#64748b', border: '#64748b4d', bg: 'rgba(148,163,184,0.08)', bar: '#94a3b8', label: 'Bạc'      },
  vang:     { color: '#ca8a04', border: '#ca8a044d', bg: 'rgba(202,138,4,0.07)',   bar: '#ca8a04', label: 'Vàng'     },
  bach_kim: { color: '#3b82f6', border: '#3b82f64d', bg: 'rgba(147,197,253,0.08)', bar: '#60a5fa', label: 'Bạch kim' },
  kim_cuong:{ color: '#0891b2', border: '#0891b24d', bg: 'rgba(103,232,249,0.08)', bar: '#22d3ee', label: 'Kim cương'},
  default:  { color: '#6b7280', border: '#6b728033', bg: 'rgba(243,244,246,0.6)',  bar: '#9ca3af', label: 'Thành viên'},
};

const getTierPalette = (tierName) => {
  const n = (tierName || '').toLowerCase();
  if (n.includes('kim cương') || n.includes('kim cuong')) return TIER_PALETTE.kim_cuong;
  if (n.includes('bạch kim') || n.includes('bach kim'))   return TIER_PALETTE.bach_kim;
  if (n.includes('vàng') || n.includes('vang'))           return TIER_PALETTE.vang;
  if (n.includes('bạc') || n.includes('bac'))             return TIER_PALETTE.bac;
  if (n.includes('đồng') || n.includes('dong'))           return TIER_PALETTE.dong;
  return TIER_PALETTE.default;
};
const INVOICE_DOWNLOAD_RETRY_LIMIT = 5;
const INVOICE_DOWNLOAD_RETRY_DELAY = 700;

const parseApiMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const isPayOsTerminalStatus = (status) =>
  ['PAID', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(status);

const getPayOsSessionKey = (orderId) =>
  orderId ? `${PAYOS_SESSION_PREFIX}${orderId}` : null;

const getPayOsStatusClasses = (status) => {
  switch (status) {
    case 'PAID':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'EXPIRED':
    case 'FAILED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
};

const toSafeNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const deriveTaxRateFromBill = (bill) => {
  const subtotal = toSafeNumber(bill?.subtotal);
  const tax = toSafeNumber(bill?.tax);

  if (subtotal <= 0 || tax <= 0) {
    return 0;
  }

  return Number(((tax / subtotal) * 100).toFixed(2));
};

const buildPreviewDataFromBill = (bill, order) => {
  if (!bill) return null;

  const manualDiscount = toSafeNumber(bill.manualDiscount ?? bill.discount);
  const loyaltyDiscount = toSafeNumber(bill.loyaltyDiscount);

  return {
    orderId: order?.id ?? bill.orderId,
    customerId: bill.customerId ?? order?.customer?.id ?? null,
    customerName: bill.customerName ?? order?.customer?.name ?? null,
    currentTierId: bill.appliedTierId ?? order?.customer?.tierId ?? null,
    currentTierName: bill.appliedTierName ?? order?.customer?.tierName ?? null,
    currentTierDiscountRate: toSafeNumber(bill.appliedTierDiscountRate),
    earnedLoyaltyPoints: bill.earnedLoyaltyPoints ?? 0,
    subtotal: toSafeNumber(bill.subtotal),
    taxRate: deriveTaxRateFromBill(bill),
    tax: toSafeNumber(bill.tax),
    manualDiscount,
    loyaltyDiscount,
    totalDiscount: manualDiscount + loyaltyDiscount,
    total: toSafeNumber(bill.total),
  };
};

const findLatestOpenBill = (bills) =>
  [...bills]
    .sort((left, right) => Number(right?.id ?? 0) - Number(left?.id ?? 0))
    .find((bill) => bill?.status !== 'PAID') ?? null;

const billHasRecordedPayments = (bill) =>
  toSafeNumber(bill?.paidAmount) > 0 ||
  (Array.isArray(bill?.payments) && bill.payments.length > 0);

const getBillRemainingAmount = (bill) =>
  toSafeNumber(bill?.remainingAmount);

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
  const [activeBill, setActiveBill] = useState(null);
  const [payOsTransaction, setPayOsTransaction] = useState(null);
  const [payOsQrImageUrl, setPayOsQrImageUrl] = useState('');
  const [isPayOsSyncing, setIsPayOsSyncing] = useState(false);
  const [isCancellingPayOs, setIsCancellingPayOs] = useState(false);
  const [isSettlingPayOs, setIsSettlingPayOs] = useState(false);
  const [shouldDownloadInvoicePdf, setShouldDownloadInvoicePdf] = useState(false);
  const pricingLockRef = useRef(false);
  const lockedPreviewDataRef = useRef(null);

  const activeCustomerId = previewData?.customerId ?? order?.customerId ?? order?.customer?.id ?? null;
  const hasCustomer = Boolean(activeCustomerId);
  const customerName = customerProfile?.name || previewData?.customerName || order?.customer?.name || 'Khach le';
  const currentTierRate = Number(
    customerProfile?.tierDiscountRate ?? previewData?.currentTierDiscountRate ?? 0
  );
  const canApplyLoyalty = hasCustomer && currentTierRate > 0;
  const loyaltyApplied = canApplyLoyalty && applyLoyalty;
  const memberDiscountValue = loyaltyApplied ? Number(previewData?.loyaltyDiscount ?? 0) : 0;
  // Session key dùng để khôi phục transaction payOS đang chờ khi đóng modal hoặc F5.
  const payOsSessionKey = useMemo(() => getPayOsSessionKey(order?.id), [order?.id]);
  const hasRecordedPayments = billHasRecordedPayments(activeBill);

  const payOsResultBaseUrl = useMemo(() => {
    const envBaseUrl = import.meta.env.VITE_PAYOS_RESULT_BASE_URL?.trim();
    const fallbackBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return (envBaseUrl || fallbackBaseUrl).replace(/\/+$/, '');
  }, []);

  const buildPayOsResultUrl = useCallback((kind, billId, transactionId) => {
    const baseUrl = `${payOsResultBaseUrl}/${kind === 'success' ? 'payment-success' : 'payment-cancel'}`;
    const params = new URLSearchParams();

    if (order?.id) params.set('orderId', String(order.id));
    if (table?.id) params.set('tableId', String(table.id));
    if (billId) params.set('billId', String(billId));
    if (transactionId) params.set('transactionId', String(transactionId));

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [order?.id, payOsResultBaseUrl, table?.id]);

  const savePayOsSession = useCallback((billId, transactionId) => {
    if (!payOsSessionKey || !billId || !transactionId) return;
    try {
      sessionStorage.setItem(payOsSessionKey, JSON.stringify({ billId, transactionId }));
    } catch (error) {
      console.warn('[PaymentModal] cannot persist payOS session', error);
    }
  }, [payOsSessionKey]);

  const clearPayOsSession = useCallback(() => {
    if (!payOsSessionKey) return;
    try {
      sessionStorage.removeItem(payOsSessionKey);
    } catch (error) {
      console.warn('[PaymentModal] cannot clear payOS session', error);
    }
  }, [payOsSessionKey]);

  const openPayOsCheckout = useCallback((checkoutUrl) => {
    if (!checkoutUrl) {
      toast.error('PayOS chua tra ve checkout URL.');
      return;
    }

    const popup = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      toast.error('Trinh duyet da chan popup. Dung nut copy link de mo thu cong.');
    }
  }, []);

  const downloadInvoicePdfForBill = useCallback(async (billId, options = {}) => {
    if (!billId) return;

    const { silentSuccess = false, maxAttempts = INVOICE_DOWNLOAD_RETRY_LIMIT } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const blob = await reportApi.downloadBillInvoicePdf(billId);
        downloadBlobAsFile(blob, `hoa-don-${billId}.pdf`);
        if (!silentSuccess) {
          toast.success('Da tai hoa don PDF.');
        }
        return true;
      } catch (error) {
        const shouldRetry =
          error?.response?.status === 409 &&
          attempt < maxAttempts;

        if (shouldRetry) {
          await wait(INVOICE_DOWNLOAD_RETRY_DELAY);
          continue;
        }

        console.error('[PaymentModal] download invoice PDF failed', error);
        toast.error(parseApiMessage(error, 'Khong tai duoc hoa don PDF.'));
        return false;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!payOsTransaction?.qrCode) {
      setPayOsQrImageUrl('');
      return undefined;
    }

    QRCode.toDataURL(payOsTransaction.qrCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setPayOsQrImageUrl(dataUrl);
        }
      })
      .catch((error) => {
        console.error('[PaymentModal] cannot render payOS QR locally', error);
        if (!cancelled) {
          setPayOsQrImageUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payOsTransaction?.qrCode]);

  const hydrateBillSnapshot = useCallback((bill) => {
    if (!bill) return;

    setActiveBill(bill);
    setDiscount(toSafeNumber(bill.manualDiscount ?? bill.discount));
    setTaxRate(deriveTaxRateFromBill(bill));
    setApplyLoyalty(toSafeNumber(bill.loyaltyDiscount) > 0);
    setPreviewData(buildPreviewDataFromBill(bill, order));
  }, [order]);

  // Tìm bill chưa PAID mới nhất của order, sau đó tìm transaction payOS gắn với bill đó.
  // Nếu transaction vẫn PENDING thì modal giữ nguyên luồng payOS thay vì tạo session mới.
  const restoreExistingPayOsContext = useCallback(async (options = {}) => {
    if (!order?.id) return null;

    const { silent = false } = options;
    if (!silent) {
      setIsPayOsSyncing(true);
    }

    try {
      const billsResponse = await orderApi.getBillsByOrderId(order.id);
      const orderBills = Array.isArray(billsResponse?.data) ? billsResponse.data : [];
      const latestOpenBill = findLatestOpenBill(orderBills);

      if (!latestOpenBill) {
        setActiveBill(null);
        setPayOsTransaction(null);
        clearPayOsSession();
        return null;
      }

      hydrateBillSnapshot(latestOpenBill);

      const transactionResponse = await paymentApi.getLatestPayOsQr(latestOpenBill.id);
      const restoredTransaction = transactionResponse?.data ?? null;

      if (!restoredTransaction) {
        setPayOsTransaction(null);
        clearPayOsSession();
        return { bill: latestOpenBill, transaction: null };
      }

      setPayOsTransaction(restoredTransaction);

      if (restoredTransaction.status === 'PENDING') {
        setMethod('PAYOS');
        savePayOsSession(restoredTransaction.billId, restoredTransaction.transactionId);
      } else if (restoredTransaction.status !== 'PAID') {
        clearPayOsSession();
      }

      return { bill: latestOpenBill, transaction: restoredTransaction };
    } catch (error) {
      if (!silent) {
        toast.error(parseApiMessage(error, 'Khong khoi phuc duoc giao dich PayOS hien co.'));
      }
      return null;
    } finally {
      if (!silent) {
        setIsPayOsSyncing(false);
      }
    }
  }, [clearPayOsSession, hydrateBillSnapshot, order?.id, savePayOsSession]);

  const fetchPreview = useCallback(async () => {
    if (!order?.id || !isOpen) return;

    // Khi bill đã có payment hoặc đang tồn tại QR payOS pending,
    // công thức giá tiền phải được đóng băng theo snapshot đã chốt.
    if (pricingLockRef.current) {
      setPreviewData(lockedPreviewDataRef.current);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const apiResponse = await paymentApi.previewCheckout({
        orderId: order.id,
        discount: discount || 0,
        taxRate: taxRate || 0,
        applyLoyaltyDiscount: loyaltyApplied,
      });

      if (pricingLockRef.current) {
        return;
      }

      setPreviewData(apiResponse?.data ?? null);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setPreviewData(null);
      console.error('[PaymentModal] preview error:', status);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [discount, isOpen, loyaltyApplied, order?.id, taxRate]);

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
      setShouldDownloadInvoicePdf(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!canApplyLoyalty && applyLoyalty) {
      setApplyLoyalty(false);
    }
  }, [applyLoyalty, canApplyLoyalty]);

  useEffect(() => {
    setMethod('CASH');
    setActiveBill(null);
    setPayOsTransaction(null);
    setIsSettlingPayOs(false);
  }, [order?.id]);

  useEffect(() => {
    if (!isOpen || !order?.id) return;
    void restoreExistingPayOsContext({ silent: true });
  }, [isOpen, order?.id, restoreExistingPayOsContext]);

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

  // Màu hạng hiện tại và hạng tiếp theo
  const tc  = getTierPalette(customerProfile?.tierName ?? previewData?.currentTierName ?? order?.customer?.tierName);
  const ntc = getTierPalette(loyaltyProgress?.nextTier?.name);

  const paymentItems = useMemo(() => {
    if (!order) return [];
    return order.summaryItems?.length ? order.summaryItems : groupOrderItemsForSummary(order.items || []);
  }, [order]);

  const subTotal = useMemo(() => {
    if (previewData) return previewData.subtotal;
    if (!order) return 0;
    return paymentItems.reduce((sum, item) => sum + Number(item.lineTotal ?? item.price * item.quantity), 0);
  }, [order, paymentItems, previewData]);

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
    return order.items.some((item) => !['SERVED', 'READY', 'CANCELLED'].includes(item.status));
  }, [order]);

  const payOsStatus = payOsTransaction?.status ?? null;
  const hasPendingPayOs = payOsStatus === 'PENDING';
  const isPayOsMode = method === 'PAYOS';
  const lockPricingInputs = hasPendingPayOs || hasRecordedPayments;
  const amountDueNow = hasRecordedPayments
    ? getBillRemainingAmount(activeBill)
    : total;

  useEffect(() => {
    const shouldLockPricing = hasPendingPayOs || hasRecordedPayments;
    const lockedPreview = activeBill ? buildPreviewDataFromBill(activeBill, order) : null;

    // Khóa input ngay khi bill đã bắt đầu có nghĩa vụ thu tiền.
    pricingLockRef.current = shouldLockPricing;
    lockedPreviewDataRef.current = lockedPreview;

    if (shouldLockPricing && lockedPreview) {
      setPreviewData(lockedPreview);
    }
  }, [activeBill, hasPendingPayOs, hasRecordedPayments, order]);

  // Ưu tiên dùng lại bill đang mở để tránh tạo bill trùng.
  // Khi bill đã có payment thì không được phép tính lại tổng tiền nữa.
  const createOrReuseBill = useCallback(async (paymentMethod) => {
    const existingContext = await restoreExistingPayOsContext({ silent: true });
    const existingBill = existingContext?.bill ?? activeBill;

    if (billHasRecordedPayments(existingBill)) {
      hydrateBillSnapshot(existingBill);
      return existingBill;
    }

    const billApiResponse = await paymentApi.createBill({
      orderId: order.id,
      taxRate,
      discount,
      applyLoyaltyDiscount: loyaltyApplied,
      paymentMethod,
      paidAmount: 0,
    });

    const nextBill = billApiResponse?.data;
    if (!nextBill?.id) {
      throw new Error('No bill ID');
    }

    setActiveBill(nextBill);
    return nextBill;
  }, [activeBill, discount, hydrateBillSnapshot, loyaltyApplied, order?.id, restoreExistingPayOsContext, taxRate]);

  // Sau khi đã thu tiền xong, cần dọn dẹp đồng bộ trên tất cả store liên quan.
  const finalizeSuccessfulPayment = useCallback(async () => {
    const tableStore = useTableStore.getState();

    try {
      useKitchenStore.getState().clearOrderFromKitchen(order.id);
      useOrderStore.getState().clearOrder(order.id);
      try {
        await tableApi.updateTableStatus(table.id, 'CLEANING');
      } catch (error) {
        if (error?.response?.status !== 409) {
          console.warn('Table status update failed', error);
        }
      }
    } catch (error) {
      console.error('Cleanup error', error);
    }

    tableStore.setCurrentOrderTarget({ type: null, id: null, name: null });
    tableStore.setSelectedTableId(null);

    await tableStore.fetchTables();
    clearPayOsSession();
    setPayOsTransaction(null);
    setActiveBill(null);
    onClose();
  }, [clearPayOsSession, onClose, order?.id, table?.id]);

  // Polling transaction payOS là lớp bổ sung cho webhook để modal cập nhật UI ngay lập tức.
  const syncPayOsTransaction = useCallback(async (transactionId, options = {}) => {
    if (!transactionId) return null;

    const { silent = false } = options;
    if (!silent) {
      setIsPayOsSyncing(true);
    }

    try {
      const response = await paymentApi.getPaymentGatewayTransaction(transactionId);
      const nextTransaction = response?.data ?? null;

      setPayOsTransaction(nextTransaction);
      if (nextTransaction?.billId) {
        setActiveBill((current) => {
          if (current?.id === nextTransaction.billId) return current;
          return { id: nextTransaction.billId };
        });
      }

      if (nextTransaction?.status === 'PENDING') {
        savePayOsSession(nextTransaction.billId, nextTransaction.transactionId);
        setMethod('PAYOS');
      } else if (nextTransaction?.status && nextTransaction.status !== 'PAID') {
        clearPayOsSession();
      }

      return nextTransaction;
    } catch (error) {
      if (!silent) {
        toast.error(parseApiMessage(error, 'Khong dong bo duoc giao dich PayOS.'));
      } else {
        console.warn('[PaymentModal] payOS polling failed', error);
      }
      return null;
    } finally {
      if (!silent) {
        setIsPayOsSyncing(false);
      }
    }
  }, [clearPayOsSession, savePayOsSession]);

  useEffect(() => {
    if (!isOpen || !payOsSessionKey) return;

    try {
      const rawSession = sessionStorage.getItem(payOsSessionKey);
      if (!rawSession) return;

      const parsedSession = JSON.parse(rawSession);
      if (parsedSession?.billId) {
        setActiveBill({ id: parsedSession.billId });
      }
      if (parsedSession?.transactionId) {
        setMethod('PAYOS');
        void syncPayOsTransaction(parsedSession.transactionId, { silent: true });
      }
    } catch (error) {
      console.warn('[PaymentModal] invalid payOS session data', error);
      clearPayOsSession();
    }
  }, [clearPayOsSession, isOpen, payOsSessionKey, syncPayOsTransaction]);

  useEffect(() => {
    if (!isOpen || !payOsTransaction?.transactionId || payOsTransaction.status !== 'PENDING') return undefined;

    const intervalId = window.setInterval(() => {
      void syncPayOsTransaction(payOsTransaction.transactionId, { silent: true });
    }, PAYOS_POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [isOpen, payOsTransaction?.status, payOsTransaction?.transactionId, syncPayOsTransaction]);

  useEffect(() => {
    if (!isOpen || payOsTransaction?.status !== 'PAID' || isSettlingPayOs) return;

    setIsSettlingPayOs(true);
    toast.success('PayOS da xac nhan thanh toan.');

    (async () => {
      try {
        if (shouldDownloadInvoicePdf && (payOsTransaction?.billId ?? activeBill?.id)) {
          await downloadInvoicePdfForBill(payOsTransaction?.billId ?? activeBill?.id, { silentSuccess: true });
        }
        await finalizeSuccessfulPayment();
      } catch (error) {
        console.error('[PaymentModal] finalize payOS payment failed', error);
        toast.error('Da nhan thanh toan PayOS nhung khong dong bo duoc POS.');
      } finally {
        setIsSettlingPayOs(false);
      }
    })();
  }, [
    activeBill?.id,
    downloadInvoicePdfForBill,
    finalizeSuccessfulPayment,
    isOpen,
    isSettlingPayOs,
    payOsTransaction?.billId,
    payOsTransaction?.status,
    shouldDownloadInvoicePdf,
  ]);

  const copyPayOsCheckoutUrl = useCallback(async () => {
    if (!payOsTransaction?.checkoutUrl) {
      toast.error('Chua co checkout URL de copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(payOsTransaction.checkoutUrl);
      toast.success('Da copy link PayOS.');
    } catch (error) {
      console.error('[PaymentModal] cannot copy payOS link', error);
      toast.error('Khong copy duoc link PayOS.');
    }
  }, [payOsTransaction?.checkoutUrl]);

  const handleCancelPayOs = useCallback(async () => {
    const billId = activeBill?.id ?? payOsTransaction?.billId;
    if (!billId || !hasPendingPayOs) {
      toast.error('Khong co QR PayOS dang cho de huy.');
      return;
    }

    setIsCancellingPayOs(true);
    try {
      const response = await paymentApi.cancelPayOsQr(billId, 'Cancelled from POS');
      const cancelledTransaction = response?.data ?? null;
      setPayOsTransaction(cancelledTransaction);
      clearPayOsSession();
      toast.success('Da huy QR PayOS.');
    } catch (error) {
      toast.error(parseApiMessage(error, 'Huy QR PayOS that bai.'));
    } finally {
      setIsCancellingPayOs(false);
    }
  }, [activeBill?.id, clearPayOsSession, hasPendingPayOs, payOsTransaction?.billId]);

  // Luồng thu tiền thủ công. Nếu bill đã có thanh toán một phần thì chỉ thu phần còn lại.
  const executeManualPayment = useCallback(async () => {
    const resolvedMethod = METHOD_MAP[method] ?? 'CASH';

    setIsPaying(true);
    try {
      const bill = await createOrReuseBill(resolvedMethod);
      const paymentAmount = billHasRecordedPayments(bill)
        ? getBillRemainingAmount(bill)
        : amountDueNow;

      if (paymentAmount <= 0) {
        toast('Bill nay khong con so du de thu them.');
        return;
      }

      const paymentResponse = await paymentApi.addPayment(bill.id, paymentAmount, resolvedMethod);
      const paidBill = paymentResponse?.data ?? bill;
      if (shouldDownloadInvoicePdf && paidBill?.status === 'PAID') {
        await downloadInvoicePdfForBill(paidBill.id, { silentSuccess: true });
      }
      toast.success('Thanh toan thanh cong!');
      clearPayOsSession();
      await finalizeSuccessfulPayment();
    } catch (error) {
      const errorMessage = parseApiMessage(error, 'Thanh toan that bai!');
      if (error?.response?.status === 409 && errorMessage.includes('recorded payments cannot be recalculated')) {
        const restored = await restoreExistingPayOsContext({ silent: true });
        const existingBill = restored?.bill;
        const remainingAmount = getBillRemainingAmount(existingBill);

        if (existingBill?.id && remainingAmount > 0) {
          try {
            const paymentResponse = await paymentApi.addPayment(existingBill.id, remainingAmount, resolvedMethod);
            const paidBill = paymentResponse?.data ?? existingBill;
            if (shouldDownloadInvoicePdf && paidBill?.status === 'PAID') {
              await downloadInvoicePdfForBill(paidBill.id, { silentSuccess: true });
            }
            toast.success('Thanh toan thanh cong!');
            clearPayOsSession();
            await finalizeSuccessfulPayment();
          } catch (retryError) {
            console.error('Payment retry error', retryError);
            toast.error(parseApiMessage(retryError, 'Thanh toan that bai!'));
          }
          return;
        }
      }
      if (error?.response?.status === 409 && errorMessage.includes('active payOS QR request')) {
        const restored = await restoreExistingPayOsContext({ silent: true });
        if (restored?.transaction?.status === 'PENDING') {
          setMethod('PAYOS');
          toast('Don nay dang co QR PayOS cho. Huy hoac hoan tat QR truoc khi doi phuong thuc.');
          return;
        }
      }
      console.error('Payment error', error);
      toast.error(errorMessage);
    } finally {
      setIsPaying(false);
    }
  }, [
    amountDueNow,
    clearPayOsSession,
    createOrReuseBill,
    downloadInvoicePdfForBill,
    finalizeSuccessfulPayment,
    method,
    restoreExistingPayOsContext,
    shouldDownloadInvoicePdf,
  ]);

  // Luồng tạo hoặc khôi phục QR payOS cho bill đang mở.
  const executePayOsPayment = useCallback(async () => {
    if (hasPendingPayOs) {
      toast('QR PayOS dang cho thanh toan. Hien QR tren man hinh hoac huy QR cu neu can.');
      return;
    }

    setIsPaying(true);
    try {
      const bill = await createOrReuseBill(METHOD_MAP.PAYOS);
      const response = await paymentApi.createPayOsQr(bill.id, {
        returnUrl: buildPayOsResultUrl('success', bill.id, payOsTransaction?.transactionId),
        cancelUrl: buildPayOsResultUrl('cancel', bill.id, payOsTransaction?.transactionId),
      });

      const nextTransaction = response?.data;
      if (!nextTransaction?.transactionId) {
        throw new Error('PayOS did not return a transaction ID');
      }

      setActiveBill(bill);
      setPayOsTransaction(nextTransaction);
      setMethod('PAYOS');
      savePayOsSession(bill.id, nextTransaction.transactionId);
      toast.success('Da tao ma QR PayOS tren man hinh.');
    } catch (error) {
      const errorMessage = parseApiMessage(error, 'Tao QR PayOS that bai.');
      if (error?.response?.status === 409 && errorMessage.includes('active payOS QR request')) {
        const restored = await restoreExistingPayOsContext({ silent: true });
        if (restored?.transaction?.status === 'PENDING') {
          toast('Bill dang co QR PayOS cho nay. Toi da khoi phuc lai giao dich dang cho.');
          return;
        }
      }
      console.error('[PaymentModal] create payOS QR failed', error);
      toast.error(errorMessage);
    } finally {
      setIsPaying(false);
    }
  }, [
    buildPayOsResultUrl,
    createOrReuseBill,
    hasPendingPayOs,
    payOsTransaction?.transactionId,
    restoreExistingPayOsContext,
    savePayOsSession,
  ]);

  // Nút chính của modal đi qua đây để quyết định dùng luồng thủ công hay payOS.
  const executePayment = async () => {
    if (isPaying || isPreviewLoading || isSettlingPayOs) return;
    if (hasUnservedItems) {
      toast.error('Con mon chua phuc vu!');
      return;
    }
    if (!order?.id) return;

    if (isPayOsMode) {
      await executePayOsPayment();
      return;
    }

    await executeManualPayment();
  };

  const payOsActionLabel = useMemo(() => {
    if (isSettlingPayOs) return 'Dang dong bo...';
    if (isPaying) return 'Dang gui...';
    if (!isPayOsMode) return hasRecordedPayments ? 'Thu not' : 'Thanh toan';
    if (hasPendingPayOs) return 'Dang cho PayOS';
    if (isPayOsTerminalStatus(payOsStatus)) return 'Tao lai QR PayOS';
    return 'Tao QR PayOS';
  }, [hasPendingPayOs, hasRecordedPayments, isPayOsMode, isPaying, isSettlingPayOs, payOsStatus]);

  if (!isOpen || !table || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden p-0 lg:items-center lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative mt-auto flex h-[90vh] w-full flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl animate-in slide-in-from-bottom-8 lg:mt-0 lg:h-[720px] lg:max-w-5xl lg:flex-row lg:rounded-[2.5rem]">
        <div
          className={cn(
            'flex-col overflow-hidden border-gray-200 bg-white p-5 lg:flex lg:w-[400px] lg:border-r lg:p-7',
            mobileView === 'INVOICE' ? 'flex flex-1' : 'hidden'
          )}
        >
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button
              onClick={() => setMobileView('PAYMENT')}
              className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-[9px] font-black uppercase text-gray-500 shadow-sm"
            >
              <ChevronRight size={14} className="rotate-180" />
              Quay lai
            </button>
            <span className="text-[9px] font-bold uppercase text-gray-400">{table.tableNumber}</span>
          </div>

          {/* Bill header — giống header hóa đơn PDF */}
          <div className="mb-5 hidden border-b border-gray-200 pb-4 lg:block">
            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">GoldenHeart POS</p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-gray-900">Hóa Đơn</h3>
            <p className="mt-0.5 text-[10px] font-bold text-gray-400">{table.tableNumber}</p>
          </div>

          {/* Items — dạng bảng giống bill PDF */}
          <div className="no-scrollbar flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: '44%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '26%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="pb-2 text-left text-[8px] font-black uppercase tracking-[0.16em] text-gray-400">Món ăn</th>
                  <th className="pb-2 text-center text-[8px] font-black uppercase tracking-[0.16em] text-gray-400">SL</th>
                  <th className="pb-2 text-right text-[8px] font-black uppercase tracking-[0.16em] text-gray-400">Đơn giá</th>
                  <th className="pb-2 text-right text-[8px] font-black uppercase tracking-[0.16em] text-gray-400">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {paymentItems.map((item) => (
                  <tr key={`${item.menuItemId}-${item.price}-${item.note || ''}`} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-[11px] font-bold text-gray-900">{item.name}</td>
                    <td className="py-2 text-center text-[10px] tabular-nums text-gray-500">{item.quantity}</td>
                    <td className="py-2 text-right text-[10px] tabular-nums text-gray-500 whitespace-nowrap">{formatVND(item.price)}</td>
                    <td className="py-2 text-right text-[11px] font-bold tabular-nums text-gray-900 whitespace-nowrap">{formatVND(item.lineTotal ?? item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          <div className="mt-3 shrink-0 space-y-1.5 border-t border-gray-900 pt-3">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-400">
              <span>Tạm tính</span>
              <span className="tabular-nums text-gray-700">{formatVND(subTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-400">
              <span>VAT ({taxRate}%)</span>
              <span className="tabular-nums text-gray-700">{formatVND(taxAmount)}</span>
            </div>
            {hasCustomer && (
              <div className={cn(
                'flex items-center justify-between text-[9px] font-bold uppercase',
                loyaltyApplied ? 'text-gray-700' : 'text-gray-400'
              )}>
                <span>Member ({formatPercent(currentTierRate)})</span>
                <span className="tabular-nums font-black">
                  {loyaltyApplied ? `-${formatVND(memberDiscountValue)}` : formatVND(0)}
                </span>
              </div>
            )}
            {previewData?.manualDiscount > 0 && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-700">
                <span>Giảm giá</span>
                <span className="tabular-nums font-black">-{formatVND(previewData.manualDiscount)}</span>
              </div>
            )}
            {hasRecordedPayments && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-600">
                <span>Đã thanh toán</span>
                <span className="tabular-nums font-black">{formatVND(activeBill?.paidAmount)}</span>
              </div>
            )}
            {hasRecordedPayments && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-600">
                <span>Còn phải thu</span>
                <span className="tabular-nums font-black">{formatVND(amountDueNow)}</span>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-dashed border-gray-300 pt-2.5">
              <span className="text-[10px] font-black uppercase text-gray-900">Tổng cộng</span>
              <span className="text-xl font-black text-gray-900">{formatVND(total)}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex-1 flex-col overflow-hidden bg-white',
            mobileView === 'PAYMENT' ? 'flex' : 'hidden lg:flex'
          )}
        >
          <div className="shrink-0 px-6 pb-2 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tighter text-gray-900">Thanh toan</h2>
                <p className="text-[10px] font-medium text-gray-400">Chon phuong thuc va uu dai phu hop.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileView('INVOICE')}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gold-600 lg:hidden"
                >
                  <ShoppingBag size={18} />
                </button>
                <button
                  onClick={onClose}
                  disabled={isPaying || isSettlingPayOs}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-2">
            <div className="mb-4 space-y-4">
              {hasCustomer ? (
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: tc.border, backgroundColor: tc.bg }}
                >
                  {/* Header: tên KH + tier badge + điểm */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">
                        Khách hàng
                      </p>
                      <h3 className="mt-2 truncate text-sm font-black text-gray-900">{customerName}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Tier badge — màu theo hạng */}
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase"
                          style={{ color: tc.color, borderColor: tc.border, backgroundColor: 'white' }}
                        >
                          <UserRound size={10} />
                          {customerProfile?.tierName || previewData?.currentTierName || order?.customer?.tierName || 'Thành viên'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase text-gray-600">
                          <Star size={10} />
                          {formatPoints(loyaltyProgress?.currentPoints ?? 0)} điểm
                        </span>
                      </div>
                    </div>

                    {/* Điểm kiếm từ hóa đơn này */}
                    <div
                      className="shrink-0 rounded-xl border bg-white px-3 py-2 text-right"
                      style={{ borderColor: tc.border }}
                    >
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Hóa đơn này</p>
                      <p className="mt-1 text-sm font-black" style={{ color: tc.color }}>
                        +{formatPoints(loyaltyProgress?.earnedPoints ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Progress tier */}
                  {tiersLoading || customerLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
                      <Loader2 size={12} className="animate-spin" />
                      Đang tải thông tin hội viên
                    </div>
                  ) : loyaltyProgress?.nextTier ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase">
                        <span style={{ color: tc.color }}>
                          {loyaltyProgress.currentTier?.name || 'Khởi điểm'}
                        </span>
                        <span style={{ color: ntc.color }}>{loyaltyProgress.nextTier.name}</span>
                      </div>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${loyaltyProgress.progress}%`, background: `linear-gradient(to right, ${tc.bar}, ${ntc.bar})` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold leading-relaxed text-gray-500">
                        {loyaltyProgress.reachesNextTier
                          ? `Sau hóa đơn này khách đủ điều kiện lên hạng ${loyaltyProgress.nextTier.name}.`
                          : `Sau hóa đơn này còn ${formatPoints(loyaltyProgress.remainingAfterPayment)} điểm để đạt ${loyaltyProgress.nextTier.name}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border bg-white/80 px-3 py-3" style={{ borderColor: tc.border }}>
                      <p className="text-[10px] font-bold leading-relaxed text-gray-500">
                        Khách hàng đang ở hạng cao nhất. Hóa đơn này vẫn tiếp tục cộng điểm tích lũy.
                      </p>
                    </div>
                  )}

                  {/* Loyalty discount toggle */}
                  {!tiersLoading && !customerLoading && canApplyLoyalty && (
                    <button
                      onClick={() => setApplyLoyalty((current) => !current)}
                      disabled={lockPricingInputs}
                      className={cn(
                        'mt-4 w-full rounded-xl border bg-white px-4 py-3 text-left transition-all',
                        lockPricingInputs && 'cursor-not-allowed opacity-60'
                      )}
                      style={loyaltyApplied
                        ? { borderColor: tc.color, boxShadow: `0 0 0 1px ${tc.border}` }
                        : { borderColor: '#e5e7eb' }
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all"
                            style={loyaltyApplied
                              ? { borderColor: tc.color, backgroundColor: tc.color, color: 'white' }
                              : { borderColor: '#d1d5db', backgroundColor: 'white', color: 'transparent' }
                            }
                          >
                            <CheckCircle2 size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
                              Giảm giá hội viên
                            </p>
                            <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-500">
                              Bật để áp dụng ưu đãi hạng {customerProfile?.tierName || previewData?.currentTierName || 'Thành viên'} ({formatPercent(currentTierRate)})
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[8px] font-black uppercase text-gray-400">Member</p>
                          <p
                            className="mt-1 text-sm font-black transition-all"
                            style={{ color: loyaltyApplied ? tc.color : '#d1d5db' }}
                          >
                            {loyaltyApplied ? `-${formatVND(memberDiscountValue)}` : formatVND(0)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )}

                  {!tiersLoading && !customerLoading && hasCustomer && !canApplyLoyalty && (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-white/80 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-gray-200 bg-gray-50" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                            Giảm giá hội viên
                          </p>
                          <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-500">
                            Khách hiện tại chưa có tỉ lệ giảm giá theo hạng. Hóa đơn này vẫn được cộng điểm tích lũy.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">Hội viên</p>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-600">
                        Gán khách hàng vào đơn để mở ưu đãi hội viên và theo dõi lộ trình lên hạng.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="ml-1 block text-[9px] font-black uppercase text-gray-400">Phuong thuc</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'CASH', label: 'Tien mat', icon: Banknote },
                    { id: 'TRANSFER', label: 'Chuyen khoan', icon: CreditCard },
                    { id: 'QR', label: 'QR noi bo', icon: QrCode },
                    { id: 'PAYOS', label: 'PayOS QR', icon: ExternalLink },
                  ].map((item) => {
                    const isLockedOption = hasPendingPayOs && item.id !== 'PAYOS';

                    return (
                      <button
                        key={item.id}
                        onClick={() => setMethod(item.id)}
                        disabled={isLockedOption || isPaying || isSettlingPayOs}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border-2 p-2.5 transition-all',
                          method === item.id ? 'border-gold-400 bg-gold-50 shadow-sm' : 'border-gray-50 bg-white',
                          (isLockedOption || isSettlingPayOs) && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            method === item.id ? 'bg-gold-600 text-white' : 'bg-gray-100 text-gray-400'
                          )}
                        >
                          <item.icon size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isPayOsMode && payOsTransaction && (
                <div className="rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]',
                          getPayOsStatusClasses(payOsStatus)
                        )}>
                          {PAYOS_STATUS_LABELS[payOsStatus] || 'Dang cho thanh toan'}
                        </span>
                        {isPayOsSyncing && <Loader2 size={12} className="animate-spin text-sky-600" />}
                      </div>
                      <h3 className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900">PayOS</h3>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                      <ExternalLink size={18} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Bill</p>
                      <p className="mt-2 text-sm font-black text-slate-900">#{payOsTransaction.billId}</p>
                    </div>
                    <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Het han</p>
                      <p className="mt-2 text-sm font-black text-slate-900">{formatDateTime(payOsTransaction.expiredAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">QR PayOS</p>
                      <div className="mt-3 flex min-h-[212px] items-center justify-center rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 p-3">
                        {payOsQrImageUrl ? (
                          <img
                            src={payOsQrImageUrl}
                            alt={`PayOS QR bill ${payOsTransaction.billId}`}
                            className="h-full w-full max-w-[180px] rounded-xl bg-white object-contain p-2"
                          />
                        ) : payOsTransaction.qrCode ? (
                          <div className="flex flex-col items-center gap-2 text-center text-slate-500">
                            <Loader2 size={18} className="animate-spin" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                              Dang tao QR
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center text-slate-400">
                            <QrCode size={22} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                              Chua co du lieu QR
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => openPayOsCheckout(payOsTransaction.checkoutUrl)}
                      disabled={!payOsTransaction.checkoutUrl}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] shadow-sm',
                        payOsTransaction.checkoutUrl
                          ? 'bg-slate-950 text-white'
                          : 'cursor-not-allowed bg-gray-100 text-gray-400'
                      )}
                    >
                      <ExternalLink size={14} />
                      Mo trang payOS
                    </button>
                    <button
                      onClick={copyPayOsCheckoutUrl}
                      disabled={!payOsTransaction.checkoutUrl}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
                        payOsTransaction.checkoutUrl
                          ? 'border-slate-200 bg-white text-slate-700'
                          : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                      )}
                    >
                      <Copy size={14} />
                      Copy link
                    </button>
                    <button
                      onClick={() => syncPayOsTransaction(payOsTransaction.transactionId)}
                      disabled={isPayOsSyncing || isSettlingPayOs}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
                        isPayOsSyncing || isSettlingPayOs
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                          : 'border-sky-200 bg-sky-50 text-sky-700'
                      )}
                    >
                      {isPayOsSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Lam moi
                    </button>
                    <button
                      onClick={handleCancelPayOs}
                      disabled={!hasPendingPayOs || isCancellingPayOs || isSettlingPayOs}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
                        !hasPendingPayOs || isCancellingPayOs || isSettlingPayOs
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      )}
                    >
                      {isCancellingPayOs ? <Loader2 size={14} className="animate-spin" /> : <CircleAlert size={14} />}
                      Huy QR
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="ml-1 block text-[9px] font-black uppercase text-gray-400">Uu dai va thue</label>
                <div className="relative">
                  <Percent size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={discount}
                    onChange={(event) => setDiscount(Number(event.target.value))}
                    disabled={lockPricingInputs}
                    className={cn(
                      'w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-9 pr-4 text-[10px] font-black outline-none',
                      lockPricingInputs && 'cursor-not-allowed opacity-60'
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  {[0, 8, 10].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setTaxRate(rate)}
                      disabled={lockPricingInputs}
                      className={cn(
                        'flex-1 rounded-lg border py-1.5 text-[9px] font-black',
                        taxRate === rate ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-white text-gray-400',
                        lockPricingInputs && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      VAT {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-gray-50 bg-white px-6 pb-28 pt-3">
            <div className="relative">
              <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-500" />
              <input
                type="text"
                value={formatVND(amountDueNow)}
                readOnly
                className="w-full rounded-2xl border-none bg-gray-900 py-3.5 pl-10 pr-6 text-lg font-black text-white outline-none"
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-700">
                  Xuat file PDF
                </p>
                <p className="mt-1 text-[10px] font-medium text-gray-400">
                  Tu dong tai hoa don PDF ngay sau khi bill da thanh toan.
                </p>
              </div>
              <input
                type="checkbox"
                checked={shouldDownloadInvoicePdf}
                onChange={(event) => setShouldDownloadInvoicePdf(event.target.checked)}
                disabled={isPaying || isSettlingPayOs}
                className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                disabled={isPaying || isSettlingPayOs}
                className="rounded-xl border border-gray-100 py-4 text-[10px] font-black uppercase text-gray-400"
              >
                Dong
              </button>
              <button
                onClick={executePayment}
                disabled={isPaying || hasUnservedItems || isPreviewLoading || isSettlingPayOs || hasPendingPayOs}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl py-4 text-[10px] font-black uppercase shadow-lg transition-all',
                  isPaying || hasUnservedItems || isPreviewLoading || isSettlingPayOs || hasPendingPayOs
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gold-600 text-white shadow-gold-600/20'
                )}
              >
                {isPaying || isSettlingPayOs ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {payOsActionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
