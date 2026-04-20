/**
 * useKitchenStore.js — Quản lý luồng Bếp (Kitchen Display System)
 *
 * Kiến trúc:
 *   1. Gọi kitchenServiceApi để lấy dữ liệu từ BE
 *   2. Dùng kitchenMapper để chuẩn hóa dữ liệu
 *   3. Polling 3 giây để cập nhật realtime (chưa có WebSocket)
 *
 * State:
 *   pendingItems  - Danh sách món chờ bếp xử lý
 *   isLoading     - Đang tải dữ liệu lần đầu
 *   pollingActive - Polling đang chạy hay không
 *
 * Cơ chế Polling thông minh:
 *   - Chỉ chạy khi tab trình duyệt đang active (document.visibilityState === "visible")
 *   - Tự động dừng khi component unmount để tránh memory leak
 *   - Khoảng cách 3 giây giữa các lần gọi API
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import kitchenServiceApi from '../services/api/kitchenServiceApi';
import { mapKitchenItems } from '../services/mapper/kitchenMapper';
import { useAuthStore } from './useAuthStore';

// Lưu tham chiếu interval để có thể clear khi cần
let pollingIntervalId = null;

// Khoảng thời gian polling (milliseconds)
const POLLING_INTERVAL_MS = 3000; // 3 giây

// Số lượng lịch sử tối đa được giữ lại trong bộ nhớ
const HISTORY_LIMIT = 100;

export const useKitchenStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /** Dữ liệu Menu Items để tra cứu nguyên liệu (Không phải source of truth) */
  menuItems: [],

  /** Danh sách các thẻ mở chi tiết món (Ingredients) */
  expandedIds: [],

  /** Danh sách các món đang chờ bếp xử lý (PENDING & PROCESSING) */
  pendingItems: [],

  /** 
   * Danh sách món đã xử lý xong — nguồn dữ liệu cho 2 cột và Modal Lịch sử:
   *   - Cột "Sẵn sàng phục vụ" → filter status === 'COMPLETED' & orderId chưa thanh toán
   *   - Cột "Món đã hủy"       → filter status === 'CANCELLED'  & orderId chưa thanh toán
   *   - Modal "Lịch sử"         → toàn bộ 100 món gần nhất (kể cả đã thanh toán)
   * Phần tử đầu mảng = mới nhất.
   */
  historyItems: [],

  /**
   * Tập hợp các orderId đã được thanh toán.
   * Cột "Sẵn sàng" và "Hủy" sẽ lọc bỏ những món thuộc các order này.
   * Modal Lịch sử không bị ảnh hưởng.
   */
  paidOrderIds: new Set(),

  /** Đang tải dữ liệu lần đầu (hiển thị skeleton) */
  isLoading: false,

  /** Polling đang hoạt động hay không */
  pollingActive: false,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Tải Menu Items để phục vụ tra cứu nguyên liệu */
  fetchMenuItems: async () => {
    try {
      const { menuApi } = await import('../api/menuApi');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
      const response = await menuApi.getMenuItems({ branchId, size: 500 });
      set({ menuItems: response?.data?.content || [] });
    } catch (err) {
      console.warn('[KITCHEN_APP] Không tải được menu items', err);
    }
  },

  /** Toggle trạng thái mở rộng hiển thị nguyên liệu của 1 món */
  toggleExpand: (id) => {
    set(state => ({
      expandedIds: state.expandedIds.includes(id) 
        ? state.expandedIds.filter(i => i !== id) 
        : [...state.expandedIds, id]
    }));
  },

  /**
   * fetchPendingOrders — Tải danh sách món chờ từ Backend.
   * Gọi trực tiếp khi cần tải lần đầu hoặc làm mới thủ công.
   */
  fetchPendingOrders: async () => {
    // Chống race condition
    if (get().isLoading) return;

    // Lấy branchId từ authStore
    const branchId = useAuthStore.getState()?.user?.branchId ?? 1;

    set({ isLoading: true });

    try {
      // Gọi API: GET /api/v1/kitchen/orders/pending?branchId={id}
      const response = await kitchenServiceApi.getPendingItems(branchId);

      // BE trả về: ApiResponse<OrderItemResponse[]>
      // apiClient đã bóc tách → response = { success, message, data }
      const rawItems = response?.data ?? [];

      // Map dữ liệu thô từ BE sang KitchenItem format
      const items = mapKitchenItems(rawItems);

      // Anti Flicker UI: Chỉ set lại state nếu dữ liệu thực sự có sự thay đổi
      const currentDataStr = JSON.stringify(get().pendingItems);
      const newDataStr = JSON.stringify(items);

      if (newDataStr !== currentDataStr) {
        set({ pendingItems: items });
      }
      
      if (get().isLoading) {
        set({ isLoading: false });
      }

    } catch (err) {
      console.error('[API_ERROR][KITCHEN] Lỗi tải món bếp:', {
        endpoint: '/kitchen/orders/pending',
        branchId,
        status: err?.status,
        message: err?.message,
      });

      if (get().isLoading) {
        set({ isLoading: false });
      }
      // Không toast error trong polling để tránh spam thông báo
    }
  },

  /**
   * startPolling — Bắt đầu polling tự động để cập nhật realtime.
   *
   * Polling thông minh:
   *   - Chỉ gọi API khi tab đang active (tránh gọi khi tab bị ẩn)
   *   - Khoảng cách 3 giây giữa các lần gọi
   *   - Gọi lần đầu ngay lập tức, sau đó cứ 3 giây một lần
   *
   * ⚠️ NOTE: Đây là giải pháp tạm thời vì BE chưa có WebSocket.
   * → Khi BE implement WebSocket → xóa polling này và dùng Socket.io/SockJS.
   */
  startPolling: () => {
    // Tránh tạo nhiều interval
    if (pollingIntervalId) {
      console.warn('[KitchenStore] Polling đã đang chạy, không tạo thêm.');
      return;
    }

    // Tải ngay lập tức lần đầu
    get().fetchPendingOrders();

    // Sau đó cứ 3 giây gọi một lần, chỉ khi tab đang active
    pollingIntervalId = setInterval(() => {
      // Chỉ gọi API khi tab đang hiển thị (tiết kiệm tài nguyên)
      if (document.visibilityState === 'visible') {
        get().fetchPendingOrders();
      }
    }, POLLING_INTERVAL_MS);

    set({ pollingActive: true });
    console.log('[KitchenStore] Polling đã được bật (mỗi 3 giây).');
  },

  /**
   * stopPolling — Dừng polling để giải phóng tài nguyên.
   * Gọi khi component KitchenPage unmount.
   */
  stopPolling: () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    set({ pollingActive: false });
    console.log('[KitchenStore] Polling đã được tắt.');
  },

  /**
   * completeOrderItem — Hoàn tất một món ăn (bếp xong).
   * Đổi trạng thái: PROCESSING → COMPLETED
   * Món sẽ được đẩy qua historyItems và giữ lại tối đa 50 món.
   */
  completeOrderItem: async (orderItemId) => {
    try {
      await kitchenServiceApi.updateItemStatus(orderItemId, 'COMPLETED');

      // Tìm item gốc để chuyển sang history
      const item = get().pendingItems.find(i => i.id === orderItemId);

      set(state => {
        const remainingPending = state.pendingItems.filter(i => i.id !== orderItemId);
        let newHistory = state.historyItems;
        
        if (item) {
          const completedItem = { 
            ...item, 
            status: 'COMPLETED', 
            completedAt: new Date().toISOString() 
          };
          // Thêm vào đầu và giới hạn HISTORY_LIMIT món để tránh lag
          newHistory = [completedItem, ...state.historyItems].slice(0, HISTORY_LIMIT);
        }

        return {
          pendingItems: remainingPending,
          historyItems: newHistory
        };
      });

      toast.success('✅ Đã hoàn tất món!');
      
      // Chờ một chút trước khi trigger thông báo hoàn thành bàn (nếu có)
      setTimeout(get().checkTableCompletion, 500);

      return true;
    } catch (err) {
      console.error('[API_ERROR][KITCHEN_COMPLETE]', err);
      const msg = err?.message || 'Không thể hoàn tất món.';
      toast.error(err?.status === 409 ? '❌ Lỗi tồn kho hoặc thiếu công thức!' : `Lỗi: ${msg}`);
      return false;
    }
  },

  /**
   * cancelItem — Hủy một món ăn từ KDS (kèm lý do).
   * Đổi trạng thái: PENDING/PROCESSING → CANCELLED
   */
  cancelItem: async (orderItemId, reason) => {
    try {
      await kitchenServiceApi.updateItemStatus(orderItemId, 'CANCELLED', reason);

      const item = get().pendingItems.find(i => i.id === orderItemId);

      set(state => {
        const remainingPending = state.pendingItems.filter(i => i.id !== orderItemId);
        let newHistory = state.historyItems;
        
        if (item) {
          const cancelledItem = { 
            ...item, 
            status: 'CANCELLED', 
            cancelReason: reason,
            completedAt: new Date().toISOString() 
          };
          newHistory = [cancelledItem, ...state.historyItems].slice(0, HISTORY_LIMIT);
        }

        return {
          pendingItems: remainingPending,
          historyItems: newHistory
        };
      });

      toast.success('Đã hủy món!');
      setTimeout(get().checkTableCompletion, 500);
      return true;
    } catch (err) {
      console.error('[API_ERROR][KITCHEN_CANCEL]', err);
      toast.error('❌ Hủy món thất bại. Vui lòng thử lại!');
      return false;
    }
  },

  /**
   * checkTableCompletion — Truy xuất và kiểm tra xem có bàn nào vừa hoàn tất tất cả món không.
   */
  checkTableCompletion: () => {
    // Logic sẽ được tích hợp thực tiễn bên trong component nếu cần, hoặc
    // chạy logic kiểm tra order ID hoàn tất tại đây
  },

  /**
   * clearOrderFromKitchen — Xoá món đang xử lý của một order đã thanh toán khỏi luồng bếp.
   *
   * Hành động:
   *   1. Xoá khỏi pendingItems  → Dọn cột Chờ chế biến + Đang nấu
   *   2. Thêm orderId vào paidOrderIds → Ẩn món này khỏi cột Sẵn sàng + Hủy
   *   3. historyItems không bị xóa → Modal Lịch sử vẫn hiển thị đầy đủ
   *
   * @param {number} orderId - ID của order đã được thanh toán
   */
  clearOrderFromKitchen: (orderId) => {
    if (!orderId) return;

    set(state => ({
      // Xoá khỏi luồng đang xử lý (cột Chờ + Nấu)
      pendingItems: state.pendingItems.filter(i => i.orderId !== orderId),
      // Đánh dấu orderId đã thanh toán → ẩn khỏi cột Sẵn sàng + Hủy
      paidOrderIds: new Set([...state.paidOrderIds, orderId]),
      // historyItems KHÔNG bị cảm → Modal Lịch sử hiển thị đầy đủ
    }));

    console.log(`[KitchenStore] Bàn Order #${orderId} đã thanh toán. Dọn cột luồng bếp, lưu lịch sử.`);
  },

  /**
   * startCookingItem — Bắt đầu nấu một món ăn.
   * Đổi trạng thái: PENDING → PROCESSING
   * BE sẽ trừ nguyên liệu từ kho khi chuyển sang PROCESSING.
   *
   * @param {number} orderItemId - ID của món ăn cần bắt đầu nấu
   * @returns {Promise<boolean>}
   */
  startCookingItem: async (orderItemId) => {
    try {
      // Gọi API: PUT /api/v1/kitchen/order-items/{id}/status
      await kitchenServiceApi.updateItemStatus(orderItemId, 'PROCESSING');

      // Cập nhật trạng thái trong local state
      set(state => ({
        pendingItems: state.pendingItems.map(item =>
          item.id === orderItemId ? { ...item, status: 'PROCESSING' } : item
        ),
      }));

      return true;

    } catch (err) {
      const status = err?.status;
      const message = err?.message ?? 'Lỗi không xác định';

      if (status === 409) {
        toast.error('❌ Không đủ nguyên liệu để bắt đầu nấu món này!');
      } else {
        toast.error(`Không thể bắt đầu nấu: ${message}`);
      }

      console.error('[API_ERROR][KITCHEN_START] Lỗi bắt đầu nấu món:', {
        endpoint: `/kitchen/order-items/${orderItemId}/status`,
        orderItemId, status, message,
      });

      return false;
    }
  },

}));
