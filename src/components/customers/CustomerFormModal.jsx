import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, User as UserIcon, 
  AlertTriangle, Phone, Mail, 
  MapPin, Calendar, Info, Loader2 
} from 'lucide-react';

/**
 * CustomerFormModal - High contrast modal for adding/editing customers
 */
export const CustomerFormModal = ({ 
  customer, 
  onSave, 
  onClose, 
  saving 
}) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    customerCode: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    note: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        customerCode: customer.customerCode || '',
        address: customer.address || '',
        dateOfBirth: customer.dateOfBirth || '',
        gender: customer.gender || '',
        note: customer.note || '',
      });
    }
  }, [customer]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tên khách hàng không được để trống';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ';
    if (form.phone && !/^[0-9+\-() ]{8,20}$/.test(form.phone)) e.phone = 'SĐT không hợp lệ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      customerCode: form.customerCode.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    });
  };

  const inputCls = (field) => `
    w-full px-4 py-3 rounded-2xl bg-white border text-gray-900 text-sm placeholder-gray-400 outline-none transition-all
    ${errors[field] 
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/5' 
      : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 group-hover:border-gray-300'}
  `;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Cập nhật thông tin' : 'Đăng ký khách hàng'}
              </h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">
                Quản lý hồ sơ khách hàng CRM
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm border border-transparent hover:border-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-10 custom-scrollbar">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* Full Name */}
                <div className="space-y-2 md:col-span-1 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Họ và tên *</label>
                    <input 
                        className={inputCls('name')} 
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})} 
                        placeholder="Ví dụ: Nguyễn Văn A..." 
                    />
                    {errors.name && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1.5 pl-1"><AlertTriangle size={12}/> {errors.name}</p>}
                </div>

                {/* Customer Code */}
                <div className="space-y-2 md:col-span-1 border-l border-gray-50 md:pl-8">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Mã khách hàng</label>
                    <input 
                        className={inputCls('customerCode')} 
                        value={form.customerCode}
                        onChange={(e) => setForm({...form, customerCode: e.target.value})} 
                        placeholder="CUS-123456" 
                    />
                </div>

                <div className="col-span-full h-px bg-gray-100/50 my-2" />

                {/* Email */}
                <div className="space-y-2 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Email liên hệ</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            className={`${inputCls('email')} pl-11`} 
                            type="email"
                            value={form.email} 
                            onChange={(e) => setForm({...form, email: e.target.value})} 
                            placeholder="example@mail.com" 
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2 group border-l border-gray-50 md:pl-8">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Số điện thoại</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            className={`${inputCls('phone')} pl-11 font-bold tracking-wider`} 
                            value={form.phone} 
                            onChange={(e) => setForm({...form, phone: e.target.value})} 
                            placeholder="09xx xxx xxx" 
                        />
                    </div>
                </div>

                {/* Gender & DOB */}
                <div className="space-y-2">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Giới tính</label>
                    <select className={inputCls('gender')} value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}>
                        <option value="">Chọn giới tính...</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                    </select>
                </div>

                <div className="space-y-2 border-l border-gray-50 md:pl-8">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Ngày sinh</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        <input 
                            className={`${inputCls('dateOfBirth')} pl-11`} 
                            type="date"
                            value={form.dateOfBirth} 
                            onChange={(e) => setForm({...form, dateOfBirth: e.target.value})} 
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Địa chỉ thường trú</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            className={`${inputCls('address')} pl-11`} 
                            value={form.address} 
                            onChange={(e) => setForm({...form, address: e.target.value})} 
                            placeholder="Số nhà, tên đường, quận/huyện..." 
                        />
                    </div>
                </div>

                {/* Note */}
                <div className="space-y-2 md:col-span-2">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Ghi chú & Phân loại</label>
                    <div className="relative">
                        <Info className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                        <textarea 
                            className={`${inputCls('note')} pl-11 min-h-[100px] resize-none pt-3`} 
                            value={form.note} 
                            onChange={(e) => setForm({...form, note: e.target.value})} 
                            placeholder="Đặc điểm nhận dạng, sở thích, phân hạng khách hàng..." 
                        />
                    </div>
                </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-100 flex items-center gap-5">
            <button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-3 h-16 rounded-[1.5rem] bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-60 shadow-2xl shadow-gray-900/10 active:scale-[0.98] group"
            >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-500" />
                )}
                <span>{saving ? 'Đang lưu dữ liệu...' : isEdit ? 'Cập nhật hồ sơ' : 'Đăng ký thành viên'}</span>
            </button>
            <button
                type="button"
                onClick={onClose}
                className="px-10 h-16 rounded-[1.5rem] bg-white border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]"
            >
                Hủy bỏ
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
