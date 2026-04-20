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
   * Lấy thông tin profile của user đang đăng nhập.
   * @param {object} [config] - Cấu hình axios bổ sung
   * @returns {Promise<EmployeeSelfResponse>}
   */
  getMyProfile: (config) => apiClient.get('/employees/me', config),
};

export default authApi;
