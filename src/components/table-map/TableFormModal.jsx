import React, { useState, useEffect } from 'react';
import { X, Save, ClipboardList, Users } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';

const TableFormModal = ({ isOpen, onClose, initialData = null, onSuccess }) => {
  const { addTable, updateTable, areas } = useTableStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: 4,
    area_id: areas[1]?.id || 1
  });

  useEffect(() => {
    if (initialData && initialData.id) {
      setFormData({
        tableNumber: initialData.tableNumber || initialData.table_number || '',
        capacity: initialData.capacity || 4,
        area_id: initialData.area_id || initialData.areaId || areas[1]?.id || 1
      });
    } else {
      setFormData({
        tableNumber: '',
        capacity: 4,
        area_id: initialData?.area_id || areas[1]?.id || 1
      });
    }
  }, [initialData, isOpen, areas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tableNumber) return;
    
    setLoading(true);
    let success = false;
    
    if (initialData && initialData.id) {
      success = await updateTable(initialData.id, formData);
    } else {
      const tables = useTableStore.getState().tables;
      const GAP = 20; const TABLE_W = 160; const TABLE_H = 120;
      // Giả thiết container rộng min 1200
      const cols = Math.floor(1200 / (TABLE_W + GAP)); 
      const new_x = (tables.length % cols) * (TABLE_W + GAP) + GAP;
      const new_y = Math.floor(tables.length / cols) * (TABLE_H + GAP) + GAP;

      const payload = { 
        ...formData, 
        pos_x: new_x, 
        pos_y: new_y, 
        width: TABLE_W, 
        height: TABLE_H 
      };
      success = await addTable(payload);
    }
    
    if (success) {
      if (onSuccess) onSuccess(formData.area_id);
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center text-gold-600">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">
                  {initialData && initialData.id ? 'Sửa thông tin bàn' : 'Thêm bàn mới'}
                </h2>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Config Mode</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Tên/Số hiệu bàn</label>
              <div className="relative group">
                <input 
                  autoFocus
                  required
                  value={formData.tableNumber}
                  onChange={e => setFormData({ ...formData, tableNumber: e.target.value })}
                  placeholder="Ví dụ: B09, VIP 3..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-gold-300 outline-none transition-all group-hover:border-gray-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Khu vực</label>
              <div className="relative group">
                <select 
                  value={formData.area_id}
                  onChange={e => setFormData({ ...formData, area_id: Number(e.target.value) })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-gold-300 outline-none transition-all group-hover:border-gray-200 appearance-none"
                >
                  {areas.filter(a => a.id !== 'ALL').map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Sức chứa (Người)</label>
              <div className="relative group flex items-center">
                <div className="absolute left-5 text-gray-400">
                   <Users size={16} />
                </div>
                <input 
                  type="number"
                  min="1"
                  required
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:bg-white focus:border-gold-300 outline-none transition-all group-hover:border-gray-200"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 pb-8">
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
                className="flex-1 py-4 bg-gold-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20 disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? 'Đang lưu...' : <><Save size={14} /> Lưu thay đổi</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TableFormModal;
