import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { X, Save, Package, AlertTriangle, Loader2, Check, ChevronDown, Lock, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function InventoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  units = [],
  branches = [],
  isLoading,
  branchesLoading = false
}) {
  const { user, role: actorRole } = useAuthStore();
  const isEdit = !!initialData;
  const isManager = actorRole === 'MANAGER';
  const nameRef = React.useRef();

  const [formData, setFormData] = useState({
    ingredientName: '',
    quantity: '',
    minStockLevel: '',
    reorderLevel: '',
    averageUnitCost: '',
    unitId: '',
    branchId: ''
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        ingredientName: initialData.ingredientName || initialData.itemName || '',
        quantity: initialData.quantity ?? initialData.currentQuantity ?? '',
        minStockLevel: initialData.minStockLevel ?? '',
        reorderLevel: initialData.reorderLevel ?? '',
        averageUnitCost: initialData.averageUnitCost ?? initialData.cost ?? '',
        unitId: initialData.unitId || units.find(u => u.symbol === (initialData.unitSymbol || initialData.unit))?.id || '',
        branchId: initialData.branchId || ''
      });
    } else {
      setFormData({
        ingredientName: '',
        quantity: '',
        minStockLevel: '',
        reorderLevel: '',
        averageUnitCost: '',
        unitId: units[0]?.id || '',
        branchId: isManager ? user?.branchId : (branches[0]?.id || '')
      });
    }
    setErrors({});
    setFormError(null);
    setFieldErrors({});
  }, [isOpen, initialData, units, branches, isManager, user]);

  if (!isOpen) return null;

  const validate = () => {
    const e = {};
    if (!formData.ingredientName?.trim()) e.ingredientName = 'Tên không được để trống';
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) e.quantity = 'Số lượng không hợp lệ (≥ 0)';
    if (!formData.unitId) e.unitId = 'Vui lòng chọn đơn vị';
    if (!formData.branchId) e.branchId = 'Vui lòng chọn chi nhánh';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNumberChange = (field, value) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    if (sanitized.split('.').length > 2) return;
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: sanitized }));
  };

  const handleChange = (field, value) => {
    if ((field === 'unitId' || field === 'branchId') && isEdit) return;
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (!validate()) return;
    try {
      await onSubmit({
        branchId: Number(formData.branchId),
        ingredientName: formData.ingredientName.trim(),
        quantity: parseFloat(formData.quantity) || 0,
        minStockLevel: parseFloat(formData.minStockLevel) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        averageUnitCost: parseFloat(formData.averageUnitCost) || 0,
        unitId: Number(formData.unitId)
      });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setFieldErrors(data.errors);
      else if (data?.message) setFormError(data.message);
      else setFormError('Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.');
    }
  };

  // ─── Input class helper ──────────────────────────────────────────
  const inputCls = (field) => {
    const isLocked = isEdit && (field === 'ingredientName' || field === 'unitId' || field === 'branchId');
    const hasError = errors[field] || fieldErrors[field];
    return [
      'w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none transition-all duration-200',
      isLocked
        ? 'bg-gray-50/50 text-gray-400 cursor-not-allowed border-white/60'
        : hasError
          ? 'bg-red-50/30 border-red-300/60 focus:ring-2 focus:ring-red-400/20'
          : 'bg-white/50 border-white/60 backdrop-blur-sm focus:bg-white/80 focus:border-orange-300/60 focus:ring-2 focus:ring-orange-400/15 shadow-[0_2px_8px_rgba(0,0,0,0.03)]',
    ].join(' ');
  };

  const selectedUnit = units.find(u => Number(u.id) === Number(formData.unitId));
  const selectedBranch = branches.find(b => Number(b.id) === Number(formData.branchId));

  // ─── Field error display ─────────────────────────────────────────
  const FieldErr = ({ field }) => {
    const msg = fieldErrors[field] || (errors[field] && !fieldErrors[field] ? errors[field] : null);
    if (!msg) return null;
    return <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider px-1 mt-1 italic">{msg}</p>;
  };

  // ─── Label ──────────────────────────────────────────────────────
  const Label = ({ children }) => (
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">
      {children}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal shell — Glassmorphism */}
      <div className="relative z-10 w-full max-w-lg bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_32px_80px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* ─── Header ─── */}
        <div className="px-7 pt-6 pb-5 border-b border-white/60 flex justify-between items-center bg-white/40">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(249,115,22,0.12)]">
              <Package size={20} className="text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                {isEdit ? 'Cập nhật kho' : 'Thêm nguyên liệu'}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Quản lý vật tư kho hàng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng"
            className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50/60 transition-all active:scale-90 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── Body ─── */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 overflow-y-auto max-h-[75vh]">

          {/* Global error */}
          {formError && (
            <div className="p-4 bg-red-50/60 border border-red-200/60 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-600 leading-relaxed">{formError}</p>
            </div>
          )}

          {/* Branch Selection */}
          <div>
            <Label>
              Chi nhánh <span className="text-red-400 text-xs font-bold normal-case">*</span>
              {(isEdit || isManager) && <Lock size={11} className="text-gray-300" />}
            </Label>
            <Listbox 
              value={formData.branchId} 
              onChange={val => handleChange('branchId', val)} 
              disabled={isEdit || isManager}
            >
              <div className="relative">
                <Listbox.Button className={`${inputCls('branchId')} flex justify-between items-center text-left`}>
                  <span className="truncate">{selectedBranch?.name || '-- Chọn chi nhánh --'}</span>
                  {!(isEdit || isManager)
                    ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
                    : <Lock size={14} className="text-gray-300 shrink-0" />}
                </Listbox.Button>
                {!(isEdit || isManager) && (
                  <Listbox.Options className="absolute z-50 mt-2 w-full bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.10)] py-2 max-h-60 overflow-auto outline-none">
                    {branchesLoading ? (
                      <div className="px-4 py-2 text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-orange-500" /> Đang tải…
                      </div>
                    ) : branches.map(b => (
                      <Listbox.Option
                        key={b.id}
                        value={b.id}
                        className={({ active, selected }) =>
                          `cursor-pointer px-4 py-2.5 text-sm font-semibold flex justify-between items-center transition-colors
                          ${selected ? 'bg-orange-50 text-orange-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className="truncate">{b.name}</span>
                            {selected && <Check size={14} className="text-orange-500 shrink-0" />}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                )}
              </div>
            </Listbox>
            <FieldErr field="branchId" />
          </div>

          {/* Name */}
          <div>
            <Label>
              Tên nguyên liệu <span className="text-red-400 text-xs font-bold normal-case">*</span>
              {isEdit && <Lock size={11} className="text-gray-300" />}
            </Label>
            <input
              ref={nameRef}
              className={inputCls('ingredientName')}
              value={formData.ingredientName}
              placeholder="VD: Thịt bò tái, Hành lá…"
              disabled={isEdit}
              readOnly={isEdit}
              onChange={e => handleChange('ingredientName', e.target.value)}
              autoComplete="off"
            />
            <FieldErr field="ingredientName" />
          </div>

          {/* Qty + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Số lượng <span className="text-red-400 text-xs font-bold normal-case">*</span>
              </Label>
              <input
                type="text"
                inputMode="decimal"
                className={inputCls('quantity')}
                value={formData.quantity}
                placeholder="0.00"
                onChange={e => handleNumberChange('quantity', e.target.value)}
                autoComplete="off"
              />
              <FieldErr field="quantity" />
            </div>

            <div>
              <Label>
                Đơn vị tính <span className="text-red-400 text-xs font-bold normal-case">*</span>
                {isEdit && <Lock size={11} className="text-gray-300" />}
              </Label>
              <Listbox value={formData.unitId} onChange={val => handleChange('unitId', val)} disabled={isEdit}>
                <div className="relative">
                  <Listbox.Button className={`${inputCls('unitId')} flex justify-between items-center text-left`}>
                    <span className="truncate">{selectedUnit?.name || '-- Chọn đơn vị --'}</span>
                    {!isEdit
                      ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
                      : <Lock size={14} className="text-gray-300 shrink-0" />}
                  </Listbox.Button>
                  {!isEdit && (
                    <Listbox.Options className="absolute z-50 mt-2 w-full bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.10)] py-2 max-h-60 overflow-auto outline-none">
                      {units.map(u => (
                        <Listbox.Option
                          key={u.id}
                          value={u.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-4 py-2.5 text-sm font-semibold flex justify-between items-center transition-colors
                            ${selected ? 'bg-orange-50 text-orange-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <div>
                                <p>{u.name}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{u.symbol}</p>
                              </div>
                              {selected && <Check size={14} className="text-orange-500 shrink-0" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  )}
                </div>
              </Listbox>
              {isEdit && (
                <p className="text-[10px] text-gray-400 mt-1.5 font-medium italic leading-relaxed">
                  Không thể thay đổi đơn vị khi đã có lịch sử kho.
                </p>
              )}
              <FieldErr field="unitId" />
            </div>
          </div>

          {/* Avg cost + Min stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Giá vốn trung bình</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₫</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputCls('averageUnitCost')} pl-8`}
                  value={formData.averageUnitCost}
                  placeholder="0"
                  onChange={e => handleNumberChange('averageUnitCost', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <Label>
                Tồn tối thiểu
                <AlertTriangle size={11} className="text-amber-400" />
              </Label>
              <input
                type="text"
                inputMode="decimal"
                className={inputCls('minStockLevel')}
                value={formData.minStockLevel}
                placeholder="0"
                onChange={e => handleNumberChange('minStockLevel', e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Reorder level */}
          <div>
            <Label>Mức tái đặt hàng (Reorder Level)</Label>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls('reorderLevel')}
              value={formData.reorderLevel}
              placeholder="VD: 20…"
              onChange={e => handleNumberChange('reorderLevel', e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-sm text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-white/70 hover:text-gray-800 transition-all active:scale-95"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-gray-900 text-white py-3 rounded-2xl flex justify-center items-center gap-2.5 font-black text-xs uppercase tracking-widest shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading
                ? <Loader2 size={16} className="animate-spin" />
                : <Save size={16} />}
              {isEdit ? 'Lưu thay đổi' : 'Xác nhận thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
