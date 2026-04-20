/**
 * tableApi.js — API Service cho module Bàn (Tables)
 *
 * Lớp này CHỈ có nhiệm vụ gọi HTTP request đến Backend.
 * Không chứa bất kỳ business logic nào.
 * Toàn bộ dữ liệu BE trả về sẽ được xử lý ở mapper/store.
 *
 * Endpoints sử dụng:
 *   GET    /tables?branchId={id}        → Lấy danh sách bàn theo chi nhánh
 *   GET    /tables/{id}/active-order    → Lấy đơn hàng đang mở của bàn
 *   PUT    /tables/{id}/status          → Cập nhật trạng thái bàn
 *   POST   /tables/{id}/split           → Tách món sang bàn khác
 *   POST   /tables/merge                → Gộp 2 bàn lại với nhau
 */
import apiClient from '../../api/apiClient';

export const tableApi = {

  /**
   * Lấy danh sách bàn của một chi nhánh.
   *
   * BE endpoint: GET /api/v1/tables?branchId={branchId}
   * BE trả về: ApiResponse<RestaurantTable[]>
   *
   * @param {number} branchId - ID chi nhánh cần lấy danh sách bàn
   * @param {object} config   - Axios config chứa Abort signal (nếu có)
   * @returns {Promise<ApiResponse>}
   */
  getTables: (branchId, config = {}) =>
    apiClient.get('/tables', { ...config, params: { ...config.params, branchId } }),

  /**
   * Lấy thông tin đơn hàng đang mở của một bàn cụ thể.
   * Dùng khi nhân viên bấm vào bàn OCCUPIED để xem order đang chạy.
   *
   * BE endpoint: GET /api/v1/tables/{tableId}/active-order
   * BE trả về: ApiResponse<Order | null>
   *
   * @param {number} tableId - ID của bàn cần kiểm tra
   * @param {object} config  - Axios config chứa Abort signal để huỷ request cũ khi nhảy bàn nhanh
   * @returns {Promise<ApiResponse>}
   */
  getActiveOrder: (tableId, config = {}) =>
    apiClient.get(`/tables/${tableId}/active-order`, config),

  /**
   * Cập nhật trạng thái bàn.
   * Dùng cho các trường hợp: AVAILABLE → RESERVED, CLEANING → AVAILABLE, v.v.
   *
   * ⚠️ NOTE BE: Không thể đổi trạng thái sang OCCUPIED trực tiếp.
   * OCCUPIED chỉ được set bởi hệ thống khi tạo order (POST /orders).
   * → Nếu gửi status=OCCUPIED thủ công sẽ nhận 409 Conflict.
   *
   * @param {number} tableId - ID bàn cần cập nhật
   * @param {string} status  - Trạng thái mới (AVAILABLE, RESERVED, CLEANING)
   * @returns {Promise<ApiResponse>}
   */
  updateTableStatus: (tableId, status) =>
    apiClient.put(`/tables/${tableId}/status`, { status }),

  /**
   * Tách món từ đơn hàng của bàn nguồn sang bàn đích.
   *
   * ⚠️ NOTE BE: BE yêu cầu fromTableId trong URL (không phải fromOrderId).
   * → FE phải truyền table.id (không phải order.id).
   *
   * @param {number}   fromTableId    - ID bàn nguồn (bàn đang có món cần tách)
   * @param {number}   targetTableId  - ID bàn đích (bàn nhận món)
   * @param {Array}    items          - Danh sách món cần chuyển [{ orderItemId, quantity }]
   * @returns {Promise<ApiResponse>}
   */
  splitTable: (fromTableId, targetTableId, items) =>
    apiClient.post(`/tables/${fromTableId}/split`, {
      targetTableId,
      items,
    }),

  /**
   * Gộp 2 bàn lại với nhau.
   *
   * BE endpoint: POST /api/v1/tables/merge
   *
   * @param {number} sourceTableId - ID bàn nguồn (bàn bị giải phóng)
   * @param {number} targetTableId - ID bàn đích (bàn nhận toàn bộ đơn)
   * @returns {Promise<ApiResponse>}
   */
  mergeTables: (sourceTableId, targetTableId) =>
    apiClient.post('/tables/merge', { sourceTableId, targetTableId }),
};

export default tableApi;
