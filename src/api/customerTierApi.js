/**
 * customerTierApi.js — Tất cả API liên quan đến Hạng khách hàng (Loyalty Tiers).
 *
 * Endpoints (base: /api/v1/customer-tiers):
 * - GET    /             → Danh sách các hạng (Bronze, Silver, Gold, etc.)
 * - GET    /:id          → Chi tiết một hạng
 * - POST   /             → Tạo hạng mới [ADMIN]
 * - PUT    /:id          → Cập nhật hạng [ADMIN]
 * - DELETE /:id          → Hủy kích hoạt hạng [ADMIN]
 */
import apiClient from './apiClient';

export const customerTierApi = {
  /**
   * Lấy danh sách tất cả các hạng hội viên đang hoạt động.
   * Dùng để hiển thị thông tin giảm giá và lộ trình thăng hạng.
   * @param {boolean} activeOnly - Chỉ lấy các hạng đang active
   */
  getCustomerTiers: (activeOnly = true) => 
    apiClient.get('/customer-tiers', { params: { activeOnly } }),

  /**
   * Lấy chi tiết một hạng hội viên.
   */
  getCustomerTierById: (tierId) => apiClient.get(`/customer-tiers/${tierId}`),
};

export default customerTierApi;
