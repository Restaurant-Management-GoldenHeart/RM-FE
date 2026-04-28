import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import BranchSelector from '../BranchSelector';

const ROLE_LABELS = {
  ADMIN:   'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF:   'Phục vụ',
  KITCHEN: 'Bếp trưởng',
};

const Header = () => {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-[50] bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 md:h-20 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm overflow-hidden">
      {/* ── Left: App Logo & Title ── */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10 shrink-0">
          <span className="text-white font-black text-lg md:text-xl tracking-tighter">GH</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-black tracking-tighter text-gray-900 uppercase leading-none truncate">
            GoldenHeart POS
          </h1>
          <p className="hidden sm:block text-[10px] text-gold-600 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80 truncate">
            Premium Restaurant System
          </p>
        </div>
      </div>

      {/* ── Right: Controls & User Info ── */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
        {/* Branch Selector (Chỉ hiện cho ADMIN) */}
        {role === 'ADMIN' && (
          <div className="w-24 md:w-64 shrink-0">
            <BranchSelector />
          </div>
        )}

        {/* Thông báo */}
        <NotificationBell />

        <div className="hidden md:block h-10 w-[1px] bg-gray-100" />

        {/* Thông tin người dùng (Hiển thị Avatar & Đăng xuất trên Mobile) */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-black text-gray-900 leading-none">
              {user?.fullName || user?.username || 'Người dùng'}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 truncate max-w-[160px]">
              {ROLE_LABELS[role] || role}
              {user?.branchId && ` • Chi nhánh #${user.branchId}`}
            </p>
          </div>
          <div className="w-8 h-8 md:w-11 md:h-11 rounded-[0.85rem] md:rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
             {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
             ) : (
                <User size={16} className="text-gray-400 md:w-5 md:h-5" />
             )}
          </div>
          <button
             onClick={handleLogout}
             className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
             title="Đăng xuất"
          >
            <LogOut size={16} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
