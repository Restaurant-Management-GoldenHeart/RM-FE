/**
 * CouponsPage.jsx
 * Ví coupon của khách — phân loại theo trạng thái: Có thể dùng / Đã dùng / Hết hạn.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerPortalApi } from '../../api/customerPortalApi';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { dateStyle: 'short' }) : '—';

const STATUS_TABS = [
  { key: 'AVAILABLE', label: 'Có thể dùng' },
  { key: 'USED',      label: 'Đã dùng' },
  { key: 'EXPIRED',   label: 'Hết hạn' },
];

/** Thẻ một coupon */
function CouponCard({ cc }) {
  const [copied, setCopied] = useState(false);
  const usable = cc.usable;

  const handleCopy = () => {
    navigator.clipboard.writeText(cc.couponCode).then(() => {
      setCopied(true);
      toast.success(`Đã sao chép mã ${cc.couponCode}`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const discountLabel =
    cc.discountType === 'PERCENTAGE'
      ? `Giảm ${fmtNum(cc.discountValue)}%`
      : `Giảm ${fmtNum(cc.discountValue)}₫`;

  return (
    <div className={`bg-[#0f0e0b] border rounded-2xl overflow-hidden transition-colors ${
      usable ? 'border-[#ca8a04]/20 hover:border-[#ca8a04]/40' : 'border-[#ca8a04]/8 opacity-60'
    }`}>
      {/* Dải màu trên cùng */}
      <div className={`h-1.5 ${usable ? 'bg-gradient-to-r from-[#b07d04] to-[#ca8a04]' : 'bg-[#2a2a26]'}`} />

      <div className="p-5">
        {/* Tên + loại giảm giá */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[#f5f0e8] text-sm font-semibold leading-snug">{cc.couponName}</div>
            <div className="text-[#ca8a04] text-lg font-bold mt-0.5">{discountLabel}</div>
          </div>
          <Tag size={18} className={usable ? 'text-[#ca8a04]' : 'text-[#3a3730]'} />
        </div>

        {/* Điều kiện */}
        <div className="space-y-1 text-xs text-[#6a6560] mb-4">
          {cc.minOrderAmount > 0 && (
            <div>Đơn tối thiểu: <span className="text-[#8a8480]">{fmtNum(cc.minOrderAmount)}₫</span></div>
          )}
          {cc.maxDiscountAmount && cc.discountType === 'PERCENTAGE' && (
            <div>Giảm tối đa: <span className="text-[#8a8480]">{fmtNum(cc.maxDiscountAmount)}₫</span></div>
          )}
          <div>Hết hạn: <span className="text-[#8a8480]">{fmtDate(cc.endDate)}</span></div>
        </div>

        {/* Mã coupon + nút sao chép */}
        {usable && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#1a1508] border border-[#ca8a04]/20 border-dashed rounded-lg px-3 py-2 font-mono text-[#ca8a04] text-sm tracking-widest text-center">
              {cc.couponCode}
            </div>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-2 rounded-lg border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#ca8a04] hover:border-[#ca8a04]/40 transition-colors"
              title="Sao chép mã"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        )}

        {/* Trạng thái nếu đã dùng / hết hạn */}
        {!usable && cc.status === 'USED' && (
          <div className="text-xs text-[#4a4a46]">Đã dùng lúc {fmtDate(cc.usedAt)}</div>
        )}
        {!usable && cc.status === 'EXPIRED' && (
          <div className="text-xs text-[#4a4a46]">Đã hết hạn {fmtDate(cc.endDate)}</div>
        )}
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [activeTab, setActiveTab] = useState('AVAILABLE');
  const [page, setPage] = useState(0);

  const { data: couponsPage, isLoading } = useQuery({
    queryKey: ['my-coupons', activeTab, page],
    queryFn: () => customerPortalApi.getMyCoupons(page, 12).then((r) => r.data),
    keepPreviousData: true,
  });

  // Lọc phía client theo tab vì backend trả tất cả coupon của khách
  const filtered = (couponsPage?.content ?? []).filter((cc) => cc.status === activeTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(0);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Ví coupon
        </h1>
        <p className="text-[#6a6560] text-sm">Mã giảm giá và ưu đãi dành riêng cho bạn.</p>
      </div>

      {/* Tab phân loại */}
      <div className="flex gap-1 bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-[#ca8a04] text-[#0a0906] font-semibold'
                : 'text-[#8a8480] hover:text-[#f5f0e8]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Nội dung */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <Tag size={40} className="text-[#2a2a26] mx-auto mb-4" />
          <div className="text-[#4a4a46] text-sm">
            {activeTab === 'AVAILABLE' ? 'Bạn chưa có coupon nào có thể sử dụng.' : `Không có coupon ${STATUS_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}.`}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((cc) => <CouponCard key={cc.id} cc={cc} />)}
          </div>

          {/* Phân trang (nếu backend hỗ trợ) */}
          {(couponsPage?.totalPages ?? 0) > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              <span className="px-3 py-1.5 text-sm text-[#6a6560]">{page + 1} / {couponsPage.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(couponsPage.totalPages - 1, p + 1))}
                disabled={page >= couponsPage.totalPages - 1}
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
