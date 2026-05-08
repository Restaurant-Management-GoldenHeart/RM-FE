import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { employeeApi } from '../../api/employeeApi';
import { menuApi } from '../../api/menuApi';
import { customerApi } from '../../api/customerApi';
import { inventoryApi } from '../../api/inventoryApi';

/**
 * Adapter Hook cho Dashboard Page
 * Tách biệt logic lấy dữ liệu thống kê ra khỏi giao diện.
 */
export const useDashboardAdapter = () => {
  const { user, role } = useAuthStore();
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  
  const [stats, setStats] = useState({ 
    employees: 0, customers: 0, menuItems: 0, inventoryItems: 0 
  });
  
  const [loading, setLoading] = useState({
    employees: true, customers: true, menuItems: true, inventoryItems: true
  });

  const [errors, setErrors] = useState({
    employees: false, customers: false, menuItems: false, inventoryItems: false
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (isFetching.current) return;

    isFetching.current = true;
    setRefreshing(true);
    setLoading({ employees: true, customers: true, menuItems: true, inventoryItems: true });
    setErrors({ employees: false, customers: false, menuItems: false, inventoryItems: false });

    try {
      const results = await Promise.allSettled([
        employeeApi.getEmployees({ page: 0, size: 1 }),
        customerApi.getCustomers({ page: 0, size: 1 }),
        menuApi.getMenuItems({ page: 0, size: 1 }),
        inventoryApi.getInventoryItems({ page: 0, size: 1 }),
      ]);

      if (!isMounted.current) return;

      const [emp, cus, menu, inv] = results;

      setStats({
        employees: emp.status === 'fulfilled' ? (emp.value?.data?.totalElements ?? 0) : 0,
        customers: cus.status === 'fulfilled' ? (cus.value?.data?.totalElements ?? 0) : 0,
        menuItems: menu.status === 'fulfilled' ? (menu.value?.data?.totalElements ?? 0) : 0,
        inventoryItems: inv.status === 'fulfilled' ? (inv.value?.data?.totalElements ?? 0) : 0,
      });

      setErrors({
        employees: emp.status === 'rejected',
        customers: cus.status === 'rejected',
        menuItems: menu.status === 'rejected',
        inventoryItems: inv.status === 'rejected',
      });
    } finally {
      isFetching.current = false;
      if (isMounted.current) {
        setLoading({ employees: false, customers: false, menuItems: false, inventoryItems: false });
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchStats();
    return () => { isMounted.current = false; };
  }, [fetchStats]);

  const allFailed = useMemo(() => 
    Object.values(errors).every(e => e) && !Object.values(loading).some(l => l),
    [errors, loading]
  );

  return {
    user,
    role,
    stats,
    loading,
    errors,
    refreshing,
    fetchStats,
    allFailed
  };
};
