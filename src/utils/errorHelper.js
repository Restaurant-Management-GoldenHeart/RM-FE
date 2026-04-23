/**
 * errorHelper.js
 * 
 * Bộ công cụ chuẩn hóa việc trích xuất thông báo lỗi từ Backend (Spring Boot).
 */

export const extractErrorMessage = (err, defaultMsg = 'Đã xảy ra lỗi hệ thống') => {
  const data = err.response?.data;

  // 1. Nếu có danh sách lỗi validation cho từng trường (field errors)
  if (data?.errors && typeof data.errors === 'object') {
    const firstErrorField = Object.keys(data.errors)[0];
    const firstErrorMessage = data.errors[firstErrorField];
    return `${firstErrorMessage}`;
  }

  // 2. Nếu có thông báo lỗi logic tổng quát từ Backend
  if (data?.message) {
    return data.message;
  }

  // 3. Nếu lỗi mạng hoặc không phản hồi
  if (err.message === 'Network Error') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra internet.';
  }

  // 4. Lỗi mặc định
  return err.message || defaultMsg;
};

/**
 * Helper để hiển thị lỗi trong console cho developer (tùy chọn)
 */
export const logError = (context, err) => {
  console.error(`[Error in ${context}]:`, err);
};
