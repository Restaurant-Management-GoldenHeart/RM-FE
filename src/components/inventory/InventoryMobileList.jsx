import { Package, MoreVertical, TrendingDown, History, Edit2, Trash2 } from 'lucide-react';

const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0);
const fmtCurrency = (n) => n != null && n !== 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : null;

export default function InventoryMobileList({ items, loading, onEdit, onDelete, onViewHistory, canEdit }) {
  if (loading) {
    return (
      <div className="w-full space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col gap-3 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
              <div className="shrink-0 w-16 h-6 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-8 bg-gray-200 rounded-lg" />
              <div className="h-8 bg-gray-200 rounded-lg" />
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
          <Package size={32} className="text-gray-300" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Không có dữ liệu</h3>
        <p className="text-gray-400 text-xs mt-2 font-medium leading-relaxed">
          Hiện tại không có dữ liệu nguyên vật liệu nào khớp với yêu cầu.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-24" style={{ touchAction: 'manipulation' }}>
      {items.map((item) => {
        const isOut = item.quantity === 0 || item.outOfStock;
        const isLow = !isOut && (item.quantity <= (item.minStockLevel ?? 0) || item.lowStock);
        const progress = Math.min(100, (item.quantity / (item.reorderLevel || 1)) * 100);

        return (
          <div 
            key={item.inventoryId ?? item.id}
            className="bg-white rounded-[1.25rem] p-4 border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
            onClick={() => onViewHistory(item)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[0.85rem] flex items-center justify-center shrink-0 ${isOut ? 'bg-red-50 text-red-500' : isLow ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <Package size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-gray-900 text-sm leading-tight truncate">{item.ingredientName ?? item.itemName}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>#{item.inventoryId ?? item.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                <span className={`text-base font-black tracking-tight ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNumber(item.quantity)} <span className="text-[10px] font-bold text-gray-400">{item.unitSymbol ?? item.unitName}</span>
                </span>
                {isOut ? (
                  <span className="text-[9px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full">Hết</span>
                ) : isLow ? (
                  <span className="text-[9px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded-full">Sắp hết</span>
                ) : null}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span>Mức dự trữ</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-[width] duration-1000 ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Giá vốn</p>
                <p className="text-xs font-black text-gray-900 mt-0.5 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(item.averageUnitCost) || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tồn kho</p>
                <p className="text-xs font-black text-gray-900 mt-0.5 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(item.quantity * (item.averageUnitCost || 0)) || '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onViewHistory(item); }}
                  className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
                  aria-label={`Xem lịch sử ${item.ingredientName ?? item.itemName}`}
                >
                  <History size={16} aria-hidden="true" />
                </button>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-colors"
                    aria-label={`Sửa nguyên liệu ${item.ingredientName ?? item.itemName}`}
                  >
                    <Edit2 size={14} aria-hidden="true" /> Sửa
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    disabled={item.quantity > 0}
                    className="p-2.5 rounded-xl bg-red-50 text-red-500 disabled:opacity-30 hover:bg-red-100 transition-colors"
                    aria-label={`Xóa nguyên liệu ${item.ingredientName ?? item.itemName}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
