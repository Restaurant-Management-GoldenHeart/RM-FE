/**
 * AccountLayout.jsx
 * Khung bố cục chung của Customer Portal — sidebar + vùng nội dung chính.
 * Tất cả các trang /account/* đều được render bên trong <Outlet />.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AccountSidebar from '../../components/account/AccountSidebar';
import { customerPortalApi } from '../../api/customerPortalApi';

export default function AccountLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Tải profile tại layout để truyền xuống sidebar — mọi trang con đều dùng lại cache này
  const { data: profileData } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => customerPortalApi.getProfile().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex min-h-screen bg-[#0a0906]">
      {/* Sidebar — desktop cố định, mobile drawer */}
      <AccountSidebar
        profile={profileData}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Vùng nội dung */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar di động — hiện nút hamburger */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-[#ca8a04]/10 bg-[#0f0e0b] sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[#8a8480] hover:text-[#f5f0e8] hover:bg-[#ca8a04]/8 transition-colors"
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <span
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className="text-[#f5f0e8] text-base"
          >
            Golden <span className="text-[#ca8a04]">Heart</span>
          </span>
        </header>

        {/* Nội dung trang */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
