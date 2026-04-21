/**
 * useKitchenStore.js — Quản lý luồng Bếp (Kitchen Display System)
 *
 * Kiến trúc:
 *   1. Gọi kitchenServiceApi để lấy dữ liệu từ BE
 *   2. Dùng kitchenMapper để chuẩn hóa dữ liệu
 *   3. Polling 3 giây để cập nhật realtime (chưa có WebSocket)
 *
 * State:
 *   pendingItems         - Danh sách món chờ bếp xử lý (PENDING & PROCESSING)
 *   historyItems         - Danh sách món đã xử lý xong (COMPLETED, CANCELLED)
 *   paidOrderIds         - Tập hợp orderId đã thanh toán (ẩn khỏi cột Sẵn sàng/Hủy)
 *   isLoading            - Đang tải dữ liệu lần đầu
 *   pollingActive        - Polling đang chạy hay không
 *   cookingIds           - Set<orderItemId> — Các món đang trong quá trình gọi API "Bắt đầu nấu"
 *   insufficientStockIds - Map<orderItemId, string> — Các món bị lỗi thiếu nguyên liệu từ BE
 *   menuItems            - Dữ liệu Menu để tra cứu nguyên liệu
 *
 * PRODUCTION UPGRADE (startCookingItem):
 *   - cookingIds: Quản lý loading state từng nút "Nấu" riêng biệt
 *   - 409 Parser: Bóc tách thông báo lỗi thiếu nguyên liệu từ BE
 *   - insufficientStockIds: Lưu danh sách món lỗi để hiển thị Badge đỏ trên KDS
 *   - Retry UX: Cho phép nhấn "Nấu lại" để reset lỗi và thử lại
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import kitchenServiceApi from '../services/api/kitchenServiceApi';
import { mapKitchenItems } from '../services/mapper/kitchenMapper';
import { inventoryApi } from '../api/inventoryApi';
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

  /**
   * Set chứa các orderItemId đang trong quá trình gọi API "Bắt đầu nấu".
   * Tại sao dùng Set thay vì boolean?
   *   boolean: Nếu nhấn "Nấu" món A, toàn bộ nút "Nấu" bị disable (sai UX!)
   *   Set: Chỉ disable đúng nút của món A, các món khác vẫn nhấn được.
   *   Đây là pattern "per-item loading" chuẩn cho danh sách.
   * @type {Set<number>}
   */
  cookingIds: new Set(),

  /**
   * Map các món bị lỗi thiếu nguyên liệu từ Backend (lỗi 409 Conflict).
   * Key = orderItemId, Value = thông tin lỗi (tên nguyên liệu thiếu).
   * Dùng để hiển thị Badge đỏ "Thiếu nguyên liệu" trên thẻ KDS.
   * Khi nhấn "Nấu lại" → entry này sẽ bị xóa (reset để thử lại).
   * @type {Map<number, string>}
   */
  insufficientStockIds: new Map(),

  // --- Inventory State for Ingredient Unit Mapping ---
  inventoryItems: [],
  /** Lookup nhanh: id -> inventoryItem */
  inventoryMap: {},
  isLoadingInventory: false,
  inventoryError: null,
  lastFetchedAt: null,

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

    const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
    set({ isLoading: true });

    try {
      const response = await kitchenServiceApi.getPendingItems(branchId);
      const rawItems = response?.data ?? [];
      const items = mapKitchenItems(rawItems);

      // Anti Flicker: Chỉ set lại state nếu dữ liệu thực sự thay đổi
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
    if (pollingIntervalId) {
      console.warn('[KitchenStore] Polling đã đang chạy, không tạo thêm.');
      return;
    }

    get().fetchPendingOrders();

    pollingIntervalId = setInterval(() => {
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
   */
  completeOrderItem: async (orderItemId) => {
    try {
      await kitchenServiceApi.updateItemStatus(orderItemId, 'COMPLETED');

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
          newHistory = [completedItem, ...state.historyItems].slice(0, HISTORY_LIMIT);
        }

        return {
          pendingItems: remainingPending,
          historyItems: newHistory
        };
      });

      toast.success('✅ Đã hoàn tất món!', { position: 'bottom-center' });
      setTimeout(get().checkTableCompletion, 500);

      return true;
    } catch (err) {
      console.error('[API_ERROR][KITCHEN_COMPLETE]', err);
      const msg = err?.message || 'Không thể hoàn tất món.';
      toast.error(err?.status === 409 ? '❌ Lỗi tồn kho hoặc thiếu công thức!' : `Lỗi: ${msg}`, {
        position: 'bottom-center',
      });
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

      toast.success('Đã hủy món!', { position: 'bottom-center' });
      setTimeout(get().checkTableCompletion, 500);
      return true;
    } catch (err) {
      console.error('[API_ERROR][KITCHEN_CANCEL]', err);
      toast.error('❌ Hủy món thất bại. Vui lòng thử lại!', { position: 'bottom-center' });
      return false;
    }
  },

  /** checkTableCompletion — Kiểm tra xem có bàn nào vừa hoàn tất tất cả món không. */
  checkTableCompletion: () => {
    // Logic sẽ được tích hợp thực tiễn bên trong component nếu cần
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
      pendingItems: state.pendingItems.filter(i => i.orderId !== orderId),
      paidOrderIds: new Set([...state.paidOrderIds, orderId]),
    }));

    console.log(`[KitchenStore] Bàn Order #${orderId} đã thanh toán. Dọn cột luồng bếp, lưu lịch sử.`);
  },

  /**
   * startCookingItem — Bắt đầu nấu một món ăn (PENDING → PROCESSING).
   *
   * ══════════════════════════════════════════════════
   * PRODUCTION FLOW (Nâng cấp):
   * ══════════════════════════════════════════════════
   *
   * Bước 1: Kiểm tra nút đã đang xử lý chưa (chống spam click per-item)
   * Bước 2: Thêm vào cookingIds để disable đúng nút đó
   * Bước 3: Xóa cờ lỗi cũ (nếu đang retry sau lỗi 409)
   * Bước 4: Gọi API BE → BE sẽ trừ kho khi PROCESSING
   * Bước 5: Cập nhật trạng thái local (Optimistic Update)
   *
   * Xử lý lỗi:
   *   409 Conflict: BE báo thiếu nguyên liệu
   *     → Parse message để hiển thị tên nguyên liệu thiếu
   *     → Lưu vào insufficientStockIds để hiển thị Badge đỏ
   *     → Nhấn "Nấu lại" sau đó sẽ gọi retryStartCooking
   *   5xx / Network: Lỗi hệ thống
   *     → Hiển thị lỗi chung
   *     → Không lưu vào insufficientStockIds (không phải lỗi nghiệp vụ)
   *
   * @param {number} orderItemId - ID của món ăn cần bắt đầu nấu
   * @returns {Promise<boolean>}
   */
  startCookingItem: async (orderItemId) => {
    // ── Bước 1: Chống spam click per-item ──────────────────────────────────
    // Tại sao dùng cookingIds (Set) thay vì 1 biến boolean duy nhất?
    // Vì KDS cần cho phép bắt đầu nấu nhiều món cùng lúc (chỉ không cho nhấn 2 lần cùng 1 món).
    if (get().cookingIds.has(orderItemId)) {
      console.log(`[KITCHEN_COOK] Món #${orderItemId} đang được xử lý, bỏ qua click thừa.`);
      return false;
    }

    // ── Bước 2: Thêm vào cookingIds (disable nút này) ──────────────────────
    set(state => {
      const newCookingIds = new Set(state.cookingIds);
      newCookingIds.add(orderItemId);
      return { cookingIds: newCookingIds };
    });

    // ── Bước 3: Xóa cờ lỗi cũ (chuẩn bị cho retry) ──────────────────────
    // Khi nhân viên nhấn "Nấu lại" sau lỗi, xóa badge đỏ để UX clean hơn
    set(state => {
      const newInsufficient = new Map(state.insufficientStockIds);
      newInsufficient.delete(orderItemId);
      return { insufficientStockIds: newInsufficient };
    });

    try {
      // ── Bước 4: Gọi API ──────────────────────────────────────────────────
      await kitchenServiceApi.updateItemStatus(orderItemId, 'PROCESSING');

      // ── Bước 5: Cập nhật trạng thái local (Optimistic Update) ───────────
      // Không cần chờ polling cập nhật, đổi ngay trong local state để UX mau hơn
      set(state => ({
        pendingItems: state.pendingItems.map(item =>
          item.id === orderItemId ? { ...item, status: 'PROCESSING' } : item
        ),
      }));

      return true;

    } catch (err) {
      const status = err?.status;
      const rawMessage = err?.message ?? 'Lỗi không xác định';

      if (status === 409) {
        // ── Xử lý lỗi 409: Thiếu nguyên liệu từ BE ──────────────────────
        // BE trả về message dạng: "Insufficient stock for: Thịt bò (need 200g, have 50g)"
        // hoặc format tiếng Việt tùy cách BE cấu hình.
        // Chúng ta parse để hiển thị đúng thông tin thay vì raw message.
        const parsedMessage = parseKitchen409Message(rawMessage);

        // Lưu vào Map để KitchenItemCard hiển thị Badge đỏ
        set(state => {
          const newInsufficient = new Map(state.insufficientStockIds);
          newInsufficient.set(orderItemId, parsedMessage);
          return { insufficientStockIds: newInsufficient };
        });

        toast.error(
          `🚫 Không đủ nguyên liệu!\n${parsedMessage}`,
          {
            duration: 6000,
            position: 'bottom-center',
            style: {
              background: '#fff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              fontWeight: '600',
              whiteSpace: 'pre-line',
              maxWidth: '400px',
            },
            icon: '🚫',
          }
        );

        console.error('[API_ERROR][KITCHEN_START][409] Thiếu nguyên liệu khi bắt đầu nấu:', {
          orderItemId, message: rawMessage,
        });

      } else if (!status) {
        // Lỗi mạng (không có status code)
        toast.error('🌐 Mất kết nối. Vui lòng kiểm tra mạng và thử lại!', {
          position: 'bottom-center',
        });
        console.error('[API_ERROR][KITCHEN_START][NETWORK]', { orderItemId, message: rawMessage });

      } else {
        // Lỗi server 5xx hoặc lỗi khác
        toast.error(`Không thể bắt đầu nấu: ${rawMessage}`, { position: 'bottom-center' });
        console.error('[API_ERROR][KITCHEN_START][SERVER]', {
          orderItemId, status, message: rawMessage,
        });
      }

      return false;

    } finally {
      // Luôn xóa khỏi cookingIds khi xong (dù thành công hay thất bại)
      // Tại sao để trong finally? Đảm bảo nút luôn được re-enable, không bao giờ bị "kẹt"
      set(state => {
        const newCookingIds = new Set(state.cookingIds);
        newCookingIds.delete(orderItemId);
        return { cookingIds: newCookingIds };
      });
    }
  },

  /**
   * retryStartCooking — Thử lại "Bắt đầu nấu" sau khi gặp lỗi (409 hoặc network).
   *
   * Flow:
   *   1. Xóa trạng thái lỗi cũ của món này
   *   2. Gọi lại startCookingItem
   *
   * Tại sao có hàm riêng thay vì dùng thẳng startCookingItem?
   *   Để UI có thể phân biệt "Nấu lần đầu" vs "Nấu lại sau lỗi" → hiệu ứng/animation khác nhau.
   *   Ngoài ra, khi retry, có thể thêm logic như "làm mới cache inventory" sau này.
   *
   * @param {number} orderItemId
   * @returns {Promise<boolean>}
   */
  retryStartCooking: async (orderItemId) => {
    console.log(`[KITCHEN_COOK] Retry nấu món #${orderItemId}`);

    // Xóa trạng thái lỗi để badge đỏ biến mất ngay khi nhấn Retry
    set(state => {
      const newInsufficient = new Map(state.insufficientStockIds);
      newInsufficient.delete(orderItemId);
      return { insufficientStockIds: newInsufficient };
    });

    // Gọi lại logic nấu bình thường
    return get().startCookingItem(orderItemId);
  },

  /**
   * fetchInventoryItems — Tải toàn bộ inventory để map đơn vị nguyên liệu.
   * Sử dụng O(1) lookup map và logic cache 5 phút để tối ưu performance.
   * THIẾT KẾ: FE-ONLY UPGRADE - Lấy nguồn DB để hiện đúng đơn vị.
   */
  fetchInventoryItems: async () => {
    try {
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000; // 5 phút

      const { inventoryItems, lastFetchedAt } = get();

      // Chỉ fetch nếu chưa có data hoặc cache đã hết hạn
      if (inventoryItems.length > 0 && lastFetchedAt && (now - lastFetchedAt < CACHE_TTL)) {
        console.log('[KITCHEN_APP] Sử dụng inventory cache (TTL: 5m)');
        return;
      }

      set({ isLoadingInventory: true, inventoryError: null });
      console.log('[KITCHEN_APP] Bắt đầu tải inventory dữ liệu nguồn...');

      // Lấy danh sách nguyên liệu (max 1000 để bao phủ toàn bộ menu)
      const res = await inventoryApi.getInventoryItems({
        page: 0,
        size: 1000,
      });

      const items = res?.data?.content || [];

      /**
       * Tạo lookup map O(1) để tránh duyệt mảng khi render danh sách món
       * key = ingredientId (string), value = inventoryItem object
       */
      const map = {};
      items.forEach((item) => {
        const id = item.inventoryId || item.id;
        if (id) {
          map[String(id)] = item;
        }
      });

      set({
        inventoryItems: items,
        inventoryMap: map,
        isLoadingInventory: false,
        lastFetchedAt: now,
      });

      console.log(`[KITCHEN_APP] Đã tải ${items.length} nguyên liệu, map O(1) sẵn sàng.`);

    } catch (error) {
      console.error('[API_ERROR][KITCHEN_INVENTORY] Lỗi tải inventory:', error);
      set({
        isLoadingInventory: false,
        inventoryError: error?.message || 'Không thể tải dữ liệu kho',
      });
    }
  },

}));

