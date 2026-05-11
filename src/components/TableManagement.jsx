import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Clock,
  LayoutGrid,
  Loader2,
  Phone,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useTableStore } from '../store/useTableStore';
import SplitTableModal from './pos/SplitTableModal';
import UnmergeTableModal from './pos/UnmergeTableModal';
import FloorPlanView from './table-map/FloorPlanView';
import { cn } from '../utils/cn';
import { isTakeawayArea } from '../utils/takeaway';

const STATUS_CONFIG = {
  AVAILABLE: { label: 'Trống' },
  OCCUPIED: { label: 'Đang dùng' },
  RESERVED: { label: 'Đặt trước' },
  DIRTY: { label: 'Cần dọn' },
  MERGED: { label: 'Đã gộp' },
};

const FILTER_ITEMS = ['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY', 'MERGED'];

const getTableName = table => table?.displayName || table?.tableNumber || `Bàn #${table?.id ?? '?'}`;

const sortTables = tables =>
  [...(tables || [])].sort((left, right) => {
    const leftOrder = left?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(getTableName(left)).localeCompare(String(getTableName(right)), 'vi');
  });

const isMergedMemberTable = table => table?.status === 'MERGED' || table?.isMergedMember;

const isStandaloneOccupiedTable = (table, lazyOpenedTableIds = []) =>
  Boolean(table) &&
  table.status === 'OCCUPIED' &&
  !lazyOpenedTableIds.includes(table.id) &&
  !table.mergeRoot &&
  !isMergedMemberTable(table) &&
  !table.merged &&
  !table.mergeRootTableId;

const buildMergeLabel = (rootTable, memberTables) =>
  [getTableName(rootTable), ...memberTables.map(getTableName)]
    .filter(Boolean)
    .join(' & ');

const SectionTitle = ({ eyebrow, title, description }) => (
  <div>
    {eyebrow ? (
      <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-gold-600">
        {eyebrow}
      </p>
    ) : null}
    <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">{title}</h3>
    {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
  </div>
);

const MergeSelectionCard = ({
  table,
  checked = false,
  locked = false,
  selectedTone = 'amber',
  description,
  onClick,
}) => {
  const accentClasses =
    selectedTone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/80 shadow-emerald-100/80'
      : 'border-amber-200 bg-amber-50/80 shadow-amber-100/80';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        'premium-card premium-card-hover flex w-full items-start justify-between gap-4 p-4 text-left shadow-sm',
        checked ? accentClasses : 'border-slate-200 bg-white',
        locked && 'cursor-default opacity-100'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-base font-black text-slate-900">{getTableName(table)}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {STATUS_CONFIG[table.status]?.label || 'Bàn'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
            {table.capacity || 0} chỗ
          </span>
          {description ? (
            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
              {description}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition',
          checked
            ? selectedTone === 'emerald'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-amber-500 bg-amber-500 text-white'
            : 'border-slate-200 bg-white text-slate-300'
        )}
      >
        {checked ? <CheckCircle2 size={15} /> : '•'}
      </div>
    </button>
  );
};

