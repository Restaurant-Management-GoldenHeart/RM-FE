/**
 * App.jsx — Root với React Router, Auth initialization, Toast provider
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';

import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import ProfilePage from './pages/ProfilePage';
import EmployeesPage from './pages/EmployeesPage';
import CustomersPage from './pages/CustomersPage';
import StaffPosPage from './pages/StaffPosPage';
import KitchenPage from './pages/KitchenPage';
import InventoryPage from './pages/InventoryPage';

// ─── ROLE GUARD ───────────────────────────────────────────────────────────────
function RoleGuard({ allowedRoles, children }) {
  const { role, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect về trang phù hợp nhất theo role
    if (role === 'KITCHEN') return <Navigate to="/kitchen" replace />;
    if (role === 'STAFF') return <Navigate to="/pos" replace />;
    return <Navigate to="/dashboard" replace />;
  }
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

  const homeRedirect =
    ['ADMIN', 'MANAGER'].includes(role) ? '/dashboard' :
      role === 'KITCHEN' ? '/kitchen' :
        '/pos'; // STAFF

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

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

        {/* Menu — All authenticated */}
        <Route
          path="/menu"
          element={
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF', 'KITCHEN']}>
              <MenuPage />
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

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={homeRedirect} replace />
            : <Navigate to="/login" replace />
        }
      />

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
      {/* Toast notifications — clean white & gold style */}
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#ca8a04', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fee2e2',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}
