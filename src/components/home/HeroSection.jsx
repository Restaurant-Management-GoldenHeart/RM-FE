import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Phone } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY      = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const opacity  = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section id="hero" ref={ref} className="relative h-screen min-h-[640px] flex items-center justify-center overflow-hidden">
      {/* ── Parallax background ── */}
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        {/* Base dark */}
        <div className="absolute inset-0 bg-[#0a0906]" />

        {/* Warm candlelight glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] rounded-full bg-[#ca8a04]/7 blur-[110px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vh] rounded-full bg-[#a16207]/5 blur-[80px] pointer-events-none" />

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(#ca8a04 1px, transparent 1px)', backgroundSize: '44px 44px' }}
        />

        {/* TODO: Thay bằng ảnh/video thật — <img src="cloudinary-url" className="absolute inset-0 w-full h-full object-cover opacity-40" /> */}

        {/* Fade bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#0a0906] via-[#0a0906]/60 to-transparent" />
      </motion.div>

      {/* ── Top gold rule ── */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ca8a04]/50 to-transparent" />

      {/* ── Content ── */}
      <motion.div style={{ opacity }} className="relative z-10 text-center px-6 max-w-5xl mx-auto w-full">
        {/* Label */}
        <motion.p
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
          className="text-[#ca8a04]/80 text-[10px] sm:text-xs tracking-[0.65em] uppercase mb-8 font-light"
        >
          ✦ &nbsp; Nhà hàng Việt Nam &nbsp; ✦
        </motion.p>

        {/* Heading */}
        <motion.h1
          custom={1} initial="hidden" animate="visible" variants={fadeUp}
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-bold text-[#f5f0e8] leading-[0.88] tracking-tight"
        >
          Golden
        </motion.h1>
        <motion.h1
          custom={2} initial="hidden" animate="visible" variants={fadeUp}
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-bold text-[#ca8a04] leading-[0.88] tracking-tight mb-8"
        >
          Heart
        </motion.h1>

        {/* Ornament */}
        <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
          className="flex items-center justify-center gap-5 mb-8"
        >
          <div className="w-24 h-px bg-gradient-to-r from-transparent to-[#ca8a04]/40" />
          <span className="text-[#ca8a04]/60 text-base">✦</span>
          <div className="w-24 h-px bg-gradient-to-l from-transparent to-[#ca8a04]/40" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          custom={4} initial="hidden" animate="visible" variants={fadeUp}
          className="text-[#c4bfb0] text-base sm:text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto mb-12"
        >
          Nơi mỗi món ăn kể một câu chuyện —{' '}
          <span className="text-[#f5f0e8] font-normal">hương vị truyền thống, chạm đến trái tim.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={5} initial="hidden" animate="visible" variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#menu"
            className="group w-full sm:w-auto px-8 py-4 bg-[#ca8a04] text-[#0a0906] rounded-full font-semibold text-sm tracking-wide hover:bg-[#e09b04] transition-all duration-300 shadow-lg shadow-[#ca8a04]/20 flex items-center justify-center gap-2"
          >
            Xem thực đơn
            <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
          </a>
          <a
            href="tel:02812345678"
            className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 border border-[#ca8a04]/35 text-[#f5f0e8] rounded-full font-medium text-sm tracking-wide hover:border-[#ca8a04]/70 hover:bg-[#ca8a04]/8 transition-all duration-300"
          >
            <Phone size={14} strokeWidth={2.5} />
            Đặt bàn ngay
          </a>
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.a
        href="#stats"
        animate={{ y: [0, 9, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#ca8a04]/45 hover:text-[#ca8a04] transition-colors"
      >
        <span className="text-[9px] tracking-[0.45em] uppercase">Khám phá</span>
        <ChevronDown size={15} />
      </motion.a>
    </section>
  );
}
