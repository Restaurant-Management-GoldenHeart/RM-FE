import { useState, useMemo } from 'react';
import { 
  Plus, Search, Building2, ChevronRight, Check, List, LayoutGrid, 
  RefreshCw, Package, TrendingDown, History, ChevronLeft, ChevronRight as ChevronRightIcon,
  TrendingUp, ArrowUpRight, ArrowDownRight, Filter, Download, MoreVertical, Layers, ArrowRight,
  User, AlertTriangle
} from 'lucide-react';
import { Listbox, Menu, Transition } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useInventory } from '../hooks/useInventory';
import { inventoryApi } from '../api/inventoryApi';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Components
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryMobileList from '../components/inventory/InventoryMobileList';
import InventoryFormModal from '../components/inventory/InventoryFormModal';
import RestockModal from '../components/inventory/RestockModal';
import InventoryHistoryModal from '../components/inventory/InventoryHistoryModal';
import LowStockAlert from '../components/inventory/LowStockAlert';
import PremiumConfirmModal from '../components/PremiumConfirmModal';

// Utils
const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ label, value, sub, accent, danger, trend, trendValue }) {
  return (
    <div className="bg-white p-3 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden min-w-0">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full blur-3xl opacity-10 ${accent ? 'bg-orange-400' : danger ? 'bg-red-400' : 'bg-blue-400'}`} />
      
      <div className="flex justify-between items-start mb-1.5 relative z-10 gap-1">
        <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] leading-tight min-w-0 line-clamp-2">{label}</p>
        {trend && (
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trendValue}%
          </div>
        )}
      </div>

      <div className="relative z-10 min-w-0 overflow-hidden">
        <h3 className={`text-base md:text-2xl font-black tracking-tight leading-tight break-all ${accent ? 'text-orange-500' : danger ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </h3>
      </div>
      <p className={`text-[8px] md:text-[10px] font-bold mt-1 md:mt-3 leading-relaxed relative z-10 line-clamp-2 ${danger && value > 0 ? 'text-red-500' : 'text-gray-400'}`}>{sub}</p>
    </div>
  );
}

export default function InventoryPage() {
  const { user, role } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
  const canEdit = ['ADMIN', 'MANAGER'].includes(role);

  const {
    items,
    summary,
    alerts,
    units,
    branches,
    loading,
    isFetching,
    branchesLoading,
    isSaving,
    isDeleting,
    error,
    pagination,
    todayMovement,
    filterBranchId,
    keyword,
    lowStockOnly,
    setLowStockOnly,
    handleSearch,
    handleBranchChange,
    handlePageChange,
    saveItem,
    deleteItem,
    refresh
  } = useInventory();

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);

  const onEdit = async (item) => {
    if (item && !item.unitId && (item.inventoryId || item.id)) {
      try {
        const res = await inventoryApi.getInventoryItemById(item.inventoryId || item.id);
        setSelectedItem(res.data);
      } catch (e) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(item);
    }
    setIsFormOpen(true);
  };

  const onRestock = (item) => {
    setSelectedItem(item);
    setIsRestockOpen(true);
  };

  const onDelete = (item) => {
    setItemToDelete(item);
  };

  const onConfirmDelete = async () => {
    if (itemToDelete) {
      const success = await deleteItem(itemToDelete.inventoryId || itemToDelete.id);
      if (success) setItemToDelete(null);
    }
  };

  const onFormSubmit = async (data) => {
    const success = await saveItem(data, selectedItem?.inventoryId || selectedItem?.id);
    if (success) {
      setIsFormOpen(false);
      setIsRestockOpen(false);
      setSelectedItem(null);
    }
  };

  const onViewHistory = (item) => {
    setSelectedItem(item);
    setIsHistoryOpen(true);
  };

  return (
    <div className="animate-fade-in pb-10">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-[#fafafb] -mx-4 px-4 py-3 mb-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10 shrink-0">
              <Package size={isMobile ? 18 : 22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">Kho Hàng</h1>
              <p className="hidden md:block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Inventory Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(loading || isFetching) && (
              <div className="w-9 h-9 flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-orange-500" />
              </div>
            )}
            {!isMobile && (
              <>
                <Link to="/inventory/history" className="h-9 px-4 rounded-xl bg-white border border-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-orange-600 hover:border-orange-100 transition-colors active:scale-95">
                  <History size={13} /> Lịch sử
                </Link>
                {canEdit && (
                  <>
                    <button
                      onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
                      className="h-9 px-4 bg-white border border-gray-100 text-gray-900 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-gray-50 transition-colors active:scale-95 uppercase tracking-widest"
                    >
                      <Plus size={13} /> Thêm NVL
                    </button>
                    <button
                      onClick={() => setLowStockOnly(true)}
                      className="h-9 px-4 bg-orange-500 text-white rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-orange-600 transition-colors active:scale-95 uppercase tracking-widest"
                    >
                      <TrendingUp size={13} /> Nhập hàng
                    </button>
                  </>
                )}
              </>
            )}
            {isMobile && (
              <button onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters" className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-gray-100 text-gray-400 active:scale-95">
                <Filter size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="space-y-4 md:space-y-6">
        {/* Statistics Section */}
        <section className={`grid grid-cols-2 ${isTablet ? 'grid-cols-2' : 'md:grid-cols-4'} gap-3 md:gap-5`}>
          <StatCard label="Tổng nguyên vật liệu" value={fmtNumber(summary.totalItems)} sub="Các loại nguyên liệu đang quản lý" />
          <StatCard label="Giá trị tồn kho" value={fmtCurrency(summary.totalInventoryValue)} accent sub="Tính theo giá vốn trung bình" trend="up" trendValue="12" />
          <StatCard label="Cảnh báo tồn kho" value={fmtNumber(summary.lowStockCount)} danger={summary.lowStockCount > 0} sub={summary.lowStockCount > 0 ? 'Cần nhập hàng ngay' : 'Tồn kho an toàn'} />
          <StatCard label="Nhập hàng hôm nay" value={fmtCurrency(todayMovement?.totalInValue || 0)} sub="Giá trị nhập kho trong ngày" accent />
        </section>

        {!isMobile && (
          <LowStockAlert 
            alerts={alerts} 
            onAction={(type, alert) => {
              if (type === 'restock') onRestock(alert);
              if (type === 'details') onViewHistory(alert);
            }} 
          />
        )}

        {/* Content Section */}
        <section className="bg-white rounded-2xl md:bg-white/70 md:backdrop-blur-xl md:rounded-[2.5rem] md:border md:border-white md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300">
          <div className="p-3 md:p-6 md:border-b md:border-white md:bg-white/40 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-5">
            {/* Search */}
            <div className="relative w-full md:flex-1 md:max-w-lg group">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="search" 
                placeholder="Tìm nguyên liệu..." 
                value={keyword} 
                onChange={(e) => handleSearch(e.target.value)} 
                className="w-full pl-9 pr-4 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl bg-white border border-gray-100 shadow-sm text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-colors" 
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              <button
                onClick={() => setLowStockOnly((v) => !v)}
                className={`h-9 md:h-11 px-3 md:px-5 rounded-xl md:rounded-2xl border text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-colors shrink-0 ${lowStockOnly ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-gray-100 text-gray-500'}`}
              >
                <TrendingDown size={13} /> Sắp hết
              </button>

              <button className="h-9 md:h-11 px-3 md:px-5 rounded-xl md:rounded-2xl bg-white border border-gray-100 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 text-gray-500 shrink-0">
                <Download size={13} /> Export
              </button>

              {!isMobile && (
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  <button onClick={() => setViewMode('table')} aria-label="View as Table" className={`p-2 md:p-2.5 rounded-xl transition-colors ${viewMode === 'table' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                    <List size={16} aria-hidden="true" />
                  </button>
                  <button onClick={() => setViewMode('grid')} aria-label="View as Grid" className={`p-2 md:p-2.5 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                    <LayoutGrid size={16} aria-hidden="true" />
                  </button>
                </div>
              )}

              {(loading || isFetching) && (
                <div className="w-11 md:w-12 h-11 md:h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shrink-0">
                  <RefreshCw size={16} className="animate-spin text-orange-500" />
                </div>
              )}
            </div>
          </div>

          {/* Table/List Area */}
          <div>
            {isMobile ? (
              <InventoryMobileList items={items} loading={loading && pagination.page === 0} onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} canEdit={canEdit} />
            ) : loading && pagination.page === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400">
                <RefreshCw size={32} className="animate-spin text-orange-500" />
                <span className="text-xs font-black uppercase tracking-widest">Đang tải dữ liệu...</span>
              </div>
            ) : (
              <InventoryTable items={items} onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} onRestock={onRestock} />
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 md:px-8 py-6 border-t border-white flex flex-col md:flex-row items-center justify-between bg-white/40 gap-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trang <span className="text-gray-900">{pagination.page + 1}</span> / <span className="text-gray-900">{pagination.totalPages}</span></p>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageChange(Math.max(0, pagination.page - 1))} disabled={pagination.page === 0} aria-label="Previous page" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronLeft size={18} aria-hidden="true" /></button>
                <button onClick={() => handlePageChange(Math.min(pagination.totalPages - 1, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages - 1} aria-label="Next page" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronRightIcon size={18} aria-hidden="true" /></button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button (Mobile Only) */}
      {isMobile && canEdit && (
        <div className="fixed bottom-20 right-4 z-50">
          <Menu as="div" className="relative">
            <Menu.Button aria-label="Open Actions" className="w-14 h-14 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.5)] active:scale-95 transition-transform">
              <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
            </Menu.Button>
            <Transition
              as="div"
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-90 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-90 translate-y-2"
              className="absolute bottom-16 right-0 mb-4 w-48"
            >
              <Menu.Items className="flex flex-col gap-2 items-end outline-none">
                <Menu.Item>
                  <button onClick={() => setIsFormOpen(true)} className="flex items-center justify-between w-full gap-3 px-4 py-3 bg-white rounded-2xl shadow-xl border border-gray-100 text-xs font-black uppercase tracking-widest">
                    Thêm NVL mới <Package size={14} />
                  </button>
                </Menu.Item>
                <Menu.Item>
                  <button onClick={() => setLowStockOnly(true)} className="flex items-center justify-between w-full gap-3 px-4 py-3 bg-orange-500 text-white rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest">
                    Nhập hàng ngay <TrendingUp size={14} />
                  </button>
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      )}



      {/* Modals */}
      <InventoryFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedItem(null); }}
        onSubmit={onFormSubmit}
        initialData={selectedItem}
        units={units}
        branches={branches}
        branchesLoading={branchesLoading}
        isLoading={isSaving}
      />

      <RestockModal 
        isOpen={isRestockOpen}
        onClose={() => { setIsRestockOpen(false); setSelectedItem(null); }}
        onSubmit={onFormSubmit}
        item={selectedItem}
        isLoading={isSaving}
      />
      
      <InventoryHistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => { setIsHistoryOpen(false); setSelectedItem(null); }} 
        selectedItem={selectedItem} 
      />

      <PremiumConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={onConfirmDelete}
        title="Xóa nguyên liệu"
        message="Bạn có chắc chắn muốn xóa nguyên liệu"
        highlightText={itemToDelete?.ingredientName || itemToDelete?.itemName || ''}
        note="Lưu ý: Chỉ có thể xóa nếu tồn kho bằng 0 và chưa dùng trong thực đơn nào."
        isLoading={isDeleting}
      />
    </div>
  );
}
