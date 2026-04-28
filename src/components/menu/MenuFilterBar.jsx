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
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Tìm kiếm theo tên món ăn..."
          className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-white border border-gray-200 rounded-xl md:rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all placeholder:text-gray-300 shadow-sm"
        />
        {inputValue && (
          <button 
            onClick={() => setInputValue('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chip Filters (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button 
          onClick={() => onCategoryChange('')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            !categoryId 
              ? 'bg-gray-900 text-white shadow-md' 
              : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          Tất cả món
        </button>
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              categoryId === cat.id 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
