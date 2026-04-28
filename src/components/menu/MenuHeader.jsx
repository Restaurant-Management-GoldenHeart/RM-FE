import React from 'react';
import { Plus, RefreshCw, UtensilsCrossed } from 'lucide-react';

/**
 * MenuHeader - Page title and primary actions
 * Aesthetic: Simple White & Gold
 */
export function MenuHeader({ loading, onRefresh, onAdd, onAddCategory, isAdmin }) {
  return (
    <div className="flex items-center justify-between gap-4 md:px-0">
      <div className="flex items-center gap-4 md:gap-5">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
          <UtensilsCrossed className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
            Thực đơn
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 md:mt-2">
            Restaurant Menu
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {isAdmin && (
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onAddCategory}
              className="flex items-center gap-2 px-6 py-3.5 bg-white border border-gray-100 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span>Thêm danh mục</span>
            </button>
            <button
              onClick={onAdd}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <span>Thêm món mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
