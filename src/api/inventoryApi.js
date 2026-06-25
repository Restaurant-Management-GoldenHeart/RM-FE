import apiClient from './apiClient';

const buildImportFormData = ({ file, branchId, receiptDate, invoiceNumber, note }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('branchId', branchId);
  if (receiptDate) formData.append('receiptDate', receiptDate);
  if (invoiceNumber) formData.append('invoiceNumber', invoiceNumber);
  if (note) formData.append('note', note);
  return formData;
};
export const inventoryApi = {
  // 1. Lấy danh sách đơn vị tính
  getMeasurementUnits: async () => {
    return apiClient.get('/inventory/units');
  },

  // 2. Lấy danh sách inventory items (có phân trang & filter)
  getInventoryItems: async ({ keyword, branchId, lowStockOnly, page = 0, size = 10 } = {}) => {
    return apiClient.get('/inventory', {
      params: { keyword, branchId, lowStockOnly, page, size }
    });
  },

  // 3. Lấy cảnh báo tồn kho thấp
  getLowStockAlerts: async ({ branchId } = {}) => {
    return apiClient.get('/inventory/alerts', {
      params: { branchId }
    });
  },

  // 3.5. Lấy thống kê tổng quan tồn kho
  getInventorySummary: async ({ branchId } = {}) => {
    return apiClient.get('/inventory/summary', {
      params: { branchId }
    });
  },

  // 4. Lấy chi tiết một inventory item
  getInventoryItemById: async (inventoryId) => {
    return apiClient.get(`/inventory/${inventoryId}`);
  },

  // 5. Lấy lịch sử nhập/xuất kho
  getInventoryHistory: async (inventoryId, { page = 0, size = 10 } = {}) => {
    return apiClient.get(`/inventory/${inventoryId}/history`, {
      params: { page, size }
    });
  },

  // Báo cáo di chuyển kho
  getMovementReport: (branchId, fromDate, toDate, groupBy = 'DAY') =>
    apiClient.get('/inventory/reports/movements', { params: { branchId, fromDate, toDate, groupBy } }),

  // 6. Tạo mới inventory item
  createInventoryItem: async (data) => {
    return apiClient.post('/inventory', data);
  },

  // 7. Cập nhật thông tin/số lượng inventory item
  updateInventoryItem: async ({ id, data }) => {
    return apiClient.put(`/inventory/${id}`, data);
  },

  // 7.5. Nhập hàng theo đơn vị mua và quy đổi sang đơn vị tồn kho
  restockInventoryItem: async ({ id, data }) => {
    return apiClient.post(`/inventory/${id}/restock`, data);
  },

  // 8. Xóa inventory item (chỉ cho phép khi quantity = 0)
  deleteInventoryItem: async (inventoryId) => {
    return apiClient.delete(`/inventory/${inventoryId}`);
  },

  // 9. Tải file mẫu import nhập kho
  downloadImportTemplate: async () => {
    return apiClient.get('/inventory/import/template', { responseType: 'blob' });
  },

  // 10. Preview file Excel trước khi ghi kho
  previewInventoryImport: async (payload) => {
    return apiClient.post('/inventory/import/preview', buildImportFormData(payload));
  },

  // 11. Commit file Excel sau khi preview hợp lệ
  commitInventoryImport: async (payload) => {
    return apiClient.post('/inventory/import/commit', buildImportFormData(payload));
  }
};
