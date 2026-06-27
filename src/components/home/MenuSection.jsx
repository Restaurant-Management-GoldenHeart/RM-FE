import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { menuApi } from '../../api/menuApi';

// ─── Skeleton card hiển thị khi đang load ─────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#13120f] border border-[#ca8a04]/10 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-[#1e1b16]" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[#1e1b16] rounded w-3/4" />
        <div className="h-3 bg-[#1e1b16] rounded w-full" />
        <div className="h-3 bg-[#1e1b16] rounded w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-[#1e1b16] rounded w-24" />
          <div className="h-3 bg-[#1e1b16] rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Card món ăn ──────────────────────────────────────────────────────────────
function DishCard({ dish, delay }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = dish.imageUrl && !imgError;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-[#13120f] border border-[#ca8a04]/10 rounded-2xl overflow-hidden hover:border-[#ca8a04]/30 transition-colors duration-300"
    >
      {/* Hình ảnh */}
      <div className="relative h-44 overflow-hidden bg-[#1a1814]">
        {hasImage ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1f0f] via-[#1c1611] to-[#110e09]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13120f] via-transparent to-transparent" />

        {/* Badge bestseller */}
        {dish.bestSeller && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#ca8a04] text-[#0c0b08] text-[10px] font-bold tracking-wide uppercase">
            Best Seller
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="p-5">
        <h3 className="text-[#f5f0e8] font-semibold text-base mb-1.5 group-hover:text-[#ca8a04] transition-colors line-clamp-1">
          {dish.name}
        </h3>
        <p className="text-[#6a6560] text-xs leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
          {dish.description || 'Món ăn đặc sắc tại Golden Heart'}
        </p>
        <div className="flex items-center justify-between">
          <span
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-[#ca8a04] font-semibold text-lg"
          >
            {Number(dish.price).toLocaleString('vi-VN')}₫
          </span>
          <a
            href="tel:02812345678"
            className="text-[10px] text-[#7a7468] hover:text-[#ca8a04] tracking-wide uppercase transition-colors"
          >
            Đặt ngay →
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section chính ─────────────────────────────────────────────────────────────
export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const { data: dishes = [], isLoading, isError } = useQuery({
    queryKey: ['public-popular-dishes'],
    queryFn: () => menuApi.getPopularDishes().then(r => r.data),
    staleTime: 5 * 60 * 1000, // cache 5 phút
  });

  // Xây danh sách tab danh mục từ dữ liệu thực tế
  const categories = [
    { id: 'all', label: 'Tất cả' },
    ...Array.from(
      new Map(dishes.map(d => [d.categoryId, d.categoryName])).entries()
    ).map(([id, label]) => ({ id: String(id), label })),
  ];

  const filtered =
    activeCategory === 'all'
      ? dishes
      : dishes.filter(d => String(d.categoryId) === activeCategory);

  return (
    <section id="menu" ref={ref} className="bg-[#0a0906] py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.6em] uppercase mb-4">Thực đơn đặc sắc</p>
          <h2
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl text-[#f5f0e8] mb-5"
          >
            Những món{' '}
            <em className="text-[#ca8a04] not-italic">nổi bật</em>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="w-16 h-px bg-[#ca8a04]/30" />
            <span className="text-[#ca8a04]/50 text-sm">✦</span>
            <div className="w-16 h-px bg-[#ca8a04]/30" />
          </div>

          {/* Tab danh mục */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-250 ${
                  activeCategory === c.id
                    ? 'bg-[#ca8a04] text-[#0a0906]'
                    : 'border border-[#ca8a04]/20 text-[#8a8480] hover:border-[#ca8a04]/50 hover:text-[#ca8a04]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isError ? (
          <p className="text-center text-[#6a6560] text-sm py-16">
            Không thể tải danh sách món ăn. Vui lòng thử lại sau.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#6a6560] text-sm py-16">
            Chưa có món ăn trong danh mục này.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
            >
              {filtered.map((dish, i) => (
                <DishCard key={dish.id} dish={dish} delay={i * 0.06} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mt-14"
        >
          <a
            href="tel:02812345678"
            className="inline-flex items-center gap-2 text-sm text-[#ca8a04] hover:text-[#f5f0e8] transition-colors tracking-wide group"
          >
            Xem toàn bộ thực đơn
            <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
