/**
 * branchHelper.js
 * Tiện ích xử lý tên chi nhánh: bỏ prefix thương hiệu dư thừa.
 */

const PREFIXES = [
  'Golden Heart - ',
  'GoldenHeart - ',
  'Golden Heart- ',
  'GoldenHeart- ',
];

/**
 * Bỏ prefix nhà hàng khỏi tên chi nhánh để hiển thị gọn hơn.
 * VD: "Golden Heart - Chi nhánh Quận 1" → "Chi nhánh Quận 1"
 * @param {string} name
 * @returns {string}
 */
export function stripBranchPrefix(name) {
  if (!name) return '';
  for (const prefix of PREFIXES) {
    if (name.startsWith(prefix)) {
      return name.slice(prefix.length).trim();
    }
  }
  return name;
}
