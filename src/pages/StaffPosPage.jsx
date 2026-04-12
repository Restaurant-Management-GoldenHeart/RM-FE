import React, { useEffect } from 'react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { LogOut, User, Loader2, RefreshCw, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Phân phối',
  KITCHEN: 'Bếp trưởng',
};

const StaffPosPage = () => {
  const { fetchInitialData, error, menuLoading, tablesLoading, menuItems } = usePosStore();
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isLoading = (menuLoading || tablesLoading) && menuItems.length === 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafb] space-y-6">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-gray-100 animate-pulse active:scale-95 transition-transform">
          <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-black text-xs uppercase tracking-[0.4em] ml-1">Đang khởi động POS</p>
          <p className="text-gray-300 font-bold text-[10px] uppercase tracking-widest leading-none">Vui lòng chờ trong giây lát...</p>
        </div>
      </div>
    );
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white p-6">
        <div className="premium-card p-12 text-center max-w-sm border-red-50 bg-red-50/10 rounded-[3rem] shadow-2xl shadow-red-500/5">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Layers size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Lỗi kết nối</h2>
          <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">Không thể đồng bộ dữ liệu với máy chủ GoldenHeart. Vui lòng kiểm tra lại đường truyền.</p>
          <button
            onClick={() => fetchInitialData()}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-900/10 active:scale-95"
          >
            <RefreshCw size={20} /> Kết nối lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#111827] overflow-hidden font-sans selection:bg-gold-100 selection:text-gold-900">
      {/* ── Top Navbar ── */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-10 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-gold-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-gold-600/20 rotate-6 hover:rotate-0 transition-transform duration-500 cursor-pointer group">
            <span className="text-white font-black text-2xl italic -rotate-6 group-hover:rotate-0 transition-transform duration-500">GH</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">GoldenHeart</h1>
            <div className="flex items-center gap-2.5 mt-1.5 font-black uppercase">
              <span className="text-[10px] text-gold-600 tracking-[0.2em]">Hệ thống POS CAO CẤP</span>
              <div className="w-1 h-1 rounded-full bg-gray-200" />
              <span className="text-[10px] text-gray-400 tracking-tighter">v2.0 Production</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex items-center gap-5 text-gray-400">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Máy chủ ổn định</span>
              <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Hệ thống đang trực tuyến</span>
            </div>
            <div className="w-[1px] h-10 bg-gray-100" />
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => fetchInitialData()}
              disabled={menuLoading || tablesLoading}
              className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gold-600 hover:bg-gold-50 rounded-2xl transition-all disabled:opacity-30 border border-transparent hover:border-gold-100 shadow-sm hover:shadow-gold-600/5 group"
            >
              <RefreshCw size={22} className={cn("transition-transform duration-700", (menuLoading || tablesLoading) && 'animate-spin')} />
            </button>

            <div className="flex items-center gap-4 pl-6 border-l border-gray-100">
              <div className="text-right flex flex-col justify-center">
                <p className="text-sm font-black text-gray-900 leading-none tracking-tight">
                  {user?.fullName || user?.username || 'Guest'}
                </p>
                <div className="flex items-center gap-2 justify-end mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                  <p className="text-[10px] text-gold-600 font-black uppercase tracking-[0.1em]">
                    {ROLE_LABELS[role] || role}
                  </p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-[1.25rem] bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner overflow-hidden active:scale-95 transition-transform">
                <User size={24} className="text-gray-300" />
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-12 h-12 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 active:scale-95 shadow-sm hover:shadow-red-500/5"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area (300px | 1fr | 380px) ── */}
      <main className="flex-1 flex overflow-hidden p-8 gap-8">
        {/* Left: Tables */}
        <section className="w-[320px] shrink-0 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left duration-700">
          <TableList />
        </section>

        {/* Center: Menu */}
        <section className="flex-1 shrink flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-700 delay-100">
          <MenuGrid />
        </section>

        {/* Right: Cart/Order */}
        <section className="w-[420px] shrink-0 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-700 delay-200">
          <CartPanel />
        </section>
      </main>

      {/* ── Minimal Footer ── */}
      <footer className="h-12 bg-white border-t border-gray-100 flex items-center justify-between px-10 shrink-0 shadow-inner">
        <div className="flex gap-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
            Ca làm việc: Phân phối #01
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gold-500" />
            Trạm phục vụ: {user?.username || 'STAFF_01'}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          <span>GoldenHeart Restaurant Management System</span>
          <div className="w-1 h-1 rounded-full bg-gray-100" />
          <span>© 2024 V2.0.0</span>
        </div>
      </footer>
    </div>
  );
};

export default StaffPosPage;
