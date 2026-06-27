/**
 * OrderHistoryPage.jsx
 * Lịch sử đơn hàng của khách — mỗi đơn có thể mở rộng xem chi tiết món,
 * và mỗi món có thể bấm "Đánh giá" nếu chưa đánh giá.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Star, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerPortalApi } from '../../api/customerPortalApi';
import StarRating from '../../components/account/StarRating';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Modal viết đánh giá món ăn */
function ReviewModal({ item, onClose }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => customerPortalApi.createReview(data),
    onSuccess: () => {
      toast.success('Đánh giá đã được gửi. Cảm ơn bạn!');
      // Làm mới danh sách đơn hàng để cập nhật trạng thái đã đánh giá
      qc.invalidateQueries({ queryKey: ['my-orders'] });
      qc.invalidateQueries({ queryKey: ['my-reviews'] });
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Gửi đánh giá thất bại.';
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({
      type: 'MENU_ITEM',
      orderItemId: item.orderItemId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-[#111009] border border-[#ca8a04]/20 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-xl text-[#f5f0e8] mb-1">
          Đánh giá món
        </h3>
        <p className="text-[#6a6560] text-sm mb-5">{item.menuItemName}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[#8a8480] text-xs mb-2 block">Mức độ hài lòng</label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <div>
            <label className="text-[#8a8480] text-xs mb-2 block">Nhận xét (tuỳ chọn)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Chia sẻ trải nghiệm của bạn với món ăn này..."
              className="w-full bg-[#0a0906] border border-[#ca8a04]/15 rounded-xl px-4 py-3 text-sm text-[#f5f0e8] placeholder-[#3a3730] resize-none focus:outline-none focus:border-[#ca8a04]/50 transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#ca8a04]/15 text-[#8a8480] hover:text-[#f5f0e8] text-sm transition-colors">
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-[#ca8a04] text-[#0a0906] font-semibold text-sm hover:bg-[#b07d04] disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Một đơn hàng — có thể mở rộng xem danh sách món */
function OrderCard({ order }) {
  const [open, setOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);

  const statusColor = {
    PAID: 'text-emerald-400',
    PENDING: 'text-yellow-400',
    CANCELLED: 'text-red-400',
  }[order.billStatus] ?? 'text-[#6a6560]';

  const statusLabel = {
    PAID: 'Đã thanh toán',
    PENDING: 'Chờ thanh toán',
    CANCELLED: 'Đã huỷ',
  }[order.billStatus] ?? order.billStatus;

  return (
    <>
      <div className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-2xl overflow-hidden">
        {/* Header đơn hàng */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#ca8a04]/4 transition-colors"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#f5f0e8] text-sm font-medium">Đơn #{order.orderId}</span>
                <span className={`text-xs font-semibold ${statusColor}`}>· {statusLabel}</span>
              </div>
              <div className="text-[#4a4a46] text-xs mt-0.5">
                {fmtDate(order.createdAt)} · {order.branchName ?? 'Chi nhánh'} · Bàn {order.tableName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-[#ca8a04] font-semibold text-sm">{fmtNum(order.total)}₫</div>
              {order.pointsEarned > 0 && (
                <div className="text-[#6a6560] text-xs">+{fmtNum(order.pointsEarned)} điểm</div>
              )}
            </div>
            {open ? <ChevronUp size={16} className="text-[#6a6560]" /> : <ChevronDown size={16} className="text-[#6a6560]" />}
          </div>
        </button>

        {/* Chi tiết món ăn */}
        {open && (
          <div className="border-t border-[#ca8a04]/8 divide-y divide-[#ca8a04]/6">
            {(order.items ?? []).map((item) => (
              <div key={item.orderItemId} className="px-5 py-3.5 flex items-center gap-3">
                {item.menuItemImageUrl ? (
                  <img src={item.menuItemImageUrl} alt={item.menuItemName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1c1a17] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[#f5f0e8] text-sm truncate">{item.menuItemName}</div>
                  <div className="text-[#4a4a46] text-xs">x{item.quantity} · {fmtNum(item.unitPrice)}₫/món</div>
                </div>
                <div className="flex-shrink-0">
                  {item.reviewed ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check size={12} /> Đã đánh giá
                    </span>
                  ) : (
                    order.billStatus === 'PAID' && (
                      <button
                        onClick={() => setReviewItem(item)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#ca8a04]/30 text-[#ca8a04] hover:bg-[#ca8a04]/10 transition-colors"
                      >
                        <Star size={11} /> Đánh giá
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal đánh giá */}
      {reviewItem && <ReviewModal item={reviewItem} onClose={() => setReviewItem(null)} />}
    </>
  );
}

export default function OrderHistoryPage() {
  const [page, setPage] = useState(0);

  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => customerPortalApi.getOrderHistory(page, 10).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Lịch sử đơn hàng
        </h1>
        <p className="text-[#6a6560] text-sm">Các đơn đã đặt và thanh toán tại nhà hàng.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
        </div>
      ) : (ordersPage?.content ?? []).length === 0 ? (
        <div className="py-24 text-center text-[#4a4a46] text-sm">Bạn chưa có đơn hàng nào.</div>
      ) : (
        <>
          <div className="space-y-3">
            {(ordersPage.content ?? []).map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}
          </div>

          {/* Phân trang */}
          {(ordersPage?.totalPages ?? 0) > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              <span className="px-3 py-1.5 text-sm text-[#6a6560]">{page + 1} / {ordersPage.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(ordersPage.totalPages - 1, p + 1))}
                disabled={page >= ordersPage.totalPages - 1}
                className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
