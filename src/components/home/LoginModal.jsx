import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import ForgotPasswordModal from '../auth/ForgotPasswordModal';

const ROLE_HOME = {
  ADMIN:    '/dashboard',
  MANAGER:  '/dashboard',
  STAFF:    '/menu',
  KITCHEN:  '/menu',
  // CUSTOMER: không có ở đây → modal đơn giản đóng lại, ở lại homepage
};

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [isForgotOpen,  setIsForgotOpen]  = useState(false);

  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Reset form khi đóng modal
  useEffect(() => {
    if (!isOpen) {
      setUsername(''); setPassword(''); setShowPwd(false);
      setFieldErrors({}); clearError(); setIsForgotOpen(false);
    }
  }, [isOpen, clearError]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const validate = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';
    if (!password)        errs.password = 'Vui lòng nhập mật khẩu';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    const ok = await login({ username: username.trim(), password });
    if (ok) {
      const { role } = useAuthStore.getState();
      if (role === 'CUSTOMER') {
        onClose(); // Ở lại homepage
      } else {
        navigate(ROLE_HOME[role] || '/menu', { replace: true });
      }
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md bg-[#0f0e0b] border border-[#ca8a04]/20 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#ca8a04]/10">
                <div>
                  <h2
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="text-xl text-[#f5f0e8]"
                  >
                    Đăng nhập
                  </h2>
                  <p className="text-[#6a6560] text-xs mt-0.5">
                    Chào mừng trở lại Golden Heart
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full border border-[#ca8a04]/20 flex items-center justify-center text-[#6a6560] hover:text-[#ca8a04] hover:border-[#ca8a04]/50 transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="px-7 py-6">
                {/* API error */}
                {error && (
                  <div className="mb-5 flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                      Tên đăng nhập
                    </label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: undefined })); }}
                      placeholder="Nhập tên đăng nhập..."
                      className={`w-full px-4 py-3 rounded-xl bg-[#1a1816] border text-[#f5f0e8] text-sm placeholder-[#4a4a46] outline-none transition-all ${
                        fieldErrors.username
                          ? 'border-red-500/40 focus:border-red-400/60'
                          : 'border-[#ca8a04]/15 focus:border-[#ca8a04]/40'
                      }`}
                    />
                    {fieldErrors.username && <p className="text-red-400 text-xs mt-1">{fieldErrors.username}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                        placeholder="Nhập mật khẩu..."
                        className={`w-full px-4 py-3 pr-11 rounded-xl bg-[#1a1816] border text-[#f5f0e8] text-sm placeholder-[#4a4a46] outline-none transition-all ${
                          fieldErrors.password
                            ? 'border-red-500/40 focus:border-red-400/60'
                            : 'border-[#ca8a04]/15 focus:border-[#ca8a04]/40'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(v => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a4a46] hover:text-[#ca8a04] transition-colors"
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => setIsForgotOpen(true)}
                        className="text-[#ca8a04]/60 hover:text-[#ca8a04] text-xs font-medium transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 rounded-xl bg-[#ca8a04] text-[#0a0906] font-bold text-sm tracking-wide hover:bg-[#e09b04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Đang đăng nhập...</>
                    ) : 'Đăng nhập'}
                  </button>
                </form>

                {/* Switch to register */}
                <p className="text-center text-[#4a4a46] text-xs mt-5">
                  Chưa có tài khoản?{' '}
                  <button
                    onClick={onSwitchToRegister}
                    className="text-[#ca8a04] hover:text-[#e09b04] font-semibold transition-colors"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <ForgotPasswordModal
      isOpen={isForgotOpen}
      onClose={() => setIsForgotOpen(false)}
    />
    </>
  );
}
