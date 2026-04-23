/**
 * menuApi.js
 *
 * Tất cả các API liên quan đến Menu Items.
 *
 * Endpoints (base: /api/v1/menu-items):
 * - GET    /             → Danh sách menu items (phân trang, lọc)
 * - GET    /:id          → Chi tiết menu item
 * - POST   /             → Tạo mới [ADMIN]
 * - PUT    /:id          → Cập nhật [ADMIN]
 * - DELETE /:id          → Xóa [ADMIN]
 *
 * Response đã được apiClient interceptor bóc tách từ ApiResponse.
 * → data = { content, page, size, totalElements, totalPages, last } (paginated)
 */
import apiClient from './apiClient';

export const menuApi = {
  /**
   * Lấy danh sách menu items (phân trang).
   *
   * @param {{ keyword?: string, branchId?: number, categoryId?: number, page?: number, size?: number }} params
   * @returns {Promise<ApiResponse<PageResponse<MenuItemResponse>>>}
   */
  getMenuItems: ({ keyword = '', branchId, categoryId, page = 0, size = 10 } = {}) => {
    const params = { page, size };
    if (keyword?.trim()) params.keyword = keyword.trim();
    if (branchId) params.branchId = branchId;
    if (categoryId) params.categoryId = categoryId;
    return apiClient.get('/menu-items', { params });
  },

  /**
   * Lấy chi tiết menu item theo ID.
   *
   * @param {number} menuItemId
   * @returns {Promise<ApiResponse<MenuItemResponse>>}
   */
  getMenuItemById: (menuItemId) => apiClient.get(`/menu-items/${menuItemId}`),

  /**
   * Tạo mới menu item (kèm recipe).
   *
   * @param {{
   *   branchId: number,
   *   categoryId: number,
   *   name: string,
   *   description?: string,
   *   price: number,
   *   status: string,           // "AVAILABLE" | "UNAVAILABLE"
   *   recipes: { ingredientId: number, quantity: number }[]
   * }} payload
   * @returns {Promise<ApiResponse<MenuItemResponse>>}
   *
   * Yêu cầu Role: ADMIN
   */
  createMenuItem: (payload) => apiClient.post('/menu-items', payload),

  /**
   * Cập nhật menu item.
   *
   * @param {number} menuItemId
   * @param {object} payload - Tương tự createMenuItem
   * @returns {Promise<ApiResponse<MenuItemResponse>>}
   *
   * Yêu cầu Role: ADMIN
   */
  updateMenuItem: (menuItemId, payload) => apiClient.put(`/menu-items/${menuItemId}`, payload),

  /**
   * Xóa menu item.
   *
   * @param {number} menuItemId
   * @returns {Promise<ApiResponse<void>>}
   *
   * Yêu cầu Role: ADMIN
   */
  deleteMenuItem: (menuItemId) => apiClient.delete(`/menu-items/${menuItemId}`),

  /**
   * Lấy danh sách danh mục món ăn từ database.
   *
   * @returns {Promise<ApiResponse<CategoryResponse[]>>}
   */
  getCategories: () => apiClient.get('/menu-categories'),
};

export default menuApi;
