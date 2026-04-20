/**
 * kitchenMapper.js — Chuyển đổi dữ liệu Bếp từ BE sang định dạng FE
 *
 * Mục đích:
 * - Chuyển đổi dữ liệu OrderItem từ API bếp sang KitchenItem cho KDS hiển thị.
 * - Defensive mapping để đảm bảo UI không bị lỗi khi BE thiếu field.
 *
 * Cấu trúc dữ liệu BE trả về từ /kitchen/orders/pending:
 *   {
 *     id, menuItemName, quantity, note,
 *     tableName, orderId, createdAt, status
 *   }
 *
 * ⚠️ NOTE BE: Cấu trúc response từ endpoint bếp có thể khác với OrderItem thông thường.
 * → Mapper này xử lý các tên field đặc thù của Kitchen API.
 */

/**
 * Xử lý an toàn format ngày tháng trả về từ BE.
 * Spring Boot có thể trả về LocalDateTime dạng Array `[YYYY, MM, DD, HH, mm, ss]`.
 */
const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date().toISOString();
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s).toISOString();
  }
  return String(dateVal); // Nếu đã là chuỗi ISO thì giữ nguyên
};

/**
 * Map một item từ Kitchen API sang format KitchenItem cho KDS hiển thị.
 *
 * @param {object} item - Dữ liệu thô từ BE Kitchen API
 * @returns {object} - KitchenItem đã được chuẩn hóa
 */
export const mapKitchenItem = (item) => {
  if (!item) return null;

  return {
    // ID món ăn trong đơn hàng — BẮT BUỘC phải lấy từ BE
    id: item.id,

    // ID đơn hàng để liên kết
    // ⚠️ NOTE BE: Một số response thiếu orderId riêng → dùng id làm fallback tạm thời
    orderId: item.orderId ?? item.id,

    // Tên món ăn (BE dùng menuItemName)
    menuItemName: item.menuItemName || item.name || 'Món không xác định',

    // Số lượng
    quantity: item.quantity ?? 1,

    // Ghi chú của khách (ví dụ: "ít cay", "không hành")
    note: item.note || '',

    // Tên bàn để KDS nhân biết phục vụ cho bàn nào
    // ⚠️ NOTE BE: Nếu BE thiếu tableName → hiển thị fallback rõ ràng
    tableName: item.tableName || `Đơn #${item.orderId || item.id}`,

    // Trạng thái hiện tại (PENDING, PROCESSING, v.v.)
    status: item.status || 'PENDING',

    // Thời điểm order item được tạo → dùng để tính thời gian chờ
    createdAt: parseSafeDate(item.createdAt),
  };
};

/**
 * Map mảng KitchenItems từ BE.
 * Lọc bỏ null/undefined để tránh lỗi render.
 *
 * @param {Array} items - Mảng dữ liệu thô từ Kitchen API
 * @returns {Array} - Mảng KitchenItem đã chuẩn hóa
 */
export const mapKitchenItems = (items) => {
  if (!Array.isArray(items)) {
    // ⚠️ NOTE BE: Kitchen API trả về dạng không phải mảng
    console.warn('[kitchenMapper] BE không trả về mảng. Nhận được:', typeof items);
    return [];
  }
  return items.map(mapKitchenItem).filter(Boolean);
};
