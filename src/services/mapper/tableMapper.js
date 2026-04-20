/**
 * tableMapper.js — Chuyển đổi dữ liệu Bàn từ BE sang định dạng FE
 *
 * Mục đích:
 * - Chuẩn hóa dữ liệu từ BE (có thể thay đổi) sang một format ổn định cho FE.
 * - Nếu BE đổi tên trường → chỉ cần sửa mapper này, không cần chạm vào UI.
 * - Xử lý defensive: trường hợp BE thiếu field → dùng giá trị mặc định an toàn.
 *
 * Cấu trúc BE trả về (RestaurantTable):
 *   {
 *     id, branchId, areaId, tableNumber, capacity,
 *     posX, posY, width, height, status, currentOrderId
 *   }
 */

/**
 * Map một đối tượng bàn từ BE sang format FE.
 *
 * @param {object} t - Dữ liệu bàn thô từ BE
 * @returns {object} - Dữ liệu bàn đã được chuẩn hóa
 */
export const mapTable = (t) => {
  if (!t) return null;

  return {
    // --- Thông tin định danh ---
    id: t.id,
    branchId: t.branchId,
    areaId: t.areaId ?? null,

    // --- Hiển thị ---
    // BE dùng "tableNumber" (ví dụ: "T01"), FE hiển thị trực tiếp
    tableNumber: t.tableNumber || `Bàn ${t.id}`,    // Phòng thủ: nếu BE thiếu tableNumber
    capacity: t.capacity ?? 4,                        // Mặc định 4 chỗ nếu BE chưa cung cấp

    // --- Trạng thái quan trọng ---
    // AVAILABLE | OCCUPIED | RESERVED | CLEANING | DIRTY
    // ⚠️ NOTE BE: BE dùng "CLEANING" (sau thanh toán), FE dùng "DIRTY" để hiển thị
    // → Nếu BE trả về CLEANING → map thành DIRTY để đồng bộ với UI
    status: t.status === 'CLEANING' ? 'CLEANING' : (t.status || 'AVAILABLE'),

    // --- Liên kết đơn hàng ---
    // currentOrderId = null nếu bàn đang trống
    currentOrderId: t.currentOrderId ?? null,

    // --- Vị trí trên sơ đồ (nếu có) ---
    posX: t.posX ?? 0,
    posY: t.posY ?? 0,
    width: t.width ?? 120,
    height: t.height ?? 100,
  };
};

/**
 * Map mảng các đối tượng bàn từ BE.
 * Lọc bỏ các phần tử null/undefined để tránh lỗi render.
 *
 * @param {Array} tables - Mảng dữ liệu bàn thô từ BE
 * @returns {Array} - Mảng bàn đã được chuẩn hóa
 */
export const mapTables = (tables) => {
  if (!Array.isArray(tables)) {
    // ⚠️ NOTE BE: Nếu BE không trả về mảng → ghi log và trả về mảng rỗng
    console.warn('[tableMapper] BE không trả về mảng bàn. Nhận được:', typeof tables, tables);
    return [];
  }
  return tables.map(mapTable).filter(Boolean);
};
