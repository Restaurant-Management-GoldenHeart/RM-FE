/**
 * usePosStore.js — Store tinh gọn chỉ quản lý Thực đơn (Menu).
 *
 * Sau khi tách useTableStore, useOrderStore, useCartStore, 
 * store này chỉ giữ vai trò cung cấp dữ liệu Menu Items và Categories dùng chung.
 */
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { menuApi } from '../api/menuApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCategories(menuItems) {
  const seen = new Map();
  for (const item of menuItems) {
    const catId = item.categoryId ?? item.category?.id;
    const catName = item.categoryName ?? item.category?.name;
    if (catId && !seen.has(catId)) {
      seen.set(catId, { id: catId, name: catName ?? `Danh mục ${catId}` });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePosStore = create((set, get) => ({

  // ─── State ──────────────────────────────────────────────────────────────────

  /** @type {Array<MenuItem>} */
  menuItems: [],

  /** @type {Array<{ id: number, name: string }>} */
  categories: [],

  /** @type {boolean} */
  menuLoading: false,

  /** @type {string | null} */
  error: null,

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * fetchInitialData — Chỉ tải Menu thực tế từ Backend.
   */
  fetchInitialData: async () => {
    if (get().menuLoading) return;
    set({ menuLoading: true, error: null });

    try {
      const menuRes = await menuApi.getMenuItems({ page: 0, size: 200 }); // Tăng size để thấy hết món
      const menuItems = menuRes?.data?.content ?? [];

      set({
        menuItems: menuItems,
        categories: extractCategories(menuItems),
        menuLoading: false,
      });
    } catch (err) {
      console.error('[usePosStore] Menu fetch failed:', err);
      set({
        menuLoading: false,
        error: 'Không thể tải thực đơn từ Backend.',
      });
      toast.error('Không thể đồng bộ Thực đơn');
    }
  },
}));
