/**
 * useCartStore.js — Quản lý giỏ hàng chưa gửi bếp (Draft Items)
 *
 * Kiến trúc:
 *   Store này quản lý các món khách vừa chọn nhưng CHƯA gửi đến bếp.
 *   Khi nhấn "Gửi bếp" → gọi BE → BE xử lý → draft được xóa.
 *
 * PRODUCTION UPGRADE (Stock Check):
 *   Trước khi gọi API gửi bếp, hệ thống sẽ kiểm tra sơ bộ (pre-check) tồn kho.
 *   FE chỉ là lớp kiểm tra "sớm" để cải thiện UX — Backend vẫn là source of truth!
 *   Nếu module kho gặp sự cố → hệ thống sẽ cảnh báo nhưng VẪN cho gửi bếp (Graceful Fallback)
 *   vì ưu tiên số 1 là không làm đứng vận hành của nhà hàng.
 *
 * State:
 *   draftItems          - Map<tableId, CartItem[]> — Món chưa gửi bếp
 *   isSending           - Đang gọi API gửi bếp hay không
 *   isCheckingStock     - Đang chạy bước kiểm tra tồn kho hay không
 *   insufficientItems   - Map<menuItemId, { name, shortages }> — Món thiếu nguyên liệu
 *   inventoryCache      - { data, timestamp } — Cache tồn kho (TTL 30s)
 *   lastInventoryRequestId - ID của request tồn kho gần nhất (để chống stale response)
 *
 * Flow gửi bếp (Production-Grade):
 *   1. Validate cơ bản (chọn bàn? giỏ hàng trống?)
 *   2. Kiểm tra cache tồn kho (nếu còn hạn 30s → dùng cache, không gọi lại API)
 *   3. Nếu hết hạn → gọi API Inventory với Retry 1 lần + AbortController
 *   4. Stale Guard: chỉ xử lý kết quả nếu requestId còn khớp
 *   5. Tính toán nguyên liệu cần + so sánh với tồn kho
 *   6. Nếu thiếu → block + thông báo chi tiết
 *   7. Nếu đủ hoặc không kiểm tra được → gọi API gửi bếp
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import orderApi from '../services/api/orderApi';
import { mapOrder } from '../services/mapper/orderMapper';
import { useOrderStore } from './useOrderStore';
import { useAuthStore } from './useAuthStore';

// ─── Hằng số ──────────────────────────────────────────────────────────────────

/** TTL Cache tồn kho: 30 giây.
 *  Tại sao 30s? Trong môi trường Multi-POS, tồn kho thay đổi liên tục.
 *  30s là khoảng thời gian đủ ngắn để dữ liệu không quá cũ,
 *  nhưng đủ dài để tránh spam API khi nhân viên thêm nhiều món nhanh. */
const INVENTORY_CACHE_TTL_MS = 30_000;

/** Timeout cho request kiểm tra tồn kho: 4 giây.
 *  Tại sao cần timeout? Nếu server kho bị treo, chúng ta không muốn
 *  bắt nhân viên chờ vô tận. Sau 4s sẽ tự chuyển sang Graceful Fallback. */
const INVENTORY_REQUEST_TIMEOUT_MS = 4_000;

/** Số lần retry khi lỗi mạng hay timeout (KHÔNG retry khi lỗi 4xx/5xx) */
const INVENTORY_MAX_RETRY = 1;

/** Giá trị epsilon để so sánh số thực.
 *  Tại sao cần epsilon? JavaScript có vấn đề float: 0.1 + 0.2 = 0.30000000000000004
 *  Khi tính nguyên liệu (ví dụ 0.5kg + 0.1kg), nếu so sánh thẳng sẽ sai.
 *  Dùng EPSILON để chấp nhận sai số nhỏ hơn 0.001 là "bằng nhau". */
const FLOAT_EPSILON = 0.001;

// ─── Helper Functions (Thuần túy, không phụ thuộc store) ─────────────────────

