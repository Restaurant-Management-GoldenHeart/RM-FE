import React from 'react';
import { Search, RefreshCw, X } from 'lucide-react';

/**
 * CustomerFilterBar - Search input and management controls
 * Design: High Contrast (Simple White & Gold)
 */
export const CustomerFilterBar = ({ 
  searchInput, 
  onSearchInputChange, 
  onSearchSubmit, 
  onRefresh, 
  onClear, 
  isFiltered, 
  loading 
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in">
      <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-[320px] group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Tìm theo tên, email, số điện thoại hoặc mã khách hàng..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all shadow-sm group-hover:border-gray-300"
        />
      </form>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          onClick={onSearchSubmit}
          className="px-6 py-3.5 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-gray-200 active:scale-95"
        >
          Tìm kiếm
        </button>

        {isFiltered && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all text-xs font-black uppercase tracking-widest active:scale-95"
          >
            <X className="w-4 h-4" />
            Xóa lọc
          </button>
        )}

        <div className="w-[1px] h-8 bg-gray-100 mx-2" />

        <button
          onClick={onRefresh}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100 transition-all shadow-sm active:scale-95 ${loading ? 'opacity-50' : ''}`}
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
