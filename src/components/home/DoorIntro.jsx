import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const easeSwing = [0.76, 0, 0.24, 1];

export default function DoorIntro({ onComplete }) {
  const [opening, setOpening] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOpening(true), 2000);
    const t2 = setTimeout(() => { setDone(true); onComplete?.(); }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  if (done) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Left door panel */}
      <motion.div
        className="absolute top-0 left-0 w-1/2 h-full bg-[#0c0b08]"
        animate={opening ? { x: '-100%' } : { x: 0 }}
        transition={{ duration: 1.3, ease: easeSwing, delay: 0.05 }}
      >
        {/* Horizontal wood-grain lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #ca8a04, #ca8a04 1px, transparent 1px, transparent 48px)',
          }}
        />
        {/* Right edge glow line */}
        <div className="absolute right-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-[#ca8a04]/80 to-transparent" />
        {/* Door handle */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          <div className="w-1.5 h-10 rounded-full bg-[#ca8a04]/25" />
        </div>
        {/* Corner ornament */}
        <div className="absolute right-6 top-12 w-6 h-6 border border-[#ca8a04]/20 rotate-45" />
        <div className="absolute right-6 bottom-12 w-6 h-6 border border-[#ca8a04]/20 rotate-45" />
      </motion.div>

      {/* Right door panel */}
      <motion.div
        className="absolute top-0 right-0 w-1/2 h-full bg-[#0c0b08]"
        animate={opening ? { x: '100%' } : { x: 0 }}
        transition={{ duration: 1.3, ease: easeSwing, delay: 0.05 }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #ca8a04, #ca8a04 1px, transparent 1px, transparent 48px)',
          }}
        />
        <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-[#ca8a04]/80 to-transparent" />
        <div className="absolute left-5 top-1/2 -translate-y-1/2">
          <div className="w-1.5 h-10 rounded-full bg-[#ca8a04]/25" />
        </div>
        <div className="absolute left-6 top-12 w-6 h-6 border border-[#ca8a04]/20 rotate-45" />
        <div className="absolute left-6 bottom-12 w-6 h-6 border border-[#ca8a04]/20 rotate-45" />
      </motion.div>

      {/* Center logo — fades out just before door opens */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        animate={opening ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          className="text-center select-none px-8"
        >
          <p className="text-[#ca8a04]/60 text-[10px] tracking-[0.65em] uppercase mb-8 font-light">
            Kính mời quý khách
          </p>

          {/* Ornamental line */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#ca8a04]/50" />
            <span className="text-[#ca8a04]/60 text-sm">✦</span>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#ca8a04]/50" />
          </div>

          <h1
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-7xl sm:text-8xl font-bold text-[#f5f0e8] leading-none tracking-tight"
          >
            Golden
          </h1>
          <h1
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-7xl sm:text-8xl font-bold text-[#ca8a04] leading-none tracking-tight"
          >
            Heart
          </h1>

          <div className="flex items-center justify-center gap-4 mt-4 mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#ca8a04]/50" />
            <span className="text-[#ca8a04]/60 text-sm">✦</span>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#ca8a04]/50" />
          </div>

          <p className="text-[#c4bfb0]/50 text-[10px] tracking-[0.5em] uppercase font-light">
            Hương vị từ trái tim
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
