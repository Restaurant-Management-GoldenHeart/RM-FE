import apiClient from './apiClient';

const BASE = '/waste-requests';

export const wasteApi = {
  list: ({ branchId, status, dateFrom, dateTo, page = 0, size = 20 } = {}) =>
    apiClient.get(BASE, { params: { branchId, status, dateFrom, dateTo, page, size } }),

  getStats: ({ branchId, dateFrom, dateTo } = {}) =>
    apiClient.get(`${BASE}/stats`, { params: { branchId, dateFrom, dateTo } }),

  exportExcel: ({ branchId, dateFrom, dateTo } = {}) =>
    apiClient.get(`${BASE}/export`, { params: { branchId, dateFrom, dateTo }, responseType: 'blob' }),

  getById: (id) => apiClient.get(`${BASE}/${id}`),

  create: (payload, images) => {
    const form = new FormData();
    form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (images && images.length > 0) {
      images.forEach((img) => form.append('images', img));
    }
    return apiClient.post(BASE, form);
  },

  approve: (id, reviewNote) =>
    apiClient.put(`${BASE}/${id}/approve`, reviewNote ? { reviewNote } : {}),

  reject: (id, reviewNote) =>
    apiClient.put(`${BASE}/${id}/reject`, reviewNote ? { reviewNote } : {}),

  countPending: () => apiClient.get(`${BASE}/pending-count`),
};
