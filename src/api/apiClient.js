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

/**
 * Tiện ích loại bỏ các tham số rỗng (null, undefined, "")
 * để tránh lỗi reflection phía Spring Boot khi không có flag -parameters.
 */
const cleanParams = (params) => {
  if (!params || typeof params !== 'object') return params;
  const clean = { ...params };
  Object.keys(clean).forEach((key) => {
    const val = clean[key];
    if (val === null || val === undefined || val === '') {
      delete clean[key];
    }
  });
  return clean;
};

// --- REFRESH LOGIC (Singleton pattern) ---
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

// --- REQUEST INTERCEPTOR ---
apiClient.interceptors.request.use(
  (config) => {
    // 1. Gắn Token
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 2. Tự động dọn dẹp params rỗng để tránh lỗi Backend Reflection
    if (config.params) {
      config.params = cleanParams(config.params);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// --- RESPONSE INTERCEPTOR ---
apiClient.interceptors.response.use(
  (response) => response.data, // Unwrap ApiResponse: { success, message, data }
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Tránh loop vô tận hoặc refresh cho chính API login/refresh
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
    
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint && getToken()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newAccessToken = refreshRes.data?.data?.accessToken;

        if (newAccessToken) {
          setToken(newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeToken();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const normalizedError = {
      status,
      message: error.response?.data?.message || error.message || 'Đã có lỗi xảy ra',
      raw: error.response?.data,
    };

    return Promise.reject(normalizedError);
  },
);

export default apiClient;
