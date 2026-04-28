import React from 'react';
import { Edit2, Trash2, UserCircle, Star, Tag, Clock } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function CustomerMobileList({ customers = [], loading, isAdmin, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="w-full space-y-3 px-4 md:px-0">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col gap-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-8 bg-gray-200 rounded-lg" />
              <div className="h-8 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-gray-100">
          <UserCircle className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Thông tin trống</h3>
        <p className="text-gray-400 text-xs mt-2 font-medium leading-relaxed">
          Chưa có dữ liệu khách hàng nào được tìm thấy.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-4 md:px-0 pb-4" style={{ touchAction: 'manipulation' }}>
      {customers.map((cus) => (
        <div 
          key={cus.id}
          onClick={() => isAdmin && onEdit(cus)}
          className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group transition-transform ${isAdmin ? 'active:scale-[0.98] cursor-pointer' : ''}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-gold-600/10 border border-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 font-black text-sm">
                {(cus.name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-gray-900 text-sm leading-tight truncate">{cus.name}</h4>
                  {cus.customerCode && (
                    <span className="font-mono text-[9px] font-black tracking-widest text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">
                      {cus.customerCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">{cus.phone || cus.email || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3 bg-gray-50 rounded-xl p-3">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ghé gần nhất</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-black text-gray-900">{fmtDate(cus.lastVisitAt)}</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Điểm thưởng</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md text-[10px] font-black tabular-nums border ${
                cus.loyaltyPoints > 0 
                ? 'bg-amber-100/50 text-amber-700 border-amber-200/50' 
                : 'bg-white text-gray-400 border-gray-200'
              }`}>
                <Star className="w-2.5 h-2.5" /> {cus.loyaltyPoints ?? 0}
              </span>
            </div>
            {cus.note && (
              <div className="col-span-2 mt-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ghi chú</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 inline-block truncate max-w-full">
                  {cus.note}
                </span>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-50">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(cus); }}
                aria-label={`Sửa khách hàng ${cus.name}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors"
              >
                <Edit2 size={12} aria-hidden="true" /> Sửa
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(cus); }}
                aria-label={`Xóa khách hàng ${cus.name}`}
                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
