import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePOSAdapter } from '../../hooks/adapters/usePOSAdapter';
import { useBranchContext } from '../../context/BranchContext';
import { TableList } from '../../components/pos/TableManagement';
import { MenuGrid } from '../../components/pos/MenuManagement';
import { CartPanel } from '../../components/pos/CartManagement';

const StaffPosPage = () => {
  const { selectedBranchId } = useBranchContext();
  const {
    menuItems,
    menuLoading,
    tablesLoading,
    currentOrderTarget,
    fetchInitialData,
    fetchTables,
    fetchAreas,
    setCurrentOrderTarget,
    selectTable,
    setOrder,
    refreshOrder,
  } = usePOSAdapter();

  useEffect(() => {
    fetchInitialData(selectedBranchId);
    fetchAreas(selectedBranchId);
    fetchTables(selectedBranchId);
  }, [fetchAreas, fetchInitialData, fetchTables, selectedBranchId]);

  const handleTableSelect = ({ table, orderId, order }) => {
    setCurrentOrderTarget({
      type: 'TABLE',
      id: table.id,
      name: `Bàn ${table.tableNumber}`,
    });

    selectTable(table.id);
    if (order) {
      setOrder(order);
    } else if (orderId) {
      refreshOrder(orderId);
    }

    const orderInfo = order?.id || orderId;
    console.log(`[POS] Selected Table: ${table.tableNumber}, Status: ${table.status}, OrderId: ${orderInfo || 'NONE'}`);
  };

  const isLoading = menuLoading || tablesLoading;

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
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="w-[340px] shrink-0">
          <TableList
            currentOrderTarget={currentOrderTarget}
            onTableSelect={handleTableSelect}
          />
        </div>

        <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-sm border border-gray-100/50 rounded-2xl">
          <MenuGrid isPOSView={true} />
        </div>

        <div className="w-[440px] shrink-0">
          <CartPanel />
        </div>
      </main>
    </div>
  );
};

export default StaffPosPage;
