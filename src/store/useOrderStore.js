/**
 * useOrderStore.js — Quản lý trạng thái Đơn hàng (Orders)
 *
 * Kiến trúc:
 *   1. Gọi orderApi (service layer) để thao tác với BE
 *   2. Dùng orderMapper để chuẩn hóa dữ liệu từ BE
 *   3. Cập nhật state để UI re-render
 *
 * State:
 *   orders  - Map<orderId, Order> — các order đang active
 *   loading - trạng thái đang gọi API
 *
 * Luồng order:
 *   Mở bàn → Tạo order (useTableStore.openTable)
 *   Gửi bếp → sendToKitchen (useCartStore)
 *   Bếp xong → status item thay đổi (polling KDS)
 *   Phục vụ → serveItem
 *   Thanh toán → usePaymentFlow (PaymentModal)
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import orderApi from '../services/api/orderApi';
import { mapOrder } from '../services/mapper/orderMapper';

const log = {
  info: (msg, data) => console.log(`%c[OrderStore] ${msg}`, 'color:#d97706;font-weight:bold', data || ''),
  error: (msg, data) => console.error(`[OrderStore] ${msg}`, data || ''),
};

export const useOrderStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /**
   * Các order đang active, lưu theo dạng Map:
   * { [orderId]: Order }
   */
  orders: {},

  /** Đang gọi API hay không */
  loading: false,

  /** Đang tải một đơn hàng cụ thể (dành choselectTable) */
  loadingOrder: false,

  /** Nhật ký thay đổi (audit logs) - Dùng để tránh crash cho KDS cũ */
  auditLogs: [],

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * setOrder — Lưu hoặc cập nhật một order vào store.
   * Dùng sau openTable hoặc sendToKitchen thành công.
   *
   * @param {object} order - Order đã được map từ mapper
   */
  setOrder: (order) => {
    if (!order?.id) return;
    set(state => ({
      orders: { ...state.orders, [order.id]: order },
    }));
  },

  /**
   * refreshOrder — Tải lại order từ BE để đồng bộ trạng thái.
   * Dùng khi bấm vào bàn OCCUPIED hoặc sau khi có cập nhật từ bếp.
   *
   * @param {number} orderId - ID của order cần tải
   */
  refreshOrder: async (orderId) => {
    if (!orderId) return;

    try {
      // Gọi API: GET /api/v1/orders/{orderId}
      const response = await orderApi.getOrder(orderId);

      // Map dữ liệu thô từ BE
      const order = mapOrder(response?.data);

      if (order) {
        set(state => ({
          orders: { ...state.orders, [orderId]: order },
        }));
        log.info(`Order #${orderId} đã được đồng bộ từ BE`);
      }

    } catch (err) {
      // ⚠️ Không toast ở đây — để component tự xử lý nếu cần
      log.error(`Lỗi tải order #${orderId}:`, {
        endpoint: `/orders/${orderId}`,
        status: err?.status,
        message: err?.message,
      });
    }
  },

  /**
   * serveItem — Đánh dấu một món ăn đã được phục vụ đến bàn.
   * Đổi trạng thái từ READY → SERVED.
   *
   * BE endpoint: PUT /api/v1/orders/order-items/{itemId}/serve
   *
   * @param {number} orderId    - ID đơn hàng chứa món
   * @param {number} orderItemId - ID của món ăn trong đơn hàng
   */
  serveItem: async (orderId, orderItemId) => {
    // Optimistic update: cập nhật UI ngay lập tức trước khi gọi API
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;
      return {
        orders: {
          ...state.orders,
          [orderId]: {
            ...order,
            items: order.items.map(i =>
              i.id === orderItemId ? { ...i, status: 'SERVED' } : i
            ),
          },
        },
      };
    });

    try {
      // Gọi API: PUT /api/v1/orders/order-items/{itemId}/serve
      await orderApi.serveOrderItem(orderItemId);

      // Đồng bộ lại từ BE để đảm bảo chính xác
      await get().refreshOrder(orderId);

      toast.success('✅ Đã phục vụ món cho khách!');

    } catch (err) {
      // Rollback: tải lại order từ BE để hoàn tác optimistic update
      await get().refreshOrder(orderId);

      log.error('Lỗi khi đánh dấu phục vụ món:', {
        endpoint: `/orders/order-items/${orderItemId}/serve`,
        orderId, orderItemId,
        status: err?.status,
        message: err?.message,
      });
      toast.error(err?.message || 'Không thể cập nhật trạng thái phục vụ.');
    }
  },

  /**
   * cancelItem — Hủy một món ăn trong đơn hàng.
   * Bắt buộc phải có lý do hủy (reason).
   *
   * BE endpoint: PUT /api/v1/kitchen/order-items/{itemId}/status
   * Body: { status: "CANCELLED", reason: string }
   *
   * ⚠️ NOTE BE: Chỉ được hủy khi item ở trạng thái PENDING hoặc PROCESSING.
   * → Nếu đã COMPLETED/SERVED → BE trả về lỗi 422.
   *
   * @param {{ orderId, itemId, reason }} payload
   */
  cancelItem: async ({ orderId, itemId, reason = '' }) => {
    if (!reason?.trim()) {
      toast.error('Vui lòng nhập lý do hủy món!');
      return;
    }

    // Optimistic update: đánh dấu CANCELLED ngay trên UI
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;
      return {
        orders: {
          ...state.orders,
          [orderId]: {
            ...order,
            items: order.items.map(i =>
              i.id === itemId ? { ...i, status: 'CANCELLED', cancelReason: reason } : i
            ),
          },
        },
      };
    });

    try {
      // Gọi API: PUT /api/v1/kitchen/order-items/{itemId}/status
      await orderApi.updateItemStatus(itemId, 'CANCELLED', reason);

      // Đồng bộ lại từ BE
      await get().refreshOrder(orderId);

      toast.success('Đã hủy món thành công.');

    } catch (err) {
      // Rollback khi gặp lỗi
      await get().refreshOrder(orderId);

      log.error('Lỗi khi hủy món:', {
        endpoint: `/kitchen/order-items/${itemId}/status`,
        orderId, itemId, reason,
        status: err?.status,
        message: err?.message,
      });
      toast.error(err?.message || 'Không thể hủy món này.');
    }
  },

  /**
   * removeOrder — Xóa order khỏi store.
   * Dùng sau khi thanh toán xong hoặc gộp bàn.
   *
   * @param {number} orderId
   */
  removeOrder: (orderId) => {
    set(state => {
      // Dùng destructuring để xóa key khỏi object an toàn
      const { [orderId]: _removed, ...rest } = state.orders;
      return { orders: rest };
    });
    log.info(`Order #${orderId} đã được xóa khỏi store.`);
  },

  /** Alias của removeOrder để tương thích ngược */
  clearOrder: (orderId) => get().removeOrder(orderId),

  /**
   * getOrderByTableId — Tìm order đang active của một bàn.
   * Dùng khi bấm vào bàn OCCUPIED để hiển thị đơn hàng.
   *
   * @param {number} tableId
   * @returns {object | undefined}
   */
  getOrderByTableId: (tableId) => {
    return Object.values(get().orders).find(
      o => o.tableId === tableId && !['PAID', 'CANCELLED', 'MERGED'].includes(o.status)
    );
  },

  /**
   * resyncAll — Đồng bộ lại toàn bộ order đang active từ BE.
   * Gọi khi tab trình duyệt được focus lại để cập nhật trạng thái mới nhất.
   */
  resyncAll: async () => {
    const activeOrderIds = Object.keys(get().orders);
    if (activeOrderIds.length === 0) return;

    log.info(`Đồng bộ lại ${activeOrderIds.length} order...`);
    await Promise.all(activeOrderIds.map(id => get().refreshOrder(Number(id))));
  },

}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

/** Lấy order theo orderId */
export const selectOrderById = (orderId) => (state) => state.orders[orderId];

/** Lấy tất cả items chưa bị hủy của một order */
export const selectActiveItems = (orderId) => (state) => {
  const order = state.orders[orderId];
  if (!order) return [];
  return order.items.filter(i => i.status !== 'CANCELLED');
};
