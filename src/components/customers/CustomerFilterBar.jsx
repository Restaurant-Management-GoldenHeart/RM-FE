import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * CustomerFilterBar - Search input and management controls
 * Design: High Contrast (Simple White & Gold)
 */
export const CustomerFilterBar = ({ 
  searchInput, 
  onSearchInputChange, 
  onSearchSubmit, 
  onClear, 
  isFiltered
}) => {
  return (
    <div className="space-y-3 mb-6 animate-fade-in">
      <form onSubmit={onSearchSubmit} className="relative w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Tìm tên, SĐT, mã KH..."
          className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-white border border-gray-200 rounded-xl md:rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all placeholder:text-gray-300 shadow-sm"
        />
        {searchInput && (
          <button 
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {isFiltered && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 flex items-center gap-2 px-4 py-2 md:py-2.5 rounded-full text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
};
