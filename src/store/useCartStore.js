/**
 * useCartStore.js — Quản lý giỏ hàng CHƯA GỬI BẾP (Draft Items)
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  STATE SHAPE                                                             │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │  draftItems   Record<tableId, CartItem[]>   Các món mới thêm, chưa gửi │
 * │  isSending    boolean                        Đang call sendToKitchen    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * CartItem shape:
 *   { menuItemId, name, price, quantity, note, categoryType }
 *
 * QUAN TRỌNG:
 *   - draftItems chứa các món STATUS = 'NEW' (chưa gửi bếp)
 *   - Sau khi sendToKitchen thành công, draft items được xoá
 *   - Món đã gửi bếp nằm trong useOrderStore (orders[orderId].items)
 *   - Không CLEAR toàn bộ cart — chỉ xoá phần đã gửi
 *
 * Actions:
 *   addItem(tableId, menuItem)        — Thêm món vào giỏ
 *   updateQuantity(tableId, id, qty)  — Tăng/giảm/xoá món
 *   updateNote(tableId, id, note)     — Thêm/sửa ghi chú
 *   clearDraft(tableId)               — Xoá toàn bộ draft của bàn
 *   sendToKitchen(tableId, orderId)   — Gửi bếp + cập nhật useOrderStore
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { orderApi } from '../api/posApi';
import { useOrderStore } from './useOrderStore';

export const useCartStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /**
   * Draft items chưa gửi bếp, phân theo tableId.
   * @type {Record<number, CartItem[]>}
   */
  draftItems: {},

  /** @type {boolean} */
  isSending: false,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * addItem — Thêm một món vào giỏ của bàn.
   * Nếu món đã có: tăng quantity.
   * Nếu chưa: thêm mới với quantity = 1.
   *
   * @param {number} tableId
   * @param {{ id, name, price, categoryId?, categoryType? }} menuItem
   */
  addItem: async (tableId, menuItem) => {
    if (!tableId) {
      toast.error('⚠️ Vui lòng chọn bàn trước khi thêm món!');
      return;
    }

    // Enterprise UX: Tự động mở bàn nếu bàn đang AVAILABLE
    const tableStore = (await import('./useTableStore')).useTableStore;
    const table = tableStore.getState().tables.find(t => t.id === tableId);
    
    if (table && table.status === 'AVAILABLE') {
      const res = await tableStore.getState().openTable(tableId);
      if (!res) return; // Nếu mở bàn lỗi thì không add món
    }

    set(state => {
      const tableCart = state.draftItems[tableId] ?? [];
      const existIdx  = tableCart.findIndex(i => i.menuItemId === menuItem.id);

      let updatedCart;
      if (existIdx !== -1) {
        // Đã có → tăng qty
        updatedCart = tableCart.map((item, idx) =>
          idx === existIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        // Món mới → thêm vào cuối
        updatedCart = [
          ...tableCart,
          {
            menuItemId: menuItem.id,
            name:       menuItem.name,
            price:      menuItem.price,
            quantity:   1,
            note:       '',
            // categoryType map dựa trên tên category, BE chưa có field này
            // Convention: nếu tên chứa "đồ uống/nước/bar" → BAR, còn lại → KITCHEN
            categoryType: menuItem.categoryType || 'KITCHEN',
          },
        ];
      }

      return {
        draftItems: { ...state.draftItems, [tableId]: updatedCart },
      };
    });
  },

  /**
   * updateQuantity — Tăng/giảm quantity; quantity ≤ 0 → xoá khỏi giỏ.
   *
   * @param {number} tableId
   * @param {number} menuItemId
   * @param {number} newQty
   */
  updateQuantity: (tableId, menuItemId, newQty) => {
    set(state => {
      const tableCart = state.draftItems[tableId] ?? [];

      const updatedCart =
        newQty <= 0
          ? tableCart.filter(i => i.menuItemId !== menuItemId)
          : tableCart.map(i =>
              i.menuItemId === menuItemId ? { ...i, quantity: newQty } : i
            );

      return {
        draftItems: { ...state.draftItems, [tableId]: updatedCart },
      };
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
    set(state => {
      const tableCart = state.draftItems[tableId] ?? [];
      return {
        draftItems: {
          ...state.draftItems,
          [tableId]: tableCart.map(i =>
            i.menuItemId === menuItemId ? { ...i, note } : i
          ),
        },
      };
    });
  },

  /**
   * clearDraft — Xoá toàn bộ draft của bàn (dùng sau khi gửi bếp hoặc huỷ).
   *
   * @param {number} tableId
   */
  clearDraft: (tableId) => {
    set(state => {
      // eslint-disable-next-line no-unused-vars
      const { [tableId]: _removed, ...rest } = state.draftItems;
      return { draftItems: rest };
    });
  },

  /**
   * sendToKitchen — Gửi toàn bộ draft items lên bếp.
   *
   * Flow:
   *   1. Validate: phải có orderId và draft items
   *   2. Gọi orderApi.sendToKitchen()
   *   3. Cập nhật useOrderStore với order mới nhận được
   *   4. Xoá draft items của bàn
   *   5. Toast thành công / lỗi
   *
   * @param {{ tableId: number, orderId: number }} payload
   * @returns {Promise<boolean>} true nếu thành công
   */
  sendToKitchen: async ({ tableId, orderId }) => {
    const { draftItems, isSending } = get();
    const items = draftItems[tableId] ?? [];

    // Guard checks
    if (isSending) return false;
    if (!orderId) {
      toast.error('Bàn chưa được mở. Vui lòng mở bàn trước!');
      return false;
    }
    if (items.length === 0) {
      toast.error('Giỏ hàng trống, không có gì để gửi bếp!');
      return false;
    }

    set({ isSending: true });

    try {
      const res = await orderApi.sendToKitchen({ orderId, newItems: items });
      const updatedOrder = res.data.order;

      // Cập nhật order store với dữ liệu mới từ server
      useOrderStore.getState().setOrder(updatedOrder);

      // Xoá draft của bàn này (các món đã gửi đi)
      get().clearDraft(tableId);

      toast.success(`✅ Đã gửi ${items.length} món đến bếp!`);
      return true;
    } catch (err) {
      // Giữ nguyên draft — không mất món khi lỗi
      toast.error(err?.message || '🔴 Gửi bếp thất bại. Vui lòng thử lại!');
      return false;
    } finally {
      set({ isSending: false });
    }
  },

}));