// ─── Helper Functions (Dùng ngoài store) ─────────────────────────────────────

/**
 * parseKitchen409Message — Phân tích message lỗi 409 từ Backend thành text dễ đọc.
 *
 * BE có thể trả về message với nhiều format khác nhau tùy version.
 * Hàm này cố gắng trích xuất thông tin quan trọng nhất.
 *
 * Ví dụ input từ BE: "Insufficient stock for ingredient: Thịt bò. Need: 200, have: 50"
 * Output mong muốn: "Thịt bò: cần 200, còn 50"
 *
 * @param {string} rawMessage - Message gốc từ BE error response
 * @returns {string} - Message đã được làm sạch và dễ đọc
 */
function parseKitchen409Message(rawMessage) {
  if (!rawMessage) return 'Kiểm tra kho nguyên liệu để biết thêm chi tiết.';

  // Thử tìm pattern "Insufficient stock for ingredient: X"
  // BE Java thường trả về format này từ ConflictException
  const ingredientMatch = rawMessage.match(/ingredient[:\s]+([^.]+)/i);
  if (ingredientMatch) {
    const ingredientPart = ingredientMatch[1].trim();
    return `Thiếu nguyên liệu: ${ingredientPart}`;
  }

  // Thử tìm pattern tiếng Việt "Không đủ nguyên liệu: X"
  const viMatch = rawMessage.match(/nguyên liệu[:\s]+([^.]+)/i);
  if (viMatch) {
    return `Thiếu: ${viMatch[1].trim()}`;
  }

  // Pattern "Need: X, have: Y"
  const needHaveMatch = rawMessage.match(/need[:\s]+([\d.]+)[^\d]+([\d.]+)/i);
  if (needHaveMatch) {
    return `Cần ${needHaveMatch[1]}, chỉ còn ${needHaveMatch[2]}`;
  }

  // Fallback: Hiển thị message gốc nhưng giới hạn độ dài để không tràn UI
  const maxLength = 200;
  return rawMessage.length > maxLength
    ? `${rawMessage.substring(0, maxLength)}...`
    : rawMessage;
}

export default useKitchenStore;
