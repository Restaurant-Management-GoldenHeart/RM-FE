import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertTriangle, Layers, Loader2 } from 'lucide-react';

export function CategoryFormModal({ onSave, onClose, saving }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Tên danh mục không được để trống');
      return;
    }
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim()
      });
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra khi lưu. Vui lòng thử lại sau.');
    }
  };

  const inputCls = (isError) => `
    w-full px-4 py-3 rounded-xl bg-white border text-gray-900 text-sm placeholder-gray-400 outline-none transition-all
    ${isError 
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/5' 
      : 'border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5'}
  `;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-zoom-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Layers className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">
                Thêm danh mục mới
              </h3>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                Tạo phân loại món ăn
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-8 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-slide-up">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed uppercase tracking-tight">{error}</p>
            </div>
          )}

          <form id="category-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Tên danh mục *</label>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ví dụ: Món khai vị, Đồ uống..."
                className={inputCls(error && !form.name.trim())}
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-800 text-[11px] font-black uppercase tracking-widest pl-1">Mô tả chi tiết</label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                rows={3}
                placeholder="Nhập mô tả cho danh mục (không bắt buộc)"
                className={inputCls(false)}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 flex items-center gap-4">
          <button
            type="submit"
            form="category-form"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-amber-900/10 active:scale-95 group"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            <span>{saving ? 'Đang lưu dữ liệu...' : 'Lưu danh mục'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-8 h-14 rounded-2xl bg-gray-50 border border-transparent hover:border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
