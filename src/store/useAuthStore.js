/**
 * useAuthStore.js
 *
 * Zustand store quản lý trạng thái xác thực toàn app.
 *
 * State:
 *   - user: { id, username, fullName, email, role, ... } | null
 *   - role: string | null  ("ADMIN" | "MANAGER" | "STAFF" | "KITCHEN")
 *   - isAuthenticated: boolean
 *   - loading: boolean
 *   - error: string | null
 *
 * Persistence: accessToken lưu ở localStorage (xử lý bởi apiClient.js)
 */
import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { getToken, removeToken } from '../api/apiClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  /**
   * Đăng nhập.
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<boolean>} true = success
   */
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      // authApi.login lưu token và trả về full ApiResponse
      const apiResponse = await authApi.login(credentials);
      // apiResponse = { success, message, data: { accessToken, username, role, ... } }
      const { username, role } = apiResponse.data;

      // Fetch thêm profile chi tiết ngay sau login
      let user = { username, role };
      try {
        const profileRes = await authApi.getMyProfile();
        user = { ...profileRes.data, role };
      } catch {
        // Nếu profile lỗi, dùng thông tin cơ bản từ login
      }

      set({ user, role, isAuthenticated: true, loading: false, error: null });
      return true;
    } catch (err) {
      const message = err?.message || 'Đăng nhập thất bại. Kiểm tra lại tài khoản.';
      set({ loading: false, error: message, isAuthenticated: false });
      return false;
    }
  },

  /**
   * Đăng xuất.
   */
  logout: async () => {
    set({ loading: true });
    try {
      await authApi.logout();
    } catch {
      // Dù API lỗi vẫn clear state
    } finally {
      removeToken();
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      });
    }
  },

  /**
   * Khởi tạo auth state khi app mount.
   * Nếu có token trong localStorage → fetch profile để verify.
   */
  initAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, loading: false });
      return;
    }

    set({ loading: true });
    try {
      const profileRes = await authApi.getMyProfile();
      const profile = profileRes.data;
      // roleName từ /employees/me  (field: roleName)
      const role = profile.roleName || profile.role || null;
      set({
        user: { ...profile, role },
        role,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      // Token hết hạn hoặc không hợp lệ
      removeToken();
      set({ user: null, role: null, isAuthenticated: false, loading: false });
    }
  },

  /**
   * Cập nhật thông tin user sau khi edit profile thành công.
   */
  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
