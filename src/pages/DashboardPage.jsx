import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchContext } from '../context/BranchContext';
import { reportApi } from '../api/reportApi';
import { inventoryApi } from '../api/inventoryApi';
import BillHistorySection from '../components/dashboard/BillHistorySection';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
  UtensilsCrossed,
  UserCircle2,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Trang dashboard tổng hợp cho quản lý.
 *
 * Trang này đóng vai trò bộ điều phối báo cáo:
 * - đồng bộ filter branch và thời gian
 * - gọi các API summary, timeseries, payment breakdown và bill history
 * - biến đổi dữ liệu thành card, chart và bảng để hiển thị
 */

const ROLE_CONFIG = {
  ADMIN: { label: 'Quản trị viên', badge: 'bg-gold-100 text-gold-800 border-gold-200' },
  MANAGER: { label: 'Quản lý', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  STAFF: { label: 'Nhân viên', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  KITCHEN: { label: 'Bếp', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const PERIOD_OPTIONS = [
  { value: 'DAY', label: 'Hôm nay' },
  { value: 'WEEK', label: 'Tuần này' },
  { value: 'MONTH', label: 'Tháng này' },
  { value: 'YEAR', label: 'Năm nay' },
];

const GROUP_OPTIONS = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'WEEK', label: 'Tuần' },
  { value: 'MONTH', label: 'Tháng' },
];

const PAYMENT_COLORS = ['#CA8A04', '#0F766E', '#2563EB', '#7C3AED', '#F97316'];
const PAYMENT_LABELS = {
  CASH: 'Tiền mặt',
  CREDIT_CARD: 'Thẻ',
  BANK_TRANSFER: 'Chuyển khoản',
  E_WALLET: 'Ví điện tử',
  PAYOS_QR: 'PayOS QR',
};

const DASHBOARD_PAGE_SIZE = 8;

const formatCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const formatCompactCurrency = (value) => {
  const amount = Number(value) || 0;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} triệu`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} nghìn`;
  return amount.toString();
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

const getLocalDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayInputValue = () => getLocalDateInputValue(new Date());

const monthStartInputValue = () => {
  const date = new Date();
  date.setDate(1);
  return getLocalDateInputValue(date);
};

const formatTimestamp = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa có dữ liệu';
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />;
}

function FilterTabs({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, description, action, children, className = '' }) {
  return (
    <section className={`premium-card overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{title}</p>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function OverviewCard({ icon: Icon, title, value, subtitle, accent, loading }) {
  return (
    <div className="premium-card relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">{title}</p>
          {loading ? (
            <Skeleton className="mt-4 h-10 w-32" />
          ) : (
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          )}
          {loading ? (
            <Skeleton className="mt-3 h-4 w-40" />
          ) : (
            <p className="mt-3 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function QuickStatLink({ icon: Icon, label, value, to }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-all hover:border-gold-200 hover:bg-gold-50/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">Đang quản lý</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xl font-black text-slate-900">{value}</span>
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

function ProgressRow({ label, value, total, tone }) {
  const safeTotal = Number(total) || 0;
  const safeValue = Number(value) || 0;
  const percentage = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />
          <span className="text-sm font-semibold text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-900">
          {formatNumber(safeValue)}
          <span className="ml-2 text-xs font-bold text-slate-400">{percentage}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}

function InsightBadge({ label, value, toneClass }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <p className="text-sm font-black uppercase tracking-[0.26em] text-slate-500">{title}</p>
      <p className="mt-3 max-w-md text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, role } = useAuthStore();
  const { selectedBranchId, selectedBranchName, isInitialized } = useBranchContext();
  const requestSequence = useRef(0);

  const canSeeFinance = role === 'ADMIN' || role === 'MANAGER';
  const canSeeBillHistory = role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF';

  const [period, setPeriod] = useState('MONTH');
  const [groupBy, setGroupBy] = useState('DAY');
  const [fromDate, setFromDate] = useState(monthStartInputValue);
  const [toDate, setToDate] = useState(todayInputValue);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportState, setReportState] = useState({
    dashboard: null,
    revenueSummary: null,
    timeseries: null,
    paymentBreakdown: null,
    billStatus: null,
    lowStockAlerts: [],
  });
  const [sectionErrors, setSectionErrors] = useState({
    dashboard: false,
    revenueSummary: false,
    timeseries: false,
    paymentBreakdown: false,
    billStatus: false,
    lowStockAlerts: false,
  });

  const normalizedDateRange = useMemo(() => {
    if (!fromDate || !toDate || fromDate <= toDate) {
      return { fromDate, toDate };
    }

    return { fromDate: toDate, toDate: fromDate };
  }, [fromDate, toDate]);

  const fetchDashboard = useCallback(async () => {
    if (!isInitialized) return;
    const requestId = ++requestSequence.current;

    const branchId = selectedBranchId ?? null;
    const requestEntries = [
      ['dashboard', reportApi.getDashboardReport(branchId)],
      ['lowStockAlerts', inventoryApi.getLowStockAlerts({ branchId })],
    ];

    if (canSeeFinance) {
      requestEntries.push(
        ['revenueSummary', reportApi.getRevenueSummary(branchId, period, normalizedDateRange.toDate || todayInputValue())],
        ['timeseries', reportApi.getRevenueTimeseries(branchId, normalizedDateRange.fromDate, normalizedDateRange.toDate, groupBy)],
        ['paymentBreakdown', reportApi.getPaymentMethodBreakdown(branchId, period, normalizedDateRange.toDate || todayInputValue())],
        ['billStatus', reportApi.getBillStatusSummary(branchId)]
      );
    }

    setRefreshing(true);
    setSectionErrors({
      dashboard: false,
      revenueSummary: false,
      timeseries: false,
      paymentBreakdown: false,
      billStatus: false,
      lowStockAlerts: false,
    });

    try {
      const results = await Promise.allSettled(requestEntries.map(([, promise]) => promise));
      if (requestSequence.current !== requestId) return;

      setReportState((previous) => {
        const nextState = {
          ...previous,
          ...(canSeeFinance
            ? {}
            : {
                revenueSummary: null,
                timeseries: null,
                paymentBreakdown: null,
                billStatus: null,
              }),
        };

        results.forEach((result, index) => {
          const key = requestEntries[index][0];
          if (result.status !== 'fulfilled') return;

          if (key === 'dashboard') {
            nextState.dashboard = result.value?.data || null;
          }

          if (key === 'lowStockAlerts') {
            nextState.lowStockAlerts = Array.isArray(result.value?.data) ? result.value.data : [];
          }

          if (key === 'revenueSummary') {
            nextState.revenueSummary = result.value?.data || null;
          }

          if (key === 'timeseries') {
            nextState.timeseries = result.value?.data || null;
          }

          if (key === 'paymentBreakdown') {
            nextState.paymentBreakdown = result.value?.data || null;
          }

          if (key === 'billStatus') {
            nextState.billStatus = result.value?.data || null;
          }
        });

        return nextState;
      });

      setSectionErrors((previous) => {
        const nextErrors = { ...previous };
        results.forEach((result, index) => {
          const key = requestEntries[index][0];
          nextErrors[key] = result.status === 'rejected';
        });
        return nextErrors;
      });
    } finally {
      if (requestSequence.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [canSeeFinance, groupBy, isInitialized, normalizedDateRange.fromDate, normalizedDateRange.toDate, period, selectedBranchId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const dashboard = reportState.dashboard;
  const revenueSummary = reportState.revenueSummary;
  const timeseries = reportState.timeseries;
  const paymentBreakdown = reportState.paymentBreakdown;
  const billStatus = reportState.billStatus;
  const lowStockAlerts = reportState.lowStockAlerts || [];

  const branchLabel = dashboard?.branchName || selectedBranchName || user?.branchName || 'Chi nhánh hiện tại';
  const roleConfig = ROLE_CONFIG[role] || { label: role || 'Người dùng', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  const totalTables =
    (Number(dashboard?.availableTables) || 0) +
    (Number(dashboard?.occupiedTables) || 0) +
    (Number(dashboard?.reservedTables) || 0) +
    (Number(dashboard?.cleaningTables) || 0);
  const occupiedTables = Number(dashboard?.occupiedTables) || 0;
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;
  const kitchenBacklog =
    (Number(dashboard?.pendingKitchenItems) || 0) +
    (Number(dashboard?.processingKitchenItems) || 0) +
    (Number(dashboard?.waitingStockItems) || 0);

  const overviewCards = [
    {
      icon: CircleDollarSign,
      title: 'Doanh thu hôm nay',
      value: formatCompactCurrency(dashboard?.todayPaidBillRevenue),
      subtitle: `${formatCurrency(dashboard?.todayPaidBillRevenue)} từ ${formatNumber(dashboard?.todayPaidBills)} hóa đơn đã thanh toán`,
      accent: '#0F766E',
    },
    {
      icon: ShoppingBag,
      title: 'Đơn đang phục vụ',
      value: formatNumber(dashboard?.activeOrders),
      subtitle: `${formatNumber(kitchenBacklog)} món đang nằm trong hàng bếp`,
      accent: '#2563EB',
    },
    {
      icon: Store,
      title: 'Lấp đầy bàn',
      value: `${occupancyRate}%`,
      subtitle: `${formatNumber(occupiedTables)}/${formatNumber(totalTables)} bàn đang phục vụ`,
      accent: '#CA8A04',
    },
    {
      icon: Package,
      title: 'Giá trị tồn kho',
      value: formatCompactCurrency(dashboard?.totalInventoryValue),
      subtitle: `${formatNumber(dashboard?.lowStockItems)} mặt hàng thấp, ${formatNumber(dashboard?.outOfStockItems)} đã hết`,
      accent: '#7C3AED',
    },
  ];

  const trendPoints = useMemo(
    () =>
      (timeseries?.points || []).map((point) => ({
        label: point.periodKey,
        revenue: Number(point.paidBillRevenue) || 0,
        profit: Number(point.grossProfit) || 0,
        paidBills: Number(point.paidBillsCount) || 0,
        cashIn: Number(point.cashIn) || 0,
      })),
    [timeseries]
  );

  const paymentSeries = useMemo(
    () =>
      (paymentBreakdown?.items || [])
        .filter((item) => Number(item.totalAmount) > 0)
        .map((item, index) => ({
          name: PAYMENT_LABELS[item.method] || item.method,
          value: Number(item.totalAmount) || 0,
          percentage: Number(item.percentage) || 0,
          count: Number(item.paymentCount) || 0,
          color: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
        })),
    [paymentBreakdown]
  );

  const latestUpdatedAt =
    dashboard?.generatedAt ||
    revenueSummary?.generatedAt ||
    timeseries?.generatedAt ||
    paymentBreakdown?.generatedAt ||
    billStatus?.generatedAt ||
    null;

  const greetingName = user?.fullName?.trim().split(' ').pop() || user?.username || 'bạn';
  const currentDateLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="animate-fade-in pb-10">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(202,138,4,0.12),_transparent_30%),linear-gradient(135deg,_#ffffff,_#fffaf0_55%,_#f8fafc)] p-6 shadow-sm md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gold-200/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${roleConfig.badge}`}>
                  {roleConfig.label}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <Store className="h-3.5 w-3.5 text-gold-600" />
                  {branchLabel}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Dashboard phân tích cho {greetingName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  {currentDateLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-sm">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  Cập nhật lúc {formatTimestamp(latestUpdatedAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fetchDashboard}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-gold-200 hover:text-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Làm mới số liệu
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory/history')}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition-all hover:bg-slate-800"
              >
                <Activity className="h-4 w-4" />
                Xem lịch sử kho
              </button>
            </div>
          </div>
        </header>

        {sectionErrors.dashboard && !dashboard ? (
          <div className="flex items-start gap-4 rounded-[1.75rem] border border-red-200 bg-red-50 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-red-700">Không tải được dashboard</p>
              <p className="mt-2 text-sm text-red-600">
                Kiểm tra lại backend báo cáo hoặc quyền truy cập hiện tại rồi tải lại dashboard.
              </p>
            </div>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <OverviewCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              accent={card.accent}
              loading={loading && !dashboard}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <Panel
              title="Vận hành tức thời"
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Tình trạng bàn</p>
                    </div>
                    <span className="rounded-full bg-gold-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-gold-700">
                      {formatNumber(totalTables)} bàn
                    </span>
                  </div>

                  <div className="space-y-4">
                    <ProgressRow label="Sẵn sàng" value={dashboard?.availableTables} total={totalTables} tone="#10B981" />
                    <ProgressRow label="Đang phục vụ" value={dashboard?.occupiedTables} total={totalTables} tone="#2563EB" />
                    <ProgressRow label="Đặt trước" value={dashboard?.reservedTables} total={totalTables} tone="#CA8A04" />
                    <ProgressRow label="Cần dọn" value={dashboard?.cleaningTables} total={totalTables} tone="#F97316" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <InsightBadge
                    label="Đơn đang mở"
                    value={formatNumber(dashboard?.activeOrders)}
                    toneClass="border-blue-200 bg-blue-50 text-blue-800"
                  />
                  <InsightBadge
                    label="Món đang chờ bếp"
                    value={formatNumber(dashboard?.pendingKitchenItems)}
                    toneClass="border-amber-200 bg-amber-50 text-amber-800"
                  />
                  <InsightBadge
                    label="Chờ nguyên liệu"
                    value={formatNumber(dashboard?.waitingStockItems)}
                    toneClass="border-red-200 bg-red-50 text-red-800"
                  />
                </div>
              </div>
            </Panel>

            <Panel
              title="Danh mục nền"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <QuickStatLink icon={Users} label="Nhân sự hoạt động" value={formatNumber(dashboard?.totalEmployees)} to="/employees" />
                <QuickStatLink icon={UserCircle2} label="Khách hàng" value={formatNumber(dashboard?.totalCustomers)} to="/customers" />
                <QuickStatLink icon={UtensilsCrossed} label="Món trong thực đơn" value={formatNumber(dashboard?.totalMenuItems)} to="/menu" />
                <QuickStatLink icon={Package} label="Mặt hàng tồn kho" value={formatNumber(dashboard?.totalInventoryItems)} to="/inventory" />
              </div>
            </Panel>
          </div>

          <Panel
            title="Sức khỏe tồn kho"
            action={
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-gold-200 hover:text-gold-700"
              >
                Xem tồn kho
              </button>
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">Sắp chạm ngưỡng</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-amber-900">{formatNumber(dashboard?.lowStockItems)}</p>
                </div>
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-700">Đã hết hàng</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-red-900">{formatNumber(dashboard?.outOfStockItems)}</p>
                </div>
              </div>

              {sectionErrors.lowStockAlerts ? (
                <EmptyState
                  title="Không tải được cảnh báo tồn kho"
                  description="API cảnh báo tồn kho đang lỗi hoặc không phản hồi đúng dữ liệu."
                />
              ) : lowStockAlerts.length === 0 ? (
                <EmptyState
                  title="Không có cảnh báo mới"
                  description="Hiện chưa có nguyên liệu nào rơi vào mức cảnh báo tại chi nhánh này."
                />
              ) : (
                <div className="space-y-3">
                  {lowStockAlerts.slice(0, 6).map((item) => {
                    const isOutOfStock = Number(item.currentQuantity) <= 0;
                    return (
                      <div
                        key={item.inventoryId}
                        className={`rounded-2xl border px-4 py-4 ${
                          isOutOfStock ? 'border-red-200 bg-red-50/70' : 'border-amber-200 bg-amber-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{item.ingredientName}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.message}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                              isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.level}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-white/70 px-3 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hiện tại</p>
                            <p className="mt-2 font-black text-slate-900">
                              {formatNumber(item.currentQuantity)} {item.unitSymbol}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white/70 px-3 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Mức tối thiểu</p>
                            <p className="mt-2 font-black text-slate-900">
                              {formatNumber(item.minStockLevel)} {item.unitSymbol}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Panel>
        </section>

        {canSeeFinance ? (
          <section className="space-y-6">
            <Panel title="Phân tích tài chính">
              <div className="space-y-6">
                {/* ── Control toolbar ── */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">

                  {/* Nhóm 1: Kỳ nhanh */}
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} className="shrink-0 text-slate-400" />
                    <FilterTabs value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
                  </div>

                  <div className="hidden h-7 w-px bg-slate-200 sm:block" />

                  {/* Nhóm 2: Khoảng ngày tuỳ chỉnh */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={normalizedDateRange.fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all focus:border-gold-300"
                    />
                    <ArrowRight size={12} className="shrink-0 text-slate-300" />
                    <input
                      type="date"
                      value={normalizedDateRange.toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition-all focus:border-gold-300"
                    />
                  </div>

                  {/* Nhóm 3: Granularity biểu đồ — đẩy sang phải */}
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Xem theo</span>
                    <FilterTabs value={groupBy} options={GROUP_OPTIONS} onChange={setGroupBy} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <OverviewCard
                    icon={CircleDollarSign}
                    title="Doanh thu kỳ"
                    value={formatCompactCurrency(revenueSummary?.paidBillRevenue)}
                    subtitle={`${formatCurrency(revenueSummary?.paidBillRevenue)} từ ${formatNumber(revenueSummary?.paidBillsCount)} hóa đơn`}
                    accent="#0F766E"
                    loading={refreshing && !revenueSummary}
                  />
                  <OverviewCard
                    icon={Wallet}
                    title="Tiền đã thu"
                    value={formatCompactCurrency(revenueSummary?.cashIn)}
                    subtitle={`${formatCurrency(revenueSummary?.cashIn)} qua ${formatNumber(revenueSummary?.paymentCount)} lần thanh toán`}
                    accent="#2563EB"
                    loading={refreshing && !revenueSummary}
                  />
                  <OverviewCard
                    icon={Activity}
                    title="Lợi nhuận gộp"
                    value={formatCompactCurrency(revenueSummary?.grossProfit)}
                    subtitle={formatCurrency(revenueSummary?.grossProfit)}
                    accent="#CA8A04"
                    loading={refreshing && !revenueSummary}
                  />
                  <OverviewCard
                    icon={ShoppingBag}
                    title="Trung bình / bill"
                    value={formatCompactCurrency(revenueSummary?.averagePaidBillValue)}
                    subtitle={formatCurrency(revenueSummary?.averagePaidBillValue)}
                    accent="#7C3AED"
                    loading={refreshing && !revenueSummary}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
                  <div className="premium-card overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-5">
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">Xu hướng doanh thu</p>
                    </div>
                    <div className="p-6">
                      {sectionErrors.timeseries ? (
                        <EmptyState
                          title="Không tải được chuỗi thời gian"
                          description="API revenue timeseries đang trả lỗi hoặc không đúng quyền hiện tại."
                        />
                      ) : trendPoints.length === 0 ? (
                        <EmptyState
                          title="Không có dữ liệu doanh thu"
                          description="Kỳ hiện tại chưa có thanh toán hợp lệ để dựng biểu đồ."
                        />
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={340}>
                            <AreaChart data={trendPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.24} />
                                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="dashboardProfit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#CA8A04" stopOpacity={0.24} />
                                  <stop offset="95%" stopColor="#CA8A04" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                              <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748B', fontWeight: 700 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748B', fontWeight: 700 }}
                                width={62}
                                tickFormatter={formatCompactCurrency}
                              />
                              <Tooltip
                                formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Doanh thu' : 'Lợi nhuận']}
                                labelFormatter={(label) => `Mốc: ${label}`}
                                contentStyle={{
                                  borderRadius: 18,
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
                                }}
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#0F766E" strokeWidth={3} fill="url(#dashboardRevenue)" />
                              <Area type="monotone" dataKey="profit" stroke="#CA8A04" strokeWidth={3} fill="url(#dashboardProfit)" />
                            </AreaChart>
                          </ResponsiveContainer>

                          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 md:grid-cols-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng doanh thu</p>
                              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(timeseries?.totalPaidBillRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng lợi nhuận</p>
                              <p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(timeseries?.totalGrossProfit)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng bill</p>
                              <p className="mt-2 text-lg font-black text-slate-900">{formatNumber(timeseries?.totalPaidBillsCount)}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Panel
                      title="Cơ cấu thanh toán"
                    >
                      {sectionErrors.paymentBreakdown ? (
                        <EmptyState
                          title="Không tải được cơ cấu thanh toán"
                          description="Payment breakdown không phản hồi đúng dữ liệu cho kỳ đang chọn."
                        />
                      ) : paymentSeries.length === 0 ? (
                        <EmptyState
                          title="Chưa có thanh toán"
                          description="Kỳ hiện tại chưa phát sinh thanh toán để dựng cơ cấu phương thức."
                        />
                      ) : (
                        <div className="space-y-5">
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={paymentSeries}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={58}
                                outerRadius={86}
                                paddingAngle={4}
                                stroke="none"
                              >
                                {paymentSeries.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>

                          <div className="space-y-3">
                            {paymentSeries.map((item) => (
                              <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                                    <p className="text-xs text-slate-400">{formatNumber(item.count)} lần thanh toán</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-slate-900">{item.percentage.toFixed(1)}%</p>
                                  <p className="text-xs text-slate-400">{formatCompactCurrency(item.value)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="Tình trạng hóa đơn"
                    >
                      {sectionErrors.billStatus ? (
                        <EmptyState
                          title="Không tải được trạng thái bill"
                          description="Bill status summary đang lỗi hoặc chưa trả dữ liệu hợp lệ."
                        />
                      ) : (
                        <div className="space-y-4">
                          <ProgressRow label="Chưa thanh toán" value={billStatus?.unpaidBills} total={billStatus?.totalBills} tone="#EF4444" />
                          <ProgressRow label="Thanh toán một phần" value={billStatus?.partialBills} total={billStatus?.totalBills} tone="#CA8A04" />
                          <ProgressRow label="Đã thanh toán" value={billStatus?.paidBills} total={billStatus?.totalBills} tone="#10B981" />
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tổng số bill</p>
                            <p className="mt-2 text-2xl font-black text-slate-900">{formatNumber(billStatus?.totalBills)}</p>
                          </div>
                        </div>
                      )}
                    </Panel>
                  </div>
                </div>
              </div>
            </Panel>
          </section>
        ) : null}

        {canSeeBillHistory ? (
          <BillHistorySection pageSize={DASHBOARD_PAGE_SIZE} />
        ) : (
          <Panel
            title="Lịch sử hóa đơn"
            description="Vai trò hiện tại không được backend cho phép truy cập lịch sử hóa đơn."
          >
            <EmptyState
              title="Không khả dụng cho vai trò này"
              description="Billing history chỉ mở cho quản trị viên, quản lý và nhân viên thu ngân theo contract hiện tại của backend."
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
