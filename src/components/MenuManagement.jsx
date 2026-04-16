/**
 * MenuManagement.jsx — Quản lý hiển thị thực đơn và chọn món
 *
 * Nâng cấp:
 *   - Sử dụng useCartStore để quản lý món đang chọn.
 *   - Hiển thị badge số lượng món đang nằm trong giỏ (draft).
 *   - Hiệu ứng animation khi thêm món.
 *   - Tự động lọc theo Category và Tìm kiếm.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useCartStore, selectItemQtyInDraft, EMPTY_DRAFT } from '../store/useCartStore';
import { useMenuStore } from '../store/useMenuStore';
import { cn } from '../utils/cn';
import { Search, Plus, UtensilsCrossed, Loader2, Frown, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import MenuItemCard from './pos/MenuItemCard';
import { useAuthStore } from '../store/useAuthStore';
import { MenuFormModal } from './menu/MenuFormModal';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const ProductCardWrapper = ({ product, onEdit, onDelete, isPOSView }) => {
  const currentOrderTarget = useTableStore(s => s.currentOrderTarget);
  const addItem         = useCartStore(s => s.addItem);
  const role            = useAuthStore(s => s.role);
  const isAdmin         = role === 'ADMIN';

  const handleAdd = () => {
    if (!currentOrderTarget.id) {
      toast.error('⚠️ Vui lòng chọn bàn hoặc đơn mang về trước khi thêm món!');
      return;
    }
    addItem(currentOrderTarget.id, product);
  };

  return (
    <MenuItemCard 
      product={product}
      onAdd={handleAdd}
      onEdit={() => onEdit(product)}
      onDelete={() => onDelete(product)}
      isAdmin={isAdmin}
      isPOSView={isPOSView}
    />
  );
};

export const MenuGrid = ({ isPOSView = false }) => {
  const {
    menuItems,
    categories,
    loading: menuLoading,
    fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
  } = useMenuStore();

  const role = useAuthStore(s => s.role);
  const isAdmin = role === 'ADMIN';

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  // Dummy branches & ingredients for the modal since useMenu was removed
  const branches = [{ id: 1, name: 'Golden Heart Branch 1' }];
  const ingredients = []; 

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleSave = async (payload) => {
    try {
      if (editItem) {
        await updateMenuItem(editItem.id, payload);
      } else {
        await addMenuItem(payload);
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (product) => {
    try {
      await deleteMenuItem(product.id);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Filter Logic ───────────────────────────────────────────────────────
  
  const filteredItems = useMemo(() => {
    let result = menuItems || [];
    if (activeCategoryId && activeCategoryId !== 'all') {
      result = result.filter(item => (item.categoryId ?? item.category?.id) === activeCategoryId);
    }
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      result = result.filter(item => 
        item.name?.toLowerCase().includes(q) || 
        item.categoryName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [menuItems, activeCategoryId, searchInput]);

  const SkeletonProduct = () => (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-50 animate-pulse">
      <div className="aspect-[5/4] bg-gray-100" />
      <div className="p-5">
        <div className="h-3 bg-gray-100 rounded w-1/4 mb-2" />
        <div className="h-5 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="flex justify-between">
          <div className="h-6 bg-gray-100 rounded w-1/3" />
          <div className="w-8 h-8 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 gap-6 relative">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-gold-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg tracking-tight uppercase">Thực đơn</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Menu Selection</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
            {isAdmin && !isPOSView && (
              <button 
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gold-200 text-gold-600 font-black text-[10px] uppercase tracking-widest hover:bg-gold-50 transition-all shrink-0"
              >
                <Plus size={14} />
                Thêm món
              </button>
            )}
            <div className="relative flex-1 max-w-sm group">
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
                searchInput ? "text-gold-600" : "text-gray-300 group-focus-within:text-gold-500"
              )} size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-gold-300 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={cn(
              'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0',
              activeCategoryId === 'all' || activeCategoryId === '' ? 'bg-gold-600 border-gold-600 text-white' : 'bg-white border-gray-100 text-gray-400'
            )}
          >
            Tất cả
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0',
                activeCategoryId === cat.id ? 'bg-gold-600 border-gold-600 text-white' : 'bg-white border-gray-100 text-gray-400'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar pb-6">
        {menuLoading ? (
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonProduct key={i} />)}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {filteredItems.map(item => (
              <ProductCardWrapper 
                key={item.id} 
                product={item} 
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
                isPOSView={isPOSView}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Frown size={48} className="text-gray-100 mb-4" />
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Không có món nào được tìm thấy</h3>
          </div>
        )}
      </div>

      {showModal && (
        <MenuFormModal 
          item={editItem}
          categories={categories}
          branches={branches}
          ingredients={ingredients}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          saving={false}
        />
      )}
    </div>
  );
};
