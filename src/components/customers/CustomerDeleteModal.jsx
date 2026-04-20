import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

/**
 * CustomerDeleteModal - Professional confirmation for deleting sensitive customer data
 */
export const CustomerDeleteModal = ({ 
  customer, 
  onConfirm, 
  onCancel, 
  deleting 
}) => {
  if (!customer) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 animate-zoom-in text-center">
        <button 
          onClick={onCancel} 
          className="absolute right-6 top-6 w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-900 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 rounded-[2rem] bg-red-50 flex items-center justify-center mx-auto mb-6 border border-red-100/50">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
          Xác nhận xóa hệ thống
        </h3>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
          Hành động này không thể hoàn tác
        </p>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-10 text-left">
          <p className="text-gray-600 text-sm leading-relaxed">
            Bạn đang yêu cầu xóa hồ sơ của 
            <strong className="text-gray-900 font-black block text-base mt-2">
              "{customer.name}"
            </strong>
          </p>
          {customer.loyaltyPoints > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
               <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
               <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                 Cảnh báo: Khách hàng có {customer.loyaltyPoints} điểm tích lũy
               </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onConfirm} 
            disabled={deleting}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {deleting ? 'Đang xử lý...' : 'Đồng ý xóa'}
          </button>
          <button 
            onClick={onCancel}
            className="h-14 rounded-2xl bg-gray-50 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 border border-transparent hover:border-gray-200"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
