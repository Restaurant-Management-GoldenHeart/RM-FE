/**
 * usePosStore.js — Zustand store cho màn hình Staff POS.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  STATE SHAPE                                                        │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  tables          RestaurantTable[]   Danh sách bàn (mock tĩnh)      │
 * │  selectedTableId number | null       ID bàn đang được chọn          │
 * │  menuItems       MenuItem[]          Toàn bộ menu từ API            │
 * │  categories      Category[]          Derived từ menuItems (extract)  │
 * │  menuLoading     boolean             Đang fetch menu                │
 * │  cart            Record<tableId,     Giỏ hàng theo bàn             │
 * │                    OrderItem[]>                                    │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  OrderItem shape: { menuItemId, name, price, quantity, note }       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * NOTE về apiClient vs posApi:
 *   - menuApi dùng apiClient → response interceptor đã unwrap ApiResponse
 *     → caller nhận { data: PageResponse, message, success } trực tiếp
 *   - posApi là axios thô → caller nhận { data: ApiResponse }
 *   Cùng một project nhưng hai cơ chế khác nhau → cần bóc tách đúng lớp.
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { menuApi } from '../api/menuApi';
import { posService } from '../api/posApi';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Mock 10 bàn tĩnh vì backend chưa có API bàn stable.
 * Khi BE sẵn sàng, thay bằng API call trong fetchInitialData.
 *
 * @type {Array<{ id: number, tableNumber: string, capacity: number, status: string }>}
 */
