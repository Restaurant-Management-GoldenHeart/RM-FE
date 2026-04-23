import { Package, MoreVertical, TrendingDown, History, Edit2, Trash2 } from 'lucide-react';

const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0);
const fmtCurrency = (n) => n != null && n !== 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : null;

export default function InventoryMobileList({ items, onEdit, onDelete, onViewHistory, canEdit }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
          <Package size={32} className="text-gray-300" />
        </div>
        <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-24">
      {items.map((item) => {
        const isOut = item.quantity === 0 || item.outOfStock;
        const isLow = !isOut && (item.quantity <= (item.minStockLevel ?? 0) || item.lowStock);
        const progress = Math.min(100, (item.quantity / (item.reorderLevel || 1)) * 100);

        return (
          <div 
            key={item.inventoryId ?? item.id}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
            onClick={() => onViewHistory(item)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOut ? 'bg-red-50 text-red-500' : isLow ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <Package size={20} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight">{item.ingredientName ?? item.itemName}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">#{item.inventoryId ?? item.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-lg font-black tracking-tight ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                  {fmtNumber(item.quantity)} <span className="text-[10px] font-bold text-gray-400">{item.unitSymbol ?? item.unitName}</span>
                </span>
                {isOut ? (
                  <span className="text-[9px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-full">Hết hàng</span>
                ) : isLow ? (
                  <span className="text-[9px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded-full">Sắp hết</span>
                ) : null}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span>Mức dự trữ</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Giá vốn (AVG)</p>
                <p className="text-xs font-black text-gray-900 mt-0.5">{fmtCurrency(item.averageUnitCost) || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng giá trị</p>
                <p className="text-xs font-black text-gray-900 mt-0.5">{fmtCurrency(item.quantity * (item.averageUnitCost || 0)) || '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onViewHistory(item); }}
                  className="p-2.5 rounded-xl bg-gray-50 text-gray-400 active:bg-gray-100"
                >
                  <History size={16} />
                </button>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Edit2 size={14} /> Sửa
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                    disabled={item.quantity > 0}
                    className="p-2.5 rounded-xl bg-red-50 text-red-500 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
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
