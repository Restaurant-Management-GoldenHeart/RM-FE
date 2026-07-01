import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useBranchContext } from '../context/BranchContext';
import { comboApi } from '../api/comboApi';
import { menuApi } from '../api/menuApi';
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  UtensilsCrossed, Image as ImageIcon, Upload, AlertTriangle,
  Tag, ChevronDown, ChevronUp, Package2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const formatVND = (n) => Number(n || 0).toLocaleString('vi-VN') + '₫';

// ─── Combo Form Modal ────────────────────────────────────────────────────────

function ComboFormModal({ combo, branchId, onClose, onSaved }) {
  const isEdit = !!combo;
  const [name, setName] = useState(combo?.name || '');
  const [description, setDescription] = useState(combo?.description || '');
  const [status, setStatus] = useState(combo?.status || 'AVAILABLE');
  const [selectedItems, setSelectedItems] = useState(
    combo?.items?.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, name: i.menuItemName, price: i.menuItemPrice, imageUrl: i.menuItemImageUrl })) || []
  );
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(combo?.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [menuSearch, setMenuSearch] = useState('');
  const imageInputRef = useRef(null);

  // Lấy menu items của branch để chọn vào combo
  const { data: menuPage } = useQuery({
    queryKey: ['menu-items-for-combo', branchId],
    queryFn: () => menuApi.getMenuItems({ branchId, size: 200 }).then(r => r.data),
    enabled: !!branchId,
    staleTime: 2 * 60 * 1000,
  });
  const allMenuItems = menuPage?.content || [];
  const filteredMenu = menuSearch.trim()
    ? allMenuItems.filter(m => m.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : allMenuItems;

  // Tính giá preview
  const previewTotal = selectedItems.reduce((s, i) => s + Number(i.price || 0) * i.quantity, 0);
  const previewPrice = previewTotal * 0.9;

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Tên combo không được để trống';
    if (selectedItems.length === 0) e.items = 'Combo phải có ít nhất một món';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddItem = (menuItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.menuItemId === menuItem.id);
      if (exists) {
        return prev.map(i => i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: menuItem.id, quantity: 1, name: menuItem.name, price: menuItem.price, imageUrl: menuItem.imageUrl }];
    });
  };

  const handleRemoveItem = (menuItemId) => {
    setSelectedItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const handleQtyChange = (menuItemId, qty) => {
    const n = parseInt(qty, 10);
    if (isNaN(n) || n < 1) return;
    setSelectedItems(prev => prev.map(i => i.menuItemId === menuItemId ? { ...i, quantity: n } : i));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        branchId,
        name: name.trim(),
        description: description.trim() || null,
        status,
        items: selectedItems.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      };
      if (isEdit) {
        await comboApi.updateCombo(combo.id, payload, imageFile);
        toast.success('Đã cập nhật combo!');
      } else {
        await comboApi.createCombo(payload, imageFile);
        toast.success('Đã tạo combo mới!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field) =>
    `w-full px-4 py-3 rounded-xl bg-white border text-gray-900 text-sm placeholder-gray-400 outline-none transition-all ${
      errors[field] ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Package2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">{isEdit ? 'Chỉnh sửa Combo' : 'Tạo Combo mới'}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Giảm giá tự động 10%</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 custom-scrollbar">
          <form id="combo-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Tên Combo *</label>
                <input className={inputCls('name')} value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Combo Phở Bò Đặc Biệt..." />
                {errors.name && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11} />{errors.name}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Mô tả</label>
                <textarea className={inputCls('description')} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả ngắn về combo..." />
              </div>

              {/* Status (chỉ show khi edit) */}
              {isEdit && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Trạng thái</label>
                  <select className={inputCls('status')} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="AVAILABLE">✨ Đang kinh doanh</option>
                    <option value="UNAVAILABLE">🛑 Tạm ngưng</option>
                  </select>
                </div>
              )}

              {/* Image */}
              <div className={`space-y-2 ${isEdit ? '' : 'md:col-span-2'}`}>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Ảnh Combo</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50">
                  <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-amber-400 text-xs font-bold text-gray-600 hover:text-amber-600 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    {imageFile ? 'Đổi ảnh' : 'Tải ảnh lên'}
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Menu item picker */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Chọn món ăn *</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                placeholder="Tìm món ăn để thêm vào combo..."
              />
              {filteredMenu.length > 0 && (
                <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {filteredMenu.map(m => {
                    const inCombo = selectedItems.find(s => s.menuItemId === m.id);
                    return (
                      <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {m.imageUrl ? (
                            <img src={m.imageUrl} alt={m.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <UtensilsCrossed className="w-3.5 h-3.5 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{m.name}</p>
                            <p className="text-[10px] text-gray-400">{formatVND(m.price)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddItem(m)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            inCombo
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                          }`}
                        >
                          {inCombo ? `+1 (×${inCombo.quantity})` : '+ Thêm'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.items && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11} />{errors.items}</p>}
            </div>

            {/* Selected items preview */}
            {selectedItems.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Danh sách món trong combo</p>
                {selectedItems.map(item => (
                  <div key={item.menuItemId} className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                    <span className="text-xs text-gray-500 tabular-nums">{formatVND(item.price)} × </span>
                    <input
                      type="number" min="1"
                      value={item.quantity}
                      onChange={e => handleQtyChange(item.menuItemId, e.target.value)}
                      className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-amber-400"
                    />
                    <button type="button" onClick={() => handleRemoveItem(item.menuItemId)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="border-t border-amber-200 pt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Gốc: <span className="font-bold text-gray-700">{formatVND(previewTotal)}</span>
                    <span className="mx-2 text-amber-500">→ giảm 10%</span>
                  </div>
                  <p className="text-base font-black text-amber-700">{formatVND(previewPrice)}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 flex items-center gap-3">
          <button
            type="submit" form="combo-form" disabled={saving}
            className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-60 shadow-lg shadow-amber-900/10 active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo Combo'}
          </button>
          <button type="button" onClick={onClose} className="px-6 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all">
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Combo Card ──────────────────────────────────────────────────────────────

function ComboCard({ combo, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isUnavailable = combo.status === 'UNAVAILABLE';

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${isUnavailable ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:border-amber-200 hover:shadow-md'}`}>
      {/* Image */}
      <div className="h-36 bg-gray-50 relative overflow-hidden">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
            <Package2 className="w-10 h-10 text-amber-200" />
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${isUnavailable ? 'bg-gray-200 text-gray-500' : 'bg-amber-500 text-white'}`}>
          {isUnavailable ? 'Tạm ngưng' : 'Hoạt động'}
        </span>
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500 text-white uppercase tracking-wide">
          -{combo.discountPct}%
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-black text-gray-900 text-sm mb-0.5 line-clamp-1">{combo.name}</h3>
        {combo.description && <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{combo.description}</p>}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-black text-amber-600">{formatVND(combo.price)}</span>
          <span className="text-[10px] text-gray-400">{combo.items?.length || 0} món</span>
        </div>

        {/* Items collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 hover:bg-amber-50 text-xs font-bold text-gray-500 hover:text-amber-700 transition-all mb-3"
        >
          <span>Xem chi tiết</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="space-y-1.5 mb-3 animate-in slide-in-from-top-2 duration-200">
            {combo.items?.map(item => (
              <div key={item.menuItemId} className="flex items-center justify-between text-xs text-gray-600 px-1">
                <span className="truncate">{item.menuItemName}</span>
                <span className="font-bold shrink-0 ml-2">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => onEdit(combo)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:border-amber-400 text-gray-500 hover:text-amber-700 text-[11px] font-bold transition-all">
            <Pencil className="w-3.5 h-3.5" /> Sửa
          </button>
          <button onClick={() => onDelete(combo)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-600 text-[11px] font-bold transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────

function DeleteConfirmModal({ combo, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">Xóa Combo?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Combo <span className="font-bold text-gray-800">"{combo.name}"</span> sẽ bị xóa. Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleConfirm} disabled={deleting}
            className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
          <button onClick={onClose} className="flex-1 h-11 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
            Hủy
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ComboManagementPage() {
  const { selectedBranchId, selectedBranchName } = useBranchContext();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos', selectedBranchId],
    queryFn: () => comboApi.getCombos(selectedBranchId).then(r => r.data),
    enabled: !!selectedBranchId,
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => comboApi.deleteCombo(id),
    onSuccess: () => {
      toast.success('Đã xóa combo!');
      queryClient.invalidateQueries({ queryKey: ['combos', selectedBranchId] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err?.message || 'Xóa thất bại'),
  });

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ['combos', selectedBranchId] });
  const handleOpenCreate = () => { setEditTarget(null); setFormOpen(true); };
  const handleEdit = (combo) => { setEditTarget(combo); setFormOpen(true); };
  const handleClose = () => { setFormOpen(false); setEditTarget(null); };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Package2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Quản lý Combo</h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              {selectedBranchName || 'Chọn chi nhánh'} · {combos.length} combo
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          disabled={!selectedBranchId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-amber-900/10 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tạo Combo
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!selectedBranchId ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-gray-400 gap-3">
            <Tag className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-bold">Vui lòng chọn chi nhánh để xem danh sách combo</p>
          </div>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : combos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Package2 className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <p className="text-gray-900 font-black text-base">Chưa có combo nào</p>
              <p className="text-gray-400 text-sm mt-1">Tạo combo đầu tiên để bắt đầu</p>
            </div>
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all">
              <Plus className="w-4 h-4" /> Tạo Combo
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {combos.map(combo => (
              <ComboCard key={combo.id} combo={combo} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {formOpen && (
        <ComboFormModal
          combo={editTarget}
          branchId={selectedBranchId}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          combo={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
