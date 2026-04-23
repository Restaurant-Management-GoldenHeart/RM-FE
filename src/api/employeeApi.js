/**
 * employeeApi.js
 *
 * Tất cả các API liên quan đến Nhân viên (Employee & Role).
 *
 * Endpoints (base: /api/v1/employees):
 * - GET    /             → Danh sách nhân viên (phân trang + tìm kiếm)
 * - GET    /:id          → Chi tiết một nhân viên
 * - POST   /             → Tạo mới nhân viên [ADMIN, MANAGER]
 * - PUT    /:id          → Cập nhật thông tin nhân viên [ADMIN, MANAGER]
 * - DELETE /:id          → Xóa mềm nhân viên [ADMIN]
 * - GET    /me           → Lấy profile bản thân [Authenticated]
 * - PUT    /me           → Cập nhật profile bản thân [Authenticated]
 *
 * Endpoint (base: /api/v1/roles):
 * - GET    /             → Lấy tất cả roles [ADMIN, MANAGER]
 *
 * Tất cả response đã được apiClient interceptor bóc tách từ ApiResponse.
 * → Caller nhận được: { success, message, data: <payload>, timestamp }
 * → Với danh sách phân trang: data = { content, page, size, totalElements, totalPages, last }
 */
import apiClient from './apiClient';

/**
 * Tiện ích loại bỏ các tham số rỗng (null, undefined, "")
 * để tránh lỗi reflection phía Spring Boot khi không có flag -parameters.
 */
const cleanParams = (params) => {
  const clean = {};
  Object.keys(params).forEach((key) => {
    const val = params[key];
    if (val !== null && val !== undefined && val !== '') {
      clean[key] = val;
    }
  });
  return clean;
};

