import React from 'react';
import { Edit2, Trash2, UtensilsCrossed, CheckCircle2, XCircle, Tag } from 'lucide-react';

const fmt = (n) => n != null ? n.toLocaleString('vi-VN') + '₫' : '—';

function StatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
      ${isAvailable 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
        : 'bg-gray-50 text-gray-500 border-gray-100'}
    `}>
      {isAvailable ? <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> : <XCircle className="w-3 h-3" aria-hidden="true" />}
      {isAvailable ? 'Có sẵn' : 'Hết hàng'}
    </span>
  );
}

export default function MenuMobileList({ items, loading, onEdit, onDelete, isAdmin }) {
  if (loading) {
    return (
      <div className="w-full space-y-3 px-4 md:px-0">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col gap-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-1/4 mt-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-center mb-6">
          <UtensilsCrossed size={32} className="text-gray-300" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Không tìm thấy món ăn</h3>
        <p className="text-gray-400 text-xs mt-2 max-w-[250px] font-medium leading-relaxed">
          Dữ liệu hiện tại đang trống hoặc không khớp với bộ lọc.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-4 md:px-0 pb-4" style={{ touchAction: 'manipulation' }}>
      {items.map((item) => (
        <div 
          key={item.id}
          onClick={() => isAdmin && onEdit(item)}
          className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group transition-transform ${isAdmin ? 'active:scale-[0.98] cursor-pointer' : ''}`}
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex flex-col items-center justify-center border border-amber-100 shrink-0">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">
                {item.price ? `${(item.price / 1000).toFixed(0)}K` : '—'}
              </span>
              <UtensilsCrossed size={16} className="text-amber-400 mt-0.5" aria-hidden="true" />
            </div>
            
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <h4 className="font-black text-gray-900 text-sm leading-tight truncate min-w-0 flex-1">{item.name}</h4>
                <div className="shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              </div>
              
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">
                {item.categoryName || 'Danh mục trống'}
              </p>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1">
                   <Tag className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                   <span className="text-[10px] font-bold text-gray-500">{item.recipes?.length || 0} nguyên liệu</span>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    aria-label={`Xóa món ${item.name}`}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-90 shrink-0"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
