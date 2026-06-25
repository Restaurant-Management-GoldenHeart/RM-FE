import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';

export default function CtaBanner() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#ca8a04] py-20 lg:py-28">
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(#0a0906 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Edge glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/20" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-black/10" />

      <div className="relative max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[#0c0b08]/60 text-[10px] tracking-[0.6em] uppercase mb-5">
            Đặt bàn ngay hôm nay
          </p>
          <h2
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0a0906] leading-tight mb-5"
          >
            Trải nghiệm bữa ăn <br className="hidden sm:block" />
            đáng nhớ cùng gia đình
          </h2>
          <p className="text-[#0a0906]/60 text-sm sm:text-base mb-10 max-w-xl mx-auto">
            Gọi điện hoặc nhắn Zalo để đặt bàn — chúng tôi luôn sẵn sàng phục vụ từ <strong className="text-[#0a0906]/80">10:00 đến 22:00</strong>, tất cả các ngày trong tuần.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:02812345678"
              className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#0a0906] text-[#ca8a04] font-bold text-sm tracking-wide hover:bg-[#1c1a15] transition-all duration-300 shadow-lg shadow-black/25"
            >
              <Phone size={16} strokeWidth={2.5} />
              028 1234 5678
            </a>
            <a
              href="https://zalo.me/02812345678"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-full border-2 border-[#0a0906]/30 text-[#0a0906] font-bold text-sm tracking-wide hover:bg-[#0a0906]/10 transition-all duration-300"
            >
              <MessageCircle size={16} strokeWidth={2.5} />
              Nhắn Zalo đặt bàn
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
