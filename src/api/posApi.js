/**
 * posApi.js — Mock API layer cho module POS (Tables & Orders)
 *
 * Thiết kế theo chuẩn production: giả lập delay mạng, lỗi ngẫu nhiên,
 * và đúng contract với schema Entity của RM-BE (RestaurantTable, Order, OrderItem).
 *
 * Khi BE ra API thật: Chỉ cần thay từng hàm mock bằng apiClient.xxx() tương ứng.
 * Không cần thay đổi Store hoặc Component.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  MOCK DATA — Chuẩn theo Entity BE                                   │
 * │  RestaurantTable: id, branchId, areaId, tableNumber, capacity,      │
 * │                   posX, posY, width, height, status, currentOrderId  │
 * │  Order:           id, branchId, tableId, status, createdBy,         │
 * │                   createdAt, closedAt, items                         │
 * │  OrderItem:       id, menuItemId, name, quantity, price,             │
 * │                   status, note, sentAt                               │
 * └─────────────────────────────────────────────────────────────────────┘
 */
import apiClient from './apiClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Giả lập độ trễ mạng thực tế.
 * @param {number} min - Min ms (default 200)
 * @param {number} max - Max ms (default 600)
 */
const mockDelay = (min = 200, max = 600) =>
  new Promise(res => setTimeout(res, min + Math.random() * (max - min)));

/**
 * Sinh UUID v4 đơn giản cho order item trước khi gửi bếp.
 */
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ─── In-memory Mock Database ──────────────────────────────────────────────────
// Khởi tạo 1 lần khi module load, không reset qua hot-reload.

/** @type {Map<number, import('./posTypes').RestaurantTable>} */
const TABLES_DB = new Map(
  [
    { id: 1,  branchId: 1, areaId: 1, tableNumber: 'B01', capacity: 4, posX: 0,   posY: 0,   width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 2,  branchId: 1, areaId: 1, tableNumber: 'B02', capacity: 4, posX: 140, posY: 0,   width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 3,  branchId: 1, areaId: 1, tableNumber: 'B03', capacity: 6, posX: 280, posY: 0,   width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 4,  branchId: 1, areaId: 1, tableNumber: 'B04', capacity: 4, posX: 420, posY: 0,   width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 5,  branchId: 1, areaId: 1, tableNumber: 'B05', capacity: 2, posX: 0,   posY: 120, width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 6,  branchId: 1, areaId: 1, tableNumber: 'B06', capacity: 8, posX: 140, posY: 120, width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 7,  branchId: 1, areaId: 1, tableNumber: 'B07', capacity: 4, posX: 280, posY: 120, width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 8,  branchId: 1, areaId: 1, tableNumber: 'B08', capacity: 4, posX: 420, posY: 120, width: 120, height: 100, status: 'AVAILABLE', currentOrderId: null },
    { id: 9,  branchId: 1, areaId: 2, tableNumber: 'VIP1', capacity: 10, posX: 0,  posY: 240, width: 180, height: 120, status: 'AVAILABLE', currentOrderId: null },
    { id: 10, branchId: 1, areaId: 2, tableNumber: 'VIP2', capacity: 10, posX: 200, posY: 240, width: 180, height: 120, status: 'AVAILABLE', currentOrderId: null },
  ].map(t => [t.id, t])
);

/** @type {Map<number, import('./posTypes').PosOrder>} */
const ORDERS_DB = new Map();
const REQUEST_ID_CACHE = new Set();
const AUDIT_LOG_DB = [];

let _nextOrderId = 1000;

// ─── Table APIs ───────────────────────────────────────────────────────────────

