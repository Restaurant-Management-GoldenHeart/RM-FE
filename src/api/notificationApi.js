import apiClient from './apiClient';

// MOCK DATA: Since backend /notifications endpoint doesn't exist yet, we mock it to prevent 500 errors.
const MOCK_NOTIFICATIONS = [
  { id: 1, title: 'Đơn hàng mới', message: 'Bàn số 5 vừa gọi thêm món.', type: 'ORDER', read: false, createdAt: new Date().toISOString() },
  { id: 2, title: 'Hết nguyên liệu', message: 'Thịt bò Mỹ sắp hết trong kho.', type: 'SYSTEM', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, title: 'Yêu cầu thanh toán', message: 'Bàn VIP 1 yêu cầu thanh toán.', type: 'ORDER', read: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

export const notificationApi = {
  getNotifications: async (params = {}) => {
    // return apiClient.get('/notifications', { params });
    return new Promise(resolve => setTimeout(() => resolve({ data: { content: MOCK_NOTIFICATIONS, totalElements: MOCK_NOTIFICATIONS.length } }), 500));
  },
  markAsRead: async (id) => {
    // return apiClient.patch(`/notifications/${id}/read`);
    return new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 300));
  },
  markAllAsRead: async () => {
    // return apiClient.patch('/notifications/read-all');
    return new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 300));
  },
};

export default notificationApi;
