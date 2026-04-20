import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle, Loader2, Clock, AlertTriangle, MessageSquare, ListTree, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { useKitchenStore } from '../../store/useKitchenStore';
import CancelReasonModal from '../pos/CancelReasonModal';
/**
 * Tính số phút chờ từ createdAt đến hiện tại.
 */
function useWaitTime(createdAt) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  );

  useEffect(() => {
    const calc = () =>
      setMinutes(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [createdAt]);

  return { minutes, isLate: minutes >= 15 };
}

const KitchenItemCard = ({ item, onAction, isDone, isHistory, isCancelled }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { minutes, isLate } = useWaitTime(item.createdAt);

  // Master Plan: Highlight món lâu (> 10 phút)
  const isOverdue = minutes >= 10;

  // Lấy dữ liệu Menu từ Store để tra cứu công thức/nguyên liệu
  const menuItems = useKitchenStore(s => s.menuItems);
  const expandedIds = useKitchenStore(s => s.expandedIds);
  const toggleExpand = useKitchenStore(s => s.toggleExpand);
  const cancelItem = useKitchenStore(s => s.cancelItem);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Tìm MenuItem tương ứng để lấy recipes (nguyên liệu)
  const matchedMenu = menuItems.find(m => m.name === item.menuItemName);
  const isExpanded = expandedIds.includes(item.id);
  const hasIngredients = matchedMenu?.recipes && matchedMenu.recipes.length > 0;

  const handleAction = async () => {
    if (isSubmitting || !onAction) return;
    setIsSubmitting(true);
    try {
      await onAction(item.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (e) => {
    e.stopPropagation();
    setIsCancelModalOpen(true);
  };

  const confirmCancel = async (reason) => {
    setIsCancelModalOpen(false);
    setIsSubmitting(true);
    try {
      await cancelItem(item.id, reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 p-5 rounded-3xl border transition-all duration-300 relative bg-white',
        // Ưu tiên style theo thứ tự: Hủy > Xong > Quá giờ > Mặc định
        isCancelled
          ? 'border-red-200 bg-red-50/40 opacity-80'
          : isDone
            ? 'border-emerald-100 bg-emerald-50/20'
            : isOverdue
              ? 'border-red-200 bg-red-50/30'
              : 'border-gray-100 shadow-sm hover:border-gold-500/30 hover:shadow-lg',
        isHistory && !isCancelled && 'opacity-75 grayscale-[0.3]'
      )}
    >
      {/* ── Overdue Banner ── */}
      {isOverdue && !isDone && !isHistory && (
        <div className="absolute -top-3 -right-2 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1.5 animate-bounce">
          <AlertTriangle size={10} />
          Món chậm!
        </div>
      )}

      {/* ── Table & Time ── */}
      <div className="flex items-center justify-between">
        <div className="px-2.5 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm">
          {item.tableName}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold uppercase tabular-nums",
          isOverdue ? "text-red-600" : "text-gray-400"
        )}>
          <Clock size={12} />
          {minutes} phút
        </div>
      </div>

      {/* ── Item Content ── */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black text-gray-900 leading-snug flex-1">
          {item.menuItemName}
        </h3>
        <div className="w-8 h-8 rounded-xl bg-gold-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-gold-600/20">
          {item.quantity}
        </div>
      </div>

      {/* ── Note ── */}
      {item.note && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
          <MessageSquare size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-red-700 italic leading-relaxed">
            "{item.note}"
          </p>
        </div>
      )}

      {/* ── Thành phần nguyên liệu (Ingredients) ── */}
      {/* Chỉ hiển thị nút toggle nếu món ăn có công thức (recipes) */}
      {hasIngredients && !isHistory && !isDone && (
        <div className="border-t border-gray-100 pt-2 mt-1">
          <button
            onClick={() => toggleExpand(item.id)}
            className="flex items-center justify-between w-full p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-xs font-bold text-gray-500"
          >
            <div className="flex items-center gap-1.5">
              <ListTree size={14} className="text-gold-500" />
              <span>Nguyên liệu xuất kho</span>
            </div>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {/* Danh sách nguyên liệu mở rộng */}
          {isExpanded && (
            <div className="mt-2 space-y-1.5 px-1 animate-in slide-in-from-top-2">
              {matchedMenu.recipes.map((recipe, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] border-b border-dashed border-gray-100 pb-1.5">
                  <span className="text-gray-600 font-medium">
                    • {recipe.ingredientName || 'Nguyên liệu ' + recipe.ingredientId}
                  </span>
                  <span className="text-gray-800 font-bold tabular-nums">
                    {recipe.quantity * item.quantity} {recipe.unitName || 'đơn vị'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Action ── */}
      {!isDone && !isHistory && (
        <div className="flex items-center gap-2 mt-1">
          {/* Nút Hủy Món (CANCEL) - Chỉ xuất hiện khi PENDING */}
          {item.status === 'PENDING' && (
            <button
              onClick={handleCancelClick}
              disabled={isSubmitting}
              title="Hủy món"
              className="px-3 py-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-100 shadow-sm disabled:opacity-50"
            >
              <XCircle size={18} />
            </button>
          )}

          {/* Nút Hành động Chính (Bắt đầu nấu / Hoàn tất) */}
          <button
            onClick={handleAction}
            disabled={isSubmitting}
            className={cn(
              "flex-1 py-3 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
              item.status === 'PENDING' 
                ? "bg-gold-600 text-white shadow-lg shadow-gold-600/20 hover:bg-gold-700" 
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            )}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin mx-auto" />
            ) : (
              item.status === 'PENDING' ? 'Bắt đầu nấu' : 'Hoàn tất'
            )}
          </button>
        </div>
      )}

      {/* ── Status Info (History / Cancelled) ── */}
      {isHistory && (
        <div className="flex flex-col gap-1.5 mt-1">
          {item.status === 'CANCELLED' ? (
            <div className="flex items-start gap-1.5 p-2 bg-red-50 rounded-xl">
               <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-red-600 uppercase">Đã Hủy</span>
                 <span className="text-[10px] text-red-700 italic">"{item.cancelReason}"</span>
               </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase px-1">
              <CheckCircle size={12} /> Hoàn thành
            </div>
          )}
        </div>
      )}

      {/* ── Modal Bắt buộc Nhập Lý Do Hủy ── */}
      <CancelReasonModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={confirmCancel}
        itemName={item.menuItemName}
      />
    </div>
  );
};

export default KitchenItemCard;
