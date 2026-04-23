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
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 group overflow-hidden relative"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-150 ${accent ? 'bg-orange-400' : danger ? 'bg-red-400' : 'bg-blue-400'}`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{label}</p>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendValue}%
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <h3 className={`text-4xl font-black tracking-tighter ${accent ? 'text-orange-500' : danger ? 'text-red-600' : 'text-gray-900'} group-hover:scale-105 transition-transform origin-left duration-500`}>
          {value}
        </h3>
      </div>
      <p className={`text-[10px] font-bold mt-4 leading-relaxed relative z-10 ${danger && value > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>{sub}</p>
    </motion.div>
  );
}

export default function InventoryPage() {
  const { user, role } = useAuthStore();
  const isMobile = useMediaQuery('(max-width: 640px)');
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
    <div className={`min-h-screen bg-[#FDFCFB] ${isMobile ? 'pb-32' : 'pb-20'}`}>
      <header className="bg-white/40 backdrop-blur-md border-b border-white sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-20 md:h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-900 rounded-2xl md:rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-gray-900/20 group transition-all duration-500 hover:rotate-12">
              <Package size={isMobile ? 20 : 28} className="text-white transition-transform group-hover:scale-110" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter leading-none">Kho Hàng</h1>
              <p className="hidden md:flex text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 items-center gap-2">
                Inventory Management <span className="w-1 h-1 rounded-full bg-orange-400" /> System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {!isMobile && (
              <>
                <Link to="/inventory/history" className="h-11 px-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_8px_rgb(0,0,0,0.02)] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:text-orange-600 hover:border-orange-100 hover:bg-orange-50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-95 group">
                  <History size={14} className="group-hover:rotate-12 transition-transform" /> Lịch sử
                </Link>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedItem(null); setIsFormOpen(true); }} 
                      className="h-11 px-5 bg-white border border-gray-100 text-gray-900 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-gray-50 transition-all duration-300 hover:-translate-y-0.5 shadow-sm active:scale-95 uppercase tracking-[0.2em]"
                    >
                      <Plus size={14} /> Thêm NVL mới
                    </button>
                    <button 
                      onClick={() => setLowStockOnly(true)} 
                      className="h-11 px-6 bg-orange-500 text-white rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-orange-600 transition-all duration-300 hover:-translate-y-0.5 shadow-xl shadow-orange-500/20 active:scale-95 uppercase tracking-[0.2em] group"
                    >
                      <TrendingUp size={14} className="group-hover:translate-x-1 transition-transform" /> Nhập hàng ngay
                    </button>
                  </div>
                )}
              </>
            )}
            {isMobile && (
              <button onClick={() => setShowFilters(!showFilters)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-gray-100 text-gray-400">
                <Filter size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto px-4 md:px-6 pt-6 md:pt-8 space-y-6">
        {/* Statistics Section */}
        <section className={`grid grid-cols-1 ${isTablet ? 'grid-cols-2' : 'md:grid-cols-4'} gap-4 md:gap-5`}>
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
        <section className="bg-white/70 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 relative">
          <div className="p-4 md:p-6 border-b border-white bg-white/40 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-5">
            {/* Search */}
            <div className="relative flex-1 max-w-lg group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="search" 
                placeholder="Tìm nguyên liệu theo tên..." 
                value={keyword} 
                onChange={(e) => handleSearch(e.target.value)} 
                className="w-full pl-12 pr-5 py-3 md:py-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all" 
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <button
                onClick={() => setLowStockOnly((v) => !v)}
                className={`h-11 md:h-12 px-4 md:px-5 rounded-2xl border text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all shrink-0 ${lowStockOnly ? 'bg-red-50 border-red-100 text-red-600 shadow-sm' : 'bg-white border-gray-100 text-gray-500'}`}
              >
                <TrendingDown size={14} /> Sắp hết
              </button>

              <button className="h-11 md:h-12 px-4 md:px-5 rounded-2xl bg-white border border-gray-100 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 text-gray-500 shrink-0">
                <Download size={14} /> Export
              </button>

              {!isMobile && (
                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                  <button onClick={() => setViewMode('table')} className={`p-2 md:p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                    <List size={16} />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-2 md:p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-orange-50 text-orange-600' : 'text-gray-400'}`}>
                    <LayoutGrid size={16} />
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
          <div className="p-4 md:p-0">
            {loading && pagination.page === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 text-gray-400">
                <RefreshCw size={32} className="animate-spin text-orange-500" />
                <span className="text-xs font-black uppercase tracking-widest">Đang tải dữ liệu...</span>
              </div>
            ) : isMobile ? (
              <InventoryMobileList items={items} onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} canEdit={canEdit} />
            ) : (
              <InventoryTable items={items} onEdit={onEdit} onDelete={onDelete} onViewHistory={onViewHistory} onRestock={onRestock} />
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 md:px-8 py-6 border-t border-white flex flex-col md:flex-row items-center justify-between bg-white/40 gap-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trang <span className="text-gray-900">{pagination.page + 1}</span> / <span className="text-gray-900">{pagination.totalPages}</span></p>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePageChange(Math.max(0, pagination.page - 1))} disabled={pagination.page === 0} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30"><ChevronLeft size={18} /></button>
                <button onClick={() => handlePageChange(Math.min(pagination.totalPages - 1, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages - 1} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-500 disabled:opacity-30"><ChevronRightIcon size={18} /></button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Floating Action Button (Mobile Only) */}
      {isMobile && canEdit && (
        <div className="fixed bottom-24 right-6 z-50">
          <Menu as="div" className="relative">
            <Menu.Button className="w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
              <Plus size={24} />
            </Menu.Button>
            <Transition
              as={motion.div}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-16 right-0 mb-4 space-y-3 w-48"
            >
              <Menu.Items className="flex flex-col gap-2 items-end">
                <Menu.Item>
                  <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl shadow-xl border border-gray-100 text-xs font-black uppercase tracking-widest">
                    Thêm NVL mới <Package size={14} />
                  </button>
                </Menu.Item>
                <Menu.Item>
                  <button onClick={() => setLowStockOnly(true)} className="flex items-center gap-3 px-4 py-3 bg-orange-500 text-white rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest">
                    Nhập hàng ngay <TrendingUp size={14} />
                  </button>
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      )}

      {/* Bottom Navigation (Mobile Only) */}
      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 h-20 px-6 flex items-center justify-between z-[100]">
          <Link to="/" className="flex flex-col items-center gap-1 text-gray-400"><Layers size={20} /><span className="text-[8px] font-black uppercase">Menu</span></Link>
          <Link to="/inventory" className="flex flex-col items-center gap-1 text-orange-500"><Package size={20} /><span className="text-[8px] font-black uppercase">Kho</span></Link>
          <div className="w-12" /> {/* Space for FAB */}
          <Link to="/inventory/history" className="flex flex-col items-center gap-1 text-gray-400"><History size={20} /><span className="text-[8px] font-black uppercase">Lịch sử</span></Link>
          <Link to="/profile" className="flex flex-col items-center gap-1 text-gray-400"><User size={20} /><span className="text-[8px] font-black uppercase">Hồ sơ</span></Link>
        </nav>
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
