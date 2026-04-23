import { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import EmployeeFormModal from '../components/employees/EmployeeFormModal';
import PremiumConfirmModal from '../components/PremiumConfirmModal';

/**
 * EmployeesPage.jsx — Quản lý nhân viên với theme "Simple White & Gold".
 * Kiến trúc 3 lớp: API (employeeApi), Hook (useEmployees) và UI.
 */
export default function EmployeesPage() {
  const {
    employees,
    roles,
    loading,
    isFetching,
    isSaving,
    isDeleting,
    error,
    isEmpty,
    pagination,
    keyword,
    branches,
    branchesLoading,
    handleSearch,
    handlePageChange,
    saveEmployee,
    deleteEmployee,
    refresh
  } = useEmployees();

  // --- Local UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- Handlers ---
  const handleOpenAdd = () => {
    setEmployeeToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEmployeeToEdit(emp);
    setIsFormOpen(true);
  };

  const onFormSubmit = async (formData) => {
    const success = await saveEmployee(formData, employeeToEdit?.id);
    if (success) {
      setIsFormOpen(false);
      setEmployeeToEdit(null);
    }
  };

  const onDeleteConfirm = async () => {
    if (deleteTarget) {
      const success = await deleteEmployee(deleteTarget.id);
      if (success) setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
              Quản lý Nhân sự
            </h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
              Human Resources Portal
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm active:scale-95"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95 group"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Thêm nhân viên</span>
            </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[600px] transition-all duration-300">
        
        {/* Toolbar */}
        <div className="p-8 border-b border-gray-100/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/40">
          <div className="relative max-w-lg w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã hoặc email (tự động)..."
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all placeholder:text-gray-300"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button className="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all">
              <Filter size={14} />
              <span>Lọc dữ liệu</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all">
              <Download size={14} />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="m-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-4 text-red-700 animate-fade-in shadow-sm shadow-red-500/5">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500">
               <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-widest">Lấy dữ liệu thất bại</p>
              <p className="text-xs opacity-80 mt-1 font-medium">{error}</p>
            </div>
            <button
              onClick={refresh}
              className="px-6 py-2.5 bg-red-100 hover:bg-red-200 border border-red-200 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 relative overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin drop-shadow-md" />
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">Hệ thống đang tải...</p>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center justify-center mb-8">
                <Users className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Cơ sở dữ liệu trống</h3>
              <p className="text-gray-400 text-xs mt-3 max-w-xs text-center font-medium leading-relaxed">
                Chưa có hồ sơ nhân viên nào khớp với từ khóa của bạn. Vui lòng kiểm tra lại bộ lọc.
              </p>
            </div>
          ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100/50">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] min-w-[300px]">Nhân sự</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] min-w-[200px]">Liên lạc</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] min-w-[200px]">Vai trò & Chi nhánh</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] min-w-[150px]">Trạng thái</th>
                    <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right min-w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="group hover:bg-amber-50/40 transition-colors duration-300">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-amber-600 font-black text-sm">
                              {emp.fullName[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-tight">
                              {emp.fullName}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tabular-nums tracking-tighter">
                              ID: {emp.employeeCode || emp.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                            <Mail className="w-3.5 h-3.5 text-gray-300" />
                            <span>{emp.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                            <Phone className="w-3.5 h-3.5 text-gray-300" />
                            <span>{emp.phone || "--- --- ---"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1.5">
                          <p className="text-xs font-black text-gray-700">
                            {emp.branchName || (emp.roleName === 'ADMIN' ? 'Trụ sở chính' : "Chưa cập nhật")}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-tighter">
                            {emp.roleName}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {emp.status === 'ACTIVE' ? "Hoạt động" : "Tạm dừng"}
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 group-hover:scale-105 transition-all">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-amber-50 text-gray-400 hover:text-amber-500 rounded-xl border border-gray-100/50 transition-all active:scale-90 shadow-sm"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl border border-gray-100/50 transition-all active:scale-90 shadow-sm"
                            title="Vô hiệu hóa tài khoản"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          )}
        </div>

        {/* 3. Footer / Pagination Area */}
        {!isEmpty && (
          <div className="p-8 border-t border-gray-100/50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/40">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Bản ghi <b className="text-gray-900">{employees.length}</b> / <b className="text-gray-900">{pagination.totalElements}</b>
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 0}
                className="w-11 h-11 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-gray-400 disabled:opacity-20 hover:text-gray-900 transition-all active:scale-90 shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1.5">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`min-w-[44px] h-11 rounded-2xl text-[11px] font-black transition-all ${pagination.page === i
                      ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10'
                      : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages - 1}
                className="w-11 h-11 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-gray-400 disabled:opacity-20 hover:text-gray-900 transition-all active:scale-90 shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Overlay Components (Modals) */}
      
      {/* Employee Form Modal (Create / Update) */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={onFormSubmit}
        employee={employeeToEdit}
        roles={roles}
        branches={branches}
        isLoading={isSaving}
        branchesLoading={branchesLoading}
      />

      {/* Delete Confirmation Modal */}
      <PremiumConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDeleteConfirm}
        title="Vô hiệu hóa tài khoản"
        message="Bạn có chắc muốn vô hiệu hóa nhân viên"
        highlightText={deleteTarget?.fullName || ''}
        note="Thao tác này thực hiện xóa mềm (Deactivate) để bảo toàn lịch sử dữ liệu hệ thống."
        cancelText="Hủy bỏ"
        confirmText="Vô hiệu hóa"
        isLoading={isDeleting}
      />
    </div>
  );
}