/**
 * calculateRequiredIngredients — Tính tổng nguyên liệu cần cho toàn bộ giỏ hàng.
 *
 * Tại sao tách ra hàm riêng?
 *   - Dễ test độc lập (unit test)
 *   - Dễ debug khi có lỗi logic
 *   - Tái sử dụng ở nơi khác nếu cần
 *
 * @param {Array} cartItems   - Danh sách món trong giỏ [{menuItemId, quantity, name}]
 * @param {Array} menuItems   - Danh sách menu items đầy đủ (chứa recipes từ BE)
 * @returns {Map<ingredientId, { name, unit, totalRequired }>} - Tổng nhu cầu nguyên liệu
 */
export function calculateRequiredIngredients(cartItems, menuItems) {
  // Tạo lookup table để tìm menuItem nhanh theo ID
  // Tại sao dùng Map? O(1) lookup thay vì O(n) find mỗi vòng lặp
  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  // Map kết quả: ingredientId → tổng số lượng cần
  const required = new Map();

  for (const cartItem of cartItems) {
    const menuItem = menuItemMap.get(cartItem.menuItemId);

    // Edge case: Món không tìm thấy trong menu (dữ liệu lỗi hoặc đã bị xóa)
    if (!menuItem) {
      console.warn(
        `[STOCK_CHECK] Không tìm thấy menuItem #${cartItem.menuItemId} (${cartItem.name}) trong menu. Bỏ qua item này.`
      );
      continue; // Không crash, bỏ qua và tiếp tục
    }

    // Edge case: Món không có recipe (chưa được cấu hình công thức)
    if (!menuItem.recipes || menuItem.recipes.length === 0) {
      console.warn(
        `[STOCK_CHECK] Món "${menuItem.name}" chưa có công thức nguyên liệu (recipe). Bỏ qua item này.`
      );
      continue; // Không crash, bỏ qua — BE sẽ là người xử lý cuối cùng
    }

    for (const recipe of menuItem.recipes) {
      const ingredientId = recipe.ingredientId;
      if (ingredientId == null) continue; // Bỏ qua recipe thiếu data

      // Tính số lượng cần: số lượng trong recipe × số lượng món đặt
      // Tại sao dùng Math.round + FLOAT_EPSILON? Tránh sai số float tích lũy
      const needed = recipe.quantity * cartItem.quantity;

      if (required.has(ingredientId)) {
        const current = required.get(ingredientId);
        // Cộng dồn và làm tròn để tránh sai số float
        required.set(ingredientId, {
          ...current,
          totalRequired: roundToThreeDecimals(current.totalRequired + needed),
        });
      } else {
        required.set(ingredientId, {
          name: recipe.ingredientName || `Nguyên liệu #${ingredientId}`,
          unit: recipe.unit || '',
          totalRequired: roundToThreeDecimals(needed),
        });
      }
    }
  }

  return required;
}

/**
 * roundToThreeDecimals — Làm tròn số thực đến 3 chữ số thập phân.
 *
 * Tại sao cần hàm này?
 *   JavaScript: 0.1 + 0.2 = 0.30000000000000004
 *   Ví dụ nguyên liệu: 0.5 kg bột + 0.1 kg bột = 0.6000000000000001 kg ← SAI!
 *   Sau khi làm tròn 3 chữ số: 0.600 ← ĐÚNG
 *   3 chữ số đủ để xử lý 99% nghiệp vụ nhà hàng (gram → kg).
 */
function roundToThreeDecimals(num) {
  return Math.round(num * 1000) / 1000;
}

/**
 * checkStockAvailability — So sánh nguyên liệu cần với tồn kho thực tế.
 *
 * Hàm này trả về danh sách nguyên liệu thiếu (nếu có).
 * Nếu trả về mảng rỗng → đủ hàng.
 *
 * @param {Map} required  - Kết quả từ calculateRequiredIngredients
 * @param {Array} inventory - Danh sách tồn kho từ API [{ingredientId, quantity, ingredientName}]
 * @returns {Array<{ingredientId, name, unit, needed, inStock, shortage}>}
 */
