import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCustomers } from '../hooks/useCustomers';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { Plus, UserPlus } from 'lucide-react';

// Modular Components
import { CustomerHeader } from '../components/customers/CustomerHeader';
import { CustomerFilterBar } from '../components/customers/CustomerFilterBar';
import { CustomerTable } from '../components/customers/CustomerTable';
import CustomerMobileList from '../components/customers/CustomerMobileList';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { CustomerDeleteModal } from '../components/customers/CustomerDeleteModal';

/**
 * CustomersPage - Main Container for Customer Management (CRM)
 * Design: High Contrast (Simple White & Gold)
 * Architecture: Clean Components + Custom Hook
 */
export default function CustomersPage() {
  const { role: actorRole } = useAuthStore();
  const isAdmin = actorRole === 'ADMIN';
  const isMobile = useMediaQuery('(max-width: 767px)');

  // --- Logic via Custom Hook ---
  const {
    customerList,
    totalPages,
    totalElements,
    page,
    searchInput,
    pageSize,
    isLoading,
    isFetching,
    isSaving,
    isDeleting,
    setPage,
    setSearchInput,
    handleSave,
    handleDelete,
    refresh,
    clearFilters
  } = useCustomers();

  // --- Local UI State ---
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- Modal Handlers ---
  const handleOpenAdd = () => {
    setEditCustomer(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (cus) => {
    setEditCustomer(cus);
    setShowFormModal(true);
  };

  const onFormSave = async (payload) => {
    const customerId = editCustomer?.id || null;
    await handleSave(payload, customerId);
    setShowFormModal(false);
    setEditCustomer(null);
  };

  const onDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await handleDelete(deleteTarget);
    setDeleteTarget(null);
  };

  // --- Render Mappings ---
  const pagination = {
    page,
    totalPages,
    totalElements,
    start: totalElements ? page * pageSize + 1 : 0,
    end: Math.min((page + 1) * pageSize, totalElements)
  };

  return (
    <>
      <div className="max-w-[1600px] mx-auto pb-10 space-y-4 animate-fade-in">
        
        {/* 1. Page Header */}
        <header className="sticky top-0 md:static z-20 bg-[#fafafb] md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0 pt-2 md:pt-0 pb-3 md:pb-0 mb-6">
          <CustomerHeader 
            onAdd={handleOpenAdd}
            count={totalElements}
            loading={isFetching}
            isAdmin={isAdmin}
            onRefresh={refresh}
          />

          {/* 2. Management Controls */}
          <div className="mt-3 md:mt-0">
            <CustomerFilterBar 
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              onSearchSubmit={(e) => e.preventDefault()}
              onClear={clearFilters}
              isFiltered={!!searchInput}
            />
          </div>
        </header>

        {/* 3. Main Data View */}
        {isMobile ? (
          <CustomerMobileList 
            customers={customerList}
            loading={isLoading}
            isAdmin={isAdmin}
            onEdit={handleOpenEdit}
            onDelete={setDeleteTarget}
          />
        ) : (
          <CustomerTable 
            customers={customerList}
            loading={isLoading}
            isAdmin={isAdmin}
            pagination={pagination}
            onPageChange={setPage}
            onEdit={handleOpenEdit}
            onDelete={setDeleteTarget}
          />
        )}
      </div>

      {/* Floating Action Button (Mobile Only) */}
      {isMobile && isAdmin && (
        <div className="fixed bottom-20 right-4 z-50">
          <HeadlessMenu as="div" className="relative">
            <HeadlessMenu.Button 
              className="w-14 h-14 bg-amber-500 text-white rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.4)] active:scale-90 transition-transform"
              aria-label="Thêm mới"
            >
              <Plus size={28} strokeWidth={2.5} aria-hidden="true" />
            </HeadlessMenu.Button>
            <Transition
              as="div"
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 scale-90 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-90 translate-y-2"
              className="absolute bottom-16 right-0 mb-4 w-52"
            >
              <HeadlessMenu.Items className="flex flex-col gap-2 items-end outline-none">
                <HeadlessMenu.Item>
                  <button 
                    onClick={handleOpenAdd} 
                    className="flex items-center justify-between w-full px-4 py-3 bg-amber-500 text-white rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Thêm khách hàng <UserPlus size={14} aria-hidden="true" />
                  </button>
                </HeadlessMenu.Item>
              </HeadlessMenu.Items>
            </Transition>
          </HeadlessMenu>
        </div>
      )}

      {/* 4. Overlay Components */}
      {showFormModal && (
        <CustomerFormModal 
          customer={editCustomer}
          onSave={onFormSave}
          onClose={() => { setShowFormModal(false); setEditCustomer(null); }}
          saving={isSaving}
        />
      )}

      {deleteTarget && (
        <CustomerDeleteModal 
          customer={deleteTarget}
          onConfirm={onDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={isDeleting}
        />
      )}
    </>
  );
}
