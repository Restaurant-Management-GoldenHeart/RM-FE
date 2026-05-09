import React, { useState } from 'react';
import { X, Save, Layers } from 'lucide-react';
import { areaApi } from '../../api/posApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useTableStore } from '../../store/useTableStore';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

const AreaFormModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { selectedBranchId } = useBranchContext();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const authUser = useAuthStore.getState().user;
    const branchId = selectedBranchId || authUser?.branchId || authUser?.profile?.branchId || 1;

    const payload = {
      name: name.trim(),
      branchId: branchId,
      code: name.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 30),
      displayOrder: 0,
      active: true
    };
    
    setLoading(true);
    try {
      await areaApi.createArea(payload);
      toast.success(`Đã tạo khu vực "${name.trim()}"`);
      setName('');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Tạo khu vực thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">Thêm Khu Vực Mới</h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">New Dimension</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Tên khu vực</label>
              <input 
                autoFocus
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ví dụ: Tầng 2, VIP Zone..."
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-amber-300 outline-none transition-all group-hover:border-gray-200"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-2xl transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save size={14} /> {loading ? 'Đang lưu...' : 'Lưu khu vực'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AreaFormModal;
