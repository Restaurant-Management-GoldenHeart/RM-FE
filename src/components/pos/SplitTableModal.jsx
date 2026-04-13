import React, { useState, useMemo } from 'react';
import { X, ArrowRightLeft, Minus, Plus, Check } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { orderApi } from '../../api/posApi';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

/**
 * SplitTableModal — Nghiệp vụ tách món từ đơn hiện tại sang bàn khác.
 */
const SplitTableModal = ({ isOpen, onClose, fromTable }) => {
  const tables = useTableStore(s => s.tables);
  const splitTable = useTableStore(s => s.splitTable);
  const order = useOrderStore(s => fromTable?.currentOrderId ? s.orders[fromTable.currentOrderId] : null);

  const [toTableId, setToTableId] = useState('');
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: quantity }
  const [isProcessing, setIsProcessing] = useState(false);

  // Lọc danh sách món hợp lệ để tách (chưa thanh toán, không bị huỷ)
  const items = useMemo(() => {
    if (!order) return [];
    return order.items.filter(i => i.status !== 'CANCELLED');
  }, [order]);

  const handleToggleItem = (itemId, maxQty) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[itemId]) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = maxQty;
      }
      return newItems;
    });
  };

  const updateQty = (itemId, delta, maxQty) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleSplit = async () => {
    if (!toTableId) return toast.error('Vui lòng chọn bàn đích');
    const transferPayload = Object.entries(selectedItems).map(([itemId, quantity]) => ({ itemId, quantity }));
    if (transferPayload.length === 0) return toast.error('Vui lòng chọn ít nhất 1 món');

    setIsProcessing(true);
    const success = await splitTable(order.id, Number(toTableId), transferPayload);
    setIsProcessing(false);
    if (success) onClose();
  };

  if (!isOpen || !fromTable || !order) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 h-[600px]">
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <ArrowRightLeft className="text-gold-600" /> Tách bàn & Chuyển món
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Từ Bàn {fromTable.tableNumber} (Đơn #{order.id})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Items Selection */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4 border-r border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Chọn món cần chuyển</h3>
            {items.map(item => {
              const isSelected = !!selectedItems[item.id];
              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "p-4 rounded-3xl border-2 transition-all cursor-pointer",
                    isSelected ? "border-gold-500 bg-gold-50/30 shadow-lg shadow-gold-600/5" : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                  )}
                  onClick={() => handleToggleItem(item.id, item.quantity)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "bg-gold-600 border-gold-600" : "border-gray-200")}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Số lượng có sẵn: {item.quantity}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gold-100" onClick={e => e.stopPropagation()}>
                        <button onClick={() => updateQty(item.id, -1, item.quantity)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold-600"><Minus size={14}/></button>
                        <span className="text-sm font-black w-6 text-center">{selectedItems[item.id]}</span>
                        <button onClick={() => updateQty(item.id, 1, item.quantity)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold-600"><Plus size={14}/></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Target Table Selection */}
          <div className="w-[280px] p-8 flex flex-col bg-gray-50/30">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Chuyển sang bàn</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
              {tables.filter(t => t.id !== fromTable.id).map(t => (
                <button
                  key={t.id}
                  onClick={() => setToTableId(t.id)}
                  className={cn(
                    "w-full p-4 rounded-3xl border-2 text-left transition-all",
                    toTableId === t.id ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm uppercase">Bàn {t.tableNumber}</span>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded", t.status === 'OCCUPIED' ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500")}>
                      {t.status === 'OCCUPIED' ? 'Đã bận (Gộp)' : 'Trống (Tách mới)'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-8">
              <button
                onClick={handleSplit}
                disabled={isProcessing || !toTableId || Object.keys(selectedItems).length === 0}
                className="w-full py-4 bg-gold-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-gold-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <ArrowRightLeft size={18} />}
                Xác nhận Tách
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitTableModal;
