import React from 'react';
import { usePosStore } from '../store/usePosStore';
import { cn } from '../utils/cn';
import { LayoutGrid, Users, CircleDot } from 'lucide-react';

const TableCard = ({ table }) => {
  const { selectedTableId, setSelectedTable } = usePosStore();
  const isSelected = selectedTableId === table.id;

  const statusConfig = {
    AVAILABLE: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      dot: 'bg-emerald-500',
      label: 'Trống'
    },
    OCCUPIED: {
      bg: 'bg-amber-50 text-amber-700 border-amber-100',
      dot: 'bg-amber-500',
      label: 'Đang dùng'
    },
    RESERVED: {
      bg: 'bg-blue-50 text-blue-700 border-blue-100',
      dot: 'bg-blue-500',
      label: 'Đã đặt'
    }
  };

  const config = statusConfig[table.status] || {
    bg: 'bg-gray-50 text-gray-700 border-gray-100',
    dot: 'bg-gray-400',
    label: table.status
  };

  return (
    <div
      onClick={() => setSelectedTable(table.id)}
      className={cn(
        'group relative flex flex-col p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden',
        isSelected 
          ? 'bg-white border-gold-500 shadow-xl shadow-gold-600/10 ring-4 ring-gold-500/5' 
          : 'bg-white border-gray-50 hover:border-gold-200 hover:shadow-lg'
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
          config.bg
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dot)} />
          {config.label}
        </div>
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">#{table.id}</span>
      </div>
      
      <div className="mt-2">
        <h3 className={cn(
          'font-black text-xl tracking-tight transition-colors',
          isSelected ? 'text-gold-600' : 'text-gray-900 group-hover:text-gold-600'
        )}>
          {table.tableNumber}
        </h3>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center">
            <Users size={12} className="text-gray-400" />
          </div>
          <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">{table.capacity || 4} chỗ</span>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-0 right-0 p-1">
          <div className="w-12 h-12 bg-gold-600 rotate-45 translate-x-6 -translate-y-6 shadow-sm" />
        </div>
      )}
    </div>
  );
};

const SkeletonTable = () => (
  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse">
    <div className="flex justify-between mb-4">
      <div className="w-16 h-5 bg-gray-200 rounded-lg" />
      <div className="w-6 h-3 bg-gray-100 rounded" />
    </div>
    <div className="w-20 h-6 bg-gray-200 rounded-lg mb-2" />
    <div className="w-12 h-4 bg-gray-100 rounded-lg" />
  </div>
);

export const TableList = () => {
  const { tables, tablesLoading } = usePosStore();

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-50 flex items-center justify-center">
            <LayoutGrid size={20} className="text-gold-600" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg tracking-tight uppercase">Sơ đồ bàn</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Floor Map</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 pb-6 no-scrollbar">
        {tablesLoading && tables.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonTable key={i} />)
        ) : tables.length > 0 ? (
          tables.map((table) => (
            <TableCard key={table.id} table={table} />
          ))
        ) : (
          <div className="col-span-2 py-20 text-center">
            <CircleDot className="mx-auto text-gray-100 mb-4" size={48} />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">
              Không tìm thấy bàn nào
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
