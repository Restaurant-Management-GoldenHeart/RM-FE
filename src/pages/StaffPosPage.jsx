import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, LayoutGrid, UtensilsCrossed, ShoppingCart, ChefHat, ArrowLeftRight, X } from 'lucide-react';
import { useBranchContext, BRANCH_ALL } from '../context/BranchContext';
import { TableList } from '../components/TableManagement';
import { MenuGrid } from '../components/MenuManagement';
import { CartPanel } from '../components/CartManagement';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { useTableStore } from '../store/useTableStore';
import { useCartStore, EMPTY_DRAFT } from '../store/useCartStore';
import { cn } from '../utils/cn';

// ── Stable selectors (rerender-defer-reads) ──────────────────────────────────
const selectFetchInitialData = (s) => s.fetchInitialData;
const selectMenuLoading      = (s) => s.menuLoading;
const selectMenuItems        = (s) => s.menuItems;
const selectFetchTables      = (s) => s.fetchTables;
const selectTablesLoading    = (s) => s.loading;
const selectSelectedTableId  = (s) => s.selectedTableId;
const selectUser             = (s) => s.user;
const selectDraftItems       = (s) => s.draftItems;
const selectIsSending        = (s) => s.isSending;
const selectIsCheckingStock  = (s) => s.isCheckingStock;
const selectSendToKitchen    = (s) => s.sendToKitchen;

// ── Mobile Tab Config ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'tables', label: 'Bàn ăn',   Icon: LayoutGrid },
  { id: 'menu',   label: 'Thực đơn', Icon: UtensilsCrossed },
  { id: 'cart',   label: 'Giỏ hàng', Icon: ShoppingCart },
];

const formatVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n ?? 0);

// ── Loading Screen ────────────────────────────────────────────────────────────
function PosLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#fafafb] space-y-6">
      <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-gray-100 animate-pulse">
        <Loader2 className="w-10 h-10 text-gold-600 animate-spin" aria-hidden="true" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-gray-900 font-black text-xs uppercase tracking-[0.4em]">
          Đang đồng bộ dữ liệu POS…
        </p>
        <p className="text-gray-300 font-bold text-[10px] uppercase tracking-widest leading-none">
          Hệ thống đang sẵn sàng…
        </p>
      </div>
    </div>
  );
}




