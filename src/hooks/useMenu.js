import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { menuApi } from '../api/menuApi';
import { inventoryApi } from '../api/inventoryApi';
import { employeeApi } from '../api/employeeApi';
import { extractErrorMessage } from '../utils/errorHelper';
import { useAuthStore } from '../store/useAuthStore';
import { useBranchContext } from '../context/BranchContext';

/**
 * useMenu - Custom hook for Menu Management
 * Encapsulates all API logic, pagination, and filter state.
 */
export function useMenu() {
  const queryClient = useQueryClient();
  const { buildApiParams, selectedBranchId } = useBranchContext();
  
  // Local Filter & Pagination State
  const [keyword, setKeywordState] = useState('');
  const [categoryId, setCategoryIdState] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setPage(0);
  }, [selectedBranchId]);

  // 0. Metadata Fetching
  
  // Note: These should eventually come from their own APIs
  const categoriesQuery = useQuery({
    queryKey: ['menuCategories'],
    queryFn: async () => {
      // Request a large size to get all categories for dropdowns
      const res = await menuApi.getCategories({ size: 100 });
      return res.data?.content || [];
    },
    staleTime: 1000 * 60 * 30, // Cache trong 30 phút vì danh mục ít thay đổi
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await employeeApi.getBranches();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  // REAL INTEGRATION: Fetch ingredients from Inventory
  const ingredientsQuery = useQuery({
    queryKey: ['inventoryIngredients', selectedBranchId],
    queryFn: async () => {
      const res = await inventoryApi.getInventoryItems({
        ...buildApiParams(),
        size: 100,
      });
      return res.data?.content || [];
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // 1. Fetch Menu Items
  const { 
    data, 
    isLoading, 
    isFetching,
    error, 
    refetch 
  } = useQuery({
    queryKey: ['menuItems', { keyword, categoryId, branchId: selectedBranchId, page }],
    queryFn: () => menuApi.getMenuItems({ 
      keyword, 
      categoryId, 
      ...buildApiParams(),
      page, 
      size: pageSize 
    }),
    placeholderData: (previousData) => previousData,
  });

  // 2. Helper: Error Extractor (Deprecated - using centralized helper)
  const extractError = (err) => extractErrorMessage(err);

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => menuApi.createMenuItem({ ...payload, ...buildApiParams() }),
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
    mutationFn: ({ id, payload }) => menuApi.updateMenuItem(id, { ...payload, ...buildApiParams() }),
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

    const createCategoryMutation = useMutation({
    mutationFn: (payload) => menuApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuCategories'] });
      toast.success('Thêm danh mục thành công!');
    },
    onError: (err) => {
      const msg = extractError(err);
      toast.error(typeof msg === 'string' ? msg : 'Thêm danh mục thất bại.');
    },
  });

  // Derived Values
  const items = useMemo(() => data?.data?.content || [], [data]);
  const pagination = useMemo(() => ({
    totalElements: data?.data?.totalElements ?? 0,
    totalPages: data?.data?.totalPages ?? 0,
    page: data?.data?.page ?? 0,
    start: (data?.data?.totalElements ?? 0) === 0 ? 0 : (data?.data?.page ?? 0) * pageSize + 1,
    end: (data?.data?.totalElements ?? 0) === 0
      ? 0
      : Math.min(((data?.data?.page ?? 0) + 1) * pageSize, data?.data?.totalElements ?? 0),
  }), [data]);

  const handleKeywordChange = useCallback((value) => {
    setKeywordState(value);
    setPage(0);
  }, []);

  const handleCategoryChange = useCallback((value) => {
    setCategoryIdState(value);
    setPage(0);
  }, []);

  useEffect(() => {
    const totalPages = data?.data?.totalPages ?? 0;
    if (totalPages === 0) {
      if (page !== 0) {
        setPage(0);
      }
      return;
    }

    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [data, page]);

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
    categories: categoriesQuery.data || [],
    branches: branchesQuery.data || [],
    ingredients: mappedIngredients,

    // Actions
    setKeyword: handleKeywordChange,
    setCategoryId: handleCategoryChange,
    setPage,
    refetch,
    
    // Mutations
    createMenuItem: createMutation.mutateAsync,
    updateMenuItem: updateMutation.mutateAsync,
    deleteMenuItem: deleteMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isSavingCategory: createCategoryMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
