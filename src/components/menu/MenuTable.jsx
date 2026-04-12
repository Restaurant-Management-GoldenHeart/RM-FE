import React from 'react';
import { 
  Edit2, Trash2, UtensilsCrossed, 
  ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, Tag, DollarSign 
} from 'lucide-react';

/**
 * fmt - Currency formatter
 */
const fmt = (n) => n != null ? n.toLocaleString('vi-VN') + '₫' : '—';

/**
 * StatusBadge - Independent component for status labels
 */
function StatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
      ${isAvailable 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
        : 'bg-gray-50 text-gray-500 border-gray-100'}
    `}>
      {isAvailable ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {isAvailable ? 'Có sẵn' : 'Hết hàng'}
    </span>
  );
}

/**
 * SkeletonRow - Loading placeholder
 */
function SkeletonRow({ isAdmin }) {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-48" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
      {isAdmin && <td className="px-6 py-4"><div className="h-8 bg-gray-100 rounded w-16" /></td>}
    </tr>
  );
}

/**
 * MenuTable - Data table component
 * Aesthetics: High contrast grey/black/gold.
 */
export function MenuTable({ 
  items = [], 
  loading, 
  pagination, 
  onPageChange, 
  onEdit, 
  onDelete, 
  isAdmin 
}) {
  const { page, totalPages, totalElements, start, end } = pagination;

  // 1. Loading State
  if (loading && items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              {['Món ăn', 'Danh mục', 'Chi nhánh', 'Giá', 'Trạng thái', 'Nguyên liệu'].map(h => (
                <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
              {isAdmin && <th className="px-6 py-4" />}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} isAdmin={isAdmin} />)}
          </tbody>
        </table>
      </div>
    );
  }

  // 2. Empty State
  if (items.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-20 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-10 h-10 text-gray-200" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Không tìm thấy món ăn</h3>
        <p className="text-gray-500 text-sm mt-2">Dữ liệu hiện tại đang trống hoặc không khớp với bộ lọc.</p>
      </div>
    );
  }

  // 3. Data Table (Explicit rendering)
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Món ăn</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh mục</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Chi nhánh</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Giá niêm yết</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipe</th>
              {isAdmin && <th className="px-6 py-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-amber-100 transition-colors">
                      <UtensilsCrossed className="w-5 h-5 text-gray-300 group-hover:text-amber-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-sm tracking-tight">{item.name}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5 max-w-[200px] truncate">{item.description || 'Không có mô tả'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-600">{item.categoryName || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.branchName || 'Toàn hệ thống'}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-black text-gray-900 tabular-nums bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    {fmt(item.price)}
                  </span>
                </td>
                <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold">
                      <Tag className="w-3.5 h-3.5 text-gray-300" />
                      <span>{item.recipes?.length || 0} nguyên liệu</span>
                   </div>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onEdit(item)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-transparent hover:border-amber-200 hover:text-amber-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(item)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-transparent hover:border-red-200 hover:text-red-500 transition-colors"
                        title="Xóa món"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
            Hiển thị {start}–{end} trên tổng {totalElements} món
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button
                   key={i}
                   onClick={() => onPageChange(i)}
                   className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                     page === i 
                     ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                     : 'bg-white border border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-600'
                   }`}
                 >
                   {i + 1}
                 </button>
               ))}
            </div>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
