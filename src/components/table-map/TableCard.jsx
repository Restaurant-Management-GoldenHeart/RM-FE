import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Settings, Trash2, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

const STATUS_CONFIG = {
  AVAILABLE: {
    card: 'bg-white border-emerald-100 hover:border-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Trống',
  },
  OCCUPIED: {
    card: 'bg-white border-amber-200 hover:border-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Đang dùng',
    pulse: true,
  },
  RESERVED: {
    card: 'bg-white border-blue-100 hover:border-blue-300',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Đặt trước',
  },
  DIRTY: {
    card: 'bg-slate-50 border-slate-200 hover:border-slate-400',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
    label: 'Cần dọn',
  },
  MERGED: {
    card: 'bg-slate-50 border-slate-200 hover:border-slate-300',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-500',
    label: 'Đã gộp',
  },
};

export default function TableCard({
  table,
  onEdit,
  onDelete,
  onSelect,
  onAction,
  isSelected,
  className,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;
  const isMergedMember = table.status === 'MERGED' || table.isMergedMember;
  const displayLabel = table.displayName || table.tableNumber || table.table_number || 'Bàn ?';

  useEffect(() => {
    const handleClickOutside = event => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = event => {
    event.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(table);
  };

  return (
    <div
      onClick={() => {
        if (!isMenuOpen) onSelect?.(table);
      }}
      className={cn(
        'group relative flex h-full min-h-[124px] w-full cursor-pointer flex-col justify-between rounded-[1.2rem] border p-3 shadow-sm transition-all hover:shadow-md sm:min-h-[138px] sm:p-3.5',
        config.card,
        isSelected && 'border-gold-500 bg-gold-50/20 shadow-xl ring-4 ring-gold-500/5',
        className
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-sm sm:text-xs',
            config.badge
          )}
        >
          <div className={cn('h-2 w-2 rounded-full', config.dot, config.pulse && 'animate-pulse')} />
          {config.label}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              setIsMenuOpen(current => !current);
            }}
            className="rounded-lg bg-white/80 p-1 text-slate-400 backdrop-blur-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
              {onAction ? (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    onAction(table);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Settings size={14} />
                  Thao tác bàn
                </button>
              ) : null}

              {onEdit ? (
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit(table);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  Sửa bàn
                </button>
              ) : null}

              {onDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Xóa bàn
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center py-3">
        <div className="text-center">
          <span
            className={cn(
              'block break-words font-extrabold leading-tight transition-colors',
              displayLabel.length > 18 ? 'text-base sm:text-lg md:text-xl' : 'text-xl sm:text-2xl md:text-3xl',
              isSelected ? 'text-gold-600' : 'text-slate-800 group-hover:text-gold-600'
            )}
          >
            {displayLabel}
          </span>

          {isMergedMember && table.mergeRootTableName ? (
            <span className="mt-1 block text-[10px] font-semibold text-slate-500">
              Thao tác tại {table.mergeRootTableName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex w-full items-center justify-center">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:text-xs">
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>{table.capacity} chỗ</span>
        </div>
      </div>

      {isSelected ? (
        <div className="absolute right-1 top-0 z-10 h-6 w-6 translate-x-3 -translate-y-3 rotate-45 bg-gold-600 shadow-lg" />
      ) : null}
    </div>
  );
}
