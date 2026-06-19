/**
 * orderMapper.js — Chuyển đổi dữ liệu Đơn hàng từ BE sang định dạng FE
 *
 * Mục đích:
 * - Chuẩn hóa dữ liệu Order và OrderItem từ BE sang format ổn định cho FE.
 * - Đặc biệt quan trọng: ID của item và order PHẢI lấy từ BE (không tự tạo).
 * - Xử lý các trường hợp BE trả về thiếu dữ liệu.
 *
 * ⚠️ QUAN TRỌNG: FE TUYỆT ĐỐI KHÔNG TỰ TẠO item ID.
 * → Mọi ID phải đến từ BE để đảm bảo tính nhất quán với Database.
 *
 * Cấu trúc Order BE trả về:
 *   {
 *     id, branchId, tableId, tableNumber, status,
 *     createdAt, items: [ OrderItem... ]
 *   }
 *
 * Cấu trúc OrderItem BE trả về:
 *   {
 *     id, menuItemId, menuItemName, quantity, price,
 *     status, note, createdAt
 *   }
 */

/**
 * Xử lý an toàn format ngày tháng trả về từ BE.
 * Spring Boot có thể trả về LocalDateTime dạng Array `[YYYY, MM, DD, ...]`
 */
const parseSafeDate = (dateVal) => {
  if (!dateVal) return null;
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s).toISOString();
  }
  return String(dateVal);
};

/**
 * Map một OrderItem từ BE sang format FE.
 *
 * @param {object} item - Dữ liệu OrderItem thô từ BE
 * @returns {object} - OrderItem đã được chuẩn hóa
 */
export const mapOrderItem = (item) => {
  if (!item) return null;

  return {
    // ⚠️ ID phải lấy từ BE — FE KHÔNG được tự tạo
    id: item.id,
    menuItemId: item.menuItemId,

    // BE dùng "menuItemName", FE dùng "name" để hiển thị
    name: item.menuItemName || item.name || 'Món không xác định',

    quantity: item.quantity ?? 1,
    price: item.unitPrice || item.price || 0,
    note: item.note || '',

    // Trạng thái món trong bếp
    // Các trạng thái hợp lệ: PENDING, PROCESSING, COMPLETED, SERVED, CANCELLED
    // ⚠️ NOTE BE: BE dùng PENDING, FE cũ dùng SENT → cần map để tương thích
    status: mapItemStatus(item.status),

    // Thời điểm tạo
    createdAt: parseSafeDate(item.createdAt),

    // Lý do hủy (chỉ có khi status = CANCELLED)
    cancelReason: item.cancelReason || null,
  };
};

/**
 * Map trạng thái item từ BE sang FE.
 * BE và FE có thể dùng tên trạng thái khác nhau.
 *
 * @param {string} beStatus - Trạng thái từ BE
 * @returns {string} - Trạng thái đã được chuẩn hóa cho FE
 */
const mapItemStatus = (beStatus) => {
  // Map các trạng thái tương đương
  const statusMap = {
    PENDING:    'SENT',       // Bếp chưa bắt đầu → FE hiển thị là "Đã gửi"
    PROCESSING: 'PREPARING',  // Đang nấu
    COMPLETED:  'READY',      // Bếp xong, chờ phục vụ
    SERVED:     'SERVED',     // Đã phục vụ đến bàn
    CANCELLED:  'CANCELLED',  // Đã hủy
    WAITING_STOCK: 'SENT',    // Chờ nguyên liệu → hiển thị như "Đã gửi"
  };

  // Nếu BE trả về trạng thái không có trong map → giữ nguyên
  return statusMap[beStatus] || beStatus || 'SENT';
};

const toSafeNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeSummaryNote = (note) => String(note ?? '').trim();

const buildSummaryStatus = ({ sentQuantity, preparingQuantity, readyQuantity, servedQuantity }) => {
  if (readyQuantity > 0) return 'READY';
  if (preparingQuantity > 0) return 'PREPARING';
  if (sentQuantity > 0) return 'SENT';
  if (servedQuantity > 0) return 'SERVED';
  return 'SENT';
};

export const mapOrderSummaryItem = (item) => {
  if (!item) return null;

  const quantity = toSafeNumber(item.quantity);
  const price = toSafeNumber(item.unitPrice ?? item.price);
  const sentQuantity = toSafeNumber(item.sentQuantity ?? item.statusBreakdown?.SENT);
  const preparingQuantity = toSafeNumber(item.preparingQuantity ?? item.statusBreakdown?.PREPARING);
  const readyQuantity = toSafeNumber(item.readyQuantity ?? item.statusBreakdown?.READY);
  const servedQuantity = toSafeNumber(item.servedQuantity ?? item.statusBreakdown?.SERVED);
  const note = normalizeSummaryNote(item.note);

  const summary = {
    id: item.id ?? item.menuItemId,
    menuItemId: item.menuItemId,
    name: item.menuItemName || item.name || 'Mon khong xac dinh',
    quantity,
    price,
    unitPrice: price,
    note,
    lineTotal: toSafeNumber(item.lineTotal ?? price * quantity),
    sentQuantity,
    preparingQuantity,
    readyQuantity,
    servedQuantity,
    statusBreakdown: {
      SENT: sentQuantity,
      PREPARING: preparingQuantity,
      READY: readyQuantity,
      SERVED: servedQuantity,
    },
    orderItemIds: Array.isArray(item.orderItemIds) ? item.orderItemIds : [],
    readyOrderItemIds: Array.isArray(item.readyOrderItemIds) ? item.readyOrderItemIds : [],
    cancellableOrderItemIds: Array.isArray(item.cancellableOrderItemIds) ? item.cancellableOrderItemIds : [],
  };

  return {
    ...summary,
    status: buildSummaryStatus(summary),
  };
};

