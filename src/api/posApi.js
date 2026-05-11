/**
 * posApi.js — Real API layer for POS module (Tables & Orders)
 * Integrated with RM-BE Spring Boot endpoints.
 */
import apiClient from './apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { getPersistedBranchId, resolveBranchId } from '../utils/branchResolver';

export const tableApi = {
  /**
   * GET /api/v1/tables?branchId=...
   */
  getTables: async (branchId) => {
    return await apiClient.get('/tables', { params: { branchId } });
  },

  /**
   * POST /api/v1/orders
   * In BE, opening a table means creating an order.
   */
  openTable: async ({ tableId, branchId, createdBy }) => {
    // Note: BE CreateOrderRequest: { tableId, branchId, customerId?, items? }
    const res = await apiClient.post('/orders', { 
      tableId, 
      branchId,
      items: [] // Initial empty order
    });
    
    // We also need the updated table info to get table.status = OCCUPIED
    const tableRes = await apiClient.get(`/tables/${tableId}`);
    
    return { 
      success: true, 
      data: { 
        order: res.data.data, 
        table: tableRes.data.data 
      } 
    };
  },

  /**
   * PUT /api/v1/tables/:id/status
   */
  closeTable: async (tableId) => {
    const res = await apiClient.put(`/tables/${tableId}/status`, { status: 'AVAILABLE' });
    return res.data;
  },

  /**
   * POST /api/v1/tables/merge
   */
  mergeTables: async ({ fromTableId, toTableId }) => {
    const res = await apiClient.post('/tables/merge', { 
      sourceTableId: fromTableId, 
      targetTableId: toTableId 
    });
    
    // BE returns TableOrderTransferResponse { action, sourceTableId, targetTableId, ... }
    // We need to re-fetch tables or get order info.
    // Assuming FE store handles the refresh.
    return { success: true, data: res.data.data };
  },

  /**
   * POST /api/v1/tables/:id/split
   */
  splitOrder: async ({ fromOrderId, toTableId, transferItems }) => {
    // BE endpoint: POST /api/v1/tables/{tableId}/split
    // Note: we need fromTableId. Searching for it in store might be better, 
    // but here we just pass fromOrderId. Wait, BE split needs tableId in path.
    // Let's assume the caller provides sourceTableId as well if needed.
    // For now, I'll use a hack to get tableId from order if not provided.
    
    // Actually, let's check current split call in store.
  },

  /**
   * PUT /api/v1/tables/:id/status
   */
  reserveTable: async ({ tableId, reservationInfo }) => {
    const res = await apiClient.put(`/tables/${tableId}/status`, { status: 'RESERVED' });
    return res.data;
  },

  /**
   * POST /api/v1/tables
   */
  createTable: async (data) => {
    const authUser = useAuthStore.getState().user;
    const branchId = resolveBranchId(
      data.branchId,
      getPersistedBranchId(),
      authUser?.branchId,
      authUser?.profile?.branchId,
    ) || 1;
    
    const res = await apiClient.post('/tables', {
      branchId: branchId,
      areaId: data.areaId || data.area_id,
      tableNumber: data.tableNumber,
      capacity: Number(data.capacity),
      posX: data.posX || data.pos_x || 0,
      posY: data.posY || data.pos_y || 0,
      width: data.width || 120,
      height: data.height || 100,
      displayOrder: data.displayOrder || 0
    });
    return res.data;
  },

  /**
   * PUT /api/v1/tables/:id
   */
  updateTable: async (id, data) => {
    const authUser = useAuthStore.getState().user;
    const branchId = resolveBranchId(
      data.branchId,
      getPersistedBranchId(),
      authUser?.branchId,
      authUser?.profile?.branchId,
    ) || 1;

    const res = await apiClient.put(`/tables/${id}`, {
      branchId: branchId,
      areaId: data.areaId || data.area_id,
      tableNumber: data.tableNumber,
      capacity: Number(data.capacity),
      posX: data.posX || data.pos_x,
      posY: data.posY || data.pos_y,
      width: data.width,
      height: data.height,
      displayOrder: data.displayOrder
    });
    return res.data;
  },

  /**
   * DELETE /api/v1/tables/:id
   */
  deleteTable: async (id) => {
    const res = await apiClient.delete(`/tables/${id}`);
    return res.data;
  },
};

export const areaApi = {
  /**
   * GET /api/v1/areas?branchId=...
   */
  getAreas: async (branchId) => {
    return await apiClient.get('/dining-areas', { params: { branchId } });
  },
  createArea: async (areaData) => {
    return await apiClient.post('/dining-areas', areaData);
  },
  deleteArea: async (id) => {
    return await apiClient.delete(`/dining-areas/${id}`);
  }
};

export const orderApi = {
  /**
   * GET /api/v1/orders/:orderId
   */
  getOrder: async (orderId) => {
    const res = await apiClient.get(`/orders/${orderId}`);
    return res.data;
  },
  
  // Placeholder for other order actions like sendToKitchen, cancelItem, etc.
  // These will be implemented when needed by the specific module.
};

export const paymentApi = {
  /**
   * Thanh toán đơn hàng.
   * BE endpoint: POST /api/v1/bills
   */
  payOrder: async ({ orderId, discount = 0, taxRate = 0, method = 'CASH', total = 0 }) => {
    // BE expects { orderId, discount, taxRate, paidAmount, paymentMethod }
    // paidAmount = tổng tiền thực tế → BE mới ghi nhận payment và đóng bill
    const res = await apiClient.post('/bills', {
      orderId,
      discount,
      taxRate,
      paidAmount: total,        // ← phải là số tiền thực, không phải 0
      paymentMethod: method
    });
    return res.data;
  },
};

/**
 * Lấy menu items thực từ Backend (đã có API).
 */
export const fetchMenuItemsReal = (params = {}) =>
  apiClient.get('/menu-items', { params: { size: 200, ...params } });

export default { tableApi, areaApi, orderApi, paymentApi, fetchMenuItemsReal };
