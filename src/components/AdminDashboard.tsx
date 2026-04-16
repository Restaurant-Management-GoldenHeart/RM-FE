import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { 
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, 
  Calendar as CalendarIcon, Loader2 
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Interfaces ──────────────────────────────────────────────────────────

interface ChartData {
  name: string;
  revenue: number;
  profit: number;
}

interface LowStockItem {
  id: number;
  name: string;
  currentQty: number;
  minQty: number;
  unit: string;
}

interface DashboardReportDTO {
  totalRevenue: number;
  totalProfit: number;
  lowStockCount: number;
  chartData: ChartData[];
  lowStockItems: LowStockItem[];
}

// ─── Component ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardReportDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  // Gọi API lấy dữ liệu báo cáo
  const fetchDashboardData = async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', `${startDate}T00:00:00`);
      if (endDate) params.append('endDate', `${endDate}T23:59:59`);

      const response: any = await apiClient.get(`/reports/dashboard?${params.toString()}`);
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Lỗi khi tải dữ liệu báo cáo');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect: Fetch data khi mount hoặc dateRange thay đổi
  useEffect(() => {
    fetchDashboardData(dateRange.from, dateRange.to);
  }, [dateRange.from, dateRange.to]);

  // Format Tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // ─── Render Loading & Error ───────────────────────────────────────────
  if (isLoading && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
        <p className="mt-4 text-sm font-bold text-gray-500 uppercase tracking-widest">Đang tải báo cáo hệ thống...</p>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-red-500">
        <AlertTriangle className="w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold">Lỗi truy xuất dữ liệu</h3>
        <p className="text-sm">{error}</p>
        <button 
          onClick={() => fetchDashboardData(dateRange.from, dateRange.to)}
          className="mt-6 px-6 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in text-gray-900 bg-gray-50/50 min-h-full">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Tổng quan Kinh doanh</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Báo cáo doanh số & Tồn kho</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-gray-400 ml-2" />
          <input 
            type="date" 
            value={dateRange.from} 
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="px-3 py-2 text-sm font-bold focus:outline-none"
          />
          <span className="text-gray-300">-</span>
          <input 
            type="date" 
            value={dateRange.to} 
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="px-3 py-2 text-sm font-bold focus:outline-none"
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Doanh thu */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opactity-50">
            <DollarSign className="w-16 h-16 text-emerald-50 opacity-50 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tổng Doanh Thu</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
            {formatCurrency(dashboardData?.totalRevenue || 0)}
          </h2>
          <div className="flex items-center gap-2 mt-4 text-emerald-500 text-sm font-bold">
            <TrendingUp size={16} /> <span>Live data</span>
          </div>
        </div>

        {/* Lợi nhuận */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opactity-50">
             <TrendingUp className="w-16 h-16 text-gold-50 opacity-50 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Lợi Nhuận Gộp</p>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2">
            {formatCurrency(dashboardData?.totalProfit || 0)}
          </h2>
          <div className="flex items-center gap-2 mt-4 text-gold-500 text-sm font-bold">
            <TrendingUp size={16} /> <span>Live data</span>
          </div>
        </div>

        {/* Tồn kho cảnh báo */}
        <div className="bg-white p-6 rounded-3xl border border-red-50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opactity-50">
             <AlertTriangle className="w-16 h-16 text-red-50 opacity-50 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-red-400">Cảnh báo Tồn Kho</p>
          <h2 className="text-3xl font-extrabold text-red-600 mt-2">
            {dashboardData?.lowStockCount || 0} <span className="text-base text-red-400 font-bold">Sản phẩm</span>
          </h2>
          <div className="flex items-center gap-2 mt-4 text-red-500 text-sm font-bold">
            <TrendingDown size={16} /> <span>Chạm ngưỡng tối thiểu</span>
          </div>
        </div>
      </div>

      {/* Chart & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doanh thu Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Biểu đồ Doanh Thu & Lợi nhuận</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData?.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                  tickFormatter={(val: number) => `${val / 1000000}M`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => formatCurrency(Number(value || 0))}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Doanh thu" />
                <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" name="Lợi nhuận" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock List */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Sắp Hết Hàng
          </h3>
          <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">
            {dashboardData?.lowStockItems && dashboardData.lowStockItems.length > 0 ? (
              dashboardData.lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl border border-red-50">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-red-500 mt-0.5 font-medium">Ngưỡng tối thiểu: {item.minQty} {item.unit}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-black text-red-600">{item.currentQty}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{item.unit}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-sm font-bold">Kho hàng ổn định</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
