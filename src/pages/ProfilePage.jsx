import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { authApi } from '../api/authApi';
import { extractErrorMessage } from '../utils/errorHelper';
import {
  User, Mail, Phone, MapPin, Calendar, Edit3,
  Loader2, ShieldCheck, Building2, BadgeCheck,
  Hash, Clock, Camera, Lock, AlertCircle, LogOut
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  ADMIN:   'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF:   'Nhân viên phục vụ',
  KITCHEN: 'Nhân viên bếp',
};

const ROLE_GRADIENT = {
  ADMIN:   'from-yellow-500 to-amber-600',
  MANAGER: 'from-blue-500 to-indigo-600',
  STAFF:   'from-emerald-500 to-teal-600',
  KITCHEN: 'from-orange-500 to-red-500',
};

const ROLE_BADGE = {
  ADMIN:   'bg-amber-100 text-amber-800 border-amber-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  STAFF:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  KITCHEN: 'bg-orange-100 text-orange-800 border-orange-200',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : null;

const validateField = (name, value) => {
  const v = (value || '').toString().trim();
  switch (name) {
    case 'fullName': return !v ? 'Họ tên không được trống' : v.length < 2 ? 'Họ tên quá ngắn' : null;
    case 'email':    return v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email sai định dạng' : null;
    case 'phone':    return v && !/^\d{10,11}$/.test(v) ? 'SĐT phải 10-11 số' : null;
    default:         return null;
  }
};

// ─── SKELETON ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse space-y-4">
      <div className="h-48 bg-gray-200 rounded-3xl" />
      <div className="bg-white rounded-3xl p-5 space-y-4 border border-gray-100">
        <div className="flex gap-3">
          <div className="h-8 bg-gray-100 rounded-full flex-1" />
          <div className="h-8 bg-gray-100 rounded-full flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── INFO CHIP ────────────────────────────────────────────────────────────────
// Compact 2-column chip layout — thay cho InfoRow từng dòng cũ

function InfoChip({ icon: Icon, label, value, locked }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-1.5 relative overflow-hidden">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-gray-400 shrink-0" />
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        {locked && <Lock size={9} className="text-gray-300 ml-auto shrink-0" />}
      </div>
      <p className="text-sm font-black text-gray-900 leading-tight truncate">
        {value || <span className="text-gray-300 font-medium text-xs">Chưa cập nhật</span>}
      </p>
    </div>
  );
}

// ─── PERSONAL TAB ────────────────────────────────────────────────────────────

