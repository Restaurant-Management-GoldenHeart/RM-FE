import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inventoryApi } from '../api/inventoryApi';
import { employeeApi } from '../api/employeeApi';
import { extractErrorMessage } from '../utils/errorHelper';
import { useBranchContext, BRANCH_ALL } from '../context/BranchContext';

/**
 * useInventory - Hook quản lý kho hàng chuẩn Production.
 * Branch-aware: đồng bộ filterBranchId với BranchContext.
 * Khi ADMIN đổi chi nhánh trên topbar → kho tự load lại.
 */
export const useInventory = () => {
  const queryClient = useQueryClient();
  const { selectedBranchId, isInitialized } = useBranchContext();

  // Resolve branchId from context (null = all)
  const contextBranchId = (selectedBranchId && selectedBranchId !== BRANCH_ALL)
    ? selectedBranchId
    : undefined;

  // filterBranchId mirrors the context value
  const [filterBranchId, setFilterBranchId] = useState(contextBranchId);

  // Keep filterBranchId in sync with context whenever it changes
  useEffect(() => {
    setFilterBranchId(contextBranchId);
    setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // --- State: Filter & Pagination ---
  const [keyword, setKeyword] = useState('');
  const [lowStockOnly, setLowStockOnlyState] = useState(false);
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
    staleTime: 300000,
  });

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
    enabled: isInitialized,
  });

  const items = itemsRes?.data?.content || [];
  const currentPage = itemsRes?.data?.page ?? 0;
  const totalPages = itemsRes?.data?.totalPages ?? 0;
  const totalElements = itemsRes?.data?.totalElements ?? 0;
  const pagination = {
    page: currentPage,
    totalPages,
    totalElements,
    start: totalElements === 0 ? 0 : currentPage * size + 1,
    end: totalElements === 0 ? 0 : Math.min((currentPage + 1) * size, totalElements),
  };

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 0) {
        setPage(0);
      }
      return;
    }

    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  // 3. Thống kê tổng quan
  const { data: summaryRes } = useQuery({
    queryKey: ['inventorySummary', filterBranchId],
    queryFn: () => inventoryApi.getInventorySummary({ branchId: filterBranchId }),
    enabled: isInitialized,
  });
  const summary = summaryRes?.data || { totalItems: 0, totalInventoryValue: 0, lowStockCount: 0 };

  // 4. Cảnh báo tồn kho thấp
  const { data: alertsRes } = useQuery({
    queryKey: ['lowStockAlerts', filterBranchId],
    queryFn: () => inventoryApi.getLowStockAlerts({ branchId: filterBranchId }),
    enabled: isInitialized,
  });
  const alerts = alertsRes?.data || [];

  // 5. Đơn vị tính
  const { data: unitsRes } = useQuery({
    queryKey: ['measurementUnits'],
    queryFn: inventoryApi.getMeasurementUnits,
    staleTime: 300000,
  });
  const units = unitsRes?.data || [];

  // 6. Báo cáo di chuyển kho hôm nay
  const today = new Date().toLocaleDateString('sv-SE');
  const { data: todayMovementRes } = useQuery({
    queryKey: ['inventoryMovementReport', filterBranchId, today],
    queryFn: () => inventoryApi.getMovementReport(filterBranchId, today, today),
    enabled: isInitialized,
  });
  const todayMovement = todayMovementRes?.data || { totalReceiptValue: 0 };

  // --- Mutations ---

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
    // onError intentionally omitted — toast is shown by InventoryFormModal's catch block
  });

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

  const setLowStockOnly = (valueOrUpdater) => {
    setPage(0);
    setLowStockOnlyState((currentValue) =>
      typeof valueOrUpdater === 'function' ? valueOrUpdater(currentValue) : valueOrUpdater
    );
  };

  const handleBranchChange = (branchId) => {
    setFilterBranchId(branchId);
    setPage(0);
  };

  const handlePageChange = (newPage) => setPage(newPage);

  const saveItem = async (data, id) => {
    // Let the error propagate so InventoryFormModal can handle field-level errors
    await saveMutation.mutateAsync({ id, data });
    return true;
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
