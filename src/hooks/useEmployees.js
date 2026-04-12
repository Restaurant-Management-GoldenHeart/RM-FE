import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { employeeApi, roleApi } from '../api/employeeApi';

/**
 * useEmployees - Clean Architecture Hook for Employee Management
 * @returns Object containing state and handlers for Employees module
 */
export const useEmployees = () => {
  const queryClient = useQueryClient();

  // --- Search & Pagination State ---
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const size = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(0); // Reset to first page
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // --- Queries ---

  // 1. Fetch Roles (Required for Form)
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getRoles(),
    staleTime: 10 * 60 * 1000, // Roles rarely change
  });

  // 2. Fetch Employees (Paginated)
  const employeesQuery = useQuery({
    queryKey: ['employees', keyword, page],
    queryFn: () => employeeApi.getEmployees({ keyword, page, size }),
    placeholderData: keepPreviousData,
  });

  // --- Mutation Helper ---
  const handleMutationError = (err, defaultMsg) => {
    console.error('Mutation Error:', err);
    
    if (err.status === 409) {
      return toast.error('Dữ liệu bị trùng lặp: Username hoặc Email đã tồn tại.', { duration: 5000 });
    }

    if (err.message === 'Validation failed' && err.raw?.errors) {
      const fieldErrors = Object.entries(err.raw.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('\n');
      
      return toast.error(`Lỗi dữ liệu:\n${fieldErrors}`, { 
        duration: 6000,
        style: { whiteSpace: 'pre-line' }
      });
    }

    toast.error(err.message || defaultMsg);
  };

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: employeeApi.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Thêm nhân viên mới thành công!');
    },
    onError: (err) => handleMutationError(err, 'Lỗi khi thêm nhân viên')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeeApi.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Cập nhật thông tin thành công!');
    },
    onError: (err) => handleMutationError(err, 'Lỗi khi cập nhật nhân viên')
  });

  const deleteMutation = useMutation({
    mutationFn: employeeApi.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Đã xóa hồ sơ nhân viên');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Không thể xóa nhân viên này')
  });

  // --- Derived Values ---
  const employeeList = useMemo(() => employeesQuery.data?.data?.content || [], [employeesQuery.data]);
  const pagination = useMemo(() => ({
    page: employeesQuery.data?.data?.page || 0,
    totalPages: employeesQuery.data?.data?.totalPages || 0,
    totalElements: employeesQuery.data?.data?.totalElements || 0,
    size
  }), [employeesQuery.data]);

  return {
    // States
    employees: employeeList,
    roles: rolesQuery.data?.data || [],
    pagination,
    keyword: searchInput, // Return searchInput for binding
    
    // Status
    loading: employeesQuery.isLoading,
    isFetching: employeesQuery.isFetching,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: employeesQuery.error?.message,
    isEmpty: !employeesQuery.isLoading && employeeList.length === 0,

    // Actions
    handleSearch: setSearchInput,
    handlePageChange: setPage,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    
    // Mutations
    saveEmployee: async (payload, employeeId) => {
      if (employeeId) {
        // Business Rule: Strip password during update
        const { password, ...updateData } = payload; 
        return updateMutation.mutateAsync({ id: employeeId, data: updateData });
      } else {
        return createMutation.mutateAsync(payload);
      }
    },
    deleteEmployee: async (id) => {
      return deleteMutation.mutateAsync(id);
    }
  };
};
