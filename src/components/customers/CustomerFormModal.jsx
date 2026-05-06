import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, User as UserIcon, 
  AlertTriangle, Phone, Mail, 
  MapPin, Calendar, Info, Loader2 
} from 'lucide-react';

/**
 * CustomerFormModal - Tối ưu hóa kích thước, validation thực tế và hỗ trợ di động
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
  const [touched, setTouched] = useState({});

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

  // Validation logic
  const validateField = (name, value) => {
    let error = '';
    if (name === 'name' && !value.trim()) {
      error = 'Tên không được để trống';
    } else if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = 'Email không hợp lệ';
    } else if (name === 'phone' && value && !/^[0-9+\-() ]{8,20}$/.test(value)) {
      error = 'SĐT phải từ 8-20 chữ số';
    }
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Validate ngay khi nhập nếu field đã được chạm vào
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
    
    // Mark all as touched and validate
    const newErrors = {};
    const newTouched = {};
    Object.keys(form).forEach(key => {
      newTouched[key] = true;
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });
    
    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        customerCode: form.customerCode.trim() || null,
        address: form.address.trim() || null,
        note: form.note.trim() || null,
      });
    } catch (err) {
      console.error('Lỗi khi lưu khách hàng:', err);
      setErrors(prev => ({ ...prev, submit: err.message || 'Không thể lưu dữ liệu. Vui lòng thử lại.' }));
    }
  };

  const inputCls = (field) => `
    w-full px-4 py-2.5 rounded-xl bg-white border text-gray-900 text-sm placeholder-gray-400 outline-none transition-all
    ${errors[field] 
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/5' 
      : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 group-hover:border-gray-300'}
  `;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-zoom-in">
        
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100 bg-gray-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Cập nhật hồ sơ' : 'Thêm khách hàng'}
              </h3>
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">
                Quản lý thành viên CRM
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white text-gray-400 hover:text-gray-900 transition-all active:scale-95 shadow-sm border border-transparent hover:border-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - More compact padding */}
        <div className="overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-shake">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="font-bold">{errors.submit}</p>
            </div>
          )}

          <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* Full Name */}
                <div className="space-y-1.5 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Họ và tên *</label>
                    <input 
                        name="name"
                        className={inputCls('name')} 
                        value={form.name}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Nguyễn Văn A" 
                        maxLength={50}
                    />
                    {errors.name && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1.5 pl-1"><AlertTriangle size={10}/> {errors.name}</p>}
                </div>

                {/* Customer Code */}
                <div className="space-y-1.5 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Mã khách hàng</label>
                    <input 
                        name="customerCode"
                        className={inputCls('customerCode')} 
                        value={form.customerCode}
                        onChange={handleInputChange}
                        placeholder="CUS-XXXX" 
                        maxLength={20}
                    />
                </div>

                {/* Email */}
                <div className="space-y-1.5 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            name="email"
                            className={`${inputCls('email')} pl-11`} 
                            type="email"
                            value={form.email} 
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="mail@example.com" 
                            maxLength={100}
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-1.5 group">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Số điện thoại</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            name="phone"
                            className={`${inputCls('phone')} pl-11 font-bold`} 
                            value={form.phone} 
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            placeholder="09xxx" 
                            maxLength={15}
                        />
                    </div>
                    {errors.phone && <p className="text-red-500 text-[10px] font-bold pl-1">{errors.phone}</p>}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Giới tính</label>
                    <select 
                        name="gender"
                        className={inputCls('gender')} 
                        value={form.gender} 
                        onChange={handleInputChange}
                    >
                        <option value="">Chọn...</option>
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                    </select>
                </div>

                {/* DOB */}
                <div className="space-y-1.5">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Ngày sinh</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        <input 
                            name="dateOfBirth"
                            className={`${inputCls('dateOfBirth')} pl-11`} 
                            type="date"
                            value={form.dateOfBirth} 
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Địa chỉ</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            name="address"
                            className={`${inputCls('address')} pl-11`} 
                            value={form.address} 
                            onChange={handleInputChange}
                            placeholder="Số nhà, tên đường..." 
                            maxLength={200}
                        />
                    </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-1">Ghi chú</label>
                    <div className="relative">
                        <Info className="absolute left-4 top-3 w-4 h-4 text-gray-300" />
                        <textarea 
                            name="note"
                            className={`${inputCls('note')} pl-11 min-h-[80px] resize-none pt-2.5`} 
                            value={form.note} 
                            onChange={handleInputChange}
                            placeholder="Sở thích, đặc điểm..." 
                            maxLength={500}
                        />
                    </div>
                </div>
            </div>
          </form>
        </div>

        {/* Footer - Compact */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
            <button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="flex-[2] flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest transition-all disabled:opacity-60 shadow-xl shadow-gray-900/10 active:scale-[0.98] group"
            >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-500" />
                )}
                <span>{saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm mới'}</span>
            </button>
            <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]"
            >
                Hủy
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
