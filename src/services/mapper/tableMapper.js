/**
 * tableMapper.js — Chuyển đổi dữ liệu Bàn từ BE sang định dạng FE
 *
 * Mục đích:
 * - Chuẩn hóa dữ liệu từ BE (có thể thay đổi) sang một format ổn định cho FE.
 * - Nếu BE đổi tên trường → chỉ cần sửa mapper này, không cần chạm vào UI.
 * - Xử lý defensive: trường hợp BE thiếu field → dùng giá trị mặc định an toàn.
 *
 * Cấu trúc BE trả về (RestaurantTableResponse):
 *   {
 *     id, branchId, branchName, areaId, areaName,
 *     tableNumber, capacity, posX, posY, width, height, displayOrder,
 *     status, merged, mergeRoot, mergeRootId, mergeRootTableNumber,
 *     displayName, mergedTableIds, mergedTableNames
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
    branchName: t.branchName ?? null,
    areaId: t.areaId ?? null,
    areaName: t.areaName ?? null,

    // --- Hiển thị ---
    tableNumber: t.tableNumber || `Bàn ${t.id}`,
    displayName: t.displayName || t.tableNumber || `Bàn ${t.id}`,
    capacity: t.capacity ?? 4,
    displayOrder: t.displayOrder ?? null,

    // --- Vị trí trên sơ đồ ---
    posX: t.posX ?? 0,
    posY: t.posY ?? 0,
    width: t.width ?? 120,
    height: t.height ?? 100,

    // --- Trạng thái ---
    // AVAILABLE | OCCUPIED | RESERVED | CLEANING
    status: t.status || 'AVAILABLE',

    // --- Gộp bàn (BE native merge) ---
    // BE tự quản lý merge: merged=true khi bàn thuộc nhóm gộp
    merged: t.merged ?? false,
    mergeRoot: t.mergeRoot ?? false,        // true = đây là bàn gốc của nhóm
    mergeRootId: t.mergeRootId ?? null,
    mergeRootTableNumber: t.mergeRootTableNumber ?? null,
    mergedTableIds: t.mergedTableIds ?? [],
    mergedTableNames: t.mergedTableNames ?? [],

    // --- Liên kết đơn hàng ---
    // BE không trả về currentOrderId trực tiếp;
    // FE tự load order riêng khi cần qua GET /tables/{id}/active-order
    currentOrderId: t.currentOrderId ?? null,
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
    console.warn('[tableMapper] BE không trả về mảng bàn. Nhận được:', typeof tables, tables);
    return [];
  }
  return tables.map(mapTable).filter(Boolean);
};
