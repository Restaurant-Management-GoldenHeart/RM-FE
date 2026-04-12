import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCustomers } from '../hooks/useCustomers';

// Modular Components
import { CustomerHeader } from '../components/customers/CustomerHeader';
import { CustomerFilterBar } from '../components/customers/CustomerFilterBar';
import { CustomerTable } from '../components/customers/CustomerTable';
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
    <div className="max-w-[1600px] mx-auto pb-10 space-y-4 animate-fade-in">
      
      {/* 1. Page Header */}
      <CustomerHeader 
        onAdd={handleOpenAdd}
        count={totalElements}
        loading={isFetching}
      />

      {/* 2. Management Controls */}
      <CustomerFilterBar 
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={(e) => e.preventDefault()} // Logic handled by debounce in hook
        onRefresh={refresh}
        onClear={clearFilters}
        isFiltered={!!searchInput}
        loading={isFetching}
      />

      {/* 3. Main Data View */}
      <CustomerTable 
        customers={customerList}
        loading={isLoading}
        isAdmin={isAdmin}
        pagination={pagination}
        onPageChange={setPage}
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
      />

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
    </div>
  );
}
