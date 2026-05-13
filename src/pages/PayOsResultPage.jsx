import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleX, ExternalLink, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import paymentApi from '../services/api/paymentApi';

const VARIANTS = {
  success: {
    title: 'PayOS da quay ve trang thanh cong',
    description: 'He thong dang doi chieu lai giao dich tu payOS de dong bill tren POS.',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600',
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  cancel: {
    title: 'PayOS da quay ve trang huy giao dich',
    description: 'Neu khach khong thanh toan tiep, quay lai POS de huy QR cu hoac tao lai mot QR moi.',
    icon: CircleX,
    iconClassName: 'text-rose-600',
    chipClassName: 'border-rose-200 bg-rose-50 text-rose-700',
  },
};

const STATUS_COPY = {
  idle: 'Chua bat dau doi chieu.',
  syncing: 'Dang kiem tra trang thai giao dich tu payOS...',
  paid: 'Bill da duoc dong bo thanh cong ve POS.',
  pending: 'payOS chua tra ve trang thai paid. Neu vua chuyen tien, doi them vai giay roi quay lai POS.',
  cancelled: 'Giao dich da bi huy tren payOS.',
  expired: 'Link thanh toan da het han.',
  failed: 'Giao dich da duoc goi ve nhung chua the dong bo thanh cong.',
  error: 'Khong the doi chieu giao dich luc nay.',
};

const TERMINAL_STATUSES = new Set(['PAID', 'CANCELLED', 'EXPIRED', 'FAILED']);

export default function PayOsResultPage({ variant = 'success' }) {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const config = VARIANTS[variant] || VARIANTS.success;
  const Icon = config.icon;

  const billId = searchParams.get('billId');
  const orderId = searchParams.get('orderId');
  const tableId = searchParams.get('tableId');
  const [transaction, setTransaction] = useState(null);
  const [syncState, setSyncState] = useState(variant === 'success' && billId ? 'syncing' : 'idle');

  useEffect(() => {
    if (variant !== 'success' || !billId) return undefined;

    let cancelled = false;

    const syncTransaction = async () => {
      setSyncState('syncing');
      try {
        const response = await paymentApi.getLatestPayOsQr(billId);
        if (cancelled) return;

        const nextTransaction = response?.data ?? null;
        setTransaction(nextTransaction);

        if (!nextTransaction?.status) {
          setSyncState('pending');
          return;
        }

        const nextStatus = nextTransaction.status.toUpperCase();
        if (nextStatus === 'PAID') {
          setSyncState('paid');
          return;
        }
        if (nextStatus === 'PENDING') {
          setSyncState('pending');
          return;
        }
        if (nextStatus === 'CANCELLED') {
          setSyncState('cancelled');
          return;
        }
        if (nextStatus === 'EXPIRED') {
          setSyncState('expired');
          return;
        }
        setSyncState('failed');
      } catch (error) {
        if (!cancelled) {
          setSyncState('error');
        }
      }
    };

    void syncTransaction();

    const intervalId = window.setInterval(() => {
      if (cancelled) return;
      if (TERMINAL_STATUSES.has(transaction?.status?.toUpperCase?.() || '')) return;
      void syncTransaction();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [billId, transaction?.status, variant]);

  const displayedTransactionId = transaction?.transactionId || searchParams.get('transactionId');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7_0%,#fff7ed_28%,#f8fafc_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <Icon size={26} className={config.iconClassName} />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${config.chipClassName}`}>
                PayOS
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight">{config.title}</h1>
              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">{config.description}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50/70 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
              {syncState === 'syncing' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Dong bo giao dich
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              {STATUS_COPY[syncState] || STATUS_COPY.idle}
            </p>
          </div>

          <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 text-sm font-semibold text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Bill</span>
              <span className="font-black text-slate-900">{billId ? `#${billId}` : 'Khong co'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Order</span>
              <span className="font-black text-slate-900">{orderId ? `#${orderId}` : 'Khong co'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Ban</span>
              <span className="font-black text-slate-900">{tableId ? `#${tableId}` : 'Khong co'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Transaction</span>
              <span className="font-black text-slate-900">{displayedTransactionId ? `#${displayedTransactionId}` : 'Khong co'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Trang thai</span>
              <span className="font-black text-slate-900">{transaction?.status || 'Khong co'}</span>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              to="/pos"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-white"
            >
              Ve POS
            </Link>
            <button
              type="button"
              onClick={() => window.close()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-600"
            >
              Dong tab
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
