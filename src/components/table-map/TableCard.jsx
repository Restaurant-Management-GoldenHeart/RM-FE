import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Users, Pencil, Trash2, Settings, MoreVertical } from 'lucide-react';

const STATUS_CONFIG = {
  AVAILABLE: { card: 'bg-white border-emerald-100 hover:border-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Trống' },
  OCCUPIED:  { card: 'bg-white border-amber-200 hover:border-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Đang dùng', pulse: true },
  RESERVED:  { card: 'bg-white border-blue-100 hover:border-blue-300', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Đặt trước' },
  DIRTY:     { card: 'bg-gray-50 border-gray-200 hover:border-gray-400', badge: 'bg-gray-200 text-gray-600 border-gray-300', dot: 'bg-gray-400', label: 'Cần dọn' },
};

export default function TableCard({ 
  table, 
  onEdit, 
  onDelete, 
  onSelect, 
  onAction, 
  isSelected,
  className 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(table);
  };

  return (
    <div
      onClick={() => {
        if (!isMenuOpen) onSelect?.(table);
      }}
      className={cn(
        'relative flex flex-col justify-between p-2 sm:p-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md cursor-pointer transition-all min-h-[110px] sm:min-h-[130px] w-full h-full group',
        config.card,
        isSelected && 'border-gold-500 shadow-xl ring-4 ring-gold-500/5 bg-gold-50/5',
        className
      )}
    >
      {/* Hàng trên cùng (Badge & Menu) */}
      <div className="flex justify-between items-start w-full">
        {/* Badge Trạng thái */}
        <div className={cn('px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] sm:text-xs font-bold border shadow-sm', config.badge)}>
          <div className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full', config.dot, config.pulse && 'animate-pulse')} />
          {config.label}
        </div>

        {/* Nút 3 chấm */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="-mt-1 -mr-1 p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors bg-white/50 backdrop-blur-sm z-20"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30">
              {onAction && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onAction(table); }}
                   className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                 >
                   <Settings size={14} /> Cài đặt bàn
                 </button>
              )}
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(table); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={14} /> Sửa bàn
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Xóa bàn
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Giữa (Tên Bàn) */}
      <div className="flex-1 flex items-center justify-center py-1 sm:py-2">
        <span className={cn('text-xl sm:text-2xl md:text-3xl font-extrabold transition-colors', isSelected ? 'text-gold-600' : 'text-slate-800 group-hover:text-gold-600')}>
          {table.tableNumber || table.table_number || 'Bàn ?'}
        </span>
      </div>

      {/* Hàng dưới cùng (Sức chứa) */}
      <div className="flex justify-center items-center w-full mt-auto">
        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md text-slate-400 font-semibold text-[10px] sm:text-xs border border-gray-100/50">
          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>{table.capacity} chỗ</span>
        </div>
      </div>
      
      {isSelected && <div className="absolute top-0 right-1 w-6 h-6 bg-gold-600 rotate-45 translate-x-3 -translate-y-3 shadow-lg z-10" />}
    </div>
  );
}
