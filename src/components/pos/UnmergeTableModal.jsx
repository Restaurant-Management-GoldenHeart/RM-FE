import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowRightLeft,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import { useOrderStore } from '../../store/useOrderStore';
import { useTableStore } from '../../store/useTableStore';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatCurrency = value =>
  `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} đ`;

const getTableName = table => table?.displayName || table?.tableNumber || `Bàn #${table?.id ?? '?'}`;

const sortTables = tables =>
  [...(tables || [])].sort((left, right) => {
    const leftOrder = left?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right?.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(getTableName(left)).localeCompare(String(getTableName(right)), 'vi');
  });

const QuantityStepper = ({
  value,
  max,
  onDecrease,
  onIncrease,
  onChange,
  onMax,
  disabled = false,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-2">
    <button
      type="button"
      onClick={onDecrease}
      disabled={disabled || value <= 0}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Giảm số lượng"
    >
      <Minus size={15} />
    </button>

    <input
      type="number"
      min={0}
      max={max}
      inputMode="numeric"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="h-10 w-20 rounded-xl border border-slate-200 bg-white px-3 text-center text-sm font-black text-slate-900 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
      aria-label="Số lượng chuyển bàn"
    />

    <button
      type="button"
      onClick={onIncrease}
      disabled={disabled || value >= max}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Tăng số lượng"
    >
      <Plus size={15} />
    </button>

    <button
      type="button"
      onClick={onMax}
      disabled={disabled || value === max}
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Tối đa
    </button>
  </div>
);

const UnmergeTableModal = ({ isOpen, onClose, rootTable }) => {
  const tables = useTableStore(state => state.tables);
  const unmergeTables = useTableStore(state => state.unmergeTables);

  const refreshOrder = useOrderStore(state => state.refreshOrder);
  const loadingOrder = useOrderStore(state => state.loadingOrder);
  const order = useOrderStore(state => {
    const activeRootOrderId = Number(rootTable?.currentOrderId || 0);
    return activeRootOrderId ? state.orders[activeRootOrderId] || null : null;
  });

  const memberTables = useMemo(
    () =>
      sortTables(
        (tables || []).filter(
          table =>
            Number(table.mergeRootTableId) === Number(rootTable?.id) &&
            Number(table.id) !== Number(rootTable?.id)
        )
      ),
    [rootTable?.id, tables]
  );

  const orderItems = useMemo(
    () => (order?.items || []).filter(item => item.status !== 'CANCELLED'),
    [order?.items]
  );

  const [allocations, setAllocations] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAllocations({});
    setIsSubmitting(false);
  }, [isOpen, rootTable?.id]);

  useEffect(() => {
    const activeRootOrderId = Number(rootTable?.currentOrderId || 0);
    if (!isOpen || !activeRootOrderId) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    const syncOrder = async () => {
      setIsHydrating(true);
      await refreshOrder(activeRootOrderId);
      if (!cancelled) {
        setIsHydrating(false);
      }
    };

    syncOrder();

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshOrder, rootTable?.currentOrderId]);

  const getAssignedQuantity = (itemId, tableId) =>
    Number(allocations?.[tableId]?.[itemId] || 0);

  const getAssignedTotalForItem = itemId =>
    memberTables.reduce((sum, table) => sum + getAssignedQuantity(itemId, table.id), 0);

  const getAssignedTotalForTable = tableId =>
    orderItems.reduce((sum, item) => sum + getAssignedQuantity(item.id, tableId), 0);

  const getAssignedValueForTable = tableId =>
    orderItems.reduce(
      (sum, item) => sum + getAssignedQuantity(item.id, tableId) * Number(item.price || 0),
      0
    );

  const getRemainingAtRootForItem = item =>
    Math.max(Number(item.quantity || 0) - getAssignedTotalForItem(item.id), 0);

  const getMaxAssignableForTable = (item, tableId) => {
    const totalQuantity = Number(item.quantity || 0);
    const assignedToOthers = memberTables.reduce((sum, table) => {
      if (table.id === tableId) return sum;
      return sum + getAssignedQuantity(item.id, table.id);
    }, 0);

    return Math.max(totalQuantity - assignedToOthers, 0);
  };

  const setMemberQuantity = (tableId, item, nextQuantity) => {
    if (!tableId) return;

    const maxAssignable = getMaxAssignableForTable(item, tableId);
    const safeQuantity = clamp(Number(nextQuantity) || 0, 0, maxAssignable);

    setAllocations(previous => {
      const next = { ...previous };
      const tableAllocations = { ...(next[tableId] || {}) };

      if (safeQuantity <= 0) {
        delete tableAllocations[item.id];
      } else {
        tableAllocations[item.id] = safeQuantity;
      }

      if (Object.keys(tableAllocations).length === 0) {
        delete next[tableId];
      } else {
        next[tableId] = tableAllocations;
      }

      return next;
    });
  };

  const clearItemAllocations = itemId => {
    setAllocations(previous => {
      const next = { ...previous };

      Object.keys(next).forEach(tableId => {
        const tableAllocations = { ...(next[tableId] || {}) };
        delete tableAllocations[itemId];

        if (Object.keys(tableAllocations).length === 0) {
          delete next[tableId];
        } else {
          next[tableId] = tableAllocations;
        }
      });

      return next;
    });
  };

  const resetAllAllocations = () => setAllocations({});

  const totalOrderQuantity = useMemo(
    () => orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [orderItems]
  );

  const totalAssignedQuantity = useMemo(
    () => memberTables.reduce((sum, table) => sum + getAssignedTotalForTable(table.id), 0),
    [allocations, memberTables, orderItems]
  );

  const remainingAtRoot = Math.max(totalOrderQuantity - totalAssignedQuantity, 0);
  const allocationProgress =
    totalOrderQuantity > 0 ? Math.min((totalAssignedQuantity / totalOrderQuantity) * 100, 100) : 0;
  const hasSelections = totalAssignedQuantity > 0;

  const tableSummaries = useMemo(
    () =>
      memberTables.map(table => ({
        ...table,
        totalAssigned: getAssignedTotalForTable(table.id),
        totalValue: getAssignedValueForTable(table.id),
      })),
    [allocations, memberTables, orderItems]
  );

  const handleSubmit = async () => {
    if (!rootTable?.id || !order) {
      toast.error('Không tìm thấy đơn hàng đang hoạt động để tách lại nhóm bàn.');
      return;
    }

    const targets = memberTables
      .map(table => {
        const items = orderItems
          .map(item => ({
            orderItemId: item.id,
            quantity: getAssignedQuantity(item.id, table.id),
          }))
          .filter(item => item.quantity > 0);

        return items.length > 0
          ? {
              targetTableId: table.id,
              items,
            }
          : null;
      })
      .filter(Boolean);

    if (targets.length === 0) {
      toast.error('Cần chọn ít nhất một món để chuyển về các bàn gốc.');
      return;
    }

    setIsSubmitting(true);
    const success = await unmergeTables(rootTable.id, targets);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  if (!isOpen || !rootTable) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="premium-card relative flex h-[min(94vh,920px)] w-full max-w-[min(1560px,calc(100vw-24px))] flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-emerald-500">
              Tách lại nhóm bàn
            </p>
            <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-slate-900">
              {getTableName(rootTable)}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Chọn số lượng món cần chuyển về từng bàn gốc. Phần còn lại sẽ tự động giữ ở bàn
              chính.
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 xl:px-6">
          <div className="shrink-0 rounded-[1.4rem] border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="glass-gold min-w-[210px] shrink-0 rounded-[1.1rem] px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">
                  Bàn chính
                </p>
                <p className="mt-2 text-base font-black text-slate-900">{getTableName(rootTable)}</p>
              </div>

              <div className="min-w-[140px] shrink-0 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  Còn lại
                </p>
                <p className="mt-2 text-xl font-black text-slate-900">{remainingAtRoot}</p>
              </div>

              <div className="min-w-[200px] shrink-0 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                  <span>Tiến độ</span>
                  <span>
                    {totalAssignedQuantity}/{totalOrderQuantity}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all"
                    style={{ width: `${allocationProgress}%` }}
                  />
                </div>
              </div>

              {tableSummaries.map(table => (
                <div
                  key={table.id}
                  className="min-w-[160px] shrink-0 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <p className="truncate text-sm font-black text-slate-900">{getTableName(table)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                      {table.totalAssigned} món
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                      {formatCurrency(table.totalValue)}
                    </span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={resetAllAllocations}
                className="shrink-0 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  <RotateCcw size={13} />
                  Xóa hết
                </span>
              </button>
            </div>
          </div>

          <section className="mx-auto min-h-0 flex-1 w-full max-w-[1480px] overflow-hidden">
            {(loadingOrder || isHydrating) && !order ? (
              <div className="glass-panel flex h-full min-h-[260px] items-center justify-center rounded-[1.6rem] border border-slate-200">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Đang đồng bộ đơn hàng của bàn chính...
                </div>
              </div>
            ) : !order ? (
              <div className="rounded-[1.6rem] border border-amber-100 bg-amber-50 p-5">
                <p className="text-base font-black text-amber-800">
                  Chưa lấy được đơn hàng hiện tại của bàn chính.
                </p>
                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Hãy đồng bộ lại dữ liệu bàn trước khi thao tác tách nhóm.
                </p>
              </div>
            ) : memberTables.length === 0 ? (
              <div className="rounded-[1.6rem] border border-amber-100 bg-amber-50 p-5">
                <p className="text-base font-black text-amber-800">
                  Nhóm bàn này hiện không còn bàn thành viên để tách lại.
                </p>
              </div>
            ) : (
              <div className="premium-card flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
                <div className="shrink-0 border-b border-slate-100 px-5 py-3 lg:px-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[1.65rem] font-black text-slate-900">Phân món về các bàn gốc</p>
                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        Điều chỉnh trực tiếp số lượng món cần chuyển về từng bàn.
                      </p>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:max-w-[52%] lg:justify-end">
                      {tableSummaries.map(table => (
                        <div
                          key={table.id}
                          className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"
                        >
                          {getTableName(table)}: {table.totalAssigned}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 lg:px-5">
                  {orderItems.map(item => {
                    const remainingAtRootForItem = getRemainingAtRootForItem(item);
                    const totalAssignedForItem = getAssignedTotalForItem(item.id);

                    return (
                      <article
                        key={item.id}
                        className="rounded-[1.2rem] border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-[15px] font-black text-slate-900">
                              {item.name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                                Tổng SL {item.quantity}
                              </span>
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                Bàn chính giữ {remainingAtRootForItem}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                                Đã phân {totalAssignedForItem}
                              </span>
                            </div>
                            {item.note ? (
                              <p className="mt-1.5 break-words text-xs italic leading-5 text-slate-500">
                                Ghi chú: {item.note}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                            {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                          </div>
                        </div>

                        <div className="mt-3 rounded-[1rem] border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">
                                Phần giữ lại ở bàn chính
                              </p>
                              <p className="mt-1 text-base font-black text-slate-900">
                                {remainingAtRootForItem} món
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => clearItemAllocations(item.id)}
                              className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700 transition hover:bg-amber-100"
                            >
                              Giữ hết ở bàn chính
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 overflow-x-auto pb-1 no-scrollbar">
                          <div className="grid min-w-max auto-cols-[minmax(320px,1fr)] grid-flow-col gap-2">
                          {memberTables.map(table => {
                            const currentQuantity = getAssignedQuantity(item.id, table.id);
                            const maxAssignable = getMaxAssignableForTable(item, table.id);

                            return (
                              <div
                                key={`${item.id}-${table.id}`}
                                className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-black text-slate-900">
                                      Chuyển về {getTableName(table)}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-slate-500">Đang chuyển {currentQuantity} / {maxAssignable}</p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                                      {formatCurrency(Number(item.price || 0) * currentQuantity)}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center justify-end">
                                  <QuantityStepper
                                    value={currentQuantity}
                                    max={maxAssignable}
                                    onDecrease={() => setMemberQuantity(table.id, item, currentQuantity - 1)}
                                    onIncrease={() => setMemberQuantity(table.id, item, currentQuantity + 1)}
                                    onChange={event =>
                                      setMemberQuantity(table.id, item, Number(event.target.value))
                                    }
                                    onMax={() => setMemberQuantity(table.id, item, maxAssignable)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 lg:min-w-[360px]">
              Đã phân về bàn gốc: <span className="font-black text-slate-900">{totalAssignedQuantity}</span>
              <span className="mx-2 text-slate-300">•</span>
              Bàn chính còn giữ: <span className="font-black text-slate-900">{remainingAtRoot}</span>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[1.15rem] border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isHydrating || !order || memberTables.length === 0 || !hasSelections}
                className="flex flex-1 items-center justify-center gap-3 rounded-[1.15rem] bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                Xác nhận tách lại nhóm bàn
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnmergeTableModal;