export function checkStockAvailability(required, inventory) {
  // Tạo lookup table tồn kho theo ingredientId
  const stockMap = new Map();
  for (const inv of (inventory || [])) {
    // BE dùng inv.ingredient.id hoặc inv.ingredientId — xử lý cả hai trường hợp
    const id = inv.ingredientId ?? inv.ingredient?.id;
    if (id != null) {
      stockMap.set(id, {
        quantity: inv.quantity ?? 0,
        name: inv.ingredientName ?? inv.ingredient?.name ?? `Nguyên liệu #${id}`,
      });
    }
  }

  const shortages = [];

  for (const [ingredientId, info] of required.entries()) {
    const stock = stockMap.get(ingredientId);
    const inStock = stock?.quantity ?? 0;
    const needed = info.totalRequired;

    // So sánh có xét FLOAT_EPSILON để tránh lỗi: cần 1.000 nhưng có 0.999999 → false alarm
    // Tại sao dùng epsilon thay vì >= ? Vì inStock - needed < -EPSILON mới thực sự thiếu.
    if (inStock - needed < -FLOAT_EPSILON) {
      shortages.push({
        ingredientId,
        name: stock?.name || info.name,
        unit: info.unit,
        needed: roundToThreeDecimals(needed),
        inStock: roundToThreeDecimals(inStock),
        shortage: roundToThreeDecimals(needed - inStock),
      });
    }
  }

  return shortages; // Mảng rỗng = đủ hàng, có phần tử = thiếu
}

/**
 * formatStockErrorMessage — Tạo nội dung thông báo lỗi tồn kho dễ đọc.
 *
 * @param {Array} shortages - Kết quả từ checkStockAvailability
 * @returns {string}
 */
export function formatStockErrorMessage(shortages) {
  if (!shortages || shortages.length === 0) return '';

  const lines = shortages.map(s => {
    const unit = s.unit ? ` ${s.unit}` : '';
    return `• ${s.name}: cần ${s.needed}${unit}, còn ${s.inStock}${unit} (thiếu ${s.shortage}${unit})`;
  });

  return `Không đủ nguyên liệu:\n${lines.join('\n')}`;
}

// ─── Inventory Request Manager (Singleton, outside store) ─────────────────────
// Tại sao để ngoài store? AbortController không serialize được qua Zustand state.
// Đây là object quản lý request hiện tại dùng module scope (singleton).

/** AbortController của request inventory đang chạy.
 *  Tại sao cần AbortController?
 *  Nếu nhân viên nhấn "Gửi bếp" liên tiếp rất nhanh, request cũ sẽ bị hủy (abort)
 *  trước khi hoàn thành, tránh trường hợp response cũ trả về sau response mới. */
let currentInventoryAbortController = null;

// ─── Zustand Store ────────────────────────────────────────────────────────────

