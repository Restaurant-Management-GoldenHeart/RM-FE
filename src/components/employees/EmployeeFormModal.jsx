import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { 
  X, Save, Users, AlertCircle, Loader2, Check, ChevronDown, 
  Lock, Mail, User, Phone, MapPin, Calendar, DollarSign, 
  StickyNote, Building2, ShieldCheck, Briefcase
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { extractErrorMessage, extractAllFieldErrors } from '../../utils/errorHelper';

/**
 * EmployeeFormModal - Tối ưu hóa toàn diện: Mobile scaling, Real-time validation, Exhaustive Error Handling
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
  const [touched, setTouched] = useState({});

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
    setTouched({});
  }, [isOpen, employee, roles, branches, isManager, user]);

  if (!isOpen) return null;

  // Real-time validation logic
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'username':
        if (!value.trim()) error = 'Tên đăng nhập là bắt buộc';
        else if (value.length < 4) error = 'Tên đăng nhập tối thiểu 4 ký tự';
        break;
      case 'password':
        if (!isEdit && !value) error = 'Mật khẩu là bắt buộc';
        else if (value && value.length < 6) error = 'Mật khẩu tối thiểu 6 ký tự';
        break;
      case 'fullName':
        if (!value.trim()) error = 'Họ tên không được để trống';
        break;
      case 'email':
        if (!value.trim()) error = 'Email là bắt buộc';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email không hợp lệ';
        break;
      case 'roleId':
        if (!value) error = 'Vui lòng chọn vai trò';
        break;
      case 'branchId':
        if (!value) error = 'Vui lòng chọn chi nhánh';
        break;
      default:
        break;
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    const newTouched = {};
    Object.keys(formData).forEach(key => {
      newTouched[key] = true;
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('CRITICAL ERROR IN EMPLOYEE SUBMISSION:', err);
      const fieldErrs = extractAllFieldErrors(err);
      if (Object.keys(fieldErrs).length > 0) {
        setErrors(prev => ({ ...prev, ...fieldErrs }));
        toast.error(Object.values(fieldErrs)[0]);
      } else {
        const msg = extractErrorMessage(err, 'Lỗi hệ thống không xác định. Vui lòng thử lại sau.');
        setErrors(prev => ({ ...prev, submit: msg }));
        toast.error(msg);
      }
    }
  };

  const inputCls = (field, hasIcon = false) => {
    const isLocked = (field === 'username' && isEdit) || 
                    (field === 'roleId' && isManagerEditing) || 
                    (field === 'branchId' && isManager);
    const hasError = errors[field];
    
    return [
      'w-full py-2.5 rounded-xl border text-sm font-bold outline-none transition-all duration-200',
      hasIcon ? 'pl-11 pr-4' : 'px-4',
      isLocked
        ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100'
        : hasError
          ? 'bg-red-50 border-red-200 focus:ring-4 focus:ring-red-500/5'
          : 'bg-white border-gray-100 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500'
    ].join(' ');
  };

  const filteredRoles = roles.filter(r => {
    if (actorRole === 'MANAGER') return r.name !== 'ADMIN' && r.name !== 'MANAGER';
    return true;
  });

  const selectedRole = roles.find(r => Number(r.id) === Number(formData.roleId));
  const selectedBranch = branches.find(b => Number(b.id) === Number(formData.branchId));

  const Label = ({ children }) => (
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">
      {children}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] animate-scale-up overflow-hidden">
        
        {/* Header - More Compact */}
        <div className="px-6 py-5 sm:px-10 sm:py-7 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
               <User size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-none">
                {isEdit ? 'Cập nhật nhân sự' : 'Thêm nhân sự'}
              </h2>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5">
                Thiết lập hồ sơ nhân viên CRM
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form id="employee-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-bold">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            
            {/* Account Section */}
            <div className="col-span-full flex items-center gap-3">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} /> Tài khoản
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1">
              <Label>Tên đăng nhập {isEdit && <Lock size={10} className="inline ml-1" />}</Label>
              <div className="relative">
                <input
                  ref={nameRef}
                  name="username"
                  disabled={isEdit}
                  value={formData.username}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={inputCls('username', true)}
                  placeholder="VD: nguyenvan_a"
                  maxLength={50}
                />
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.username && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.username}</p>}
            </div>

            <div className="space-y-1">
              <Label>Mật khẩu</Label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={inputCls('password', true)}
                  placeholder={isEdit ? "Để trống nếu giữ nguyên" : "••••••••"}
                  maxLength={50}
                />
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.password && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.password}</p>}
            </div>

            {/* Personal Section */}
            <div className="col-span-full mt-2 flex items-center gap-3">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Cá nhân
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1">
              <Label>Họ và tên *</Label>
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={inputCls('fullName')}
                placeholder="Nguyễn Văn A"
                maxLength={100}
              />
              {errors.fullName && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <Label>Email *</Label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={inputCls('email', true)}
                  placeholder="email@example.com"
                  maxLength={100}
                />
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.email && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label>Số điện thoại</Label>
              <div className="relative">
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={inputCls('phone', true)}
                  placeholder="09xxx"
                  maxLength={15}
                />
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
              {errors.phone && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label>Giới tính</Label>
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-11">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({...formData, gender: g})}
                    className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.gender === g ? 'bg-white text-amber-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {g === 'Male' ? 'Nam' : g === 'Female' ? 'Nữ' : 'Khác'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ngày sinh</Label>
              <div className="relative">
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={inputCls('dateOfBirth', true)}
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              <div className="relative">
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={inputCls('address', true)}
                  placeholder="Số nhà, tên đường…"
                  maxLength={200}
                />
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            {/* Work Section */}
            <div className="col-span-full mt-2 flex items-center gap-3">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={12} /> Công việc
              </h3>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="space-y-1">
              <Label>Vai trò {(isManagerEditing || isSelf) && <Lock size={10} className="inline ml-1" />}</Label>
              <Listbox 
                value={formData.roleId} 
                onChange={(val) => {
                  setFormData({...formData, roleId: val});
                  setErrors(prev => ({ ...prev, roleId: '' }));
                }} 
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
                    <Listbox.Options className="absolute z-[110] mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-in fade-in zoom-in-95">
                      {filteredRoles.map(r => (
                        <Listbox.Option
                          key={r.id}
                          value={r.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-5 py-2.5 text-xs font-bold flex justify-between items-center transition-colors
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
              {errors.roleId && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.roleId}</p>}
            </div>

            <div className="space-y-1">
              <Label>Chi nhánh {(isManager || isSelf) && <Lock size={10} className="inline ml-1" />}</Label>
              <Listbox 
                value={formData.branchId} 
                onChange={(val) => {
                  setFormData({...formData, branchId: val});
                  setErrors(prev => ({ ...prev, branchId: '' }));
                }} 
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
                    <Listbox.Options className="absolute z-[110] mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-in fade-in zoom-in-95">
                      {branchesLoading ? (
                        <div className="px-5 py-3 text-[9px] font-black text-amber-500 uppercase flex items-center gap-2">
                          <Loader2 size={12} className="animate-spin" /> Đang tải…
                        </div>
                      ) : branches.map(b => (
                        <Listbox.Option
                          key={b.id}
                          value={b.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-5 py-2.5 text-xs font-bold flex justify-between items-center transition-colors
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
              {errors.branchId && <p className="text-[9px] font-bold text-red-500 uppercase ml-1 mt-1">{errors.branchId}</p>}
            </div>

            <div className="space-y-1">
              <Label>Lương (VNĐ)</Label>
              <div className="relative">
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                  className={inputCls('salary', true)}
                  placeholder="0"
                />
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ngày gia nhập</Label>
              <div className="relative">
                <input
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleInputChange}
                  className={inputCls('hireDate', true)}
                />
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>

            <div className="col-span-full space-y-1">
              <Label>Ghi chú nội bộ</Label>
              <div className="relative">
                <textarea
                  name="internalNotes"
                  rows={2}
                  value={formData.internalNotes}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-5 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all resize-none outline-none"
                  placeholder="Kinh nghiệm, lưu ý…"
                  maxLength={1000}
                />
                <StickyNote size={16} className="absolute left-4 top-4 text-gray-300" />
              </div>
            </div>

          </div>
        </form>

        {/* Footer - Optimized */}
        <div className="px-6 py-5 sm:px-10 sm:py-7 border-t border-gray-100 bg-gray-50/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="employee-form"
              disabled={isLoading}
              className="px-10 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95 flex items-center justify-center gap-2 min-w-[140px]"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-amber-500" />
              ) : (
                <Save size={16} className="text-amber-500" />
              )}
              <span>{isLoading ? 'Đang xử lý…' : isEdit ? 'Cập nhật' : 'Thêm mới'}</span>
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