const buildGroupKey = (item) => [
  item.menuItemId ?? item.name,
  toSafeNumber(item.price ?? item.unitPrice),
  normalizeSummaryNote(item.note).toLowerCase(),
].join('|');

export const groupOrderItemsForSummary = (items = []) => {
  const groups = new Map();

  items
    .filter((item) => item && item.status !== 'CANCELLED')
    .forEach((item) => {
      const key = buildGroupKey(item);
      const quantity = toSafeNumber(item.quantity);
      const price = toSafeNumber(item.price ?? item.unitPrice);

      if (!groups.has(key)) {
        groups.set(key, {
          id: item.menuItemId ?? item.id,
          menuItemId: item.menuItemId,
          name: item.name || item.menuItemName || 'Mon khong xac dinh',
          quantity: 0,
          price,
          unitPrice: price,
          note: normalizeSummaryNote(item.note),
          lineTotal: 0,
          sentQuantity: 0,
          preparingQuantity: 0,
          readyQuantity: 0,
          servedQuantity: 0,
          statusBreakdown: { SENT: 0, PREPARING: 0, READY: 0, SERVED: 0 },
          orderItemIds: [],
          readyOrderItemIds: [],
          cancellableOrderItemIds: [],
        });
      }

      const group = groups.get(key);
      group.quantity += quantity;
      group.lineTotal += price * quantity;
      group.orderItemIds.push(item.id);

      if (item.status === 'READY') {
        group.readyQuantity += quantity;
        group.statusBreakdown.READY += quantity;
        group.readyOrderItemIds.push(item.id);
      } else if (item.status === 'PREPARING') {
        group.preparingQuantity += quantity;
        group.statusBreakdown.PREPARING += quantity;
        group.cancellableOrderItemIds.push(item.id);
      } else if (item.status === 'SERVED') {
        group.servedQuantity += quantity;
        group.statusBreakdown.SERVED += quantity;
      } else {
        group.sentQuantity += quantity;
        group.statusBreakdown.SENT += quantity;
        group.cancellableOrderItemIds.push(item.id);
      }
    });

  return [...groups.values()].map((group) => ({
    ...group,
    status: buildSummaryStatus(group),
  }));
};

/**
 * Map một Order từ BE sang format FE.
 *
 * @param {object} order - Dữ liệu Order thô từ BE
 * @returns {object} - Order đã được chuẩn hóa
 */
export const mapOrder = (order) => {
  if (!order) return null;

  const rawItems = order.orderItems || order.items;
  if (!rawItems) {
    console.warn("[MAPPER_WARNING] items missing in order data from BE", order);
  }
  const mappedItems = rawItems ? rawItems.map(mapOrderItem).filter(Boolean) : [];
  const rawSummaryItems = order.summaryItems || order.groupedItems;
  const summaryItems = Array.isArray(rawSummaryItems) && rawSummaryItems.length > 0
    ? rawSummaryItems.map(mapOrderSummaryItem).filter(Boolean)
    : groupOrderItemsForSummary(mappedItems);

  return {
    id: order.orderId || order.id,
    branchId: order.branchId,
    tableId: order.tableId,
    // BE trả về "tableName", FE cần "tableNumber" để hiển thị
    tableNumber: order.tableName || order.tableNumber || `Bàn ${order.tableId}`,

    // Trạng thái order tổng thể
    status: order.status || 'PENDING',

    // Thời gian
    createdAt: parseSafeDate(order.createdAt),
    closedAt: parseSafeDate(order.closedAt),

    // Danh sách món — map từng item
    // Lọc bỏ các item null/undefined để tránh lỗi render
    items: mappedItems,
    summaryItems,

    // ID khách hàng (nếu có)
    customerId: order.customerId ?? null,

    // Thông tin khách hàng (object) — dùng trong CustomerSelector và PaymentModal
    // BE trả về customerId + customerName riêng lẻ, FE gom thành object
    customer: order.customerId
      ? {
          id: order.customerId,
          name: order.customerName || 'Khách hàng',
          phone: order.customerPhone || '',       // BE chưa trả về phone trong OrderResponse
          tierName: order.customerTierName || null, // BE chưa trả về tier trong OrderResponse
        }
      : null,
  };
};
