/**
 * customerApi.js — Tất cả API liên quan đến Khách hàng.
 *
 * Endpoints (base: /api/v1/customers):
 * - GET    /             → Danh sách phân trang
 * - GET    /:id          → Chi tiết
 * - POST   /             → Tạo mới [ADMIN, MANAGER]
 * - PUT    /:id          → Cập nhật [ADMIN, MANAGER]
 * - DELETE /:id          → Xóa mềm [ADMIN]
 */
import apiClient from './apiClient';

export const customerApi = {
  /**
   * @param {{ keyword?: string, page?: number, size?: number }} params
   */
  getCustomers: ({ keyword = '', page = 0, size = 10 } = {}) => {
    const params = { page, size };
    if (keyword?.trim()) params.keyword = keyword.trim();
    return apiClient.get('/customers', { params });
  },

  getCustomerById: (customerId) => apiClient.get(`/customers/${customerId}`),

  /**
   * @param {{
   *   name: string, email: string, phone: string,
   *   customerCode?: string, address?: string,
   *   dateOfBirth?: string, gender?: string, note?: string
   * }} payload
   */
  createCustomer: (payload) => apiClient.post('/customers', payload),

  updateCustomer: (customerId, payload) => apiClient.put(`/customers/${customerId}`, payload),

  deleteCustomer: (customerId) => apiClient.delete(`/customers/${customerId}`),
};

export default customerApi;
