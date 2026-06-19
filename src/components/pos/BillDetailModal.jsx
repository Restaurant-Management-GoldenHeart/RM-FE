import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X,
  Receipt,
  User,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingBag,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { reportApi } from '../../api/reportApi';
import { orderApi } from '../../api/posApi';
import { groupOrderItemsForSummary, mapOrderItem, mapOrderSummaryItem } from '../../services/mapper/orderMapper';
import { downloadBlobAsFile } from '../../utils/fileDownload';

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const fmt = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value) || 0);

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPercent = (rate) => {
  const numericRate = Number(rate ?? 0);
  if (!Number.isFinite(numericRate) || numericRate <= 0) return '0%';
  return `${numericRate % 1 === 0 ? numericRate.toFixed(0) : numericRate.toFixed(1)}%`;
};

const deriveTaxRateFromBill = (bill) => {
  const subtotal = toSafeNumber(bill?.subtotal);
  const tax = toSafeNumber(bill?.tax);

  if (subtotal <= 0 || tax <= 0) return 0;
  return Number(((tax / subtotal) * 100).toFixed(2));
};

const normalizeOrderItem = (item) => {
  const quantity = toSafeNumber(item?.quantity);
  const unitPrice = toSafeNumber(item?.unitPrice ?? item?.price);
  const lineTotal = toSafeNumber(item?.lineTotal ?? unitPrice * quantity);

  return {
    ...item,
    quantity,
    unitPrice,
    lineTotal,
  };
};

