import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMenu } from '../hooks/useMenu';

// Modular Components
import { MenuHeader } from '../components/menu/MenuHeader';
import { MenuFilterBar } from '../components/menu/MenuFilterBar';
import { MenuTable } from '../components/menu/MenuTable';
import { MenuFormModal } from '../components/menu/MenuFormModal';
import { DeleteConfirmModal } from '../components/menu/DeleteConfirmModal';

/**
 * MenuPage - Main Container for Menu Management
 * Architecture: Modular components + useMenu hook
 * Aesthetic: Simple White & Gold
 */
export default function MenuPage() {
  const { role } = useAuthStore();
  const isAdmin = role === 'ADMIN';

  // 1. Hook for API Logic
  const {
    items,
    loading,
    pagination,
    keyword,
    setKeyword,
    categoryId,
    setCategoryId,
    setPage,
    refetch,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    isSaving,
    isDeleting,
    categories,
    branches,
    ingredients
  } = useMenu();

  // 2. Local UI State
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenAdd = useCallback(() => {
    setEditItem(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((item) => {
    setEditItem(item);
    setShowModal(true);
  }, []);

  const handleSave = async (payload) => {
    try {
      if (editItem) {
        await updateMenuItem({ id: editItem.id, payload });
      } else {
        await createMenuItem(payload);
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      // Re-throw để Modal có thể catch và hiển thị lỗi field-specific
      throw err;
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      // Error is handled in the hook's mutation (toast)
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10">
      {/* 1. Header Area */}
      <MenuHeader 
        loading={loading}
        onRefresh={refetch}
        onAdd={handleOpenAdd}
        isAdmin={isAdmin}
      />

      {/* 2. Controls & Filters */}
      <MenuFilterBar 
        keyword={keyword}
        onSearch={setKeyword}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categories}
      />

      {/* 3. Main Data View */}
      <MenuTable 
        items={items}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
        isAdmin={isAdmin}
      />

      {/* 4. Modals */}
      {showModal && (
        <MenuFormModal 
          item={editItem}
          categories={categories}
          branches={branches}
          ingredients={ingredients}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          saving={isSaving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal 
          item={deleteTarget}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
          deleting={isDeleting}
        />
      )}
    </div>
  );
}