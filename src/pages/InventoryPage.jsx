import { useState } from 'react';
import { Plus, Search, Loader2, Package, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useInventory } from '../hooks/useInventory';

// Sub-components
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryFormModal from '../components/inventory/InventoryFormModal';
import InventoryHistoryModal from '../components/inventory/InventoryHistoryModal';
import LowStockAlert from '../components/inventory/LowStockAlert';

/**
 * InventoryPage - Quản Lý Kho (High Contrast Light Theme)
 * @description Refactored version using Clean Architecture (Custom Hook) and Production UI standards.
 */
export default function InventoryPage() {
  const { role } = useAuthStore();
  const canEdit = ['ADMIN', 'MANAGER'].includes(role);

  // --- Logic via Custom Hook ---
  const {
    inventoryList,
    totalPages,
    unitsList,
    alertsList,
    page,
    searchInput,
    isLoading,
    isFetching,
    isSaving,
    setPage,
    setSearchInput,
    handleFormSubmit,
    handleDelete,
    refresh
  } = useInventory();

  // --- Main UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- Modal Handlers ---
  const handleOpenCreate = () => {
    if (!canEdit) return;
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (!canEdit) return;
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleOpenHistory = (item) => {
    setSelectedItem(item);
    setIsHistoryOpen(true);
  };

  const onFormSubmit = async (formData) => {
    const selectedId = selectedItem ? (selectedItem.inventoryId || selectedItem.id) : null;
    try {
      await handleFormSubmit(formData, selectedId);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Submit Error handled by Modal:', err);
      // Let the modal's internal try/catch handle state display
      throw err; // Propagate to Modal's try/catch
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Package className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
              Quản lý Kho
            </h1>
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              Hệ thống vật tư 
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {isFetching ? 'Đang cập nhật...' : `${inventoryList.length} mặt hàng hiển thị`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box with Debounce */}
          <div className="relative flex-1 min-w-[300px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm nguyên liệu (tự động lọc)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-sm group-hover:border-gray-300"
            />
          </div>

          <button
            onClick={refresh}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm active:scale-95"
            title="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {canEdit && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* 2. Passive Information (Alerts) */}
      <div className="animate-slide-up">
        <LowStockAlert alerts={alertsList} />
      </div>

      {/* 3. Main Data Table Container */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-gray-50/50">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest">Đang tải kho vận...</h3>
            <p className="text-gray-400 text-xs mt-1">Hệ thống đang đồng bộ dữ liệu tồn kho hiện tại.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <InventoryTable
                items={inventoryList}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                onViewHistory={handleOpenHistory}
              />
            </div>

            {/* Pagination UI - High Contrast Light Style */}
            {totalPages > 1 && (
              <div className="px-8 py-6 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  Trang {page + 1} / {totalPages} (Tổng {inventoryList.length} items)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 font-black text-xs uppercase tracking-widest hover:border-amber-500 hover:text-amber-600 disabled:opacity-30 transition-all active:scale-95"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 font-black text-xs uppercase tracking-widest hover:border-amber-500 hover:text-amber-600 disabled:opacity-30 transition-all active:scale-95"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Modals (Maintained standard prop structure but ready for theme sync) */}
      <InventoryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={onFormSubmit}
        initialData={selectedItem}
        units={unitsList}
        isLoading={isSaving}
      />

      <InventoryHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        selectedItem={selectedItem}
      />
    </div>
  );
}
