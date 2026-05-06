import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { employeeApi } from '../api/employeeApi';
import { toast } from 'react-hot-toast';

const BranchContext = createContext();

export const BRANCH_ALL = 'all';

export const BranchProvider = ({ children }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const { role, user, setUser } = useAuthStore();

  useEffect(() => {
    if (!role || !user) return;

    // Đọc từ localStorage trước
    const savedId = localStorage.getItem('selected_branch_id');
    const savedName = localStorage.getItem('selected_branch_name');

    if (savedId) {
      setSelectedBranchId(parseInt(savedId, 10));
      setSelectedBranchName(savedName || '');
    } else {
      // Nếu chưa có trong localStorage, dùng chi nhánh từ profile (áp dụng cho cả Admin và các role khác)
      const ownBranchId = user.branchId ? parseInt(user.branchId, 10) : null;
      const ownBranchName = user.branchName || '';
      setSelectedBranchId(ownBranchId);
      setSelectedBranchName(ownBranchName);
      
      if (ownBranchId) {
        localStorage.setItem('selected_branch_id', ownBranchId.toString());
        localStorage.setItem('selected_branch_name', ownBranchName);
      }
    }

    setIsInitialized(true);
  }, [role, user]);

  const changeBranch = async (branchId, branchName) => {
    // Chỉ ADMIN được phép đổi chi nhánh
    if (role !== 'ADMIN' || !user?.id) return;

    try {
      setLoading(true);
      
      // Gọi API updateEmployee có sẵn trên backend (PUT /api/v1/employees/{id})
      // Backend hiện tại hỗ trợ branchId trong payload của API này
      await employeeApi.updateEmployee(user.id, { branchId: Number(branchId) });
      
      // Cập nhật local state
      setSelectedBranchId(Number(branchId));
      setSelectedBranchName(branchName);
      
      // Đồng bộ vào localStorage
      localStorage.setItem('selected_branch_id', branchId.toString());
      localStorage.setItem('selected_branch_name', branchName || '');
      
      // Cập nhật useAuthStore để đồng bộ thông tin user
      setUser({
        ...user,
        branchId: Number(branchId),
        branchName: branchName
      });
      
      toast.success(`Đã chuyển sang: ${branchName}`);
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Không thể lưu chi nhánh trên hệ thống. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const buildApiParams = () => {
    if (!selectedBranchId) {
      return {};
    }
    return { branchId: selectedBranchId };
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        selectedBranchName,
        changeBranch,
        buildApiParams,
        isInitialized,
        loading,
        canChangeBranch: role === 'ADMIN',
      }}
    >
      {children}
    </BranchContext.Provider>
  );
};

export const useBranchContext = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;
