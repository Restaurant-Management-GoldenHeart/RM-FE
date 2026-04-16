import React, { useState } from 'react';
import { X, ChefHat, CheckCircle2, ShoppingBag, Trash2, Loader2, Clock, User } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import ConfirmModal from '../ConfirmModal';
import toast from 'react-hot-toast';

const TakeawayActionModal = ({ order, onClose, onSelect }) => {
  const { closeTable, updateTakeawayStatus, setCurrentOrderTarget } = useTableStore();
  const [loading, setLoading] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  if (!order) return null;

  const status = order.status || 'PENDING';

  const handleUpdateStatus = async (newStatus) => {
    setLoading(true);
    try {
      await updateTakeawayStatus(order.id, newStatus);
      toast.success(`Đã cập nhật trạng thái đơn: ${newStatus}`);
      onClose();
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    setIsCancelConfirmOpen(true);
  };

  const handleConfirmCancel = async () => {
    await closeTable(order.id);
    onClose();
  };

  const handleGoToOrder = () => {
    // Luồng nghiệp vụ mới: Thiết lập làm Mục tiêu đơn hàng hiện tại
    setCurrentOrderTarget({
      type: 'TAKEAWAY',
      id: order.id,
      name: `Mang về - ${order.customer_name}`
    });
    
    // Đồng bộ Cart Panel (nếu cần load từ Backend)
    onSelect({ 
      table: { id: order.id, tableNumber: 'Mang về', customerName: order.customer_name }, 
      orderId: order.orderId 
    });
    
    onClose();
    toast.success(`Đã chọn đơn: ${order.order_number}`);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Đơn {order.order_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.customer_name}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Actions */}
        <div className="space-y-3">
          {/* Nút hành động chính: Đi tới Order (Chọn món) */}
          <button 
            onClick={handleGoToOrder}
            className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
          >
            <ShoppingBag size={18} /> Đi tới Order / Chọn món
          </button>

          {status === 'PENDING' && (
            <button 
              onClick={() => handleUpdateStatus('COOKING')}
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />} Xác nhận & Nấu
            </button>
          )}

          {status === 'COOKING' && (
            <button 
              onClick={() => handleUpdateStatus('READY')}
              disabled={loading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Xong & Chờ lấy
            </button>
          )}

          {/* Thanh toán & Giao: Kết thúc chu kỳ của Takeaway */}
          <button 
            onClick={() => closeTable(order.id)}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg"
          >
            <CheckCircle2 size={18} /> Thanh toán & Giao
          </button>

          {/* Nút Hủy Đơn */}
          <button 
            onClick={handleCancelClick}
            className="w-full py-4 mt-6 bg-white border border-red-100 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-50 transition-all"
          >
            <Trash2 size={18} /> Hủy đơn mang về
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
           <div className="flex items-center gap-1.5">
             <Clock size={12} />
             {order.time}
           </div>
           <div className="flex items-center gap-1.5">
             <User size={12} />
             {order.customer_name}
           </div>
        </div>
      </div>
      <ConfirmModal 
        isOpen={isCancelConfirmOpen}
        title="Hủy đơn mang về"
        message={`Bạn có chắc chắn muốn hủy đơn ${order.order_number} của khách ${order.customer_name} không?`}
        onConfirm={handleConfirmCancel}
        onClose={() => setIsCancelConfirmOpen(false)}
        type="danger"
        confirmText="Hủy đơn ngay"
      />
    </div>
  );
};

export default TakeawayActionModal;
