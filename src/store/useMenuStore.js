import { create } from 'zustand';
import { menuApi } from '../api/menuApi';
import toast from 'react-hot-toast';

export const useMenuStore = create((set, get) => ({
  menuItems: [],
  categories: [],
  loading: false,

  fetchMenuItems: async () => {
    set({ loading: true });
    try {
      const res = await menuApi.getMenuItems({ page: 0, size: 200 });
      const items = res?.data?.content ?? [];
      
      const seen = new Map();
      for (const item of items) {
        const catId = item.categoryId ?? item.category?.id;
        const catName = item.categoryName ?? item.category?.name;
        if (catId && !seen.has(catId)) {
          seen.set(catId, { id: catId, name: catName ?? `Danh mục ${catId}` });
        }
      }
      
      set({ 
        menuItems: items, 
        categories: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
        loading: false 
      });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải thực đơn');
      set({ loading: false });
    }
  },

  addMenuItem: async (item) => {
    try {
      await menuApi.createMenuItem(item);
      toast.success('Thêm món mới thành công!');
      get().fetchMenuItems(); // Tải lại danh sách
      return true;
    } catch (err) {
      toast.error('Thêm thất bại');
      return false;
    }
  },

  updateMenuItem: async (id, updatedItem) => {
    try {
      await menuApi.updateMenuItem(id, updatedItem);
      toast.success('Cập nhật món thành công!');
      get().fetchMenuItems(); // Tải lại danh sách
      return true;
    } catch (err) {
      toast.error('Cập nhật thất bại');
      return false;
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await menuApi.deleteMenuItem(id);
      toast.success('Xóa món thành công!');
      get().fetchMenuItems(); // Tải lại danh sách
      return true;
    } catch (err) {
      toast.error('Xóa thất bại');
      return false;
    }
  }
}));
