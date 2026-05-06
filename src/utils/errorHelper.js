/**
 * errorHelper.js
 *
 * Bộ công cụ chuẩn hóa và dịch thông báo lỗi từ Backend (Spring Boot)
 * sang tiếng Việt rõ ràng, thân thiện với người dùng.
 */

// ─── Bảng dịch lỗi field chuẩn Spring Validation → Tiếng Việt ───────────────
const FIELD_LABELS = {
  ingredientName: 'Tên nguyên liệu',
  quantity:       'Số lượng',
  minStockLevel:  'Tồn kho tối thiểu',
  reorderLevel:   'Mức tái đặt hàng',
  averageUnitCost:'Giá vốn',
  unitId:         'Đơn vị tính',
  branchId:       'Chi nhánh',
  name:           'Tên món ăn',
  price:          'Giá bán',
  categoryId:     'Danh mục',
  username:       'Tên đăng nhập',
  password:       'Mật khẩu',
  fullName:       'Họ và tên',
  email:          'Email',
  phone:          'Số điện thoại',
  roleId:         'Vai trò',
  salary:         'Lương',
  address:        'Địa chỉ',
  dateOfBirth:    'Ngày sinh',
};

// ─── Bảng dịch pattern lỗi từ message tiếng Anh → Tiếng Việt ─────────────────
const ERROR_PATTERNS = [
  // Trùng lặp / đã tồn tại
  { pattern: /already exists|duplicate|already been taken/i,
    msg: 'Thông tin này đã tồn tại trong hệ thống.' },
  { pattern: /duplicate entry/i,
    msg: 'Dữ liệu bị trùng lặp. Vui lòng kiểm tra lại.' },

  // Ràng buộc khoá ngoại
  { pattern: /foreign key constraint/i,
    msg: 'Không thể thực hiện: dữ liệu đang được liên kết với bản ghi khác.' },
  { pattern: /cannot delete.*referenced|still referenced/i,
    msg: 'Không thể xoá vì dữ liệu này đang được sử dụng ở nơi khác.' },

  // Không tìm thấy
  { pattern: /not found|does not exist/i,
    msg: 'Không tìm thấy dữ liệu yêu cầu.' },

  // Thiếu nguyên liệu / tồn kho
  { pattern: /insufficient stock|not enough stock|out of stock/i,
    msg: 'Không đủ nguyên liệu trong kho để thực hiện thao tác này.' },
  { pattern: /insufficient stock for ingredient[:\s]+([^.]+)/i,
    template: (m) => `Thiếu nguyên liệu: ${m[1].trim()}` },

  // Quyền truy cập
  { pattern: /access denied|forbidden|permission denied/i,
    msg: 'Bạn không có quyền thực hiện thao tác này.' },
  { pattern: /unauthorized|unauthenticated/i,
    msg: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },

  // Định dạng / validate
  { pattern: /must be (greater|less|positive|not blank|not null)/i,
    msg: 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại.' },
  { pattern: /invalid (email|format|value)/i,
    msg: 'Định dạng không hợp lệ. Vui lòng kiểm tra lại.' },
  { pattern: /size must be between/i,
    msg: 'Độ dài không hợp lệ. Vui lòng kiểm tra lại.' },

  // Xung đột nghiệp vụ
  { pattern: /conflict/i,
    msg: 'Thao tác xung đột với dữ liệu hiện tại.' },

  // Lỗi server
  { pattern: /internal server error|500/i,
    msg: 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ kỹ thuật.' },
];

/**
 * Dịch message lỗi từ backend sang tiếng Việt.
 * @param {string} rawMsg - Message gốc từ BE
 * @returns {string}
 */
function translateMessage(rawMsg) {
  if (!rawMsg) return null;
  for (const { pattern, msg, template } of ERROR_PATTERNS) {
    const match = rawMsg.match(pattern);
    if (match) {
      return template ? template(match) : msg;
    }
  }
  return null;
}

/**
 * Dịch tên field lỗi sang tiếng Việt để hiển thị trong toast.
 * @param {string} field - Tên field BE trả về
 * @param {string} message - Nội dung lỗi
 * @returns {string}
 */
function formatFieldError(field, message) {
  const label = FIELD_LABELS[field] || field;
  const translated = translateMessage(message);
  const msgText = translated || message || 'Không hợp lệ';
  return `${label}: ${msgText}`;
}

/**
 * extractErrorMessage — Trích xuất và dịch thông báo lỗi từ Axios error.
 *
 * Ưu tiên:
 *   1. Field validation errors (Spring @Valid) → lấy lỗi đầu tiên
 *   2. Message tổng quát từ ApiResponse → dịch sang tiếng Việt
 *   3. Network error → thông báo mất kết nối
 *   4. Default message
 *
 * @param {Error} err - Axios error object
 * @param {string} defaultMsg - Thông báo mặc định nếu không parse được
 * @returns {string}
 */
export const extractErrorMessage = (err, defaultMsg = 'Đã xảy ra lỗi hệ thống') => {
  const data = err?.response?.data;
  const status = err?.response?.status;

  // 1. Field-level validation errors từ Spring Boot @Valid
  if (data?.errors && typeof data.errors === 'object') {
    const firstField = Object.keys(data.errors)[0];
    const firstMsg = data.errors[firstField];
    return formatFieldError(firstField, firstMsg);
  }

  // 2. Message tổng quát từ BE
  if (data?.message) {
    const translated = translateMessage(data.message);
    return translated || data.message;
  }

  // 3. HTTP status code fallback
  if (status) {
    if (status === 400) return 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.';
    if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
    if (status === 409) return 'Thao tác xung đột. Dữ liệu có thể đã tồn tại hoặc đang được sử dụng.';
    if (status === 422) return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
    if (status >= 500) return 'Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ kỹ thuật.';
  }

  // 4. Network error
  if (!err?.response || err?.message === 'Network Error') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  return err?.message || defaultMsg;
};

/**
 * extractAllFieldErrors — Lấy toàn bộ lỗi validation dạng object {field: message}
 * đã được dịch sang tiếng Việt.
 *
 * @param {Error} err - Axios error object
 * @returns {Object.<string, string>} - { fieldName: 'Thông báo lỗi tiếng Việt' }
 */
export const extractAllFieldErrors = (err) => {
  const data = err?.response?.data;
  if (!data?.errors || typeof data.errors !== 'object') return {};

  const result = {};
  for (const [field, message] of Object.entries(data.errors)) {
    result[field] = translateMessage(message) || message;
  }
  return result;
};

/**
 * Helper để log lỗi trong console cho developer
 */
export const logError = (context, err) => {
  console.error(`[Error in ${context}]:`, err);
};
