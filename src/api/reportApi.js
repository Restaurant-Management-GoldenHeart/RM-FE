import apiClient from './apiClient';

export const reportApi = {
  getDashboardReport: (params = {}) => apiClient.get('/reports/dashboard', { params }),
};

export default reportApi;