const TableActionModal = ({ table, onClose, onSelect }) => {
  const {
    openTable,
    cleanTable,
    reserveTable,
    mergeTablesBatch,
    closeTable,
    selectTable,
    tables,
    lazyOpenedTableIds,
  } = useTableStore();

  const [view, setView] = useState('MAIN');
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isUnmergeOpen, setIsUnmergeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resInfo, setResInfo] = useState({ customerName: '', phone: '', time: '' });
  const [mergeRootId, setMergeRootId] = useState(null);
  const [selectedMergeTableIds, setSelectedMergeTableIds] = useState([]);

  const isLazyOpen = lazyOpenedTableIds.includes(table?.id);
  const isMergedMember = isMergedMemberTable(table);
  const isMergeRoot = Boolean(table?.mergeRoot);
  const displayName = getTableName(table);

  const standaloneOccupiedTables = useMemo(
    () => sortTables((tables || []).filter(candidate => isStandaloneOccupiedTable(candidate, lazyOpenedTableIds))),
    [tables, lazyOpenedTableIds]
  );

  const currentTableIsStandaloneEligible = useMemo(
    () => isStandaloneOccupiedTable(table, lazyOpenedTableIds),
    [table, lazyOpenedTableIds]
  );

  const mergeRootOptions = useMemo(() => {
    if (!table) return [];
    if (isMergeRoot) return [table];
    return standaloneOccupiedTables;
  }, [isMergeRoot, standaloneOccupiedTables, table]);

  const mergeRootTable = useMemo(() => {
    if (!table) return null;
    if (isMergeRoot) return table;
    return mergeRootOptions.find(candidate => candidate.id === mergeRootId) || table;
  }, [isMergeRoot, mergeRootId, mergeRootOptions, table]);

  const mergeMemberOptions = useMemo(() => {
    if (!mergeRootTable) return [];
    return standaloneOccupiedTables.filter(candidate => candidate.id !== mergeRootTable.id);
  }, [mergeRootTable, standaloneOccupiedTables]);

  const forcedCurrentSource =
    Boolean(table) &&
    !isMergeRoot &&
    currentTableIsStandaloneEligible &&
    mergeRootTable?.id &&
    mergeRootTable.id !== table.id;

  const effectiveSelectedSourceIds = useMemo(() => {
    const validIds = new Set(
      selectedMergeTableIds.filter(id => mergeMemberOptions.some(candidate => candidate.id === id))
    );

    if (forcedCurrentSource && table?.id) {
      validIds.add(table.id);
    }

    if (mergeRootTable?.id) {
      validIds.delete(mergeRootTable.id);
    }

    return Array.from(validIds);
  }, [forcedCurrentSource, mergeMemberOptions, mergeRootTable?.id, selectedMergeTableIds, table?.id]);

  const selectedMergeTables = useMemo(
    () =>
      sortTables(
        effectiveSelectedSourceIds
          .map(id => mergeMemberOptions.find(candidate => candidate.id === id))
          .filter(Boolean)
      ),
    [effectiveSelectedSourceIds, mergeMemberOptions]
  );

  const mergePreviewLabel = useMemo(
    () => (mergeRootTable ? buildMergeLabel(mergeRootTable, selectedMergeTables) : ''),
    [mergeRootTable, selectedMergeTables]
  );

  const canMerge = table?.status === 'OCCUPIED' && !isLazyOpen && !isMergedMember;
  const canSplit = table?.status === 'OCCUPIED' && !isLazyOpen && !isMergedMember && !isMergeRoot;
  const canClose = table?.status === 'OCCUPIED' && isLazyOpen && !isMergedMember && !isMergeRoot;

  useEffect(() => {
    if (!table) return;
    setView('MAIN');
    setMergeRootId(table.id);
    setSelectedMergeTableIds([]);
    setIsSplitOpen(false);
    setIsUnmergeOpen(false);
    setResInfo({ customerName: '', phone: '', time: '' });
  }, [table?.id]);

  if (!table) return null;

  const redirectToRoot = async () => {
    if (!table.mergeRootTableId) return;
    const rootTable = tables.find(item => item.id === Number(table.mergeRootTableId));
    await selectTable(Number(table.mergeRootTableId));
    if (rootTable) {
      onSelect({ table: rootTable, orderId: rootTable.currentOrderId });
    }
    onClose();
  };

  const goToOrder = () => {
    onSelect({ table, orderId: table.currentOrderId });
    onClose();
  };

  const handleOpen = async () => {
    setLoading(true);
    try {
      const response = await openTable(table.id);
      if (response) {
        onSelect({ table, orderId: response.orderId, order: response.order });
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    await cleanTable(table.id);
    onClose();
  };

  const handleReserve = async () => {
    if (!resInfo.customerName || !resInfo.phone) {
      toast.error('Vui lòng điền đủ thông tin đặt bàn.');
      return;
    }
    await reserveTable({ tableId: table.id, ...resInfo });
    onClose();
  };

  const toggleMergeSource = sourceTableId => {
    if (forcedCurrentSource && sourceTableId === table.id) return;
    setSelectedMergeTableIds(currentIds =>
      currentIds.includes(sourceTableId)
        ? currentIds.filter(id => id !== sourceTableId)
        : [...currentIds, sourceTableId]
    );
  };

  const handleMerge = async () => {
    if (!mergeRootTable?.id) {
      toast.error('Cần chọn một bàn chính để gộp nhóm.');
      return;
    }
    if (effectiveSelectedSourceIds.length === 0) {
      toast.error('Cần chọn ít nhất một bàn thành viên để gộp.');
      return;
    }

    const success = await mergeTablesBatch(mergeRootTable.id, effectiveSelectedSourceIds);
    if (success) onClose();
  };

  const handleCloseTable = async () => {
    setLoading(true);
    try {
      await closeTable(table.id);
      toast.success(`Đã đóng bàn ${displayName}.`);
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Không thể đóng bàn.');
    } finally {
      setLoading(false);
    }
  };

  const modalWidthClass = view === 'MERGE' ? 'max-w-6xl' : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className={cn(
          'premium-card relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl',
          modalWidthClass
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-gold-600">
              Quản lý bàn
            </p>
            <h2 className="mt-2 break-words text-scale-xl font-black tracking-tight text-slate-900">
              {displayName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {STATUS_CONFIG[table.status]?.label || 'Bàn'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {view === 'MAIN' && (
            <div className="space-y-4">
              {isMergedMember ? (
                <div className="space-y-4">
                  <div className="glass-panel rounded-[1.5rem] border border-slate-200 p-5">
                    <SectionTitle
                      eyebrow="Bàn thành viên"
                      title="Bàn này đang thuộc một nhóm gộp"
                      description={`Mọi thao tác gọi món, thanh toán và dọn bàn được thực hiện tại bàn chính${table.mergeRootTableName ? ` ${table.mergeRootTableName}` : ''}.`}
                    />
                  </div>

                  {table.mergeRootTableId ? (
                    <button
                      type="button"
                      onClick={redirectToRoot}
                      className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-slate-900 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      <Sparkles size={18} />
                      Đi tới bàn chính
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!isMergedMember && table.status === 'AVAILABLE' ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpen}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-gold-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-gold-600/20 transition hover:bg-gold-700"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ChefHat size={18} />}
                    Mở bàn ngay
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('RESERVE')}
                    className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-blue-200 bg-white px-5 py-4 text-sm font-black text-blue-600 transition hover:bg-blue-50"
                  >
                    <CalendarClock size={18} />
                    Đặt trước
                  </button>
                </>
              ) : null}

              {!isMergedMember && table.status === 'OCCUPIED' ? (
                <>
                  <button
                    type="button"
                    onClick={goToOrder}
                    className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-amber-600 px-5 py-4 text-sm font-black text-white transition hover:bg-amber-700"
                  >
                    <Sparkles size={18} />
                    Đi tới đơn hàng
                  </button>

                  {isMergeRoot ? (
                    <>
                      <div className="glass-gold rounded-[1.5rem] p-5">
                        <SectionTitle
                          eyebrow="Bàn chính"
                          title="Nhóm bàn đang phục vụ tại một bàn chính"
                          description="Bạn có thể gộp thêm bàn vào nhóm hoặc tách lại nhóm bàn. Các bàn thành viên sẽ chỉ thao tác được trở lại sau khi tách nhóm hoặc sau khi bàn chính hoàn tất thanh toán và dọn bàn."
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setView('MERGE')}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-amber-200 bg-white px-5 py-4 text-sm font-black text-amber-700 transition hover:bg-amber-50"
                      >
                        <ArrowRightLeft size={18} />
                        Gộp thêm bàn vào nhóm
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await selectTable(table.id);
                          setIsUnmergeOpen(true);
                        }}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-emerald-200 bg-white px-5 py-4 text-sm font-black text-emerald-600 transition hover:bg-emerald-50"
                      >
                        <ArrowRightLeft size={18} className="rotate-90" />
                        Tách lại nhóm bàn
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setView('MERGE')}
                        disabled={!canMerge}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRightLeft size={18} />
                        Gộp bàn
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await selectTable(table.id);
                          setIsSplitOpen(true);
                        }}
                        disabled={!canSplit}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-gold-200 bg-white px-5 py-4 text-sm font-black text-gold-700 transition hover:bg-gold-50/50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRightLeft size={18} className="rotate-90" />
                        Tách món sang bàn khác
                      </button>

                      <button
                        type="button"
                        onClick={() => setView('CLOSE_CONFIRM')}
                        disabled={!canClose}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-red-100 bg-white px-5 py-4 text-sm font-black text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={16} />
                        Đóng bàn mở nhầm
                      </button>
                    </>
                  )}
                </>
              ) : null}

              {!isMergedMember && table.status === 'RESERVED' ? (
                <button
                  type="button"
                  onClick={handleOpen}
                  className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  <CheckCircle2 size={18} />
                  Nhận khách
                </button>
              ) : null}

              {!isMergedMember && table.status === 'DIRTY' ? (
                <button
                  type="button"
                  onClick={handleClean}
                  className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <Sparkles size={18} />
                  Đã dọn xong
                </button>
              ) : null}
            </div>
          )}

          {view === 'RESERVE' && (
            <div className="space-y-5">
              <SectionTitle
                eyebrow="Đặt bàn"
                title={`Giữ bàn cho ${displayName}`}
                description="Thông tin này sẽ được lưu cho trạng thái đặt trước của bàn."
              />

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                    Tên khách hàng
                  </span>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={resInfo.customerName}
                      onChange={event =>
                        setResInfo(current => ({ ...current, customerName: event.target.value }))
                      }
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-gold-300 focus:bg-white"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                    Số điện thoại
                  </span>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={resInfo.phone}
                      onChange={event => setResInfo(current => ({ ...current, phone: event.target.value }))}
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-gold-300 focus:bg-white"
                      placeholder="090..."
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                    Thời gian
                  </span>
                  <div className="relative">
                    <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={resInfo.time}
                      onChange={event => setResInfo(current => ({ ...current, time: event.target.value }))}
                      className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-gold-300 focus:bg-white"
                      placeholder="19:00"
                    />
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setView('MAIN')}
                  className="flex-1 rounded-[1.2rem] border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleReserve}
                  className="flex-1 rounded-[1.2rem] bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Xác nhận đặt bàn
                </button>
              </div>
            </div>
          )}

          {view === 'MERGE' && (
            <div className="space-y-6">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr),minmax(320px,0.75fr)]">
                <div className="space-y-5">
                  <div className="premium-card rounded-[1.6rem] p-5 sm:p-6">
                    <SectionTitle
                      eyebrow={isMergeRoot ? 'Mở rộng nhóm bàn' : 'Thiết lập nhóm bàn'}
                      title={
                        isMergeRoot
                          ? 'Chọn thêm bàn thành viên cho bàn chính hiện tại'
                          : 'Chọn bàn chính và các bàn cần gộp'
                      }
                      description={
                        isMergeRoot
                          ? 'Bàn chính đang phục vụ sẽ tiếp tục giữ toàn bộ order. Các bàn được chọn sẽ nhập vào nhóm này và khóa thao tác riêng.'
                          : 'Bàn chính sẽ là nơi gọi thêm món, thanh toán và dọn bàn cho toàn bộ nhóm sau khi gộp.'
                      }
                    />
                  </div>

                  {!isMergeRoot ? (
                    <div className="premium-card rounded-[1.6rem] p-5 sm:p-6">
                      <SectionTitle
                        eyebrow="Bước 1"
                        title="Chọn bàn chính"
                        description="Bàn chính là nơi hệ thống giữ order hoạt động của cả nhóm sau khi gộp."
                      />

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {mergeRootOptions.map(candidate => (
                          <MergeSelectionCard
                            key={candidate.id}
                            table={candidate}
                            checked={mergeRootTable?.id === candidate.id}
                            selectedTone="amber"
                            description={
                              candidate.id === table.id ? 'Bàn đang thao tác' : 'Có thể chọn làm bàn chính'
                            }
                            onClick={() => setMergeRootId(candidate.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="premium-card rounded-[1.6rem] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <SectionTitle
                        eyebrow="Bước 2"
                        title="Chọn bàn thành viên"
                        description="Các bàn được chọn sẽ nhập vào bàn chính và chỉ hoạt động lại khi tách nhóm hoặc hoàn tất cleaning bàn chính."
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMergeTableIds(mergeMemberOptions.map(candidate => candidate.id))}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMergeTableIds([])}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                        >
                          Xóa chọn
                        </button>
                      </div>
                    </div>

                    {forcedCurrentSource ? (
                      <div className="mt-5 rounded-[1.35rem] border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                        <span className="font-black">{displayName}</span> sẽ tự được thêm vào nhóm vì bạn đang mở thao tác từ bàn này và đã chọn một bàn khác làm bàn chính.
                      </div>
                    ) : null}

                    {mergeMemberOptions.length === 0 ? (
                      <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        Hiện không còn bàn độc lập nào đủ điều kiện để gộp thêm.
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {mergeMemberOptions.map(candidate => {
                          const isLockedCurrent = forcedCurrentSource && candidate.id === table.id;
                          const isChecked = effectiveSelectedSourceIds.includes(candidate.id);

                          return (
                            <MergeSelectionCard
                              key={candidate.id}
                              table={candidate}
                              checked={isChecked}
                              locked={isLockedCurrent}
                              selectedTone="emerald"
                              description={isLockedCurrent ? 'Bắt buộc gộp trong thao tác này' : 'Bàn thành viên'}
                              onClick={() => toggleMergeSource(candidate.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <aside className="space-y-5">
                  <div className="glass-gold rounded-[1.75rem] p-5 sm:p-6">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-gold-700">
                      Xem trước kết quả
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">Bàn chính</p>
                    <p className="mt-1 break-words text-2xl font-black tracking-tight text-slate-900">
                      {getTableName(mergeRootTable)}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-[1.25rem] bg-white/80 px-4 py-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                          Bàn thành viên
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-900">
                          {selectedMergeTables.length}
                        </p>
                      </div>
                      <div className="rounded-[1.25rem] bg-white/80 px-4 py-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                          Sau khi gộp
                        </p>
                        <p className="mt-2 text-base font-black leading-7 text-slate-900">
                          {mergePreviewLabel || getTableName(mergeRootTable)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="premium-card rounded-[1.6rem] p-5">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-slate-400">
                      Bàn sẽ nhập vào nhóm
                    </p>
                    <div className="mt-4 flex max-h-[300px] flex-wrap gap-2 overflow-y-auto pr-1">
                      {selectedMergeTables.length > 0 ? (
                        selectedMergeTables.map(candidate => (
                          <span
                            key={candidate.id}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                          >
                            {getTableName(candidate)}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm leading-6 text-slate-500">
                          Chưa có bàn thành viên nào được chọn.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="premium-card rounded-[1.6rem] p-5">
                    <p className="text-sm font-black text-slate-900">Nguyên tắc xử lý</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-500">
                      <li>Tất cả món và thanh toán sẽ đi qua bàn chính.</li>
                      <li>Bàn thành viên bị khóa thao tác riêng sau khi gộp.</li>
                      <li>Tên hiển thị nhóm bàn sẽ ghép theo dạng T01 & T02 & T03.</li>
                    </ul>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setView('MAIN')}
                  className="flex-1 rounded-[1.3rem] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={effectiveSelectedSourceIds.length === 0}
                  className="flex flex-1 items-center justify-center gap-3 rounded-[1.3rem] bg-amber-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowRightLeft size={18} />
                  Xác nhận gộp nhóm bàn
                </button>
              </div>
            </div>
          )}

          {view === 'CLOSE_CONFIRM' && (
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-red-100 bg-red-50 p-5">
                <SectionTitle
                  eyebrow="Xác nhận"
                  title="Đóng bàn đang mở nhầm"
                  description="Chỉ dùng cho trường hợp bàn vừa được mở nhưng chưa có order thực sự."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setView('MAIN')}
                  className="flex-1 rounded-[1.2rem] border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleCloseTable}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-3 rounded-[1.2rem] bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Đóng bàn ngay
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SplitTableModal
        isOpen={isSplitOpen}
        onClose={() => {
          setIsSplitOpen(false);
          onClose();
        }}
        fromTable={table}
      />

      <UnmergeTableModal
        isOpen={isUnmergeOpen}
        onClose={() => setIsUnmergeOpen(false)}
        rootTable={table}
      />
    </div>
  );
};

export const TableList = ({ currentOrderTarget, onTableSelect }) => {
  const { tables, areas, fetchAreas, loading, fetchTables, activeBranchId, areasBranchId } = useTableStore();
  const [mode, setMode] = useState('DINE_IN');
  const [filter, setFilter] = useState('ALL');
  const [selectedDineInArea, setSelectedDineInArea] = useState('ALL');
  const [selectedTakeawayArea, setSelectedTakeawayArea] = useState('ALL');
  const [actionTable, setActionTable] = useState(null);

  useEffect(() => {
    if (areas.length <= 1 || (activeBranchId && areasBranchId !== activeBranchId)) {
      fetchAreas(activeBranchId);
    }
  }, [activeBranchId, areas.length, areasBranchId, fetchAreas]);

  const actualAreas = useMemo(() => (areas || []).filter(area => area.id !== 'ALL'), [areas]);
  const takeawayAreas = useMemo(() => actualAreas.filter(isTakeawayArea), [actualAreas]);
  const dineInAreas = useMemo(() => actualAreas.filter(area => !isTakeawayArea(area)), [actualAreas]);

  const takeawayAreaIds = useMemo(
    () => new Set(takeawayAreas.map(area => Number(area.id))),
    [takeawayAreas]
  );

  const takeawayTables = useMemo(
    () => (tables || []).filter(table => takeawayAreaIds.has(Number(table.areaId ?? table.area_id))),
    [tables, takeawayAreaIds]
  );

  const dineInTables = useMemo(
    () => (tables || []).filter(table => !takeawayAreaIds.has(Number(table.areaId ?? table.area_id))),
    [tables, takeawayAreaIds]
  );

  const filteredTables = useMemo(() => {
    const sourceTables = mode === 'TAKEAWAY' ? takeawayTables : dineInTables;
    if (filter === 'ALL') return sourceTables;
    return sourceTables.filter(table => table.status === filter);
  }, [dineInTables, filter, mode, takeawayTables]);

  const dineInAreaOptions = useMemo(
    () => [{ id: 'ALL', name: 'Tất cả' }, ...dineInAreas],
    [dineInAreas]
  );

  const takeawayAreaOptions = useMemo(() => {
    if (takeawayAreas.length <= 1) return takeawayAreas;
    return [{ id: 'ALL', name: 'Tất cả' }, ...takeawayAreas];
  }, [takeawayAreas]);

  const takeawayAreaSelection = takeawayAreas.length === 1 ? takeawayAreas[0].id : selectedTakeawayArea;

  const handleDirectSelect = table => {
    if (table.status === 'MERGED' && table.mergeRootTableId) {
      const rootTable = tables.find(item => item.id === Number(table.mergeRootTableId));
      if (rootTable) {
        onTableSelect({ table: rootTable, orderId: rootTable.currentOrderId });
        return;
      }
    }
    onTableSelect({ table, orderId: table.currentOrderId });
  };

  return (
    <div className="premium-card flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white text-slate-900 shadow-sm">
      <div className="flex border-b border-slate-100 bg-slate-50 p-2">
        <button
          type="button"
          onClick={() => setMode('DINE_IN')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.22em] transition',
            mode === 'DINE_IN' ? 'bg-white text-gold-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <LayoutGrid size={14} />
          Tại bàn
        </button>
        <button
          type="button"
          onClick={() => setMode('TAKEAWAY')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.22em] transition',
            mode === 'TAKEAWAY' ? 'bg-white text-gold-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <ShoppingBag size={14} />
          Mang về
        </button>
      </div>

      <div className="border-b border-slate-100 px-6 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
              {mode === 'DINE_IN' ? <LayoutGrid size={20} /> : <ShoppingBag size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black tracking-tight text-slate-900">
                {mode === 'DINE_IN' ? 'Sơ đồ bàn phục vụ' : 'Khu vực mang về'}
              </h2>
              <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.24em] text-slate-400">
                {mode === 'DINE_IN' ? 'Dining floor' : 'Takeaway zone'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchAreas(activeBranchId);
              fetchTables(activeBranchId);
            }}
            className="rounded-2xl border border-slate-200 p-3 text-slate-400 transition hover:bg-gold-50 hover:text-gold-600"
            aria-label="Đồng bộ danh sách bàn"
          >
            <TrendingUp size={18} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_ITEMS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition',
                filter === item ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}
            >
              {item === 'ALL' ? 'Tất cả' : STATUS_CONFIG[item]?.label || item}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-gold-600" />
          </div>
        ) : (
          <FloorPlanView
            tables={filteredTables}
            areas={mode === 'DINE_IN' ? dineInAreaOptions : takeawayAreaOptions}
            selectedTableId={currentOrderTarget?.id}
            onSelect={handleDirectSelect}
            onAction={table => setActionTable(table)}
            gridClass="grid w-full grid-cols-2 gap-3 auto-rows-max"
            selectedArea={mode === 'DINE_IN' ? selectedDineInArea : takeawayAreaSelection}
            onAreaChange={mode === 'DINE_IN' ? setSelectedDineInArea : setSelectedTakeawayArea}
          />
        )}
      </div>

      <TableActionModal
        table={actionTable}
        onClose={() => setActionTable(null)}
        onSelect={onTableSelect}
      />
    </div>
  );
};
