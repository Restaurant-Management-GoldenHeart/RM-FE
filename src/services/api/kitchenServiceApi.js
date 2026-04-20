/**
 * kitchenServiceApi.js — API Service cho module Bếp (Kitchen)
 *
 * Lớp này CHỈ có nhiệm vụ gọi HTTP request đến Backend.
 * Không chứa bất kỳ business logic nào.
 *
 * Endpoints sử dụng:
 *   GET  /kitchen/orders/pending?branchId={id}   → Lấy danh sách món chờ bếp xử lý
 *   PUT  /kitchen/order-items/{itemId}/status     → Cập nhật trạng thái món ở bếp
 */
import apiClient from '../../api/apiClient';

export const kitchenServiceApi = {

  /**
   * Lấy danh sách các món ăn đang chờ bếp xử lý (PENDING/PROCESSING).
   * Đây là API chính cho màn hình KDS (Kitchen Display System).
   *
   * ⚠️ NOTE BE: API trả về mảng chứa các OrderItem đang ở trạng thái chờ.
   * → FE cần mapping từ response về format KitchenItem.
   * → Polling mỗi 3 giây để cập nhật realtime (chưa có WebSocket).
   *
   * ⚠️ NOTE BE: Nếu thiếu branchId → BE có thể trả về toàn bộ hoặc lỗi 400.
   * → Luôn truyền branchId để đảm bảo an toàn.
   *
   * BE endpoint: GET /api/v1/kitchen/orders/pending?branchId={branchId}
   * BE trả về: ApiResponse<OrderItemResponse[]>
   *
   * @param {number} branchId - ID chi nhánh cần lấy danh sách món bếp
   * @returns {Promise<ApiResponse>}
   */
  getPendingItems: (branchId) =>
    apiClient.get('/kitchen/orders/pending', { params: { branchId } }),

  /**
   * Cập nhật trạng thái xử lý của một món ăn ở bếp.
   *
   * Luồng trạng thái bếp:
   *   PENDING → PROCESSING (bắt đầu nấu, trừ nguyên liệu từ kho)
   *   PROCESSING → COMPLETED (hoàn tất nấu)
   *   PENDING/PROCESSING → CANCELLED + reason (hủy món)
   *
   * ⚠️ NOTE BE: Khi chuyển sang PROCESSING → BE sẽ trừ nguyên liệu từ kho.
   * → Nếu thiếu nguyên liệu → BE trả về lỗi 409 Conflict.
   *
   * ⚠️ NOTE BE: Có 2 endpoint xử lý COMPLETE:
   *   1. PUT  /kitchen/order-items/{id}/status → { status: "COMPLETED" } — dùng chuỗi này
   *   2. POST /kitchen/order-items/{id}/complete                         — endpoint riêng
   * → Nếu gọi cả 2, nguyên liệu bị trừ 2 lần! (BUG đã ghi nhận trong Runbook)
   * → FE CHỈ dùng endpoint /status để tránh trùng lặp.
   *
   * BE endpoint: PUT /api/v1/kitchen/order-items/{orderItemId}/status
   * Request body: { status: string, reason?: string }
   * BE trả về: ApiResponse<OrderItem>
   *
   * @param {number} orderItemId  - ID món ăn cần cập nhật
   * @param {string} status       - Trạng thái mới: PROCESSING, COMPLETED, CANCELLED
   * @param {string} [reason]     - Lý do (bắt buộc khi CANCELLED)
   * @returns {Promise<ApiResponse>}
   */
  updateItemStatus: (orderItemId, status, reason = null) => {
    const body = { status };
    // Chỉ thêm reason vào body nếu thực sự có giá trị
    if (reason) body.reason = reason;
    return apiClient.put(`/kitchen/order-items/${orderItemId}/status`, body);
  },
};

export default kitchenServiceApi;
