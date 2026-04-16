/**
 * useTableStore.js — Quản lý trạng thái bàn (Tables)
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │  STATE SHAPE                                                      │
 * ├───────────────────────────────────────────────────────────────────┤
 * │  tables        RestaurantTable[]   Toàn bộ bàn của chi nhánh    │
 * │  loading       boolean             Đang fetch bàn               │
 * │  error         string | null       Lỗi fetch                    │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * Actions:
 *   fetchTables(branchId)   — Tải danh sách bàn
 *   openTable(tableId)      — Mở bàn & tạo Order NEW  → trả về orderId
 *   closeTable(tableId)     — Đóng bàn sau thanh toán
 *   reserveTable(payload)   — Đặt bàn trước
 *   updateTableStatus(...)  — Cập nhật status cục bộ (optimistic)
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { tableApi, orderApi } from '../api/posApi';
import { useAuthStore } from './useAuthStore';

export const useTableStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /** @type {RestaurantTable[]} */
  tables: [],

  /** @type {boolean} */
  loading: false,

  /** @type {string | null} */
  error: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * fetchTables — Tải danh sách bàn từ API (hoặc mock).
   * Idempotent: không gọi lại nếu đang loading.
   *
   * @param {number} branchId
   */
  fetchTables: async (branchId = 1) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const res = await tableApi.getTables(branchId);
      set({ tables: res.data, loading: false });
    } catch (err) {
      const msg = err?.message || 'Không thể tải danh sách bàn';
      set({ loading: false, error: msg });
      toast.error(msg);
    }
  },

  /**
   * openTable — Mở bàn, tạo Order NEW.
   * Optimistic UI: Cập nhật status bàn ngay, rollback nếu API lỗi.
   *
   * @param {number} tableId
   * @returns {Promise<{ orderId: number } | null>}
   */
  openTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return null;
    if (table.status === 'OCCUPIED') {
      toast.error(`Bàn ${table.tableNumber} đang bận!`);
      return null;
    }

    const userId = useAuthStore.getState().user?.id || 1;

    // Optimistic update: set bàn sang OCCUPIED ngay
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, status: 'OCCUPIED' } : t
      ),
    }));

    try {
      const res = await tableApi.openTable({
        tableId,
        branchId: table.branchId || 1,
        createdBy: userId,
      });

      const { order, table: updatedTable } = res.data;

      // Sync lại bàn với currentOrderId từ server
      set(state => ({
        tables: state.tables.map(t =>
          t.id === tableId ? { ...t, ...updatedTable } : t
        ),
      }));

      toast.success(`Đã mở bàn ${table.tableNumber} — Đơn #${order.id}`);
      return { orderId: order.id, order };
    } catch (err) {
      // Rollback optimistic update
      set(state => ({
        tables: state.tables.map(t =>
          t.id === tableId ? { ...t, status: 'AVAILABLE', currentOrderId: null } : t
        ),
      }));
      toast.error(err?.message || 'Không thể mở bàn, vui lòng thử lại');
      return null;
    }
  },

  /**
   * closeTable — Đóng bàn sau khi thanh toán xong.
   * Chỉ được gọi sau khi payOrder thành công.
   *
   * @param {number} tableId
   */
  closeTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return;

    // Optimistic: set về AVAILABLE ngay
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, status: 'AVAILABLE', currentOrderId: null } : t
      ),
    }));

    try {
      await tableApi.closeTable(tableId);
      toast.success(`Đã đóng bàn ${table.tableNumber}`);
    } catch (err) {
      // Rollback nếu lỗi
      set(state => ({
        tables: state.tables.map(t =>
          t.id === tableId ? table : t
        ),
      }));
      toast.error(err?.message || 'Không thể đóng bàn');
    }
  },

  /**
   * mergeTables — Gộp bàn from sang to.
   * Chuyển orderId hoặc gộp món từ bàn cũ sang bàn mới.
   */
  mergeTables: async (fromTableId, toTableId) => {
    set({ loading: true });
    try {
      const tables = get().tables;
      const fromTable = tables.find(t => t.id === fromTableId);
      const staleOrderId = fromTable?.currentOrderId;

      const res = await tableApi.mergeTables({ fromTableId, toTableId });
      const { order, toTable } = res.data;

      const updatedTables = tables.map(t => {
        if (t.id === fromTableId) return { ...t, status: 'AVAILABLE', currentOrderId: null };
        if (t.id === toTableId)   return { ...t, ...toTable };
        return t;
      });

      set({ tables: updatedTables, loading: false });

      // Cập nhật OrderStore: Thêm đơn mới gộp & Xóa đơn cũ
      const orderStore = (await import('./useOrderStore')).useOrderStore.getState();
      orderStore.setOrder(order);
      if (staleOrderId && staleOrderId !== order.id) {
        orderStore.removeOrder(staleOrderId);
      }

      toast.success(`Đã gộp đơn hàng vào bàn ${toTable.tableNumber}`);
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err?.message || 'Gộp bàn thất bại');
      return false;
    }
  },

  /**
   * splitTable — Tách món từ đơn này sang bàn khác.
   */
  splitTable: async (fromOrderId, toTableId, transferItems) => {
    set({ loading: true });
    try {
      const res = await tableApi.splitOrder({ fromOrderId, toTableId, transferItems });
      const { fromOrder, toOrder } = res.data;

      // 1. Cập nhật OrderStore ngay lập tức để CartPanel hiển thị món mới
      const orderStore = (await import('./useOrderStore')).useOrderStore.getState();
      orderStore.setOrder(fromOrder);
      orderStore.setOrder(toOrder);

      // 2. Cập nhật TableStore thủ công (Optimistic update) để Sơ đồ bàn đổi màu ngay
      set(state => ({
        tables: state.tables.map(t => {
          // Bàn nguồn: Nếu hết món thì về AVAILABLE, nếu còn thì vẫn OCCUPIED
          if (t.id === fromOrder.tableId) {
            const isEmpty = fromOrder.items.length === 0;
            return { 
              ...t, 
              status: isEmpty ? 'AVAILABLE' : 'OCCUPIED', 
              currentOrderId: isEmpty ? null : fromOrder.id 
            };
          }
          // Bàn đích: Chắc chắn là OCCUPIED vì vừa nhận món
          if (t.id === toOrder.tableId) {
            return { 
              ...t, 
              status: 'OCCUPIED', 
              currentOrderId: toOrder.id 
            };
          }
          return t;
        }),
        loading: false
      }));

      // 3. fetchTables ở background để đảm bảo đồng bộ tuyệt đối với Server (nếu cần)
      get().fetchTables();

      toast.success(`Đã tách món sang bàn ${toOrder.tableNumber}`);
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err?.message || 'Tách bàn thất bại');
      return false;
    }
  },

  /**
   * cleanTable — Chuyển trạng thái từ DIRTY về AVAILABLE.
   */
  cleanTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    set(state => ({
      tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'AVAILABLE' } : t)
    }));
    toast.success(`Đã dọn xong bàn ${table.tableNumber}`);
  },

  /**
   * reserveTable — Đặt bàn trước cho khách.
   *
   * @param {{ tableId: number, customerName: string, phone: string, time: string, deposit?: number }} payload
   */
  reserveTable: async ({ tableId, customerName, phone, time, deposit = 0 }) => {
    try {
      const reservationInfo = { customerName, phone, time, deposit };
      await tableApi.reserveTable({ tableId, reservationInfo });

      set(state => ({
        tables: state.tables.map(t =>
          t.id === tableId
            ? { ...t, status: 'RESERVED', reservationInfo }
            : t
        ),
      }));

      toast.success(`Đã đặt bàn cho ${customerName}`);
    } catch (err) {
      toast.error(err?.message || 'Không thể đặt bàn');
    }
  },

  /**
   * updateTableLocal — Cập nhật state bàn cục bộ không cần gọi API.
   * Dùng sau khi payOrder thành công để đồng bộ ngay lập tức.
   *
   * @param {number} tableId
   * @param {Partial<RestaurantTable>} patch
   */
  updateTableLocal: (tableId, patch) => {
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, ...patch } : t
      ),
    }));
  },

}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectAvailableTables = state => state.tables.filter(t => t.status === 'AVAILABLE');
export const selectOccupiedTables  = state => state.tables.filter(t => t.status === 'OCCUPIED');
export const selectTableById       = (id) => (state) => state.tables.find(t => t.id === id);
