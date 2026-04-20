import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

/**
 * DeleteConfirmModal - Confirmation for safe deletion
 */
export function DeleteConfirmModal({ item, onConfirm, onCancel, deleting }) {
  if (!item) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel} 
      />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 animate-zoom-in">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-gray-900 font-extrabold text-lg">Xác nhận xóa</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-0.5">Hành động không thể hoàn tác</p>
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Bạn có chắc muốn xóa món <strong className="text-gray-900 font-bold">"{item.name}"</strong>? 
          Hệ thống sẽ gỡ món này khỏi thực đơn và tất cả chi nhánh.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={onConfirm} 
            disabled={deleting}
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
          <button 
            onClick={onCancel}
            className="h-12 rounded-xl bg-gray-50 text-gray-500 font-bold text-sm hover:bg-gray-100 transition-all active:scale-95"
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
