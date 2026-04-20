import React from 'react';
import { Plus, Users } from 'lucide-react';

/**
 * CustomerHeader - Title and primary actions for Customer Management
 * Design: High Contrast (Simple White & Gold)
 */
export const CustomerHeader = ({ onAdd, count, loading }) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Users className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
            Quản lý Khách hàng
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            Hệ thống CRM 
            <span className="w-1 h-1 rounded-full bg-gray-300" /> 
            {loading ? 'Đang cập nhật...' : `${count} tài khoản khách hàng`}
          </p>
        </div>
      </div>

      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 active:scale-95 group"
      >
        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Thêm khách hàng
      </button>
    </div>
  );
};
