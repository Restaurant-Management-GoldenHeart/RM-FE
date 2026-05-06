/**
 * orderApi.js — API Service cho module Đơn hàng (Orders)
 *
 * Lớp này CHỈ có nhiệm vụ gọi HTTP request đến Backend.
 * Không chứa bất kỳ business logic nào.
 *
 * Flow đơn hàng trong BE:
 *   Mở bàn → POST /orders (tạo order + thêm items luôn)
 *   Gọi thêm món → POST /orders (BE tự append vào order hiện tại của bàn)
 *   Phục vụ món  → PUT /orders/order-items/{itemId}/serve
 *   Hủy món      → PUT /kitchen/order-items/{itemId}/status { status: CANCELLED }
 *
 * Endpoints sử dụng:
 *   POST   /orders                               → Tạo order / thêm items vào order hiện tại
 *   GET    /orders/{orderId}                     → Lấy chi tiết order
 *   PUT    /orders/order-items/{itemId}/serve    → Đánh dấu món đã phục vụ
 *   PUT    /kitchen/order-items/{itemId}/status  → Cập nhật trạng thái ở bếp (kể cả hủy)
 */
import apiClient from '../../api/apiClient';

export const orderApi = {

  /**
   * Tạo đơn hàng mới HOẶC thêm món vào đơn hàng đang mở.
   *
   * BE logic thông minh:
   *   - Nếu bàn chưa có order → tạo order mới + thêm items → bàn chuyển OCCUPIED
   *   - Nếu bàn đã có order đang mở → append items vào order hiện tại
   *
   * ⚠️ NOTE BE: API này dùng chung cho cả 2 trường hợp "Mở bàn" và "Gọi thêm món".
   * → Đây là thiết kế cố ý của BE để đơn giản hóa.
   * → FE chỉ cần gọi một endpoint duy nhất này.
   *
   * BE endpoint: POST /api/v1/orders
   * Request body:
   *   {
   *     tableId: number,
   *     branchId: number,
   *     customerId?: number,     (tùy chọn)
   *     items: [
   *       { menuItemId: number, quantity: number, note?: string }
   *     ]
   *   }
   * BE trả về: ApiResponse<Order>
   *
   * @param {{
   *   tableId: number,
   *   branchId: number,
   *   items: Array<{ menuItemId: number, quantity: number, note?: string }>,
   *   customerId?: number
   * }} payload
   * @returns {Promise<ApiResponse>}
   */
  createOrAppendOrder: (payload) =>
    apiClient.post('/orders', payload),

  /**
   * Lấy chi tiết một đơn hàng theo ID.
   * Dùng để đồng bộ trạng thái order với BE sau các thao tác quan trọng.
   *
   * BE endpoint: GET /api/v1/orders/{orderId}
   * BE trả về: ApiResponse<Order>
   *
   * @param {number} orderId - ID của đơn hàng cần lấy
   * @returns {Promise<ApiResponse>}
   */
  getOrder: (orderId) =>
    apiClient.get(`/orders/${orderId}`),

  /**
   * Gán khách hàng vào một đơn hàng.
   * BE endpoint: PUT /api/v1/orders/{orderId}/customer
   * @param {number} orderId
   * @param {number} customerId
   */
  assignCustomerToOrder: (orderId, customerId) =>
    apiClient.put(`/orders/${orderId}/customer`, { customerId }),

  /**
   * Đánh dấu một món ăn đã được phục vụ đến bàn khách.
   * Chỉ có thể phục vụ khi bếp đã COMPLETED/READY.
   *
   * BE endpoint: PUT /api/v1/orders/order-items/{orderItemId}/serve
   * BE trả về: ApiResponse<OrderItem>
   *
   * @param {number} orderItemId - ID của món ăn trong đơn hàng
   * @returns {Promise<ApiResponse>}
   */
  serveOrderItem: (orderItemId) =>
    apiClient.put(`/orders/order-items/${orderItemId}/serve`),

  /**
   * Cập nhật trạng thái món ăn qua hệ thống Bếp (Kitchen workflow).
   * Dùng cho cả việc hủy món (CANCELLED) và cập nhật trạng thái bếp.
   *
   * ⚠️ NOTE BE: Endpoint này thuộc về Kitchen module, không phải Order module.
   * → FE cần gọi /kitchen/order-items (không phải /orders/order-items) để đổi status.
   *
   * Trạng thái hợp lệ: PROCESSING, COMPLETED, CANCELLED
   * Khi hủy (CANCELLED) → bắt buộc phải có 'reason' trong body.
   *
   * BE endpoint: PUT /api/v1/kitchen/order-items/{orderItemId}/status
   * Request body: { status: string, reason?: string }
   * BE trả về: ApiResponse<OrderItem>
   *
   * @param {number} orderItemId  - ID của món ăn trong đơn hàng
   * @param {string} status       - Trạng thái mới (PROCESSING, COMPLETED, CANCELLED)
   * @param {string} [reason]     - Lý do (bắt buộc khi status = CANCELLED)
   * @returns {Promise<ApiResponse>}
   */
  updateItemStatus: (orderItemId, status, reason = null) => {
    const body = { status };
    // Chỉ thêm reason vào body nếu có giá trị (tránh gửi null lên BE)
    if (reason) body.reason = reason;
    return apiClient.put(`/kitchen/order-items/${orderItemId}/status`, body);
  },
};

export default orderApi;
