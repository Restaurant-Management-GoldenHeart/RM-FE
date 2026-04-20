/**
 * LoginPage.jsx — Trang đăng nhập với dark luxury theme
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UtensilsCrossed, Eye, EyeOff, Loader2 } from 'lucide-react';

// Role → default redirect path
const ROLE_HOME = {
  ADMIN: '/dashboard',
  MANAGER: '/dashboard',
  STAFF: '/menu',
  KITCHEN: '/menu',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { login, loading, error, isAuthenticated, role, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Redirect nếu đã login
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(ROLE_HOME[role] || '/menu', { replace: true });
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
    if (!validate()) return;

    const ok = await login({ username: username.trim(), password });
    if (ok) {
      const currentRole = useAuthStore.getState().role;
      navigate(ROLE_HOME[currentRole] || '/menu', { replace: true });
    }
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
        </div>

        <p className="text-center text-amber-900/40 text-xs mt-6">
          © 2026 GoldenHeart Restaurant Management
        </p>
      </div>
    </div>
  );
}
