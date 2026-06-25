import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Leaf, Heart, Star } from 'lucide-react';

const VALUES = [
  { icon: Leaf,  title: 'Nguyên liệu tươi mỗi ngày', desc: 'Chúng tôi chọn lọc kỹ càng từng nguyên liệu từ các nhà cung cấp uy tín, đảm bảo tươi ngon và an toàn.' },
  { icon: Heart, title: 'Công thức truyền thống',    desc: 'Mỗi món ăn được nấu theo công thức gia truyền, giữ trọn hương vị đậm đà của ẩm thực Việt.' },
  { icon: Star,  title: 'Phục vụ tận tâm',           desc: 'Đội ngũ nhân viên nhiệt tình, luôn sẵn sàng mang đến trải nghiệm ẩm thực tốt nhất cho quý khách.' },
];

function FadeIn({ children, delay = 0, direction = 'up' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const initial = direction === 'left' ? { opacity: 0, x: -40 } : direction === 'right' ? { opacity: 0, x: 40 } : { opacity: 0, y: 32 };
  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Image placeholder — swap <src> when real photos are available
function ImagePlaceholder({ label, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a1f0f] via-[#1c1611] to-[#0f0c08]" />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ca8a04 0, #ca8a04 1px, transparent 0, transparent 60px), repeating-linear-gradient(0deg, #ca8a04 0, #ca8a04 1px, transparent 0, transparent 60px)' }}
      />
      {/* Center ornament */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#ca8a04]/20">
        <div className="w-16 h-16 rounded-full border border-[#ca8a04]/20 flex items-center justify-center mb-3">
          <span className="text-2xl">🍽️</span>
        </div>
        {/* TODO: Thay bằng ảnh thật từ Cloudinary */}
        <span className="text-[10px] tracking-widest uppercase opacity-60">{label}</span>
      </div>
      {/* Gold corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-[#ca8a04]/30 rounded-tl-sm" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-[#ca8a04]/30 rounded-tr-sm" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-[#ca8a04]/30 rounded-bl-sm" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-[#ca8a04]/30 rounded-br-sm" />
    </div>
  );
}

export default function StorySection() {
  return (
    <section id="story" className="bg-[#0c0b08] py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-16 lg:mb-20">
            <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.6em] uppercase mb-4">Câu chuyện của chúng tôi</p>
            <h2
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-4xl sm:text-5xl lg:text-6xl text-[#f5f0e8] mb-5"
            >
              Hương vị từ{' '}
              <em className="text-[#ca8a04] not-italic">trái tim</em>
            </h2>
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-px bg-[#ca8a04]/30" />
              <span className="text-[#ca8a04]/50 text-sm">✦</span>
              <div className="w-16 h-px bg-[#ca8a04]/30" />
            </div>
          </div>
        </FadeIn>

        {/* Row 1: Image left — Text right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 lg:mb-28">
          <FadeIn direction="left">
            <ImagePlaceholder label="Không gian nhà hàng" className="h-[360px] lg:h-[480px]" />
          </FadeIn>

          <FadeIn direction="right" delay={0.1}>
            <div>
              <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.5em] uppercase mb-4">Thành lập từ 2018</p>
              <h3
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-3xl sm:text-4xl text-[#f5f0e8] mb-6 leading-tight"
              >
                Nơi hội tụ của <br />
                <span className="text-[#ca8a04]">hương vị Việt</span>
              </h3>
              <p className="text-[#8a8480] leading-relaxed mb-5 text-sm sm:text-base">
                Golden Heart ra đời từ tình yêu với ẩm thực Việt Nam. Chúng tôi tin rằng mỗi bữa ăn không chỉ là việc nạp năng lượng, mà còn là trải nghiệm gắn kết gia đình và bạn bè.
              </p>
              <p className="text-[#8a8480] leading-relaxed mb-8 text-sm sm:text-base">
                Với hơn 6 năm phục vụ, chúng tôi không ngừng hoàn thiện công thức, chọn lọc nguyên liệu và đào tạo đội ngũ để mang đến những trải nghiệm ẩm thực đáng nhớ nhất.
              </p>
              {/* Decorative quote */}
              <blockquote className="border-l-2 border-[#ca8a04] pl-5 italic text-[#c4bfb0] text-sm">
                "Mỗi món ăn là một câu chuyện — chúng tôi kể bằng cả trái tim."
              </blockquote>
            </div>
          </FadeIn>
        </div>

        {/* Row 2: Text left — Image right */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 lg:mb-28">
          <FadeIn direction="left" delay={0.05}>
            <div className="lg:order-2">
              <ImagePlaceholder label="Bếp và nguyên liệu" className="h-[320px] lg:h-[420px]" />
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.1}>
            <div className="lg:order-1">
              <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.5em] uppercase mb-4">Giá trị cốt lõi</p>
              <h3
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-3xl sm:text-4xl text-[#f5f0e8] mb-8 leading-tight"
              >
                Ba cam kết của<br />
                <span className="text-[#ca8a04]">Golden Heart</span>
              </h3>
              <div className="flex flex-col gap-6">
                {VALUES.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full border border-[#ca8a04]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={16} className="text-[#ca8a04]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="text-[#f5f0e8] font-semibold text-sm mb-1">{title}</div>
                      <div className="text-[#7a7468] text-sm leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