// ─── Stable Constants (tránh re-render vòng lặp) ──────────────────────────────

export const EMPTY_DRAFT = Object.freeze([]);

// ─── Selectors ─────────────────────────────────────────────────────────────────

/**
 * Lấy draft items của một bàn cụ thể.
 * Trả về EMPTY_DRAFT (stable ref) để tránh re-render loop.
 *
 * @param {number} tableId
 */
export const selectDraftByTable = (tableId) => (state) =>
  state.draftItems[tableId] ?? EMPTY_DRAFT;

/**
 * Tổng tiền draft của bàn.
 *
 * @param {number} tableId
 */
export const selectDraftTotal = (tableId) => (state) =>
  (state.draftItems[tableId] ?? []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

/**
 * Tổng số lượng món trong draft của bàn.
 *
 * @param {number} tableId
 */
export const selectDraftCount = (tableId) => (state) =>
  (state.draftItems[tableId] ?? []).reduce((sum, item) => sum + item.quantity, 0);

/**
 * Số lượng của một món cụ thể trong draft của bàn.
 * Dùng để hiện badge số lượng trên ProductCard.
 *
 * @param {number} tableId
 * @param {number} menuItemId
 */
export const selectItemQtyInDraft = (tableId, menuItemId) => (state) =>
  (state.draftItems[tableId] ?? []).find(i => i.menuItemId === menuItemId)?.quantity ?? 0;
