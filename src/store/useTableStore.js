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

  /** @type {any[]} */
  areas: [
    { id: 'ALL', name: 'Tất cả' },
    { id: 1, name: 'Khu A' },
    { id: 2, name: 'Khu B' },
    { id: 3, name: 'Sân Vườn' }
  ],

  /** @type {any[]} — Danh sách 6 ô Mang về cố định */
  takeawayOrders: [
    { id: 'MV1', order_number: 'MV-01', customerName: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
    { id: 'MV2', order_number: 'MV-02', customer_name: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
    { id: 'MV3', order_number: 'MV-03', customer_name: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
    { id: 'MV4', order_number: 'MV-04', customer_name: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
    { id: 'MV5', order_number: 'MV-05', customer_name: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
    { id: 'MV6', order_number: 'MV-06', customer_name: 'Khách lẻ', status: 'AVAILABLE', time: '--:--' },
  ],

  /** @type {{ type: 'TABLE' | 'TAKEAWAY' | null, id: number | string | null, name: string | null }} */
  currentOrderTarget: { type: null, id: null, name: null },

  /** @type {boolean} */
  loading: false,

  /** @type {string | null} */
  error: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * setCurrentOrderTarget — Thiết lập mục tiêu đơn hàng (Bàn hoặc Mang về)
   */
  setCurrentOrderTarget: (target) => {
    set({ currentOrderTarget: target });
  },

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
      const fetchedTables = res.data;
      
      set({ 
        tables: fetchedTables, 
        loading: false 
      });
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
   * @param {number | string} tableId
   */
  closeTable: async (tableId) => {
    // Xử lý đơn Mang về
    if (typeof tableId === 'string' && tableId.startsWith('takeaway')) {
      set(state => ({
        takeawayOrders: state.takeawayOrders.filter(o => o.id !== tableId),
        currentOrderTarget: state.currentOrderTarget.id === tableId ? { type: null, id: null, name: null } : state.currentOrderTarget
      }));
      toast.success(`Đã hoàn tất đơn mang về`);
      return;
    }

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
   * createTakeawayOrder — Mở một ô Mang về (Virtual Slot).
   * @param {string} slotId — ID của ô (MV1, MV2...)
   * @param {string} customerName
   */
  createTakeawayOrder: async (slotId, customerName = 'Khách vãng lai') => {
    const branchId = 1;
    const userId = useAuthStore.getState().user?.id || 1;

    set({ loading: true });
    try {
      const res = await tableApi.openTable({
        tableId: -1, // Virtual table for takeaway
        branchId,
        createdBy: userId,
      });

      const { order } = res.data;
      
      set(state => ({
        takeawayOrders: state.takeawayOrders.map(o => 
          o.id === slotId ? {
            ...o,
            customerName: customerName || 'Khách vãng lai',
            orderId: order.id,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            currentOrderId: order.id
          } : o
        ),
        currentOrderTarget: { type: 'TAKEAWAY', id: slotId, name: `Mang về - ${customerName}` },
        loading: false
      }));

      toast.success(`Đã mở đơn mang về ${slotId} cho ${customerName}`);
      return { takeawayId: slotId, orderId: order.id, order };
    } catch (err) {
      set({ loading: false });
      toast.error('Không thể tạo đơn mang về');
      return null;
    }
  },

  /**
   * updateTakeawayStatus — Cập nhật trạng thái đơn mang về.
   */
  updateTakeawayStatus: async (takeawayId, newStatus) => {
    set(state => ({
      takeawayOrders: state.takeawayOrders.map(o => 
        o.id === takeawayId ? { ...o, status: newStatus } : o
      )
    }));
  },

  /**
   * completeTakeawayOrder — Giải phóng ô mang về (chuyển về AVAILABLE).
   * Dùng sau khi thanh toán thành công.
   */
  completeTakeawayOrder: (takeawayId) => {
    set((state) => ({
      takeawayOrders: state.takeawayOrders.map((o) => 
        o.id === takeawayId ? { ...o, status: 'AVAILABLE', customerName: 'Khách lẻ', time: '--:--', orderId: null, currentOrderId: null } : o
      ),
      currentOrderTarget: state.currentOrderTarget.id === takeawayId ? { type: null, id: null, name: null } : state.currentOrderTarget,
    }));
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
      const res = await orderApi.splitOrder({ fromOrderId, toTableId, transferItems });
      const { fromOrder, toOrder } = res.data;

      // Cập nhật OrderStore
      const orderStore = (await import('./useOrderStore')).useOrderStore.getState();
      orderStore.setOrder(fromOrder);
      orderStore.setOrder(toOrder);

      // Cập nhật TableStore (bàn đích có thể đã chuyển từ AVAILABLE -> OCCUPIED)
      await get().fetchTables();

      toast.success(`Đã tách món sang bàn ${toOrder.tableNumber}`);
      set({ loading: false });
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

  /**
   * addTable — Thêm bàn mới (Admin).
   */
  addTable: async (data) => {
    set({ loading: true });
    try {
      const res = await tableApi.createTable(data);
      set(state => ({
        tables: [...state.tables, res.data],
        loading: false
      }));
      toast.success(`Đã thêm bàn ${res.data.tableNumber}`);
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err?.message || 'Không thể thêm bàn');
      return false;
    }
  },

  /**
   * updateTable — Cập nhật bàn (Admin).
   */
  updateTable: async (id, data) => {
    set({ loading: true });
    try {
      const res = await tableApi.updateTable(id, data);
      set(state => ({
        tables: state.tables.map(t => t.id === id ? res.data : t),
        loading: false
      }));
      toast.success(`Đã cập nhật bàn ${res.data.tableNumber}`);
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err?.message || 'Không thể cập nhật bàn');
      return false;
    }
  },

  /**
   * deleteTable — Xoá bàn (Admin).
   */
  deleteTable: async (id) => {
    set({ loading: true });
    try {
      await tableApi.deleteTable(id);
      set(state => ({
        tables: state.tables.filter(t => t.id !== id),
        loading: false
      }));
      toast.success('Đã xoá bàn thành công');
      return true;
    } catch (err) {
      set({ loading: false });
      toast.error(err?.message || 'Không thể xoá bàn');
      return false;
    }
  },

  /**
   * addArea — Thêm khu vực mới (Admin).
   */
  addArea: (name) => {
    const newId = get().areas.length > 1 
      ? Math.max(...get().areas.filter(a => typeof a.id === 'number').map(a => a.id)) + 1 
      : 1;
    
    set(state => ({
      areas: [...state.areas, { id: newId, name }]
    }));
    toast.success(`Đã thêm khu vực ${name}`);
    return newId;
  },

  /**
   * deleteArea — Xoá khu vực (Admin).
   * Ràng buộc: Không cho xoá nếu khu vực đang có bàn.
   */
  deleteArea: (id) => {
    const tableInArea = get().tables.find(t => Number(t.areaId || t.area_id) === Number(id));
    if (tableInArea) {
      toast.error('Không thể xoá khu vực đang chứa bàn. Vui lòng chuyển hoặc xoá bàn trước.');
      return false;
    }

    set(state => ({
      areas: state.areas.filter(a => a.id !== id)
    }));
    toast.success('Đã xoá khu vực thành công');
    return true;
  },

}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectAvailableTables = state => state.tables.filter(t => t.status === 'AVAILABLE');
export const selectOccupiedTables  = state => state.tables.filter(t => t.status === 'OCCUPIED');
export const selectTableById       = (id) => (state) => state.tables.find(t => t.id === id);
