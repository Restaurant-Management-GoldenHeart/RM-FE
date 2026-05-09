import { useState, useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { tableApi, areaApi } from '../../api/posApi';
import { useBranchContext } from '../../context/BranchContext';
import toast from 'react-hot-toast';

/**
 * Adapter Hook cho Module Sơ đồ bàn (Table Map)
 * Đã kết nối trực tiếp với Backend API (RM-BE).
 */
export const useTableMapAdapter = () => {
  const { role, user } = useAuthStore();
  const { selectedBranchId } = useBranchContext();

  const [tables, setTables] = useState([]);
  const [areas, setAreas] = useState([{ id: 'ALL', name: 'Tất cả' }]);
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isRootAdmin = role === 'ADMIN' && user?.username === 'admin';

  // Resolve branchId thành integer sạch từ context hoặc profile
  const rawBranchId = selectedBranchId || user?.branchId || user?.profile?.branchId;
  const resolvedBranchId = rawBranchId ? parseInt(rawBranchId, 10) : null;

  // === Logic phù hợp với từng Service BE ===
  //
  // RestaurantTableService.resolveAccessibleBranchId:
  //   ADMIN hoặc MANAGER → bypass, dùng branchId truyền vào
  //   Còn lại → dùng branchId từ profile trong DB
  //
  // DiningAreaService.resolveReadableBranchId:
  //   CHỈ ADMIN → bypass, dùng branchId truyền vào
  //   Còn lại (kể cả MANAGER) → dùng branchId từ profile trong DB
  //
  // Do đó:
  //   fetchTables  → gửi branchId nếu là ADMIN hoặc MANAGER
  //   fetchAreas   → gửi branchId CHỈ nếu là ADMIN

  const branchIdForTables = (isAdmin || isManager) ? resolvedBranchId : null;
  const branchIdForAreas = isAdmin ? resolvedBranchId : null;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tableApi.getTables(branchIdForTables);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setTables(data);
    } catch (err) {
      toast.error('Không thể tải danh sách bàn');
    } finally {
      setLoading(false);
    }
  }, [branchIdForTables]);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await areaApi.getAreas(branchIdForAreas);
      const data = Array.isArray(res) ? res : (res?.data || []);
      
      const cleanData = data.map(it => ({
        ...it,
        name: it.name?.replace(/TSS\s?\|\|\s?°?NG/g, 'Tầng')
                      .replace(/Chi\s?nhnh/g, 'Chi nhánh')
                      .replace(/QuAn/g, 'Quận')
      }));
      setAreas([{ id: 'ALL', name: 'Tất cả' }, ...cleanData]);
    } catch (err) {
      toast.error('Không thể tải danh sách khu vực');
    }
  }, [branchIdForAreas]);

  const deleteTable = async (id) => {
    try {
      await tableApi.deleteTable(id);
      toast.success('Xoá bàn thành công');
      fetchTables();
      return true;
    } catch (err) {
      if (err.response?.status === 409) {
        toast(
          'Bàn này đang có dữ liệu đơn hàng hoặc đang được sử dụng, không thể xóa!',
          { icon: '⚠️', style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fef3c7' } }
        );
      } else {
        toast.error('Xoá bàn thất bại. Vui lòng thử lại.');
      }
      return false;
    }
  };

  const deleteArea = async (id) => {
    // [PRE-VALIDATION] Kiểm tra xem khu vực có còn bàn hay không trước khi gọi API
    // Điều này giúp tránh lỗi 409 Conflict hiện lên Console trình duyệt.
    const hasTables = (tables || []).some(t => Number(t.areaId || t.area_id) === Number(id));
    
    if (hasTables) {
      toast(
        'Khu vực này vẫn còn bàn, vui lòng xóa hoặc di chuyển bàn trước!',
        { icon: '⚠️', style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fef3c7' } }
      );
      return false;
    }

    try {
      await areaApi.deleteArea(id);
      toast.success('Xoá khu vực thành công');
      fetchAreas();
      return true;
    } catch (err) {
      if (err.response?.status === 409) {
        toast(
          'Không thể xóa khu vực này (có thể do ràng buộc dữ liệu từ phía máy chủ).',
          { icon: '⚠️', style: { background: '#fffbeb', color: '#92400e', border: '1px solid #fef3c7' } }
        );
      } else {
        toast.error('Xoá khu vực thất bại. Vui lòng thử lại.');
      }
      return false;
    }
  };

  return {
    tables,
    areas,
    loading,
    user,
    role,
    isAdmin,
    isRootAdmin,
    fetchTables,
    fetchAreas,
    deleteTable,
    deleteArea
  };
};
