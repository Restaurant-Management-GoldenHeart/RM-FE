/**
 * tableMergeHelper.js — Tiện ích hỗ trợ tính năng Gộp Bàn Ảo (Virtual Table Proxy)
 *
 * Mục đích:
 * - Tập trung toàn bộ logic liên quan đến Virtual Table Merge ở một chỗ.
 * - UI Component chỉ cần gọi các hàm helper này, không cần biết chi tiết bên trong.
 */

/**
 * Kiểm tra một bàn có hợp lệ để làm "Bàn Chính" (Main Table) không.
 * Điều kiện: Bàn phải đang OCCUPIED hoặc AVAILABLE, không phải bàn con đã gộp.
 *
 * @param {object} table - Đối tượng bàn
 * @param {object} virtualTables - Danh sách bản đồ bàn ảo từ store
 * @returns {boolean}
 */
export const isValidMainTable = (table, virtualTables = []) => {
  // Không hợp lệ nếu đang là bàn đã gộp
  if (table.isMerged) return false;

  // Không hợp lệ nếu trạng thái không phải OCCUPIED hoặc AVAILABLE
  if (!['OCCUPIED', 'AVAILABLE'].includes(table.status)) return false;

  return true;
};

/**
 * Kiểm tra một bàn có hợp lệ để làm "Bàn Phụ" (Child Table) không.
 * Điều kiện: Bàn phải ở trạng thái AVAILABLE hoặc OCCUPIED, không phải bàn ảo.
 *
 * @param {object} table - Đối tượng bàn
 * @returns {boolean}
 */
export const isValidChildTable = (table) => {
  // Cho phép bàn ảo (bàn chính của nhóm đã gộp) được gộp tiếp
  // Chỉ chặn bàn con (isMerged) đã bị khoá
  if (table.isMerged) return false;
  if (!['AVAILABLE', 'OCCUPIED'].includes(table.status)) return false;
  return true;
};

/**
 * Kiểm tra bàn đích có hợp lệ để nhận order chuyển sang không.
 * (Legacy - dùng cho flow gộp 1-1 theo BE)
 *
 * @param {object} table - Đối tượng bàn đích
 * @param {object} mergedTables - Không còn dùng (để backwards compat)
 * @returns {boolean}
 */
export const isValidTargetTable = (table, mergedTables = {}) => {
  if (table.isMerged) return false;
  if (table.isVirtual) return false;
  if (!['AVAILABLE', 'OCCUPIED'].includes(table.status)) return false;
  return true;
};

/**
 * Tạo tên bàn ảo theoFormat: "T01 & T02 & T03"
 *
 * @param {object} mainTable - Bàn chính
 * @param {Array} childTables - Danh sách bàn con
 * @returns {string}
 */
export const generateVirtualName = (mainTable, childTables) => {
  const numbers = [mainTable.tableNumber, ...childTables.map(t => t.tableNumber)];
  return numbers.join(' & ');
};
