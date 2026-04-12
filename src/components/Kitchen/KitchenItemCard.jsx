import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { CheckCircle, Loader2, Clock, AlertTriangle, MessageSquare } from 'lucide-react';

/**
 * Tính số phút chờ từ createdAt đến hiện tại.
 */
function useWaitTime(createdAt) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  );

  useEffect(() => {
    const calc = () =>
      setMinutes(Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [createdAt]);

  return { minutes, isLate: minutes >= 15 };
}

const KitchenItemCard = ({ item, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { minutes, isLate } = useWaitTime(item.createdAt);

  const handleComplete = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onComplete(item.id);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onComplete, item.id]);

  return (
    <div
      className={cn(
        'premium-card p-6 flex flex-col gap-4 relative transition-all duration-300',
        isLate 
          ? 'border-red-200 bg-red-50/30' 
          : 'hover:border-gold-500/30 hover:shadow-lg'
      )}
    >
      {/* ── Late Banner ── */}
      {isLate && (
        <div className="absolute -top-3 -right-2 px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1.5 animate-bounce">
          <AlertTriangle size={10} />
          Ưu tiên nấu gấp
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-extrabold text-gray-900 leading-tight flex-1">
          {item.menuItemName}
        </h3>
        <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-2xl bg-gold-600 text-white text-xl font-black shadow-lg shadow-gold-600/20">
          {item.quantity}
        </div>
      </div>

      {/* ── Note ── */}
      {item.note ? (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-2xl border border-red-100">
          <MessageSquare size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-700 leading-relaxed italic">
            "{item.note}"
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 opacity-60">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Không có dặn dò</p>
        </div>
      )}

      {/* ── Meta ── */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-4">
        <div className={cn(
          'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider',
          isLate ? 'text-red-600' : 'text-gray-400'
        )}>
          <Clock size={14} />
          <span>{minutes} Phút</span>
        </div>
        <div className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-400">
          ORD#{item.orderId}
        </div>
      </div>

      {/* ── Action ── */}
      <button
        onClick={handleComplete}
        disabled={isSubmitting}
        className={cn(
          'w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all overflow-hidden relative group',
          isSubmitting
            ? 'bg-gray-100 text-gray-400'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-95'
        )}
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <CheckCircle size={18} />
              Hoàn Tất
            </>
          )}
        </span>
      </button>
    </div>
  );
};

export default KitchenItemCard;
