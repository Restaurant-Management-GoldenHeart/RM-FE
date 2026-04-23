import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { authApi } from '../api/authApi';
import { extractErrorMessage } from '../utils/errorHelper';
import {
  User, Mail, Phone, MapPin, Calendar, Save, Edit3,
  X, Loader2, ShieldCheck, Building2, BadgeCheck,
  Hash, Clock, Camera, Lock,
  ChevronRight, AlertCircle
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

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 sm:p-8">
      <div className="flex items-center gap-6">
        <Skeleton className="w-24 h-24 rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, locked = false }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-gray-100 hover:border-gold-200 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-gold-600 transition-colors">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{value || 'Chưa cập nhật'}</p>
        </div>
      </div>
      {locked && (
        <div className="p-2 text-gray-300" title="Chỉ quản trị viên mới có thể sửa">
          <Lock size={14} />
        </div>
      )}
    </div>
  );
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────

const validateField = (name, value) => {
  const v = (value || '').toString().trim();
  switch (name) {
    case 'fullName':
      if (!v) return 'Họ tên không được để trống';
      if (v.length < 2) return 'Họ tên quá ngắn';
      return null;
    case 'email':
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email sai định dạng';
      return null;
    case 'phone':
      if (v && !/^\d{10,11}$/.test(v)) return 'Số điện thoại phải từ 10-11 số';
      return null;
    default:
      return null;
  }
};

// ─── TABS ───────────────────────────────────────────────────────────────────

