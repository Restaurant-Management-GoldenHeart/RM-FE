import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import orderApi from '../../services/api/orderApi';
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

const parseApiMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

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
  const [isPayOsSyncing, setIsPayOsSyncing] = useState(false);
  const [isCancellingPayOs, setIsCancellingPayOs] = useState(false);
  const [isSettlingPayOs, setIsSettlingPayOs] = useState(false);
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

  const hydrateBillSnapshot = useCallback((bill) => {
    if (!bill) return;

    setActiveBill(bill);
    setDiscount(toSafeNumber(bill.manualDiscount ?? bill.discount));
    setTaxRate(deriveTaxRateFromBill(bill));
    setApplyLoyalty(toSafeNumber(bill.loyaltyDiscount) > 0);
    setPreviewData(buildPreviewDataFromBill(bill, order));
  }, [order]);

  const restoreExistingPayOsContext = useCallback(async (options = {}) => {
    if (!order?.id) return null;

    const { silent = false, openCheckout = false } = options;
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
        if (openCheckout && restoredTransaction.checkoutUrl) {
          openPayOsCheckout(restoredTransaction.checkoutUrl);
        }
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
  }, [clearPayOsSession, hydrateBillSnapshot, openPayOsCheckout, order?.id, savePayOsSession]);

  const fetchPreview = useCallback(async () => {
    if (!order?.id || !isOpen) return;

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

    pricingLockRef.current = shouldLockPricing;
    lockedPreviewDataRef.current = lockedPreview;

    if (shouldLockPricing && lockedPreview) {
      setPreviewData(lockedPreview);
    }
  }, [activeBill, hasPendingPayOs, hasRecordedPayments, order]);

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
        await finalizeSuccessfulPayment();
      } catch (error) {
        console.error('[PaymentModal] finalize payOS payment failed', error);
        toast.error('Da nhan thanh toan PayOS nhung khong dong bo duoc POS.');
      } finally {
        setIsSettlingPayOs(false);
      }
    })();
  }, [finalizeSuccessfulPayment, isOpen, isSettlingPayOs, payOsTransaction?.status]);

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

      await paymentApi.addPayment(bill.id, paymentAmount, resolvedMethod);
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
            await paymentApi.addPayment(existingBill.id, remainingAmount, resolvedMethod);
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
  }, [amountDueNow, clearPayOsSession, createOrReuseBill, finalizeSuccessfulPayment, method, restoreExistingPayOsContext]);

  const executePayOsPayment = useCallback(async () => {
    if (hasPendingPayOs) {
      toast('QR PayOS dang cho thanh toan. Mo lai trang checkout hoac huy QR cu.');
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
      toast.success('Da tao QR PayOS.');
      openPayOsCheckout(nextTransaction.checkoutUrl);
    } catch (error) {
      const errorMessage = parseApiMessage(error, 'Tao QR PayOS that bai.');
      if (error?.response?.status === 409 && errorMessage.includes('active payOS QR request')) {
        const restored = await restoreExistingPayOsContext({ silent: true, openCheckout: true });
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
    openPayOsCheckout,
    payOsTransaction?.transactionId,
    restoreExistingPayOsContext,
    savePayOsSession,
  ]);

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
            'flex-col overflow-hidden border-gray-100 bg-gray-50/50 p-5 lg:flex lg:w-[400px] lg:border-r lg:p-8',
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

          <div className="mb-6 hidden items-center gap-3 lg:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-600 shadow-lg shadow-gold-600/20">
              <ReceiptText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-gray-900">Hoa don</h3>
              <p className="text-[10px] font-bold uppercase text-gray-400">{table.tableNumber}</p>
            </div>
          </div>

          <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto pr-1">
            {order.items.filter((item) => item.status !== 'CANCELLED').map((item) => (
              <div key={item.id} className="flex items-start justify-between py-0.5">
                <div className="flex-1 pr-3">
                  <p className="truncate text-[10px] font-bold text-gray-800">{item.name}</p>
                  <p className="text-[8px] font-bold text-gray-400">
                    {item.quantity} x {formatVND(item.price)}
                  </p>
                </div>
                <p className="tabular-nums text-[10px] font-black text-gray-900">
                  {formatVND(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 shrink-0 space-y-1.5 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-400">
              <span>Tam tinh</span>
              <span className="text-gray-900">{formatVND(subTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-gray-400">
              <span>VAT ({taxRate}%)</span>
              <span className="text-gray-900">{formatVND(taxAmount)}</span>
            </div>
            {hasCustomer && (
              <div className={cn(
                'flex items-center justify-between text-[9px] font-bold uppercase',
                loyaltyApplied ? 'text-emerald-600' : 'text-gray-400'
              )}>
                <span>Member ({formatPercent(currentTierRate)})</span>
                <span className="font-black">
                  {loyaltyApplied ? `-${formatVND(memberDiscountValue)}` : formatVND(0)}
                </span>
              </div>
            )}
            {previewData?.manualDiscount > 0 && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-amber-600">
                <span>Giam gia</span>
                <span className="font-black">-{formatVND(previewData.manualDiscount)}</span>
              </div>
            )}

            {previewData?.loyaltyDiscount > 0 && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-emerald-600">
                <span>Uu dai hoi vien</span>
                <span className="font-black">-{formatVND(previewData.loyaltyDiscount)}</span>
              </div>
            )}
            {hasRecordedPayments && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-emerald-600">
                <span>Da thanh toan</span>
                <span className="font-black">{formatVND(activeBill?.paidAmount)}</span>
              </div>
            )}
            {hasRecordedPayments && (
              <div className="flex items-center justify-between text-[9px] font-bold uppercase text-slate-600">
                <span>Con phai thu</span>
                <span className="font-black">{formatVND(amountDueNow)}</span>
              </div>
            )}
            <div className="flex items-end justify-between pt-2">
              <span className="text-[10px] font-black uppercase text-gray-900">Tong cong</span>
              <span className="text-xl font-black text-gold-600">{formatVND(total)}</span>
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
                <div className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-500">
                        Khach hang
                      </p>
                      <h3 className="mt-2 truncate text-sm font-black text-gray-900">{customerName}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700">
                          <UserRound size={10} />
                          {customerProfile?.tierName || previewData?.currentTierName || order?.customer?.tierName || 'Thanh vien'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase text-gray-600">
                          <Star size={10} />
                          {formatPoints(loyaltyProgress?.currentPoints ?? 0)} diem
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-white bg-white/80 px-3 py-2 text-right shadow-sm">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Hoa don nay</p>
                      <p className="mt-1 text-sm font-black text-emerald-600">
                        +{formatPoints(loyaltyProgress?.earnedPoints ?? 0)}
                      </p>
                    </div>
                  </div>

                  {tiersLoading || customerLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase text-gray-400">
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
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-emerald-100 bg-white/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-all duration-500"
                          style={{ width: `${loyaltyProgress.progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] font-bold leading-relaxed text-gray-600">
                        {loyaltyProgress.reachesNextTier
                          ? `Sau hoa don nay khach du dieu kien len hang ${loyaltyProgress.nextTier.name}.`
                          : `Sau hoa don nay con ${formatPoints(loyaltyProgress.remainingAfterPayment)} diem de dat ${loyaltyProgress.nextTier.name}.`}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-white/80 px-3 py-3">
                      <p className="text-[10px] font-bold leading-relaxed text-amber-700">
                        Khach hang dang o hang cao nhat. Hoa don nay van tiep tuc cong diem tich luy.
                      </p>
                    </div>
                  )}

                  {!tiersLoading && !customerLoading && canApplyLoyalty && (
                    <button
                      onClick={() => setApplyLoyalty((current) => !current)}
                      disabled={lockPricingInputs}
                      className={cn(
                        'mt-4 w-full rounded-2xl border px-4 py-3 text-left transition-all',
                        loyaltyApplied
                          ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white/90 hover:border-emerald-200 hover:bg-emerald-50/60',
                        lockPricingInputs && 'cursor-not-allowed opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                              loyaltyApplied
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-gray-300 bg-white text-transparent'
                            )}
                          >
                            <CheckCircle2 size={12} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900">
                              Giam gia hoi vien
                            </p>
                            <p className="mt-1 text-[11px] font-bold leading-relaxed text-emerald-700">
                              Bat de ap dung uu dai hang {customerProfile?.tierName || previewData?.currentTierName || 'Thanh vien'} ({formatPercent(currentTierRate)})
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
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
                        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-gray-200 bg-gray-50" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                            Giam gia hoi vien
                          </p>
                          <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-500">
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-400">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">Hoi vien</p>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-gray-600">
                        Gan khach hang vao don de mo uu dai hoi vien va theo doi lo trinh len hang.
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

              {(isPayOsMode || payOsTransaction) && (
                <div className="rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]',
                          getPayOsStatusClasses(payOsStatus)
                        )}>
                          {PAYOS_STATUS_LABELS[payOsStatus] || 'San sang tao QR'}
                        </span>
                        {isPayOsSyncing && <Loader2 size={12} className="animate-spin text-sky-600" />}
                      </div>
                      <h3 className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900">PayOS</h3>
                      <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-600">
                        {hasPendingPayOs
                          ? 'QR dang cho khach thanh toan. POS se tu dong dong bo ngay khi webhook ve.'
                          : 'Nhan tao QR de sinh payment link PayOS cho bill hien tai ma khong anh huong den luong thanh toan cu.'}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                      <ExternalLink size={18} />
                    </div>
                  </div>

                  {payOsTransaction ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Bill</p>
                          <p className="mt-2 text-sm font-black text-slate-900">#{payOsTransaction.billId}</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">So tien</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{formatVND(payOsTransaction.requestedAmount)}</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Het han</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{formatDateTime(payOsTransaction.expiredAt)}</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 px-3 py-3 shadow-sm">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Transaction</p>
                          <p className="mt-2 text-sm font-black text-slate-900">#{payOsTransaction.transactionId}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Checkout URL</p>
                        <p className="mt-2 break-all text-[11px] font-semibold leading-relaxed text-slate-700">
                          {payOsTransaction.checkoutUrl || 'PayOS chua tra ve checkout URL'}
                        </p>
                        {payOsTransaction.providerMessage ? (
                          <p className="mt-2 text-[11px] font-semibold text-slate-500">
                            {payOsTransaction.providerMessage}
                          </p>
                        ) : null}
                        {payOsTransaction.qrCode ? (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                            QR payload da san sang. Mo trang checkout de hien QR cho khach.
                          </p>
                        ) : null}
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
                          Mo checkout
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
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-sky-200 bg-white/80 px-4 py-3">
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
                        Chua co transaction PayOS. Nhan nut tao QR o cuoi modal de sinh checkout link cho bill nay.
                      </p>
                    </div>
                  )}
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
