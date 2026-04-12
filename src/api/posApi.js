import apiClient from './apiClient';

/**
 * posService
 * 
 * Sử dụng chung apiClient để tận dụng cơ chế interceptor, 
 * gắn token và tự động refresh token đồng nhất toàn hệ thống.
 */
export const posService = {
  // Tables — GET /api/v1/tables (HIỆN TẠI CHƯA CÓ TRÊN BE -> DÙNG MOCK)
  // getTables: () => apiClient.get('tables'),

  // Menu — GET /api/v1/menu-items (SỬ DỤNG API THẬT TỪ BE)
  getMenuItems: (params) => apiClient.get('menu-items', { params: { size: 100, ...params } }),

  // Orders — POST /api/v1/orders (HIỆN TẠI CHƯA CÓ TRÊN BE -> GIẢ LẬP TRÊN FRONTEND)
  // createOrder: (orderData) => apiClient.post('orders', orderData),

  // Bills — POST /api/v1/bills (HIỆN TẠI CHƯA CÓ TRÊN BE)
  // createBill: (billData) => apiClient.post('bills', billData),
};

export default posService;
