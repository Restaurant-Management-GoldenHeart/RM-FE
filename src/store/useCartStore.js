/**
 * useCartStore.js — Quản lý giỏ hàng chưa gửi bếp (Draft Items)
 *
 * Kiến trúc:
 *   Store này quản lý các món khách vừa chọn nhưng CHƯA gửi đến bếp.
 *   Khi nhấn "Gửi bếp" → gọi BE → BE xử lý → draft được xóa.
 *
 * State:
 *   draftItems  - Map<tableId, CartItem[]> — Món chưa gửi bếp
 *   isSending   - Đang gọi API gửi bếp hay không
 *
 * Flow:
 *   1. Nhân viên chọn món → addItem (lưu vào draft)
 *   2. Nhân viên nhấn "Gửi bếp" → sendToKitchen
 *      → Gọi BE: POST /api/v1/orders (append items)
 *      → BE trả về order đã cập nhật
 *      → Xóa draft của bàn
 *      → Lưu order mới vào useOrderStore
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import orderApi from '../services/api/orderApi';
import { mapOrder } from '../services/mapper/orderMapper';
import { useOrderStore } from './useOrderStore';
import { useAuthStore } from './useAuthStore';

export const useCartStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /**
   * Draft items chưa gửi bếp, phân theo tableId.
   * @type {Record<number, CartItem[]>}
   */
  draftItems: {},

  /** Đang gọi API gửi bếp hay không — dùng để disable button */
  isSending: false,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * addItem — Thêm một món vào giỏ hàng của bàn.
   * Nếu món đã có → tăng số lượng.
   * Nếu chưa có → thêm mới với quantity = 1.
   *
   * Tính năng UX: Tự động mở bàn nếu bàn đang AVAILABLE.
   *
   * @param {number} tableId   - ID bàn cần thêm món
   * @param {object} menuItem  - { id, name, price, categoryType? }
   */
  addItem: async (tableId, menuItem) => {
    if (!tableId) {
      toast.error('⚠️ Vui lòng chọn bàn trước khi thêm món!');
      return;
    }

    const { useTableStore } = await import('./useTableStore');
    const tableState = useTableStore.getState();
    const table = tableState.tables.find(t => t.id === tableId);

    // Chặn nếu bàn trống VÀ chưa được bấm "Mở bàn" (selected)
    if (table && table.status === 'AVAILABLE' && tableState.selectedTableId !== tableId) {
      toast.error('⚠️ Hãy mở bàn để chọn món!');
      return; 
    }

    // Thêm món vào draft (state cục bộ, không gọi API)
    set(state => {
      const tableCart = state.draftItems[tableId] ?? [];
      const existIdx = tableCart.findIndex(i => i.menuItemId === menuItem.id);

      let updatedCart;
      if (existIdx !== -1) {
        // Món đã có trong giỏ → tăng số lượng lên 1
        updatedCart = tableCart.map((item, idx) =>
          idx === existIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Món mới → thêm vào cuối danh sách
        updatedCart = [
          ...tableCart,
          {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            note: '',
            // Convention: nếu category chứa "đồ uống/nước/bar" → BAR, còn lại → KITCHEN
            categoryType: menuItem.categoryType || 'KITCHEN',
          },
        ];
      }

      return { draftItems: { ...state.draftItems, [tableId]: updatedCart } };
    });
  },

  /**
   * updateQuantity — Thay đổi số lượng món trong giỏ.
   * Nếu quantity <= 0 → xóa món khỏi giỏ.
   *
   * @param {number} tableId
   * @param {number} menuItemId
   * @param {number} newQty
   */
  updateQuantity: (tableId, menuItemId, newQty) => {
    set(state => {
      const tableCart = state.draftItems[tableId] ?? [];
      const updatedCart = newQty <= 0
        ? tableCart.filter(i => i.menuItemId !== menuItemId)
        : tableCart.map(i => i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i);

      return { draftItems: { ...state.draftItems, [tableId]: updatedCart } };
    });
  },

  /**
   * updateNote — Cập nhật ghi chú cho một món trong giỏ.
   *
   * @param {number} tableId
   * @param {number} menuItemId
   * @param {string} note
   */
  updateNote: (tableId, menuItemId, note) => {
    set(state => ({
      draftItems: {
        ...state.draftItems,
        [tableId]: (state.draftItems[tableId] ?? []).map(i =>
          i.menuItemId === menuItemId ? { ...i, note } : i
        ),
      },
    }));
  },

  /**
   * clearDraft — Xóa toàn bộ món chưa gửi của một bàn.
   * Gọi sau khi gửi bếp thành công hoặc khi nhân viên hủy giỏ hàng.
   *
   * @param {number} tableId
   */
  clearDraft: (tableId) => {
    set(state => {
      const { [tableId]: _removed, ...rest } = state.draftItems;
      return { draftItems: rest };
    });
  },

  /**
   * sendToKitchen — Gửi các món trong giỏ lên bếp.
   *
   * Flow:
   *   1. Validate: phải có orderId và có ít nhất 1 món trong giỏ
   *   2. Gọi BE: POST /api/v1/orders (BE sẽ append items vào order hiện tại)
   *   3. Map response từ BE → orderMapper
   *   4. Cập nhật useOrderStore với order mới nhất
   *   5. Xóa draft của bàn
   *
   * ⚠️ NOTE BE: POST /orders dùng chung cho cả tạo mới và thêm món.
   * → BE tự detect dựa vào tableId có order đang mở hay không.
   * → FE không cần biết orderId cũ, chỉ cần truyền đúng tableId và items.
   *
   * @param {{ tableId: number, bypassKitchen?: boolean }} payload
   * @returns {Promise<boolean>}
   */
  sendToKitchen: async ({ tableId, bypassKitchen = false }) => {
    const { draftItems, isSending } = get();
    const items = draftItems[tableId] ?? [];

    // Chống race condition
    if (isSending) return false;

    if (!tableId) {
      toast.error('Vui lòng chọn bàn!');
      return false;
    }
    if (items.length === 0) {
      toast.error('Giỏ hàng trống, không có gì để gửi bếp!');
      return false;
    }

    set({ isSending: true });

    try {
      // ⚠️ Validate lại trạng thái bàn phòng hờ (Duplicate protection)
      // Chống Race Condition: Kiểm tra lại bàn có bị ai đó dùng trước chưa
      const { useTableStore } = await import('./useTableStore');
      const branchId = useAuthStore.getState()?.user?.branchId ?? 1;

      // Refetch nhanh tables để lấy status mới nhất
      const { tableApi } = await import('../services/api/tableApi');
      const tableCheckRes = await tableApi.getTables(branchId);
      const latestTable = tableCheckRes?.data?.find(t => t.id === tableId);

      if (latestTable && latestTable.status !== 'AVAILABLE' && latestTable.status !== 'OCCUPIED') {
        toast.error('Bàn hiện không thể gọi món (Trạng thái đã thay đổi)!');
        await useTableStore.getState().fetchTables(branchId);
        set({ isSending: false });
        // NOTE: Giữ nguyên draft để người dùng có thể gửi lại hoặc chọn bàn khác
        return false;
      }

      // Chuyển đổi CartItem sang format BE yêu cầu
      // ⚠️ NOTE BE: BE dùng "menuItemId", "quantity", "note"
      const beItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note || null, // Gửi null thay vì chuỗi rỗng
      }));

      // Gọi API: POST /api/v1/orders
      // BE sẽ tự động append items vào order đang mở của bàn
      const response = await orderApi.createOrAppendOrder({
        tableId,
        branchId,
        items: beItems,
      });

      // ⚠️ NOTE BE: Nếu bypassKitchen = true, hệ thống mock cũ cho phép skip bếp.
      // → BE thật KHÔNG hỗ trợ bypass trực tiếp qua field này.
      // → FE có thể thực hiện bằng cách serve item ngay sau khi gửi (cần flow riêng).
      if (bypassKitchen) {
        console.warn('[CartStore] bypassKitchen=true nhưng BE chưa hỗ trợ. Đang xử lý như normal flow.');
      }

      // Map và lưu order vừa nhận được từ BE
      const updatedOrder = mapOrder(response?.data);
      if (updatedOrder) {
        useOrderStore.getState().setOrder(updatedOrder);
      }

      // ⚠️ Cập nhật table store để lấy currentOrderId mới nhất
      await useTableStore.getState().fetchTables(branchId);
      useTableStore.getState().selectTable(tableId);

      // Xóa draft của bàn sau khi gửi thành công
      get().clearDraft(tableId);

      toast.success(`✅ Đã gửi ${items.length} món đến bếp!`);
      return true;

    } catch (err) {
      // Giữ nguyên draft khi lỗi — không mất món của khách
      console.error('[API_ERROR][SEND_TO_KITCHEN] Lỗi gửi bếp:', {
        endpoint: '/orders',
        tableId,
        itemCount: items.length,
        status: err?.status,
        message: err?.message,
      });
      // ❗ NOTE BE phản hồi lỗi Nghiệp vụ (4xx) - FE từ chối tiếp tục
      toast.error(err?.message || '🔴 Gửi bếp thất bại. Vui lòng thử lại!');
      return false;

    } finally {
      set({ isSending: false });
    }
  },

}));

// ─── Stable Constants ──────────────────────────────────────────────────────────

/** Mảng rỗng cố định — tránh tạo reference mới mỗi lần render */
export const EMPTY_DRAFT = Object.freeze([]);

// ─── Selectors ─────────────────────────────────────────────────────────────────

/** Lấy draft items của một bàn cụ thể */
export const selectDraftByTable = (tableId) => (state) =>
  state.draftItems[tableId] ?? EMPTY_DRAFT;

/** Tổng tiền draft của một bàn */
export const selectDraftTotal = (tableId) => (state) =>
  (state.draftItems[tableId] ?? []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

/** Tổng số lượng món trong draft */
export const selectDraftCount = (tableId) => (state) =>
  (state.draftItems[tableId] ?? []).reduce((sum, item) => sum + item.quantity, 0);

/** Số lượng của một món cụ thể trong draft — dùng cho badge trên ProductCard */
export const selectItemQtyInDraft = (tableId, menuItemId) => (state) =>
  (state.draftItems[tableId] ?? []).find(i => i.menuItemId === menuItemId)?.quantity ?? 0;
