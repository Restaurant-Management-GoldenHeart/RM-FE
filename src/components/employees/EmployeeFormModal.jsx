import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { X, Save, Users, AlertCircle, Loader2, Check, ChevronDown, Lock, Mail, User, Phone } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * EmployeeFormModal - Form for adding/editing employees
 * Design: High Contrast (Simple White & Gold)
 * Security: Disables Role change for MANAGER during edit (403 Backend).
 */
export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  roles = [],
  isLoading
}) {
  const { role: actorRole } = useAuthStore();
  const isEdit = !!employee;
  const isManagerEditing = actorRole === 'MANAGER' && isEdit;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    employeeCode: ''
  });
  const [errors, setErrors] = useState({});
  const nameRef = useRef();

  // Scroll Lock & Focus
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  // Load Data
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setFormData({
          username: employee.username || '',
          fullName: employee.fullName || '',
          email: employee.email || '',
          phone: employee.phone || '',
          roleId: employee.roleId || '',
          employeeCode: employee.employeeCode || '',
          password: '' // Keep empty on edit
        });
      } else {
        setFormData({
          username: '',
          password: '',
          fullName: '',
          email: '',
          phone: '',
          roleId: roles.find(r => r.name === 'STAFF')?.id || roles[0]?.id || '',
          employeeCode: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, employee, roles]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!formData.fullName.trim()) e.fullName = 'Bắt buộc';
    if (!formData.username.trim()) e.username = 'Bắt buộc';
    if (!formData.email.trim()) e.email = 'Bắt buộc';
    if (!isEdit && !formData.password.trim()) e.password = 'Bắt buộc';
    if (!isEdit && formData.password.length < 8) e.password = 'Tối thiểu 8 ký tự';
    if (!isEdit && !/^(?=.*[A-Za-z])(?=.*\d).+$/.test(formData.password)) {
      e.password = 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số';
    }
    if (!formData.roleId) e.roleId = 'Chọn vai trò';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean & Normalize Payload
    const payload = {
      ...formData,
      fullName: formData.fullName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      roleId: formData.roleId ? Number(formData.roleId) : null,
      phone: formData.phone?.trim() || null,
      employeeCode: formData.employeeCode?.trim() || null
    };

    onSubmit(payload);
  };

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const inputCls = (field) => `
    w-full pl-11 pr-4 py-3 rounded-2xl border bg-white text-gray-900 text-sm font-medium
    outline-none transition-all
    ${errors[field]
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/10'
      : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}
  `;

  const selectedRole = roles.find(r => r.id === formData.roleId);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={!isLoading ? onClose : undefined} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-zoom-in">

        {/* Header */}
        <div className="flex justify-between items-center px-10 py-8 border-b bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
              <Users size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Hồ sơ nhân viên' : 'Đăng ký nhân viên mới'}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">HR Management System</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Full Name */}
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Họ và Tên *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4.5 h-4.5 group-focus-within:text-amber-500 transition-colors" />
                <input ref={nameRef} className={inputCls('fullName')} value={formData.fullName} onChange={e => handleChange('fullName', e.target.value)} placeholder="Nhập tên đầy đủ..." />
              </div>
              {errors.fullName && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.fullName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Username */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tên đăng nhập *</label>
                <input className={`${inputCls('username')} !pl-4 ${isEdit && 'bg-gray-100 italic cursor-not-allowed'}`} value={formData.username} onChange={e => handleChange('username', e.target.value)} disabled={isEdit} />
                {errors.username && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.username}</p>}
              </div>

              {/* Password (Create Only) */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mật khẩu {isEdit ? '(Đã bảo mật)' : '*'}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4.5 h-4.5" />
                  <input type="password" className={`${inputCls('password')} ${isEdit && 'bg-gray-100 cursor-not-allowed'}`} value={formData.password} onChange={e => handleChange('password', e.target.value)} disabled={isEdit} placeholder={isEdit ? "••••••••" : "Tối thiểu 8 ký tự"} />
                </div>
                {errors.password && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.password}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Email liên lạc *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4.5 h-4.5" />
                  <input className={inputCls('email')} value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="example@goldheart.com" />
                </div>
                {errors.email && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.email}</p>}
              </div>

              {/* Role Selection */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Vai trò hệ thống *</label>
                <Listbox value={formData.roleId} onChange={(val) => handleChange('roleId', val)} disabled={isManagerEditing}>
                  <div className="relative">
                    <Listbox.Button className={`${inputCls('roleId')} !pl-4 flex justify-between items-center ${isManagerEditing && 'bg-gray-100 cursor-not-allowed'}`}>
                      <span className="font-bold">{selectedRole?.name || 'Chọn vai trò'}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </Listbox.Button>
                    
                    {/* [FIXED]: Added Portal to break out of overflow hidden */}
                    <Listbox.Options className="absolute z-[9999] mt-2 w-full min-w-[250px] bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-auto border border-gray-100">
                      {roles.map(r => (
                        <Listbox.Option key={r.id} value={r.id} className={({ active }) => `px-6 py-3 cursor-pointer text-sm font-bold flex items-center justify-between ${active ? 'bg-amber-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                          {({ selected }) => (
                            <>
                              <span>{r.name}</span>
                              {selected && <Check size={16} />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
                {isManagerEditing && <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">* Quản lý không có quyền đổi Role</p>}
                {errors.roleId && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.roleId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Phone */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4.5 h-4.5" />
                  <input className={inputCls('phone')} value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="09xx xxx xxx" />
                </div>
              </div>

              {/* Employee Code */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mã nhân viên (ID)</label>
                <input className={`${inputCls('employeeCode')} !pl-4`} value={formData.employeeCode} onChange={e => handleChange('employeeCode', e.target.value)} placeholder="Ví dụ: NV001" />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-gray-50/80 border-t flex flex-row-reverse gap-4">
          <button type="submit" form="employee-form" disabled={isLoading} className="flex-1 flex items-center justify-center gap-3 h-16 rounded-[1.5rem] bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-60 shadow-2xl shadow-gray-900/10 active:scale-95 group">
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-500" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên'}
          </button>
          <button type="button" onClick={onClose} disabled={isLoading} className="flex-1 h-16 rounded-[1.5rem] bg-white border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest transition-all hover:bg-gray-50 active:scale-95">
            Hủy
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