export const tableApi = {

  /**
   * Lấy danh sách bàn theo branchId.
   * BE endpoint tương lai: GET /api/v1/tables?branchId=1
   *
   * @param {number} branchId
   * @returns {Promise<RestaurantTable[]>}
   */
  getTables: async (branchId = 1) => {
    await mockDelay();
    const tables = [...TABLES_DB.values()].filter(t => t.branchId === branchId);
    return { success: true, data: tables };
  },

  /**
   * Mở bàn → Tạo Order mới với status NEW, gán vào bàn.
   * BE endpoint tương lai: POST /api/v1/orders { tableId, branchId }
   *
   * Logic nghiệp vụ:
   *   - Chỉ được mở bàn có status AVAILABLE
   *   - Tạo order với status NEW
   *   - Cập nhật table.status = OCCUPIED, table.currentOrderId = newOrderId
   *
   * @param {{ tableId: number, branchId: number, createdBy: number }} payload
   * @returns {Promise<{ order: PosOrder, table: RestaurantTable }>}
   */
  openTable: async ({ tableId, branchId = 1, createdBy = 1 }) => {
    await mockDelay(300, 700);

    const table = TABLES_DB.get(tableId);
    if (!table) throw { status: 404, message: `Không tìm thấy bàn #${tableId}` };
    if (table.status === 'OCCUPIED') {
      throw { status: 409, message: `Bàn ${table.tableNumber} đang có khách. Vui lòng chọn bàn khác.` };
    }

    const newOrderId = ++_nextOrderId;
    const now = new Date().toISOString();

    const newOrder = {
      id: newOrderId,
      branchId,
      tableId,
      tableNumber: table.tableNumber,
      status: 'NEW',
      createdBy,
      servedBy: createdBy,
      createdAt: now,
      closedAt: null,
      version: 1, // Enterprise: Root version
      items: [], // Các OrderItem đã được xác nhận (đã gửi bếp)
    };

    // Cập nhật in-memory DB
    ORDERS_DB.set(newOrderId, newOrder);
    TABLES_DB.set(tableId, { ...table, status: 'OCCUPIED', currentOrderId: newOrderId });

    return { success: true, data: { order: newOrder, table: TABLES_DB.get(tableId) } };
  },

  /**
   * Đóng bàn sau khi đã thanh toán.
   * BE endpoint tương lai: POST /api/v1/tables/:tableId/close
   *
   * @param {number} tableId
   */
  closeTable: async (tableId) => {
    await mockDelay(200, 500);
    const table = TABLES_DB.get(tableId);
    if (!table) throw { status: 404, message: 'Không tìm thấy bàn' };

    // Xoá order ref nếu có
    if (table.currentOrderId) {
      const order = ORDERS_DB.get(table.currentOrderId);
      if (order) ORDERS_DB.set(table.currentOrderId, { ...order, status: 'PAID', closedAt: new Date().toISOString() });
    }

    TABLES_DB.set(tableId, { ...table, status: 'AVAILABLE', currentOrderId: null });
    return { success: true, data: TABLES_DB.get(tableId) };
  },

  /**
   * Gộp bàn (Merge Tables) — Nâng cấp nghiệp vụ chuẩn.
   * Gộp đơn hàng từ fromTable sang toTable.
   */
  mergeTables: async ({ fromTableId, toTableId }) => {
    await mockDelay(500, 1000);
    const fromTable = TABLES_DB.get(fromTableId);
    const toTable   = TABLES_DB.get(toTableId);

    if (!fromTable || !toTable) throw { status: 404, message: 'Bàn không tồn tại' };
    if (!fromTable.currentOrderId) throw { status: 400, message: 'Bàn nguồn không có đơn hàng' };

    const fromOrder = ORDERS_DB.get(fromTable.currentOrderId);
    let toOrderId = toTable.currentOrderId;
    let toOrder;

    if (!toOrderId) {
      // Trường hợp gộp vào bàn trống -> Chuyển nguyên đơn sang
      toOrderId = fromTable.currentOrderId;
      TABLES_DB.set(toTableId, { ...toTable, status: 'OCCUPIED', currentOrderId: toOrderId });
      toOrder = { ...fromOrder, tableId: toTableId, tableNumber: toTable.tableNumber };
    } else {
      // Trường hợp gộp 2 bàn cùng đang bận -> Món ăn bàn nguồn cộng dồn vào bàn đích
      toOrder = ORDERS_DB.get(toOrderId);
      const mergedItems = [...toOrder.items, ...fromOrder.items.map(i => ({ ...i, note: `[Từ ${fromTable.tableNumber}] ${i.note}` }))];
      toOrder = { 
        ...toOrder, 
        items: mergedItems, 
        version: (toOrder.version || 1) + 1 
      };
      
      // Đánh dấu order cũ là MERGED
      ORDERS_DB.set(fromTable.currentOrderId, { ...fromOrder, status: 'MERGED', closedAt: new Date().toISOString() });
    }

    // Cập nhật DB
    ORDERS_DB.set(toOrderId, toOrder);
    TABLES_DB.set(fromTableId, { ...fromTable, status: 'AVAILABLE', currentOrderId: null });

    return { success: true, data: { fromTableId, toTable: TABLES_DB.get(toTableId), order: toOrder } };
  },

  /**
   * Tách bàn (Split Order) — Nghiệp vụ phức tạp.
   *
   * Luồng nghiệp vụ:
   *   1. Validate: Order nguồn và bàn đích tồn tại không
   *   2. Nếu bàn đích đang trống → tạo Order mới và gắn vào bàn đó
   *   3. Nếu bàn đích đã có Order → gộp vào Order hiện tại của bàn đó
   *   4. Di chuyển từng item (hoặc tách theo số lượng) từ fromOrder sang toOrder
   *   5. Trả về cả 2 order sau khi cập nhật để frontend sync
   *
   * Lỗi thường gặp (BUG ĐÃ FIX):
   *   - transferItems phải dùng `move.itemId` để tìm kiếm trong fromOrder.items
   *   - toOrder mới tạo cần có `tableNumber` để frontend hiển thị đúng tên bàn
   *
   * @param {{ fromOrderId: number, toTableId: number, transferItems: { itemId: string, quantity: number }[] }} payload
   */
  splitOrder: async ({ fromOrderId, toTableId, transferItems }) => {
    await mockDelay(200, 400); // Giảm delay để phản hồi tức thì hơn


    // --- Validate dữ liệu đầu vào ---
    const fromOrder = ORDERS_DB.get(fromOrderId);
    if (!fromOrder) throw { status: 404, message: 'Không tìm thấy đơn hàng nguồn' };

    const toTable = TABLES_DB.get(toTableId);
    if (!toTable) throw { status: 404, message: 'Không tìm thấy bàn đích' };

    // Kiểm tra danh sách item cần chuyển có hợp lệ không
    // Không được tách các item đã bị HỦY hoặc đã THANH TOÁN
    const invalidItems = transferItems.filter(move => {
      const item = fromOrder.items.find(i => i.id === move.itemId);
      return !item || item.status === 'CANCELLED' || item.status === 'PAID';
    });
    if (invalidItems.length > 0) {
      throw { status: 400, message: 'Danh sách tách có chứa món đã huỷ hoặc đã thanh toán' };
    }

    // --- Khởi tạo hoặc lấy Order ở bàn đích ---
    let toOrderId = toTable.currentOrderId;
    let toOrder;

    if (!toOrderId) {
      // Bàn đích đang trống → tạo order mới
      toOrderId = ++_nextOrderId;
      toOrder = {
        id: toOrderId,
        branchId: fromOrder.branchId,
        tableId: toTableId,
        tableNumber: toTable.tableNumber,   // BUG FIX: Trước đây thiếu tableNumber khiến KDS hiển thị sai bàn
        status: 'SENT_TO_KITCHEN',
        createdBy: fromOrder.createdBy,
        servedBy: fromOrder.servedBy,
        createdAt: new Date().toISOString(),
        closedAt: null,
        version: 1,
        items: [],
      };
      // Cập nhật trạng thái bàn đích thành OCCUPIED
      TABLES_DB.set(toTableId, { ...toTable, status: 'OCCUPIED', currentOrderId: toOrderId });
    } else {
      // Bàn đích đang có khách → gộp thêm vào order hiện tại
      toOrder = ORDERS_DB.get(toOrderId);
      if (!toOrder) throw { status: 500, message: 'Lỗi dữ liệu: Bàn đích có orderId nhưng không tìm thấy order' };
    }

    // --- Di chuyển item từ fromOrder sang toOrder ---
    const currentFromItems = [...fromOrder.items];
    const newToItems = [...toOrder.items];

    transferItems.forEach(move => {
      // BUG FIX: Dùng `move.itemId` thay vì `move.id` để tìm đúng item trong danh sách
      const idx = currentFromItems.findIndex(i => i.id === move.itemId);
      if (idx === -1) return; // Item không tìm thấy → bỏ qua

      const item = { ...currentFromItems[idx] };
      // Giới hạn số lượng chuyển không vượt quá số lượng hiện tại
      const moveQty = Math.min(move.quantity, item.quantity);

      if (moveQty >= item.quantity) {
        // Chuyển TOÀN BỘ số lượng → xoá item khỏi fromOrder
        currentFromItems.splice(idx, 1);
        // Tạo item mới với ID khác ở toOrder để tránh trùng lặp
        newToItems.push({ ...item, id: uuid(), version: 1 });
      } else {
        // Chuyển MỘT PHẦN số lượng → giảm số lượng ở fromOrder
        currentFromItems[idx] = { ...item, quantity: item.quantity - moveQty, version: item.version + 1 };
        // Tạo item mới ở toOrder với số lượng đã tách
        newToItems.push({ ...item, id: uuid(), quantity: moveQty, version: 1 });
      }
    });

    // --- Lưu kết quả vào database ---
    const updatedFromOrder = {
      ...fromOrder,
      items: currentFromItems,
      version: (fromOrder.version || 1) + 1,
    };

    // --- Tích hợp trạng thái Bàn nguồn ---
    // Nếu Bàn A không còn món nào, chuyển về trạng thái AVAILABLE
    if (currentFromItems.length === 0) {
      updatedFromOrder.status = 'MERGED'; // Order rỗng coi như đã merge
      updatedFromOrder.closedAt = new Date().toISOString();
      // fromTableId might not be defined explicitly here. We should look up table via fromOrder.tableId
      const fromTableId = fromOrder.tableId;
      const fromTable = TABLES_DB.get(fromTableId);
      if (fromTable) {
        TABLES_DB.set(fromTableId, { ...fromTable, status: 'AVAILABLE', currentOrderId: null });
      }
    }

    const updatedToOrder = {
      ...toOrder,
      items: newToItems,
      version: (toOrder.version || 1) + 1,
    };

    ORDERS_DB.set(fromOrderId, updatedFromOrder);
    ORDERS_DB.set(toOrderId, updatedToOrder);

    return {
      success: true,
      data: { fromOrder: updatedFromOrder, toOrder: updatedToOrder },
    };
  },

  /**
   * Đặt trạng thái bàn về RESERVED.
   * BE endpoint tương lai: PATCH /api/v1/tables/:tableId/reserve
   *
   * @param {{ tableId: number, reservationInfo: object }} payload
   */
  reserveTable: async ({ tableId, reservationInfo }) => {
    await mockDelay();
    const table = TABLES_DB.get(tableId);
    if (!table) throw { status: 404, message: 'Không tìm thấy bàn' };
    TABLES_DB.set(tableId, { ...table, status: 'RESERVED', reservationInfo });
    return { success: true, data: TABLES_DB.get(tableId) };
  },
};

