import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'appetizer', label: 'Khai vị' },
  { id: 'main',      label: 'Món chính' },
  { id: 'dessert',   label: 'Tráng miệng' },
  { id: 'drink',     label: 'Đồ uống' },
];

const DISHES = [
  { id: 1, name: 'Lẩu Thái Hải Sản',   price: '358.000', badge: 'Best Seller', cat: 'main',      emoji: '🍲', desc: 'Nước lẩu đậm vị, hải sản tươi ngon' },
  { id: 2, name: 'Gà Nướng Sa Tế',     price: '188.000', badge: '',            cat: 'main',      emoji: '🍗', desc: 'Gà ta nướng lửa than, sa tế thơm lừng' },
  { id: 3, name: 'Bánh Xèo Miền Nam',  price: '89.000',  badge: 'Mới',         cat: 'appetizer', emoji: '🥞', desc: 'Giòn rụm, nhân tôm thịt giá đỗ' },
  { id: 4, name: 'Bò Lúc Lắc',        price: '225.000', badge: 'Best Seller', cat: 'main',      emoji: '🥩', desc: 'Bò Mỹ áp chảo bơ tỏi, ớt xanh' },
  { id: 5, name: 'Chè Thái Trái Cây', price: '49.000',  badge: '',            cat: 'dessert',   emoji: '🍧', desc: 'Trái cây tươi, thạch đủ màu, nước cốt dừa' },
  { id: 6, name: 'Nước Ép Dưa Hấu',  price: '39.000',  badge: '',            cat: 'drink',     emoji: '🥤', desc: 'Ép nguyên chất, không đường, ướp lạnh' },
];

function DishCard({ dish, delay }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-[#13120f] border border-[#ca8a04]/10 rounded-2xl overflow-hidden hover:border-[#ca8a04]/30 transition-colors duration-300"
    >
      {/* Image placeholder */}
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1f0f] via-[#1c1611] to-[#110e09]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500">
            {dish.emoji}
          </span>
        </div>
        {/* TODO: Thay bằng <img src={dish.imageUrl} className="w-full h-full object-cover" /> */}
        {/* Hover gold shimmer */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13120f] via-transparent to-transparent" />
        {/* Badge */}
        {dish.badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#ca8a04] text-[#0c0b08] text-[10px] font-bold tracking-wide">
            {dish.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-[#f5f0e8] font-semibold text-base mb-1.5 group-hover:text-[#ca8a04] transition-colors">
          {dish.name}
        </h3>
        <p className="text-[#6a6560] text-xs leading-relaxed mb-4">{dish.desc}</p>
        <div className="flex items-center justify-between">
          <span
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-[#ca8a04] font-semibold text-lg"
          >
            {dish.price}₫
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

export default function MenuSection() {
  const [active, setActive] = useState('all');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const filtered = active === 'all' ? DISHES : DISHES.filter(d => d.cat === active);

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

          {/* Category tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-250 ${
                  active === c.id
                    ? 'bg-[#ca8a04] text-[#0a0906]'
                    : 'border border-[#ca8a04]/20 text-[#8a8480] hover:border-[#ca8a04]/50 hover:text-[#ca8a04]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Cards grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
          >
            {filtered.map((dish, i) => (
              <DishCard key={dish.id} dish={dish} delay={i * 0.07} />
            ))}
          </motion.div>
        </AnimatePresence>

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
