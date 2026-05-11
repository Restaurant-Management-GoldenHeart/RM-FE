import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Minus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTableStore } from '../../store/useTableStore';
import { useOrderStore } from '../../store/useOrderStore';
import { cn } from '../../utils/cn';

const SplitTableModal = ({ isOpen, onClose, fromTable }) => {
  const tables = useTableStore(state => state.tables);
  const splitTable = useTableStore(state => state.splitTable);
  const order = useOrderStore(state =>
    Object.values(state.orders).find(
      candidate =>
        candidate?.tableId === fromTable?.id &&
        !['PAID', 'CANCELLED', 'MERGED'].includes(candidate.status)
    ) || null
  );

  const [toTableId, setToTableId] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const items = useMemo(() => {
    if (!order) return [];
    return order.items.filter(item => item.status !== 'CANCELLED');
  }, [order]);

  const targetTables = useMemo(
    () =>
      tables.filter(
        table =>
          table.id !== fromTable?.id &&
          ['AVAILABLE', 'RESERVED'].includes(table.status) &&
          !table.merged &&
          !table.mergeRoot &&
          !table.isMergedMember
      ),
    [fromTable?.id, tables]
  );

  const handleToggleItem = (itemId, maxQty) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = maxQty;
      }
      return next;
    });
  };

  const updateQty = (itemId, delta, maxQty) => {
    setSelectedItems(prev => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleSplit = async () => {
    if (!toTableId) {
      toast.error('Vui lòng chọn bàn đích.');
      return;
    }

    const transferPayload = Object.entries(selectedItems).map(([itemId, quantity]) => ({
      itemId,
      quantity,
    }));

    if (transferPayload.length === 0) {
      toast.error('Vui lòng chọn ít nhất một món.');
      return;
    }

    setIsProcessing(true);
    const success = await splitTable(fromTable.id, Number(toTableId), transferPayload);
    setIsProcessing(false);
    if (success) onClose();
  };

  if (!isOpen || !fromTable || !order) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[600px] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-8">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-gray-900">
              <ArrowRightLeft className="text-gold-600" /> Tách món sang bàn khác
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Từ {fromTable.displayName || fromTable.tableNumber} - đơn #{order.id}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto border-r border-gray-100 p-8">
            <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Chọn món cần chuyển
            </h3>
            {items.map(item => {
              const isSelected = Boolean(selectedItems[item.id]);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'cursor-pointer rounded-3xl border-2 p-4 transition-all',
                    isSelected
                      ? 'border-gold-500 bg-gold-50/30 shadow-lg shadow-gold-600/5'
                      : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'
                  )}
                  onClick={() => handleToggleItem(item.id, item.quantity)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                          isSelected ? 'border-gold-600 bg-gold-600' : 'border-gray-200'
                        )}
                      >
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{item.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                          Số lượng hiện có: {item.quantity}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        className="flex items-center gap-2 rounded-xl border border-gold-100 bg-white p-1 shadow-sm"
                        onClick={event => event.stopPropagation()}
                      >
                        <button
                          onClick={() => updateQty(item.id, -1, item.quantity)}
                          className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gold-600"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-black">{selectedItems[item.id]}</span>
                        <button
                          onClick={() => updateQty(item.id, 1, item.quantity)}
                          className="flex h-8 w-8 items-center justify-center text-gray-400 hover:text-gold-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex w-[280px] flex-col bg-gray-50/30 p-8">
            <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              Chuyển sang bàn
            </h3>
            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-2">
              {targetTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => setToTableId(table.id)}
                  className={cn(
                    'w-full rounded-3xl border-2 p-4 text-left transition-all',
                    Number(toTableId) === table.id
                      ? 'border-gray-900 bg-gray-900 text-white shadow-xl'
                      : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black uppercase">
                      {table.displayName || table.tableNumber}
                    </span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[9px] font-bold',
                        table.status === 'RESERVED'
                          ? 'bg-blue-500/20 text-blue-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      )}
                    >
                      {table.status === 'RESERVED' ? 'Đặt trước' : 'Sẵn sàng nhận tách'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-8">
              <button
                onClick={handleSplit}
                disabled={isProcessing || !toTableId || Object.keys(selectedItems).length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-gold-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-gold-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowRightLeft size={18} />
                )}
                Xác nhận tách
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitTableModal;
