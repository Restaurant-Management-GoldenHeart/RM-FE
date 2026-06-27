import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, X, CheckCircle2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/useAuthStore';

// Validation khớp backend constraints
const PWD_REGEX   = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,100}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;

function validate(fields) {
  const errs = {};
  if (!fields.fullName.trim())
    errs.fullName = 'Vui lòng nhập họ và tên';
  if (!fields.email.trim())
    errs.email = 'Vui lòng nhập email';
  else if (!EMAIL_REGEX.test(fields.email))
    errs.email = 'Email không hợp lệ';
  if (!fields.username.trim())
    errs.username = 'Vui lòng nhập tên đăng nhập';
  else if (fields.username.length < 4 || fields.username.length > 50)
    errs.username = 'Tên đăng nhập phải từ 4 đến 50 ký tự';
  if (!fields.password)
    errs.password = 'Vui lòng nhập mật khẩu';
  else if (!PWD_REGEX.test(fields.password))
    errs.password = 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số';
  // SĐT tuỳ chọn — chỉ validate format nếu người dùng có nhập
  if (fields.phone.trim() && !PHONE_REGEX.test(fields.phone.trim()))
    errs.phone = 'SĐT không hợp lệ (VD: 0901234567)';
  return errs;
}

const EMPTY = { fullName: '', email: '', username: '', password: '', phone: '' };

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [fields,      setFields]      = useState(EMPTY);
  const [showPwd,     setShowPwd]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError,    setApiError]    = useState('');
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);

  const login = useAuthStore(s => s.login);

  useEffect(() => {
    if (!isOpen) {
      setFields(EMPTY); setShowPwd(false); setFieldErrors({});
      setApiError(''); setSuccess(false); setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const set = (key) => (e) => {
    setFields(prev => ({ ...prev, [key]: e.target.value }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const res = await authApi.register({
        fullName: fields.fullName.trim(),
        email:    fields.email.trim(),
        username: fields.username.trim(),
        password: fields.password,
        // Chỉ gửi phone nếu khách có nhập — dùng để liên kết hồ sơ walk-in
        phone: fields.phone.trim() || undefined,
      });

      // Kiểm tra xem đây có phải là account linking (khách đã tích điểm trước đó)
      const regData = res?.data?.data ?? res?.data;
      const linked  = regData?.existingCrmLinked;
      const pts     = regData?.inheritedLoyaltyPoints;

      setSuccess(true);

      // Tự động đăng nhập sau đăng ký
      const ok = await login({ username: fields.username.trim(), password: fields.password });
      if (ok) {
        if (linked && pts > 0) {
          // Toast đặc biệt — khách vừa được khôi phục điểm tích lũy
          toast.success(
            `🎉 Đã khôi phục hồ sơ thành viên!\nBạn đang có ${pts.toLocaleString('vi-VN')} điểm tích lũy.`,
            { duration: 6000 }
          );
        }
        setTimeout(onClose, linked ? 1800 : 1200);
      }
    } catch (err) {
      setApiError(err?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (key) =>
    `w-full px-4 py-3 rounded-xl bg-[#1a1816] border text-[#f5f0e8] text-sm placeholder-[#4a4a46] outline-none transition-all ${
      fieldErrors[key]
        ? 'border-red-500/40 focus:border-red-400/60'
        : 'border-[#ca8a04]/15 focus:border-[#ca8a04]/40'
    }`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

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
                    Tạo tài khoản
                  </h2>
                  <p className="text-[#6a6560] text-xs mt-0.5">
                    Tham gia Golden Heart ngay hôm nay
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
                {/* Success state */}
                {success && (
                  <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                    <CheckCircle2 size={40} className="text-[#ca8a04]" />
                    <p className="text-[#f5f0e8] text-sm font-medium">Đăng ký thành công!</p>
                    <p className="text-[#6a6560] text-xs">Đang đăng nhập tài khoản của bạn…</p>
                  </div>
                )}

                {!success && (
                  <>
                    {apiError && (
                      <div className="mb-5 flex items-center gap-2.5 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm">{apiError}</p>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                      {/* Full name */}
                      <div>
                        <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                          Họ và tên
                        </label>
                        <input
                          type="text"
                          autoComplete="name"
                          value={fields.fullName}
                          onChange={set('fullName')}
                          placeholder="Nguyễn Văn A..."
                          className={inputClass('fullName')}
                        />
                        {fieldErrors.fullName && <p className="text-red-400 text-xs mt-1">{fieldErrors.fullName}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                          Email
                        </label>
                        <input
                          type="email"
                          autoComplete="email"
                          value={fields.email}
                          onChange={set('email')}
                          placeholder="example@email.com"
                          className={inputClass('email')}
                        />
                        {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                          Tên đăng nhập
                        </label>
                        <input
                          type="text"
                          autoComplete="username"
                          value={fields.username}
                          onChange={set('username')}
                          placeholder="Từ 4 đến 50 ký tự..."
                          className={inputClass('username')}
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
                            autoComplete="new-password"
                            value={fields.password}
                            onChange={set('password')}
                            placeholder="Tối thiểu 8 ký tự, chữ hoa + số..."
                            className={`${inputClass('password')} pr-11`}
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
                      </div>

                      {/* Phone — tuỳ chọn, dùng để liên kết hồ sơ walk-in */}
                      <div>
                        <label className="block text-[#ca8a04]/70 text-[10px] font-semibold mb-1.5 uppercase tracking-wider">
                          Số điện thoại{' '}
                          <span className="normal-case font-normal text-[#4a4a46]">(tuỳ chọn)</span>
                        </label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a4a46]" />
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={fields.phone}
                            onChange={set('phone')}
                            placeholder="0901234567"
                            className={`${inputClass('phone')} pl-10`}
                          />
                        </div>
                        {fieldErrors.phone
                          ? <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
                          : <p className="text-[#4a4a46] text-[11px] mt-1.5 leading-relaxed">
                              Nhập SĐT đã đăng ký tại nhà hàng để giữ lại điểm tích lũy của bạn.
                            </p>
                        }
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3.5 rounded-xl bg-[#ca8a04] text-[#0a0906] font-bold text-sm tracking-wide hover:bg-[#e09b04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <><Loader2 size={16} className="animate-spin" /> Đang tạo tài khoản...</>
                        ) : 'Đăng ký'}
                      </button>
                    </form>

                    <p className="text-center text-[#4a4a46] text-xs mt-5">
                      Đã có tài khoản?{' '}
                      <button
                        onClick={onSwitchToLogin}
                        className="text-[#ca8a04] hover:text-[#e09b04] font-semibold transition-colors"
                      >
                        Đăng nhập
                      </button>
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
