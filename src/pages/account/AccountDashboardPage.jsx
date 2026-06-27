/**
 * AccountDashboardPage.jsx
 * Trang tổng quan Customer Portal — điểm, hạng, lịch sử gần đây, món ưa thích.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, Utensils, Tag, ChevronRight, Clock } from 'lucide-react';
import { customerPortalApi } from '../../api/customerPortalApi';
import TierBadge from '../../components/account/TierBadge';

/** Chuyển số điểm thành chuỗi có dấu phẩy hàng nghìn */
const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');

/** Chuyển ISO string thành ngày giờ Việt */
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Thẻ thống kê nhỏ ở đầu trang */
function StatCard({ icon: Icon, label, value, sub, to }) {
  const inner = (
    <div className="bg-[#0f0e0b] border border-[#ca8a04]/12 rounded-2xl p-5 hover:border-[#ca8a04]/30 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#ca8a04]/10 flex items-center justify-center">
          <Icon size={18} className="text-[#ca8a04]" />
        </div>
        {to && <ChevronRight size={14} className="text-[#4a4a46] group-hover:text-[#ca8a04] transition-colors mt-1" />}
      </div>
      <div className="text-[#f5f0e8] text-xl font-bold mb-0.5">{value}</div>
      <div className="text-[#6a6560] text-xs">{label}</div>
      {sub && <div className="text-[#4a4a46] text-xs mt-1">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

/** Thanh tiến trình tích lũy điểm lên tier tiếp theo */
function TierProgress({ profile }) {
  const current = profile.loyaltyPoints ?? 0;
  const next = profile.nextTierMinPoints;
  const prevMin = profile.tierMinPoints ?? 0;

  if (!next) {
    return (
      <div className="mt-4 text-[#ca8a04] text-xs font-semibold">
        🎉 Bạn đang ở hạng cao nhất!
      </div>
    );
  }

  const range = next - prevMin;
  const earned = current - prevMin;
  const pct = Math.min(100, Math.round((earned / range) * 100));

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-[#6a6560] mb-2">
        <span>{fmtNum(current)} điểm</span>
        <span>
          Còn <span className="text-[#ca8a04] font-semibold">{fmtNum(next - current)}</span> điểm lên {profile.nextTierName}
        </span>
      </div>
      <div className="h-2 bg-[#1c1a17] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#b07d04] to-[#ca8a04] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AccountDashboardPage() {
  const { data: profile, isLoading: pLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => customerPortalApi.getProfile().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ordersPage } = useQuery({
    queryKey: ['my-orders', 0, 3],
    queryFn: () => customerPortalApi.getOrderHistory(0, 3).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: dishes } = useQuery({
    queryKey: ['my-dishes-eaten'],
    queryFn: () => customerPortalApi.getDishesEaten().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const recentOrders = ordersPage?.content ?? [];
  const topDishes = (dishes ?? []).slice(0, 4);

  if (pLoading) {
    return (
      <div className="flex items-center justify-center min-h-60">
        <div className="w-8 h-8 rounded-full border-2 border-[#ca8a04]/30 border-t-[#ca8a04] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Tiêu đề + hạng */}
      <div>
        <h1
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          className="text-2xl text-[#f5f0e8] mb-1"
        >
          Xin chào, {profile?.name ?? 'Quý khách'} 👋
        </h1>
        <div className="flex items-center gap-3 text-[#6a6560] text-sm">
          <span>Thành viên từ {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '—'}</span>
          {profile?.tierName && (
            <>
              <span>·</span>
              <TierBadge tierCode={profile.tierCode} tierName={profile.tierName} size="sm" />
            </>
          )}
        </div>
      </div>

      {/* Thẻ điểm + hạng */}
      {profile && (
        <div className="bg-[#0f0e0b] border border-[#ca8a04]/15 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[#6a6560] text-xs mb-1">Điểm tích lũy</div>
              <div
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-4xl text-[#ca8a04] font-bold"
              >
                {fmtNum(profile.loyaltyPoints)}
              </div>
              <div className="text-[#4a4a46] text-xs mt-1">10.000₫ mỗi đơn hàng = 1 điểm</div>
            </div>
            <div className="text-right">
              {profile.tierDiscountRate > 0 && (
                <div className="text-[#ca8a04] text-sm font-semibold mb-1">
                  Ưu đãi {profile.tierDiscountRate}% mỗi đơn
                </div>
              )}
              <Link to="/account/loyalty" className="text-xs text-[#6a6560] hover:text-[#ca8a04] transition-colors flex items-center gap-1 justify-end">
                Xem lịch sử điểm <ChevronRight size={12} />
              </Link>
            </div>
          </div>
          <TierProgress profile={profile} />
        </div>
      )}

      {/* 4 thẻ thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Đơn hàng" value={fmtNum(ordersPage?.totalElements)} to="/account/orders" />
        <StatCard icon={Star}        label="Điểm tích lũy" value={fmtNum(profile?.loyaltyPoints)} to="/account/loyalty" />
        <StatCard icon={Utensils}    label="Món đã thử" value={fmtNum(dishes?.length)} to="/account/dishes" />
        <StatCard icon={Tag}         label="Ví coupon" value="Xem ngay" to="/account/coupons" />
      </div>

      {/* Đơn hàng gần đây */}
      {recentOrders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f5f0e8] text-base font-semibold">Đơn hàng gần đây</h2>
            <Link to="/account/orders" className="text-[#ca8a04] text-xs hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.orderId} className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ca8a04]/10 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-[#ca8a04]" />
                  </div>
                  <div>
                    <div className="text-[#f5f0e8] text-sm font-medium">#{order.orderId} · {order.branchName ?? 'Chi nhánh'}</div>
                    <div className="text-[#4a4a46] text-xs">{fmtDate(order.createdAt)} · Bàn {order.tableName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#ca8a04] font-semibold text-sm">{fmtNum(order.total)}₫</div>
                  <div className="text-[#6a6560] text-xs">{(order.items ?? []).length} món</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Món ưa thích */}
      {topDishes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f5f0e8] text-base font-semibold">Món yêu thích của bạn</h2>
            <Link to="/account/dishes" className="text-[#ca8a04] text-xs hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topDishes.map((dish) => (
              <div key={dish.menuItemId} className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-xl overflow-hidden hover:border-[#ca8a04]/30 transition-colors">
                {dish.imageUrl ? (
                  <img src={dish.imageUrl} alt={dish.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-[#1c1a17] flex items-center justify-center">
                    <Utensils size={24} className="text-[#3a3730]" />
                  </div>
                )}
                <div className="p-3">
                  <div className="text-[#f5f0e8] text-xs font-medium truncate">{dish.name}</div>
                  <div className="text-[#ca8a04] text-xs mt-0.5">{fmtNum(dish.totalQuantity)} lần</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