// ─── Order APIs ───────────────────────────────────────────────────────────────

export const orderApi = {

  /**
   * Lấy chi tiết một order.
   * BE endpoint tương lai: GET /api/v1/orders/:orderId
   *
   * @param {number} orderId
   */
  getOrder: async (orderId) => {
    await mockDelay(100, 300);
    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: `Không tìm thấy đơn hàng #${orderId}` };
    return { success: true, data: order };
  },

  /**
   * Gửi batch món lên bếp (Send To Kitchen).
   * BE endpoint tương lai: POST /api/v1/orders/:orderId/items
   *
   * Logic nghiệp vụ:
   *   - Mỗi lần gọi là 1 batch riêng (thêm vào list items của order)
   *   - Items được chuyển status từ NEW → SENT
   *   - Order status được upgrade nếu cần (NEW → SENT_TO_KITCHEN)
   *   - Tách theo categoryType (KITCHEN / BAR) — để KDS routing sau này
   *
   * @param {{ orderId: number, newItems: CartItem[], bypassKitchen?: boolean }} payload
   * @returns {Promise<{ order: PosOrder, sentItems: OrderItem[] }>}
   */
  sendToKitchen: async ({ orderId, newItems, bypassKitchen = false }) => {
    await mockDelay(400, 900);

    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Không tìm thấy đơn hàng' };
    if (!newItems || newItems.length === 0) throw { status: 400, message: 'Không có món nào để gửi bếp' };

    const sentAt = new Date().toISOString();
    const batchId = `BATCH-${Date.now()}`;

    // Map cart items → OrderItem với status SENT
    const sentItems = newItems.map(cartItem => ({
      id: uuid(),
      menuItemId: cartItem.menuItemId,
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price,
      status: bypassKitchen ? 'SERVED' : 'SENT', // Bypass kitchen -> Món hoàn thành ngay
      note: cartItem.note || '',
      sentAt,
      batchId, // Enterprise: Grouping
      version: 1, // Enterprise: Item version
      kitchenType: cartItem.categoryType || 'KITCHEN', // 'KITCHEN' | 'BAR'
      cancelStatus: 'NONE',
    }));

    // Thêm vào order hiện có và tăng version order
    const updatedOrder = {
      ...order,
      status: 'SENT_TO_KITCHEN',
      version: (order.version || 1) + 1,
      items: [...order.items, ...sentItems],
    };

    ORDERS_DB.set(orderId, updatedOrder);
    return { success: true, data: { order: updatedOrder, sentItems } };
  },

  /**
   * Cập nhật trạng thái món ăn từ KDS (Kitchen Display System).
   * Hỗ trợ: Idempotency (requestId) và Concurrency (version).
   */
  updateItemStatus: async ({ orderId, itemId, status, requestId, version, user = 'Chef' }) => {
    await mockDelay(300, 700);

    // 1. Idempotency check
    if (requestId && REQUEST_ID_CACHE.has(requestId)) {
      console.warn(`[API] Duplicated requestId: ${requestId}. Skipping.`);
      return { success: true, data: ORDERS_DB.get(orderId), duplicated: true };
    }

    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Không tìm thấy đơn hàng' };

    const item = order.items.find(i => i.id === itemId);
    if (!item) throw { status: 404, message: 'Không tìm thấy món' };

    // 2. Concurrency check (Optimistic Locking)
    if (item.version !== version) {
      throw { 
        status: 409, 
        message: 'Dữ liệu đã thay đổi bởi người khác. Vui lòng tải lại trang.',
        serverVersion: item.version 
      };
    }

    // 3. Update logic
    const newItemVersion = item.version + 1;
    const updatedItems = order.items.map(i => 
      i.id === itemId ? { ...i, status, version: newItemVersion } : i
    );

    const updatedOrder = {
      ...order,
      version: (order.version || 1) + 1,
      items: updatedItems,
    };

    // 4. Persistence & Audit
    ORDERS_DB.set(orderId, updatedOrder);
    if (requestId) {
      REQUEST_ID_CACHE.add(requestId);
      // Cleanup cache sau 10p (giả lập)
      setTimeout(() => REQUEST_ID_CACHE.delete(requestId), 600000);
    }

    const log = {
      id: uuid(),
      requestId,
      action: status === 'PREPARING' ? 'START_COOKING' : 'COMPLETE',
      itemId,
      orderId,
      by: user,
      at: new Date().toISOString(),
    };
    AUDIT_LOG_DB.push(log);

    console.log(`[API] ${user} updated item ${item.name} -> ${status} (v${newItemVersion})`);
    
    return { success: true, data: updatedOrder, auditLog: log };
  },

  /**
   * Đánh dấu món ăn đã được phục vụ tận bàn.
   */
  serveItem: async ({ orderId, itemId, requestId }) => {
    await mockDelay(200, 400);

    // Idempotency
    if (requestId && REQUEST_ID_CACHE.has(requestId)) return { success: true, data: ORDERS_DB.get(orderId) };

    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Đơn hàng không tồn tại' };

    const updatedItems = order.items.map(i => 
      i.id === itemId ? { ...i, status: 'SERVED', version: i.version + 1 } : i
    );
    const updatedOrder = { ...order, items: updatedItems, version: (order.version || 1) + 1 };
    
    ORDERS_DB.set(orderId, updatedOrder);
    if (requestId) REQUEST_ID_CACHE.add(requestId);

    return { success: true, data: updatedOrder };
  },

  getAuditLogs: async () => {
    await mockDelay(100, 200);
    return { success: true, data: [...AUDIT_LOG_DB].reverse().slice(0, 50) };
  },

  /**
   * Huỷ một order item.
   *
   * Luồng nghiệp vụ:
   *   1. Kiểm tra Idempotency — Không xử lý requestId đã dùng
   *   2. Validate trạng thái món: Không cho huỷ nếu đã SERVED hoặc đã PAID
   *   3. Nếu đang PREPARING hoặc READY → chỉ cho huỷ khi lý do có tiền tố [FORCE] (Manager)
   *   4. Lý do huỷ (cancelReason) là BẮT BUỘC — Không chấp nhận chuỗi rỗng
   *   5. Ghi audit log cho mọi lần huỷ
   *
   * BE endpoint tương lai: PATCH /api/v1/orders/:orderId/items/:itemId/cancel
   * Request body: { reason: string, cancelledBy: number, version: number }
   *
   * @param {{ orderId: number, itemId: string, reason: string, requestId?: string }} payload
   */
  cancelItem: async ({ orderId, itemId, reason = '', requestId }) => {
    await mockDelay(200, 500);

    // Kiểm tra Idempotency — Tránh xử lý 2 lần cùng 1 request
    if (requestId && REQUEST_ID_CACHE.has(requestId)) return { success: true, data: ORDERS_DB.get(orderId) };

    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Không tìm thấy đơn hàng' };

    const item = order.items.find(i => i.id === itemId);
    if (!item) throw { status: 404, message: 'Không tìm thấy món trong đơn hàng' };

    // Không cho huỷ món đã CANCELLED (idempotent nhưng cần thông báo rõ)
    if (item.status === 'CANCELLED') {
      throw { status: 409, message: 'Món này đã được huỷ trước đó' };
    }

    // Không cho huỷ món đã được phục vụ hoặc đã thanh toán — Đây là quy tắc nghiệp vụ cứng
    if (item.status === 'SERVED' || item.status === 'PAID') {
      throw { status: 422, message: 'Không thể huỷ món đã phục vụ cho khách hoặc đã thanh toán' };
    }

    // Bắt buộc phải có lý do huỷ món — Không bao giờ chấp nhận chuỗi rỗng
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw { status: 400, message: 'Vui lòng nhập lý do huỷ món' };
    }

    // Nếu đang PREPARING hoặc READY → Chỉ cho phép huỷ khi có cờ [FORCE] từ Manager
    const isBeingCooked = ['PREPARING', 'READY'].includes(item.status);
    if (isBeingCooked && !cleanReason.includes('[FORCE]')) {
      throw { status: 422, message: 'Món đang được chế biến. Chỉ Quản lý mới được phép huỷ cưỡng bức.' };
    }

    const updatedOrder = {
      ...order,
      version: (order.version || 1) + 1,
      items: order.items.map(i =>
        i.id === itemId ? { ...i, status: 'CANCELLED', version: i.version + 1, cancelReason: reason } : i
      ),
    };

    ORDERS_DB.set(orderId, updatedOrder);
    if (requestId) {
      REQUEST_ID_CACHE.add(requestId);
      AUDIT_LOG_DB.push({
        id: uuid(),
        requestId,
        action: 'CANCEL_ITEM',
        itemId,
        orderId,
        by: 'Staff',
        at: new Date().toISOString(),
      });
    }

    console.log(`[AUDIT LOG] CANCEL_ITEM`, {
      action: "CANCEL_ITEM",
      orderId,
      itemId,
      itemName: item.name,
      reason,
      user: 'Bếp/Lễ tân',
      time: new Date()
    });

    return { success: true, data: updatedOrder };
  },

  /**
   * Cập nhật ghi chú của một order item.
   * BE endpoint tương lai: PATCH /api/v1/orders/:orderId/items/:itemId
   *
   * @param {{ orderId: number, itemId: string, note: string }} payload
   */
  updateItemNote: async ({ orderId, itemId, note }) => {
    await mockDelay(100, 300);
    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Không tìm thấy đơn hàng' };

    const updatedOrder = {
      ...order,
      items: order.items.map(i => (i.id === itemId ? { ...i, note } : i)),
    };

    ORDERS_DB.set(orderId, updatedOrder);
    return { success: true, data: updatedOrder };
  },
};

