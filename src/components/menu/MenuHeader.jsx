import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

/**
 * MenuHeader - Page title and primary actions
 * Aesthetic: Simple White & Gold
 */
export function MenuHeader({ loading, onRefresh, onAdd, isAdmin }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Menu</h1>
        <p className="text-gray-500 text-sm mt-1">
          Thiết lập danh mục món ăn và định lượng nguyên liệu cho nhà hàng.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {isAdmin && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/20 active:scale-95 group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Thêm món mới</span>
          </button>
        )}
      </div>
    </div>
  );
}
