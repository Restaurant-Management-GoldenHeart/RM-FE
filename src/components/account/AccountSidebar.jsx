/**
 * AccountSidebar.jsx
 * Sidebar điều hướng của Customer Portal — desktop cố định, mobile ẩn/hiện.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import {
  User, Star, ShoppingBag, Utensils, MessageSquare, Tag, LogOut, Home,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import TierBadge from './TierBadge';

const NAV_ITEMS = [
  { to: '/account',         label: 'Tổng quan',       icon: Home,          end: true },
  { to: '/account/loyalty', label: 'Điểm & Hạng',     icon: Star },
  { to: '/account/orders',  label: 'Lịch sử đơn',     icon: ShoppingBag },
  { to: '/account/dishes',  label: 'Món đã ăn',        icon: Utensils },
  { to: '/account/reviews', label: 'Đánh giá của tôi', icon: MessageSquare },
  { to: '/account/coupons', label: 'Ví coupon',         icon: Tag },
  { to: '/account/profile', label: 'Hồ sơ',            icon: User },
];

/**
 * @param {object}   profile   - dữ liệu từ /api/v1/me/profile (có thể null khi đang tải)
 * @param {boolean}  mobileOpen
 * @param {function} onClose   - đóng drawer trên mobile
 */
export default function AccountSidebar({ profile, mobileOpen, onClose }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Avatar + tên */}
      <div className="px-5 py-6 border-b border-[#ca8a04]/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-[#ca8a04]/15 border border-[#ca8a04]/30 flex items-center justify-center flex-shrink-0">
            <span
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-[#ca8a04] font-bold text-lg leading-none"
            >
              {profile?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[#f5f0e8] text-sm font-semibold truncate">{profile?.name ?? '—'}</div>
            <div className="text-[#6a6560] text-xs truncate">{profile?.email ?? ''}</div>
          </div>
        </div>
        {profile?.tierName && (
          <TierBadge tierCode={profile.tierCode} tierName={profile.tierName} size="sm" />
        )}
        {!profile?.tierName && (
          <span className="text-[#4a4a46] text-xs">Chưa có hạng thành viên</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-all duration-200 ${
                isActive
                  ? 'bg-[#ca8a04]/15 text-[#ca8a04] font-semibold'
                  : 'text-[#8a8480] hover:bg-[#ca8a04]/8 hover:text-[#f5f0e8]'
              }`
            }
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: nút ra trang chủ + đăng xuất */}
      <div className="px-3 py-4 border-t border-[#ca8a04]/10 space-y-1">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#8a8480] hover:text-[#f5f0e8] hover:bg-[#ca8a04]/8 transition-all"
        >
          <Home size={16} strokeWidth={1.8} />
          Về trang chủ
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/8 transition-all"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0f0e0b] border-r border-[#ca8a04]/10 min-h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-[#ca8a04]/10">
          <span
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-lg text-[#f5f0e8]"
          >
            Golden <span className="text-[#ca8a04]">Heart</span>
          </span>
        </div>
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0f0e0b] border-r border-[#ca8a04]/10 lg:hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ca8a04]/10">
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-lg text-[#f5f0e8]"
              >
                Golden <span className="text-[#ca8a04]">Heart</span>
              </span>
              <button onClick={onClose} className="text-[#6a6560] hover:text-[#f5f0e8] p-1">✕</button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
