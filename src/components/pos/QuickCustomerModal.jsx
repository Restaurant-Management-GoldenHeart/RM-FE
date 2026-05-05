import React, { useState } from 'react';
import { X, UserPlus, Phone, User, Loader2 } from 'lucide-react';
import { customerApi } from '../../api/customerApi';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

/**
 * QuickCustomerModal — Modal tạo nhanh khách hàng tại POS.
 * Chỉ yêu cầu các thông tin tối thiểu: Tên và Số điện thoại.
 *
 * @param {boolean} isOpen - Trạng thái đóng/mở
 * @param {function} onClose - Hàm đóng modal
 * @param {function} onSuccess - Callback khi tạo thành công (trả về customer object)
 */
const QuickCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Vui lòng nhập đầy đủ Tên và Số điện thoại!');
      return;
    }

    setLoading(true);
    try {
      // Gọi API tạo nhanh: POST /api/v1/customers/quick-create
      const response = await customerApi.quickCreateCustomer(formData);
      
      toast.success('🎉 Đã tạo khách hàng mới thành công!');
      onSuccess?.(response.data);
      onClose();
      setFormData({ name: '', phone: '' }); // Reset form
    } catch (err) {
      console.error('[QuickCustomerModal] Error:', err);
      toast.error(err?.message || 'Không thể tạo khách hàng. Có thể SĐT đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop — Làm mờ nền để tập trung vào modal */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">Tạo nhanh khách</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Thêm mới thành viên tại POS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Trường Tên */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên khách hàng</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên khách hàng..."
                  className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-11 pr-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 transition-all"
                />
              </div>
            </div>

            {/* Trường Số điện thoại */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="09xx xxx xxx"
                  className="w-full bg-gray-50 border border-gray-100 py-3.5 pl-11 pr-4 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-emerald-300 transition-all"
                />
              </div>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:bg-gray-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg",
                  loading 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95"
                )}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {loading ? 'Đang tạo...' : 'Xác nhận tạo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickCustomerModal;
