import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { authApi } from '../api/authApi';
import { extractErrorMessage, extractAllFieldErrors } from '../utils/errorHelper';
import {
  User, Mail, Phone, MapPin, Calendar, Edit3,
  Loader2, ShieldCheck, Building2, BadgeCheck,
  Hash, Clock, Camera, Lock, AlertCircle, LogOut, Save, X,
  AlertTriangle
} from 'lucide-react';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên phục vụ',
  KITCHEN: 'Nhân viên bếp',
};

const ROLE_GRADIENT = {
  ADMIN: 'from-amber-400 to-orange-600',
  MANAGER: 'from-blue-500 to-indigo-600',
  STAFF: 'from-emerald-400 to-teal-600',
  KITCHEN: 'from-rose-400 to-red-600',
};

const ROLE_BADGE = {
  ADMIN: 'bg-amber-100 text-amber-800 border-amber-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  STAFF: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  KITCHEN: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : null;

// ─── SKELETON ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-xl mx-auto animate-pulse space-y-4 px-3">
      <div className="h-28 bg-gray-200 rounded-3xl" />
      <div className="h-12 bg-gray-100 rounded-2xl" />
      <div className="bg-white rounded-3xl p-5 space-y-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── INFO CHIP ────────────────────────────────────────────────────────────────

function InfoChip({ icon: Icon, label, value, locked }) {
  return (
    <div className="bg-gray-50/50 rounded-2xl p-3 flex flex-col gap-1 relative overflow-hidden group hover:bg-white hover:shadow-md transition-all border border-gray-100/50">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        {locked && <Lock size={9} className="text-gray-300 ml-auto" />}
      </div>
      <p className="text-xs sm:text-sm font-black text-gray-900 truncate">
        {value || <span className="text-gray-300 font-medium italic">Trống</span>}
      </p>
    </div>
  );
}

// ─── PERSONAL TAB ────────────────────────────────────────────────────────────

function PersonalTab({ profile, onUpdate, onEditingChange }) {
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

  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  const validateField = (name, value) => {
    let error = '';
    const v = (value || '').toString().trim();
    switch (name) {
      case 'fullName':
        if (!v) error = 'Họ tên không được trống';
        else if (v.length < 2) error = 'Họ tên quá ngắn';
        break;
      case 'email':
        if (!v) error = 'Email không được trống';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) error = 'Email sai định dạng';
        break;
      case 'phone':
        if (v && !/^[0-9+\-() ]{10,15}$/.test(v)) error = 'SĐT không hợp lệ';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    const err = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(form).forEach(k => {
      const err = validateField(k, form[k]);
      if (err) newErrors[k] = err;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(Object.values(newErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      const res = await employeeApi.updateMyProfile(form);
      toast.success('Cập nhật thành công!');
      onUpdate(res.data);
      setEditing(false);
    } catch (err) {
      const fieldErrs = extractAllFieldErrors(err);
      if (Object.keys(fieldErrs).length > 0) {
        setErrors(prev => ({ ...prev, ...fieldErrs }));
        toast.error(Object.values(fieldErrs)[0]);
      } else {
        toast.error(extractErrorMessage(err, 'Lỗi cập nhật.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `
    w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-sm font-bold outline-none transition-all
    ${errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-500/20' : 'border-gray-100 focus:bg-white focus:border-amber-500'}
  `;

  if (!editing) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin cá nhân</h3>
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[9px] font-black uppercase hover:bg-amber-100 active:scale-95 transition-all">
            <Edit3 size={12} /> Chỉnh sửa
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoChip icon={User} label="Họ tên" value={profile?.fullName} />
          <InfoChip icon={Phone} label="Điện thoại" value={profile?.phone} />
          <InfoChip icon={Mail} label="Email" value={profile?.email} />
          <InfoChip icon={BadgeCheck} label="Giới tính" value={profile?.gender === 'Male' ? 'Nam' : profile?.gender === 'Female' ? 'Nữ' : profile?.gender} />
          <InfoChip icon={Calendar} label="Ngày sinh" value={fmtDate(profile?.dateOfBirth)} />
          <InfoChip icon={MapPin} label="Địa chỉ" value={profile?.address} />
        </div>

        <div className="pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
          <InfoChip icon={Hash} label="Mã NV" value={profile?.employeeCode} locked />
          <InfoChip icon={ShieldCheck} label="Chức vụ" value={ROLE_LABEL[profile?.roleName]} locked />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cập nhật hồ sơ</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Họ và tên *</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} className={inputCls('fullName')} maxLength={100} />
          {errors.fullName && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.fullName}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls('email')} maxLength={100} />
          {errors.email && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">SĐT</label>
          <input name="phone" value={form.phone} onChange={handleChange} className={inputCls('phone')} maxLength={15} />
          {errors.phone && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Giới tính</label>
          <select name="gender" value={form.gender} onChange={handleChange} className={inputCls('gender')}>
            <option value="">Chọn...</option>
            <option value="Male">Nam</option>
            <option value="Female">Nữ</option>
            <option value="Other">Khác</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Ngày sinh</label>
          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputCls('dateOfBirth')} />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Địa chỉ</label>
          <input name="address" value={form.address} onChange={handleChange} className={inputCls('address')} maxLength={200} />
        </div>
      </div>

      <div className="flex gap-3 pt-3">
        <button type="submit" disabled={loading} className="flex-[2] py-3.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
          {loading ? <Loader2 size={16} className="animate-spin text-amber-500" /> : <Save size={16} className="text-amber-500" />}
          Lưu thay đổi
        </button>
        <button type="button" onClick={() => setEditing(false)} className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase hover:bg-gray-200 active:scale-95 transition-all">
          Hủy
        </button>
      </div>
    </form>
  );
}

// ─── SECURITY TAB ─────────────────────────────────────────────────────────────

function SecurityTab({ onEditingChange }) {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    onEditingChange?.(true);
    return () => onEditingChange?.(false);
  }, [onEditingChange]);

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'oldPassword':
        if (!value) error = 'Bắt buộc';
        break;
      case 'newPassword':
        if (!value) error = 'Bắt buộc';
        else if (value.length < 8) error = 'Tối thiểu 8 ký tự';
        break;
      case 'confirmPassword':
        if (value !== form.newPassword) error = 'Mật khẩu không khớp';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      const err = validateField(name, value);
      setErrors(prevErrs => ({ ...prevErrs, [name]: err }));
      if (name === 'newPassword' && next.confirmPassword) {
        const cErr = next.confirmPassword !== value ? 'Mật khẩu không khớp' : '';
        setErrors(prevErrs => ({ ...prevErrs, confirmPassword: cErr }));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(form).forEach(k => {
      const err = validateField(k, form[k]);
      if (err) newErrors[k] = err;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Kiểm tra lại thông tin.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: form.oldPassword, newPassword: form.newPassword });
      toast.success('Đổi mật khẩu thành công!');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      const fieldErrs = extractAllFieldErrors(err);
      if (Object.keys(fieldErrs).length > 0) {
        setErrors(prev => ({ ...prev, ...fieldErrs }));
        toast.error(Object.values(fieldErrs)[0]);
      } else {
        toast.error(extractErrorMessage(err, 'Thất bại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `
    w-full px-4 py-3 rounded-xl bg-gray-50 border text-sm font-bold outline-none transition-all
    ${errors[field] ? 'border-red-400 bg-red-50 focus:ring-red-500/20' : 'border-gray-100 focus:bg-white focus:border-amber-500'}
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Lock size={14} className="text-amber-500" />
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đổi mật khẩu</h3>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Mật khẩu hiện tại</label>
          <input type="password" name="oldPassword" value={form.oldPassword} onChange={handleChange} className={inputCls('oldPassword')} placeholder="••••••••" maxLength={50} />
          {errors.oldPassword && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.oldPassword}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Mật khẩu mới (Tối thiểu 8)</label>
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} className={inputCls('newPassword')} placeholder="8+ ký tự" maxLength={50} />
            {errors.newPassword && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.newPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Xác nhận</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className={inputCls('confirmPassword')} placeholder="Nhập lại" maxLength={50} />
            {errors.confirmPassword && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{errors.confirmPassword}</p>}
          </div>
        </div>
      </div>

      <div className="p-3 bg-amber-50/50 rounded-xl flex gap-3 border border-amber-100 items-start">
        <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-800 font-bold uppercase leading-tight tracking-tight">Hệ thống sẽ đăng xuất để bảo mật sau khi đổi mật khẩu.</p>
      </div>

      <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
        {loading ? <Loader2 size={16} className="animate-spin text-amber-500" /> : <ShieldCheck size={16} className="text-amber-500" />}
        <span>Xác nhận đổi mật khẩu</span>
      </button>
    </form>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await employeeApi.getMyProfile();
      setProfile(res.data);
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return <ProfileSkeleton />;

  const avatarLetter = (profile?.fullName || '?')[0].toUpperCase();
  const gradient = ROLE_GRADIENT[profile?.roleName] || ROLE_GRADIENT.STAFF;
  const badgeCls = ROLE_BADGE[profile?.roleName] || ROLE_BADGE.STAFF;

  const tabs = [
    { id: 'personal', label: 'Hồ sơ', icon: User },
    ...(profile?.roleName !== 'ADMIN' ? [{ id: 'security', label: 'Bảo mật', icon: Lock }] : []),
  ];

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24 px-3 sm:px-0 animate-in fade-in duration-500">

      {/* ── Header Card (The "Green/Blue" part) ── */}
      {!isEditing && (
        <div className="relative rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-gray-900/5 border border-gray-100">
          <div className={`h-16 sm:h-20 w-full bg-gradient-to-r ${gradient} opacity-90`} />
          
          <div className="px-5 pb-5 -mt-8">
            <div className="flex items-end gap-4 relative">
              {/* Avatar */}
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] bg-gradient-to-br ${gradient} flex items-center justify-center border-4 border-white shadow-xl shrink-0 z-10`}>
                <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">{avatarLetter}</span>
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                  <h1 className="text-lg font-black text-gray-900 truncate leading-none">{profile?.fullName}</h1>
                  <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${badgeCls} shadow-sm`}>
                    {ROLE_LABEL[profile?.roleName]}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold truncate uppercase tracking-tight">{profile?.email}</p>
              </div>

              {/* Logout Button */}
              <button 
                onClick={logout} 
                className="p-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Switcher ── */}
      {!isEditing && tabs.length > 1 && (
        <div className="bg-gray-100/80 p-1.5 rounded-[1.2rem] flex gap-1.5 border border-gray-200/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-200/20' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content Card ── */}
      <div className={`bg-white rounded-[2rem] p-5 sm:p-7 border border-gray-100 shadow-xl shadow-gray-900/5 transition-all ${isEditing ? 'mt-2' : ''}`}>
        {activeTab === 'personal' && (
          <PersonalTab 
            profile={profile} 
            onUpdate={setProfile} 
            onEditingChange={setIsEditing} 
          />
        )}
        {activeTab === 'security' && (
          <SecurityTab 
            onEditingChange={setIsEditing} 
          />
        )}
      </div>
    </div>
  );
}
