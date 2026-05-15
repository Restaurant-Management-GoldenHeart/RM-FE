import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  Receipt,
  RefreshCw,
  Smartphone,
  User,
  Wallet,
} from 'lucide-react';
import { reportApi } from '../../api/reportApi';
import { useBranchContext } from '../../context/BranchContext';
import BillDetailModal from '../pos/BillDetailModal';

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const getPaymentIcon = (methods) => {
  const normalized = Array.isArray(methods) ? methods[0] : methods;
  if (!normalized) return Banknote;

  const method = normalized.toString().toUpperCase();
  if (method.includes('CASH') || method.includes('TIỀN MẶT')) return Banknote;
  if (method.includes('BANK') || method.includes('CARD')) return CreditCard;
  if (method.includes('WALLET') || method.includes('MOMO')) return Smartphone;
  return Wallet;
};

const formatTime = (value) => {
  if (!value) return '--:--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
        <Receipt className="h-7 w-7" />
      </div>
      <p className="mt-5 text-sm font-black uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-3 max-w-xl text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default function BillHistorySection({ pageSize = 8 }) {
  const { selectedBranchId, selectedBranchName } = useBranchContext();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(true);
      try {
        const response = await reportApi.getBillHistory({
          branchId: selectedBranchId,
          size: pageSize,
          page: 0,
          status: 'PAID',
        });

        setBills(Array.isArray(response?.data?.content) ? response.data.content : []);
      } catch (error) {
        console.error('Failed to fetch bill history:', error);
        setBills([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageSize, selectedBranchId]
  );

  useEffect(() => {
    fetchHistory();
    const timerId = setInterval(() => fetchHistory(true), 30000);
    return () => clearInterval(timerId);
  }, [fetchHistory]);

  return (
    <>
      <section className="premium-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Lịch sử hóa đơn gần nhất</p>
            <p className="mt-2 text-sm text-slate-500">
              Dữ liệu lấy từ bill history của backend cho chi nhánh {selectedBranchName || 'đang chọn'}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchHistory()}
            disabled={refreshing}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-gold-200 hover:text-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/60">
              <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
              <p className="text-sm font-bold text-slate-500">Đang đồng bộ hóa đơn đã thanh toán...</p>
            </div>
          ) : bills.length === 0 ? (
            <EmptyState
              title="Chưa có hóa đơn phù hợp"
              description="Kỳ hiện tại chưa có bill đã thanh toán để hiển thị trong dashboard."
            />
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => {
                const PaymentIcon = getPaymentIcon(bill.paymentMethods);

                return (
                  <button
                    key={bill.billId}
                    type="button"
                    onClick={() => {
                      setSelectedBillId(bill.billId);
                      setIsModalOpen(true);
                    }}
                    className="flex w-full flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 text-left transition-all hover:border-gold-200 hover:bg-gold-50/20 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                        <PaymentIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã thanh toán
                          </span>
                          <span className="text-xs font-bold text-slate-400">Bill #{bill.billId}</span>
                          {bill.tableName ? <span className="text-xs font-bold text-slate-400">{bill.tableName}</span> : null}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-700">{bill.customerName || 'Khách lẻ'}</span>
                          </span>
                          <span>{formatTime(bill.lastPaidAt)}</span>
                          <span>{bill.paymentMethods?.join(', ') || 'Chưa xác định phương thức'}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-semibold text-slate-500">
                          <span>
                            Mở bàn: <span className="text-slate-700">{bill.openedByName || 'Không rõ'}</span>
                          </span>
                          <span>
                            Tạo bill: <span className="text-slate-700">{bill.billCreatedByName || 'Không rõ'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <div className="text-left md:text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tổng thanh toán</p>
                        <p className="mt-2 text-xl font-black tracking-tight text-emerald-700">{formatCurrency(bill.total)}</p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-300">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <BillDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        billId={selectedBillId}
      />
    </>
  );
}
