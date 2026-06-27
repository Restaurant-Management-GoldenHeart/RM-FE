/**
 * MenuManagement.jsx — Quản lý hiển thị thực đơn và chọn món
 *
 * Nâng cấp:
 *   - Sử dụng useCartStore để quản lý món đang chọn.
 *   - Hiển thị badge số lượng món đang nằm trong giỏ (draft).
 *   - Hiệu ứng animation khi thêm món.
 *   - Tự động lọc theo Category và Tìm kiếm.
 *   - Tab Combo: chọn combo → tự động thêm tất cả món vào giỏ với giá đã giảm.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useCartStore, EMPTY_DRAFT } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { useBranchContext } from '../context/BranchContext';
import { useQuery } from '@tanstack/react-query';
import { comboApi } from '../api/comboApi';
import { cn } from '../utils/cn';
import { Search, Plus, UtensilsCrossed, Frown, Check, Package2 } from 'lucide-react';
import toast from 'react-hot-toast';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

const normalizeText = (value) => String(value ?? '').toLowerCase();
const getEffectiveStatus = (product) => product?.effectiveStatus || product?.status || 'OUT_OF_STOCK';
const isEffectivelyAvailable = (product) => {
  if (typeof product?.effectiveAvailable === 'boolean') {
    return product.effectiveAvailable;
  }
  return getEffectiveStatus(product) === 'AVAILABLE';
};

const ProductCard = ({ product }) => {
  const selectedTableId = useTableStore(s => s.selectedTableId);
  const addItem = useCartStore(s => s.addItem);
  const cartQty = useCartStore(s => (s.draftItems[selectedTableId] ?? EMPTY_DRAFT).find(i => i.menuItemId === product.id)?.quantity ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const available = isEffectivelyAvailable(product);

  const handleAdd = () => {
    if (!available) {
      toast.error('Món này đang hết hàng ở chi nhánh hiện tại.');
      return;
    }

    const table = useTableStore.getState().tables.find(t => t.id === selectedTableId);
    if (!selectedTableId || !['OCCUPIED', 'AVAILABLE', 'RESERVED'].includes(table?.status)) {
      toast.error('⚠️ Bàn chưa sẵn sàng phục vụ!');
      return;
    }

    addItem(selectedTableId, product);
    
    // Hiện thông báo số lượng món khi chọn
    toast.success(
      <div className="flex flex-col">
        <span className="font-bold text-sm">Đã chọn {product.name}</span>
        <span className="text-[11px] text-gray-500 font-medium">Số lượng: {cartQty + 1}</span>
      </div>, 
      {
        icon: '🛒',
        duration: 1500,
        style: {
          borderRadius: '12px',
          background: '#fff',
          color: '#111',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }
      }
    );

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      onClick={handleAdd}
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full',
        available ? 'active:scale-[0.98] cursor-pointer select-none transition-transform duration-150' : 'cursor-not-allowed opacity-60 grayscale-[0.15]',
        isAnimating && 'ring-2 ring-[#D4A017] ring-offset-1 scale-95'
      )}
    >
      {/* Image Area / Placeholder */}
      <div className="aspect-square w-full bg-[#f8f9fa] relative shrink-0 flex items-center justify-center overflow-hidden p-2">
        {product.imageUrl || product.thumbnail ? (
          <img
            src={product.imageUrl || product.thumbnail}
            alt={product.name}
            className="w-full h-full object-cover rounded-xl transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="text-xl md:text-2xl font-black text-gray-200 uppercase text-center leading-tight tracking-tighter w-full px-2 line-clamp-3 break-words">
            {product.name}
          </span>
        )}

        {/* Quantity Badge */}
        {cartQty > 0 && (
          <div className="absolute top-2 left-2 bg-[#D4A017] text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
            {cartQty}
          </div>
        )}
        {!available && (
          <div className="absolute inset-x-2 bottom-2 rounded-xl bg-red-600/90 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white">
            Hết hàng
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 md:p-4 flex-1 flex flex-col justify-between relative">
        <div>
          <span className="text-[9px] md:text-[10px] font-black text-[#D4A017] uppercase tracking-widest leading-none block truncate mb-1">
            {product.categoryName || 'Món ăn'}
          </span>
          <h4 className="font-black text-gray-900 line-clamp-2 text-xs md:text-sm tracking-tight leading-snug">
            {product.name}
          </h4>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <p className="font-black text-gray-900 text-xs md:text-sm tabular-nums">
            {formatVND(product.price)}
          </p>
        </div>

        {/* Add Button */}
        <div className={cn(
          'absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors',
          isAnimating
            ? 'bg-[#D4A017] text-white scale-110'
            : available
              ? 'bg-gray-50 border border-gray-100 text-gray-400 group-hover:border-[#D4A017] group-hover:text-[#D4A017]'
              : 'bg-gray-100 border border-gray-200 text-gray-300'
        )}>
          {isAnimating ? <Check size={14} /> : <Plus size={14} />}
        </div>
      </div>
    </div>
  );
};

// ─── Combo Card (POS) ─────────────────────────────────────────────────────────

