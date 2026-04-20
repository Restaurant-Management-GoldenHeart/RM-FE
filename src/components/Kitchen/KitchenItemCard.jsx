/**
 * KitchenItemCard.jsx — Thẻ hiển thị một món ăn trên màn hình KDS (Kitchen Display System)
 *
 * PRODUCTION UPGRADE (Stock Check Integration):
 *   - Đọc state cookingIds và insufficientStockIds từ useKitchenStore
 *   - Nút "Bắt đầu nấu": Disable đúng nút của món ĐANG xử lý (per-item loading)
 *   - Badge "Thiếu nguyên liệu": Hiển thị nếu BE trả về lỗi 409 cho món này
 *   - Nút "Nấu lại": Xuất hiện khi có lỗi 409, gọi retryStartCooking để reset và thử lại
 *   - Animation shake khi chuyển sang trạng thái lỗi nguyên liệu
 */
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import {
  CheckCircle, Loader2, Clock, AlertTriangle, MessageSquare,
  ListTree, ChevronDown, ChevronUp, XCircle, PackageX, RefreshCw,
} from 'lucide-react';
import { useKitchenStore } from '../../store/useKitchenStore';
import CancelReasonModal from '../pos/CancelReasonModal';

/**
 * useWaitTime — Hook tính thời gian chờ của món ăn.
 * Cập nhật mỗi phút để vẽ lại bộ đếm thời gian trên thẻ KDS.
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
  const { minutes } = useWaitTime(item.createdAt);

  // Highlight món quá 10 phút chờ
  const isOverdue = minutes >= 10;

  // ── State từ KitchenStore ──────────────────────────────────────────────────

  // cookingIds: Set chứa các orderItemId đang trong quá trình gọi API "Bắt đầu nấu".
  // Tại sao dùng Set thay vì isSubmitting local?
  //   → Vì có thể có nhiều món cùng lúc, cần track từng món độc lập.
  //   → Nếu dùng local state, khi gọi lại từ store (retry), state local bị reset → sai.
  const cookingIds = useKitchenStore(s => s.cookingIds);

  // insufficientStockIds: Map<orderItemId, string> — lưu lỗi 409 từ BE.
  // Dùng để hiển thị Badge đỏ "Thiếu nguyên liệu" và nút "Nấu lại".
  const insufficientStockIds = useKitchenStore(s => s.insufficientStockIds);

  const menuItems       = useKitchenStore(s => s.menuItems);
  const expandedIds     = useKitchenStore(s => s.expandedIds);
  const toggleExpand    = useKitchenStore(s => s.toggleExpand);
  const cancelItem      = useKitchenStore(s => s.cancelItem);
  const retryStartCooking = useKitchenStore(s => s.retryStartCooking);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Kiểm tra trạng thái load của từng nút theo item ID
  const isCooking = cookingIds.has(item.id);

  // Thông tin thiếu nguyên liệu (chỉ có khi BE trả 409)
  const stockErrorMessage = insufficientStockIds.get(item.id) ?? null;
  const hasStockError = stockErrorMessage !== null;

  // Tìm MenuItem tương ứng để lấy recipes (nguyên liệu)
  const matchedMenu = menuItems.find(m => m.name === item.menuItemName);
  const isExpanded = expandedIds.includes(item.id);
  const hasIngredients = matchedMenu?.recipes && matchedMenu.recipes.length > 0;

  // handleCancelClick — Mở modal nhập lý do hủy
  const handleCancelClick = (e) => {
    e.stopPropagation();
    setIsCancelModalOpen(true);
  };

  // confirmCancel — Xác nhận hủy món với lý do
  const [isCancelling, setIsCancelling] = useState(false);
  const confirmCancel = async (reason) => {
    setIsCancelModalOpen(false);
    setIsCancelling(true);
    try {
      await cancelItem(item.id, reason);
    } finally {
      setIsCancelling(false);
    }
  };

  // handleAction — Gọi action từ parent (startCooking hoặc complete)
  // Với cột PENDING: onAction = startCookingItem (quản lý loading qua cookingIds trong store)
  // Với cột PROCESSING: onAction = completeOrderItem (loading qua local state cũng ok)
  const [isCompletingLocal, setIsCompletingLocal] = useState(false);
  const handleAction = async () => {
    // Nếu đang xử lý (theo store) hoặc không có action → bỏ qua
    if (isCooking || isCompletingLocal || !onAction) return;

    // Nếu đang ở PROCESSING → dùng local loading state (completeOrderItem)
    if (item.status === 'PROCESSING') {
      setIsCompletingLocal(true);
      try {
        await onAction(item.id);
      } finally {
        setIsCompletingLocal(false);
      }
    } else {
      // Nếu đang ở PENDING → startCookingItem quản lý loading qua cookingIds
      await onAction(item.id);
    }
  };

  // handleRetry — Thử lại sau khi bị lỗi 409 (thiếu nguyên liệu)
  const handleRetry = async () => {
    if (isCooking) return;
    await retryStartCooking(item.id);
  };

  // Tổng hợp trạng thái loading cho nút chính
  const isActionLoading = isCooking || isCompletingLocal;

  return (
    <div
      className={cn(
        // Thêm animation shake khi có lỗi nguyên liệu để thu hút sự chú ý của bếp
        'group flex flex-col gap-3 p-5 rounded-3xl border transition-all duration-300 relative bg-white',
        // Ưu tiên style: Lỗi kho > Hủy > Xong > Quá giờ > Mặc định
        hasStockError
          ? 'border-red-400 bg-red-50/50 ring-2 ring-red-200 animate-pulse-slow'
          : isCancelled
            ? 'border-red-200 bg-red-50/40 opacity-80'
            : isDone
              ? 'border-emerald-100 bg-emerald-50/20'
              : isOverdue
                ? 'border-red-200 bg-red-50/30'
                : 'border-gray-100 shadow-sm hover:border-gold-500/30 hover:shadow-lg',
        isHistory && !isCancelled && 'opacity-75 grayscale-[0.3]'
      )}
    >
      {/* ── Badge Thiếu Nguyên Liệu (lỗi 409 từ BE) ── */}
      {/*
        Tại sao badge nằm ở góc trên thay vì bên dưới nội dung?
        → Bếp cần nhận ra ngay khi nhìn ngang qua màn hình.
        → Vị trí góc trên nổi bật hơn, tương tự badge "Món chậm!" đã có.
      */}
      {hasStockError && !isDone && !isHistory && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap z-10">
          <PackageX size={10} />
          Thiếu nguyên liệu!
        </div>
      )}

      {/* ── Badge Overdue (Món chậm) ── */}
      {isOverdue && !isDone && !isHistory && !hasStockError && (
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
        <h3 className={cn(
          "text-sm font-black leading-snug flex-1",
          hasStockError ? "text-red-800" : "text-gray-900"
        )}>
          {item.menuItemName}
        </h3>
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shadow-lg",
          hasStockError
            ? "bg-red-500 text-white shadow-red-500/20"
            : "bg-gold-600 text-white shadow-gold-600/20"
        )}>
          {item.quantity}
        </div>
      </div>

      {/* ── Chi tiết lỗi thiếu nguyên liệu ── */}
      {/*
        Hiển thị message lỗi chi tiết từ BE (đã được parseKitchen409Message làm sạch).
        Mục đích: Đầu bếp biết CHÍNH XÁC thiếu gì, không cần đoán hay hỏi lại.
      */}
      {hasStockError && !isDone && !isHistory && (
        <div className="flex items-start gap-2 p-3 bg-red-100 rounded-xl border border-red-200">
          <PackageX size={14} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-red-700 uppercase mb-0.5">Chi tiết lỗi kho:</p>
            <p className="text-[11px] font-bold text-red-600 leading-snug">{stockErrorMessage}</p>
          </div>
        </div>
      )}

      {/* ── Note ── */}
      {item.note && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
          <MessageSquare size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-red-700 italic leading-relaxed">
            "{item.note}"
          </p>
        </div>
      )}

      {/* ── Nguyên liệu xuất kho (Toggle) ── */}
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

      {/* ── Action Buttons ── */}
      {!isDone && !isHistory && (
        <div className="flex items-center gap-2 mt-1">
          {/* Nút Hủy Món (chỉ hiện khi PENDING) */}
          {item.status === 'PENDING' && (
            <button
              onClick={handleCancelClick}
              disabled={isActionLoading || isCancelling}
              title="Hủy món"
              className="px-3 py-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-100 shadow-sm disabled:opacity-50"
            >
              <XCircle size={18} />
            </button>
          )}

          {/*
            Nút Hành động Chính:
            - Khi có lỗi 409 (hasStockError): Hiển thị nút "Nấu lại" màu cam để phân biệt
            - Khi không có lỗi: Nút bình thường "Bắt đầu nấu" / "Hoàn tất"

            Tại sao có nút "Nấu lại" riêng?
            → Để bếp biết đây là action retry, không phải lần đầu.
            → Khi nhấn "Nấu lại" sẽ gọi retryStartCooking (clear lỗi cũ trước).
          */}
          {hasStockError && item.status === 'PENDING' ? (
            // Nút RETRY sau khi bị lỗi 409
            <button
              onClick={handleRetry}
              disabled={isCooking}
              className={cn(
                "flex-1 py-3 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                "bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600",
                isCooking && "opacity-50 cursor-not-allowed"
              )}
            >
              {isCooking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <RefreshCw size={14} />
                  Nấu lại
                </>
              )}
            </button>
          ) : (
            // Nút ACTION bình thường
            <button
              onClick={handleAction}
              disabled={isActionLoading}
              className={cn(
                "flex-1 py-3 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                item.status === 'PENDING'
                  ? "bg-gold-600 text-white shadow-lg shadow-gold-600/20 hover:bg-gold-700"
                  : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700",
                isActionLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isActionLoading ? (
                <Loader2 size={16} className="animate-spin mx-auto" />
              ) : (
                item.status === 'PENDING' ? 'Bắt đầu nấu' : 'Hoàn tất'
              )}
            </button>
          )}
        </div>
      )}

      {/* ── History / Cancelled Info ── */}
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

      {/* ── Modal Nhập Lý Do Hủy ── */}
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
