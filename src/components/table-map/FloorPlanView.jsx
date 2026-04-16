import React, { useState } from 'react';
import TableCard from './TableCard';
import { cn } from '../../utils/cn';
import { useTableStore } from '../../store/useTableStore';

export default function FloorPlanView({ 
  tables, 
  onEdit, 
  onDelete, 
  onSelect, 
  onAction,
  selectedTableId,
  gridClass = "grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 w-full auto-rows-max",
  selectedArea: externalSelectedArea,
  onAreaChange
}) {
  const { areas } = useTableStore();
  const [internalArea, setInternalArea] = useState('ALL');
  const selectedArea = externalSelectedArea !== undefined ? externalSelectedArea : internalArea;
  const setSelectedArea = onAreaChange || setInternalArea;

  // Lọc theo khu vực
  const filteredTables = tables.filter(table => {
    if (selectedArea === 'ALL') return true;
    const tableAreaId = Number(table.areaId || table.area_id);
    return tableAreaId === Number(selectedArea);
  });

  return (
    <div className="flex flex-col w-full h-full bg-gray-50/50">
      {/* Area Tabs */}
      <div className="flex items-center gap-2 px-4 pt-4 overflow-x-auto no-scrollbar shrink-0">
        {areas.map(area => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(area.id)}
            className={cn(
              'px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200',
              selectedArea === area.id 
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-100 shadow-sm'
            )}
          >
            {area.name}
          </button>
        ))}
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {filteredTables.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Khu vực này hiện chưa có bàn</h3>
            <p className="text-sm font-bold text-gray-400 mt-2">Vui lòng chọn khu vực khác hoặc thêm bàn mới.</p>
          </div>
        ) : (
          <div className={gridClass}>
            {filteredTables.map(table => (
              <TableCard 
                key={table.id}
                table={table}
                isSelected={selectedTableId === table.id}
                onSelect={onSelect ? () => onSelect(table) : undefined}
                onAction={onAction ? () => onAction(table) : undefined}
                onEdit={onEdit ? () => onEdit(table) : undefined}
                onDelete={onDelete ? () => onDelete(table.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