const ComboCard = ({ combo }) => {
  const selectedTableId = useTableStore(s => s.selectedTableId);
  const addComboItems = useCartStore(s => s.addComboItems);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAdd = () => {
    const table = useTableStore.getState().tables.find(t => t.id === selectedTableId);
    if (!selectedTableId || !['OCCUPIED', 'AVAILABLE', 'RESERVED'].includes(table?.status)) {
      import('react-hot-toast').then(({ default: toast }) => toast.error('⚠️ Bàn chưa sẵn sàng phục vụ!'));
      return;
    }
    addComboItems(selectedTableId, combo);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      onClick={handleAdd}
      className={cn(
        'group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full cursor-pointer select-none active:scale-[0.98] transition-transform duration-150',
        isAnimating && 'ring-2 ring-[#D4A017] ring-offset-1 scale-95'
      )}
    >
      {/* Image */}
      <div className="aspect-square w-full bg-[#f8f9fa] relative shrink-0 flex items-center justify-center overflow-hidden p-2">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover rounded-xl" loading="lazy" />
        ) : (
          <Package2 className="w-10 h-10 text-gray-200" />
        )}
        <span className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
          -{combo.discountPct}%
        </span>
        {isAnimating && (
          <div className="absolute top-2 right-2 bg-[#D4A017] text-white w-6 h-6 rounded-full flex items-center justify-center">
            <Check size={12} />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[9px] md:text-[10px] font-black text-[#D4A017] uppercase tracking-widest block truncate mb-1">
            Combo · {combo.items?.length || 0} món
          </span>
          <h4 className="font-black text-gray-900 line-clamp-2 text-xs md:text-sm tracking-tight">{combo.name}</h4>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <p className="font-black text-gray-900 text-xs md:text-sm tabular-nums">
            {Number(combo.price || 0).toLocaleString('vi-VN')}₫
          </p>
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors',
            isAnimating ? 'bg-[#D4A017] text-white' : 'bg-gray-50 border border-gray-100 text-gray-400 group-hover:border-[#D4A017] group-hover:text-[#D4A017]'
          )}>
            {isAnimating ? <Check size={14} /> : <Plus size={14} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MenuGrid = () => {
  const menuItems = usePosStore(s => s.menuItems);
  const categories = usePosStore(s => s.categories);
  const menuLoading = usePosStore(s => s.menuLoading);
  const { selectedBranchId } = useBranchContext();

  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'combo'
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: combos = [], isLoading: combosLoading } = useQuery({
    queryKey: ['combos-pos', selectedBranchId],
    queryFn: () => comboApi.getCombos(selectedBranchId).then(r => r.data),
    enabled: !!selectedBranchId,
    staleTime: 60 * 1000,
  });

  const availableCombos = combos.filter(c => c.status === 'AVAILABLE');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const itemCatId = item.categoryId ?? item.category?.id;
      const matchesCategory = activeCategoryId === 'all' || itemCatId === activeCategoryId;
      const matchesSearch =
        !debouncedSearch.trim() ||
        normalizeText(item.name).includes(normalizeText(debouncedSearch).trim());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategoryId, debouncedSearch]);

  const SkeletonProduct = () => (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse flex flex-col h-full">
      <div className="aspect-square bg-gray-50" />
      <div className="p-3">
        <div className="h-2 bg-gray-100 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
        <div className="flex justify-between items-end">
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="w-6 h-6 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl md:rounded-3xl shadow-sm overflow-hidden pt-6 pb-2">
      {/* Header */}
      <div className="px-5 md:px-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#fdf8eb] flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-[#D4A017]" />
          </div>
          <div>
            <h2 className="font-black text-[#1A1A2E] text-lg tracking-tighter uppercase leading-none mb-1">Thực đơn</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Menu Selection</p>
          </div>
        </div>

        {/* Menu / Combo tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === 'menu' ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20' : 'bg-[#f8f9fa] text-gray-400 hover:text-gray-700'
            )}
          >
            <UtensilsCrossed size={12} /> Món ăn
          </button>
          <button
            onClick={() => setActiveTab('combo')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              activeTab === 'combo' ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20' : 'bg-[#f8f9fa] text-gray-400 hover:text-gray-700'
            )}
          >
            <Package2 size={12} /> Combo
            {availableCombos.length > 0 && (
              <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full', activeTab === 'combo' ? 'bg-white/30 text-white' : 'bg-[#D4A017]/10 text-[#D4A017]')}>
                {availableCombos.length}
              </span>
            )}
          </button>
        </div>

        {/* Search (chỉ hiển thị khi tab menu) */}
        {activeTab === 'menu' && (
          <>
            <div className="relative group">
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300",
                debouncedSearch ? "text-[#D4A017]" : "text-gray-300 group-focus-within:text-[#D4A017]"
              )} size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#f8f9fa] border border-gray-100 rounded-[1.25rem] text-sm font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:bg-white focus:border-[#D4A017] focus:ring-4 focus:ring-[#D4A017]/10 transition-all outline-none"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
              <button
                onClick={() => setActiveCategoryId('all')}
                className={cn(
                  'px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all shrink-0',
                  activeCategoryId === 'all'
                    ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20'
                    : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-200'
                )}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    'px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all shrink-0',
                    activeCategoryId === cat.id
                      ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20'
                      : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-200'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-5 md:px-6 mt-4 no-scrollbar pb-6">
        {activeTab === 'combo' ? (
          combosLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonProduct key={i} />)}
            </div>
          ) : availableCombos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
              {availableCombos.map(combo => <ComboCard key={combo.id} combo={combo} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center opacity-60">
              <Package2 size={40} className="text-gray-300 mb-3" />
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Chưa có combo nào</h3>
            </div>
          )
        ) : menuLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonProduct key={i} />)}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {filteredItems.map(item => <ProductCard key={item.id} product={item} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center opacity-60">
            <Frown size={40} className="text-gray-300 mb-3" />
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Không có món nào</h3>
          </div>
        )}
      </div>
    </div>
  );
};
