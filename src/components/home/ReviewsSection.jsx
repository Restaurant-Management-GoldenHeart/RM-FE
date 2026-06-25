import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star } from 'lucide-react';

const REVIEWS = [
  { name: 'Nguyễn Thu Hà',   avatar: 'TH', rating: 5, dish: 'Lẩu Thái Hải Sản',  text: 'Món lẩu thái ở đây cực kỳ đậm đà, nước dùng chuẩn vị. Không gian sạch sẽ, nhân viên nhiệt tình. Đây là lần thứ 5 tôi ghé và lần nào cũng không thất vọng!' },
  { name: 'Trần Minh Tuấn',  avatar: 'MT', rating: 5, dish: 'Bò Lúc Lắc',         text: 'Bò lúc lắc mềm, thơm, áp chảo vừa chín tới. Quán có không khí ấm cúng, phù hợp đi cùng gia đình. Giá cả hợp lý cho chất lượng này.' },
  { name: 'Lê Phương Linh',  avatar: 'PL', rating: 5, dish: 'Gà Nướng Sa Tế',    text: 'Đặt bàn dễ dàng, phục vụ nhanh. Món gà nướng sa tế thơm lừng, da giòn mà thịt vẫn mềm. Sẽ quay lại và mang thêm bạn bè!' },
  { name: 'Phạm Đức Anh',   avatar: 'ĐA', rating: 5, dish: 'Bánh Xèo',           text: 'Không gian nhà hàng rất đẹp và thoáng mát. Bánh xèo giòn rụm, nhân đầy. Cảm giác như được ăn tại nhà của một người bạn cẩn thận nấu nướng.' },
  { name: 'Vũ Thanh Mai',   avatar: 'TM', rating: 5, dish: 'Chè Thái Trái Cây', text: 'Chè thái ngon xuất sắc, nguyên liệu tươi, không quá ngọt. Không gian sáng sủa, nhạc nhẹ dễ chịu. Nhất định sẽ giới thiệu cho bạn bè!' },
  { name: 'Hoàng Bích Ngọc', avatar: 'BN', rating: 5, dish: 'Set Menu',           text: 'Đặt tiệc sinh nhật tại đây — mọi thứ hoàn hảo từ trang trí đến món ăn. Đội ngũ nhiệt tình và chuyên nghiệp. Cảm ơn Golden Heart!' },
  { name: 'Ngô Quỳnh Anh',  avatar: 'QA', rating: 5, dish: 'Hải sản tươi',       text: 'Hải sản tươi, chế biến khéo, không bị tanh. Không gian sang trọng nhưng giá cả bình dân. Rất phù hợp cho bữa ăn gia đình cuối tuần.' },
  { name: 'Đinh Thanh Long', avatar: 'TL', rating: 5, dish: 'Lẩu Thái',          text: 'Lẩu thái vị chuẩn, nguyên liệu sạch và phong phú. Nhân viên vui vẻ, phục vụ chu đáo. Sẽ là địa điểm quen thuộc mỗi cuối tuần của gia đình tôi.' },
];

const COLORS = [
  'bg-[#3d2a10] text-[#ca8a04]',
  'bg-[#102a3a] text-[#4db6d4]',
  'bg-[#2a1030] text-[#c47ae0]',
  'bg-[#0f2e10] text-[#5dc464]',
  'bg-[#2e1010] text-[#e07a7a]',
  'bg-[#102020] text-[#4dd4c4]',
  'bg-[#1a2e10] text-[#a4d464]',
  'bg-[#2e2010] text-[#d4a440]',
];

function ReviewCard({ review, i }) {
  return (
    <div className="w-72 sm:w-80 flex-shrink-0 bg-[#131210] border border-[#ca8a04]/10 rounded-2xl p-5 mx-2">
      {/* Stars */}
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: review.rating }).map((_, j) => (
          <Star key={j} size={12} className="text-[#ca8a04] fill-[#ca8a04]" />
        ))}
      </div>
      {/* Quote mark */}
      <span className="text-[#ca8a04]/20 text-5xl font-serif leading-none">"</span>
      <p className="text-[#8a8480] text-xs sm:text-sm leading-relaxed -mt-3 mb-4 line-clamp-4">
        {review.text}
      </p>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${COLORS[i % COLORS.length]}`}>
          {review.avatar}
        </div>
        <div>
          <div className="text-[#f5f0e8] font-semibold text-sm">{review.name}</div>
          <div className="text-[#ca8a04]/60 text-[10px] tracking-wide">{review.dish}</div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [paused, setPaused] = useState(false);

  // Duplicate for seamless loop
  const row1 = [...REVIEWS, ...REVIEWS];
  const row2 = [...REVIEWS.slice(4), ...REVIEWS.slice(0, 4), ...REVIEWS.slice(4), ...REVIEWS.slice(0, 4)];

  return (
    <section id="reviews" ref={ref} className="bg-[#0a0906] py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.6em] uppercase mb-4">Khách hàng nói gì</p>
          <h2
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl text-[#f5f0e8]"
          >
            Đánh giá{' '}
            <em className="text-[#ca8a04] not-italic">từ thực khách</em>
          </h2>
        </motion.div>
      </div>

      {/* Carousel row 1 — scroll left */}
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className={`flex py-3 marquee-left ${paused ? 'marquee-paused' : ''}`}
          style={{ width: 'max-content' }}
        >
          {row1.map((r, i) => (
            <ReviewCard key={`r1-${i}`} review={r} i={i} />
          ))}
        </div>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a0906] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a0906] to-transparent z-10" />
      </div>

      {/* Carousel row 2 — scroll right */}
      <div
        className="relative mt-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className={`flex py-3 marquee-right ${paused ? 'marquee-paused' : ''}`}
          style={{ width: 'max-content' }}
        >
          {row2.map((r, i) => (
            <ReviewCard key={`r2-${i}`} review={r} i={i + 3} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a0906] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a0906] to-transparent z-10" />
      </div>
    </section>
  );
}
