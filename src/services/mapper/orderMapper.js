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

/**
 * Map một Order từ BE sang format FE.
 *
 * @param {object} order - Dữ liệu Order thô từ BE
 * @returns {object} - Order đã được chuẩn hóa
 */
export const mapOrder = (order) => {
  if (!order) return null;

  return {
    id: order.orderId || order.id,
    branchId: order.branchId,
    tableId: order.tableId,
    tableNumber: order.tableNumber || `Bàn ${order.tableId}`,

    // Trạng thái order tổng thể
    status: order.status || 'PENDING',

    // Thời gian
    createdAt: parseSafeDate(order.createdAt),
    closedAt: parseSafeDate(order.closedAt),

    // Danh sách món — map từng item
    // Lọc bỏ các item null/undefined để tránh lỗi render
    items: (() => {
      const rawItems = order.orderItems || order.items;
      if (!rawItems) {
        console.warn("[MAPPER_WARNING] items missing in order data from BE", order);
        return [];
      }
      return rawItems.map(mapOrderItem).filter(Boolean);
    })(),

    // ID khách hàng (nếu có)
    customerId: order.customerId ?? null,
  };
};
