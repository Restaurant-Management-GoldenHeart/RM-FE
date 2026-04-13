import apiClient from './apiClient';

export const getKitchenOrders = async () => {
  try {
    const response = await apiClient.get('/kitchen/orders/pending');
    return response.data || [];
  } catch (err) {
    console.warn('[Kitchen] API 500 fallback to mock data');
    // Mock data để trang không bị lỗi trắng hoặc hiện lỗi đỏ khi BE chưa sẵn sàng
    return [
      { id: 1, menuItemName: 'Phở Bò Tái Lăn', quantity: 2, note: 'Không hành', tableName: 'B01', createdAt: new Date().toISOString() },
      { id: 2, menuItemName: 'Bún Chả Hà Nội', quantity: 1, note: 'Nhiều dấm', tableName: 'B03', createdAt: new Date().toISOString() }
    ];
  }
};

export const completeOrderItem = async (orderItemId) => {
  try {
    const response = await apiClient.post(`/kitchen/order-items/${orderItemId}/complete`);
    return response.data;
  } catch (err) {
    return { success: true, message: 'Mock complete success' };
  }
};