// ─── Payment APIs ──────────────────────────────────────────────────────────────

export const paymentApi = {

  /**
   * Thanh toán đơn hàng.
   *
   * Luồng nghiệp vụ:
   *   1. Kiểm tra trạng thái các món — Nếu còn NEW hoặc PREPARING: trả về danh sách cảnh báo
   *   2. Client phải gửi lại kèm `confirmedWarnings` để xác nhận đã đọc cảnh báo
   *   3. Tính tiền từ các item ACTIVE (không tính CANCELLED)
   *   4. Tạo hóa đơn, cập nhật order → PAID, cập nhật bàn → AVAILABLE
   *
   * QUAN TRỌNG: Hệ thống KHÔNG CHẶN CỨNG thanh toán.
   *   Nếu còn món NEW/PREPARING → Cảnh báo và yêu cầu xác nhận, nhưng vẫn cho thanh toán.
   *   Chỉ chặn nếu order đã PAID rồi (không cho thanh toán 2 lần).
   *
   * BE endpoint tương lai: POST /api/v1/bills
   * Request body: { orderId, tableId, discount, taxRate, method, confirmedWarnings }
   *
   * @param {{
   *   orderId: number,
   *   tableId: number,
   *   discount: number,
   *   taxRate: number,
   *   method: 'CASH' | 'TRANSFER' | 'QR',
   *   confirmedWarnings?: string[]  — Client phải gửi khi đã xác nhận cảnh báo
   * }} payload
   */
  payOrder: async ({ orderId, tableId, discount = 0, taxRate = 0, method = 'CASH', confirmedWarnings = [] }) => {
    await mockDelay(600, 1200);

    const order = ORDERS_DB.get(orderId);
    if (!order) throw { status: 404, message: 'Không tìm thấy đơn hàng' };

    // Không cho thanh toán đơn đã đóng / đã thanh toán rồi
    if (order.status === 'PAID') {
      throw { status: 409, message: 'Đơn hàng này đã được thanh toán trước đó' };
    }

    // --- Kiểm tra trạng thái món ---
    // Chỉ cho phép thanh toán khi tất cả món đều đã hoàn thành (READY / SERVED) hoặc đã hủy.
    const incompleteItems = order.items.filter(i => 
      ['NEW', 'SENT', 'PREPARING'].includes(i.status)
    );

    if (incompleteItems.length > 0) {
      throw {
        status: 422,
        message: `Đơn hàng tính tiền còn ${incompleteItems.length} món chưa được cung ứng (chưa hoàn thành). Bếp cần hoàn tất trước khi có thể thanh toán.`,
      };
    }

    // --- Tính tiền từ các item hợp lệ (không tính những món đã CANCELLED) ---
    const subTotal = order.items
      .filter(i => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);

    const discountAmount = Math.min(discount, subTotal);
    const taxAmount = ((subTotal - discountAmount) * taxRate) / 100;
    const total = subTotal - discountAmount + taxAmount;

    const now = new Date().toISOString();
    const bill = {
      id: `BILL_${Date.now()}`,
      orderId,
      tableId,
      subTotal,
      discount: discountAmount,
      taxRate,
      tax: taxAmount,
      total,
      method,
      status: 'COMPLETED',
      paidAt: now,
    };

    // Update order + table
    ORDERS_DB.set(orderId, { ...order, status: 'PAID', closedAt: now });
    const table = TABLES_DB.get(tableId);
    if (table) TABLES_DB.set(tableId, { ...table, status: 'AVAILABLE', currentOrderId: null });

    return { success: true, data: bill };
  },
};

// ─── Menu API (real) ───────────────────────────────────────────────────────────

/**
 * Lấy menu items thực từ Backend (đã có API).
 * Sử dụng apiClient chuẩn (có interceptor token).
 */
export const fetchMenuItemsReal = (params = {}) =>
  apiClient.get('/menu-items', { params: { size: 200, ...params } });

export default { tableApi, orderApi, paymentApi, fetchMenuItemsReal };
