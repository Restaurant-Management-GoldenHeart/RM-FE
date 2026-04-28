import React from 'react';
import { Plus, Users, RefreshCw } from 'lucide-react';

/**
 * CustomerHeader - Title and primary actions for Customer Management
 * Design: High Contrast (Simple White & Gold)
 */
export const CustomerHeader = ({ onAdd, count, loading, isAdmin, onRefresh }) => {
  return (
    <div className="flex items-center justify-between gap-4 md:px-0 mb-2 mt-2 md:mt-0 md:mb-6">
      <div className="flex items-center gap-4 md:gap-5">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <Users className="text-white w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
            Khách hàng
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 md:mt-2">
            Customer Management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {isAdmin && (
          <button
            onClick={onAdd}
            className="hidden md:flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-gray-900/10 active:scale-95 group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Thêm khách hàng</span>
          </button>
        )}
      </div>
    </div>
  );
};
