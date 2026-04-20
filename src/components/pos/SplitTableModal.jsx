/**
 * SplitTableModal.jsx — Modal Tách bàn & Chuyển món
 *
 * Nghiệp vụ:
 *   1. Nhân viên chọn các món cần chuyển sang bàn khác
 *   2. Nhân viên chọn bàn đích
 *   3. Xác nhận → Gọi BE: POST /api/v1/tables/{fromTableId}/split
 *
 * ⚠️ QUAN TRỌNG: BE yêu cầu fromTableId trong URL (KHÔNG phải fromOrderId).
 * → Component này nhận fromTable (đối tượng bàn) thay vì fromOrder.
 * → Lấy fromTable.id để truyền vào useTableStore.splitTable().
 *
 * ⚠️ NOTE BE: Định dạng items BE yêu cầu: [{ orderItemId, quantity }]
 * → useTableStore.splitTable() tự xử lý việc chuyển đổi format này.
 */
import React, { useState, useMemo } from 'react';
import { X, ArrowRightLeft, Minus, Plus, Check, Loader2 } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const SplitTableModal = ({ isOpen, onClose, fromTable }) => {
  const tables    = useTableStore(s => s.tables);
  const splitTable = useTableStore(s => s.splitTable);

  // Lấy order hiện tại của bàn nguồn để hiển thị danh sách món
  const order = useOrderStore(s =>
    fromTable?.currentOrderId ? s.orders[fromTable.currentOrderId] : null
  );

  const [toTableId, setToTableId]           = useState('');
  const [selectedItems, setSelectedItems]   = useState({}); // { itemId: quantity }
  const [isProcessing, setIsProcessing]     = useState(false);
  const [isWarningOpen, setIsWarningOpen]   = useState(false);

  // Lọc các món hợp lệ để tách (chưa HỦY)
  const transferableItems = useMemo(() => {
    if (!order) return [];
    return order.items.filter(i => i.status !== 'CANCELLED');
  }, [order]);

  /** Toggle chọn/bỏ chọn một món */
  const handleToggleItem = (itemId, maxQty) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = maxQty; // Mặc định chọn tất cả số lượng
      }
      return next;
    });
  };

  /** Điều chỉnh số lượng món cần tách */
  const updateQty = (itemId, delta, maxQty) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 1;
      const next    = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  /**
   * handleSplit — Xử lý khi nhấn "Xác nhận Tách"
   * Kiểm tra nếu có món đang nấu → hiển thị cảnh báo trước.
   */
  const handleSplit = async () => {
    if (!toTableId) {
      toast.error('Vui lòng chọn bàn đích!');
      return;
    }

    const transferPayload = Object.entries(selectedItems).map(
      ([itemId, quantity]) => ({ itemId, quantity })
    );

    if (transferPayload.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 món để tách!');
      return;
    }

    // Kiểm tra có món nào đang được nấu → cảnh báo trước
    const hasCookingItems = transferPayload.some(move => {
      const item = order.items.find(i => i.id === move.itemId);
      return item && ['SENT', 'PREPARING', 'READY'].includes(item.status);
    });

    if (hasCookingItems) {
      setIsWarningOpen(true);
      return;
    }

    // Không có cảnh báo → tách ngay
    await proceedSplit(transferPayload);
  };

  /**
   * proceedSplit — Thực sự gọi API tách bàn.
   *
   * ⚠️ QUAN TRỌNG: Gọi splitTable với fromOrderId (BE sẽ tự tìm fromTableId).
   * → useTableStore.splitTable tự xử lý việc map fromOrderId → fromTableId.
   */
  const proceedSplit = async (payload) => {
    setIsWarningOpen(false);
    setIsProcessing(true);

    const transferPayload = payload
      || Object.entries(selectedItems).map(([itemId, quantity]) => ({ itemId, quantity }));

    // Gọi store action — store sẽ tự tìm fromTableId từ fromOrderId
    const success = await splitTable(
      fromTable.id,       // fromTableId (TRUYỀN TRỰC TIẾP ID BÀN)
      Number(toTableId),  // toTableId
      transferPayload     // [{ id, quantity }]
    );

    setIsProcessing(false);

    if (success) {
      // Reset state và đóng modal
      setSelectedItems({});
      setToTableId('');
      onClose();
    }
  };

  // Không render nếu chưa có đủ dữ liệu
  if (!isOpen || !fromTable || !order) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 h-[600px]">

        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <ArrowRightLeft className="text-gold-600" /> Tách bàn & Chuyển món
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Từ Bàn {fromTable.tableNumber} (Đơn #{order.id})
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-white rounded-full disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chọn món cần chuyển */}
          <div className="flex-1 overflow-y-auto p-8 space-y-4 border-r border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Chọn món cần chuyển
            </h3>

            {transferableItems.length === 0 ? (
              <p className="text-sm text-gray-400 font-bold text-center py-8">
                Không có món nào có thể tách.
              </p>
            ) : (
              transferableItems.map(item => {
                const isSelected = !!selectedItems[item.id];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-4 rounded-3xl border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-gold-500 bg-gold-50/30 shadow-lg shadow-gold-600/5"
                        : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                    )}
                    onClick={() => handleToggleItem(item.id, item.quantity)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Checkbox tùy chỉnh */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-gold-600 border-gold-600" : "border-gray-200"
                        )}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            Số lượng có sẵn: {item.quantity}
                          </p>
                        </div>
                      </div>

                      {/* Điều chỉnh số lượng khi đã chọn */}
                      {isSelected && (
                        <div
                          className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gold-100"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => updateQty(item.id, -1, item.quantity)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold-600"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-black w-6 text-center">
                            {selectedItems[item.id]}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1, item.quantity)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gold-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Chọn bàn đích */}
          <div className="w-[280px] p-8 flex flex-col bg-gray-50/30">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
              Chuyển sang bàn
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 no-scrollbar">
              {tables
                .filter(t => t.id !== fromTable.id)
                .map(t => (
                  <button
                    key={t.id}
                    onClick={() => setToTableId(t.id)}
                    className={cn(
                      "w-full p-4 rounded-3xl border-2 text-left transition-all",
                      toTableId === t.id
                        ? "bg-gray-900 border-gray-900 text-white shadow-xl"
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm uppercase">
                        Bàn {t.tableNumber}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded",
                        t.status === 'OCCUPIED'
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-emerald-500/20 text-emerald-500"
                      )}>
                        {t.status === 'OCCUPIED' ? 'Đã bận (Gộp)' : 'Trống (Tách mới)'}
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            {/* Nút xác nhận */}
            <div className="pt-8">
              <button
                onClick={handleSplit}
                disabled={isProcessing || !toTableId || Object.keys(selectedItems).length === 0}
                className="w-full py-4 bg-gold-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-gold-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing
                  ? <Loader2 size={18} className="animate-spin" />
                  : <ArrowRightLeft size={18} />
                }
                {isProcessing ? 'Đang xử lý...' : 'Xác nhận Tách'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Cảnh báo khi có món đang nấu */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tighter">
              Cảnh báo tách món
            </h3>
            <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
              Trong danh sách có món đang được bếp xử lý hoặc đã sẵn sàng.
              Bạn có chắc muốn chuyển các món này sang bàn khác không?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsWarningOpen(false)}
                className="flex-1 py-3 px-2 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => proceedSplit()}
                className="flex-1 py-3 px-2 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-600"
              >
                Vẫn Tách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitTableModal;
