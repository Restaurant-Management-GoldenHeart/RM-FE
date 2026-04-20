import { X, ArrowDownRight, ArrowUpRight, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventoryApi';

export default function InventoryHistoryModal({ isOpen, onClose, selectedItem }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventoryHistory', selectedItem?.inventoryId || selectedItem?.id],
    queryFn: () => inventoryApi.getInventoryHistory(selectedItem?.inventoryId || selectedItem?.id, { page: 0, size: 50 }),
    enabled: isOpen && !!(selectedItem?.inventoryId || selectedItem?.id),
    staleTime: 0,
  });

  if (!isOpen) return null;

  const logs = data?.data?.content || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white border border-gray-100 rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] scale-in-center">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Clock className="text-white w-6 h-6 border-2 border-white/20 rounded-full" />
            </div>
            <div>
              <h2 className="text-gray-900 font-black uppercase tracking-tight">Lịch Sử Biến Động</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gold-600 text-[10px] font-black uppercase tracking-[0.2em]">
                  {selectedItem?.ingredientName || selectedItem?.itemName}
                </p>
                <div className="w-1 h-1 rounded-full bg-gray-200" />
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Real-time logs</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGS LIST */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Đang đồng bộ dữ liệu...</p>
            </div>
          )}

          {isError && (
            <div className="py-16 text-center">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-xl shadow-red-500/5">
                  <X size={32} />
               </div>
               <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest">Lỗi kết nối</h4>
               <p className="text-red-400 text-xs mt-1 font-bold italic">{error?.message}</p>
            </div>
          )}

          {!isLoading && !isError && logs.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-20 h-20 rounded-[2rem] bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Clock className="w-8 h-8 text-gray-200" />
              </div>
              <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest">Chưa có lịch sử thay đổi</h4>
              <p className="text-gray-400 text-xs mt-2 font-medium">Mọi biến động nhập/xuất sẽ được liệt kê tại đây.</p>
            </div>
          )}

          {!isLoading && !isError && logs.length > 0 && (
            <div className="space-y-3 pb-4">
              {logs.map((log) => {
                const isImport = log.actionType === 'IMPORT';
                const isExport = log.actionType === 'EXPORT';
                const Icon = isImport ? ArrowDownRight : isExport ? ArrowUpRight : Clock;
                const date = new Date(log.actionDate || log.createdAt);
                
                // Format: dd/MM/yyyy HH:mm
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

                const unitSymbol = selectedItem?.measurementUnit?.symbol || selectedItem?.unitSymbol || '';

                return (
                  <div key={log.id} className="group flex gap-5 p-5 rounded-2xl bg-white border border-gray-100 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-900/5 transition-all animate-slide-up">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all ${isImport
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : isExport
                          ? 'bg-red-50 border-red-100 text-red-600'
                          : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-gray-900 text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            {isImport ? 'Nhập kho thành công' : isExport ? 'Xuất kho sử dụng' : log.actionType}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                isImport ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 
                                isExport ? 'border-red-200 text-red-600 bg-red-50' : 
                                'border-gray-200 text-gray-500'
                              }`}>
                              {log.actionType}
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                             <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                               Người thực hiện: <span className="text-gray-900 font-black">{log.actionBy || 'System'}</span>
                             </p>
                          </div>
                          {log.reason && (
                            <p className="text-amber-600/70 text-[11px] mt-2 font-medium italic border-l-2 border-amber-200 pl-3 py-1">
                              "{log.reason}"
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <span className={`text-base font-black tabular-nums tracking-tighter ${isImport ? 'text-emerald-600' : isExport ? 'text-red-600' : 'text-amber-600'
                            }`}>
                            {isImport ? '+' : isExport ? '-' : ''}{log.quantityChanged?.toLocaleString('vi-VN')} {unitSymbol}
                          </span>
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
