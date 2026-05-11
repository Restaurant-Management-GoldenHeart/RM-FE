import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';

const BranchContext = createContext();

export const BRANCH_ALL = 'all';

export const BranchProvider = ({ children }) => {
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const { role, user } = useAuthStore();

  useEffect(() => {
    if (!role || !user) return;

    if (role === 'ADMIN') {
      const savedId = localStorage.getItem('selected_branch_id');
      const savedName = localStorage.getItem('selected_branch_name');

      if (savedId) {
        setSelectedBranchId(parseInt(savedId, 10));
        setSelectedBranchName(savedName || '');
        setIsInitialized(true);
        return;
      }
    }

    const ownBranchId = user.branchId ? parseInt(user.branchId, 10) : null;
    const ownBranchName = user.branchName || '';

    setSelectedBranchId(ownBranchId);
    setSelectedBranchName(ownBranchName);

    if (role === 'ADMIN' && ownBranchId) {
      localStorage.setItem('selected_branch_id', ownBranchId.toString());
      localStorage.setItem('selected_branch_name', ownBranchName);
    } else {
      localStorage.removeItem('selected_branch_id');
      localStorage.removeItem('selected_branch_name');
    }

    setIsInitialized(true);
  }, [role, user]);

  const changeBranch = async (branchId, branchName) => {
    if (role !== 'ADMIN' || !user?.id) return;

    try {
      setLoading(true);
      setSelectedBranchId(Number(branchId));
      setSelectedBranchName(branchName);
      localStorage.setItem('selected_branch_id', branchId.toString());
      localStorage.setItem('selected_branch_name', branchName || '');
      toast.success(`Da chuyen sang: ${branchName}`);
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast.error('Khong the chuyen chi nhanh hien thi. Vui long thu lai.');
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
