import { Phone, MapPin, Clock } from 'lucide-react';

// SVG social icons (lucide-react không có Facebook/YouTube)
const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.83a8.18 8.18 0 004.79 1.53V6.9a4.85 4.85 0 01-1.02-.21z"/>
  </svg>
);

const SOCIAL_LINKS = [
  { Icon: FacebookIcon, href: 'https://facebook.com', label: 'Facebook' },
  { Icon: YoutubeIcon,  href: 'https://youtube.com',  label: 'YouTube' },
  { Icon: TikTokIcon,   href: 'https://tiktok.com',   label: 'TikTok' },
];

const QUICK_LINKS = [
  { label: 'Thực đơn',    href: '#menu' },
  { label: 'Về chúng tôi', href: '#story' },
  { label: 'Không gian',  href: '#gallery' },
  { label: 'Chi nhánh',   href: '#location' },
  { label: 'Đặt bàn',     href: 'tel:02812345678' },
];

const BRANCHES_SHORT = [
  { name: 'Quận 1',      addr: '123 Nguyễn Huệ, Q.1', phone: '028 1234 5678' },
  { name: 'Quận 7',      addr: '456 Nguyễn Thị Thập, Q.7', phone: '028 8765 4321' },
  { name: 'Bình Thạnh', addr: '789 Đinh Bộ Lĩnh, Q. Bình Thạnh', phone: '028 2468 1357' },
];

export default function HomeFooter() {
  return (
    <footer className="bg-[#080806] border-t border-[#ca8a04]/10">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full border border-[#ca8a04]/40 flex items-center justify-center">
                <span
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="text-[#ca8a04] font-bold text-base"
                >
                  G
                </span>
              </div>
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-xl text-[#f5f0e8]"
              >
                Golden <span className="text-[#ca8a04]">Heart</span>
              </span>
            </div>
            <p className="text-[#5a5550] text-sm leading-relaxed mb-6 max-w-xs">
              Nhà hàng Việt Nam với hơn 6 năm phục vụ — nơi hương vị truyền thống gặp không gian hiện đại, ấm cúng.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-[#ca8a04]/20 flex items-center justify-center text-[#6a6560] hover:border-[#ca8a04]/60 hover:text-[#ca8a04] transition-all duration-300"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[#f5f0e8] font-semibold text-sm mb-5 tracking-wide">Điều hướng</h4>
            <ul className="flex flex-col gap-3">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[#5a5550] text-sm hover:text-[#ca8a04] transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div>
            <h4 className="text-[#f5f0e8] font-semibold text-sm mb-5 tracking-wide">Chi nhánh</h4>
            <div className="flex flex-col gap-5">
              {BRANCHES_SHORT.map(b => (
                <div key={b.name}>
                  <div className="text-[#ca8a04] text-xs font-semibold mb-1 tracking-wide">{b.name}</div>
                  <div className="flex gap-1.5 text-[#4a4a46] text-xs mb-1">
                    <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                    <span>{b.addr}</span>
                  </div>
                  <div className="flex gap-1.5 text-[#4a4a46] text-xs">
                    <Phone size={11} className="flex-shrink-0 mt-0.5" />
                    <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="hover:text-[#ca8a04] transition-colors">{b.phone}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hours & Contact */}
          <div>
            <h4 className="text-[#f5f0e8] font-semibold text-sm mb-5 tracking-wide">Giờ hoạt động</h4>
            <div className="flex gap-3 mb-5">
              <Clock size={14} className="text-[#ca8a04] flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <div className="text-[#5a5550] text-sm leading-relaxed">
                <div>Thứ 2 – Chủ nhật</div>
                <div className="text-[#ca8a04] font-semibold">10:00 – 22:00</div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-[#ca8a04]/12 bg-[#ca8a04]/4">
              <p className="text-[#8a8480] text-xs mb-3">Đặt bàn qua điện thoại</p>
              <a
                href="tel:02812345678"
                className="text-[#ca8a04] font-bold text-base block hover:text-[#e09b04] transition-colors"
              >
                028 1234 5678
              </a>
              <a
                href="https://zalo.me/02812345678"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5a5550] text-xs hover:text-[#ca8a04] transition-colors mt-1 block"
              >
                Zalo: 028 1234 5678
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#ca8a04]/8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-14 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[#3a3a36] text-xs">
            © {new Date().getFullYear()} Golden Heart Restaurant. All rights reserved.
          </p>
          <p className="text-[#3a3a36] text-xs">
            Chính sách bảo mật · Điều khoản sử dụng
          </p>
        </div>
      </div>
    </footer>
  );
}
