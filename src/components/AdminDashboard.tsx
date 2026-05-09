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
  BarChart2, CreditCard, FileText, ShoppingBag, Users, Package
} from "lucide-react";

// ─── Formatters ───────────────────────────────────────────────────
const fmt = (v: any) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(v) || 0);

const fmtShort = (v: any) => {
  const n = Number(v) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "ty";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "tr";
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
  CASH: "Tien mat",
  CREDIT_CARD: "The tin dung",
  E_WALLET: "Vi dien tu",
  BANK_TRANSFER: "Chuyen khoan",
};
const PIE_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
const PERIOD_OPTS = [
  { v: "DAY", l: "Hom nay" },
  { v: "WEEK", l: "Tuan nay" },
  { v: "MONTH", l: "Thang nay" },
  { v: "YEAR", l: "Nam nay" },
];
const GROUP_OPTS = [
  { v: "DAY", l: "Ngay" },
  { v: "WEEK", l: "Tuan" },
  { v: "MONTH", l: "Thang" },
];

// ─── Sub-components ───────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
  accent?: string;
}
function KpiCard({ icon: Icon, label, value, sub, color, accent }: KpiCardProps) {
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

interface TabsProps<T extends string = string> {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}
function Tabs<T extends string = string>({ value, onChange, options }: TabsProps<T>) {
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
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dang tai bao cao...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Phan tich Bao cao</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            {dashboard?.branchName || "Tat ca chi nhanh"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={period} onChange={(v) => setPeriod(v as "DAY" | "WEEK" | "MONTH" | "YEAR")} options={PERIOD_OPTS} />
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-amber-600 transition-all disabled:opacity-50"
          >
            <RefreshCw className={"w-4 h-4 " + (refreshing ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {/* KPI: Today from /reports/dashboard */}
      <section>
        <SectionLabel>Hom nay</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Doanh thu" color="bg-emerald-500"
            value={fmtShort(dashboard?.todayPaidBillRevenue)} sub={fmt(dashboard?.todayPaidBillRevenue)} />
          <KpiCard icon={TrendingUp} label="Loi nhuan" color="bg-amber-500"
            value={fmtShort(dashboard?.todayGrossProfit)} sub={fmt(dashboard?.todayGrossProfit)} />
          <KpiCard icon={FileText} label="Hoa don" color="bg-blue-500"
            value={dashboard?.todayPaidBills ?? 0} sub="Da thanh toan" />
          <KpiCard icon={ShoppingBag} label="Gia TB/Bill" color="bg-purple-500"
            value={fmtShort(dashboard?.todayAveragePaidBillValue)} sub={fmt(dashboard?.todayAveragePaidBillValue)} />
        </div>
      </section>

      {/* KPI: Operations from /reports/dashboard */}
      <section>
        <SectionLabel>Van hanh hien tai</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard icon={Users} label="Nhan vien" color="bg-slate-500" value={dashboard?.totalEmployees ?? 0} />
          <KpiCard icon={BarChart2} label="Don dang xu ly" color="bg-orange-500" value={dashboard?.activeOrders ?? 0} />
          <KpiCard icon={FileText} label="Ban trong" color="bg-teal-500" value={dashboard?.availableTables ?? 0} />
          <KpiCard icon={Package} label="Ban co khach" color="bg-rose-500" value={dashboard?.occupiedTables ?? 0} />
          <KpiCard icon={AlertTriangle} label="Hang sap het" color="bg-red-500" accent="text-red-600" value={dashboard?.lowStockItems ?? 0} />
          <KpiCard icon={CreditCard} label="Thanh toan" color="bg-indigo-500" value={dashboard?.todayPaymentCount ?? 0} />
        </div>
      </section>

      {/* KPI: Period summary from /reports/revenue/summary */}
      {revSummary && (
        <section>
          <SectionLabel>Tong ket ky ({revSummary.fromDate} den {revSummary.toDate})</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Doanh thu" color="bg-emerald-500"
              value={fmtShort(revSummary.paidBillRevenue)} sub={fmt(revSummary.paidBillRevenue)} />
            <KpiCard icon={TrendingUp} label="Loi nhuan" color="bg-amber-500"
              value={fmtShort(revSummary.grossProfit)} sub={fmt(revSummary.grossProfit)} />
            <KpiCard icon={FileText} label="Hoa don" color="bg-blue-500"
              value={revSummary.paidBillsCount ?? 0} sub="Da hoan tat" />
            <KpiCard icon={CreditCard} label="Gia TB/Bill" color="bg-purple-500"
              value={fmtShort(revSummary.averagePaidBillValue)} sub={fmt(revSummary.averagePaidBillValue)} />
          </div>
        </section>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timeseries area chart - from /reports/revenue/timeseries */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Bieu do Doanh thu</h3>
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
              <AreaChart data={chartPoints} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
              Khong co du lieu bieu do
            </div>
          )}

          {timeseries && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-50">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tong DT</p>
                <p className="text-base font-extrabold text-gray-900 mt-0.5">{fmtShort(timeseries.totalPaidBillRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tong LN</p>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">{fmtShort(timeseries.totalGrossProfit)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Hoa don</p>
                <p className="text-base font-extrabold text-blue-600 mt-0.5">{timeseries.totalPaidBillsCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Payment pie - from /reports/payments/method-breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Phuong thuc TT</h3>
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
              <div className="h-40 flex items-center justify-center text-gray-400 text-xs font-bold">Khong co du lieu</div>
            )}
          </div>

          {/* Bill status - from /reports/bills/status-summary */}
          {billStatus && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Trang thai Hoa don</h3>
              <div className="space-y-3">
                {[
                  { label: "Chua thanh toan", val: billStatus.unpaidBills, color: "bg-red-500", bg: "bg-red-100" },
                  { label: "Thanh toan 1 phan", val: billStatus.partialBills, color: "bg-amber-500", bg: "bg-amber-100" },
                  { label: "Da thanh toan", val: billStatus.paidBills, color: "bg-emerald-500", bg: "bg-emerald-100" },
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
                  Tong: {billStatus.totalBills ?? 0} hoa don
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
              Canh bao Ton kho
            </h3>
            <span className="bg-red-100 text-red-600 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
              {invAlerts.length} mat hang
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
                    Toi thieu: {it.minQty ?? it.minimumQuantity} {it.unit ?? ""}
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

    </div>
  );
}
