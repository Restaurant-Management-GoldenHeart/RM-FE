import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MapPin, Clock, Phone, ExternalLink } from 'lucide-react';

const BRANCHES = [
  {
    id: 1,
    name: 'Chi nhánh Quận 1',
    address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM',
    hours: 'Mở cửa: 10:00 – 22:00 (Tất cả các ngày)',
    phone: '028 1234 5678',
    zalo: '02812345678',
    mapUrl: 'https://maps.google.com/?q=Nguyễn+Huệ+Quận+1+TPHCM',
    badge: 'Cơ sở chính',
  },
  {
    id: 2,
    name: 'Chi nhánh Quận 7',
    address: '456 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM',
    hours: 'Mở cửa: 10:00 – 22:00 (Tất cả các ngày)',
    phone: '028 8765 4321',
    zalo: '02887654321',
    mapUrl: 'https://maps.google.com/?q=Nguyễn+Thị+Thập+Quận+7+TPHCM',
    badge: null,
  },
  {
    id: 3,
    name: 'Chi nhánh Bình Thạnh',
    address: '789 Đinh Bộ Lĩnh, P.26, Quận Bình Thạnh, TP.HCM',
    hours: 'Mở cửa: 10:00 – 22:00 (Tất cả các ngày)',
    phone: '028 2468 1357',
    zalo: '02824681357',
    mapUrl: 'https://maps.google.com/?q=Đinh+Bộ+Lĩnh+Bình+Thạnh+TPHCM',
    badge: 'Mới nhất',
  },
];

function BranchCard({ branch, delay, isInView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-[#13120f] border border-[#ca8a04]/10 rounded-2xl p-7 hover:border-[#ca8a04]/30 transition-all duration-400 relative overflow-hidden"
    >
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ca8a04]/40 to-transparent group-hover:via-[#ca8a04]/70 transition-colors duration-400" />

      {/* Badge */}
      {branch.badge && (
        <span className="inline-block px-3 py-1 rounded-full bg-[#ca8a04]/12 border border-[#ca8a04]/25 text-[#ca8a04] text-[10px] font-bold tracking-wide mb-5">
          {branch.badge}
        </span>
      )}

      <h3
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        className="text-xl text-[#f5f0e8] font-semibold mb-6 group-hover:text-[#ca8a04] transition-colors"
      >
        {branch.name}
      </h3>

      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <MapPin size={15} className="text-[#ca8a04] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
          <span className="text-[#8a8480] text-sm leading-relaxed">{branch.address}</span>
        </div>
        <div className="flex gap-3 items-center">
          <Clock size={15} className="text-[#ca8a04] flex-shrink-0" strokeWidth={1.8} />
          <span className="text-[#8a8480] text-sm">{branch.hours}</span>
        </div>
        <div className="flex gap-3 items-center">
          <Phone size={15} className="text-[#ca8a04] flex-shrink-0" strokeWidth={1.8} />
          <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="text-[#f5f0e8] text-sm font-medium hover:text-[#ca8a04] transition-colors">
            {branch.phone}
          </a>
        </div>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <a
          href={`tel:${branch.phone.replace(/\s/g, '')}`}
          className="flex-1 py-2.5 rounded-full border border-[#ca8a04]/30 text-center text-[#ca8a04] text-xs font-semibold hover:bg-[#ca8a04] hover:text-[#0a0906] hover:border-[#ca8a04] transition-all duration-300 tracking-wide"
        >
          Gọi ngay
        </a>
        <a
          href={`https://zalo.me/${branch.zalo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-full border border-[#ca8a04]/30 text-center text-[#ca8a04] text-xs font-semibold hover:bg-[#ca8a04] hover:text-[#0a0906] hover:border-[#ca8a04] transition-all duration-300 tracking-wide"
        >
          Zalo
        </a>
        <a
          href={branch.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Mở bản đồ"
          className="w-10 h-10 rounded-full border border-[#ca8a04]/30 flex items-center justify-center text-[#ca8a04] hover:bg-[#ca8a04] hover:text-[#0a0906] transition-all duration-300 flex-shrink-0"
        >
          <ExternalLink size={14} strokeWidth={2} />
        </a>
      </div>
    </motion.div>
  );
}

export default function LocationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="location" ref={ref} className="bg-[#0c0b08] py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[#ca8a04]/70 text-[10px] tracking-[0.6em] uppercase mb-4">Tìm chúng tôi</p>
          <h2
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl text-[#f5f0e8] mb-5"
          >
            Hệ thống{' '}
            <em className="text-[#ca8a04] not-italic">chi nhánh</em>
          </h2>
          <p className="text-[#6a6560] text-sm max-w-lg mx-auto">
            Ba chi nhánh tại TP. Hồ Chí Minh — luôn có Golden Heart gần bạn.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {BRANCHES.map((b, i) => (
            <BranchCard key={b.id} branch={b} delay={i * 0.12} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}