export const useCartStore = create((set, get) => ({

  // ─── State ────────────────────────────────────────────────────────────────

  /**
   * Draft items chưa gửi bếp, phân theo tableId.
   * @type {Record<number, CartItem[]>}
   */
  draftItems: {},

  /** Đang gọi API gửi bếp hay không — dùng để disable button */
  isSending: false,

  /**
   * Đang chạy bước kiểm tra tồn kho hay không.
   * Tách biệt với isSending để UI hiển thị đúng: "Đang kiểm tra kho..." vs "Đang gửi..."
   */
  isCheckingStock: false,

  /**
   * Map các món hiện đang thiếu nguyên liệu trong giỏ hàng.
   * Key là menuItemId, value là danh sách shortage.
   * Dùng để highlight màu đỏ trên UI giỏ hàng.
   * @type {Record<number, Array>}
   */
  insufficientItems: {},

  /**
   * Cache tồn kho in-memory với timestamp.
   * Tại sao cần cache?
   *   - Mỗi lần nhấn "Gửi bếp" không cần gọi lại API nếu data vừa lấy < 30s trước
   *   - Giảm tải server và tăng tốc response cho nhân viên
   *   - Trong môi trường Multi-POS, cache nhỏ thôi (30s) để tránh dùng dữ liệu quá cũ
   * @type {{ data: Array|null, timestamp: number }}
   */
  inventoryCache: { data: null, timestamp: 0 },

  /**
   * ID của request inventory gần nhất (dạng timestamp ms).
   * Tại sao cần requestId?
   *   Trong Multi-POS hoặc mạng chậm, một request cũ có thể trả về SAU request mới.
   *   Nếu không có guard này, dữ liệu cũ sẽ ghi đè dữ liệu mới → sai logic!
   *   Khi nhận response, so sánh requestId: nếu không khớp → bỏ qua response đó.
   * @type {number}
   */
  lastInventoryRequestId: 0,

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * addItem — Thêm một món vào giỏ hàng của bàn.
   * Nếu món đã có → tăng số lượng.
   * Nếu chưa có → thêm mới với quantity = 1.
   *
   * Khi thêm món mới → xóa cờ thiếu hàng của món đó (nếu có)
   * vì người dùng đã chủ động thêm lại, cần check lại khi gửi bếp.
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

    // Chặn nếu bàn TRỐNG VÀ chưa được chọn (chưa mở bàn)
    // KHÔNG chặn bàn RESERVED — khách đã check-in, nhân viên được phép thêm món
    // BE sẽ tự chuyển RESERVED → OCCUPIED khi order đầu tiên được tạo
    if (table && table.status === 'AVAILABLE' && tableState.selectedTableId !== tableId) {
      toast.error('⚠️ Hãy mở bàn để chọn món!');
      return;
    }
    // Chặn các trạng thái không hợp lệ (CLEANING, MERGED, v.v.)
    if (table && !['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(table.status)) {
      toast.error('⚠️ Bàn này hiện không thể gọi món!');
      return;
    }


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
            categoryType: menuItem.categoryType || 'KITCHEN',
          },
        ];
      }

      // Khi thêm/thay đổi món → reset cờ thiếu nguyên liệu cho món này
      // Lý do: người dùng có thể đã thay đổi quantity, cần check lại khi gửi bếp
      const updatedInsufficient = { ...state.insufficientItems };
      delete updatedInsufficient[menuItem.id];

      return {
        draftItems: { ...state.draftItems, [tableId]: updatedCart },
        insufficientItems: updatedInsufficient,
      };
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

      // Reset cờ thiếu hàng khi quantity thay đổi — phải check lại khi gửi bếp
      const updatedInsufficient = { ...state.insufficientItems };
      delete updatedInsufficient[menuItemId];

      return {
        draftItems: { ...state.draftItems, [tableId]: updatedCart },
        insufficientItems: updatedInsufficient,
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
      // Cũng xóa data thiếu hàng vì giỏ hàng đã được clear
      return { draftItems: rest, insufficientItems: {} };
    });
  },

  /**
   * mergeDraftItems — Gộp giỏ hàng từ bàn nguồn sang bàn đích.
   * ❗ CASE: Khi gộp bàn ảo, món chưa gửi bếp cũng phải được gom về bàn chính.
   * Logic: Nếu trùng menuItemId và note -> cộng dồn số lượng.
   * 
   * @param {number} sourceTableId - Bàn con bị gộp
   * @param {number} targetTableId - Bàn chính nhận món
   */
  mergeDraftItems: (sourceTableId, targetTableId) => {
    const state = get();
    const sourceItems = state.draftItems[sourceTableId] || [];
    if (sourceItems.length === 0) return;

    set(state => {
      const targetItems = [...(state.draftItems[targetTableId] || [])];

      sourceItems.forEach(sItem => {
        // Tìm món tương đương ở bàn đích (cùng ID món và cùng ghi chú)
        const existIdx = targetItems.findIndex(tItem => 
          tItem.menuItemId === sItem.menuItemId && 
          (tItem.note || '').trim() === (sItem.note || '').trim()
        );

        if (existIdx !== -1) {
          // Nếu trùng -> Cộng dồn số lượng
          targetItems[existIdx] = {
            ...targetItems[existIdx],
            quantity: targetItems[existIdx].quantity + sItem.quantity
          };
        } else {
          // Nếu mới -> Thêm vào mảng
          targetItems.push({ ...sItem });
        }
      });

      // Cập nhật giỏ hàng bàn đích và XÓA giỏ hàng bàn nguồn
      const newDraftItems = { ...state.draftItems };
      newDraftItems[targetTableId] = targetItems;
      delete newDraftItems[sourceTableId];

      console.log(`[CartStore] Đã gộp ${sourceItems.length} món từ bàn ${sourceTableId} sang ${targetTableId}`);
      return { draftItems: newDraftItems };
    });
  },

  /**
   * invalidateInventoryCache — Reset cache tồn kho.
   * Dùng khi biết chắc dữ liệu kho đã thay đổi (ví dụ: sau khi thêm stock thành công).
   */
  invalidateInventoryCache: () => {
    set({ inventoryCache: { data: null, timestamp: 0 } });
    console.log('[CART_STOCK] Cache tồn kho đã được reset.');
  },

  // ─── Private Helpers (Hàm nội bộ của store) ─────────────────────────────

  /**
   * _fetchInventoryWithCache — Lấy dữ liệu tồn kho với cơ chế Cache + Retry.
   *
   * Flow:
   *   1. Kiểm tra cache: nếu còn hạn (< 30s) → dùng cache, không gọi API
   *   2. Nếu hết hạn/trống → cancel request cũ, gọi API mới
   *   3. Nếu lỗi mạng/timeout → retry 1 lần (silent)
   *   4. Nếu vẫn fail → trả về null (FE sẽ xử lý Graceful Fallback)
   *   5. KHÔNG retry khi lỗi 4xx/5xx (lỗi từ server, retry vô nghĩa)
   *
   * @param {number} branchId
   * @param {number} requestId - ID của request này để so sánh khi có response
   * @returns {Promise<Array|null>} - Mảng inventory hoặc null nếu lỗi
   */
  _fetchInventoryWithCache: async (branchId, requestId) => {
    const state = get();
    const now = Date.now();
    const { inventoryCache } = state;

    // === BƯỚC 1: Kiểm tra Cache ===
    const isCacheValid = inventoryCache.data !== null
      && (now - inventoryCache.timestamp) < INVENTORY_CACHE_TTL_MS;

    if (isCacheValid) {
      console.log(`[CART_STOCK] Dùng cache tồn kho (còn hạn ${Math.round((INVENTORY_CACHE_TTL_MS - (now - inventoryCache.timestamp)) / 1000)}s).`);
      return inventoryCache.data;
    }

    // === BƯỚC 2: Cancel request cũ (nếu có) ===
    // Tại sao cancel? Nếu nhân viên nhấn Gửi bếp nhiều lần nhanh, request cũ
    // vẫn đang chạy sẽ bị hủy để nhường chỗ cho request mới hơn.
    if (currentInventoryAbortController) {
      console.log('[CART_STOCK] Hủy request tồn kho cũ đang chạy.');
      currentInventoryAbortController.abort();
    }
    currentInventoryAbortController = new AbortController();
    const { signal } = currentInventoryAbortController;

    // === BƯỚC 3: Gọi API với Retry Logic ===
    const { inventoryApi } = await import('../api/inventoryApi');

    for (let attempt = 0; attempt <= INVENTORY_MAX_RETRY; attempt++) {
      // === STALE GUARD: Kiểm tra requestId trước khi gọi API ===
      // Nếu requestId không còn là request mới nhất → dừng ngay
      if (get().lastInventoryRequestId !== requestId) {
        console.log(`[CART_STOCK] Request #${requestId} đã bị thay thế bởi request mới hơn. Dừng.`);
        return null;
      }

      try {
        // Tạo timeout race: nếu API mất hơn 4s → ném lỗi timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('INVENTORY_TIMEOUT')), INVENTORY_REQUEST_TIMEOUT_MS)
        );

        const apiPromise = inventoryApi.getInventoryItems({ branchId, size: 500 });

        // Race between API response và timeout
        const response = await Promise.race([apiPromise, timeoutPromise]);

        // Bắt được lỗi abort từ AbortController
        if (signal.aborted) {
          console.log('[CART_STOCK] Request bị hủy bởi AbortController.');
          return null;
        }

        const data = response?.data?.content || response?.data || [];

        // === Cập nhật Cache khi thành công ===
        set({ inventoryCache: { data, timestamp: Date.now() } });
        console.log(`[CART_STOCK] Fetch tồn kho thành công. ${data.length} items. Cache mới được lưu.`);

        currentInventoryAbortController = null;
        return data;

      } catch (err) {
        // Nếu request bị abort → không retry
        if (err?.isCancelled || signal.aborted) return null;

        const isTimeout = err?.message === 'INVENTORY_TIMEOUT';
        const isNetworkError = !err?.status; // Lỗi mạng thường không có status code

        // Chỉ retry với lỗi mạng hoặc timeout (không retry 4xx/5xx)
        const shouldRetry = (isTimeout || isNetworkError) && attempt < INVENTORY_MAX_RETRY;

        if (shouldRetry) {
          console.warn(`[CART_STOCK] Lỗi fetch tồn kho (lần ${attempt + 1}). Thử lại...`, err?.message || err);
          continue; // Thử lại vòng lặp
        }

        // Ghi log chi tiết để debug dễ hơn
        const errType = isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK' : `HTTP_${err?.status || 'UNKNOWN'}`;
        console.error(`[CART_STOCK][${errType}] Fetch tồn kho thất bại (attempt ${attempt + 1}/${INVENTORY_MAX_RETRY + 1}):`, {
          message: err?.message,
          status: err?.status,
          branchId,
        });

        currentInventoryAbortController = null;
        return null; // Trả về null để FE kích hoạt Graceful Fallback
      }
    }

    return null;
  },

  /**
   * sendToKitchen — Gửi các món trong giỏ lên bếp.
   *
   * ══════════════════════════════════════════════════
   * PRODUCTION FLOW (7 bước):
   * ══════════════════════════════════════════════════
   *
   * Bước 1: Validate cơ bản (bàn, giỏ hàng, chống double-click)
   * Bước 2: Tạo RequestID + disable UI
   * Bước 3: Lấy inventory (cache hoặc API)
   * Bước 4: Stale Guard — kiểm tra requestId còn hợp lệ không
   * Bước 5: Tính nguyên liệu cần + so sánh tồn kho
   * Bước 6: Xử lý kết quả (block nếu thiếu, fallback nếu lỗi API)
   * Bước 7: Gọi API gửi bếp + cập nhật store
   *
   * @param {{ tableId: number, bypassKitchen?: boolean }} payload
   * @returns {Promise<boolean>}
   */
  sendToKitchen: async ({ tableId, bypassKitchen = false }) => {
    const { draftItems, isSending, isCheckingStock } = get();
    const items = draftItems[tableId] ?? [];

    // ── Bước 1: Validate cơ bản ──────────────────────────────────────────
    // Chống race condition: không cho 2 request chạy cùng lúc
    if (isSending || isCheckingStock) {
      console.log('[CART] Đang xử lý, bỏ qua click thừa.');
      return false;
    }

    if (!tableId) {
      toast.error('Vui lòng chọn bàn!');
      return false;
    }
    if (items.length === 0) {
      toast.error('Giỏ hàng trống, không có gì để gửi bếp!');
      return false;
    }

    // ── Bước 2: Tạo RequestID + disable UI ──────────────────────────────
    // RequestID = timestamp hiện tại (ms). Đủ độ chính xác cho multi-device.
    // Tại sao dùng timestamp? Đơn giản, không cần thư viện, luôn tăng dần.
    const requestId = Date.now();
    set({
      isCheckingStock: true,
      lastInventoryRequestId: requestId,
      // Reset cờ thiếu hàng cũ để UI không hiển thị lỗi cũ
      insufficientItems: {},
    });

    // ── Bước 3: Lấy dữ liệu tồn kho ─────────────────────────────────────
    const branchId = useAuthStore.getState()?.user?.branchId ?? 1;
    let inventoryData = null;
    let inventoryFailed = false;

    try {
      inventoryData = await get()._fetchInventoryWithCache(branchId, requestId);
      if (inventoryData === null) {
        inventoryFailed = true;
      }
    } catch (err) {
      inventoryFailed = true;
      console.error('[CART_STOCK] Lỗi không mong đợi khi fetch inventory:', err);
    }

    // ── Bước 4: Stale Guard ───────────────────────────────────────────────
    // Kiểm tra lần cuối: nếu có request mới hơn được tạo ra trong lúc chờ API
    // (ví dụ user nhấn lại rất nhanh) → requestId không còn khớp → hủy
    if (get().lastInventoryRequestId !== requestId) {
      console.log(`[CART_STOCK] Stale Guard kích hoạt: Request #${requestId} bị bỏ qua (request mới hơn đang chạy).`);
      set({ isCheckingStock: false });
      return false;
    }

    // ── Bước 5 & 6: Kiểm tra tồn kho & Xử lý kết quả ────────────────────
    if (inventoryFailed || !inventoryData) {
      // === GRACEFUL FALLBACK ===
      // Tại sao vẫn cho gửi khi API kho fail?
      //   Nhà hàng không thể dừng phục vụ chỉ vì module kho gặp sự cố.
      //   Backend vẫn sẽ xử lý và validate lại — FE chỉ là lớp "sớm".
      //   Ưu tiên Business Continuity (không đứng vận hành) > Accuracy.
      console.warn('[CART_STOCK] Không thể kiểm tra tồn kho. Chuyển sang Graceful Fallback.');
      toast('⚠️ Không thể kiểm tra kho nguyên liệu. Đơn hàng vẫn được gửi đi.', {
        icon: '⚠️',
        style: { background: '#fef3c7', color: '#92400e', fontWeight: 'bold' },
        duration: 4000,
        position: 'bottom-center',
      });
      set({ isCheckingStock: false });
      // Tiếp tục flow → gọi API gửi bếp bên dưới

    } else {
      // === CÓ DỮ LIỆU TỒN KHO → KIỂM TRA ===

      // Lấy menu items từ usePosStore để tra cứu công thức (recipe)
      const { usePosStore } = await import('./usePosStore');
      const menuItems = usePosStore.getState().menuItems;

      // Bước 5a: Tính toán nguyên liệu cần
      const required = calculateRequiredIngredients(items, menuItems);

      // Bước 5b: So sánh với tồn kho
      const shortages = checkStockAvailability(required, inventoryData);

      set({ isCheckingStock: false });

      if (shortages.length > 0) {
        // === CÓ THIẾU NGUYÊN LIỆU → BLOCK ===

        // Tìm các món trong giỏ bị ảnh hưởng bởi shortage
        // Mục đích: highlight màu đỏ đúng món, không highlight hết giỏ hàng
        const shortageIngredientIds = new Set(shortages.map(s => s.ingredientId));
        const insufficientMenuItemIds = {};

        for (const cartItem of items) {
          const menuItem = menuItems.find(m => m.id === cartItem.menuItemId);
          if (!menuItem?.recipes) continue;

          const hasShortage = menuItem.recipes.some(r => shortageIngredientIds.has(r.ingredientId));
          if (hasShortage) {
            // Lưu danh sách shortage liên quan đến món này
            insufficientMenuItemIds[cartItem.menuItemId] = shortages.filter(s =>
              menuItem.recipes.some(r => r.ingredientId === s.ingredientId)
            );
          }
        }

        set({ insufficientItems: insufficientMenuItemIds });

        // Hiển thị toast lỗi với format dễ đọc
        const errorMsg = formatStockErrorMessage(shortages);
        toast.error(errorMsg, {
          duration: 6000,
          position: 'bottom-center',
          style: {
            background: '#fff',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            fontWeight: '600',
            whiteSpace: 'pre-line', // Cho phép xuống dòng trong toast
            maxWidth: '420px',
          },
          icon: '🚫',
        });

        console.log('[CART_STOCK] Gửi bếp bị chặn vì thiếu nguyên liệu:', shortages);
        return false; // ← Không gọi API gửi bếp
      }

      console.log('[CART_STOCK] ✅ Đủ nguyên liệu. Tiếp tục gửi bếp.');
    }

    // ── Bước 7: Gọi API gửi bếp ──────────────────────────────────────────
    set({ isSending: true, isCheckingStock: false });

    try {
      // Re-validate trạng thái bàn phòng hờ (chống Race Condition giữa nhiều POS)
      const { useTableStore } = await import('./useTableStore');
      const { tableApi } = await import('../services/api/tableApi');
      const tableCheckRes = await tableApi.getTables(branchId);
      const latestTable = tableCheckRes?.data?.find(t => t.id === tableId);

      if (latestTable && !['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(latestTable.status)) {
        toast.error('Bàn hiện không thể gọi món (Trạng thái đã thay đổi)!', { position: 'bottom-center' });
        await useTableStore.getState().fetchTables(branchId);
        set({ isSending: false });
        return false;
      }


      // Chuyển đổi CartItem sang format BE yêu cầu
      const beItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note || null,
      }));

      // Gọi API: POST /api/v1/orders
      const response = await orderApi.createOrAppendOrder({
        tableId,
        branchId,
        items: beItems,
      });

      if (bypassKitchen) {
        console.warn('[CartStore] bypassKitchen=true nhưng BE chưa hỗ trợ. Đang xử lý như normal flow.');
      }

      // Map và lưu order vừa nhận được từ BE
      const updatedOrder = mapOrder(response?.data);
      if (updatedOrder) {
        useOrderStore.getState().setOrder(updatedOrder);
      }

      // Cập nhật table store để lấy currentOrderId mới nhất
      await useTableStore.getState().fetchTables(branchId);
      useTableStore.getState().selectTable(tableId);

      // Xóa draft và cờ thiếu hàng sau khi gửi thành công
      set(state => {
        const { [tableId]: _removed, ...rest } = state.draftItems;
        return { draftItems: rest, insufficientItems: {} };
      });

      toast.success(`✅ Đã gửi ${items.length} món đến bếp!`, { position: 'bottom-center' });
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

      // Nếu BE trả về 409 (Insufficient Stock) → cũng xử lý như thiếu hàng
      if (err?.status === 409) {
        toast.error(
          `🚫 Backend xác nhận: Không đủ nguyên liệu!\n${err?.message || 'Vui lòng kiểm tra lại kho.'}`,
          {
            duration: 6000,
            position: 'bottom-center',
            style: { whiteSpace: 'pre-line', maxWidth: '420px' },
          }
        );
      } else {
        toast.error(err?.message || '🔴 Gửi bếp thất bại. Vui lòng thử lại!', { position: 'bottom-center' });
      }

      return false;

    } finally {
      set({ isSending: false, isCheckingStock: false });
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

/** Thông tin thiếu hàng của một món cụ thể — dùng để highlight UI */
export const selectItemInsufficiency = (menuItemId) => (state) =>
  state.insufficientItems[menuItemId] ?? null;
