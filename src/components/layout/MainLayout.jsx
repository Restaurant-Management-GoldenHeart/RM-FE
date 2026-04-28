/**
 * MainLayout.jsx — Layout chính với Sidebar + Content area
 * - Tự động redirect về /login khi session hết hạn
 * - Lắng nghe event auth:session-expired từ apiClient
 */
import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/useAuthStore';
import { removeToken } from '../../api/apiClient';
import BranchSelectionModal from '../BranchSelectionModal';
import Header from './Header';
import BottomNav from './BottomNav';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { isAuthenticated, loading, logout } = useAuthStore();
  const navigate = useNavigate();

  // Redirect về login nếu chưa xác thực
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Lắng nghe event session expired từ apiClient interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      removeToken();
      // Reset store state mà không gọi API (vì session đã hết)
      useAuthStore.setState({
        user: null,
        role: null,
        isAuthenticated: false,
        loading: false,
      });
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
        id: 'session-expired', // Tránh toast trùng lặp
        duration: 5000,
      });
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gold-200 border-t-gold-600 animate-spin" />
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-[100dvh] w-full bg-gray-50 flex overflow-hidden">
      <BranchSelectionModal />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main content wrapper */}
      <div
        className={`flex flex-col flex-1 h-full min-w-0 overflow-hidden transition-[margin] duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        } ml-0`}
      >
        <Header />
        <main className="flex-1 w-full overflow-x-hidden overflow-y-auto relative" id="main-scroll-container">
          <div className="px-4 pt-4 pb-24 md:p-6 md:pb-6 w-full max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
