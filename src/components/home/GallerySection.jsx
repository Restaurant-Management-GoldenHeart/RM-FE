import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Grid cells — swap each gradient div with a real <img> when photos are ready
const CELLS = [
  {
    id: 1, label: 'Không gian', sub: 'Ấm cúng & sang trọng',
    gradient: 'from-[#2a1f0f] via-[#1c1611] to-[#100d09]',
    emoji: '🕯️', span: 'md:col-span-2 md:row-span-2',
  },
  {
    id: 2, label: 'Hải sản', sub: 'Tươi mỗi ngày',
    gradient: 'from-[#0f1a1c] via-[#0d1719] to-[#0a0f10]',
    emoji: '🦞', span: '',
  },
  {
    id: 3, label: 'Món nướng', sub: 'Lửa than truyền thống',
    gradient: 'from-[#1c1008] via-[#181008] to-[#0f0c08]',
    emoji: '🔥', span: '',
  },
  {
    id: 4, label: 'Tráng miệng', sub: 'Ngọt ngào dịu dàng',
    gradient: 'from-[#1c1020] via-[#160f1a] to-[#0f0b10]',
    emoji: '🍮', span: 'md:row-span-2',
  },
  {
    id: 5, label: 'Quầy bar', sub: 'Đồ uống đặc sắc',
    gradient: 'from-[#0a1808] via-[#0c1a0a] to-[#091008]',
    emoji: '🍃', span: '',
  },
  {
    id: 6, label: 'Tiệc riêng', sub: 'Sự kiện & họp mặt',
    gradient: 'from-[#1c1808] via-[#1a1606] to-[#100f08]',
    emoji: '🎉', span: '',
  },
];

function GalleryCell({ cell, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-xl ${cell.span}`}
      style={{ minHeight: cell.span.includes('row-span-2') ? 360 : 175 }}
    >
      {/* Background gradient — replace with <img> */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cell.gradient}`} />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #ca8a04 0, #ca8a04 1px, transparent 0, transparent 50px), repeating-linear-gradient(0deg, #ca8a04 0, #ca8a04 1px, transparent 0, transparent 50px)',
        }}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-[#ca8a04]/0 group-hover:bg-[#ca8a04]/8 transition-colors duration-500" />

      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t border-l border-[#ca8a04]/25 group-hover:border-[#ca8a04]/50 transition-colors" />
      <div className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-[#ca8a04]/25 group-hover:border-[#ca8a04]/50 transition-colors" />

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 select-none">
          {cell.emoji}
        </span>
      </div>

      {/* Label (shown on hover) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400">
        <div className="text-[#f5f0e8] font-semibold text-sm">{cell.label}</div>
        <div className="text-[#ca8a04]/70 text-xs tracking-wide">{cell.sub}</div>
      </div>

      {/* TODO: Thay toàn bộ nội dung trên bằng:
        <img src="cloudinary-url" alt={cell.label} className="w-full h-full object-cover" />
      */}
    </motion.div>
  );
}

export default function GallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="gallery" ref={ref} className="bg-[#0c0b08] py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.6em] uppercase mb-4">Trải nghiệm không gian</p>
          <h2
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl text-[#f5f0e8]"
          >
            Không gian{' '}
            <em className="text-[#ca8a04] not-italic">Golden Heart</em>
          </h2>
        </motion.div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 auto-rows-[175px]">
          {CELLS.map((cell, i) => (
            <GalleryCell key={cell.id} cell={cell} delay={isInView ? i * 0.08 : 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
