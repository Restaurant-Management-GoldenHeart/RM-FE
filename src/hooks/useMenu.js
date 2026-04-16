import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { menuApi } from '../api/menuApi';
import { inventoryApi } from '../api/inventoryApi';

/**
 * useMenu - Custom hook for Menu Management
 * Encapsulates all API logic, pagination, and filter state.
 */
export function useMenu() {
  const queryClient = useQueryClient();
  
  // Local Filter & Pagination State
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // 0. Metadata Fetching
  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: async () => [
      { id: 1, name: 'Golden Heart Branch 1' },
      { id: 2, name: 'Golden Heart Branch 2' },
    ],
    staleTime: 1000 * 60 * 30,
  });

  const ingredientsQuery = useQuery({
    queryKey: ['inventoryIngredients'],
    queryFn: async () => {
      const res = await inventoryApi.getInventoryItems({ size: 100 });
      return res.data?.content || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // 1. Fetch Menu Items
  const { 
    data, 
    isLoading, 
    isFetching,
    error, 
    refetch 
  } = useQuery({
    queryKey: ['menuItems', { keyword, categoryId, page }],
    queryFn: () => menuApi.getMenuItems({ 
      keyword, 
      categoryId, 
      page, 
      size: pageSize 
    }),
    placeholderData: (previousData) => previousData,
  });

  // 1b. Dynamic Categories Extraction
  const categories = useMemo(() => {
    const rawItems = data?.data?.content || [];
    const seen = new Map();
    for (const item of rawItems) {
      const catId = item.categoryId ?? item.category?.id;
      const catName = item.categoryName ?? item.category?.name;
      if (catId && !seen.has(catId)) {
        seen.set(catId, { id: catId, name: catName ?? `Danh mục ${catId}` });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [data]);

  // 2. Helper: Error Extractor
  const extractError = (err) => {
    if (err.response?.data?.errors) return err.response.data.errors;
    if (err.response?.data?.message) return err.response.data.message;
    return err.message || 'Đã xảy ra lỗi hệ thống';
  };

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => menuApi.createMenuItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Thêm món ăn thành công!');
    },
    onError: (err) => {
      const msg = extractError(err);
      toast.error(typeof msg === 'string' ? msg : 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => menuApi.updateMenuItem(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Cập nhật món ăn thành công!');
    },
    onError: (err) => {
      const msg = extractError(err);
      toast.error(typeof msg === 'string' ? msg : 'Cập nhật thất bại. Vui lòng kiểm tra lại.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => menuApi.deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast.success('Đã xóa món ăn khỏi thực đơn');
    },
    onError: (err) => toast.error(err.message || 'Xóa thất bại'),
  });

  // Derived Values
  const items = useMemo(() => data?.data?.content || [], [data]);
  const pagination = useMemo(() => ({
    totalElements: data?.data?.totalElements || 0,
    totalPages: data?.data?.totalPages || 0,
    page: data?.data?.page || 0,
    start: (data?.data?.page || 0) * pageSize + 1,
    end: Math.min(((data?.data?.page || 0) + 1) * pageSize, data?.data?.totalElements || 0),
  }), [data]);

  // Ingredients used by recipes mapper
  const mappedIngredients = useMemo(() => {
    return (ingredientsQuery.data || []).map(ing => ({
      id: ing.ingredientId || ing.id,
      name: ing.ingredientName || ing.itemName,
      unitSymbol: ing.unitSymbol,
      unitName: ing.unitName
    }));
  }, [ingredientsQuery.data]);

  return {
    // States
    items,
    loading: isLoading || isFetching,
    pagination,
    keyword,
    categoryId,
    page,
    categories,
    branches: branchesQuery.data || [],
    ingredients: mappedIngredients,

    // Actions
    setKeyword: (val) => { setKeyword(val); setPage(0); },
    setCategoryId: (val) => { setCategoryId(val); setPage(0); },
    setPage,
    refetch,
    
    // Mutations
    createMenuItem: createMutation.mutateAsync,
    updateMenuItem: updateMutation.mutateAsync,
    deleteMenuItem: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
