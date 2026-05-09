import React, { useState, useEffect } from 'react';
import { X, User, CheckCircle2 } from 'lucide-react';

const CustomerNameModal = ({ isOpen, slot, onClose, onConfirm }) => {
  const [name, setName] = useState('Khách lẻ');

  useEffect(() => {
    if (isOpen) setName('Khách lẻ');
  }, [isOpen]);

  if (!isOpen || !slot) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(name.trim() || 'Khách lẻ');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mở ô {slot.order_number}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Vui lòng nhập tên khách hàng</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] ml-1">Tên khách hàng</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors">
                <User size={18} />
              </div>
              <input 
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Anh Tuấn, Chị Mai..."
                className="w-full bg-gray-50 border border-gray-100 py-5 pl-14 pr-6 rounded-3xl text-sm font-bold text-gray-900 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              className="py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Xác nhận mở
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerNameModal;
