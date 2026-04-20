import React, { useState, useEffect, useDeferredValue } from 'react';
import { Search, Filter, ChevronDown, X } from 'lucide-react';

/**
 * MenuFilterBar - Search and Filter controls
 * Performance: Uses useDeferredValue for input optimization
 */
export function MenuFilterBar({ keyword, onSearch, categoryId, onCategoryChange, categories = [] }) {
  const [inputValue, setInputValue] = useState(keyword);
  const deferredKeyword = useDeferredValue(inputValue);

  // Sync deferred value to parent
  useEffect(() => {
    onSearch(deferredKeyword);
  }, [deferredKeyword, onSearch]);

  const handleClear = () => {
    setInputValue('');
    onCategoryChange('');
  };

  const isFiltered = keyword || categoryId;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[280px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Tìm kiếm theo tên món ăn..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all"
        />
      </div>

      {/* Category Filter */}
      <div className="relative min-w-[200px]">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full pl-11 pr-10 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all appearance-none cursor-pointer"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Clear Filter */}
      {isFiltered && (
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all text-sm font-bold active:scale-95"
        >
          <X className="w-4 h-4" />
          <span>Xóa lọc</span>
        </button>
      )}
    </div>
  );
}
