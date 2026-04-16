import React, { useEffect, useState } from 'react';
import { useTableStore } from '../store/useTableStore';
import FloorPlanView from '../components/table-map/FloorPlanView';
import TableFormModal from '../components/table-map/TableFormModal';
import AreaFormModal from '../components/table-map/AreaFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { Plus, LayoutGrid, Loader2, Layers } from 'lucide-react';

export default function TableMapPage() {
  const { tables, loading, fetchTables, deleteTable, areas, deleteArea } = useTableStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [areaToDelete, setAreaToDelete] = useState(null);
  const [selectedArea, setSelectedArea] = useState('ALL');

  useEffect(() => {
    fetchTables(1); // Default branch
  }, [fetchTables]);

  const handleAddTable = () => {
    setEditingTable({ area_id: selectedArea !== 'ALL' ? selectedArea : 1 });
    setIsFormOpen(true);
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setIsFormOpen(true);
  };

  const handleDeleteTable = (table) => {
    setTableToDelete(table);
  };

  // Lọc theo khu vực
  const filteredTables = tables.filter(table => {
    if (selectedArea === 'ALL') return true;
    const tableAreaId = Number(table.areaId || table.area_id);
    return tableAreaId === Number(selectedArea);
  });

  const handleConfirmDelete = async () => {
    if (!tableToDelete) return;
    await deleteTable(tableToDelete.id);
    setTableToDelete(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-gold-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">Sơ đồ bàn</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">Quản lý không gian nhà hàng</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <button 
            onClick={handleAddTable}
            className="flex items-center gap-2 px-6 py-3 bg-gold-600 text-white rounded-2xl shadow-lg shadow-gold-600/20 hover:bg-gold-700 transition-all active:scale-95 group font-black text-[10px] uppercase tracking-widest w-full justify-center"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Thêm bàn
          </button>
          <button 
            onClick={() => setIsAreaModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest w-full justify-center shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" /> Thêm khu vực
          </button>
          
          {selectedArea !== 'ALL' && (
            <button 
              onClick={() => setAreaToDelete(areas.find(a => a.id === selectedArea))}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-500 border border-red-100 rounded-2xl hover:bg-red-100 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest w-full justify-center shadow-sm"
            >
               Xóa khu vực
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 rounded-3xl xl:rounded-[2.5rem] shadow-inner border border-gray-200 overflow-hidden relative p-0">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <Loader2 className="w-10 h-10 text-gold-600 animate-spin" />
            <p className="text-gray-400 mt-4 text-[10px] font-black uppercase tracking-widest">Đang tải cấu trúc bàn...</p>
          </div>
        ) : tables.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-8">
             <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
               <LayoutGrid className="w-10 h-10 text-gray-300" />
             </div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Chưa có bàn nào</h3>
             <p className="text-sm font-bold text-gray-400 mt-2">Bắt đầu bằng cách thêm bàn mới vào hệ thống.</p>
           </div>
        ) : (
          <FloorPlanView 
            tables={filteredTables}
            onEdit={handleEditTable}
            onDelete={handleDeleteTable}
            selectedArea={selectedArea}
            onAreaChange={setSelectedArea}
          />
        )}
      </div>

      <TableFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingTable}
        onSuccess={(areaId) => setSelectedArea(areaId)}
      />

      <AreaFormModal 
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
      />

      <ConfirmModal 
        isOpen={!!tableToDelete}
        title="Xác nhận xoá bàn"
        message={
          <span>
            Bạn có chắc chắn muốn xoá bàn <span className="font-black text-gray-900 group-hover:text-red-600 transition-colors uppercase">{tableToDelete?.tableNumber || tableToDelete?.table_number}</span> không? 
            Hành động này không thể hoàn tác và sẽ làm mất thông tin bàn trong hệ thống.
          </span>
        }
        onConfirm={handleConfirmDelete}
        onClose={() => setTableToDelete(null)}
        type="danger"
        confirmText="Đồng ý xoá"
      />

      <ConfirmModal 
        isOpen={!!areaToDelete}
        title="Xác nhận xoá khu vực"
        message={
          <span>
            Bạn có chắc chắn muốn xoá khu vực <span className="font-black text-gray-900 uppercase">{areaToDelete?.name}</span> không? 
            Hành động này không thể hoàn tác.
          </span>
        }
        onConfirm={() => {
          if (deleteArea(areaToDelete.id)) {
            setSelectedArea('ALL');
          }
          setAreaToDelete(null);
        }}
        onClose={() => setAreaToDelete(null)}
        type="danger"
        confirmText="Xoá khu vực"
      />
    </div>
  );
}
