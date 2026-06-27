/**
 * ReviewsPage.jsx
 * Trang "Đánh giá của tôi" — liệt kê các đánh giá khách đã gửi,
 * phân trang, hiển thị trạng thái (visible / hidden).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { customerPortalApi } from '../../api/customerPortalApi';
import StarRating from '../../components/account/StarRating';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { dateStyle: 'long' }) : '—';

/** Một thẻ đánh giá */
function ReviewCard({ review }) {
  const isVisible = review.status === 'VISIBLE';
  return (
    <div className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[#f5f0e8] text-sm font-semibold mb-0.5">
            {review.type === 'MENU_ITEM' ? review.menuItemName : review.branchName ?? 'Chi nhánh'}
          </div>
          <div className="text-[#4a4a46] text-xs">
            {review.type === 'MENU_ITEM' ? 'Món ăn' : 'Nhà hàng'} · {fmtDate(review.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isVisible
            ? <span className="flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-400/20 rounded-full px-2 py-0.5"><Eye size={10} /> Hiển thị</span>
            : <span className="flex items-center gap-1 text-[10px] text-[#6a6560] border border-[#6a6560]/20 rounded-full px-2 py-0.5"><EyeOff size={10} /> Đã ẩn</span>
          }
        </div>
      </div>
      <StarRating value={review.rating} size="sm" />
      {review.comment && (
        <p className="text-[#8a8480] text-sm mt-3 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [page, setPage] = useState(0);

  const { data: reviewsPage, isLoading } = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: () => customerPortalApi.getMyReviews(page, 10).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Đánh giá của tôi
        </h1>
        <p className="text-[#6a6560] text-sm">Tất cả đánh giá bạn đã chia sẻ về món ăn và nhà hàng.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
        </div>
      ) : (reviewsPage?.content ?? []).length === 0 ? (
        <div className="py-24 text-center">
          <MessageSquare size={40} className="text-[#2a2a26] mx-auto mb-4" />
          <div className="text-[#4a4a46] text-sm">Bạn chưa gửi đánh giá nào.</div>
          <div className="text-[#3a3730] text-xs mt-1">Vào lịch sử đơn hàng để đánh giá các món bạn đã ăn.</div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {(reviewsPage.content ?? []).map((r) => <ReviewCard key={r.reviewId} review={r} />)}
          </div>

          {/* Phân trang */}
          {(reviewsPage?.totalPages ?? 0) > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              <span className="px-3 py-1.5 text-sm text-[#6a6560]">{page + 1} / {reviewsPage.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(reviewsPage.totalPages - 1, p + 1))}
                disabled={page >= reviewsPage.totalPages - 1}
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
