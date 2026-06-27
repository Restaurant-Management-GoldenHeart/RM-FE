/**
 * LoyaltyPage.jsx
 * Trang điểm tích lũy & hạng thành viên — hiển thị điểm, thanh tiến trình,
 * danh sách 5 tier và lịch sử giao dịch điểm phân trang.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Gift } from 'lucide-react';
import { customerPortalApi } from '../../api/customerPortalApi';
import TierBadge from '../../components/account/TierBadge';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Thông tin 5 tier để vẽ sơ đồ thang hạng */
const TIERS = [
  { code: 'DONG',     name: 'Đồng',     min: 0,    discount: 1,  color: '#cd7f32', emoji: '🥉' },
  { code: 'BAC',      name: 'Bạc',      min: 100,  discount: 2,  color: '#9ca3af', emoji: '🥈' },
  { code: 'VANG',     name: 'Vàng',     min: 200,  discount: 4,  color: '#ca8a04', emoji: '🥇' },
  { code: 'BACH_KIM', name: 'Bạch kim', min: 500,  discount: 6,  color: '#93c5fd', emoji: '💎' },
  { code: 'KIM_CUONG',name: 'Kim cương',min: 800,  discount: 10, color: '#67e8f9', emoji: '💠' },
];

/** Một hàng giao dịch điểm */
function TxRow({ tx }) {
  const isEarn = tx.pointsDelta > 0;
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#ca8a04]/6 last:border-none">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isEarn ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
        {isEarn ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[#f5f0e8] text-sm">{tx.description ?? 'Giao dịch điểm'}</div>
        <div className="text-[#4a4a46] text-xs mt-0.5">{fmtDate(tx.createdAt)}</div>
      </div>
      <div className={`font-semibold text-sm flex-shrink-0 ${isEarn ? 'text-emerald-400' : 'text-red-400'}`}>
        {isEarn ? '+' : ''}{fmtNum(tx.pointsDelta)} điểm
      </div>
      <div className="text-[#4a4a46] text-xs w-20 text-right flex-shrink-0">
        Số dư: {fmtNum(tx.pointsAfter)}
      </div>
    </div>
  );
}

export default function LoyaltyPage() {
  const [page, setPage] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => customerPortalApi.getProfile().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: txPage, isLoading } = useQuery({
    queryKey: ['my-loyalty-txs', page],
    queryFn: () => customerPortalApi.getLoyaltyTransactions(page, 15).then((r) => r.data),
    keepPreviousData: true,
  });

  const points = profile?.loyaltyPoints ?? 0;
  const currentTierIdx = TIERS.findLastIndex((t) => points >= t.min);
  const nextTier = TIERS[currentTierIdx + 1];
  const currentTier = TIERS[currentTierIdx] ?? TIERS[0];
  const pct = nextTier
    ? Math.min(100, Math.round(((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
    : 100;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Điểm & Hạng thành viên
        </h1>
        <p className="text-[#6a6560] text-sm">Tích lũy điểm qua mỗi đơn hàng để nâng hạng và nhận ưu đãi.</p>
      </div>

      {/* Thẻ điểm lớn */}
      <div className="bg-gradient-to-br from-[#1a1508] to-[#0f0e0b] border border-[#ca8a04]/20 rounded-2xl p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="text-[#6a6560] text-xs mb-1 uppercase tracking-widest">Tổng điểm tích lũy</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-5xl text-[#ca8a04] font-bold leading-none">
              {fmtNum(points)}
            </div>
            <div className="text-[#4a4a46] text-xs mt-2">Mỗi 10.000₫ chi tiêu = 1 điểm</div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {profile?.tierName && <TierBadge tierCode={profile.tierCode} tierName={profile.tierName} size="lg" />}
            {profile?.tierDiscountRate > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-[#f5f0e8]">
                <Gift size={14} className="text-[#ca8a04]" />
                Giảm <span className="text-[#ca8a04] font-bold">{profile.tierDiscountRate}%</span> mỗi đơn
              </div>
            )}
          </div>
        </div>

        {/* Thanh tiến trình */}
        {nextTier && (
          <div className="mt-6">
            <div className="flex justify-between text-xs text-[#6a6560] mb-2">
              <span>{fmtNum(points)} điểm</span>
              <span>Cần {fmtNum(nextTier.min - points)} điểm nữa để lên <span className="text-[#ca8a04]">{nextTier.emoji} {nextTier.name}</span></span>
            </div>
            <div className="h-3 bg-[#1c1a17] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#b07d04] to-[#f5c518]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-right text-[#ca8a04] text-xs mt-1 font-semibold">{pct}%</div>
          </div>
        )}
        {!nextTier && (
          <div className="mt-5 text-center text-[#ca8a04] text-sm font-semibold">
            🎉 Bạn đang ở hạng cao nhất — Kim cương!
          </div>
        )}
      </div>

      {/* Sơ đồ 5 tier */}
      <section>
        <h2 className="text-[#f5f0e8] text-base font-semibold mb-4">Bảng xếp hạng thành viên</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TIERS.map((tier) => {
            const isActive = tier.code === currentTier.code;
            return (
              <div
                key={tier.code}
                className={`rounded-xl border p-4 text-center transition-colors ${
                  isActive
                    ? 'border-[#ca8a04]/40 bg-[#ca8a04]/8'
                    : 'border-[#ca8a04]/8 bg-[#0f0e0b] opacity-60'
                }`}
              >
                <div className="text-2xl mb-1">{tier.emoji}</div>
                <div className="text-[#f5f0e8] text-xs font-semibold">{tier.name}</div>
                <div className="text-[#6a6560] text-[10px] mt-1">{fmtNum(tier.min)} điểm</div>
                <div className="text-[#ca8a04] text-[10px] font-semibold mt-0.5">Giảm {tier.discount}%</div>
                {isActive && <div className="text-[#ca8a04] text-[10px] mt-2 font-bold">← Hiện tại</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Lịch sử giao dịch */}
      <section>
        <h2 className="text-[#f5f0e8] text-base font-semibold mb-4">Lịch sử điểm</h2>
        <div className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-2xl px-5">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
            </div>
          ) : (txPage?.content ?? []).length === 0 ? (
            <div className="py-16 text-center text-[#4a4a46] text-sm">Chưa có giao dịch điểm nào.</div>
          ) : (
            (txPage.content ?? []).map((tx) => <TxRow key={tx.id} tx={tx} />)
          )}
        </div>

        {/* Phân trang */}
        {(txPage?.totalPages ?? 0) > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Trước
            </button>
            <span className="px-3 py-1.5 text-sm text-[#6a6560]">{page + 1} / {txPage.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(txPage.totalPages - 1, p + 1))}
              disabled={page >= txPage.totalPages - 1}
              className="px-4 py-1.5 rounded-lg text-sm border border-[#ca8a04]/20 text-[#6a6560] hover:text-[#f5f0e8] hover:border-[#ca8a04]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Sau →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
