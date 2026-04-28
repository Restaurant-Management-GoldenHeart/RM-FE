import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const BranchContext = createContext();

export const BRANCH_ALL = 'all';

export const BranchProvider = ({ children }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const { role } = useAuthStore();

  // Khởi tạo từ localStorage khi mount
  useEffect(() => {
    const savedId = localStorage.getItem('selected_branch_id');
    const savedName = localStorage.getItem('selected_branch_name');
    
    if (role === 'ADMIN') {
      // ADMIN: mặc định 'all' nếu chưa có
      setSelectedBranchId(savedId || BRANCH_ALL);
      setSelectedBranchName(savedName || '🏢 Tất cả chi nhánh');
    } else {
      // Role khác: đọc từ localStorage nếu đã chọn hôm trước
      if (savedId) {
        setSelectedBranchId(savedId === BRANCH_ALL ? BRANCH_ALL : parseInt(savedId, 10));
        setSelectedBranchName(savedName || '');
      }
    }
    setIsInitialized(true);
  }, [role]);

  const changeBranch = (branchId, branchName) => {
    setSelectedBranchId(branchId);
    setSelectedBranchName(branchName);
    
    if (branchId) {
      localStorage.setItem('selected_branch_id', branchId.toString());
      localStorage.setItem('selected_branch_name', branchName || '');
    } else {
      localStorage.removeItem('selected_branch_id');
      localStorage.removeItem('selected_branch_name');
    }
  };

  const buildApiParams = () => {
    if (!selectedBranchId || selectedBranchId === BRANCH_ALL) {
      return {}; // không truyền branchId
    }
    return { branchId: selectedBranchId };
  };

  const isAllBranches = selectedBranchId === BRANCH_ALL || !selectedBranchId;

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        selectedBranchName,
        changeBranch,
        buildApiParams,
        isAllBranches,
        isInitialized
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
