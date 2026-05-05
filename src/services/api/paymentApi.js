/**
 * paymentApi.js — API Service cho module Thanh toán (Payment)
 *
 * Lớp này CHỈ có nhiệm vụ gọi HTTP request đến Backend.
 * Không chứa bất kỳ business logic nào.
 *
 * Luồng thanh toán trong BE (2 bước):
 *   Bước 1: POST /bills         → Tạo hóa đơn (bill) từ order
 *   Bước 2: POST /bills/{id}/payments → Thêm thanh toán vào bill → nếu đủ tiền → PAID
 *
 * ⚠️ NOTE BE: BE chưa có API atomic /checkout.
 * → 2 bước này không có transaction bao ngoài.
 * → Rủi ro: Nếu bước 2 thất bại sau khi bước 1 thành công → Bill bị "treo" (status UNPAID).
 * → FE phải xử lý lỗi này rõ ràng và thông báo cho người dùng.
 */
import apiClient from '../../api/apiClient';

export const paymentApi = {

  /**
   * Xem trước thông tin thanh toán (Preview Checkout).
   * Dùng để lấy con số chính xác từ BE bao gồm thuế, giảm giá tay,
   * và đặc biệt là chiết khấu hội viên (Loyalty).
   *
   * BE endpoint: GET /api/v1/bills/preview
   * Query Params:
   *   orderId: number,
   *   discount?: number,
   *   taxRate?: number,
   *   applyLoyaltyDiscount?: boolean
   *
   * @param {{
   *   orderId: number,
   *   discount?: number,
   *   taxRate?: number,
   *   applyLoyaltyDiscount?: boolean
   * }} params
   * @returns {Promise<ApiResponse>}
   */
  previewCheckout: (params) =>
    apiClient.get('/bills/preview', { params }),

  /**
   * Bước 1: Tạo hóa đơn (bill) từ một đơn hàng đã có.
   *
   * ⚠️ NOTE BE: Tất cả các món phải ở trạng thái SERVED trước khi tạo bill.
   * → Nếu còn món chưa SERVED → BE trả về lỗi 422.
   * → FE NÊN kiểm tra trạng thái trước khi gọi (để hiển thị thông báo rõ ràng hơn).
   *
   * BE endpoint: POST /api/v1/bills
   * Request body:
   *   {
   *     orderId: number,
   *     taxRate: number,       (phần trăm, ví dụ 10 = 10%)
   *     discount: number,      (số tiền giảm tuyệt đối, đơn vị VND)
   *     paymentMethod: string, (CASH, CARD, QR_CODE)
   *     paidAmount: number     (0 nếu chưa thanh toán ngay, dùng bước 2)
   *   }
   * BE trả về: ApiResponse<Bill>
   *   → Trong đó có: { id, status, subtotal, tax, discount, total, remainingAmount }
   *
   * @param {{
   *   orderId: number,
   *   taxRate: number,
   *   discount: number,
   *   paymentMethod: string,
   *   paidAmount?: number
   * }} payload
   * @returns {Promise<ApiResponse>} - Kết quả chứa billId cần dùng ở bước 2
   */
  createBill: (payload) =>
    apiClient.post('/bills', {
      orderId: payload.orderId,
      taxRate: payload.taxRate ?? 10,
      discount: payload.discount ?? 0,
      applyLoyaltyDiscount: payload.applyLoyaltyDiscount ?? false, // gửi flag loyalty lên BE
      paymentMethod: payload.paymentMethod ?? 'CASH',
      paidAmount: payload.paidAmount ?? 0,
    }),

  /**
   * Bước 2: Thêm một khoản thanh toán vào hóa đơn.
   * Khi tổng paidAmount >= total → Bill chuyển sang PAID → Order COMPLETED → Bàn CLEANING.
   *
   * ⚠️ NOTE BE: Nếu gọi hàm này thất bại sau khi createBill thành công
   * → Bill có status UNPAID trong DB → Bàn vẫn OCCUPIED
   * → Nhân viên phải gọi lại thủ công hoặc liên hệ quản lý.
   *
   * BE endpoint: POST /api/v1/bills/{billId}/payments
   * Request body:
   *   {
   *     amount: number,   (số tiền thanh toán)
   *     method: string    (CASH, CARD, QR_CODE)
   *   }
   * BE trả về: ApiResponse<Bill> - Bill đã cập nhật (có thể status = PAID)
   *
   * @param {number} billId  - ID của bill từ bước 1
   * @param {number} amount  - Số tiền thanh toán
   * @param {string} method  - Phương thức: CASH, CARD, QR_CODE
   * @returns {Promise<ApiResponse>}
   */
  addPayment: (billId, amount, method = 'CASH') =>
    apiClient.post(`/bills/${billId}/payments`, { amount, method }),
};

export default paymentApi;
