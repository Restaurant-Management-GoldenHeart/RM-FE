/**
 * App.jsx — Root với React Router, Auth initialization, Toast provider
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import HomePage from './pages/HomePage';

/**
 * File này giữ vai trò khung xương của frontend:
 * - khởi tạo auth state khi app mount
 * - quản lý route theo role
 * - đặt toast provider tại root để mọi trang đều dùng chung
 */

import MainLayout from './components/layout/MainLayout';
import AccountLayout from './pages/account/AccountLayout';
import AccountDashboardPage from './pages/account/AccountDashboardPage';
import LoyaltyPage from './pages/account/LoyaltyPage';
import OrderHistoryPage from './pages/account/OrderHistoryPage';
import DishHistoryPage from './pages/account/DishHistoryPage';
import ReviewsPage from './pages/account/ReviewsPage';
import CouponsPage from './pages/account/CouponsPage';
import AccountProfilePage from './pages/account/AccountProfilePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import MenuPage from './pages/admin/MenuPage';
import ComboManagementPage from './pages/admin/ComboManagementPage';
import ProfilePage from './pages/admin/ProfilePage';
import EmployeesPage from './pages/admin/EmployeesPage';
import CustomersPage from './pages/admin/CustomersPage';
import TableMapPage from './pages/admin/TableMapPage';
import StaffPosPage from './pages/admin/StaffPosPage';
import KitchenPage from './pages/admin/KitchenPage';
import InventoryPage from './pages/admin/InventoryPage';
import InventoryHistoryPage from './pages/admin/InventoryHistoryPage';
import WasteRequestPage from './pages/admin/WasteRequestPage';
import PayOsResultPage from './pages/PayOsResultPage';

// ─── ROLE GUARD ───────────────────────────────────────────────────────────────
function RoleGuard({ allowedRoles, children }) {
  const { role, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'KITCHEN') return <Navigate to="/kitchen" replace />;
    if (role === 'STAFF') return <Navigate to="/pos" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** Guard chỉ cho phép CUSTOMER — redirect về homepage nếu chưa đăng nhập hoặc sai role. */
function CustomerGuard({ children }) {
  const { role, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (role !== 'CUSTOMER') return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── APP ROUTES ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated, role, loading, initAuth } = useAuthStore();

  useEffect(() => { initAuth(); }, [initAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-gold-200 border-t-gold-600 animate-spin" />
          <p className="text-gray-500 text-sm tracking-wide">Khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  // Mỗi role có một trang nhà riêng để user vào đúng luồng vận hành ngay sau login.
  const homeRedirect =
    ['ADMIN', 'MANAGER'].includes(role) ? '/dashboard' :
      role === 'KITCHEN' ? '/kitchen' :
        '/pos'; // STAFF

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/payment-success" element={<PayOsResultPage variant="success" />} />
      <Route path="/payment-cancel" element={<PayOsResultPage variant="cancel" />} />

      {/* Protected — Sidebar Layout */}
      <Route element={<MainLayout />}>
        {/* Dashboard — ADMIN, MANAGER */}
        <Route
          path="/dashboard"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <DashboardPage />
            </RoleGuard>
          }
        />

        {/* Employees — ADMIN, MANAGER */}
        <Route
          path="/employees"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <EmployeesPage />
            </RoleGuard>
          }
        />

        {/* Customers — ADMIN, MANAGER */}
        <Route
          path="/customers"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <CustomersPage />
            </RoleGuard>
          }
        />

        <Route
          path="/table-map"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <TableMapPage />
            </RoleGuard>
          }
        />

        {/* Menu — All authenticated */}
        <Route
          path="/menu"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN']}>
              <MenuPage />
            </RoleGuard>
          }
        />

        {/* Combo — ADMIN, MANAGER */}
        <Route
          path="/combos"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <ComboManagementPage />
            </RoleGuard>
          }
        />

        {/* Inventory — All authenticated */}
        <Route
          path="/inventory"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN']}>
              <InventoryPage />
            </RoleGuard>
          }
        />

        <Route
          path="/inventory/history"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
              <InventoryHistoryPage />
            </RoleGuard>
          }
        />

        {/* Waste Requests — All authenticated */}
        <Route
          path="/waste-requests"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN']}>
              <WasteRequestPage />
            </RoleGuard>
          }
        />

        {/* POS — ADMIN, MANAGER, STAFF */}
        <Route
          path="/pos"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF']}>
              <StaffPosPage />
            </RoleGuard>
          }
        />

        {/* Kitchen — KITCHEN, ADMIN, MANAGER */}
        <Route
          path="/kitchen"
          element={
            <RoleGuard allowedRoles={['KITCHEN', 'ADMIN', 'MANAGER']}>
              <KitchenPage />
            </RoleGuard>
          }
        />

        {/* Profile — Any authenticated */}
        <Route
          path="/profile"
          element={
            <RoleGuard>
              <ProfilePage />
            </RoleGuard>
          }
        />
      </Route>

      {/* Customer Portal — chỉ role CUSTOMER */}
      <Route
        path="/account"
        element={<CustomerGuard><AccountLayout /></CustomerGuard>}
      >
        <Route index element={<AccountDashboardPage />} />
        <Route path="loyalty" element={<LoyaltyPage />} />
        <Route path="orders" element={<OrderHistoryPage />} />
        <Route path="dishes" element={<DishHistoryPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="profile" element={<AccountProfilePage />} />
      </Route>

      {/* Root — public homepage */}
      <Route path="/" element={<HomePage />} />

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      {/* Toast notifications — responsive Vietnamese style */}
      <Toaster
        position="top-right"
        gutter={8}
        containerClassName="pos-toaster"
        containerStyle={{
          top: 'env(safe-area-inset-top, 16px)',
          bottom: 'calc(env(safe-area-inset-bottom, 16px) + 72px)',
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '14px 16px',
            maxWidth: '420px',
            lineHeight: '1.5',
          },
          success: {
            duration: 3000,
            iconTheme: { primary: '#ca8a04', secondary: '#ffffff' },
            style: {
              background: '#fffbeb',
              color: '#92400e',
              border: '1px solid #fde68a',
            },
          },
          error: {
            duration: 5000,
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontWeight: '600',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}
