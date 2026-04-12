/**
 * useKitchenStore.js — Zustand store quản lý luồng bếp (KITCHEN).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  API thực tế:                                                       │
 * │  POST /api/v1/kitchen/order-items/:id/complete                      │
 * │    → Hoàn tất món: trừ nguyên liệu khỏi kho                        │
 * │    → 409 Conflict: không đủ nguyên liệu / thiếu công thức recipe    │
 * │                                                                     │
 * │  GET danh sách chờ: Chưa có API → dùng mock 1s                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import apiClient from '../api/apiClient';

// ─── Mock data — xóa khi BE có API GET pending items ─────────────────────────
const MOCK_PENDING_ITEMS = [
  {
    id: 1,
    orderId: 101,
    menuItemName: 'Phở Bò Tái',
    quantity: 2,
    note: 'Ít bánh, nhiều hành',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 phút trước
    tableName: 'Bàn 05',
  },
  {
    id: 2,
    orderId: 101,
    menuItemName: 'Bún Bò Huế',
    quantity: 1,
    note: '',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    tableName: 'Bàn 05',
  },
  {
    id: 3,
    orderId: 102,
    menuItemName: 'Gà Nướng Sả Tắc',
    quantity: 3,
    note: 'Cay vừa',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 phút trước — vượt 15p
    tableName: 'Bàn 02',
  },
  {
    id: 4,
    orderId: 102,
    menuItemName: 'Canh Chua Cá Lóc',
    quantity: 1,
    note: '',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    tableName: 'Bàn 02',
  },
  {
    id: 5,
    orderId: 103,
    menuItemName: 'Cơm Chiên Hải Sản',
    quantity: 2,
    note: 'Không hành lá',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    tableName: 'Bàn 09',
  },
];

// ─── Store ───────────────────────────────────────────────────────────────────

export const useKitchenStore = create((set, get) => ({

  // ─── State ──────────────────────────────────────────────────────────────────

  /** @type {KitchenItem[]} — Các món đang chờ nấu */
  pendingItems: [],

  /** @type {boolean} */
  isLoading: false,

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * fetchPendingOrders — Mock fetch danh sách món chờ.
   *
   * TODO: Khi BE có API GET /api/v1/kitchen/order-items?status=PENDING, thay bằng:
   *   const result = await apiClient.get('/kitchen/order-items?status=PENDING');
   *   const items = result?.data ?? [];
   *   set({ pendingItems: items, isLoading: false });
   *
   * Mock delay 1 giây mô phỏng network latency thực tế.
   */
  fetchPendingOrders: () => {
    // Guard: không fetch lại khi đang loading
    if (get().isLoading) return;

    set({ isLoading: true });

    // Simulate API call — 1 giây delay
    setTimeout(() => {
      set({
        pendingItems: MOCK_PENDING_ITEMS,
        isLoading: false,
      });
    }, 1000);
  },

  /**
   * completeOrderItem — Hoàn tất 1 món, trừ nguyên liệu kho.
   *
   * API thực tế: POST /api/v1/kitchen/order-items/:id/complete
   *
   * Error handling:
   *   409 Conflict → không đủ nguyên liệu / thiếu recipe → toast cụ thể
   *   5xx / network → fallback generic toast
   *
   * @param {number} orderItemId — id của OrderItem cần hoàn tất
   * @returns {Promise<boolean>} — true nếu thành công, false nếu thất bại
   */
  completeOrderItem: async (orderItemId) => {
    // ── Gọi API ──────────────────────────────────────────────────────────────
    try {
      // apiClient có response interceptor: return response.data (ApiResponse)
      // → result = ApiResponse { success, message, data }
      await apiClient.post(`/kitchen/order-items/${orderItemId}/complete`);

      // ── Thành công: xóa khỏi local state ────────────────────────────────────
      set((state) => ({
        pendingItems: state.pendingItems.filter((item) => item.id !== orderItemId),
      }));

      toast.success('✅ Đã hoàn tất món, tồn kho đã được trừ!');
      return true;

    } catch (err) {
      // ── Phân tích lỗi từ normalizedError (apiClient format) ─────────────────
      // apiClient reject với: { status, message, fieldErrors, raw }
      const status = err?.status;
      const message = err?.message ?? err?.raw?.message ?? 'Lỗi không xác định';

      if (status === 409) {
        // 409 Conflict = không đủ nguyên liệu tồn kho HOẶC thiếu recipe
        toast.error('❌ Không đủ nguyên liệu trong kho hoặc thiếu công thức!');
      } else {
        // Lỗi khác (500, network, timeout...)
        toast.error(`Không thể hoàn tất món: ${message}`);
      }

      console.error('[useKitchenStore] completeOrderItem failed:', { orderItemId, err });
      return false;
    }
  },

}));
