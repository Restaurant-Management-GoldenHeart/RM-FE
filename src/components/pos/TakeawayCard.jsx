import React from 'react';
import { MoreVertical, User, Clock } from 'lucide-react';

export default function TakeawayCard({ order, isActive, onClick, onAction }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-400', text: 'Chờ xử lý', dot: 'bg-amber-500' };
      case 'COOKING': return { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-400', text: 'Đang nấu', dot: 'bg-blue-500' };
      case 'READY': return { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'Chờ lấy', dot: 'bg-emerald-500' };
      case 'AVAILABLE': return { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200 border-dashed', text: 'Trống', dot: 'bg-gray-300' };
      default: return { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300', text: 'Không rõ', dot: 'bg-gray-400' };
    }
  };

  const style = getStatusStyle(order.status);
  
  // Logic ưu tiên border:
  let cardClasses = "relative flex flex-col justify-between p-2.5 rounded-xl cursor-pointer transition-all aspect-[4/3] w-full overflow-hidden shadow-sm ";
  
  if (isActive) {
    // ĐANG ĐƯỢC CHỌN: Viền cam đậm nét liền, sáng bóng (glow), nền hơi ám vàng
    cardClasses += "border-2 border-solid border-amber-500 ring-4 ring-amber-500/20 bg-amber-50/40 shadow-md";
  } else if (order.status === 'AVAILABLE') {
    // TRỐNG & KHÔNG CHỌN: Viền xám đứt nét
    cardClasses += "border-2 border-dashed border-gray-300 bg-white hover:border-amber-300";
  } else {
    // CÓ ĐƠN & KHÔNG CHỌN: Viền theo status (Vàng/Xanh)
    cardClasses += `border-2 bg-white hover:shadow-md ${style.border}`;
  }

  return (
    <div onClick={onClick} className={cardClasses}>
      {/* Hàng Top: Trạng thái & Nút 3 chấm */}
      <div className="flex justify-between items-start w-full">
        <div className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold truncate max-w-[70%] ${style.bg} ${style.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}></div>
          <span className="truncate">{style.text}</span>
        </div>
        {order.status !== 'AVAILABLE' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(order);
            }} 
            className="-mt-1 -mr-1 p-1 hover:bg-gray-100 rounded-md shrink-0 text-gray-500"
          >
            <MoreVertical size={16} />
          </button>
        )}
      </div>

      {/* Center: Mã Đơn Hàng */}
      <div className="flex-1 flex items-center justify-center py-1 w-full overflow-hidden">
        <span className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight truncate px-1">
          {order.order_number}
        </span>
      </div>

      {/* Bottom: Tên Khách & Thời Gian */}
      <div className="flex justify-center items-center gap-1.5 w-full mt-auto">
        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-1 rounded text-slate-500 font-medium text-[9px] sm:text-[10px] max-w-[50%] truncate">
          <User size={10} className="shrink-0" /> 
          <span className="truncate">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-1 rounded text-slate-500 font-medium text-[9px] sm:text-[10px] shrink-0">
          <Clock size={10} className="shrink-0" /> 
          <span>{order.time}</span>
        </div>
      </div>
    </div>
  );
}
