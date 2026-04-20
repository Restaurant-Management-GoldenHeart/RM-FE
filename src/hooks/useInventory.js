import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryApi } from '../api/inventoryApi';

/**
 * useInventory - Custom hook for Inventory Management
 * @description Centralizes data fetching, mutations, and debounced search logic.
 */
export function useInventory() {
  const queryClient = useQueryClient();

  // --- Search & Pagination State ---
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Debouncing logic for keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput);
      setPage(0); // Reset to first page on search
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --- Queries ---
  
  // 1. Fetch Measurement Units
  const unitsQuery = useQuery({
    queryKey: ['measurementUnits'],
    queryFn: inventoryApi.getMeasurementUnits,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Low Stock Alerts
  const alertsQuery = useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: () => inventoryApi.getLowStockAlerts(),
    refetchInterval: 30000, // Sync every 30s
  });

  // 3. Fetch Paginated Inventory Items
  const itemsQuery = useQuery({
    queryKey: ['inventoryItems', keyword, page],
    queryFn: () => inventoryApi.getInventoryItems({ keyword, page, size: pageSize }),
    placeholderData: keepPreviousData, // Smooth pagination in v5
  });

  // --- Mutations ---

  const extractError = (err) => {
    // If it's a field-level validation error from backend
    if (err.response?.data?.errors) {
      return err.response.data.errors;
    }
    // If it's a business logic error (e.g., duplicate name)
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    return err.message || 'Đã xảy ra lỗi hệ thống';
  };

  const createMutation = useMutation({
    mutationFn: inventoryApi.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Thêm nguyên vật liệu thành công!');
    },
    onError: (err) => {
      const errorPayload = extractError(err);
      if (typeof errorPayload === 'string') {
        toast.error(errorPayload);
      }
      // If it's an object, the Form modal will handle field mapping
    }
  });

  const updateMutation = useMutation({
    mutationFn: inventoryApi.updateInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Cập nhật nguyên vật liệu thành công!');
    },
    onError: (err) => {
      const errorPayload = extractError(err);
      if (typeof errorPayload === 'string') {
        if (errorPayload.toLowerCase().includes('unit')) {
           toast.error('Không thể thay đổi đơn vị tính của nguyên liệu đã sử dụng');
        } else {
           toast.error(errorPayload);
        }
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Đã xóa nguyên vật liệu khỏi kho!');
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi xóa nguyên vật liệu')
  });

  // --- Derived Values & Structure ---
  const inventoryList = useMemo(() => itemsQuery.data?.data?.content || [], [itemsQuery.data]);
  const totalPages = useMemo(() => itemsQuery.data?.data?.totalPages || 1, [itemsQuery.data]);
  const unitsList = useMemo(() => unitsQuery.data?.data || [], [unitsQuery.data]);
  const alertsList = useMemo(() => alertsQuery.data?.data || [], [alertsQuery.data]);

  return {
    // States
    inventoryList,
    totalPages,
    unitsList,
    alertsList,
    page,
    searchInput,
    
    // Status
    isLoading: itemsQuery.isLoading,
    isFetching: itemsQuery.isFetching,
    isError: itemsQuery.isError,
    error: itemsQuery.error,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Actions
    setPage,
    setSearchInput,
    handleFormSubmit: async (data, selectedId) => {
      if (selectedId) {
        return updateMutation.mutateAsync({ id: selectedId, data });
      } else {
        return createMutation.mutateAsync(data);
      }
    },
    handleDelete: async (item) => {
      if (item.quantity > 0) {
        toast.error('Không thể xóa món hàng có số lượng > 0', { icon: '⚠️' });
        return;
      }
      if (window.confirm(`Bạn có chắc muốn xóa nguyên liệu "${item.ingredientName || item.itemName}"?`)) {
        return deleteMutation.mutateAsync(item.inventoryId || item.id);
      }
    },
    refresh: () => {
       queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
       queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
    }
  };
}
