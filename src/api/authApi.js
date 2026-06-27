/**
 * authApi.js
 *
 * Tất cả các API liên quan đến Xác thực (Authentication).
 *
 * Endpoints (base: /api/v1/auth):
 * - POST /login
 * - POST /refresh  (cookie-based, handled by apiClient interceptor)
 * - POST /logout
 * - GET  /me       → alias sang /employees/me
 */
import apiClient, { setToken, removeToken } from './apiClient';

export const authApi = {
  /**
   * Đăng nhập.
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<{ accessToken, tokenType, expiresAt, username, role }>}
   *   → Đã bóc tách từ ApiResponse.data bởi interceptor
   */
  login: async (credentials) => {
    // apiClient interceptor đã bóc tách → nhận thẳng ApiResponse object
    const apiResponse = await apiClient.post('/auth/login', credentials);
    // apiResponse ở đây là { success, message, data: { accessToken, ... }, timestamp }
    const { accessToken } = apiResponse.data;
    setToken(accessToken);
    return apiResponse; // Trả cả object để store lấy username, role...
  },

  /**
   * Đăng xuất.
   * Backend xóa refreshToken cookie server-side.
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Luôn xóa token dù API có lỗi hay không
      removeToken();
    }
  },

  /**
   * Đăng ký tài khoản mới (role mặc định CUSTOMER).
   * @param {{ username, email, password, fullName }} data
   */
  register: (data) => apiClient.post('/auth/register', data),

  /**
   * Yêu cầu gửi mã OTP khôi phục mật khẩu.
   * @param {{ channel: 'EMAIL'|'SMS', identifier: string }} data
   */
  requestPasswordRecoveryOtp: (data) => apiClient.post('/auth/password-recovery/request-otp', data),

  /**
   * Xác thực mã OTP.
   * @param {{ channel: 'EMAIL'|'SMS', identifier: string, otp: string }} data
   * @returns {Promise<{ resetToken: string }>}
   */
  verifyPasswordRecoveryOtp: (data) => apiClient.post('/auth/password-recovery/verify-otp', data),

  /**
   * Reset mật khẩu mới.
   * @param {{ resetToken: string, newPassword: string }} data
   */
  resetPassword: (data) => apiClient.post('/auth/password-recovery/reset-password', data),

  /**
   * Lấy thông tin profile của user đang đăng nhập.
   * @returns {Promise<EmployeeSelfResponse>}
   */
  getMyProfile: () => apiClient.get('/employees/me'),

  /**
   * Đổi mật khẩu.
   * @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} data
   */
  changePassword: (data) => apiClient.post('/auth/change-password', data),
};

export default authApi;