// ── Mobile Floating Tab Switcher ──────────────────────────────────────────────
function FloatingTabSwitcher({ activeTab, onTabChange, cartCount, selectedTableId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden animate-in fade-in duration-200" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      <div className="fixed right-5 bottom-[90px] z-50 flex flex-col items-end gap-3 lg:hidden">
        {/* Expanded options */}
        <div className={cn(
          "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
          isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none absolute bottom-0 right-0"
        )}>
          {TABS.map(({ id, label, Icon }) => {
             const isActive = activeTab === id;
             const showBadge = id === 'cart' && cartCount > 0;
             return (
               <button
                 key={id}
                 onClick={() => {
                   onTabChange(id);
                   setIsOpen(false);
                 }}
                 className={cn(
                   "flex items-center justify-between w-48 px-4 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest transition-all",
                   isActive ? "bg-amber-500 text-white" : "bg-white border border-gray-100 text-gray-900"
                 )}
               >
                 <span>{label}</span>
                 <div className="relative">
                   <Icon size={16} aria-hidden="true" />
                   {showBadge && (
                     <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                       {cartCount}
                     </span>
                   )}
                 </div>
               </button>
             );
          })}
        </div>
        
        {/* Main Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 bg-amber-500 text-white rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.4)] transition-all z-50"
        >
          <div className={cn("transition-transform duration-300", isOpen ? "rotate-90 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100")}>
            <LayoutGrid size={28} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className={cn("transition-transform duration-300", isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 absolute")}>
             <X size={28} strokeWidth={2.5} aria-hidden="true" />
          </div>

          {/* Badge when closed */}
          {!isOpen && cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-[2px] border-white shadow-sm leading-none">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const StaffPosPage = () => {
  const fetchInitialData = usePosStore(selectFetchInitialData);
  const menuLoading      = usePosStore(selectMenuLoading);
  const menuItems        = usePosStore(selectMenuItems);
  const fetchTables      = useTableStore(selectFetchTables);
  const tablesLoading    = useTableStore(selectTablesLoading);
  const selectedTableId  = useTableStore(selectSelectedTableId);
  const tables           = useTableStore((s) => s.tables);
  const user             = useAuthStore(selectUser);
  const { selectedBranchId, isInitialized: isBranchReady, branches } = useBranchContext();

  // Cart store
  const allDrafts       = useCartStore(selectDraftItems);
  const isSending       = useCartStore(selectIsSending);
  const isCheckingStock = useCartStore(selectIsCheckingStock);
  const sendToKitchen   = useCartStore(selectSendToKitchen);

  const [activeTab, setActiveTab] = useState('tables');

  // Draft count & total for the summary bar
  const { draftCount, draftTotal } = useMemo(() => {
    const items = selectedTableId ? (allDrafts[selectedTableId] ?? EMPTY_DRAFT) : EMPTY_DRAFT;
    return {
      draftCount: items.reduce((sum, i) => sum + i.quantity, 0),
      draftTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    };
  }, [allDrafts, selectedTableId]);

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
    setActiveTab('menu'); // Tự chuyển sang menu sau khi chọn bàn
  };

  const handleSendToKitchen = async () => {
    if (!selectedTableId) return;
    await sendToKitchen({ tableId: selectedTableId });
  };

  const isInitialLoading = (menuLoading || tablesLoading) && menuItems.length === 0;
  if (isInitialLoading) return <PosLoadingScreen />;

  const branchName = branches?.find(b => b.id === selectedBranchId)?.name || 'Tất cả chi nhánh';

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#111827] overflow-hidden font-sans">

      {/* ── DESKTOP: 3-panel layout (≥1024px) ─────────────────────────────── */}
      <main className="hidden lg:flex flex-1 overflow-hidden p-3 gap-3">
        <div className="w-[260px] xl:w-[290px] shrink-0 flex flex-col">
          <TableList selectedTableId={selectedTableId} onTableSelect={handleTableSelect} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <MenuGrid />
        </div>
        <div className="w-[320px] xl:w-[360px] shrink-0 flex flex-col">
          <CartPanel />
        </div>
      </main>

      {/* ── MOBILE: Tab-based layout (<1024px) ──────────────────────────────── */}
      <div className="lg:hidden flex-1 overflow-hidden flex flex-col pb-32">
        <div className="flex-1 overflow-hidden relative">
          {/* Table tab panel */}
          <div
            role="tabpanel"
            id="tab-panel-tables"
            aria-label="Bàn ăn"
            className={cn('absolute inset-0 overflow-hidden p-3', activeTab !== 'tables' && 'hidden')}
          >
            <TableList selectedTableId={selectedTableId} onTableSelect={handleTableSelect} />
          </div>

          {/* Menu tab panel */}
          <div
            role="tabpanel"
            id="tab-panel-menu"
            aria-label="Thực đơn"
            className={cn('absolute inset-0 overflow-hidden flex flex-col', activeTab !== 'menu' && 'hidden')}
          >
            <div className="flex-1 overflow-hidden mt-2">
              <MenuGrid />
            </div>
          </div>

          {/* Cart tab panel */}
          <div
            role="tabpanel"
            id="tab-panel-cart"
            aria-label="Giỏ hàng"
            className={cn('absolute inset-0 overflow-hidden p-3', activeTab !== 'cart' && 'hidden')}
          >
            <CartPanel />
          </div>
        </div>
      </div>

      {/* ── Mobile Floating Tab Switcher ───────────────────────────────────── */}
      <FloatingTabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={draftCount}
        selectedTableId={selectedTableId}
      />
    </div>
  );
};

export default StaffPosPage;
