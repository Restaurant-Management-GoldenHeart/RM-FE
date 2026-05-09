import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import reportApi from "../api/reportApi";
import { inventoryApi } from "../api/inventoryApi";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, DollarSign, AlertTriangle, Loader2, RefreshCw,
  BarChart2, CreditCard, FileText, ShoppingBag, Users, Package, X
} from "lucide-react";

// ─── Formatters ───────────────────────────────────────────────────
const fmt = (v: any) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(v) || 0);

const fmtShort = (v: any) => {
  const n = Number(v) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " tỷ";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " tr";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
  return n.toString();
};

const toDay = () => new Date().toISOString().split("T")[0];
const toMonthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

// ─── Constants ────────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  CREDIT_CARD: "Thẻ tín dụng",
  E_WALLET: "Ví điện tử",
  BANK_TRANSFER: "Chuyển khoản",
};
const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
const PERIOD_OPTS = [
  { v: "DAY", l: "Hôm nay" },
  { v: "WEEK", l: "Tuần này" },
  { v: "MONTH", l: "Tháng này" },
  { v: "YEAR", l: "Năm nay" },
];
const GROUP_OPTS = [
  { v: "DAY", l: "Ngày" },
  { v: "WEEK", l: "Tuần" },
  { v: "MONTH", l: "Tháng" },
];

// ─── Sub-components ───────────────────────────────────────────────
interface BillListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bills: any[];
  loading: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, color, accent }: { icon: any, label: string, value: any, sub?: string, color: string, accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " + color}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">{label}</p>
        <p className={"text-xl font-extrabold tabular-nums leading-tight mt-0.5 " + (accent || "text-gray-900")}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{children}</p>
  );
}

