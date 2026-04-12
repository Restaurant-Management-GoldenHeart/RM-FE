import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import {
  User, Mail, Phone, MapPin, Calendar, Save, Edit3,
  X, Loader2, ShieldCheck, Building2, BadgeCheck,
  Hash, Clock, Camera
} from 'lucide-react';

const ROLE_LABEL = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên phục vụ',
  KITCHEN: 'Nhân viên bếp',
};

const ROLE_THEME = {
  ADMIN: 'bg-gold-50 text-gold-700 border-gold-200',
  MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
  STAFF: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KITCHEN: 'bg-orange-50 text-orange-700 border-orange-200',
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-32 rounded-3xl" />
      <div className="premium-card p-8 space-y-8">
        <div className="flex items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-3xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-sm hover:border-gray-200 transition-all group">
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-gold-600 group-hover:border-gold-200 transition-colors shadow-sm">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5">{value || 'Chưa cập nhật'}</p>
      </div>
    </div>
  );
}

/**
 * PRODUCTION-GRADE VALIDATION LOGIC
 */
const validateField = (name, value, form) => {
  const v = (value || '').toString().trim();

  switch (name) {
    case 'fullName':
      if (!v) return 'Họ tên không được để trống';
      if (/[0-9]/.test(v)) return 'Họ tên không được chứa số';
      if (/[!@#$%^&*(),.?":{}|<>]/.test(v)) return 'Họ tên không hợp lệ';
      if (v.length < 2) return 'Họ tên quá ngắn';
      return null;

    case 'email':
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email sai định dạng';
      return null;

    case 'phone':
      if (v && !/^\d+$/.test(v)) return 'Số điện thoại chỉ được chứa số';
      if (v && (v.length < 9 || v.length > 11)) return 'Số điện thoại không hợp lệ';
      return null;

    case 'address':
      if (v && v.length < 5) return 'Địa chỉ quá ngắn';
      return null;

    case 'dateOfBirth':
      if (v && new Date(v) > new Date()) return 'Ngày sinh không hợp lệ';
      return null;

    default:
      return null;
  }
};

const validateForm = (form) => {
  const errors = {};
  ['fullName', 'email', 'phone', 'address', 'dateOfBirth'].forEach(field => {
    const err = validateField(field, form[field], form);
    if (err) errors[field] = err;
  });
  return errors;
};

function EditForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState({
    fullName: initialData?.fullName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    dateOfBirth: initialData?.dateOfBirth || '',
    gender: initialData?.gender || '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef({});

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    // RULE: Sanitize only (No hard block)
    if (name === 'fullName') sanitizedValue = value.replace(/[0-9]/g, '');
    if (name === 'phone') sanitizedValue = value.replace(/\D/g, '');

    setForm(prev => ({ ...prev, [name]: sanitizedValue }));

    // Debounce validation (300ms)
    if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);
    debounceRef.current[name] = setTimeout(() => {
      const error = validateField(name, sanitizedValue, form);
      setErrors(prev => ({ ...prev, [name]: error || undefined }));
    }, 300);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value, form);
    setErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Mark all as touched
    const allTouched = Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    // 2. Full validation
    const formErrors = validateForm(form);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      // Find first error
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      toast.error(formErrors[firstErrorField]);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
      };

      const res = await employeeApi.updateMyProfile(payload);
      toast.success('Đã cập nhật hồ sơ!');
      onSave(res.data);
    } catch (err) {
      // BACKEND ERROR HANDLING
      if (err.response?.data?.errors) {
        setErrors(prev => ({ ...prev, ...err.response.data.errors }));
        const firstBackendError = Object.values(err.response.data.errors)[0];
        toast.error(firstBackendError);
      } else {
        toast.error(err?.message || 'Cập nhật thất bại');
      }
    } finally {
      setSaving(false);
    }
  };

  const isFormInvalid = useMemo(() => {
    if (!form.fullName.trim()) return true;
    return Object.values(errors).some(err => err !== undefined && err !== null);
  }, [form.fullName, errors]);

  const inputCls = (field) => `
    w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-900 text-sm font-medium
    placeholder-gray-300 outline-none transition-all
    ${(touched[field] && errors[field])
      ? 'border-red-500 bg-red-50 text-red-600'
      : 'focus:bg-white focus:border-gold-500 focus:ring-4 focus:ring-gold-500/5'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Họ và tên</label>
          <input
            name="fullName"
            className={inputCls('fullName')}
            value={form.fullName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="Ví dụ: Nguyễn Văn A"
          />
          {touched.fullName && errors.fullName && (
            <p className="text-red-500 text-[10px] font-bold mt-1 pl-1 animate-slide-up">{errors.fullName}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Email liên hệ</label>
          <input
            name="email"
            type="email"
            className={inputCls('email')}
            value={form.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="example@company.com"
          />
          {touched.email && errors.email && (
            <p className="text-red-500 text-[10px] font-bold mt-1 pl-1 animate-slide-up">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Số điện thoại</label>
          <input
            name="phone"
            className={inputCls('phone')}
            value={form.phone}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="09xx xxx xxx"
          />
          {touched.phone && errors.phone && (
            <p className="text-red-500 text-[10px] font-bold mt-1 pl-1 animate-slide-up">{errors.phone}</p>
          )}
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Giới tính</label>
          <select
            name="gender"
            className={inputCls('gender')}
            value={form.gender}
            onChange={handleInputChange}
            onBlur={handleBlur}
          >
            <option value="">Chọn giới tính</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
            <option value="Other">Khác</option>
          </select>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Ngày sinh</label>
          <input
            name="dateOfBirth"
            type="date"
            className={inputCls('dateOfBirth')}
            value={form.dateOfBirth}
            onChange={handleInputChange}
            onBlur={handleBlur}
          />
          {touched.dateOfBirth && errors.dateOfBirth && (
            <p className="text-red-500 text-[10px] font-bold mt-1 pl-1 animate-slide-up">{errors.dateOfBirth}</p>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Địa chỉ thường trú</label>
          <input
            name="address"
            className={inputCls('address')}
            value={form.address}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder="Số nhà, đường, phường/xã..."
          />
          {touched.address && errors.address && (
            <p className="text-red-500 text-[10px] font-bold mt-1 pl-1 animate-slide-up">{errors.address}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
        <button
          type="submit"
          disabled={saving || isFormInvalid}
          className="px-8 py-3.5 rounded-2xl bg-gold-600 text-white font-black text-sm uppercase tracking-widest hover:bg-gold-700 transition-all shadow-xl shadow-gold-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu thông tin'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-8 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          Hủy bỏ
        </button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { role, setUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await employeeApi.getMyProfile();
        const data = { ...res.data, role: res.data.roleName || role };
        setProfile(data);
        setUser(data);
      } catch (err) {
        toast.error(err?.message || 'Lỗi tải hồ sơ');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <ProfileSkeleton />;

  const roleTheme = ROLE_THEME[profile?.roleName || role] || ROLE_THEME.STAFF;
  const avatarLetter = (profile?.fullName || profile?.username || '?')[0].toUpperCase();
  const fmt = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-4 sm:px-0">
      {/* ── Banner ── */}
      <div className="relative h-32 w-full rounded-3xl bg-gold-600 shadow-xl shadow-gold-600/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
      </div>

      {/* ── Profile Container ── */}
      <div className="premium-card relative p-8 -mt-16 mx-4 sm:mx-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-50">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="w-28 h-28 rounded-3xl bg-white border-[6px] border-white shadow-2xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gold-50 flex items-center justify-center">
                  <span className="text-4xl font-black text-gold-600">{avatarLetter}</span>
                </div>
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-transform">
                <Camera size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">
                {profile?.fullName || profile?.username}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${roleTheme}`}>
                  {ROLE_LABEL[profile?.roleName] || profile?.roleName}
                </span>
                <span className="px-3 py-1.5 bg-gray-50 text-gray-400 rounded-full text-[10px] font-bold border border-gray-100">
                  #{profile?.employeeCode || 'USR-001'}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          {!editing && (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-gray-100 text-gray-900 text-sm font-black hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <Edit3 size={16} /> Chỉnh sửa hồ sơ
            </button>
          )}
        </div>

        <div className="pt-8">
          {editing ? (
            <EditForm initialData={profile} onSave={(d) => { setProfile(d); setUser(d); setEditing(false); }} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Thông tin liên hệ</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoItem icon={User} label="Tên đầy đủ" value={profile?.fullName} />
                    <InfoItem icon={Mail} label="Email doanh nghiệp" value={profile?.email} />
                    <InfoItem icon={Phone} label="Số điện thoại" value={profile?.phone} />
                    <InfoItem icon={MapPin} label="Địa chỉ" value={profile?.address} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Vị trí & Công tác</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <InfoItem icon={Building2} label="Chi nhánh trực thuộc" value={profile?.branchName || 'Tổng công ty'} />
                    <InfoItem icon={Calendar} label="Ngày gia nhập" value={fmt(profile?.hireDate)} />
                    <InfoItem icon={BadgeCheck} label="Ngày sinh" value={fmt(profile?.dateOfBirth)} />
                    <InfoItem icon={User} label="Giới tính" value={profile?.gender} />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] pl-1 mb-4">Hoạt động tài khoản</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'ID Tài khoản', value: profile?.username, icon: ShieldCheck },
                    { label: 'Khởi tạo lúc', value: fmt(profile?.createdAt), icon: Clock },
                    { label: 'Lần cuối cập nhật', value: fmt(profile?.updatedAt), icon: Save },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-gray-50 p-4 rounded-2xl flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Icon size={14} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                        <p className="text-xs font-black text-gray-900 mt-0.5">{value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
