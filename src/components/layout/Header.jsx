import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Store, Check, ChevronDown } from 'lucide-react';
// import NotificationBell from '../NotificationBell';
import BranchSelector from '../BranchSelector';
import { useBranchContext, BRANCH_ALL } from '../../context/BranchContext';
import { employeeApi } from '../../api/employeeApi';

const ROLE_LABELS = {
  ADMIN:   'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF:   'Phục vụ',
  KITCHEN: 'Bếp trưởng',
};

// ── Mobile Branch Pill (inline in topbar) ──────────────────────────────────
function MobileBranchPill({ role }) {
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const { selectedBranchId, selectedBranchName, changeBranch } = useBranchContext();
  const ref = useRef(null);

  const stripPrefix = (name) => {
    if (!name) return name;
    const idx = name.indexOf(' - ');
    return idx !== -1 ? name.slice(idx + 3) : name;
  };

  useEffect(() => {
    if (role === 'ADMIN') {
      employeeApi.getBranches()
        .then(res => setBranches(res.data || []))
        .catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Không hiện gì nếu chưa chọn chi nhánh
  if (!selectedBranchId) return null;

  const displayLabel = stripPrefix(selectedBranchName);
  const shortLabel = displayLabel.length > 18 ? displayLabel.slice(0, 16) + '…' : displayLabel;

  // Non-ADMIN: hiện readonly pill, không cho đổi
  if (role !== 'ADMIN') {
    return (
      <div className="md:hidden flex-1 min-w-0 max-w-[160px]">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
          <Store size={13} className="text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-amber-800 truncate flex-1 leading-none">
            {shortLabel}
          </span>
        </div>
      </div>
    );
  }

  // ADMIN: dropdown để đổi chi nhánh
  return (
    <div ref={ref} className="relative md:hidden flex-1 min-w-0 max-w-[160px]">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Chọn chi nhánh"
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
      >
        <Store size={13} className="text-amber-600 shrink-0" />
        <span className="text-xs font-bold text-amber-800 truncate flex-1 text-left leading-none">
          {shortLabel}
        </span>
        <ChevronDown
          size={11}
          className={`text-amber-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[9999] py-1.5 overflow-hidden">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 pt-1 pb-2 flex items-center gap-1.5">
            <Store size={9} /> Chi nhánh
          </p>
          <div className="space-y-0.5 px-1.5">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => { changeBranch(b.id, b.name); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${
                  selectedBranchId === b.id ? 'bg-amber-50' : 'hover:bg-gray-50'
                }`}
                title={b.name}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {selectedBranchId === b.id && <Check size={12} className="text-amber-600" />}
                </div>
                <span className={`text-xs truncate ${selectedBranchId === b.id ? 'font-bold text-amber-700' : 'text-gray-600'}`}>
                  {stripPrefix(b.name)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile Avatar Menu (logout) ────────────────────────────────────────────
function MobileAvatarMenu({ user, role, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative md:hidden shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Tài khoản"
        aria-expanded={open}
        className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden transition-colors hover:bg-gray-200"
      >
        {user?.avatar
          ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
          : <User size={15} className="text-gray-500" />
        }
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900 leading-tight truncate">
              {user?.fullName || user?.username || 'Người dùng'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {ROLE_LABELS[role] || role}
            </p>
          </div>
          {/* Logout */}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold"
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────
const Header = () => {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-[50] bg-white/95 backdrop-blur-md border-b border-gray-100 h-14 md:h-20 flex items-center gap-3 px-3 md:px-8 shrink-0 shadow-sm">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        <div className="w-9 h-9 md:w-12 md:h-12 bg-gray-900 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10 shrink-0">
          <span className="text-white font-black text-base md:text-xl tracking-tighter">GH</span>
        </div>
        {/* App name — desktop only */}
        <div className="hidden md:block">
          <h1 className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">
            GoldenHeart POS
          </h1>
          <p className="text-[10px] text-amber-600 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">
            Premium Restaurant System
          </p>
        </div>
      </div>

      {/* ── Mobile: Branch Pill (inline, flex-1) ── */}
      <MobileBranchPill role={role} />

      {/* ── Right Controls ── */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">

        {/* Desktop: Branch Selector */}
        {role === 'ADMIN' && (
          <div className="hidden md:block w-64 shrink-0">
            <BranchSelector />
          </div>
        )}

        {/* Notifications — both */}
        {/* <NotificationBell /> */}

        {/* Desktop separator + user info + logout */}
        <div className="hidden md:block h-10 w-px bg-gray-100" />
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-black text-gray-900 leading-none">
              {user?.fullName || user?.username || 'Người dùng'}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 truncate max-w-[160px]">
              {ROLE_LABELS[role] || role}
              {user?.branchId && ` • CN #${user.branchId}`}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : <User size={20} className="text-gray-400" />
            }
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile: Avatar menu (only logout inside) */}
        <MobileAvatarMenu user={user} role={role} onLogout={handleLogout} />
      </div>
    </header>
  );
};

export default Header;
