import React from 'react';
import { AlertCircle, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * ConfirmModal — Modal xác nhận dùng chung cho toàn ứng dụng.
 * @param {boolean} isOpen 
 * @param {string} title - Tiêu đề (VD: Xoá bàn)
 * @param {string} message - Nội dung câu hỏi
 * @param {Function} onConfirm - Callback khi nhấn bộ xác nhận
 * @param {Function} onClose - Callback khi đóng/hủy
 * @param {'danger' | 'warning' | 'info'} type - Kiểu modal để đổi màu sắc
 */
const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onClose, 
  type = 'danger',
  confirmText = 'Xác nhận',
  cancelText = 'Quay lại' 
}) => {
  if (!isOpen) return null;

  const config = {
    danger:  { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', btn: 'bg-red-500 hover:bg-red-600 shadow-red-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' },
    info:    { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' },
  }[type];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute right-6 top-6 w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl", config.bg, config.color)}>
            <Icon size={40} />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2 uppercase">{title}</h2>
          <p className="text-sm font-bold text-gray-400 leading-relaxed px-2">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-10">
          <button 
            onClick={onClose}
            className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2",
              config.btn
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