export default function BillDetailModal({ isOpen, onClose, billId }) {
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen && billId) {
      void fetchData();
    }
  }, [billId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const billRes = await reportApi.getBillDetail(billId);
      const billData = billRes.data || billRes;
      setBill(billData);

      if (billData?.orderId) {
        const orderRes = await orderApi.getOrder(billData.orderId);
        const orderData = orderRes.data || orderRes;
        setOrder(orderData);
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error('Failed to fetch bill detail:', err);
      setError('Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!billId || bill?.status !== 'PAID') {
      toast.error('Chỉ tải được hóa đơn PDF khi bill đã thanh toán.');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      let downloaded = false;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          const blob = await reportApi.downloadBillInvoicePdf(billId);
          downloadBlobAsFile(blob, `hoa-don-${billId}.pdf`);
          toast.success('Đã tải hóa đơn PDF.');
          downloaded = true;
          break;
        } catch (innerError) {
          if (innerError?.response?.status === 409 && attempt < 5) {
            await wait(700);
            continue;
          }
          throw innerError;
        }
      }

      if (!downloaded) {
        toast.error('Không tải được hóa đơn PDF.');
      }
    } catch (downloadError) {
      console.error('Failed to download bill invoice PDF:', downloadError);
      toast.error('Không tải được hóa đơn PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const displayTime = order?.closedAt || bill?.lastPaidAt;
  const rawSummaryItems = order?.summaryItems || order?.groupedItems;
  const itemsList = (Array.isArray(rawSummaryItems) && rawSummaryItems.length > 0
    ? rawSummaryItems.map(mapOrderSummaryItem).filter(Boolean)
    : groupOrderItemsForSummary((order?.orderItems || order?.items || []).map(mapOrderItem).filter(Boolean))
  ).map(normalizeOrderItem);
  const taxRateLabel = `VAT (${formatPercent(deriveTaxRateFromBill(bill))})`;
  const memberRateLabel = `Member (${formatPercent(bill?.appliedTierDiscountRate)})`;
  const manualDiscountValue = toSafeNumber(bill?.manualDiscount);
  const loyaltyDiscountValue = toSafeNumber(bill?.loyaltyDiscount);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl"
        >
          <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-gold-50/50 to-white/50 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-600 shadow-lg shadow-gold-600/20">
                  <Receipt className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                    Chi tiết hóa đơn
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gold-600">
                    Mã số: #{billId}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-2xl border border-transparent p-3 text-gray-400 transition-all hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin text-gold-600" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Đang tải dữ liệu hóa đơn...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-red-500">
                <AlertCircle className="h-12 w-12" />
                <p className="font-bold">{error}</p>
                <button
                  onClick={() => void fetchData()}
                  className="rounded-xl bg-red-50 px-6 py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-100"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InfoItem
                      icon={User}
                      label="Khách hàng"
                      value={bill?.customerName || 'Khách lẻ'}
                    />
                    <InfoItem
                      icon={MapPin}
                      label="Bàn / Khu vực"
                      value={bill?.tableName || 'Đơn mang về'}
                    />
                  </div>

                  <div className="space-y-4">
                    <InfoItem
                      icon={Calendar}
                      label="Thời gian"
                      value={displayTime ? new Date(displayTime).toLocaleString('vi-VN') : '--:--'}
                    />

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <CreditCard className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Trạng thái
                        </p>
                        <span
                          className={clsx(
                            'rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                            bill?.status === 'PAID'
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                              : 'border-amber-100 bg-amber-50 text-amber-600'
                          )}
                        >
                          {bill?.status === 'PAID' ? 'Đã thanh toán' : 'Chưa hoàn tất'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Danh sách món ăn
                  </p>

                  <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/50">
                    <div className="custom-scrollbar max-h-[300px] overflow-y-auto bg-white/50">
                      <table className="w-full border-separate border-spacing-0 text-left">
                        <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                          <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="border-b border-gray-100 px-6 py-4">Món ăn</th>
                            <th className="border-b border-gray-100 px-4 py-4 text-center">Số lượng</th>
                            <th className="border-b border-gray-100 px-6 py-4 text-right">Đơn giá</th>
                            <th className="border-b border-gray-100 px-6 py-4 text-right">Thành tiền</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-50">
                          {itemsList.length > 0 ? (
                            itemsList.map((item, idx) => (
                              <tr key={item.id || idx} className="group transition-all hover:bg-white">
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-gray-900">
                                    {item.menuItemName || item.itemName || item.name}
                                  </p>
                                  {item.note ? (
                                    <p className="mt-0.5 text-[10px] font-medium italic text-amber-600">
                                      Note: {item.note}
                                    </p>
                                  ) : null}
                                </td>

                                <td className="px-4 py-4 text-center">
                                  <span className="tabular-nums text-sm font-black text-gray-500">
                                    x{item.quantity}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <span className="tabular-nums text-sm font-black text-gray-900">
                                    {fmt(item.unitPrice)}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <span className="tabular-nums text-sm font-black text-gold-600">
                                    {fmt(item.lineTotal)}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-16 text-center">
                                <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">
                                  Không tìm thấy món ăn
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-3">
                      <SummaryLine label="Tạm tính" value={fmt(bill?.subtotal)} />
                      <SummaryLine label={taxRateLabel} value={fmt(bill?.tax)} />
                      {manualDiscountValue > 0 ? (
                        <SummaryLine
                          label="Giảm giá"
                          value={`-${fmt(manualDiscountValue)}`}
                          isDiscount
                        />
                      ) : null}
                      {loyaltyDiscountValue > 0 ? (
                        <SummaryLine
                          label={memberRateLabel}
                          value={`-${fmt(loyaltyDiscountValue)}`}
                          isDiscount
                        />
                      ) : null}

                      <div className="my-4 h-px bg-gray-100" />

                      <div className="flex items-center justify-between rounded-2xl border border-gold-100/50 bg-gold-50/30 p-4">
                        <span className="text-sm font-black uppercase tracking-tight text-gray-900">
                          Tổng thanh toán
                        </span>
                        <span className="tabular-nums text-2xl font-black text-gold-600">
                          {fmt(bill?.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Phương thức thanh toán
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {bill?.payments?.map((payment, index) => (
                      <div
                        key={`${payment.method}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-gray-700">{payment.method}</span>
                        <span className="text-xs font-black text-gray-900">
                          {fmt(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/50 p-8">
            <button
              onClick={handleDownloadPdf}
              disabled={loading || isDownloadingPdf || bill?.status !== 'PAID'}
              className={clsx(
                'flex items-center gap-2 rounded-2xl border px-6 py-3 text-xs font-black uppercase tracking-widest shadow-sm transition-all',
                loading || isDownloadingPdf || bill?.status !== 'PAID'
                  ? 'cursor-not-allowed border-gray-100 bg-gray-100 text-gray-400'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Tải hóa đơn PDF
            </button>

            <button
              onClick={onClose}
              className="rounded-2xl bg-gray-900 px-10 py-3 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-gray-900/10 transition-all hover:bg-black active:scale-95"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="truncate text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, isDiscount }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <span
        className={clsx(
          'tabular-nums text-sm font-black',
          isDiscount ? 'text-red-500' : 'text-gray-900'
        )}
      >
        {value}
      </span>
    </div>
  );
}
