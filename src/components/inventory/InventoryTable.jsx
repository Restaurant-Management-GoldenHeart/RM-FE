import { Edit2, Trash2, History, Package, AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const fmtNumber = (n) => new Intl.NumberFormat('vi-VN').format(n ?? 0);
const fmtCurrency = (n) => n != null && n !== 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n) : null;

function StatusBadge({ isOut, isLow }) {
  if (isOut) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[9px] font-black uppercase tracking-wider"><AlertTriangle size={10} className="animate-pulse" /> Hết hàng</span>;
  if (isLow) return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 text-[9px] font-black uppercase tracking-wider">Sắp hết</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider">Đủ hàng</span>;
}

export default function InventoryTable({ items, onEdit, onDelete, onViewHistory, onRestock }) {
  const { role } = useAuthStore();
  const canEdit = ['ADMIN', 'MANAGER'].includes(role);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white/30 backdrop-blur-sm rounded-[2rem]">
        <div className="w-20 h-20 bg-white/60 rounded-[1.5rem] flex items-center justify-center mb-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]"><Package size={32} className="text-gray-300" /></div>
        <p className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] mb-2">Kho hàng trống</p>
        <p className="text-xs font-bold text-gray-400">Không tìm thấy vật liệu nào theo điều kiện lọc.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead>
          <tr className="bg-white/40 sticky top-0 z-10">
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white">Nguyên liệu</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right border-b border-white">Tồn kho</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right border-b border-white">Giá vốn (AVG)</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right border-b border-white">Tổng giá trị</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white">Cập nhật</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white">Mức dự trữ</th>
            <th className="px-7 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right border-b border-white"><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/60">
          {items.map((item) => {
            const isOut = item.quantity === 0 || item.outOfStock;
            const isLow = !isOut && (item.quantity <= (item.minStockLevel ?? 0) || item.lowStock);
            const progress = Math.min(100, (item.quantity / (item.reorderLevel || 1)) * 100);
            const lastUpdate = item.updatedAt ? formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true, locale: vi }) : '—';

            return (
              <tr 
                key={item.inventoryId ?? item.id} 
                className={`group transition-all duration-300 hover:bg-white/80 cursor-pointer`}
                onClick={() => onViewHistory(item)}
              >
                <td className="px-7 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white transition-all duration-300 group-hover:scale-110 ${isOut ? 'bg-red-50 text-red-500' : isLow ? 'bg-orange-50 text-orange-500' : 'bg-white text-gray-400 group-hover:text-orange-500'}`}>
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 group-hover:text-orange-600 transition-colors duration-300">{item.ingredientName ?? item.itemName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge isOut={isOut} isLow={isLow} />
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">#{item.inventoryId ?? item.id}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-7 py-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-lg font-black tabular-nums tracking-tight ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                      {fmtNumber(item.quantity)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.unitSymbol ?? item.unitName}</span>
                  </div>
                </td>
                <td className="px-7 py-4 text-right">
                  <span className="text-sm font-black text-gray-700 tabular-nums">{fmtCurrency(item.averageUnitCost) || '—'}</span>
                </td>
                <td className="px-7 py-4 text-right">
                  <span className="text-sm font-black text-gray-900 tabular-nums">{fmtCurrency(item.quantity * (item.averageUnitCost || 0)) || '—'}</span>
                </td>
                <td className="px-7 py-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lastUpdate}</span>
                </td>
                <td className="px-7 py-4">
                  <div className="w-32 space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-400">
                      <span>Stock</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-white">
                      <div 
                        className={`h-full transition-all duration-1000 ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-7 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRestock(item); }} 
                        className="h-9 px-3 rounded-xl bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                      >
                        <TrendingUp size={12} /> Nhập hàng
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(item); }} 
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-orange-600 hover:border-orange-100 transition-all active:scale-95 shadow-sm"
                    >
                      <Edit2 size={14} />
                    </button>
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }} 
                        disabled={item.quantity > 0} 
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 transition-all active:scale-95 shadow-sm disabled:opacity-20"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}