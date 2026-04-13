/**
 * kdsTransform.js — Bộ biến đổi dữ liệu Enterprise KDS.
 * Trích xuất dữ liệu từ useOrderStore.orders và gộp nhóm theo Table > Order > Batch.
 */

const STATUS_MAP = {
  SENT: 'WAITING',
  PREPARING: 'COOKING',
  READY: 'DONE',
  SERVED: 'DONE',
  CANCELLED: 'CANCELLED',
};

/**
 * Chuyển đổi RECORD orders thành mảng KDS Items phẳng.
 */
export const transformOrdersToKdsItems = (ordersRecord, menuItems = []) => {
  const allItems = [];

  // Tạo map để tra cứu menu item nhanh hơn
  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  Object.values(ordersRecord).forEach((order) => {
    order.items.forEach((item) => {
      const menuItem = menuMap.get(item.menuItemId);
      const ingredients = menuItem?.recipes?.map(r => r.ingredientName || `N/L bồn #${r.ingredientId}`) || [];

      allItems.push({
        ...item,
        orderId: order.id,
        tableId: order.tableId,
        tableNumber: order.tableNumber,
        orderVersion: order.version,
        ingredients: ingredients, // Danh sách nguyên liệu
        kdsStatus: STATUS_MAP[item.status] || 'WAITING',
      });
    });
  });

  return allItems;
};

/**
 * Gộp nhóm items theo Table > Order > Batch.
 * Dùng để hiển thị cấu trúc phân cấp trên Kanban Card.
 */
export const groupKdsItems = (items) => {
  const grouped = {};

  items.forEach((item) => {
    const tableKey = item.tableNumber || `Bàn #${item.tableId}`;
    if (!grouped[tableKey]) grouped[tableKey] = {};

    const orderKey = `Order #${item.orderId}`;
    if (!grouped[tableKey][orderKey]) grouped[tableKey][orderKey] = {};

    const batchKey = item.batchId || 'Default Batch';
    if (!grouped[tableKey][orderKey][batchKey]) grouped[tableKey][orderKey][batchKey] = [];

    grouped[tableKey][orderKey][batchKey].push(item);
  });

  return grouped;
};

/**
 * Lọc items theo Kitchen Type (KITCHEN / BAR).
 */
export const filterByKitchenType = (items, type) => {
  if (!type) return items;
  return items.filter((item) => item.kitchenType === type);
};
