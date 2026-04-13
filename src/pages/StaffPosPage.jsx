/**
 * StaffPosPage.jsx — Trang POS trung tâm cho nhân viên
 *
 * Nhiệm vụ:
 *   - Điều phối trạng thái chọn bàn giữa các component.
 *   - Khởi tạo dữ liệu ban đầu (Menu, Tables).
 *   - Hiển thị layout 3 cột: Bàn | Thực đơn | Giỏ hàng.
 *
 * Layout chuẩn:
 *   - Left (320px): Sơ đồ bàn
 *   - Center (flex-1): Danh sách món ăn
 *   - Right (420px): Chi tiết đơn hàng & Thanh toán
 */
import React, { useEffect, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useOrderStore } from '../store/useOrderStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { LogOut, User, Loader2, RefreshCw, Layers, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Phục vụ',
  KITCHEN: 'Bếp trưởng',
};

const StaffPosPage = () => {
  const fetchInitialData = usePosStore(s => s.fetchInitialData);
  const menuLoading      = usePosStore(s => s.menuLoading);
  const fetchTables      = useTableStore(s => s.fetchTables);
  const tablesLoading    = useTableStore(s => s.loading);
  const selectedTableId  = useTableStore(s => s.selectedTableId);
  
  const user   = useAuthStore(s => s.user);
  const role   = useAuthStore(s => s.role);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  // Store selectedTableId is global in useTableStore, so we just use that.

  useEffect(() => {
    // Tải dữ liệu ban đầu
    fetchInitialData();
    fetchTables(1); // Branch 1 default
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleTableSelect = ({ table, orderId, order }) => {
    // 1. Cập nhật ID bàn được chọn vào store
    useTableStore.setState({ selectedTableId: table.id });
    
    // 2. Nếu có dữ liệu order truyền vào (từ openTable), lưu ngay vào store
    if (order) {
      useOrderStore.getState().setOrder(order);
    } 
    // 3. Nếu chỉ có orderId (từ chọn bàn đã bận), tải dữ liệu mới nhất từ Backend
    else if (orderId) {
      useOrderStore.getState().refreshOrder(orderId);
    }
    
    console.log(`[POS] Selected Table: ${table.tableNumber}, OrderId: ${orderId || 'None'}`);
  };

  const isLoading = (menuLoading || tablesLoading);

  if (isLoading && !usePosStore.getState().menuItems.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafb] space-y-6">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-gray-100 animate-pulse transition-transform">
          <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-gray-900 font-black text-xs uppercase tracking-[0.4em] ml-1">Đang đồng bộ dữ liệu POS</p>
          <p className="text-gray-300 font-bold text-[10px] uppercase tracking-widest leading-none">Hệ thống đang sẵn sàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#111827] overflow-hidden font-sans selection:bg-gold-100 italic-none">
      
      {/* ── Top Header ── */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10 group cursor-pointer">
            <span className="text-white font-black text-xl tracking-tighter transition-all group-hover:scale-110">GH</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">GoldenHeart POS</h1>
            <p className="text-[10px] text-gold-600 font-black uppercase tracking-[0.2em] mt-1.5 opacity-80">Premium Restaurant System</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Notifications / Alerts */}
          <button className="relative w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-all rounded-xl">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          <div className="h-10 w-[1px] bg-gray-100" />

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-gray-900 leading-none">{user?.fullName || user?.username}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{ROLE_LABELS[role] || role}</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
              <User size={20} className="text-gray-300" />
            </div>
            <button
               onClick={handleLogout}
               className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Table Map (Fixed width) */}
        <div className="w-[340px] shrink-0 animate-in fade-in slide-in-from-left duration-500">
          <TableList 
            selectedTableId={selectedTableId} 
            onTableSelect={handleTableSelect} 
          />
        </div>

        {/* Center: Menu (Flexible) */}
        <div className="flex-1 shrink flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-100">
           <MenuGrid />
        </div>

        {/* Right: Cart/Order (Fixed width) */}
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
             Branch: #01 - Quận 1
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
