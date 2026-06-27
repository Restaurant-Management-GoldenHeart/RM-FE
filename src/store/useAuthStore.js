/**
 * useAuthStore.js
 *
 * Zustand store quản lý trạng thái xác thực toàn app.
 *
 * State:
 *   - user: { id, username, fullName, email, role, ... } | null
 *   - role: string | null  ("ADMIN" | "MANAGER" | "STAFF" | "KITCHEN" | "CUSTOMER")
 *   - isAuthenticated: boolean
 *   - loading: boolean
 *   - error: string | null
 *
 * Persistence: accessToken lưu ở localStorage (xử lý bởi apiClient.js)
 */
import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { getToken, removeToken } from '../api/apiClient';

// Parse JWT payload locally (không cần verify — backend verify trên mỗi request)
function parseJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

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
      const apiResponse = await authApi.login(credentials);
      const { username, role } = apiResponse.data;

      // Fetch profile chi tiết ngay sau login
      let user = { username, role };
      try {
        const profileRes = await authApi.getMyProfile();
        user = { ...profileRes.data, role };

        // Lưu branchId vào localStorage để interceptor lấy được
        if (user.branchId) {
          localStorage.setItem('lastBranchId', user.branchId.toString());
        }
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
   * Không set loading:true để tránh unmount các page đang hiển thị thông báo sau logout.
   */
  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Dù API lỗi vẫn clear state
    } finally {
      removeToken();
      localStorage.removeItem('lastBranchId');
      localStorage.removeItem('selected_branch_id');
      localStorage.removeItem('selected_branch_name');
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
   * - CUSTOMER: dùng JWT payload (không cần /employees/me)
   * - Staff roles: fetch /employees/me để lấy đầy đủ thông tin
   */
  initAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, loading: false });
      return;
    }

    const payload = parseJwtPayload(token);
    if (!payload) {
      removeToken();
      set({ isAuthenticated: false, loading: false });
      return;
    }

    // CUSTOMER không có quyền vào /employees/me → dùng claims từ JWT
    if (payload.role === 'CUSTOMER') {
      set({
        user: {
          username: payload.sub,
          userId: payload.userId,
          role: 'CUSTOMER',
        },
        role: 'CUSTOMER',
        isAuthenticated: true,
        loading: false,
      });
      return;
    }

    // Staff roles: fetch full employee profile
    set({ loading: true });
    try {
      const profileRes = await authApi.getMyProfile();
      const profile = profileRes.data;

      // roleName từ /employees/me (field: roleName) hoặc role
      const role = profile.roleName || profile.role || null;
      const user = { ...profile, role };

      // Sync branchId vào localStorage
      if (user.branchId) {
        localStorage.setItem('lastBranchId', user.branchId.toString());
      }

      set({ user, role, isAuthenticated: true, loading: false });
    } catch (err) {
      // Token hết hạn hoặc không hợp lệ → chỉ logout hoàn toàn khi 401
      if (err?.status === 401) {
        removeToken();
        localStorage.removeItem('lastBranchId');
        set({ user: null, role: null, isAuthenticated: false, loading: false });
      } else {
        set({ loading: false });
      }
    }
  },

  /**
   * Cập nhật thông tin user sau khi edit profile thành công.
   */
  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
