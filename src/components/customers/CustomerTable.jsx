import React from 'react';
import { 
  Edit2, Trash2, UserCircle, Star, 
  Clock, Calendar, ChevronLeft, ChevronRight,
  User 
} from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

/**
 * SkeletonRow - Loading placeholder
 */
const SkeletonRow = ({ isAdmin }) => (
  <tr className="border-b border-gray-50 animate-pulse">
    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gray-100" /><div className="space-y-2"><div className="h-3 bg-gray-100 rounded w-24" /><div className="h-2 bg-gray-100 rounded w-32" /></div></div></td>
    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-16" /></td>
    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-10" /></td>
    <td className="px-6 py-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
    <td className="px-6 py-4"><div className="h-2 bg-gray-100 rounded w-20" /></td>
    <td className="px-6 py-4"><div className="h-2 bg-gray-100 rounded w-20" /></td>
    {isAdmin && <td className="px-6 py-4"><div className="h-7 bg-gray-100 rounded w-14" /></td>}
  </tr>
);

/**
 * CustomerTable - Main list view
 * Design: High Contrast (Simple White & Gold)
 */
export const CustomerTable = ({ 
  customers = [], 
  loading, 
  isAdmin, 
  pagination, 
  onPageChange, 
  onEdit, 
  onDelete 
}) => {
  const { page, totalPages, totalElements, start, end } = pagination;

  return (
    <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Khách hàng</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Mã định danh</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Liên hệ</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Star className="w-3 h-3 text-amber-500" /> Điểm</span>
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ghi chú</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ghé gần nhất</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày gia nhập</th>
              {isAdmin && <th className="px-6 py-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && customers.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} isAdmin={isAdmin} />)
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="py-24 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <UserCircle className="w-8 h-8 text-gray-200" />
                  </div>
                  <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest">Thông tin trống</h4>
                  <p className="text-gray-400 text-xs mt-1">Chưa có dữ liệu khách hàng nào được tìm thấy.</p>
                </td>
              </tr>
            ) : (
              customers.map((cus) => (
                <tr key={cus.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-gold-600/10 border border-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-600 font-black text-xs">
                        {(cus.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold text-sm tracking-tight">{cus.name}</p>
                        <p className="text-gray-400 text-[11px] font-medium mt-0.5">{cus.email || 'Hệ thống nội bộ'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cus.customerCode ? (
                      <span className="font-mono text-[10px] font-black tracking-widest text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                        {cus.customerCode}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm font-bold">{cus.phone || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tabular-nums border ${
                      cus.loyaltyPoints > 0 
                      ? 'bg-amber-50 text-amber-700 border-amber-100' 
                      : 'bg-gray-50 text-gray-400 border-gray-100'
                    }`}>
                      <Star className="w-3 h-3" /> {cus.loyaltyPoints ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {cus.note ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 inline-block overflow-hidden max-w-[120px] truncate">
                        {cus.note}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-bold leading-none">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-300" />
                      {fmtDate(cus.lastVisitAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs font-medium">
                    {fmtDate(cus.createdAt)}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => onEdit(cus)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-transparent hover:border-amber-200 hover:text-amber-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(cus)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 border border-transparent hover:border-red-200 hover:text-red-500 transition-colors"
                          title="Xóa thông tin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      {!loading && totalPages > 1 && (
        <div className="px-8 py-5 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Hiển thị {start}–{end} trên tổng {totalElements} khách hàng
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1.5">
               {Array.from({ length: totalPages }).map((_, i) => (
                 <button
                   key={i}
                   onClick={() => onPageChange(i)}
                   className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                     page === i 
                     ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
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
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 transition-all shadow-sm active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
