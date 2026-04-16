import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertCircle, ChevronRight, CheckCircle, Play, XCircle } from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { cn } from '../../utils/cn';

/**
 * Enterprise KdsCard
 * Hiển thị Grouped Items trong 1 Column.
 * Cấu trúc: Table > Order > Batch > Items.
 */
const KdsCard = ({ tableNumber, orders, kdsStatus, onOpenCancel }) => {
  const updateItemStatus = useOrderStore(s => s.updateItemStatus);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6 flex flex-col">
      {/* Table Header */}
      <div className="bg-gray-900 px-5 py-4 flex justify-between items-center">
        <h3 className="text-white font-black text-lg uppercase tracking-tight">
          {tableNumber}
        </h3>
        <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2 py-1 rounded">
          {kdsStatus}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {Object.entries(orders).map(([orderLabel, batches]) => (
          <div key={orderLabel} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                {orderLabel}
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {Object.entries(batches).map(([batchId, items]) => (
              <KdsBatchGroup 
                key={batchId} 
                batchId={batchId} 
                items={items} 
                onAction={updateItemStatus}
                kdsStatus={kdsStatus}
                onOpenCancel={onOpenCancel}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hiển thị nhóm món theo từng đợt gửi (Batch)
 */
const KdsBatchGroup = ({ batchId, items, onAction, kdsStatus, onOpenCancel }) => {
  const sentTime = useMemo(() => {
    const firstItem = items[0];
    if (!firstItem?.sentAt) return 'N/A';
    return new Date(firstItem.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-gold-600 bg-gold-50 px-2 py-0.5 rounded">
          {batchId.includes('BATCH-') ? `Đợt gọi: ${sentTime}` : batchId}
        </span>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <KdsItemRow 
            key={item.id} 
            item={item} 
            onAction={onAction} 
            kdsStatus={kdsStatus}
            onOpenCancel={onOpenCancel}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Một dòng món ăn với Timer và Action buttons
 */
const KdsItemRow = ({ item, onAction, kdsStatus, onOpenCancel }) => {
  const [waitSecs, setWaitSecs] = useState(0);

  useEffect(() => {
    const start = new Date(item.sentAt || item.createdAt).getTime();
    const timer = setInterval(() => {
      setWaitSecs(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [item.sentAt, item.createdAt]);

  const waitMins = Math.floor(waitSecs / 60);
  const isWarning = waitMins >= 10;
  const isDanger = waitMins >= 20;

  const handleAction = (nextStatus) => {
    onAction({
      orderId: item.orderId,
      itemId: item.id,
      status: nextStatus,
      version: item.version
    });
  };

  return (
    <div className={`
      relative group flex flex-col p-4 rounded-2xl border transition-all duration-300
      ${isDanger ? 'bg-red-50 border-red-200 animate-pulse-subtle' : isWarning ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}
    `}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-base font-black transition-colors",
              item.status === 'CANCELLED' ? "text-red-400 line-through" : "text-gray-900"
            )}>
              {item.name}
            </span>
            <span className="text-sm font-black text-gold-600">x{item.quantity}</span>
            {item.status === 'CANCELLED' && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-md animate-pulse">
                STOP
              </span>
            )}
          </div>
          
          {/* Ingredients Display */}
          {item.ingredients && item.ingredients.length > 0 && item.status !== 'CANCELLED' && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.ingredients.map((ing, idx) => (
                <span key={idx} className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {ing}
                </span>
              ))}
            </div>
          )}

          {item.status === 'CANCELLED' && item.cancelReason && (
            <p className="text-[10px] font-black text-red-600 mt-1 uppercase italic">
              LÝ DO: {item.cancelReason}
            </p>
          )}

          {item.note && (
            <p className="text-xs font-bold text-orange-600 mt-1 bg-orange-100/50 px-2 py-0.5 rounded-lg inline-block italic">
              “{item.note}”
            </p>
          )}
        </div>
        
        <div className={`flex flex-col items-end ${isDanger ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-gray-400'}`}>
          <div className="flex items-center gap-1.5 font-black text-sm tabular-nums">
            <Clock size={14} />
            {Math.floor(waitSecs / 60)}:{String(waitSecs % 60).padStart(2, '0')}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Wait time</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        {kdsStatus === 'WAITING' && (
          <>
            <button 
              onClick={() => handleAction('PREPARING')}
              disabled={item.loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Play size={14} /> BẮT ĐẦU NẤU
            </button>
            <button 
              onClick={() => onOpenCancel?.(item)}
              className="px-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
              title="Huỷ món"
            >
              <XCircle size={16} />
            </button>
          </>
        )}
        {kdsStatus === 'COOKING' && (
          <button 
            onClick={() => handleAction('READY')}
            disabled={item.loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-xl text-xs font-black shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50 transition-all"
          >
            <CheckCircle size={14} /> HOÀN TẤT MÓN
          </button>
        )}
      </div>

      {item.loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
          <div className="w-5 h-5 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default KdsCard;
