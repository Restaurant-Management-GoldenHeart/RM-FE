import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePosStore } from '../../store/usePosStore';

/**
 * Adapter Hook cho POS
 * Phân tách các global stores hiện tại.
 */
export const usePOSAdapter = () => {
  // Nhóm store menu, chỉ lo dữ liệu món và danh mục.
  const fetchInitialData = usePosStore(s => s.fetchInitialData);
  const menuLoading      = usePosStore(s => s.menuLoading);
  const menuItems        = usePosStore(s => s.menuItems);
  
  // Nhóm store bàn, chịu trách nhiệm danh sách bàn và target thao tác hiện tại.
  const fetchTables      = useTableStore(s => s.fetchTables);
  const fetchAreas       = useTableStore(s => s.fetchAreas);
  const selectTable      = useTableStore(s => s.selectTable);
  const setSelectedTableId = useTableStore(s => s.setSelectedTableId);
  const tablesLoading    = useTableStore(s => s.loading);
  const currentOrderTarget = useTableStore(s => s.currentOrderTarget);
  const setCurrentOrderTarget = useTableStore(s => s.setCurrentOrderTarget);
  
  // Nhóm store order để page POS đặt và refresh đơn đang mở mà không cần biết chi tiết backend.
  const setOrder = useOrderStore(s => s.setOrder);
  const refreshOrder = useOrderStore(s => s.refreshOrder);

  // Nhóm auth để page biết current user và role đang thao tác.
  const user   = useAuthStore(s => s.user);
  const role   = useAuthStore(s => s.role);
  const logout = useAuthStore(s => s.logout);

  return {
    // Data & State
    menuItems,
    menuLoading,
    tablesLoading,
    currentOrderTarget,
    user,
    role,
    
    // Actions
    fetchInitialData,
    fetchTables,
    fetchAreas,
    selectTable,
    setSelectedTableId,
    setCurrentOrderTarget,
    setOrder,
    refreshOrder,
    logout
  };
};
