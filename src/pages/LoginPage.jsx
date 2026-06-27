/**
 * LoginPage.jsx — Trang đăng nhập với dark luxury theme
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UtensilsCrossed, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';

// Chỉ nhân viên nội bộ mới được dùng trang này
const STAFF_ROLE_HOME = {
  ADMIN:   '/dashboard',
  MANAGER: '/dashboard',
  STAFF:   '/menu',
  KITCHEN: '/menu',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [customerBlocked,   setCustomerBlocked]   = useState(false);

  // Ref ngăn useEffect redirect trong khi handleSubmit đang xử lý blocking flow
  const isHandlingBlock = useRef(false);

  const { login, logout, loading, error, isAuthenticated, role, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Đã đăng nhập sẵn khi vào trang: staff → vào app, customer → về homepage (không logout)
  // Bỏ qua nếu đang trong flow chặn customer từ handleSubmit
  useEffect(() => {
    if (isAuthenticated && role && !isHandlingBlock.current) {
      if (STAFF_ROLE_HOME[role]) {
        navigate(STAFF_ROLE_HOME[role], { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  const validate = () => {
    const errors = {};
    if (!username.trim()) errors.username = 'Vui lòng nhập tên đăng nhập';
    if (!password) errors.password = 'Vui lòng nhập mật khẩu';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setCustomerBlocked(false);
    if (!validate()) return;

    // Đánh dấu trước khi login để useEffect không redirect trong lúc chờ kết quả
    isHandlingBlock.current = true;
    const ok = await login({ username: username.trim(), password });

    if (ok) {
      const currentRole = useAuthStore.getState().role;
      if (!STAFF_ROLE_HOME[currentRole]) {
        // Tài khoản khách hàng không được dùng trang nội bộ → logout và thông báo
        await logout();
        setCustomerBlocked(true);
      } else {
        navigate(STAFF_ROLE_HOME[currentRole], { replace: true });
      }
    }

    isHandlingBlock.current = false;
  };

  return (
    <div className="min-h-screen bg-[#0A0600] flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 30px,
            rgba(212,175,55,1) 30px,
            rgba(212,175,55,1) 31px
          )`,
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 shadow-2xl shadow-amber-900/60 mb-5">
            <UtensilsCrossed className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-amber-100 tracking-tight">
            Golden<span className="text-amber-400">Heart</span>
          </h1>
          <p className="text-amber-700/80 text-sm mt-1.5">Hệ thống quản lý nhà hàng</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-amber-900/25 rounded-2xl p-8 shadow-2xl shadow-black/50">

          {/* Màn hình chặn tài khoản khách hàng */}
          {customerBlocked ? (
            <div className="flex flex-col items-center text-center gap-6 py-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-500/70" />
              </div>

              <div className="space-y-2">
                <p className="text-amber-100 text-base font-semibold">
                  Tài khoản không có quyền truy cập
                </p>
                <p className="text-amber-100/50 text-sm leading-relaxed">
                  Trang đăng nhập này chỉ dành cho<br />
                  <span className="text-amber-500/80">nhân viên nội bộ</span> của Golden Heart.
                </p>
                <p className="text-amber-900/50 text-xs leading-relaxed pt-1">
                  Tài khoản khách hàng vui lòng đăng nhập<br />tại trang chủ của nhà hàng.
                </p>
              </div>

              <div className="w-full space-y-3 pt-1">
                <button
                  onClick={() => navigate('/', { state: { openLogin: true } })}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-900/40 transition-all"
                >
                  Đăng nhập tại trang chủ
                </button>
                <button
                  onClick={() => setCustomerBlocked(false)}
                  className="w-full py-2.5 rounded-xl border border-amber-900/25 text-amber-900/60 hover:text-amber-700 hover:border-amber-900/40 text-xs font-medium transition-all"
                >
                  Thử lại với tài khoản khác
                </button>
              </div>
            </div>
          ) : (
          <>
          <h2 className="text-lg font-semibold text-amber-200 mb-6">Đăng nhập</h2>

          {/* API error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-amber-400/80 text-xs font-medium mb-2 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors((p) => ({ ...p, username: undefined }));
                }}
                placeholder="Nhập tên đăng nhập..."
                className={`
                  w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-amber-100 text-sm
                  placeholder-amber-900/60 outline-none transition-all duration-200
                  ${fieldErrors.username
                    ? 'border-red-500/50 focus:border-red-400/70 focus:ring-1 focus:ring-red-500/30'
                    : 'border-amber-900/30 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20'
                  }
                `}
              />
              {fieldErrors.username && (
                <p className="text-red-400 text-xs mt-1.5">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-amber-400/80 text-xs font-medium mb-2 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Nhập mật khẩu..."
                  className={`
                    w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.04] border text-amber-100 text-sm
                    placeholder-amber-900/60 outline-none transition-all duration-200
                    ${fieldErrors.password
                      ? 'border-red-500/50 focus:border-red-400/70 focus:ring-1 focus:ring-red-500/30'
                      : 'border-amber-900/30 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20'
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-700/60 hover:text-amber-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1.5">{fieldErrors.password}</p>
              )}
              
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-amber-500/60 hover:text-amber-500 text-xs font-medium transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full mt-2 py-3.5 rounded-xl font-semibold text-sm
                bg-gradient-to-r from-amber-500 to-amber-600
                hover:from-amber-400 hover:to-amber-500
                text-white shadow-lg shadow-amber-900/40
                transition-all duration-200 active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="text-center text-amber-900/60 text-xs mt-6">
            Tài khoản mặc định: <span className="text-amber-700">admin</span> / <span className="text-amber-700">Admin123</span>
          </p>
          </>
          )}
        </div>

        <p className="text-center text-amber-900/40 text-xs mt-6">
          © 2026 GoldenHeart Restaurant Management
        </p>
      </div>

      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
      />
    </div>
  );
}
