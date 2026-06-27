/**
 * DishHistoryPage.jsx
 * Trang "Món đã ăn" — hiển thị tất cả món khách từng gọi, sắp xếp theo
 * số lần gọi nhiều nhất. Có tìm kiếm và lọc theo danh mục.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Utensils } from 'lucide-react';
import { customerPortalApi } from '../../api/customerPortalApi';

const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { dateStyle: 'short' }) : '—';

/** Một thẻ món ăn */
function DishCard({ dish }) {
  return (
    <div className="bg-[#0f0e0b] border border-[#ca8a04]/10 rounded-2xl overflow-hidden hover:border-[#ca8a04]/25 transition-all group">
      {/* Ảnh */}
      <div className="relative h-40 overflow-hidden">
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-[#1c1a17] flex items-center justify-center">
            <Utensils size={28} className="text-[#3a3730]" />
          </div>
        )}
        {/* Badge số lần gọi */}
        <div className="absolute top-2.5 right-2.5 bg-[#0a0906]/80 backdrop-blur-sm border border-[#ca8a04]/30 rounded-full px-2.5 py-0.5">
          <span className="text-[#ca8a04] text-xs font-bold">{fmtNum(dish.totalQuantity)}×</span>
        </div>
      </div>

      {/* Thông tin */}
      <div className="p-4">
        <div className="text-[#f5f0e8] text-sm font-semibold leading-snug mb-1 line-clamp-2">{dish.name}</div>
        <div className="text-[#6a6560] text-xs">{dish.categoryName}</div>
        <div className="text-[#4a4a46] text-xs mt-2">Lần cuối: {fmtDate(dish.lastOrderedAt)}</div>
      </div>
    </div>
  );
}

export default function DishHistoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data: dishes = [], isLoading } = useQuery({
    queryKey: ['my-dishes-eaten'],
    queryFn: () => customerPortalApi.getDishesEaten().then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });

  // Danh sách category duy nhất từ dữ liệu
  const categories = useMemo(
    () => [...new Set(dishes.map((d) => d.categoryName).filter(Boolean))],
    [dishes],
  );

  // Lọc theo tìm kiếm + danh mục
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dishes.filter((d) => {
      const matchSearch = !q || d.name?.toLowerCase().includes(q);
      const matchCat = !category || d.categoryName === category;
      return matchSearch && matchCat;
    });
  }, [dishes, search, category]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }} className="text-2xl text-[#f5f0e8] mb-1">
          Món đã ăn
        </h1>
        <p className="text-[#6a6560] text-sm">
          {dishes.length} món bạn đã thưởng thức · Sắp xếp theo số lần gọi
        </p>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a4a46]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm món ăn…"
            className="w-full bg-[#0f0e0b] border border-[#ca8a04]/15 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f5f0e8] placeholder-[#3a3730] focus:outline-none focus:border-[#ca8a04]/40 transition-colors"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-[#0f0e0b] border border-[#ca8a04]/15 rounded-xl px-4 py-2.5 text-sm text-[#f5f0e8] focus:outline-none focus:border-[#ca8a04]/40 transition-colors"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Nội dung */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ca8a04]/30 border-t-[#ca8a04] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-[#4a4a46] text-sm">
          {dishes.length === 0 ? 'Bạn chưa thưởng thức món nào tại nhà hàng.' : 'Không có kết quả phù hợp.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((dish) => <DishCard key={dish.menuItemId} dish={dish} />)}
        </div>
      )}
    </div>
  );
}
