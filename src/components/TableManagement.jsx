/**
 * TableManagement.jsx — Quản lý sơ đồ bàn (Nâng cấp đầy đủ nghiệp vụ)
 *
 * Nghiệp vụ Production:
 *   - Mở bàn (AVAILABLE -> OCCUPIED)
 *   - Dọn bàn (DIRTY -> AVAILABLE)
 *   - Đặt trước (RESERVED)
 *   - Gộp bàn (Merge Tables)
 *   - Thống kê bàn
 */
import React, { useState, useMemo } from 'react';
import { useTableStore } from '../store/useTableStore';
import { useOrderStore } from '../store/useOrderStore';
import SplitTableModal from './pos/SplitTableModal';
import { cn } from '../utils/cn';
import {
  LayoutGrid, Users, CircleDot, ChefHat,
  Clock, CalendarClock, X, CheckCircle2,
  Loader2, TrendingUp, Sparkles, ArrowRightLeft,
  Phone, User as UserIcon, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  AVAILABLE: { card: 'bg-white border-emerald-100 hover:border-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Trống' },
  OCCUPIED:  { card: 'bg-white border-amber-200 hover:border-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Đang dùng', pulse: true },
  RESERVED:  { card: 'bg-white border-blue-100 hover:border-blue-300', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Đặt trước' },
  DIRTY:     { card: 'bg-gray-50 border-gray-200 hover:border-gray-400', badge: 'bg-gray-200 text-gray-600 border-gray-300', dot: 'bg-gray-400', label: 'Cần dọn' },
};

// ─── Component: Thẻ bàn ───
const TableCard = ({ table, isSelected, onSelect, onAction }) => {
  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;
  return (
    <div
      onClick={() => onSelect(table)}
      className={cn(
        'relative p-5 rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden select-none group',
        config.card,
        isSelected && 'border-gold-500 shadow-xl ring-4 ring-gold-500/5 bg-gold-50/5',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider', config.badge)}>
          <div className={cn('w-1.5 h-1.5 rounded-full', config.dot, config.pulse && 'animate-pulse')} />
          {config.label}
        </div>
        
        {/* Settings Button - Only shows on hover or if selected */}
        <button 
          onClick={(e) => { e.stopPropagation(); onAction(table); }}
          className="p-1.5 bg-gray-50 text-gray-400 hover:bg-gold-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Settings size={14} />
        </button>
      </div>

      <h3 className={cn('font-black text-xl tracking-tight transition-colors', isSelected ? 'text-gold-600' : 'text-gray-900')}>
        {table.tableNumber}
      </h3>
      <div className="flex items-center gap-1.5 mt-2">
        <Users size={12} className="text-gray-400" />
        <span className="text-[10px] font-black text-gray-400 uppercase">{table.capacity} chỗ</span>
      </div>
      {isSelected && <div className="absolute top-0 right-1 w-6 h-6 bg-gold-600 rotate-45 translate-x-3 -translate-y-3 shadow-lg" />}
    </div>
  );
};

// ─── Component: Modal Hành động ───
const TableActionModal = ({ table, onClose, onSelect }) => {
  const { openTable, cleanTable, reserveTable, mergeTables, tables } = useTableStore();
  const [view, setView] = useState('MAIN'); // MAIN, RESERVE, MERGE
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reserve State
  const [resInfo, setResInfo] = useState({ customerName: '', phone: '', time: '' });
  
  // Merge State
  const [targetTableId, setTargetTableId] = useState('');

  if (!table) return null;

  const handleOpen = async () => {
    setLoading(true);
    const res = await openTable(table.id);
    if (res) onSelect({ table, orderId: res.orderId, order: res.order });
    setLoading(false);
    onClose();
  };

  const handleClean = async () => {
    await cleanTable(table.id);
    onClose();
  };

  const handleReserve = async () => {
    if (!resInfo.customerName || !resInfo.phone) return toast.error("Vui lòng điền đủ thông tin");
    await reserveTable({ tableId: table.id, ...resInfo });
    onClose();
  };

  const handleMerge = async () => {
    if (!targetTableId) return toast.error("Vui lòng chọn bàn đích");
    const success = await mergeTables(table.id, Number(targetTableId));
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Bàn {table.tableNumber}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
        </div>

        {view === 'MAIN' && (
          <div className="space-y-3">
            {table.status === 'AVAILABLE' && (
              <>
                <button onClick={handleOpen} disabled={loading} className="w-full py-4 bg-gold-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20">
                  {loading ? <Loader2 className="animate-spin" /> : <ChefHat size={18} />} Mở bàn ngay
                </button>
                <button onClick={() => setView('RESERVE')} className="w-full py-4 bg-white border border-blue-200 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all">
                  <CalendarClock size={18} /> Đặt trước
                </button>
              </>
            )}
            {table.status === 'OCCUPIED' && (
              <>
                <button onClick={() => onSelect({ table, orderId: table.currentOrderId })} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-700 transition-all">
                  <Sparkles size={18} /> Đi tới Order
                </button>
                <button onClick={() => setView('MERGE')} className="w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-50 transition-all">
                  <ArrowRightLeft size={18} /> Gộp bàn
                </button>
                <button 
                  onClick={() => {
                    setIsSplitOpen(true);
                  }} 
                  className="w-full py-4 bg-white border border-gray-200 text-gold-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gold-50/50 transition-all"
                >
                  <ArrowRightLeft size={18} className="rotate-90" /> Tách món / đơn
                </button>
              </>
            )}
            {table.status === 'RESERVED' && (
              <button onClick={handleOpen} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                <CheckCircle2 size={18} /> Nhận khách (Check-in)
              </button>
            )}
            {table.status === 'DIRTY' && (
              <button onClick={handleClean} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20">
                <Sparkles size={18} /> Đã dọn xong
              </button>
            )}
          </div>
        )}

        {view === 'RESERVE' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên khách hàng</label>
              <div className="relative"><UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={resInfo.customerName} onChange={e => setResInfo({...resInfo, customerName: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" placeholder="Nguyễn Văn A" /></div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</label>
              <div className="relative"><Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={resInfo.phone} onChange={e => setResInfo({...resInfo, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" placeholder="090..." /></div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian</label>
              <div className="relative"><Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={resInfo.time} onChange={e => setResInfo({...resInfo, time: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" placeholder="19:00" /></div>
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setView('MAIN')} className="flex-1 py-3 text-sm font-black text-gray-400">Quay lại</button>
              <button onClick={handleReserve} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase">Xác nhận đặt</button>
            </div>
          </div>
        )}

        {view === 'MERGE' && (
          <div className="space-y-4">
             <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chọn bàn gộp tới</label>
              <select value={targetTableId} onChange={e => setTargetTableId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none">
                <option value="">-- Chọn bàn --</option>
                {tables.filter(t => t.id !== table.id).map(t => <option key={t.id} value={t.id}>Bàn {t.tableNumber} ({STATUS_CONFIG[t.status]?.label})</option>)}
              </select>
            </div>
            <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-3 rounded-xl">Toàn bộ đơn hàng hiện tại sẽ được chuyển sang bàn đích.</p>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setView('MAIN')} className="flex-1 py-3 text-sm font-black text-gray-400">Quay lại</button>
              <button onClick={handleMerge} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black text-xs uppercase">Xác nhận gộp</button>
            </div>
          </div>
        )}
      </div>

      <SplitTableModal 
        isOpen={isSplitOpen} 
        onClose={() => {
          setIsSplitOpen(false);
          onClose();
        }} 
        fromTable={table} 
      />
    </div>
  );
};

// ─── Main Component: TableList ───
export const TableList = ({ selectedTableId, onTableSelect }) => {
  const { tables, loading, fetchTables } = useTableStore();
  const [filter, setFilter] = useState('ALL');
  const [actionTable, setActionTable] = useState(null);

  const stats = useMemo(() => ({ total: tables.length, avail: tables.filter(t => t.status === 'AVAILABLE').length, occu: tables.filter(t => t.status === 'OCCUPIED').length, dirty: tables.filter(t => t.status === 'DIRTY').length }), [tables]);
  const filtered = useMemo(() => filter === 'ALL' ? tables : tables.filter(t => t.status === filter), [tables, filter]);

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center text-gold-600"><LayoutGrid size={20} /></div><div><h2 className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none">Sơ đồ nhà hàng</h2><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Floor Diagram v2</p></div></div>
          <button onClick={() => fetchTables(1)} className="p-2.5 hover:bg-gold-50 rounded-xl text-gray-400 hover:text-gold-600 transition-all"><TrendingUp size={18} /></button>
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all', filter === f ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50')}>{f === 'ALL' ? 'Tất cả' : STATUS_CONFIG[f].label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {loading ? Array(8).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-50 rounded-2xl animate-pulse" />) : filtered.map(t => (
            <TableCard 
              key={t.id} 
              table={t} 
              isSelected={selectedTableId === t.id} 
              onSelect={(table) => onTableSelect({ table, orderId: table.currentOrderId })} 
              onAction={(table) => setActionTable(table)}
            />
          ))}
        </div>
      </div>
      <TableActionModal table={actionTable} onClose={() => setActionTable(null)} onSelect={onTableSelect} />
    </div>
  );
};

export default TableList;
