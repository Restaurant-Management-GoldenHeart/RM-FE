import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 2018, suffix: '', label: 'Năm thành lập', note: 'Hơn 6 năm phục vụ' },
  { value: 80,   suffix: '+', label: 'Món đặc trưng', note: 'Phong phú, đa dạng' },
  { value: 3,    suffix: '',  label: 'Chi nhánh',     note: 'TP. Hồ Chí Minh' },
  { value: 5000, suffix: '+', label: 'Khách hàng',    note: 'Tin tưởng & yêu mến' },
];

function Counter({ target, suffix, isVisible }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 1800;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target]);

  return (
    <span>
      {count.toLocaleString('vi-VN')}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="stats" ref={ref} className="bg-[#0f0e0b] py-20 border-y border-[#ca8a04]/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-[#ca8a04]/10"
        >
          {STATS.map(({ value, suffix, label, note }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-center lg:px-10 group"
            >
              <div
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-4xl sm:text-5xl font-bold text-[#ca8a04] mb-2 tabular-nums"
              >
                <Counter target={value} suffix={suffix} isVisible={isInView} />
              </div>
              <div className="text-[#f5f0e8] font-semibold text-sm sm:text-base tracking-wide mb-1">{label}</div>
              <div className="text-[#7a7468] text-xs tracking-wide">{note}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
