import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useBranchContext, BRANCH_ALL } from '../context/BranchContext';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { useTableStore } from '../store/useTableStore';

const StaffPosPage = () => {
  const fetchInitialData = usePosStore((state) => state.fetchInitialData);
  const menuLoading = usePosStore((state) => state.menuLoading);
  const menuItems = usePosStore((state) => state.menuItems);

  const fetchTables = useTableStore((state) => state.fetchTables);
  const tablesLoading = useTableStore((state) => state.loading);
  const selectedTableId = useTableStore((state) => state.selectedTableId);

  const user = useAuthStore((state) => state.user);
  const { selectedBranchId, isInitialized: isBranchReady } = useBranchContext();

  useEffect(() => {
    if (!user || !isBranchReady) return;

    const branchId = selectedBranchId && selectedBranchId !== BRANCH_ALL
      ? selectedBranchId
      : (user.branchId ?? null);

    fetchInitialData(branchId);
    fetchTables(branchId);
  }, [fetchInitialData, fetchTables, isBranchReady, selectedBranchId, user]);

  const handleTableSelect = (tableId) => {
    useTableStore.getState().selectTable(tableId);
    console.log(`[POS] Chọn bàn: ${tableId}`);
  };

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
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="w-[340px] shrink-0 animate-in fade-in slide-in-from-left duration-500">
          <TableList
            selectedTableId={selectedTableId}
            onTableSelect={handleTableSelect}
          />
        </div>

        <div className="flex-1 shrink flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-100">
          <MenuGrid />
        </div>

        <div className="w-[440px] shrink-0 animate-in fade-in slide-in-from-right duration-500 delay-200">
          <CartPanel />
        </div>
      </main>

      <footer className="h-10 bg-white border-t border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Server: Online
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            Branch: #{selectedBranchId ?? user?.branchId ?? '--'}
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
