/**
 * TierBadge.jsx
 * Hiển thị huy hiệu hạng thành viên với màu sắc đặc trưng cho từng tier.
 */

const TIER_CONFIG = {
  DONG:     { label: 'Đồng',     color: '#cd7f32', bg: 'rgba(205,127,50,0.12)', emoji: '🥉' },
  BAC:      { label: 'Bạc',      color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', emoji: '🥈' },
  VANG:     { label: 'Vàng',     color: '#ca8a04', bg: 'rgba(202,138,4,0.12)',   emoji: '🥇' },
  BACH_KIM: { label: 'Bạch kim', color: '#93c5fd', bg: 'rgba(147,197,253,0.12)', emoji: '💎' },
  KIM_CUONG: { label: 'Kim cương', color: '#67e8f9', bg: 'rgba(103,232,249,0.12)', emoji: '💠' },
};

/**
 * @param {string} tierCode   - code từ backend, vd: "VANG", "BAC"
 * @param {string} tierName   - tên hiển thị, vd: "Hạng Vàng"
 * @param {'sm'|'md'|'lg'} size
 */
export default function TierBadge({ tierCode, tierName, size = 'md' }) {
  const normalized = tierCode
    ?.toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/Ạ/g, 'A')
    .replace(/Ổ/g, 'O')
    .replace(/Ồ/g, 'O')
    .replace(/À|Á|Ã|Ả/g, 'A');

  // Map thủ công vì dấu tiếng Việt dễ không khớp
  const config = Object.entries(TIER_CONFIG).find(([k]) =>
    tierCode?.toUpperCase().includes(k) ||
    tierName?.toUpperCase().includes(k.replace('_', ' '))
  )?.[1] ?? { label: tierName ?? 'Thành viên', color: '#6a6560', bg: 'rgba(106,101,96,0.1)', emoji: '👤' };

  const sizeClass = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClass}`}
      style={{
        color:            config.color,
        background:       config.bg,
        borderColor:      config.color + '40',
      }}
    >
      <span>{config.emoji}</span>
      <span>{tierName ?? config.label}</span>
    </span>
  );
}
