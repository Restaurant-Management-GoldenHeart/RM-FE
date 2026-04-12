/**
 * Sidebar.jsx — Navigation sidebar cho toàn bộ app quản lý.
 * Hiển thị menu items theo role.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  UtensilsCrossed,
  ShoppingCart,
  LogOut,
  ChefHat,
  Flame,
  Menu,
  X,
  Package,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    to: '/employees',
    label: 'Nhân viên',
    icon: Users,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    to: '/customers',
    label: 'Khách hàng',
    icon: UserCircle,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    to: '/menu',
    label: 'Menu',
    icon: UtensilsCrossed,
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN'],
  },
  {
    to: '/pos',
    label: 'Bán hàng (POS)',
    icon: ShoppingCart,
    roles: ['ADMIN', 'MANAGER', 'STAFF'],
  },
  {
    to: '/inventory',
    label: 'Kho',
    icon: Package,
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN'],
  },
  {
    to: '/kitchen',
    label: 'Bếp',
    icon: Flame,
    roles: ['KITCHEN', 'ADMIN', 'MANAGER'],
  },
  {
    to: '/profile',
    label: 'Hồ sơ cá nhân',
    icon: ChefHat,
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN'],
  },
];


const ROLE_BADGE = {
  ADMIN: { label: 'Quản trị viên', color: 'bg-gold-100 text-gold-700 border-gold-200' },
  MANAGER: { label: 'Quản lý', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  STAFF: { label: 'Nhân viên', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  KITCHEN: { label: 'Bếp', color: 'bg-orange-50 text-orange-600 border-orange-100' },
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, role, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !role || item.roles.includes(role)
  );

  const roleBadge = ROLE_BADGE[role] || { label: role, color: 'bg-gray-50 text-gray-500 border-gray-100' };

  return (
    <aside
      className={`
        h-screen flex flex-col fixed top-0 left-0 z-30
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
        bg-white border-r border-gray-200 shadow-sm
      `}
    >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-5'} py-5 border-b border-gray-100`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-600 flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm leading-none">GoldenHeart</p>
              <p className="text-gold-600 text-[10px] font-semibold uppercase tracking-wider mt-1">Restaurant</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg bg-gold-600 flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="w-4.5 h-4.5 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`${collapsed ? 'hidden' : ''} text-gray-400 hover:text-gold-600 transition-colors`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-4 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-50 border border-gold-100 flex items-center justify-center flex-shrink-0">
              <span className="text-gold-700 font-semibold text-sm">
                {(user?.fullName || user?.username || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 font-semibold text-sm truncate">
                {user?.fullName || user?.username || 'Người dùng'}
              </p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-0.5 font-medium ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive
                ? 'bg-gold-50 text-gold-700 font-semibold border border-gold-100 shadow-sm'
                : 'text-gray-500 hover:text-gold-600 hover:bg-gray-50 border border-transparent'
              }
              ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-110 ${collapsed ? '' : ''}`} />
            {!collapsed && <span className="text-sm">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle + Logout */}
      <div className="px-3 pb-6 space-y-1 border-t border-gray-50 pt-4">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-gold-600 hover:bg-gray-50 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          <Menu className="w-4.5 h-4.5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Thu gọn</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
          title="Đăng xuất"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