function PersonalTab({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    dateOfBirth: profile?.dateOfBirth || '',
    gender: profile?.gender || '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: err || undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    ['fullName', 'email', 'phone'].forEach(f => {
      const err = validateField(f, form[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setErrors({});
    try {
      const res = await employeeApi.updateMyProfile(form);
      toast.success('Đã cập nhật thông tin hồ sơ thành công!');
      onUpdate(res.data);
      setEditing(false);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không thể cập nhật hồ sơ. Vui lòng thử lại sau.'));
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `
    w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium
    focus:bg-white focus:border-gold-500 outline-none transition-all
    ${errors[field] ? 'border-red-500 bg-red-50' : ''}
  `;

  if (!editing) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Thông tin cá nhân</h3>
          <button 
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-50 text-gold-700 text-xs font-black uppercase tracking-widest hover:bg-gold-100 transition-all active:scale-95"
          >
            <Edit3 size={14} /> Chỉnh sửa
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={User} label="Họ và tên" value={profile?.fullName} />
          <InfoRow icon={Mail} label="Email liên hệ" value={profile?.email} />
          <InfoRow icon={Phone} label="Số điện thoại" value={profile?.phone} />
          <InfoRow icon={BadgeCheck} label="Giới tính" value={profile?.gender === 'Male' ? 'Nam' : profile?.gender === 'Female' ? 'Nữ' : 'Khác'} />
          <InfoRow icon={Calendar} label="Ngày sinh" value={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('vi-VN') : null} />
          <InfoRow icon={MapPin} label="Địa chỉ" value={profile?.address} />
        </div>

        <div className="pt-8 border-t border-gray-100">
          <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase mb-4">Thông tin công việc</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow icon={Hash} label="Mã nhân viên" value={profile?.employeeCode} locked />
            <InfoRow icon={ShieldCheck} label="Chức vụ" value={ROLE_LABEL[profile?.roleName]} locked />
            <InfoRow icon={Building2} label="Chi nhánh" value={profile?.branchName || 'Trụ sở chính'} locked />
            <InfoRow icon={Clock} label="Ngày gia nhập" value={profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString('vi-VN') : null} locked />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Chỉnh sửa hồ sơ</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ và tên</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} className={inputCls('fullName')} />
          {errors.fullName && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.fullName}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls('email')} />
          {errors.email && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
          <input name="phone" value={form.phone} onChange={handleChange} className={inputCls('phone')} />
          {errors.phone && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.phone}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giới tính</label>
          <select name="gender" value={form.gender} onChange={handleChange} className={inputCls('gender')}>
            <option value="">Chọn giới tính</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
            <option value="Other">Khác</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ngày sinh</label>
          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputCls('dateOfBirth')} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Địa chỉ</label>
          <input name="address" value={form.address} onChange={handleChange} className={inputCls('address')} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gold-600 text-white text-xs font-black uppercase tracking-widest hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Lưu thay đổi'}
        </button>
        <button 
          type="button" 
          onClick={() => setEditing(false)}
          className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
        >
          Hủy bỏ
        </button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.oldPassword) e.oldPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!form.newPassword) e.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (form.newPassword.length < 8) e.newPassword = 'Mật khẩu phải từ 8 ký tự';
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(form.newPassword)) {
      e.newPassword = 'Mật khẩu phải có chữ hoa, chữ thường và chữ số';
    }
    
    if (form.newPassword !== form.confirmPassword) {
      e.confirmPassword = 'Xác nhận mật khẩu không khớp';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      await authApi.changePassword({
        currentPassword: form.oldPassword,
        newPassword: form.newPassword
      });
      toast.success('Đổi mật khẩu thành công! Hệ thống sẽ đăng xuất sau 2 giây.');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.'));
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
          <Lock size={20} />
        </div>
        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Bảo mật & Mật khẩu</h3>
      </div>

      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mật khẩu hiện tại</label>
          <input 
            type="password"
            value={form.oldPassword}
            onChange={e => setForm({...form, oldPassword: e.target.value})}
            className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:border-gold-500 outline-none transition-all" 
            placeholder="••••••••"
          />
          {errors.oldPassword && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.oldPassword}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
            <input 
              type="password"
              value={form.newPassword}
              onChange={e => setForm({...form, newPassword: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:border-gold-500 outline-none transition-all" 
              placeholder="Tối thiểu 6 ký tự"
            />
            {errors.newPassword && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.newPassword}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu mới</label>
            <input 
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm({...form, confirmPassword: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:border-gold-500 outline-none transition-all" 
              placeholder="Nhập lại mật khẩu mới"
            />
            {errors.confirmPassword && <p className="text-red-500 text-[10px] font-bold ml-1">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
          <strong>Lưu ý:</strong> Sau khi đổi mật khẩu thành công, phiên làm việc hiện tại của bạn sẽ kết thúc. Bạn sẽ cần phải đăng nhập lại với mật khẩu mới.
        </p>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full md:w-auto px-10 py-4 rounded-2xl bg-gray-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cập nhật mật khẩu mới'}
      </button>
    </form>
  );
}




// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await employeeApi.getMyProfile();
      setProfile(res.data);
    } catch (err) {
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <ProfileSkeleton />;

  const avatarLetter = (profile?.fullName || profile?.username || '?')[0].toUpperCase();
  const roleTheme = ROLE_THEME[profile?.roleName] || ROLE_THEME.STAFF;

  const tabs = [
    { id: 'personal', label: 'Thông tin cá nhân', icon: User },
    // Ẩn tab bảo mật nếu là Admin
    ...(profile?.roleName !== 'ADMIN' ? [{ id: 'security', label: 'Bảo mật', icon: Lock }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 p-4 sm:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-8 border-b border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center shadow-2xl shadow-gold-600/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <span className="text-4xl font-black text-white -rotate-3 group-hover:rotate-0 transition-transform">{avatarLetter}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-white text-gray-900 shadow-lg border border-gray-50 hover:scale-110 transition-transform">
              <Camera size={14} />
            </button>
          </div>

          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{profile?.fullName}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${roleTheme}`}>
                {ROLE_LABEL[profile?.roleName]}
              </span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-bold text-gray-400">
              <span className="flex items-center gap-1.5"><Mail size={14} /> {profile?.email}</span>
              <span className="flex items-center gap-1.5"><Building2 size={14} /> {profile?.branchName || 'Trụ sở chính'}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={logout}
          className="px-6 py-3 rounded-xl bg-white border border-gray-100 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 shadow-sm"
        >
          Đăng xuất tài khoản
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav */}
        <div className="md:col-span-3 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-black transition-all
                ${activeTab === tab.id 
                  ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10 translate-x-2' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={18} />
                {tab.label}
              </div>
              <ChevronRight size={16} className={activeTab === tab.id ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="md:col-span-9">
          <div className="premium-card p-8 min-h-[500px]">
            {activeTab === 'personal' && <PersonalTab profile={profile} onUpdate={setProfile} />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
