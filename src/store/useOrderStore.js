/**
 * useOrderStore.js — Quản lý Orders (đã gửi bếp, lịch sử)
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  STATE SHAPE                                                           │
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  orders     Record<orderId, PosOrder>   Các order đang hoạt động      │
 * │  loading    boolean                     Đang gọi API                  │
 * │  auditLogs  AuditLog[]                  Lịch sử thao tác (KDS)        │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Order flow:
 *   NEW → SENT_TO_KITCHEN → PREPARING → READY → SERVED → PAID
 *
 * Actions:
 *   setOrder(order)               — Lưu/cập nhật order vào store
 *   getOrderByTableId(tableId)    — Lấy order đang active của bàn
 *   cancelItem(orderId, itemId)   — Yêu cầu huỷ item
 *   clearOrder(orderId)           — Xoá order khi đóng bàn
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { orderApi } from '../api/posApi';

const EnterpriseLogger = {
  log: (msg) => console.log(`%c[EnterpriseStore] ${msg}`, 'color: #d97706; font-weight: bold'),
  error: (msg, err) => console.error(`[EnterpriseStore] ${msg}`, err),
};

export const useOrderStore = create((set, get) => ({

  // ─── State ──────────────────────────────────────────────────────────────────

  /**
   * Record của các order đang active.
   * Key: orderId, Value: PosOrder object.
   * @type {Record<number, PosOrder>}
   */
  orders: {},

  /** @type {boolean} */
  loading: false,

  /** @type {any[]} */
  auditLogs: [],

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * setOrder — Lưu hoặc cập nhật một order vào store.
   * Sử dụng sau khi openTable hoặc sendToKitchen thành công.
   *
   * @param {PosOrder} order
   */
  setOrder: (order) => {
    set(state => ({
      orders: { ...state.orders, [order.id]: order },
    }));
  },

  /**
   * refreshOrder — Reload order từ API. Dùng khi cần đồng bộ với BE.
   *
   * @param {number} orderId
   */
  refreshOrder: async (orderId) => {
    try {
      const res = await orderApi.getOrder(orderId);
      set(state => ({
        orders: { ...state.orders, [orderId]: res.data },
      }));
    } catch (err) {
      console.error('[useOrderStore] refreshOrder failed:', err);
    }
  },

  /**
   * cancelItem — Yêu cầu huỷ một OrderItem.
   * Chỉ cho phép khi item status là NEW hoặc SENT.
   * Nếu PREPARING/READY → toast cảnh báo.
   *
   * @param {{ orderId: number, itemId: string, reason?: string }} payload
   */
  cancelItem: async ({ orderId, itemId, reason = 'Khách đổi ý' }) => {
    // Optimistic: set CANCELLED ngay
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

    const requestId = crypto.randomUUID();
    try {
      const res = await orderApi.cancelItem({ orderId, itemId, reason, requestId });
      // Sync lại từ server để đảm bảo đúng
      set(state => ({
        orders: { ...state.orders, [orderId]: res.data },
      }));
      toast.success('Đã huỷ món thành công');
    } catch (err) {
      // Rollback optimistic update
      get().refreshOrder(orderId);
      toast.error(err?.message || 'Không thể huỷ món này');
    }
  },

  /**
   * removeOrder — Xoá sạch một order khỏi store.
   * Dùng cho nghiệp vụ Gộp bàn: Sau khi gộp vào bàn khác, order cũ cần được xoá.
   */
  removeOrder: (orderId) => {
    set(state => {
      const { [orderId]: _, ...rest } = state.orders;
      return { orders: rest };
    });
    EnterpriseLogger.log(`Order ${orderId} removed from store.`);
  },

  /**
   * clearOrder — Alias (giữ lại để tương thích ngược nếu cần).
   */
  clearOrder: (orderId) => get().removeOrder(orderId),

  /**
   * getOrderByTableId — Tìm order đang active của một bàn.
   * Dùng khi bấm vào bàn đang OCCUPIED.
   *
   * @param {number} tableId
   * @returns {PosOrder | undefined}
   */
  getOrderByTableId: (tableId) => {
    return Object.values(get().orders).find(
      o => o.tableId === tableId && !['PAID', 'CANCELLED'].includes(o.status)
    );
  },

  /**
   * updateItemStatus — Cập nhật trạng thái món từ KDS.
   * "Bulletproof" Logic: Idempotency + Concurrency + Retry + Rollback.
   */
  updateItemStatus: async ({ orderId, itemId, status, version }) => {
    const requestId = crypto.randomUUID();
    const originalOrders = { ...get().orders };
    
    // 1. Optimistic Update (UI phản hồi ngay lập tức)
    set(state => {
      const order = state.orders[orderId];
      if (!order) return state;
      return {
        orders: {
          ...state.orders,
          [orderId]: {
            ...order,
            items: order.items.map(i => 
              i.id === itemId ? { ...i, status, version: i.version + 1, loading: true } : i
            )
          }
        }
      };
    });

    const attempt = async (retryIdx = 0) => {
      try {
        const res = await orderApi.updateItemStatus({ 
          orderId, itemId, status, requestId, version, user: 'Kitchen Staff' 
        });

        // Success: Update state với data mới nhất từ server
        set(state => ({
          orders: { ...state.orders, [orderId]: res.data },
          auditLogs: [res.auditLog, ...state.auditLogs].slice(0, 50)
        }));
        
        EnterpriseLogger.log(`Item ${itemId} updated to ${status} (Req: ${requestId})`);
      } catch (err) {
        // 2. Concurrency Conflict (409) -> Không retry, bắt buộc refetch
        if (err.status === 409) {
          EnterpriseLogger.error('Version conflict detected!', err);
          toast.error('Món ăn đã được người khác cập nhật. Vui lòng thử lại.');
          await get().refreshOrder(orderId);
          return;
        }

        // 3. Retry logic cho các lỗi mạng/server khác
        if (retryIdx < 3) {
          const delay = Math.pow(2, retryIdx + 1) * 500;
          EnterpriseLogger.log(`Action failed. Retrying in ${delay}ms... (Attempt ${retryIdx + 1}/3)`);
          await new Promise(res => setTimeout(res, delay));
          return attempt(retryIdx + 1);
        }

        // 4. Rollback (Hoàn tác) nếu thất bại hoàn toàn
        EnterpriseLogger.error('Action failed after 3 retries. Rolling back...', err);
        set({ orders: originalOrders });
        toast.error('Không thể cập nhật món ăn. Vui lòng kiểm tra kết nối.');
      }
    };

    return attempt();
  },

  /**
   * resyncAll — Làm mới toàn bộ orders đang theo dõi. 
   * Dùng khi tab active trở lại.
   */
  resyncAll: async () => {
    const activeOrderIds = Object.keys(get().orders);
    if (activeOrderIds.length === 0) return;
    
    EnterpriseLogger.log(`Resyncing ${activeOrderIds.length} orders...`);
    await Promise.all(activeOrderIds.map(id => get().refreshOrder(Number(id))));
  },

  /**
   * serveItem — Đánh dấu món ăn đã được phục vụ lên bàn khách.
   */
  serveItem: async (orderId, itemId) => {
    const requestId = crypto.randomUUID();
    try {
      const res = await orderApi.serveItem({ orderId, itemId, requestId });
      set(state => ({
        orders: { ...state.orders, [orderId]: res.data }
      }));
      toast.success('Đã phục vụ món!');
    } catch (err) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái phục vụ');
    }
  },

}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

/** Lấy order theo orderId */
export const selectOrderById = (orderId) => (state) => state.orders[orderId];

/** Lấy tất cả items active (không CANCELLED) của một order */
export const selectActiveItems = (orderId) => (state) => {
  const order = state.orders[orderId];
  if (!order) return [];
  return order.items.filter(i => i.status !== 'CANCELLED');
};
