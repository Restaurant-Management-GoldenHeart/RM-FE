import { useState, useEffect } from 'react';
import { X, Package, Calculator, ArrowRight, Save, Info } from 'lucide-react';

const fmtCurrency = (n) => n != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : '0 ₫';

export default function RestockModal({ isOpen, onClose, onSubmit, item, isLoading }) {
  const [formData, setFormData] = useState({
    addedQuantity: '',
    buyPrice: '',
    supplier: '',
    note: ''
  });

  const [preview, setPreview] = useState({
    newQuantity: 0,
    newAvgCost: 0
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        addedQuantity: '',
        buyPrice: item?.averageUnitCost || '',
        supplier: '',
        note: ''
      });
    }
  }, [isOpen, item]);

  useEffect(() => {
    const oldQty = Number(item?.quantity || 0);
    const oldAvg = Number(item?.averageUnitCost || 0);
    const addedQty = Number(formData.addedQuantity || 0);
    const buyPrice = Number(formData.buyPrice || 0);

    const newQty = oldQty + addedQty;
    const newAvg = newQty > 0 
      ? ((oldQty * oldAvg) + (addedQty * buyPrice)) / newQty
      : oldAvg;

    setPreview({
      newQuantity: newQty,
      newAvgCost: Math.round(newAvg)
    });
  }, [formData, item]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      quantity: preview.newQuantity,
      averageUnitCost: preview.newAvgCost,
      restockInfo: {
        addedQuantity: Number(formData.addedQuantity),
        buyPrice: Number(formData.buyPrice),
        supplier: formData.supplier,
        note: formData.note
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">NHẬP HÀNG</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item?.ingredientName ?? item?.itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số lượng nhập ({item?.unitSymbol})</label>
              <input 
                type="number" 
                required
                placeholder="0"
                value={formData.addedQuantity}
                onChange={e => setFormData(p => ({...p, addedQuantity: e.target.value}))}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-orange-500 outline-none transition-all font-black text-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Đơn giá nhập (VNĐ)</label>
              <input 
                type="number" 
                required
                placeholder="0"
                value={formData.buyPrice}
                onChange={e => setFormData(p => ({...p, buyPrice: e.target.value}))}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-orange-500 outline-none transition-all font-black text-lg"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nhà cung cấp</label>
              <select 
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-orange-500 outline-none transition-all font-bold text-sm"
                value={formData.supplier}
                onChange={e => setFormData(p => ({...p, supplier: e.target.value}))}
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                <option value="NCC1">Chợ đầu mối Bình Điền</option>
                <option value="NCC2">Công ty Thực phẩm Vissan</option>
                <option value="NCC3">VinMart / WinMart</option>
                <option value="OTHER">Khác...</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú</label>
              <textarea 
                rows="2"
                placeholder="Nhập ghi chú nhập hàng..."
                value={formData.note}
                onChange={e => setFormData(p => ({...p, note: e.target.value}))}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-orange-500 outline-none transition-all font-bold text-sm resize-none"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-orange-50/50 rounded-3xl p-6 border border-orange-100/50 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest">
              <Calculator size={14} /> Dự kiến sau khi nhập
            </div>
            <div className="grid grid-cols-2 gap-8 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-200">
                <ArrowRight size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Số lượng mới</p>
                <p className="text-xl font-black text-gray-900">{preview.newQuantity} <span className="text-xs">{item?.unitSymbol}</span></p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Giá vốn mới (AVG)</p>
                <p className="text-xl font-black text-orange-600">{fmtCurrency(preview.newAvgCost)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button 
              type="submit" 
              disabled={isLoading || !formData.addedQuantity}
              className="flex-1 h-16 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Save size={20} /> {isLoading ? 'Đang lưu...' : 'Xác nhận nhập hàng'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-8 h-16 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
