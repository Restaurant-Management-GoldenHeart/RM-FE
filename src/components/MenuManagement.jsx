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
import { usePosStore } from '../store/usePosStore'; // Lấy menuItems từ store gốc
import { cn } from '../utils/cn';
import { Search, Plus, UtensilsCrossed, Loader2, Frown, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const ProductCard = ({ product }) => {
  const selectedTableId = useTableStore(s => s.selectedTableId);
  const addItem         = useCartStore(s => s.addItem);
  const cartQty         = useCartStore(s => (s.draftItems[selectedTableId] ?? EMPTY_DRAFT).find(i => i.menuItemId === product.id)?.quantity ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAdd = () => {
    const table = useTableStore.getState().tables.find(t => t.id === selectedTableId);
    // Cho phép AVAILABLE, OCCUPIED và RESERVED (khách đặt trước đã check-in)
    // BE tự chuyển RESERVED → OCCUPIED khi order đầu tiên được tạo
    if (!selectedTableId || !['OCCUPIED', 'AVAILABLE', 'RESERVED'].includes(table?.status)) {
      toast.error('⚠️ Bàn chưa sẵn sàng phục vụ!');
      return;
    }

    addItem(selectedTableId, product);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <div
      onClick={handleAdd}
      className={cn(
        'group relative bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-500',
        'hover:shadow-2xl hover:shadow-gold-600/10 hover:border-gold-200 active:scale-95 cursor-pointer select-none',
        isAnimating && 'ring-2 ring-gold-500 ring-offset-2 scale-95'
      )}
    >
      <div className="aspect-[5/4] overflow-hidden bg-gray-50 relative">
        <img
          src={product.thumbnail || `https://placehold.co/400x320/f9fafb/94a3b8?text=${encodeURIComponent(product.name)}`}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          loading="lazy"
        />
        
        {cartQty > 0 && (
          <div className="absolute top-4 left-4 bg-gold-600 text-white text-[12px] font-black w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-gold-600/40 animate-in zoom-in duration-300">
            {cartQty}
          </div>
        )}

        <div className={cn(
          'absolute top-4 right-4 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl',
          isAnimating ? 'bg-gold-500 scale-125 rotate-90' : 'bg-white/90 backdrop-blur-md group-hover:bg-gold-600'
        )}>
          {isAnimating ? (
            <Check size={20} className="text-white" />
          ) : (
            <Plus size={20} className="text-gold-600 group-hover:text-white" />
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-1 mb-3">
          <span className="text-[10px] font-black text-gold-600 uppercase tracking-widest leading-none">
            {product.categoryName || 'Món ăn'}
          </span>
          <h4 className="font-black text-gray-900 line-clamp-2 min-h-[2.5rem] text-sm tracking-tight leading-tight group-hover:text-gold-700 transition-colors">
            {product.name}
          </h4>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <p className="font-black text-gray-900 text-base tabular-nums">{formatVND(product.price)}</p>
          <div className="flex items-center gap-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
            Thêm Ngay
          </div>
        </div>
      </div>
    </div>
  );
};

export const MenuGrid = () => {
  const menuItems   = usePosStore(s => s.menuItems);
  const categories  = usePosStore(s => s.categories);
  const menuLoading = usePosStore(s => s.menuLoading);
  
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchInput, setSearchInput]           = useState('');
  const [debouncedSearch, setDebouncedSearch]   = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const itemCatId = item.categoryId ?? item.category?.id;
      const matchesCategory = activeCategoryId === 'all' || itemCatId === activeCategoryId;
      const matchesSearch = !debouncedSearch.trim() || item.name.toLowerCase().includes(debouncedSearch.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategoryId, debouncedSearch]);

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
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 gap-6">
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

          <div className="relative group flex-1 max-w-sm">
            <Search className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
              debouncedSearch ? "text-gold-600" : "text-gray-300 group-focus-within:text-gold-500"
            )} size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-gold-300 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={cn(
              'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0',
              activeCategoryId === 'all' ? 'bg-gold-600 border-gold-600 text-white' : 'bg-white border-gray-100 text-gray-400'
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonProduct key={i} />)}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => <ProductCard key={item.id} product={item} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Frown size={48} className="text-gray-100 mb-4" />
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Không có món nào được tìm thấy</h3>
          </div>
        )}
      </div>
    </div>
  );
};
