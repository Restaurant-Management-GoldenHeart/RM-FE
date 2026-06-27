import apiClient from './apiClient';

const BASE = '/combos';

export const comboApi = {
  // Lấy danh sách combo theo branch (branchId resolve từ BranchContext)
  getCombos: (branchId) => apiClient.get(BASE, { params: { branchId } }),

  getCombo: (id) => apiClient.get(`${BASE}/${id}`),

  // payload: CreateComboRequest as JSON, imageFile: File | null
  createCombo: (payload, imageFile) => {
    const form = new FormData();
    form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (imageFile) form.append('imageFile', imageFile);
    return apiClient.post(BASE, form);
  },

  // payload: UpdateComboRequest as JSON, imageFile: File | null
  updateCombo: (id, payload, imageFile) => {
    const form = new FormData();
    form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    if (imageFile) form.append('imageFile', imageFile);
    return apiClient.put(`${BASE}/${id}`, form);
  },

  deleteCombo: (id) => apiClient.delete(`${BASE}/${id}`),
};
