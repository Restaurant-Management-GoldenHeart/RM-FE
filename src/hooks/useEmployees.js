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
  const { data: rolesRes } = useQuery({
    queryKey: ['roles'],
    queryFn: roleApi.getRoles,
    staleTime: 300000, // 5 mins
  });
  const roles = rolesRes?.data || [];

  // 2. Fetch Branches (Required for Form)
  const { data: branchesRes, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: employeeApi.getBranches,
    staleTime: 300000,
  });
  const branches = branchesRes?.data || [];

  // 3. Main Employees Query
  const {
    data: employeesRes,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['employees', keyword, page],
    queryFn: () => employeeApi.getEmployees({ keyword, page, size }),
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const employees = employeesRes?.data?.content || [];
  const pagination = {
    page: employeesRes?.data?.number || 0,
    totalPages: employeesRes?.data?.totalPages || 0,
    totalElements: employeesRes?.data?.totalElements || 0,
    size: employeesRes?.data?.size || 10,
  };

  // --- Mutations ---

  // Save (Create/Update)
  const saveMutation = useMutation({
    mutationFn: ({ data, id }) => id 
      ? employeeApi.updateEmployee(id, data) 
      : employeeApi.createEmployee(data),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Cập nhật nhân viên thành công' : 'Thêm nhân viên mới thành công');
      queryClient.invalidateQueries(['employees']);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Không thể lưu thông tin nhân viên';
      toast.error(msg);
    }
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id) => employeeApi.deleteEmployee(id),
    onSuccess: () => {
      toast.success('Đã vô hiệu hóa tài khoản nhân viên');
      queryClient.invalidateQueries(['employees']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    }
  });

  // --- Handlers ---
  const handleSearch = (val) => {
    setSearchInput(val);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const saveEmployee = async (data, id) => {
    try {
      await saveMutation.mutateAsync({ data, id });
      return true;
    } catch (e) {
      return false;
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    employees,
    roles,
    branches,
    loading,
    isFetching,
    branchesLoading,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: queryError?.message,
    isEmpty: employees.length === 0 && !loading,
    pagination,
    keyword: searchInput,
    handleSearch,
    handlePageChange,
    saveEmployee,
    deleteEmployee,
    refresh: refetch,
  };
};
