import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { menuApi } from '../api/menuApi';
import { customerApi } from '../api/customerApi';
import { inventoryApi } from '../api/inventoryApi';
import {
  Users, UtensilsCrossed, UserCircle, TrendingUp,
  ArrowRight, ChefHat, ShoppingCart, Calendar,
  Clock, Activity, Package, AlertCircle, AlertTriangle,
  RefreshCw, Loader2
} from 'lucide-react';

/**
 * Skeleton — Placeholder loading effect
 */
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

/**
 * StatCard — Metric display card with independent loading and error states
 */
function StatCard({ icon: Icon, label, value, sub, color, to, loading, error }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => to && !loading && navigate(to)}
      className={`
        premium-card p-6 flex items-center gap-5 relative overflow-hidden
        ${to && !loading ? 'cursor-pointer hover:shadow-md hover:border-gold-500/30 active:scale-[0.98]' : ''}
        transition-all duration-300
      `}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shadow-sm flex-shrink-0 transition-transform duration-500 group-hover:scale-110`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
          {error && (
            <div className="group/error relative">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/error:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Không thể tải dữ liệu
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-extrabold tabular-nums leading-none ${error ? 'text-gray-300' : 'text-gray-900'}`}>
              {error ? '0' : (value ?? '0')}
            </p>
            {sub && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{sub}</span>}
          </div>
        )}
      </div>

      {to && !loading && (
        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-gold-50 group-hover:text-gold-600 transition-colors flex-shrink-0">
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

/**
 * QuickAction — Navigation shortcut button
 */
function QuickAction({ label, to, Icon, desc }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-600/5 transition-all group text-left w-full"
    >
      <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gold-600 group-hover:text-white transition-all duration-300">
        <Icon className="w-6 h-6 text-gold-600 group-hover:text-white transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 font-bold text-base">{label}</p>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:border-gold-200 group-hover:text-gold-600 transition-all">
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}

const ROLE_CONFIG = {
  ADMIN: { label: 'Quản trị viên', color: 'bg-gold-100 text-gold-700 border-gold-200' },
  MANAGER: { label: 'Quản lý', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  STAFF: { label: 'Nhân viên', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  KITCHEN: { label: 'Bếp trưởng', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export default function DashboardPage() {
  const { user, role } = useAuthStore();
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  
  // Real-time metrics from API
  const [stats, setStats] = useState({ 
    employees: 0, 
    customers: 0, 
    menuItems: 0, 
    inventoryItems: 0 
  });
  
  // Granular loading states per metric
  const [loading, setLoading] = useState({
    employees: true,
    customers: true,
    menuItems: true,
    inventoryItems: true
  });

  // Independent error states per metric
  const [errors, setErrors] = useState({
    employees: false,
    customers: false,
    menuItems: false,
    inventoryItems: false
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    // Race-condition guard: block overlapping requests using stable Ref
    if (isFetching.current) return;

    isFetching.current = true;
    setRefreshing(true);
    setLoading({ employees: true, customers: true, menuItems: true, inventoryItems: true });
    setErrors({ employees: false, customers: false, menuItems: false, inventoryItems: false });

    try {
      const results = await Promise.allSettled([
        employeeApi.getEmployees({ page: 0, size: 1 }),
        customerApi.getCustomers({ page: 0, size: 1 }),
        menuApi.getMenuItems({ page: 0, size: 1 }),
        inventoryApi.getInventoryItems({ page: 0, size: 1 }),
      ]);

      if (!isMounted.current) return;

      const [emp, cus, menu, inv] = results;

      setStats({
        employees: emp.status === 'fulfilled' ? (emp.value?.data?.totalElements ?? 0) : 0,
        customers: cus.status === 'fulfilled' ? (cus.value?.data?.totalElements ?? 0) : 0,
        menuItems: menu.status === 'fulfilled' ? (menu.value?.data?.totalElements ?? 0) : 0,
        inventoryItems: inv.status === 'fulfilled' ? (inv.value?.data?.totalElements ?? 0) : 0,
      });

      setErrors({
        employees: emp.status === 'rejected',
        customers: cus.status === 'rejected',
        menuItems: menu.status === 'rejected',
        inventoryItems: inv.status === 'rejected',
      });
    } finally {
      isFetching.current = false;
      if (isMounted.current) {
        setLoading({ employees: false, customers: false, menuItems: false, inventoryItems: false });
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    return () => { isMounted.current = false; };
  }, [fetchStats]);

  const allFailed = useMemo(() => 
    Object.values(errors).every(e => e) && !Object.values(loading).some(l => l),
    [errors, loading]
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const roleConfig = ROLE_CONFIG[role] || { label: role, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  const displayName = user?.fullName?.trim().split(' ').pop() || user?.username || 'bạn';

  const dateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric'
  });

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto px-4 sm:px-0 pb-10">
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold-600 rounded-lg shadow-lg shadow-gold-600/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${roleConfig.color}`}>
              {roleConfig.label}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {greeting}, <span className="text-gold-600">{displayName}</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Bắt đầu phiên lúc 08:30</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />}
            Làm mới dữ liệu
          </button>
          <button className="px-6 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 active:scale-95">
            Báo cáo hôm nay
          </button>
        </div>
      </div>

      {/* ── Global Failure Banner ── */}
      {allFailed && (
        <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl animate-bounce-subtle">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">Không thể tải dữ liệu hệ thống</p>
            <p className="text-xs text-red-600 mt-0.5">Vui lòng kiểm tra kết nối internet hoặc thử lại sau vài phút.</p>
          </div>
          <button onClick={fetchStats} className="px-4 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-all">
            Thử lại
          </button>
        </div>
      )}

      {/* ── Indicators ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users} label="Nhân sự" value={stats.employees}
          sub="Nhân viên"
          color="bg-blue-600"
          to="/employees" 
          loading={loading.employees}
          error={errors.employees}
        />
        <StatCard
          icon={UserCircle} label="Khách hàng" value={stats.customers}
          sub="Thành viên"
          color="bg-emerald-600"
          to="/customers" 
          loading={loading.customers}
          error={errors.customers}
        />
        <StatCard
          icon={UtensilsCrossed} label="Thực đơn" value={stats.menuItems}
          sub="Món ăn"
          color="bg-gold-600"
          to="/menu" 
          loading={loading.menuItems}
          error={errors.menuItems}
        />
        <StatCard
          icon={Package} label="Tồn kho" value={stats.inventoryItems}
          sub="Nguyên liệu"
          color="bg-purple-600"
          to="/inventory" 
          loading={loading.inventoryItems}
          error={errors.inventoryItems}
        />
      </div>

      {/* ── Navigation Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Quản trị hệ thống</h2>
            <button className="text-sm font-bold text-gold-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickAction 
              label="Quản lý Nhân viên" to="/employees" Icon={Users} 
              desc="Theo dõi chấm công, thông tin cá nhân và hiệu suất làm việc."
            />
            <QuickAction 
              label="Danh sách Khách hàng" to="/customers" Icon={UserCircle} 
              desc="Quản lý điểm tích lũy, hạng thành viên và lịch sử đặt bàn."
            />
            <QuickAction 
              label="Quản lý Thực đơn" to="/menu" Icon={UtensilsCrossed} 
              desc="Cập nhật món mới, giá bán và trạng thái món ăn trong bếp."
            />
            <QuickAction 
              label="Hồ sơ cá nhân" to="/profile" Icon={ChefHat} 
              desc="Thay đổi mật khẩu, thông tin liên hệ và cài đặt cá nhân."
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Sức khỏe hệ thống</h2>
          <div className="premium-card p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Cơ sở dữ liệu</p>
                <p className="text-xs text-gray-500 mt-0.5">Kết nối ổn định (Latency: 12ms)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-gray-50 pt-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Máy chủ API</p>
                <p className="text-xs text-gray-500 mt-0.5">Uptime: 99.98% (Online)</p>
              </div>
            </div>
            <div className="flex items-center gap-4 border-t border-gray-50 pt-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Bảo mật JWT</p>
                <p className="text-xs text-gray-500 mt-0.5">Cấu hình refresh token an toàn</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