function Tabs<T extends string = string>({ value, onChange, options }: { value: T, onChange: (v: T) => void, options: { v: T, l: string }[] }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
            (value === o.v ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function BillListModal({ isOpen, onClose, title, bills, loading }: BillListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Chi tiết Hóa đơn</h3>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải danh sách...</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold uppercase text-xs tracking-widest">
              Không có hóa đơn nào trong thời gian này
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <th className="pb-4 px-2">Mã HD</th>
                    <th className="pb-4 px-2">Khách hàng</th>
                    <th className="pb-4 px-2">Thời gian</th>
                    <th className="pb-4 px-2">Tổng tiền</th>
                    <th className="pb-4 px-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bills.map((b) => (
                    <tr key={b.id} className="group hover:bg-gray-50 transition-all cursor-pointer">
                      <td className="py-4 px-2">
                        <span className="text-sm font-black text-gray-900">#{b.id}</span>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-sm font-bold text-gray-700">{b.customerName || "Khách lẻ"}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">{b.customerPhone || ""}</p>
                      </td>
                      <td className="py-4 px-2">
                        <p className="text-xs font-bold text-gray-600">{b.completedAt ? new Date(b.completedAt).toLocaleString('vi-VN') : "--:--"}</p>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-sm font-black text-emerald-600 tabular-nums">{fmt(b.totalAmount)}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className={"px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border " +
                          (b.status === 'PAID' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                          {b.status === 'PAID' ? 'Đã thanh toán' : 'Còn nợ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Tổng cộng: <span className="text-gray-900 font-black ml-1">{bills.length}</span> hóa đơn
          </div>
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-900/10">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore() as any;
  const branchId = user?.branchId ?? null;

  const [period, setPeriod] = useState<"DAY" | "WEEK" | "MONTH" | "YEAR">("MONTH");
  const [groupBy, setGroupBy] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const [fromDate, setFromDate] = useState(toMonthStart());
  const [toDate, setToDate] = useState(toDay());
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dashboard, setDashboard] = useState<any>(null);
  const [revSummary, setRevSummary] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any>(null);
  const [payBreakdown, setPayBreakdown] = useState<any>(null);
  const [billStatus, setBillStatus] = useState<any>(null);
  const [invAlerts, setInvAlerts] = useState<any[]>([]);

  // Drill-down states
  const [billModal, setBillModal] = useState({ isOpen: false, title: "", loading: false });
  const [bills, setBills] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [d, rs, ts, pb, bs, ia] = await Promise.allSettled([
        reportApi.getDashboardReport(branchId),
        reportApi.getRevenueSummary(branchId, period, toDay()),
        reportApi.getRevenueTimeseries(branchId, fromDate, toDate, groupBy),
        reportApi.getPaymentMethodBreakdown(branchId, period, toDay()),
        reportApi.getBillStatusSummary(branchId),
        inventoryApi.getLowStockAlerts({ branchId }),
      ]);
      if (d.status === "fulfilled") setDashboard((d as any).value?.data ?? null);
      if (rs.status === "fulfilled") setRevSummary((rs as any).value?.data ?? null);
      if (ts.status === "fulfilled") setTimeseries((ts as any).value?.data ?? null);
      if (pb.status === "fulfilled") setPayBreakdown((pb as any).value?.data ?? null);
      if (bs.status === "fulfilled") setBillStatus((bs as any).value?.data ?? null);
      if (ia.status === "fulfilled") {
        const raw = (ia as any).value?.data;
        setInvAlerts(Array.isArray(raw) ? raw : raw?.items ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, period, fromDate, toDate, groupBy]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchAll(); }, [mounted, fetchAll]);

  const handleChartClick = async (data: any) => {
    if (!data?.activeLabel) return;

    setBillModal({ isOpen: true, title: `Thời gian: ${data.activeLabel}`, loading: true });
    try {
      // Tìm point tương ứng để lấy date range
      const point = timeseries?.points?.find((p: any) => p.periodKey === data.activeLabel);
      if (point) {
        const res = await reportApi.getBillHistory({
          branchId,
          fromDate: point.fromDate,
          toDate: point.toDate,
          status: 'PAID'
        });
        setBills(res?.data?.data || res?.data?.content || res?.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch bill details:", err);
    } finally {
      setBillModal(prev => ({ ...prev, loading: false }));
    }
  };

  const chartPoints = (timeseries?.points ?? []).map((p: any) => ({
    name: p.periodKey,
    revenue: Number(p.paidBillRevenue) || 0,
    profit: Number(p.grossProfit) || 0,
  }));

  const pieData = (payBreakdown?.items ?? []).map((it: any, i: number) => ({
    name: METHOD_LABELS[it.method] || it.method,
    value: Number(it.totalAmount) || 0,
    pct: Number(it.percentage) || 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-full">

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onChange={(v) => setPeriod(v as "DAY" | "WEEK" | "MONTH" | "YEAR")} options={PERIOD_OPTS} />
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-amber-600 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {/* KPI: Today from /reports/dashboard */}
      <section>
        <SectionLabel>Hôm nay</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Doanh thu" color="bg-emerald-500"
            value={fmtShort(dashboard?.todayPaidBillRevenue)} sub={fmt(dashboard?.todayPaidBillRevenue)} />
          <KpiCard icon={TrendingUp} label="Lợi nhuận" color="bg-amber-500"
            value={fmtShort(dashboard?.todayGrossProfit)} sub={fmt(dashboard?.todayGrossProfit)} />
          <KpiCard icon={FileText} label="Hóa đơn" color="bg-blue-500"
            value={dashboard?.todayPaidBills ?? 0} sub="Đã thanh toán" />
          <KpiCard icon={ShoppingBag} label="Giá TB/Bill" color="bg-purple-500"
            value={fmtShort(dashboard?.todayAveragePaidBillValue)} sub={fmt(dashboard?.todayAveragePaidBillValue)} />
        </div>
      </section>


      {/* KPI: Period summary from /reports/revenue/summary */}
      {revSummary && (
        <section>
          <SectionLabel>Tổng kết kỳ ({revSummary.fromDate} đến {revSummary.toDate})</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Doanh thu" color="bg-emerald-500"
              value={fmtShort(revSummary.paidBillRevenue)} sub={fmt(revSummary.paidBillRevenue)} />
            <KpiCard icon={TrendingUp} label="Lợi nhuận" color="bg-amber-500"
              value={fmtShort(revSummary.grossProfit)} sub={fmt(revSummary.grossProfit)} />
            <KpiCard icon={FileText} label="Hóa đơn" color="bg-blue-500"
              value={revSummary.paidBillsCount ?? 0} sub="Đã hoàn tất" />
            <KpiCard icon={CreditCard} label="Giá TB/Bill" color="bg-purple-500"
              value={fmtShort(revSummary.averagePaidBillValue)} sub={fmt(revSummary.averagePaidBillValue)} />
          </div>
        </section>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timeseries area chart - from /reports/revenue/timeseries */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Biểu đồ Doanh thu</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400" />
              <span className="text-gray-300">-</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400" />
              <Tabs value={groupBy} onChange={(v) => setGroupBy(v as "DAY" | "WEEK" | "MONTH")} options={GROUP_OPTS} />
            </div>
          </div>

          {mounted && chartPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={chartPoints}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                onClick={handleChartClick}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} dy={6} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }}
                  tickFormatter={fmtShort} width={44} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}
                  formatter={(v: any, n?: string | number) => [fmt(v), n === "revenue" ? "Doanh thu" : "Lợi nhuận"] as [string, string]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#gRev)" dot={false} name="revenue" />
                <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#gPro)" dot={false} name="profit" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm font-bold rounded-xl bg-gray-50 border border-dashed border-gray-200">
              Không có dữ liệu biểu đồ
            </div>
          )}

          {timeseries && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tổng DT</p>
                <p className="text-base font-extrabold text-gray-900 mt-0.5">{fmtShort(timeseries.totalPaidBillRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tổng LN</p>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">{fmtShort(timeseries.totalGrossProfit)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Hóa đơn</p>
                <p className="text-base font-extrabold text-blue-600 mt-0.5">{timeseries.totalPaidBillsCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Payment pie - from /reports/payments/method-breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Phương thức TT</h3>
            {mounted && pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {pieData.map((it: any, i: number) => <Cell key={i} fill={it.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((it: any) => (
                    <div key={it.name} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
                        <span className="text-xs font-bold text-gray-600">{it.name}</span>
                      </div>
                      <span className="text-xs font-extrabold text-gray-500">{it.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs font-bold">Không có dữ liệu</div>
            )}
          </div>

          {/* Bill status - from /reports/bills/status-summary */}
          {billStatus && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Trạng thái Hóa đơn</h3>
              <div className="space-y-3">
                {[
                  { label: "Chưa thanh toán", val: billStatus.unpaidBills, color: "bg-red-500", bg: "bg-red-100" },
                  { label: "Thanh toán 1 phần", val: billStatus.partialBills, color: "bg-amber-500", bg: "bg-amber-100" },
                  { label: "Đã thanh toán", val: billStatus.paidBills, color: "bg-emerald-500", bg: "bg-emerald-100" },
                ].map(({ label, val, color, bg }) => {
                  const pct = (billStatus.totalBills ?? 0) > 0
                    ? Math.round(((val ?? 0) / billStatus.totalBills) * 100)
                    : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-gray-600">{label}</span>
                        <span className="text-xs font-extrabold">
                          {val ?? 0} <span className="text-gray-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className={"h-1.5 rounded-full " + bg}>
                        <div
                          className={"h-full rounded-full transition-all duration-700 " + color}
                          style={{ width: pct + "%" }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 text-center pt-2">
                  Tổng: {billStatus.totalBills ?? 0} hóa đơn
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Low stock alerts - from inventory/alerts */}
      {invAlerts.length > 0 && (
        <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Cảnh báo Tồn kho
            </h3>
            <span className="bg-red-100 text-red-600 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              {invAlerts.length} mặt hàng
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {invAlerts.map((it: any, i: number) => (
              <div
                key={it.id ?? it.inventoryId ?? i}
                className="flex justify-between items-center bg-red-50/60 border border-red-100 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{it.name ?? it.itemName}</p>
                  <p className="text-[11px] text-red-500 mt-0.5">
                    Tối thiểu: {it.minQty ?? it.minimumQuantity} {it.unit ?? ""}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-xl font-black text-red-600">{it.currentQty ?? it.currentQuantity}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{it.unit ?? ""}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Drill-down Modal */}
      <BillListModal
        isOpen={billModal.isOpen}
        onClose={() => setBillModal(prev => ({ ...prev, isOpen: false }))}
        title={billModal.title}
        bills={bills}
        loading={billModal.loading}
      />

    </div>
  );
}
