import apiClient from './apiClient';

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

  // 6. Tạo mới inventory item
  createInventoryItem: async (data) => {
    return apiClient.post('/inventory', data);
  },

  // 7. Cập nhật thông tin/số lượng inventory item
  updateInventoryItem: async ({ id, data }) => {
    return apiClient.put(`/inventory/${id}`, data);
  },

  // 8. Xóa inventory item (chỉ cho phép khi quantity = 0)
  deleteInventoryItem: async (inventoryId) => {
    return apiClient.delete(`/inventory/${inventoryId}`);
  }
};
