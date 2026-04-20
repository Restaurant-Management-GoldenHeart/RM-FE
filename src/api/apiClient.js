/**
 * apiClient.js — Axios instance dùng chung cho toàn bộ dự án
 *
 * TÍNH NĂNG (PRODUCTION GRADE):
 * 1. Tự động gắn Bearer token vào mọi request
 * 2. Tự động inject branchId từ authStore (không cần hardcode)
 * 3. Refresh token tự động khi nhận 401
 * 4. Retry tự động 2 lần cho GET request khi lỗi mạng/server
 * 5. Dọn dẹp params rỗng để tránh lỗi Backend Reflection
 * 6. Timeout 10s để tránh treo app
 * 7. Error Classification: Phân loại Network / Business / Server lỗi
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
  timeout: 10000, // Timeout 10s: Tránh request bị treo vĩnh viễn (Production requirement)
  
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
export const getToken = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
};
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
  }
};
export const removeToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  delete apiClient.defaults.headers.common['Authorization'];
};

/**
 * Loại bỏ các tham số rỗng (null, undefined, "")
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

// ─── REQUEST INTERCEPTOR ────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // 1. Gắn Token xác thực
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Dọn dẹp params rỗng
    if (config.params) {
      config.params = cleanParams(config.params);
    }

    // 3. Tự động inject branchId (Lấy từ localStorage để tránh circular dependency với store)
    const branchId = localStorage.getItem('lastBranchId');

    if (branchId) {
      if (config.params && !config.params.branchId) {
        config.params = { ...config.params, branchId };
      } else if (!config.params && config.method?.toLowerCase() === 'get') {
        config.params = { branchId };
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  // Bóc tách lớp ApiResponse của BE: trả thẳng { success, message, data }
  (response) => response.data,

  async (error) => {
    // Nếu request bị chủ động cancel (AbortController), trả về lỗi cancel ngay
    if (axios.isCancel(error)) {
      console.log(`[API_CANCELLED] Bỏ qua request đã huỷ: ${error.message}`);
      return Promise.reject({ type: 'CANCELLED', message: 'Request đã bị huỷ', isCancelled: true });
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    // ── 1. CƠ CHẾ REFRESH TOKEN (401) ─────────────
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

    // ── 2. RETRY TỰ ĐỘNG (CHỈ GET, LỖI MẠNG HOẶC SERVER >= 500) ──────────
    // KHÔNG RETRY POST/PUT để tránh duplicate dữ liệu
    const isGetRequest = originalRequest?.method?.toLowerCase() === 'get';
    const isNetworkError = !error.response || error.code === 'ECONNABORTED'; // Bị timeout hoặc mất mạng
    const isServerError = status >= 500;
    const retryCount = originalRequest?._retryCount ?? 0;
    const MAX_RETRY = 2;

    if (originalRequest && isGetRequest && (isNetworkError || isServerError) && retryCount < MAX_RETRY) {
      originalRequest._retryCount = retryCount + 1;
      const delaySeconds = originalRequest._retryCount;
      console.warn(`[API_RETRY] ${originalRequest.url} — Thử lại lần ${originalRequest._retryCount}/${MAX_RETRY} sau ${delaySeconds}s`);
      
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      return apiClient(originalRequest);
    }

    // ── 3. ERROR CLASSIFICATION (Phân loại Lỗi) ─────────────────
    let type = 'UNKNOWN';
    if (isNetworkError) {
      type = 'NETWORK';
    } else if (status >= 400 && status < 500) {
      type = 'BUSINESS';
    } else if (isServerError) {
      type = 'SERVER';
    }

    // Ghi log chuẩn định dạng cho việc debug trên production
    console.error(`[API_ERROR][${type}]`, {
      endpoint: originalRequest?.url,
      method: originalRequest?.method?.toUpperCase(),
      status: status,
      message: error.response?.data?.message || error.message,
    });

    const normalizedError = {
      status,
      type, // 'NETWORK' | 'BUSINESS' | 'SERVER'
      message: error.response?.data?.message || (isNetworkError ? 'Lỗi kết nối mạng hoặc server không phản hồi' : 'Đã có lỗi xảy ra'),
      raw: error.response?.data,
      isCancelled: false
    };

    return Promise.reject(normalizedError);
  },
);

export default apiClient;
