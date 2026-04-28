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
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredEmployees = employees.filter(emp => {
    if (statusFilter === 'ACTIVE') return emp.status === 'ACTIVE';
    if (statusFilter === 'INACTIVE') return emp.status !== 'ACTIVE';
    return true;
  });

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
    <>
      <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between gap-4 md:px-0 mt-2 md:mt-0">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
            <Users className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
              Nhân sự
            </h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 md:mt-2">
              Human Resources
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all shadow-sm active:scale-95 shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="hidden md:flex items-center justify-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-gray-900/10 active:scale-95 group"
            >
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Thêm nhân viên</span>
            </button>
        </div>
      </div>

      {/* Mobile Sticky Search & Filter */}
      <div className="sticky top-0 md:static z-20 bg-[#fafafb] md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0 py-3 md:py-0 space-y-3">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT..."
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 md:py-3.5 bg-white border border-gray-200 rounded-xl md:rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all placeholder:text-gray-300 shadow-sm"
          />
        </div>
        
        {/* Chip Filters (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:hidden">
          <button 
            onClick={() => setStatusFilter('ALL')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-gray-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setStatusFilter('ACTIVE')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            Đang làm
          </button>
          <button 
            onClick={() => setStatusFilter('INACTIVE')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === 'INACTIVE' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            Nghỉ việc
          </button>
        </div>

        {/* Desktop Toolbar Extras */}
        <div className="hidden md:flex items-center justify-end gap-2.5">
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

      {/* 2. Main Content Area */}
      <div className="bg-transparent md:bg-white/80 md:backdrop-blur-xl md:border md:border-white/60 md:rounded-[2.5rem] md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[500px] transition-all duration-300">

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

        {/* Content View */}
        <div className="flex-1 relative overflow-x-hidden md:overflow-x-auto overflow-y-auto px-4 md:px-0">
          {loading ? (
            <div className="md:absolute inset-0 z-10 flex flex-col md:flex-row md:items-center justify-center bg-transparent md:bg-white/50 md:backdrop-blur-sm gap-4 p-4 md:p-0">
               {/* Mobile Skeletons */}
               <div className="w-full space-y-3 md:hidden">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4 animate-pulse">
                     <div className="w-12 h-12 bg-gray-200 rounded-2xl shrink-0" />
                     <div className="flex-1 space-y-2 py-1">
                       <div className="h-4 bg-gray-200 rounded w-2/3" />
                       <div className="h-3 bg-gray-200 rounded w-1/2" />
                     </div>
                   </div>
                 ))}
               </div>
               {/* Desktop Spinner */}
               <div className="hidden md:flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin drop-shadow-md" />
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">Đang tải dữ liệu...</p>
               </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-20 md:py-32 flex flex-col items-center justify-center bg-white md:bg-transparent rounded-3xl md:rounded-none border border-gray-100 md:border-none shadow-sm md:shadow-none">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-full md:rounded-[2.5rem] border border-gray-100 flex items-center justify-center mb-6">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
              </div>
              <h3 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">Chưa có nhân viên nào</h3>
              <p className="text-gray-400 text-xs mt-2 max-w-[250px] text-center font-medium leading-relaxed">
                Nhấn dấu + góc dưới để thêm nhân viên mới vào hệ thống.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card List */}
              <div className="grid grid-cols-1 gap-3 md:hidden pb-4">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} onClick={() => handleOpenEdit(emp)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform relative overflow-hidden group">
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-amber-600 font-black text-sm">
                          {emp.fullName[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <p className="text-sm font-black text-gray-900 leading-tight truncate min-w-0 flex-1">
                            {emp.fullName}
                          </p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide whitespace-nowrap ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                            {emp.status === 'ACTIVE' ? 'Đang làm' : 'Nghỉ'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          {emp.roleName}
                        </p>
                        
                        <div className="mt-2.5 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{emp.phone || "Chưa cập nhật SĐT"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold bg-gray-50 rounded-lg px-2 py-1 min-w-0 overflow-hidden">
                            <span className="text-amber-600 shrink-0">CN:</span>
                            <span className="truncate">{emp.branchName || 'Trụ sở chính'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <table className="hidden md:table w-full text-left border-collapse">
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
                  {filteredEmployees.map((emp) => (
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
            </>
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

      {/* Mobile FAB */}
      <button 
        onClick={handleOpenAdd}
        className="md:hidden fixed right-4 bottom-20 w-14 h-14 bg-amber-500 text-white rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.4)] active:scale-90 transition-transform z-[100]"
      >
        <UserPlus className="w-6 h-6" />
      </button>

    </>
  );
}