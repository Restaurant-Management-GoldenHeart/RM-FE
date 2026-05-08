import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePosStore } from '../../store/usePosStore';

/**
 * Adapter Hook cho POS
 * Phân tách các global stores hiện tại.
 */
export const usePOSAdapter = () => {
  const fetchInitialData = usePosStore(s => s.fetchInitialData);
  const menuLoading      = usePosStore(s => s.menuLoading);
  const menuItems        = usePosStore(s => s.menuItems);
  
  const fetchTables      = useTableStore(s => s.fetchTables);
  const selectTable      = useTableStore(s => s.selectTable);
  const setSelectedTableId = useTableStore(s => s.setSelectedTableId);
  const tablesLoading    = useTableStore(s => s.loading);
  const currentOrderTarget = useTableStore(s => s.currentOrderTarget);
  const setCurrentOrderTarget = useTableStore(s => s.setCurrentOrderTarget);
  
  const setOrder = useOrderStore(s => s.setOrder);
  const refreshOrder = useOrderStore(s => s.refreshOrder);

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
    selectTable,
    setSelectedTableId,
    setCurrentOrderTarget,
    setOrder,
    refreshOrder,
    logout
  };
};
