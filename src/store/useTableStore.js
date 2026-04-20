/**
 * useTableStore.js — Quản lý trạng thái danh sách Bàn
 *
 * TÍNH NĂNG (PRODUCTION GRADE):
 * 1. Không tự call create order nếu items rỗng (tránh 400 BE).
 * 2. Phân biệt chọn bàn (local state) vs gửi Order (backend effect).
 * 3. Race condition protection: Dùng `requestId` + `AbortController` khi load Active Order.
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import tableApi from '../services/api/tableApi';
import { mapTables } from '../services/mapper/tableMapper';
import { useAuthStore } from './useAuthStore';

let _activeOrderAbortController = null;
let _activeOrderRequestId = 0;

export const useTableStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  tables: [],
  loading: false,
  error: null,
  selectedTableId: null,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * fetchTables — Tải danh sách bàn.
   */
  fetchTables: async (branchId) => {
    if (get().loading) return;

    const resolvedBranchId = branchId
      ?? useAuthStore.getState()?.user?.branchId
      ?? 1;

    set({ loading: true, error: null });

    try {
      const response = await tableApi.getTables(resolvedBranchId);
      const rawTables = response?.data ?? [];
      const tables = mapTables(rawTables);

      set({ tables, loading: false });
    } catch (err) {
      console.error('[API_ERROR][TABLES]', err);
      set({ loading: false, error: err?.message || 'Không tải được danh sách bàn' });
      toast.error('Không tải được danh sách bàn.');
    }
  },

  /**
   * selectTable — Hành động chọn 1 bàn trên giao diện.
   * Đây là action cốt lõi mới cho Production:
   *  - Nếu bàn TRỐNG, chỉ set local id.
   *  - Nếu bàn OCCUPIED, tự động load active order của bàn đó, có chống race condition.
   */
  selectTable: async (tableId) => {
    set({ selectedTableId: tableId });
    const table = get().tables.find(t => t.id === tableId);
    
    // Lazy load useOrderStore để tránh circular dependency
    const { useOrderStore } = await import('./useOrderStore');
    
    if (table?.status === 'OCCUPIED') {
      const currentReqId = ++_activeOrderRequestId;
      
      // Huỷ request cũ nếu user bấm liên tục giữa các bàn
      if (_activeOrderAbortController) {
        _activeOrderAbortController.abort();
      }
      _activeOrderAbortController = new AbortController();

      useOrderStore.setState({ loadingOrder: true });

      try {
        const response = await tableApi.getActiveOrder(tableId, { 
          signal: _activeOrderAbortController.signal 
        });

        // Nếu request này không còn là request mới nhất → bỏ qua
        if (currentReqId !== _activeOrderRequestId) return;

        const { mapOrder } = await import('../services/mapper/orderMapper');
        const order = mapOrder(response?.data);

        if (!order) {
          console.warn("[MAPPER_WARNING] OCCUPIED table but BE returned null active order!");
          useOrderStore.setState({ loadingOrder: false });
        } else {
          // Lưu vào OrderStore Map
          useOrderStore.getState().setOrder(order);
          // Cập nhật ID đơn hàng hiện tại cho bàn để UI (CartPanel) đồng bộ
          get().updateTableLocal(tableId, { currentOrderId: order.id });
          useOrderStore.setState({ loadingOrder: false });
        }
      } catch (err) {
        if (err.isCancelled) return;
        if (currentReqId !== _activeOrderRequestId) return;
        
        console.error("[API_ERROR][ACTIVE_ORDER]", err);
        toast.error("Không tải được đơn của bàn này.");
        useOrderStore.setState({ loadingOrder: false });
      }
    } else {
      // Bàn chưa có Order → dọn order store sạch sẽ
      useOrderStore.setState({ order: null });
    }
  },

  /**
   * openTable — Giả lập hành động mở bàn.
   * ⚠️ BE constraint: @NotEmpty (Order phải có ít nhất 1 item)
   * → Nên Mở bàn chỉ là thao tác set trạng thái Local (chọn mặt bàn)
   * Order thật sẽ được tạo khi click Gửi Bếp (POST /orders).
   */
  openTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return false;
    
    if (table.status !== 'AVAILABLE') {
      toast.error(`Bàn ${table.tableNumber} không khả dụng!`);
      return false;
    }

    get().selectTable(tableId);
    toast.success('Bàn đã sẵn sàng. Vui lòng chọn món để gửi bếp.');
    return true; // Báo hiệu cho UI đóng modal
  },

  /**
   * reserveTable — Đặt bàn trước cho khách.
   */
  reserveTable: async ({ tableId, customerName, phone, time, deposit = 0 }) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return;

    try {
      await tableApi.updateTableStatus(tableId, 'RESERVED');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      
      // Override loading state để ép fetchTables chạy ngầm mà không nháy skeleton toàn màn hình
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      toast.success(`Đã đặt bàn ${table.tableNumber} cho ${customerName}`);
    } catch (err) {
      console.error('[API_ERROR][RESERVE_TABLE]', err);
      toast.error(err?.message || 'Không thể đặt bàn.');
    }
  },

  /**
   * cleanTable — Dọn bàn sau khi khách rời đi.
   * Chuyển từ CLEANING sang AVAILABLE.
   */
  cleanTable: async (tableId) => {
    const table = get().tables.find(t => t.id === tableId);
    if (!table) return false;

    try {
      await tableApi.updateTableStatus(tableId, 'AVAILABLE');
      
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      toast.success(`Đã dọn xong bàn ${table.tableNumber}`);
      return true;
    } catch (err) {
      console.error('[API_ERROR][CLEAN_TABLE]', err);
      toast.error(err?.message || 'Không thể dọn bàn này.');
      return false;
    }
  },

  /**
   * mergeTables — Gộp bàn nguồn vào bàn đích.
   */
  mergeTables: async (sourceTableId, targetTableId) => {
    if (get().loading) return false;
    if (sourceTableId === targetTableId) {
      toast.error("Không thể gộp bàn vào chính nó.");
      return false;
    }

    try {
      await tableApi.mergeTables(sourceTableId, targetTableId);
      
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      // Sau khi gộp, tự động chọn bàn đích để update đơn hàng mới
      get().selectTable(targetTableId);
      
      toast.success('Đã gộp bàn thành công!');
      return true;
    } catch (err) {
      console.error('[API_ERROR][MERGE_TABLES]', err);
      toast.error(err?.message || 'Gộp bàn thất bại.');
      return false;
    }
  },

  /**
   * splitTable — Tách món từ bàn này sang bàn khác.
   */
  splitTable: async (sourceTableId, targetTableId, itemsToTransfer) => {
    if (get().loading) return false;
    try {
      // ⚠️ BE yêu cầu format: { targetTableId, items: [{ orderItemId, quantity }] }
      const beItems = itemsToTransfer.map(item => ({
        orderItemId: Number(item.orderItemId || item.itemId || item.id), // Hỗ trợ nhiều cách đặt tên từ UI
        quantity: item.quantity,
      }));

      await tableApi.splitTable(sourceTableId, targetTableId, beItems);
      
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      useTableStore.setState({ loading: false });
      await get().fetchTables(branchId);
      
      // Reload lại bàn nguồn để update danh sách món còn lại
      get().selectTable(sourceTableId);

      toast.success('Đã tách bàn thành công!');
      return true;
    } catch (err) {
      console.error('[API_ERROR][SPLIT_TABLE]', err);
      toast.error(err?.message || 'Tách bàn thất bại.');
      return false;
    }
  },

  updateTableLocal: (tableId, patch) => {
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, ...patch } : t
      ),
    }));
  },

}));

export const selectAvailableTables = state => state.tables.filter(t => t.status === 'AVAILABLE');
export const selectOccupiedTables = state => state.tables.filter(t => t.status === 'OCCUPIED');
export const selectTableById = (id) => (state) => state.tables.find(t => t.id === id);
