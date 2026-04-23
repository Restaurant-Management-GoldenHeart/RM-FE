import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryApi } from '../api/inventoryApi';
import { employeeApi } from '../api/employeeApi';
import { useAuthStore } from '../store/useAuthStore';
import { extractErrorMessage } from '../utils/errorHelper';

/**
 * useInventory - Hook quản lý kho hàng chuẩn Production.
 * Phân tách Logic khỏi UI, xử lý caching và đồng bộ hóa chi nhánh.
 */
export const useInventory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // --- State: Filter & Pagination ---
  const [filterBranchId, setFilterBranchId] = useState(user?.branchId || null);
  const [keyword, setKeyword] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const size = 10;

  // --- Queries ---

  // 1. Danh sách chi nhánh
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await employeeApi.getBranches();
      return res.data || [];
    },
    staleTime: 300000, // 5 phút
  });

  // Tự động chọn chi nhánh đầu tiên cho Admin nếu chưa chọn
  useEffect(() => {
    if (user?.role === 'ADMIN' && !filterBranchId && branches.length > 0) {
      setFilterBranchId(branches[0].id);
    }
  }, [branches, filterBranchId, user?.role]);

  // 2. Danh sách nguyên liệu trong kho
  const {
    data: itemsRes,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['inventoryItems', filterBranchId, keyword, lowStockOnly, page],
    queryFn: () => inventoryApi.getInventoryItems({ 
      keyword, 
      branchId: filterBranchId, 
      lowStockOnly, 
      page, 
      size 
    }),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const items = itemsRes?.data?.content || [];
  const pagination = {
    page: itemsRes?.data?.number || 0,
    totalPages: itemsRes?.data?.totalPages || 0,
    totalElements: itemsRes?.data?.totalElements || 0,
  };

  // 3. Thống kê tổng quan
  const { data: summaryRes } = useQuery({
    queryKey: ['inventorySummary', filterBranchId],
    queryFn: () => inventoryApi.getInventorySummary({ branchId: filterBranchId }),
    enabled: !!filterBranchId || user?.role === 'ADMIN',
  });
  const summary = summaryRes?.data || { totalItems: 0, totalInventoryValue: 0, lowStockCount: 0 };

  // 4. Cảnh báo tồn kho thấp
  const { data: alertsRes } = useQuery({
    queryKey: ['lowStockAlerts', filterBranchId],
    queryFn: () => inventoryApi.getLowStockAlerts({ branchId: filterBranchId }),
    enabled: !!filterBranchId || user?.role === 'ADMIN',
  });
  const alerts = alertsRes?.data || [];

  // 5. Đơn vị tính
  const { data: unitsRes } = useQuery({
    queryKey: ['measurementUnits'],
    queryFn: inventoryApi.getMeasurementUnits,
    staleTime: 300000,
  });
  const units = unitsRes?.data || [];
  
  // 6. Báo cáo di chuyển kho hôm nay (để lấy giá trị nhập hàng)
  const today = new Date().toLocaleDateString('sv-SE'); // sv-SE gives YYYY-MM-DD
  const { data: todayMovementRes } = useQuery({
    queryKey: ['inventoryMovementReport', filterBranchId, today],
    queryFn: () => inventoryApi.getMovementReport(filterBranchId, today, today),
    enabled: !!filterBranchId || user?.role === 'ADMIN',
  });
  const todayMovement = todayMovementRes?.data || { totalReceiptValue: 0 };

  // --- Mutations ---

  // Lưu (Thêm mới/Cập nhật)
  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id 
      ? inventoryApi.updateInventoryItem({ id, data }) 
      : inventoryApi.createInventoryItem(data),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Cập nhật kho thành công' : 'Thêm nguyên liệu thành công');
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryMovementReport'] });
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Thao tác kho thất bại'));
    }
  });

  // Xóa
  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryApi.deleteInventoryItem(id),
    onSuccess: () => {
      toast.success('Đã xóa nguyên liệu khỏi kho');
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventorySummary'] });
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Xóa thất bại'));
    }
  });

  // --- Handlers ---
  const handleSearch = (val) => {
    setKeyword(val);
    setPage(0);
  };

  const handleBranchChange = (branchId) => {
    setFilterBranchId(branchId);
    setPage(0);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const saveItem = async (data, id) => {
    try {
      await saveMutation.mutateAsync({ id, data });
      return true;
    } catch (e) {
      return false;
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    items,
    summary,
    alerts,
    units,
    branches,
    loading,
    isFetching,
    branchesLoading,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: queryError?.message,
    pagination,
    todayMovement,
    filterBranchId,
    keyword,
    lowStockOnly,
    setLowStockOnly,
    handleSearch,
    handleBranchChange,
    handlePageChange,
    saveItem,
    deleteItem,
    refresh: refetch,
  };
};
