/**
 * apiClient.js
 *
 * Axios instance dùng chung cho toàn bộ dự án.
 */
import axios from 'axios';

// --- CONSTANTS ---
const BASE_URL = '/api/v1';
const ACCESS_TOKEN_KEY = 'accessToken';

// --- CREATE INSTANCE ---
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // Tự động bỏ qua các tham số rỗng (null, undefined, "") 
  // để bảo vệ Backend khỏi lỗi Reflection naming.
  paramsSerializer: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      const val = params[key];
      if (val !== null && val !== undefined && val !== '') {
        searchParams.append(key, val);
      }
    });
    return searchParams.toString();
  },
});

// --- TOKEN HELPERS ---
export const getToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

// --- INTERCEPTORS ---

// 1. Request Interceptor: Gắn token vào header
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Xử lý lỗi toàn cục
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Lỗi 401: Hết hạn token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Thực tế: Gọi API refresh token ở đây
        // const { data } = await axios.post('/api/auth/refresh');
        // setToken(data.accessToken);
        // return apiClient(originalRequest);
        
        // Hiện tại: Xóa token và bắt login lại
        removeToken();
        window.location.href = '/login';
      } catch (refreshError) {
        removeToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Lỗi 403: Không có quyền (RBAC)
    if (error.response?.status === 403) {
      console.error('Permission Denied:', error.response.data);
    }

    // Xử lý thông báo lỗi từ Backend (Spring Boot Validation)
    const responseData = error.response?.data;
    if (responseData && responseData.errors) {
       // Ghép các lỗi validation thành 1 chuỗi hoặc để Hook xử lý
       error.validationErrors = responseData.errors;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
