/**
 * TableManagement.jsx — Quản lý sơ đồ bàn (Smart Proxy Virtual Table v2)
 *
 * NGHIỆP VỤ PRODUCTION:
 * 1. Mở bàn (AVAILABLE -> OCCUPIED)
 * 2. Dọn bàn (CLEANING -> AVAILABLE)
 * 3. Đặt trước (RESERVED)
 * 4. Gộp bàn (Virtual Table Merge — Smart Proxy Pattern)
 *    - Multi-select bàn để gộp ảo nhiều bàn thành một
 *    - Bàn phụ sẽ hiển thị "Đã gộp" và không thể click
 *    - Tách bàn thủ công hoặc tự động sau thanh toán
 * 5. Tách món / đơn (SplitTableModal)
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useTableStore } from '../store/useTableStore';
import SplitTableModal from './pos/SplitTableModal';
import { cn } from '../utils/cn';
import * as mergeHelper from '../utils/tableMergeHelper';
import {
  LayoutGrid, Users, ChefHat,
  Clock, CalendarClock, X, CheckCircle2,
  Loader2, TrendingUp, Sparkles, ArrowRightLeft,
  Phone, User as UserIcon, Settings, Layers, Link
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Cấu hình màu/style cho từng trạng thái bàn ───────────────────────────
const STATUS_CONFIG = {
  AVAILABLE: {
    card: 'bg-white border-emerald-100 hover:border-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Trống'
  },
  OCCUPIED: {
    card: 'bg-white border-amber-200 hover:border-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Đang dùng',
    pulse: true
  },
  RESERVED: {
    card: 'bg-white border-blue-100 hover:border-blue-300',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Đặt trước'
  },
  CLEANING: {
    card: 'bg-gray-50 border-gray-200 hover:border-gray-400',
    badge: 'bg-gray-200 text-gray-600 border-gray-300',
    dot: 'bg-gray-400',
    label: 'Cần dọn'
  },
  // Trạng thái ảo (chỉ tồn tại trên FE) — Bàn phụ đã bị gộp vào bàn chính
  MERGED: {
    card: 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-70 grayscale-[0.3]',
    badge: 'bg-gray-200 text-gray-500 border-gray-300',
    dot: 'bg-gray-400',
    label: 'Đã gộp'
  },
};

// ─── Component: Thẻ bàn ────────────────────────────────────────────────────
const TableCard = ({ table, isSelected, isMergeMode, mergeSelection, onToggleMerge, onSelect, onAction }) => {
  const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.AVAILABLE;

  // Bàn phụ đã gộp -> vô hiệu hoá click
  const isDisabled = table.status === 'MERGED';

  // Checkbox có được tick không (khi ở Merge Mode)
  const isMergeChecked = mergeSelection.includes(table.id);

  const handleClick = () => {
    if (isDisabled) {
      // Click vào bàn con -> thông báo chuyển hướng (thực ra store đã xử lý redirect)
      toast('Bàn này đã gộp. Hệ thống sẽ chuyển đến Bàn Chính.', { icon: '🔗' });
      return;
    }
    if (isMergeMode) {
      // Ở chế độ gộp -> Toggle selection
      onToggleMerge(table.id);
    } else if (table.status === 'RESERVED') {
      // Bàn đặt trước -> mở modal hành động (Check-in / Hủy) thay vì vào Order
      onAction(table);
    } else {
      // Chế độ thường -> Chọn bàn
      onSelect(table);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative p-3 rounded-2xl border-2 transition-all duration-300 overflow-hidden select-none group',
        config.card,
        // Highlight khi đang được chọn để xem order
        isSelected && !isMergeMode && !isDisabled && 'border-gold-500 shadow-lg ring-4 ring-gold-500/5 bg-gold-50/5',
        // Highlight khi ở Merge Mode và đang được tick
        isMergeMode && isMergeChecked && 'border-blue-500 shadow-md ring-4 ring-blue-500/10 bg-blue-50/50',
      )}
    >
      {/* Badge: Bàn ảo (Bàn chính của nhóm gộp) */}
      {table.isVirtual && (
        <span className="absolute top-2 left-2 text-[9px] font-black text-blue-600 px-1.5 py-0.5 bg-blue-100 rounded-lg leading-none">
          *Gộp
        </span>
      )}

      {/* Checkbox khi ở chế độ Merge Mode */}
      {isMergeMode && !isDisabled && (
        <label className="absolute top-4 right-4 flex items-center cursor-pointer z-10" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isMergeChecked}
            onChange={() => onToggleMerge(table.id)}
            className="w-5 h-5 cursor-pointer accent-blue-600 rounded border-2 border-gray-300"
          />
        </label>
      )}

      {/* Header: Badge trạng thái + Nút cài đặt */}
      <div className="flex items-center justify-between mb-3 mt-1">
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider',
          config.badge
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full', config.dot, config.pulse && !isDisabled && 'animate-pulse')} />
          {/* Bàn con gộp: hiện tên bàn chính */}
          {table.isMerged && table.mainTableId
            ? `Đã gộp`
            : config.label
          }
        </div>

        {/* Nút cài đặt — chỉ hiện khi không phải bàn con, không ở chế độ Merge Mode */}
        {!isDisabled && !isMergeMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(table); }}
            className={cn(
              'p-1.5 bg-gray-50 text-gray-400 hover:bg-gold-600 hover:text-white rounded-lg transition-all',
              // Bàn RESERVED: Luôn hiện gear icon rõ ràng (vì click vào card cũng mở modal rồi)
              // Bàn khác: ẩn cho đến khi hover
              table.status === 'RESERVED' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Settings size={14} />
          </button>
        )}
      </div>

      {/* Tên bàn */}
      <h3 className={cn(
        'font-black tracking-tight transition-colors flex items-center gap-2',
        // Bàn ảo có thể có tên dài hơn → font nhỏ hơn
        table.isVirtual ? 'text-sm' : 'text-lg',
        isMergeChecked ? 'text-blue-600' : isSelected && !isDisabled ? 'text-gold-600' : 'text-gray-900'
      )}>
        {table.tableNumber}
        {/* Icon liên kết cho bàn con */}
        {table.isMerged && <Link size={12} className="text-gray-400 shrink-0" />}
      </h3>

      {/* Sức chứa */}
      <div className="flex items-center gap-1.5 mt-2">
        <Users size={12} className={isDisabled ? 'text-gray-300' : 'text-gray-400'} />
        <span className="text-[10px] font-black text-gray-400 uppercase">{table.capacity} chỗ</span>
      </div>

      {/* Ribbon góc trên phải khi đang được chọn */}
      {isSelected && !isMergeMode && !isDisabled && (
        <div className="absolute top-0 right-1 w-6 h-6 bg-gold-600 rotate-45 translate-x-3 -translate-y-3 shadow-lg" />
      )}
    </div>
  );
};