export const employeeApi = {
  // ─── LOOKUPS ─────────────────────────────────────────────────────────────
  /**
   * Lấy danh sách chi nhánh từ API chính thức.
   * 
   * @returns {Promise<ApiResponse<BranchResponse[]>>}
   */
  getBranches: () => apiClient.get('/branches', { params: { restaurantId: 1 } }),

  // ─── LIST & DETAIL ───────────────────────────────────────────────────────

  /**
   * Lấy danh sách nhân viên (hỗ trợ phân trang và tìm kiếm theo keyword).
   *
   * @param {{ keyword?: string, page?: number, size?: number }} params
   * @returns {Promise<ApiResponse<PageResponse<EmployeeResponse>>>}
   *
   * Response.data có dạng PageResponse:
   * {
   *   content: EmployeeResponse[],
   *   page: number,
   *   size: number,
   *   totalElements: number,
   *   totalPages: number,
   *   last: boolean
   * }
   *
   * Yêu cầu Role: ADMIN | MANAGER
   */
  getEmployees: ({ keyword = '', page = 0, size = 10 } = {}) => {
    const params = cleanParams({
      keyword: keyword?.trim(),
      page,
      size,
    });
    return apiClient.get('/employees', { params });
  },

  /**
   * Lấy thông tin chi tiết một nhân viên theo ID.
   *
   * @param {number} employeeId
   * @returns {Promise<ApiResponse<EmployeeResponse>>}
   *
   * EmployeeResponse: { id, username, status, roleId, roleName, fullName,
   *   employeeCode, email, phone, branchId, branchName, dateOfBirth,
   *   gender, hireDate, salary, address, internalNotes, createdAt, updatedAt }
   *
   * Yêu cầu Role: ADMIN | MANAGER
   */
  getEmployeeById: (employeeId) => apiClient.get(`/employees/${employeeId}`),

  // ─── CREATE ──────────────────────────────────────────────────────────────

  /**
   * Tạo mới nhân viên.
   *
   * Payload phải khớp 100% với CreateEmployeeRequest Java record:
   * @param {{
   *   username: string,        // Required, max 50
   *   password: string,        // Required, min 8, phải có chữ và số
   *   roleId: number | null,   // Optional
   *   fullName: string,        // Required, max 100
   *   employeeCode: string,    // Optional, max 30
   *   email: string,           // Required, valid email, max 100
   *   phone: string,           // Optional, regex: [0-9+\-() ]{8,20}
   *   branchId: number | null, // Optional
   *   dateOfBirth: string,     // Optional, ISO date "YYYY-MM-DD", must be past
   *   gender: string,          // Optional, max 10
   *   hireDate: string,        // Optional, ISO date "YYYY-MM-DD"
   *   salary: number,          // Optional, min 0
   *   address: string,         // Optional, max 255
   *   internalNotes: string    // Optional, max 1000
   * }} payload
   * @returns {Promise<ApiResponse<EmployeeResponse>>}
   *
   * Yêu cầu Role: ADMIN | MANAGER
   */
  createEmployee: (payload) => apiClient.post('/employees', payload),

  // ─── UPDATE ──────────────────────────────────────────────────────────────

  /**
   * Cập nhật thông tin nhân viên (Admin/Manager cập nhật bất kỳ nhân viên nào).
   *
   * Payload phải khớp 100% với UpdateEmployeeRequest Java record:
   * @param {number} employeeId
   * @param {{
   *   fullName: string,        // Optional, max 100
   *   email: string,           // Optional, valid email, max 100
   *   phone: string,           // Optional
   *   employeeCode: string,    // Optional, max 30
   *   branchId: number | null, // Optional
   *   dateOfBirth: string,     // Optional, ISO date
   *   gender: string,          // Optional, max 10
   *   hireDate: string,        // Optional, ISO date
   *   salary: number,          // Optional, min 0
   *   address: string,         // Optional, max 255
   *   internalNotes: string,   // Optional, max 1000
   *   roleId: number | null,   // Optional
   *   status: string           // Optional, e.g. "ACTIVE" | "INACTIVE"
   * }} payload
   * @returns {Promise<ApiResponse<EmployeeResponse>>}
   *
   * Yêu cầu Role: ADMIN | MANAGER
   */
  updateEmployee: (employeeId, payload) => apiClient.put(`/employees/${employeeId}`, payload),

  // ─── DELETE ──────────────────────────────────────────────────────────────

  /**
   * Xóa mềm (soft delete) một nhân viên theo ID.
   *
   * @param {number} employeeId
   * @returns {Promise<ApiResponse<void>>}
   *
   * Yêu cầu Role: ADMIN
   */
  deleteEmployee: (employeeId) => apiClient.delete(`/employees/${employeeId}`),

  // ─── SELF PROFILE ────────────────────────────────────────────────────────

  /**
   * Lấy profile của chính người dùng đang đăng nhập.
   *
   * @returns {Promise<ApiResponse<EmployeeSelfResponse>>}
   *
   * EmployeeSelfResponse: { id, username, status, roleName, fullName,
   *   employeeCode, email, phone, branchId, branchName, dateOfBirth,
   *   gender, hireDate, address, createdAt, updatedAt }
   *
   * Yêu cầu: Authenticated
   */
  getMyProfile: () => apiClient.get('/employees/me'),

  /**
   * Tự cập nhật profile bản thân.
   *
   * Payload phải khớp với UpdateOwnEmployeeProfileRequest:
   * @param {{
   *   fullName?: string,
   *   email?: string,
   *   phone?: string,
   *   dateOfBirth?: string,
   *   gender?: string,
   *   address?: string
   * }} payload
   * @returns {Promise<ApiResponse<EmployeeSelfResponse>>}
   *
   * Yêu cầu: Authenticated
   */
  updateMyProfile: (payload) => apiClient.put('/employees/me', payload),
};

// ─── ROLES API ─────────────────────────────────────────────────────────────

export const roleApi = {
  /**
   * Lấy danh sách tất cả roles (để dùng trong dropdown khi tạo/sửa nhân viên).
   *
   * @returns {Promise<ApiResponse<RoleResponse[]>>}
   *
   * RoleResponse: { id, name, description }
   *
   * Yêu cầu Role: ADMIN | MANAGER
   */
  getRoles: () => apiClient.get('/roles'),
};

export default employeeApi;
