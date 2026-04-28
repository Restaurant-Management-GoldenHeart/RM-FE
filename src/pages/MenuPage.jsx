import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMenu } from '../hooks/useMenu';

// Modular Components
import { MenuHeader } from '../components/menu/MenuHeader';
import { MenuFilterBar } from '../components/menu/MenuFilterBar';
import { MenuTable } from '../components/menu/MenuTable';
import { MenuFormModal } from '../components/menu/MenuFormModal';
import { DeleteConfirmModal } from '../components/menu/DeleteConfirmModal';
import { CategoryFormModal } from '../components/menu/CategoryFormModal';
import MenuMobileList from '../components/menu/MenuMobileList';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { Plus, FolderPlus, UtensilsCrossed } from 'lucide-react';

/**
 * MenuPage - Main Container for Menu Management
 * Architecture: Modular components + useMenu hook
 * Aesthetic: Simple White & Gold
 */
export default function MenuPage() {
  const { role } = useAuthStore();
  const isAdmin = role === 'ADMIN';
  const isMobile = useMediaQuery('(max-width: 767px)');

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
    createCategory,
    isSaving,
    isSavingCategory,
    isDeleting,
    categories,
    branches,
    ingredients
  } = useMenu();

  // 2. Local UI State
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenAdd = useCallback(() => {
    setEditItem(null);
    setShowModal(true);
  }, []);

  const handleOpenAddCategory = useCallback(() => {
    setShowCategoryModal(true);
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

  const handleSaveCategory = async (payload) => {
    try {
      await createCategory(payload);
      setShowCategoryModal(false);
    } catch (err) {
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
    <>
      <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10">
        {/* 2. Page Header & Filters - Sticky on mobile */}
        <header className="sticky top-0 md:static z-20 bg-[#fafafb] md:bg-transparent -mx-4 px-4 md:mx-0 md:px-0 pt-2 md:pt-0 pb-3 md:pb-0 mb-6">
          <MenuHeader 
            loading={loading}
            onRefresh={refetch}
            onAdd={handleOpenAdd}
            onAddCategory={handleOpenAddCategory}
            isAdmin={isAdmin}
          />
          <div className="mt-3 md:mt-0">
            <MenuFilterBar 
              keyword={keyword}
              onSearch={setKeyword}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              categories={categories}
            />
          </div>
        </header>

        {/* 3. Main Data View */}
        {isMobile ? (
          <MenuMobileList 
            items={items}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={setDeleteTarget}
            isAdmin={isAdmin}
          />
        ) : (
          <MenuTable 
            items={items}
            loading={loading}
            pagination={pagination}
            onPageChange={setPage}
            onEdit={handleOpenEdit}
            onDelete={setDeleteTarget}
            isAdmin={isAdmin}
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
                    Thêm món mới <UtensilsCrossed size={14} aria-hidden="true" />
                  </button>
                </HeadlessMenu.Item>
                <HeadlessMenu.Item>
                  <button 
                    onClick={handleOpenAddCategory} 
                    className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-xl text-gray-900 text-xs font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Thêm danh mục <FolderPlus size={14} aria-hidden="true" />
                  </button>
                </HeadlessMenu.Item>
              </HeadlessMenu.Items>
            </Transition>
          </HeadlessMenu>
        </div>
      )}

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

      {showCategoryModal && (
        <CategoryFormModal 
          onSave={handleSaveCategory}
          onClose={() => setShowCategoryModal(false)}
          saving={isSavingCategory}
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
    </>
  );
}