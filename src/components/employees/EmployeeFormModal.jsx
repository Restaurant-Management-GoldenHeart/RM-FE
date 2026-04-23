import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { 
  X, Save, Users, AlertCircle, Loader2, Check, ChevronDown, 
  Lock, Mail, User, Phone, MapPin, Calendar, DollarSign, 
  StickyNote, Building2, ShieldCheck, Briefcase
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * EmployeeFormModal - Form for adding/editing employees
 * Design: High Contrast (Simple White & Gold) - Glassmorphism
 * Pattern: Matches InventoryFormModal selection components
 */
export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  roles = [],
  branches = [],
  isLoading,
  branchesLoading = false
}) {
  const { user, role: actorRole } = useAuthStore();
  const isEdit = !!employee;
  const isManagerEditing = actorRole === 'MANAGER' && isEdit;
  const isManager = actorRole === 'MANAGER';
  const isSelf = employee?.id === user?.id;
  const nameRef = React.useRef();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: 'Other',
    hireDate: new Date().toISOString().split('T')[0],
    salary: 0,
    roleId: '',
    branchId: '',
    status: 'ACTIVE',
    internalNotes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (employee) {
      setFormData({
        username: employee.username || '',
        password: '',
        fullName: employee.fullName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        address: employee.address || '',
        dateOfBirth: employee.dateOfBirth || '',
        gender: employee.gender || 'Other',
        hireDate: employee.hireDate || '',
        salary: employee.salary || 0,
        roleId: employee.roleId || '',
        branchId: employee.branchId || '',
        status: employee.status || 'ACTIVE',
        internalNotes: employee.internalNotes || ''
      });
    } else {
      setFormData({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        gender: 'Other',
        hireDate: new Date().toISOString().split('T')[0],
        salary: 0,
        roleId: roles.find(r => r.name === 'STAFF')?.id || '',
        branchId: isManager ? user?.branchId : (branches[0]?.id || ''),
        status: 'ACTIVE',
        internalNotes: ''
      });
    }
    setErrors({});
  }, [isOpen, employee, roles, branches, isManager, user]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Tên đăng nhập không được để trống';
    if (!isEdit && !formData.password) newErrors.password = 'Mật khẩu không được để trống';
    if (!formData.fullName.trim()) newErrors.fullName = 'Họ tên không được để trống';
    if (!formData.email.trim()) newErrors.email = 'Email không được để trống';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email không hợp lệ';
    if (!formData.roleId) newErrors.roleId = 'Vui lòng chọn vai trò';
    if (!formData.branchId) newErrors.branchId = 'Vui lòng chọn chi nhánh';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const inputCls = (field, hasIcon = false) => {
    const isLocked = (field === 'username' && isEdit) || 
                    (field === 'roleId' && isManagerEditing) || 
                    (field === 'branchId' && isManager);
    const hasError = errors[field];
    
    return [
      'w-full py-3.5 rounded-2xl border text-sm font-bold outline-none transition-all duration-200',
      hasIcon ? 'pl-12 pr-5' : 'px-5',
      isLocked
        ? 'bg-gray-50/80 text-gray-400 cursor-not-allowed border-gray-100'
        : hasError
          ? 'bg-red-50 border-red-200 focus:ring-4 focus:ring-red-500/5'
          : 'bg-gray-50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500'
    ].join(' ');
  };

  const filteredRoles = roles.filter(r => {
    if (actorRole === 'MANAGER') {
      // Manager không được tạo Admin hoặc Manager khác
      return r.name !== 'ADMIN' && r.name !== 'MANAGER';
    }
    return true;
  });

  const selectedRole = roles.find(r => Number(r.id) === Number(formData.roleId));
  const selectedBranch = branches.find(b => Number(b.id) === Number(formData.branchId));

  const Label = ({ children }) => (
    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 mb-1.5 block">
      {children}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] flex flex-col max-h-[90vh] animate-scale-up border border-white">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
               <User size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                {isEdit ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
                {isEdit ? `Đang chỉnh sửa: ${employee.fullName}` : 'Thiết lập tài khoản hệ thống'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form id="employee-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* --- Section: Account Information --- */}
            <div className="col-span-full mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={12} /> Thông tin tài khoản
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1.5">
              <Label>Tên đăng nhập {isEdit && <Lock size={10} className="inline ml-1" />}</Label>
              <div className="relative">
                <input
                  ref={nameRef}
                  type="text"
                  name="username"
                  autoComplete="username"
                  disabled={isEdit}
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={inputCls('username', true)}
                  placeholder="VD: nguyenvan_a"
                />
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.username && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.username}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Mật khẩu</Label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={inputCls('password', true)}
                  placeholder={isEdit ? "Để trống nếu không đổi" : "••••••••"}
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.password && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.password}</p>}
            </div>

            {/* --- Section: Personal Information --- */}
            <div className="col-span-full mt-4 mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <User size={12} /> Thông tin cá nhân
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1.5">
              <Label>Họ và tên</Label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className={inputCls('fullName')}
                placeholder="VD: Nguyễn Văn A"
              />
              {errors.fullName && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email liên lạc</Label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={inputCls('email', true)}
                  placeholder="email@example.com"
                />
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.email && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className={inputCls('phone', true)}
                  placeholder="09xx xxx xxx"
                />
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Giới tính</Label>
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 h-[50px]">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.gender === g ? 'bg-white text-amber-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {g === 'Male' ? 'Nam' : g === 'Female' ? 'Nữ' : 'Khác'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ngày sinh</Label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className={inputCls('dateOfBirth', true)}
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Địa chỉ cư trú</Label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className={inputCls('address', true)}
                  placeholder="Số nhà, tên đường…"
                />
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            {/* --- Section: Work Information --- */}
            <div className="col-span-full mt-4 mb-2 flex items-center gap-3">
              <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.3em] flex items-center gap-2">
                <Briefcase size={12} /> Thông tin công việc
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1.5">
              <Label>Vai trò hệ thống {(isManagerEditing || isSelf) && <Lock size={10} className="inline ml-1" />}</Label>
              <Listbox 
                value={formData.roleId} 
                onChange={(val) => setFormData({...formData, roleId: val})} 
                disabled={isManagerEditing || isSelf}
              >
                <div className="relative">
                  <Listbox.Button className={`${inputCls('roleId')} flex justify-between items-center text-left`}>
                    <span className="truncate">{selectedRole?.name || '-- Chọn vai trò --'}</span>
                    {!(isManagerEditing || isSelf) 
                      ? <ChevronDown size={15} className="text-gray-400" /> 
                      : <Lock size={14} className="text-gray-300" />}
                  </Listbox.Button>
                  {!(isManagerEditing || isSelf) && (
                    <Listbox.Options className="absolute z-[110] mt-2 w-full bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-in fade-in slide-in-from-top-2">
                      {filteredRoles.map(r => (
                        <Listbox.Option
                          key={r.id}
                          value={r.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-5 py-3 text-xs font-bold flex justify-between items-center transition-colors
                            ${selected ? 'bg-amber-50 text-amber-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-500'}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className="truncate uppercase tracking-wider">{r.name}</span>
                              {selected && <Check size={14} className="text-amber-500" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  )}
                </div>
              </Listbox>
              {isManagerEditing && <p className="text-[9px] font-bold text-amber-600 mt-1.5 pl-1 italic">Quản lý không được phép thay đổi vai trò</p>}
              {errors.roleId && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.roleId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Chi nhánh {(isManager || isSelf) && <Lock size={10} className="inline ml-1" />}</Label>
              <Listbox 
                value={formData.branchId} 
                onChange={(val) => setFormData({...formData, branchId: val})} 
                disabled={isManager || isSelf}
              >
                <div className="relative">
                  <Listbox.Button className={`${inputCls('branchId')} flex justify-between items-center text-left`}>
                    <span className="truncate flex items-center gap-2">
                       <Building2 size={14} className="text-gray-400" />
                       {selectedBranch?.name || '-- Chọn chi nhánh --'}
                    </span>
                    {!(isManager || isSelf) 
                      ? <ChevronDown size={15} className="text-gray-400" /> 
                      : <Lock size={14} className="text-gray-300" />}
                  </Listbox.Button>
                  {!(isManager || isSelf) && (
                    <Listbox.Options className="absolute z-[110] mt-2 w-full bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-in fade-in slide-in-from-top-2">
                      {branchesLoading ? (
                        <div className="px-5 py-4 text-[10px] font-black text-amber-500 uppercase flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" /> Đang tải dữ liệu…
                        </div>
                      ) : branches.map(b => (
                        <Listbox.Option
                          key={b.id}
                          value={b.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-5 py-3 text-xs font-bold flex justify-between items-center transition-colors
                            ${selected ? 'bg-amber-50 text-amber-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-500'}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className="truncate">{b.name}</span>
                              {selected && <Check size={14} className="text-amber-500" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  )}
                </div>
              </Listbox>
              {isManager && <p className="text-[9px] font-bold text-amber-600 mt-1.5 pl-1 italic">Nhân viên được gán vào chi nhánh của bạn</p>}
              {errors.branchId && <p className="text-[10px] font-black text-red-500 uppercase ml-1 mt-1">{errors.branchId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Lương cơ bản (VNĐ)</Label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                  className={inputCls('salary', true)}
                  placeholder="0"
                />
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ngày gia nhập</Label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                  className={inputCls('hireDate', true)}
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div className="col-span-full space-y-1.5">
              <Label>Ghi chú nội bộ</Label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({...formData, internalNotes: e.target.value})}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all resize-none outline-none"
                  placeholder="Kinh nghiệm, năng lực, lưu ý đặc biệt…"
                />
                <StickyNote size={16} className="absolute left-4 top-4 text-gray-300" />
              </div>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/30 rounded-b-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">Kiểm tra kỹ trước khi xác nhận</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-95"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="employee-form"
              disabled={isLoading}
              className="flex-1 sm:flex-none px-12 py-3.5 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95 flex items-center justify-center gap-2 min-w-[180px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Xử lý…</span>
                </>
              ) : (
                <>
                  <Save size={16} className="text-amber-500" />
                  <span>{isEdit ? 'Cập nhật' : 'Thêm mới'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