const MOCK_TABLES = [
  { id: 1, tableNumber: 'B1', capacity: 4, status: 'AVAILABLE' },
  { id: 2, tableNumber: 'B2', capacity: 4, status: 'AVAILABLE' },
  { id: 3, tableNumber: 'B3', capacity: 6, status: 'AVAILABLE' },
  { id: 4, tableNumber: 'B4', capacity: 4, status: 'AVAILABLE' },
  { id: 5, tableNumber: 'B5', capacity: 2, status: 'AVAILABLE' },
  { id: 6, tableNumber: 'B6', capacity: 8, status: 'AVAILABLE' },
  { id: 7, tableNumber: 'B7', capacity: 4, status: 'AVAILABLE' },
  { id: 8, tableNumber: 'B8', capacity: 4, status: 'AVAILABLE' },
  { id: 9, tableNumber: 'VIP1', capacity: 8, status: 'AVAILABLE' },
  { id: 10, tableNumber: 'VIP2', capacity: 10, status: 'AVAILABLE' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract danh sách categories duy nhất từ mảng menuItems.
 * Backend trả về mỗi menuItem kèm { categoryId, categoryName } (hoặc category object).
 * Kết quả được sort theo tên để bộ lọc ổn định.
 *
 * @param {MenuItem[]} menuItems
 * @returns {Array<{ id: number, name: string }>}
 */
function extractCategories(menuItems) {
  const seen = new Map();

  for (const item of menuItems) {
    // Tương thích cả hai response shape từ backend:
    // Shape 1: item.categoryId + item.categoryName
    // Shape 2: item.category = { id, name }
    const catId = item.categoryId ?? item.category?.id;
    const catName = item.categoryName ?? item.category?.name;

    if (catId && !seen.has(catId)) {
      seen.set(catId, { id: catId, name: catName ?? `Danh mục ${catId}` });
    }
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePosStore = create((set, get) => ({

  // ─── State ──────────────────────────────────────────────────────────────────

  /** @type {Array<{ id, tableNumber, capacity, status }>} */
  tables: [],

  /** @type {number | null} */
  selectedTableId: null,

  /** @type {Array<MenuItem>} */
  menuItems: [],

  /** @type {Array<{ id: number, name: string }>} */
  categories: [],

  /** @type {boolean} */
  menuLoading: false,

  /** @type {boolean} */
  tablesLoading: false,

  /** @type {boolean} */
  isSendingOrder: false,

  /** @type {string | null} */
  error: null,

  /**
   * Giỏ hàng theo bàn.
   * @type {Record<number, Array<{ menuItemId: number, name: string, price: number, quantity: number, note: string }>>}
   */
  cart: {},

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * fetchInitialData — Tải toàn bộ menu và danh sách bàn.
   */
  fetchInitialData: async () => {
    // Tránh gọi trùng lặp
    if (get().menuLoading) return;

    set({ menuLoading: true, error: null });

    try {
      // Chỉ fetch Menu thực tế từ Backend
      const menuRes = await menuApi.getMenuItems({ page: 0, size: 100 });

      const menuItems = menuRes?.data?.content ?? [];

      set({
        menuItems: menuItems,
        categories: extractCategories(menuItems),
        // Dữ liệu bàn dùng Mock vì Backend chưa có API /tables
        tables: MOCK_TABLES,
        menuLoading: false,
        tablesLoading: false
      });

    } catch (err) {
      console.error('[usePosStore] Menu fetch failed:', err);
      set({
        menuLoading: false,
        tablesLoading: false,
        error: 'Không thể tải thực đơn từ Backend.',
        tables: MOCK_TABLES // Vẫn cho hiện bàn mock để POS không bị trắng
      });
      toast.error('Không thể đồng bộ Thực đơn');
    }
  },

  /**
   * setSelectedTable — Chuyển bàn
   */
  setSelectedTable: (tableId) => set({ selectedTableId: tableId }),

  /**
   * addToCart — Thêm món
   */
  addToCart: (menuItem) => {
    const { selectedTableId, cart } = get();

    if (!selectedTableId) {
      toast.error('⚠️ Vui lòng chọn bàn trước khi chọn món!');
      return;
    }

    const tableCart = cart[selectedTableId] ?? [];
    const existingIdx = tableCart.findIndex(i => i.menuItemId === menuItem.id);

    let updatedCart;
    if (existingIdx !== -1) {
      updatedCart = tableCart.map((item, idx) =>
        idx === existingIdx
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      const newItem = {
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        note: '',
      };
      updatedCart = [...tableCart, newItem];
    }

    set({
      cart: {
        ...cart,
        [selectedTableId]: updatedCart,
      },
    });
  },

  /**
   * updateCartItem — Tăng/giảm/xóa
   */
  updateCartItem: (menuItemId, quantity = null, note = null) => {
    const { selectedTableId, cart } = get();
    if (!selectedTableId) return;

    const tableCart = cart[selectedTableId] ?? [];

    if (quantity !== null && quantity <= 0) {
      set({
        cart: {
          ...cart,
          [selectedTableId]: tableCart.filter(i => i.menuItemId !== menuItemId),
        },
      });
      return;
    }

    const updatedCart = tableCart.map(item => {
      if (item.menuItemId !== menuItemId) return item;
      return {
        ...item,
        ...(quantity !== null && { quantity }),
        ...(note !== null && { note }),
      };
    });

    set({
      cart: {
        ...cart,
        [selectedTableId]: updatedCart,
      },
    });
  },

  /**
   * sendOrderToKitchen — Gửi toàn bộ giỏ hàng của bàn hiện tại đến bếp
   */
  sendOrderToKitchen: async () => {
    const { selectedTableId, cart, isSendingOrder } = get();
    const cartItems = cart[selectedTableId] ?? [];

    if (!selectedTableId) {
      toast.error('⚠️ Chưa chọn bàn!');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('⚠️ Giỏ hàng rỗng!');
      return;
    }
    if (isSendingOrder) return;

    set({ isSendingOrder: true });

    try {
      // GIẢ LẬP: Vì Backend chưa có API POST /orders, simulate thành công sau 800ms
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockOrderId = Math.floor(Math.random() * 9000) + 1000;
      toast.success(`✅ Đã gửi đơn #${mockOrderId} đến bếp thành công!`);

      // Cập nhật trạng thái bàn cục bộ (Mock) để user thấy phản hồi trực quan
      set(state => ({
        tables: state.tables.map(t =>
          t.id === selectedTableId ? { ...t, status: 'OCCUPIED' } : t
        ),
        isSendingOrder: false
      }));

      // Reset cart cho bàn này sau khi gửi thành công
      get().clearCart();

      return mockOrderId;
    } catch (err) {
      toast.error('Lỗi kết nối khi gửi đơn');
      set({ isSendingOrder: false });
      return null;
    }
  },

  /**
   * clearCart — Xóa giỏ hàng bàn đang chọn
   */
  clearCart: () => {
    const { selectedTableId, cart } = get();
    if (!selectedTableId) return;

    // eslint-disable-next-line no-unused-vars
    const { [selectedTableId]: _removed, ...remainingCart } = cart;
    set({ cart: remainingCart });
  },

}));

// ─── Selector Helpers ────────────────────────────────────────────────────────
// QUAN TRỌNG: Selector trả về object/array PHẢI dùng stable reference.
// Trả về [] literal mới mỗi lần → Zustand loop vô tận (getSnapshot must be cached).
//
// Pattern chuẩn: dùng constant ngoài store thay vì [] hoặc {} inline.

const EMPTY_CART = Object.freeze([]);

/**
 * Lấy giỏ hàng của bàn đang chọn.
 * Trả về EMPTY_CART (stable ref) khi trống → không gây re-subscribe loop.
 * @param {object} state
 * @returns {Array<OrderItem>}
 */
export const selectCurrentCart = (state) =>
  state.cart[state.selectedTableId] ?? EMPTY_CART;

/**
 * Tính tổng tiền giỏ hàng của bàn đang chọn.
 * @param {object} state
 * @returns {number}
 */
export const selectCartTotal = (state) =>
  (state.cart[state.selectedTableId] ?? [])
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

/**
 * Tính tổng số lượng món trong giỏ hàng của bàn đang chọn.
 * @param {object} state
 * @returns {number}
 */
export const selectCartItemCount = (state) =>
  (state.cart[state.selectedTableId] ?? [])
    .reduce((sum, item) => sum + item.quantity, 0);

/**
 * Lấy bàn đang được chọn.
 * @param {object} state
 * @returns {{ id, tableNumber, capacity, status } | undefined}
 */
export const selectSelectedTable = (state) =>
  state.tables.find(t => t.id === state.selectedTableId);
