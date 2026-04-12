import apiClient from './apiClient';

export const getKitchenOrders = async () => {
  const response = await apiClient.get('/kitchen/orders/pending');
  return response.data || [];
};

export const completeOrderItem = async (orderItemId) => {
  const response = await apiClient.post(`/kitchen/order-items/${orderItemId}/complete`);
  return response.data;
};
