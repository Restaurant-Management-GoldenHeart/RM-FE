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
import React, { useEffect } from 'react';
import { usePOSAdapter } from '../hooks/adapters/usePOSAdapter';
import { useTableStore } from '../store/useTableStore';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  STAFF: 'Phục vụ',
  KITCHEN: 'Bếp trưởng',
};

const StaffPosPage = () => {
  const {
    menuItems, menuLoading, tablesLoading, currentOrderTarget,
    user, role,
    fetchInitialData, fetchTables, setCurrentOrderTarget,
    selectTable, setSelectedTableId,
    setOrder, refreshOrder, logout
  } = usePOSAdapter();
  
  const navigate = useNavigate();

  useEffect(() => {
    // Tải dữ liệu ban đầu
    fetchInitialData();
    // fetchTables sẽ tự động lấy branchId từ AuthStore nếu không truyền vào
    fetchTables();
  }, [fetchInitialData, fetchTables]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleTableSelect = ({ table, orderId, order }) => {
    const isTakeaway = table.tableNumber === 'Mang về';

    // 1. Cập nhật target hiện tại
    setCurrentOrderTarget({
      type: isTakeaway ? 'TAKEAWAY' : 'TABLE',
      id: table.id,
      name: isTakeaway ? (table.customerName || `Đơn ${table.id}`) : `Bàn ${table.tableNumber}`
    });

    if (isTakeaway) {
      // Takeaway: không dùng selectTable vì ID dạng 'MV1' không phải real table
      // Chỉ set selectedTableId vào store để CartStore dùng làm key
      setSelectedTableId(table.id);
      if (order) {
        setOrder(order);
      } else if (orderId) {
        refreshOrder(orderId);
      }
    } else {
      // Dìne-in: dùng selectTable bình thường (set selectedTableId + getActiveOrder từ BE)
      selectTable(table.id);
      if (order) {
        setOrder(order);
      }
    }

    console.log(`[POS] Selected Table: ${table.tableNumber}, OrderId: ${order?.id || orderId || 'loading...'}`);
  };

  const isLoading = (menuLoading || tablesLoading);

  if (isLoading && !menuItems.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
        <p className="text-gray-900 font-black text-xs uppercase tracking-[0.4em]">Đang đồng bộ dữ liệu POS</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] text-[#111827] overflow-hidden font-sans">
      {/* ── Main Layout ── */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left: Table Map (Fixed width) */}
        <div className="w-[340px] shrink-0">
          <TableList 
            currentOrderTarget={currentOrderTarget} 
            onTableSelect={handleTableSelect} 
          />
        </div>

        {/* Middle Panel — Menu */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-sm border border-gray-100/50 rounded-2xl">
          <MenuGrid isPOSView={true} />
        </div>

        {/* Right: Cart/Order (Fixed width) */}
        <div className="w-[440px] shrink-0">
           <CartPanel />
        </div>
      </main>
    </div>
  );
};

export default StaffPosPage;