// ─── Component: Modal Hành động Bàn ────────────────────────────────────────
const TableActionModal = ({ table, onClose, onSelect }) => {
  // Lấy các actions cần thiết từ store
  const { openTable, cleanTable, reserveTable, cancelReservation, unmergeVirtualTable } = useTableStore();
  const [view, setView] = useState('MAIN'); // MAIN | RESERVE
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resInfo, setResInfo] = useState({ customerName: '', phone: '', time: '' });

  // Reset view về MAIN mỗi lần mở modal cho bàn khác
  // Nếu không reset, form "Đặt trước" sẽ vẩn hiện khi mở lại modal
  useEffect(() => {
    setView('MAIN');
    setLoading(false);
    setResInfo({ customerName: '', phone: '', time: '' });
  }, [table?.id]);

  if (!table) return null;

  // Xử lý Mở bàn (AVAILABLE -> chọn bàn) hoặc Check-in (RESERVED -> OCCUPIED)
  const handleOpen = async () => {
    setLoading(true);
    const res = await openTable(table.id);
    if (res) onSelect(table.id);
    setLoading(false);
    onClose();
  };

  // Xử lý Dọn bàn (CLEANING -> AVAILABLE)
  const handleClean = async () => {
    await cleanTable(table.id);
    onClose();
  };

  // Xử lý Đặt bàn trước
  const handleReserve = async () => {
    if (!resInfo.customerName || !resInfo.phone) {
      return toast.error("Vui lòng điền đủ tên và số điện thoại.");
    }
    await reserveTable({ tableId: table.id, ...resInfo });
    onClose();
  };

  // Xử lý Hủy đặt trước — trả bàn về AVAILABLE
  const handleCancelReservation = async () => {
    setLoading(true);
    await cancelReservation(table.id);
    setLoading(false);
    onClose();
  };

  // Xử lý Huỷ gộp bàn ảo (UnVirtual Merge)

  // Dùng toast custom thay vì window.confirm vì window.confirm có thể bị block trên một số môi trường
  const handleUnmerge = async () => {
    // Hiển thị toast confirm 2 bước để tránh dùng window.confirm
    toast((t) => (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <p className="text-sm font-bold text-gray-900">Huỷ gộp "{table.tableNumber}"?</p>
        <p className="text-[11px] text-gray-500">Bàn phụ sẽ về trạng thái Trống. Order vẫn ở bàn chính.</p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2 text-xs font-bold text-gray-400 bg-gray-100 rounded-xl"
          >
            Hủy
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setLoading(true);
              const success = await unmergeVirtualTable(table.id);
              if (success) {
                toast.success('Đã huỷ gộp bàn thành công.');
                onClose();
              }
              setLoading(false);
            }}
            className="flex-1 py-2 text-xs font-bold text-white bg-rose-500 rounded-xl"
          >
            Xác nhận
          </button>
        </div>
      </div>
    ), { duration: 8000 });
  };


  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header đặc biệt cho Bàn Ảo */}
        {table.isVirtual && (
          <div className="bg-blue-50 border-b border-blue-100 px-8 pt-6 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={16} className="text-blue-600" />
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Bàn Ảo (Đã Gộp)</p>
            </div>
            <h2 className="text-xl font-black text-blue-900 tracking-tight">{table.tableNumber}</h2>
            <p className="text-xs text-blue-500 mt-1 font-bold">{table.capacity} chỗ ngồi tổng cộng</p>
          </div>
        )}

        <div className="p-8">
          {/* Header cho Bàn thông thường */}
          {!table.isVirtual && (
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{table.tableNumber}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{table.capacity} chỗ • {STATUS_CONFIG[table.status]?.label}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
          )}

          {/* Nút đóng modal cho Bàn Ảo */}
          {table.isVirtual && (
            <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-blue-100 rounded-xl">
              <X size={20} className="text-blue-600" />
            </button>
          )}

          {/* ── View: MAIN ── */}
          {view === 'MAIN' && (
            <div className="space-y-3">

              {/* AVAILABLE: Mở bàn / Đặt trước */}
              {table.status === 'AVAILABLE' && (
                <>
                  <button onClick={handleOpen} disabled={loading} className="w-full py-4 bg-gold-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gold-700 transition-all shadow-lg shadow-gold-600/20">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ChefHat size={18} />} Mở bàn ngay
                  </button>
                  <button onClick={() => setView('RESERVE')} className="w-full py-4 bg-white border border-blue-200 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all">
                    <CalendarClock size={18} /> Đặt trước
                  </button>
                </>
              )}

              {/* OCCUPIED: Vào Order / Tách món / Huỷ gộp (nếu là bàn ảo) */}
              {table.status === 'OCCUPIED' && (
                <>
                  <button onClick={() => { onSelect(table.id); onClose(); }} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-700 transition-all">
                    <Sparkles size={18} /> Đi tới Order
                  </button>

                  {/* Tách món — cho cả bàn thường và bàn ảo */}
                  <button onClick={() => setIsSplitOpen(true)} className="w-full py-4 bg-white border border-gray-200 text-gold-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gold-50/50 transition-all">
                    <ArrowRightLeft size={18} className="rotate-90" /> Tách món / đơn
                  </button>

                  {/* Huỷ gộp — CHỈ hiện khi đây là Bàn Ảo (isVirtual) */}
                  {table.isVirtual && (
                    <button onClick={handleUnmerge} disabled={loading} className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-rose-50 transition-all">
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Layers size={18} />} Huỷ Gộp Bàn
                    </button>
                  )}
                </>
              )}

              {/* RESERVED: Check-in khách + Hủy đặt trước */}
              {table.status === 'RESERVED' && (
                <>
                  {/* Nhận khách — chuyển RESERVED -> OCCUPIED (mở luồng phục vụ) */}
                  <button onClick={handleOpen} disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Nhận khách (Check-in)
                  </button>
                  {/* Hủy đặt — trả bàn về AVAILABLE khi khách không đến */}
                  <button onClick={handleCancelReservation} disabled={loading} className="w-full py-4 bg-white border border-red-200 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-50 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <X size={18} />} Hủy đặt trước
                  </button>
                </>
              )}

              {/* CLEANING: Đã dọn xong */}
              {table.status === 'CLEANING' && (
                <button onClick={handleClean} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20">
                  <Sparkles size={18} /> Đã dọn xong
                </button>
              )}
            </div>
          )}

          {/* ── View: RESERVE ── */}
          {view === 'RESERVE' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên khách hàng</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={resInfo.customerName}
                    onChange={e => setResInfo({ ...resInfo, customerName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-blue-300"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={resInfo.phone}
                    onChange={e => setResInfo({ ...resInfo, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-blue-300"
                    placeholder="090..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian</label>
                <div className="relative">
                  <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={resInfo.time}
                    onChange={e => setResInfo({ ...resInfo, time: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:border-blue-300"
                    placeholder="19:00"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setView('MAIN')} className="flex-1 py-3 text-sm font-black text-gray-400 hover:bg-gray-50 rounded-xl">Quay lại</button>
                <button onClick={handleReserve} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase">Xác nhận đặt</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SplitTableModal: Tách món ra bàn khác */}
      <SplitTableModal
        isOpen={isSplitOpen}
        onClose={() => { setIsSplitOpen(false); onClose(); }}
        fromTable={table}
      />
    </div>
  );
};

// ─── Main Component: TableList ─────────────────────────────────────────────
// ─── Component: Dialog xác nhận Gộp Bàn (thay thế window.confirm) ─────────
const MergeConfirmDialog = ({ isOpen, mergeData, onConfirm, onCancel, isLoading }) => {
  if (!isOpen || !mergeData) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Layers size={28} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 text-center tracking-tight mb-1">Xác nhận Gộp Bàn</h2>
        <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest mb-6">Smart Proxy Virtual Table</p>

        {/* Thông tin gộp */}
        <div className="bg-blue-50 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">Bàn ảo sẽ tạo</span>
            <span className="text-sm font-black text-blue-700">{mergeData.virtualName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">Bàn chính</span>
            <span className="text-sm font-black text-gray-900">{mergeData.mainTableNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">Bàn phụ</span>
            <span className="text-sm font-black text-gray-900">{mergeData.childTableNumbers.join(', ')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">Tổng sức chứa</span>
            <span className="text-sm font-black text-gray-900">{mergeData.totalCapacity} chỗ</span>
          </div>
        </div>

        <p className="text-[11px] text-amber-600 bg-amber-50 p-3 rounded-xl font-bold mb-6">
          ⚠️ Bàn phụ sẽ bị khoá (chuyển sang "Đặt trước"). Order từ bàn phụ sẽ được gom vào bàn chính.
        </p>

        {/* Nút hành động */}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isLoading} className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50">Huỷ</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
            Xác nhận gộp
          </button>
        </div>
      </div>
    </div>
  );
};

export const TableList = ({ selectedTableId, onTableSelect }) => {
  const { tables, loading, fetchTables, createVirtualMerge, virtualTables } = useTableStore();
  const [filter, setFilter] = useState('ALL');
  const [actionTable, setActionTable] = useState(null);
  // State cho dialog xác nhận gộp bàn
  const [mergeConfirmData, setMergeConfirmData] = useState(null); // null = ẩn dialog

  // ── Trạng thái Chế Độ Gộp (Merge Mode) ──
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState([]); // Danh sách ID bàn đang được chọn
  const [isMerging, setIsMerging] = useState(false);

  // Toggle chọn/bỏ chọn một bàn trong Merge Mode
  const toggleMergeSelection = (tableId) => {
    setMergeSelection(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  // Xác nhận gộp bàn: bàn đầu tiên là Main, phần còn lại là Children
  const handleConfirmMerge = async () => {
    if (mergeSelection.length < 2) return toast.error("Vui lòng chọn ít nhất 2 bàn để gộp!");

    // Validate: Không gộp bàn đã merged, không gộp bàn không hợp lệ
    const invalidTable = mergeSelection.find(id => {
      const t = tables.find(x => x.id === id);
      return !mergeHelper.isValidChildTable(t);
    });
    if (invalidTable) {
      return toast.error("Một số bàn được chọn không hợp lệ (đã gộp hoặc trạng thái không phù hợp).");
    }

    // Validate trước khi show dialog
    const mainTableId = mergeSelection[0];
    const childTableIds = mergeSelection.slice(1);
    const mainTable = tables.find(t => t.id === mainTableId);
    const childTables = childTableIds.map(id => tables.find(t => t.id === id));

    const virtualName = mergeHelper.generateVirtualName(mainTable, childTables);
    const totalCapacity = [mainTable, ...childTables].reduce((sum, t) => sum + (t?.capacity || 4), 0);

    // Mở dialog xác nhận (thay window.confirm)
    setMergeConfirmData({
      mainTableId,
      childTableIds,
      virtualName,
      mainTableNumber: mainTable?.tableNumber,
      childTableNumbers: childTables.map(t => t?.tableNumber).filter(Boolean),
      totalCapacity,
    });
  };

  // Khi user click "Xác nhận" trong dialog
  const handleDoMerge = async () => {
    if (!mergeConfirmData) return;
    setIsMerging(true);
    const result = await createVirtualMerge(mergeConfirmData.mainTableId, mergeConfirmData.childTableIds);
    if (result) {
      setIsMergeMode(false);
      setMergeSelection([]);
      setMergeConfirmData(null);
      toast.success(`🎉 Đã tạo "${result.virtualName}" thành công!`);
    } else {
      setMergeConfirmData(null);
    }
    setIsMerging(false);
  };

  // Danh sách bàn sau khi lọc theo filter tab
  const filtered = useMemo(() =>
    filter === 'ALL' ? tables : tables.filter(t => t.status === filter),
    [tables, filter]
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
 
      {/* Header */}
      <div className="p-4 border-b border-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center text-gold-600">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-lg uppercase tracking-tight leading-none">Sơ đồ nhà hàng</h2>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                Smart Proxy v2 {virtualTables.length > 0 && `• ${virtualTables.length} bàn ảo`}
              </p>
            </div>
          </div>

          {/* Nút bật/tắt Merge Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => { setIsMergeMode(!isMergeMode); setMergeSelection([]); }}
              className={cn(
                "px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 border",
                isMergeMode
                  ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                  : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              )}
            >
              <Layers size={13} />
              {isMergeMode ? 'Huỷ chọn' : 'Gộp bàn'}
            </button>
            {/* Refetch */}
            <button onClick={() => fetchTables()} className="p-2.5 hover:bg-gold-50 rounded-xl text-gray-400 hover:text-gold-600 transition-all">
              <TrendingUp size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all',
                filter === f ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-50'
              )}
            >
              {f === 'ALL' ? 'Tất cả' : STATUS_CONFIG[f]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid bàn */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-24">
        {loading
          ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(8).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-50 rounded-2xl animate-pulse" />)}
            </div>
          )
          : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(t => (
                <TableCard
                  key={t.id}
                  table={t}
                  isSelected={selectedTableId === t.id}
                  isMergeMode={isMergeMode}
                  mergeSelection={mergeSelection}
                  onToggleMerge={toggleMergeSelection}
                  onSelect={(table) => onTableSelect(table.id)}
                  onAction={(table) => setActionTable(table)}
                />
              ))}
            </div>
          )
        }
      </div>

      {/* Floating Merge Confirm Bar — hiện khi đang ở Merge Mode */}
      {isMergeMode && (
        <div className="absolute inset-x-0 bottom-4 px-4 pointer-events-none animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between pointer-events-auto border border-gray-700">
            <div>
              <p className="font-black text-sm uppercase tracking-wider">
                {mergeSelection.length === 0 ? 'Chọn bàn để gộp' : `Đã chọn ${mergeSelection.length} bàn`}
              </p>
              {mergeSelection.length > 0 && (
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  {mergeSelection.map(id => tables.find(t => t.id === id)?.tableNumber).filter(Boolean).join(' + ')}
                </p>
              )}
            </div>
            <button
              onClick={handleConfirmMerge}
              disabled={mergeSelection.length < 2 || isMerging}
              className={cn(
                "px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all",
                mergeSelection.length >= 2 && !isMerging
                  ? "bg-blue-600 text-white shadow-lg hover:bg-blue-500"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              {isMerging ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
              Xác nhận gộp
            </button>
          </div>
        </div>
      )}

      {/* Modal hành động bàn */}
      <TableActionModal table={actionTable} onClose={() => setActionTable(null)} onSelect={onTableSelect} />

      {/* Dialog xác nhận gộp bàn (React inline modal, không dùng window.confirm) */}
      <MergeConfirmDialog
        isOpen={!!mergeConfirmData}
        mergeData={mergeConfirmData}
        onConfirm={handleDoMerge}
        onCancel={() => setMergeConfirmData(null)}
        isLoading={isMerging}
      />
    </div>
  );
};

export default TableList;
