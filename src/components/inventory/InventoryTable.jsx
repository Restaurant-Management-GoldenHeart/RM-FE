import { Edit2, Trash2, History, Package } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * InventoryTable - Table view for Inventory items
 * Design: High Contrast (Simple White & Gold)
 */
export default function InventoryTable({ 
  items, 
  onEdit, 
  onDelete, 
  onViewHistory 
}) {
  const { role } = useAuthStore();
  const canEdit = ['ADMIN', 'MANAGER'].includes(role);

  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-fade-in flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Nguyên liệu</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Số lượng</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Đơn vị</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Giá vốn</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ngưỡng tồn</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const isLowStock = item.quantity <= (item.minStockLevel || 0);
              const unitDisplay = item.unitSymbol ? `${item.unitSymbol} (${item.unitName})` : (item.unitName || '---');

              return (
                <tr 
                  key={item.inventoryId || item.id} 
                  className="hover:bg-amber-50/30 transition-colors group"
                >
                  <td className="px-6 py-4 text-[11px] text-gray-400 font-bold tabular-nums">
                    #{item.inventoryId || item.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                        <Package className="w-4.5 h-4.5 text-amber-600" />
                      </div>
                      <span className="text-gray-900 font-bold text-sm tracking-tight leading-none">
                        {item.ingredientName || item.itemName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-black border tracking-wider tabular-nums ${
                         isLowStock 
                           ? 'bg-red-50 text-red-600 border-red-100 shadow-sm shadow-red-500/5' 
                           : 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/5'
                       }`}>
                         {item.quantity?.toLocaleString('vi-VN')}
                       </span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                         {item.unitSymbol || ''}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] font-black text-amber-600 uppercase tracking-widest leading-none">
                    {unitDisplay}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-gray-900 tabular-nums">
                      {item.averageUnitCost ? `${item.averageUnitCost.toLocaleString('vi-VN')}₫` : '---'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-900 font-black tracking-tight leading-none uppercase tabular-nums">
                          {item.minStockLevel || 0}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">Min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-amber-600 font-black tracking-tight leading-none uppercase tabular-nums">
                          {item.reorderLevel || 0}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400">Reorder</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => onViewHistory(item)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-90 shadow-sm hover:border-blue-100"
                        title="Lịch sử nhập/xuất"
                      >
                        <History className="w-4.5 h-4.5" />
                      </button>
                      
                      {canEdit && (
                        <>
                          <button
                            onClick={() => onEdit(item)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all active:scale-90 shadow-sm hover:border-amber-100"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => onDelete(item)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-sm ${
                              item.quantity > 0 
                                ? 'bg-gray-50/50 text-gray-200 cursor-not-allowed border-gray-100 opacity-50' 
                                : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 border-gray-100 hover:border-red-100'
                            }`}
                            title={item.quantity > 0 ? "Không thể xóa khi số lượng > 0" : "Xóa"}
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-24 text-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-gray-200" />
                   </div>
                   <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest">Kho hàng trống</h4>
                   <p className="text-gray-400 text-xs mt-1">Không tìm thấy nguyên vật liệu nào theo bộ lọc của bạn.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
