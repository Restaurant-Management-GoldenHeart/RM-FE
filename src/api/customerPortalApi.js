/**
 * customerPortalApi.js
 *
 * Toàn bộ các API call của Customer Portal (/api/v1/me/*).
 * Tất cả đều yêu cầu JWT hợp lệ với role CUSTOMER — apiClient interceptor
 * đã tự động đính kèm Authorization header.
 */
import apiClient from './apiClient';

export const customerPortalApi = {
  // ─── Profile ─────────────────────────────────────────────────────────────────

  /** Lấy hồ sơ khách hàng kèm thông tin tier và điểm hiện tại. */
  getProfile: () => apiClient.get('/me/profile'),

  /** Cập nhật thông tin cá nhân (tên, SĐT, địa chỉ, ngày sinh, giới tính). */
  updateProfile: (data) => apiClient.put('/me/profile', data),

  // ─── Loyalty ─────────────────────────────────────────────────────────────────

  /** Lịch sử tích/trừ điểm tích luỹ, phân trang. */
  getLoyaltyTransactions: (page = 0, size = 20) =>
    apiClient.get('/me/loyalty/transactions', { params: { page, size } }),

  // ─── Lịch sử đơn hàng ────────────────────────────────────────────────────────

  /** Lịch sử các đơn hàng đã thanh toán của khách, mới nhất trước. */
  getOrderHistory: (page = 0, size = 10) =>
    apiClient.get('/me/orders', { params: { page, size } }),

  // ─── Món đã ăn ───────────────────────────────────────────────────────────────

  /** Danh sách tất cả món từng gọi, sắp xếp theo số lần gọi nhiều nhất. */
  getDishesEaten: () => apiClient.get('/me/dishes-eaten'),

  // ─── Đánh giá ────────────────────────────────────────────────────────────────

  /**
   * Tạo đánh giá mới.
   * @param {{ type: 'MENU_ITEM'|'BRANCH', orderItemId?: number, branchId?: number, rating: number, comment?: string }} data
   */
  createReview: (data) => apiClient.post('/me/reviews', data),

  /** Danh sách đánh giá của khách đang đăng nhập. */
  getMyReviews: (page = 0, size = 10) =>
    apiClient.get('/me/reviews', { params: { page, size } }),

  // ─── Coupon ──────────────────────────────────────────────────────────────────

  /** Ví coupon của khách — bao gồm có thể dùng, đã dùng và hết hạn. */
  getMyCoupons: (page = 0, size = 10) =>
    apiClient.get('/me/coupons', { params: { page, size } }),

  // ─── Public (không cần đăng nhập) ────────────────────────────────────────────

  /** Đánh giá public của một món ăn — ai cũng xem được. */
  getMenuItemReviews: (menuItemId, page = 0, size = 10) =>
    apiClient.get(`/public/menu-items/${menuItemId}/reviews`, { params: { page, size } }),
};

export default customerPortalApi;
