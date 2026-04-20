/**
 * StaffPosPage.jsx — Trang POS trung tâm cho nhân viên
 *
 * Nhiệm vụ:
 *   - Điều phối trạng thái chọn bàn giữa các component.
 *   - Khởi tạo dữ liệu ban đầu (Menu, Tables) với branchId từ authStore.
 *   - Hiển thị layout 3 cột: Bàn | Thực đơn | Giỏ hàng.
 *
 * Layout chuẩn:
 *   - Left (340px): Sơ đồ bàn
 *   - Center (flex-1): Danh sách món ăn
 *   - Right (440px): Chi tiết đơn hàng & Thanh toán
 */
import React, { useEffect } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useOrderStore } from '../store/useOrderStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { LogOut, User, Loader2, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  ADMIN:   'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF:   'Phục vụ',
  KITCHEN: 'Bếp trưởng',
};

const StaffPosPage = () => {
  const fetchInitialData = usePosStore(s => s.fetchInitialData);
  const menuLoading      = usePosStore(s => s.menuLoading);
  const menuItems        = usePosStore(s => s.menuItems);

  const fetchTables   = useTableStore(s => s.fetchTables);
  const tablesLoading = useTableStore(s => s.loading);
  const selectedTableId = useTableStore(s => s.selectedTableId);

  const user   = useAuthStore(s => s.user);
  const role   = useAuthStore(s => s.role);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    // Tải thực đơn từ BE
    fetchInitialData();

    // Lấy branchId từ authStore — không hardcode
    // Nếu chưa có branchId → dùng 1 làm fallback (Branch Quận 1)
    const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
    fetchTables(branchId);
  }, []); // Chỉ chạy một lần khi mount

  /**
   * handleTableSelect — Xử lý khi nhân viên bấm chọn một bàn.
   * Gọi thẳng selectTable từ useTableStore để tận dụng AbortController
   * và tính năng tự động tìm Active Order.
   */
  const handleTableSelect = (tableId) => {
    // Gọi action chuẩn Production có tích hợp chống Race Condition
    useTableStore.getState().selectTable(tableId);
    console.log(`[POS] Chọn bàn: ${tableId}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Hiển thị loading khi đang tải dữ liệu lần đầu
  const isInitialLoading = (menuLoading || tablesLoading) && menuItems.length === 0;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafb] space-y-6">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-gray-100 animate-pulse">
          <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-black text-xs uppercase tracking-[0.4em] ml-1">
            Đang đồng bộ dữ liệu POS
          </p>
          <p className="text-gray-300 font-bold text-[10px] uppercase tracking-widest leading-none">
            Hệ thống đang sẵn sàng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#111827] overflow-hidden font-sans">

      {/* ── Top Header ── */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10">
            <span className="text-white font-black text-xl tracking-tighter">GH</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">
              GoldenHeart POS
            </h1>
            <p className="text-[10px] text-gold-600 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">
              Premium Restaurant System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Thông báo */}
          <button className="relative w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-all rounded-xl">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="h-10 w-[1px] bg-gray-100" />

          {/* Thông tin người dùng */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900 leading-none">
                {user?.fullName || user?.username}
              </p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">
                {ROLE_LABELS[role] || role}
                {/* Hiển thị chi nhánh nếu có */}
                {user?.branchId && ` • Chi nhánh #${user.branchId}`}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <User size={20} className="text-gray-300" />
            </div>
            <button
               onClick={handleLogout}
               className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
               title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout 3 cột ── */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Sơ đồ bàn */}
        <div className="w-[340px] shrink-0 animate-in fade-in slide-in-from-left duration-500">
          <TableList
            selectedTableId={selectedTableId}
            onTableSelect={handleTableSelect}
          />
        </div>

        {/* Center: Thực đơn */}
        <div className="flex-1 shrink flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-100">
           <MenuGrid />
        </div>

        {/* Right: Giỏ hàng & Thanh toán */}
        <div className="w-[440px] shrink-0 animate-in fade-in slide-in-from-right duration-500 delay-200">
           <CartPanel />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="h-10 bg-white border-t border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             Server: Online
           </div>
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
             {/* Hiển thị chi nhánh động từ user profile */}
             Branch: #{user?.branchId ?? '01'}
           </div>
        </div>
        <div className="text-[9px] font-bold text-gray-200 uppercase tracking-[0.1em]">
          Powered by GoldenHeart © 2024
        </div>
      </footer>
    </div>
  );
};

export default StaffPosPage;
