import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Menu, X, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_LINKS = [
  { label: 'Thực đơn',    href: '#menu' },
  { label: 'Về chúng tôi', href: '#story' },
  { label: 'Không gian',  href: '#gallery' },
  { label: 'Chi nhánh',   href: '#location' },
];

export default function HomeNavbar({ onLoginClick, onRegisterClick }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isAuthenticated, role, user, logout } = useAuthStore();
  const isCustomer   = isAuthenticated && role === 'CUSTOMER';
  const isStaffLogin = isAuthenticated && role !== 'CUSTOMER';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = () => setMobileOpen(false);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
  };

  // Hiển thị tên rút gọn
  const displayName = user?.fullName?.split(' ').slice(-1)[0] || user?.username || 'Bạn';

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0c0b08]/90 backdrop-blur-xl shadow-[0_1px_0_rgba(202,138,4,0.1)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full border border-[#ca8a04]/40 flex items-center justify-center group-hover:border-[#ca8a04]/80 transition-colors">
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-[#ca8a04] font-bold text-base leading-none"
              >
                G
              </span>
            </div>
            <span
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-lg text-[#f5f0e8] hidden sm:block tracking-wide"
            >
              Golden <span className="text-[#ca8a04]">Heart</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-sm text-[#b0aa9e] hover:text-[#f5f0e8] transition-colors duration-200 tracking-wide"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:02812345678"
              className="flex items-center gap-2 text-sm text-[#ca8a04] hover:text-[#e09b04] transition-colors"
            >
              <Phone size={13} strokeWidth={2.5} />
              <span className="tracking-wide">028 1234 5678</span>
            </a>

            {/* Chưa đăng nhập */}
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 rounded-full text-sm text-[#c4bfb0] hover:text-[#f5f0e8] transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={onRegisterClick}
                  className="px-5 py-2 rounded-full bg-[#ca8a04] text-sm text-[#0c0b08] font-bold hover:bg-[#e09b04] transition-all duration-300"
                >
                  Đăng ký
                </button>
              </div>
            )}

            {/* Đã đăng nhập là CUSTOMER */}
            {isCustomer && (
              <div className="flex items-center gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ca8a04] text-[#0c0b08] text-sm font-bold hover:bg-[#e09b04] transition-all duration-300"
                >
                  <User size={13} strokeWidth={2.5} />
                  {displayName}
                </Link>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-full border border-[#ca8a04]/20 text-[#b0aa9e] hover:text-[#ca8a04] hover:border-[#ca8a04]/50 transition-all"
                >
                  <LogOut size={15} />
                </button>
              </div>
            )}

            {/* Đã đăng nhập là Staff/Admin → nút quản lý */}
            {isStaffLogin && (
              <a
                href="/dashboard"
                className="px-5 py-2 rounded-full border border-[#ca8a04]/30 text-sm text-[#f5f0e8] hover:bg-[#ca8a04] hover:border-[#ca8a04] hover:text-[#0c0b08] transition-all duration-300 font-medium"
              >
                Quản lý
              </a>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 text-[#f5f0e8] hover:text-[#ca8a04] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-[#0f0e0b] border-l border-[#ca8a04]/10 shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 h-20 border-b border-[#ca8a04]/10">
                <span
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="text-[#f5f0e8] text-lg"
                >
                  Golden <span className="text-[#ca8a04]">Heart</span>
                </span>
                <button onClick={() => setMobileOpen(false)} className="text-[#b0aa9e] hover:text-[#f5f0e8]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 px-6 py-8 flex flex-col gap-1">
                {NAV_LINKS.map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={handleNavClick}
                    className="py-3.5 text-base text-[#c4bfb0] hover:text-[#ca8a04] transition-colors border-b border-[#ca8a04]/5 tracking-wide"
                  >
                    {label}
                  </a>
                ))}
              </div>

              <div className="px-6 pb-10 flex flex-col gap-3">
                <a
                  href="tel:02812345678"
                  className="flex items-center gap-3 py-3 text-[#ca8a04] font-medium text-sm"
                >
                  <Phone size={15} strokeWidth={2.5} /> 028 1234 5678
                </a>

                {/* Mobile: chưa đăng nhập */}
                {!isAuthenticated && (
                  <>
                    <button
                      onClick={() => { setMobileOpen(false); onLoginClick(); }}
                      className="w-full py-3 rounded-full border border-[#ca8a04]/30 text-sm text-[#f5f0e8] font-medium text-center hover:border-[#ca8a04]/60 transition-colors"
                    >
                      Đăng nhập
                    </button>
                    <button
                      onClick={() => { setMobileOpen(false); onRegisterClick(); }}
                      className="w-full py-3 rounded-full bg-[#ca8a04] text-[#0c0b08] text-sm font-bold text-center hover:bg-[#e09b04] transition-colors"
                    >
                      Đăng ký ngay
                    </button>
                  </>
                )}

                {/* Mobile: CUSTOMER đã đăng nhập */}
                {isCustomer && (
                  <>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 rounded-full bg-[#ca8a04] text-[#0c0b08] text-sm font-bold text-center flex items-center justify-center gap-2 hover:bg-[#e09b04] transition-colors"
                    >
                      <LayoutDashboard size={14} /> Tài khoản của tôi
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 rounded-full border border-[#ca8a04]/20 text-sm text-[#b0aa9e] font-medium text-center flex items-center justify-center gap-2 hover:text-[#ca8a04] hover:border-[#ca8a04]/50 transition-colors"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </>
                )}

                {/* Mobile: Staff đã đăng nhập */}
                {isStaffLogin && (
                  <a
                    href="/dashboard"
                    className="w-full py-3 rounded-full bg-[#ca8a04] text-[#0c0b08] text-sm font-bold text-center hover:bg-[#e09b04] transition-colors"
                  >
                    Vào quản lý
                  </a>
                )}

                <a
                  href="https://zalo.me/02812345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-full border border-[#ca8a04]/20 text-[#ca8a04] text-sm font-medium text-center hover:border-[#ca8a04]/50 transition-colors"
                >
                  Nhắn Zalo đặt bàn
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
