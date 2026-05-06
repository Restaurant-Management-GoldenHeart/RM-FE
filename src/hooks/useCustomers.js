import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { customerApi } from '../api/customerApi';
import { useBranchContext, BRANCH_ALL } from '../context/BranchContext';

/**
 * useCustomers - Custom hook for Customer Management
 * @description Centralizes analytical data, pagination, search, and CRUD logic.
 * Branch-aware: re-fetches automatically when selected branch changes.
 */
export function useCustomers() {
  const queryClient = useQueryClient();
  const { selectedBranchId, isInitialized } = useBranchContext();

  // Resolve actual branchId to send to API (null = all branches)
  const branchId = (selectedBranchId && selectedBranchId !== BRANCH_ALL)
    ? selectedBranchId
    : undefined;

  // --- Search & Pagination State ---
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Debouncing logic for keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(0); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when branch changes
  useEffect(() => {
    setPage(0);
  }, [branchId]);

  // --- Queries ---
  const customersQuery = useQuery({
    queryKey: ['customers', keyword, page, branchId],
    queryFn: () => customerApi.getCustomers({ keyword, page, size: pageSize, branchId }),
    placeholderData: keepPreviousData,
    enabled: isInitialized, // wait until branch is loaded from localStorage
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Đăng ký khách hàng thành công!');
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi tạo hồ sơ khách hàng')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customerApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cập nhật thông tin khách hàng thành công!');
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi cập nhật hồ sơ')
  });

  const deleteMutation = useMutation({
    mutationFn: customerApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Đã xóa hồ sơ khách hàng!');
    },
    onError: (err) => toast.error(err.message || 'Lỗi khi xóa hồ sơ')
  });

  // --- Derived Values ---
  const customerList = useMemo(() => customersQuery.data?.data?.content || [], [customersQuery.data]);
  const totalPages = useMemo(() => customersQuery.data?.data?.totalPages || 0, [customersQuery.data]);
  const totalElements = useMemo(() => customersQuery.data?.data?.totalElements || 0, [customersQuery.data]);

  return {
    customerList,
    totalPages,
    totalElements,
    page,
    searchInput,
    pageSize,

    isLoading: customersQuery.isLoading,
    isFetching: customersQuery.isFetching,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    setPage,
    setSearchInput,

    handleSave: async (payload, customerId) => {
      if (customerId) {
        return updateMutation.mutateAsync({ id: customerId, data: payload });
      } else {
        return createMutation.mutateAsync(payload);
      }
    },

    handleDelete: async (customer) => {
      if (window.confirm(`Bạn có chắc muốn xóa hồ sơ khách hàng "${customer.name}"?`)) {
        return deleteMutation.mutateAsync(customer.id);
      }
    },

    refresh: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
    clearFilters: () => {
      setSearchInput('');
      setKeyword('');
      setPage(0);
    }
  };
}