function PersonalTab({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName:    profile?.fullName    || '',
    email:       profile?.email       || '',
    phone:       profile?.phone       || '',
    address:     profile?.address     || '',
    dateOfBirth: profile?.dateOfBirth || '',
    gender:      profile?.gender      || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: err || undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    ['fullName','email','phone'].forEach(f => {
      const err = validateField(f, form[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setErrors({});
    try {
      const res = await employeeApi.updateMyProfile(form);
      toast.success('Đã cập nhật hồ sơ thành công!');
      onUpdate(res.data);
      setEditing(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không thể cập nhật hồ sơ.'));
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `
    w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border text-sm font-medium
    focus:bg-white focus:border-gold-500 outline-none transition-all
    ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-100'}
  `;

  const genderLabel = profile?.gender === 'Male' ? 'Nam' : profile?.gender === 'Female' ? 'Nữ' : profile?.gender ? 'Khác' : null;

  if (!editing) {
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Thông tin cá nhân</h3>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[11px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95"
          >
            <Edit3 size={12} /> Chỉnh sửa
          </button>
        </div>

        {/* 2-column chip grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <InfoChip icon={User}      label="Họ và tên"     value={profile?.fullName} />
          <InfoChip icon={Phone}     label="Điện thoại"    value={profile?.phone} />
          <InfoChip icon={Mail}      label="Email"         value={profile?.email} />
          <InfoChip icon={BadgeCheck} label="Giới tính"   value={genderLabel} />
          <InfoChip icon={Calendar}  label="Ngày sinh"     value={fmtDate(profile?.dateOfBirth)} />
          <InfoChip icon={MapPin}    label="Địa chỉ"       value={profile?.address} />
        </div>

        {/* Work info */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Thông tin công việc</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <InfoChip icon={Hash}       label="Mã nhân viên"  value={profile?.employeeCode} locked />
            <InfoChip icon={ShieldCheck} label="Chức vụ"      value={ROLE_LABEL[profile?.roleName]} locked />
            <InfoChip icon={Building2}  label="Chi nhánh"     value={profile?.branchName || 'Trụ sở chính'} locked />
            <InfoChip icon={Clock}      label="Ngày gia nhập" value={fmtDate(profile?.createdAt)} locked />
          </div>
        </div>
      </div>
    );
  }

  // Edit form
  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Chỉnh sửa hồ sơ</h3>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {/* Họ tên */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Họ và tên</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} className={inputCls('fullName')} />
          {errors.fullName && <p className="text-red-500 text-[10px] font-bold">{errors.fullName}</p>}
        </div>

        {/* Email + Phone in 2 cols */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls('email')} />
            {errors.email && <p className="text-red-500 text-[10px] font-bold">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Điện thoại</label>
            <input name="phone" value={form.phone} onChange={handleChange} className={inputCls('phone')} />
            {errors.phone && <p className="text-red-500 text-[10px] font-bold">{errors.phone}</p>}
          </div>
        </div>

        {/* Gender + DOB in 2 cols */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giới tính</label>
            <select name="gender" value={form.gender} onChange={handleChange} className={inputCls('gender')}>
              <option value="">Chọn</option>
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="Other">Khác</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày sinh</label>
            <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputCls('dateOfBirth')} />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Địa chỉ</label>
          <input name="address" value={form.address} onChange={handleChange} className={inputCls('address')} />
        </div>
      </div>

      <div className="flex gap-2.5 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : 'Lưu thay đổi'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

// ─── SECURITY TAB ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.oldPassword)  e.oldPassword = 'Nhập mật khẩu hiện tại';
    if (!form.newPassword)  e.newPassword = 'Nhập mật khẩu mới';
    else if (form.newPassword.length < 8) e.newPassword = 'Tối thiểu 8 ký tự';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(form.newPassword))
      e.newPassword = 'Cần chữ hoa, thường và số';
    if (form.newPassword !== form.confirmPassword)
      e.confirmPassword = 'Mật khẩu không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await authApi.changePassword({ currentPassword: form.oldPassword, newPassword: form.newPassword });
      toast.success('Đổi mật khẩu thành công! Đăng xuất sau 2 giây...');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Đổi mật khẩu thất bại.'));
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `
    w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border text-sm font-medium
    focus:bg-white focus:border-gold-500 outline-none transition-all
    ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-100'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
          <Lock size={16} />
        </div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Bảo mật & Mật khẩu</h3>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3.5">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu hiện tại</label>
          <input
            type="password" value={form.oldPassword}
            onChange={e => setForm({ ...form, oldPassword: e.target.value })}
            className={inputCls('oldPassword')} placeholder="••••••••"
          />
          {errors.oldPassword && <p className="text-red-500 text-[10px] font-bold">{errors.oldPassword}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu mới</label>
            <input
              type="password" value={form.newPassword}
              onChange={e => setForm({ ...form, newPassword: e.target.value })}
              className={inputCls('newPassword')} placeholder="Tối thiểu 8 ký tự"
            />
            {errors.newPassword && <p className="text-red-500 text-[10px] font-bold">{errors.newPassword}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Xác nhận</label>
            <input
              type="password" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className={inputCls('confirmPassword')} placeholder="Nhập lại"
            />
            {errors.confirmPassword && <p className="text-red-500 text-[10px] font-bold">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
          Sau khi đổi mật khẩu thành công, bạn sẽ bị đăng xuất và cần đăng nhập lại.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cập nhật mật khẩu'}
      </button>
    </form>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { logout } = useAuthStore();
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await employeeApi.getMyProfile();
      setProfile(res.data);
    } catch {
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return <ProfileSkeleton />;

  const avatarLetter  = (profile?.fullName || profile?.username || '?')[0].toUpperCase();
  const gradient      = ROLE_GRADIENT[profile?.roleName] || ROLE_GRADIENT.STAFF;
  const badgeCls      = ROLE_BADGE[profile?.roleName]    || ROLE_BADGE.STAFF;

  const tabs = [
    { id: 'personal', label: 'Hồ sơ',    icon: User },
    ...(profile?.roleName !== 'ADMIN' ? [{ id: 'security', label: 'Bảo mật', icon: Lock }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-4 pb-6">

      {/* ── Hero Card ─────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-gray-900/10">

        {/* Gradient cover strip */}
        <div className={`h-28 w-full bg-gradient-to-br ${gradient} relative`}>
          {/* Decorative blobs */}
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full bg-white/5" />
        </div>

        {/* White card body */}
        <div className="bg-white px-5 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl border-4 border-white`}>
                <span className="text-3xl font-black text-white">{avatarLetter}</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-xl shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
                <Camera size={13} />
              </button>
            </div>

            {/* Logout btn top-right */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 text-red-500 border border-red-100 text-[11px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 mt-2"
            >
              <LogOut size={13} /> Đăng xuất
            </button>
          </div>

          {/* Name + role */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{profile?.fullName}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeCls}`}>
              {ROLE_LABEL[profile?.roleName]}
            </span>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-500">
              <Mail size={11} className="shrink-0" />
              <span className="truncate max-w-[160px]">{profile?.email || 'Chưa có email'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-500">
              <Building2 size={11} className="shrink-0" />
              {profile?.branchName || 'Trụ sở chính'}
            </span>
            {profile?.phone && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-full text-[11px] font-bold text-gray-500">
                <Phone size={11} className="shrink-0" />
                {profile.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Switcher (Segmented Control) ────────────────────── */}
      {tabs.length > 1 && (
        <div className="bg-gray-100 p-1 rounded-2xl flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-md shadow-gray-900/5'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content Card ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        {activeTab === 'personal' && <PersonalTab profile={profile} onUpdate={setProfile} />}
        {activeTab === 'security' && <SecurityTab />}
      </div>

    </div>
  );
}
