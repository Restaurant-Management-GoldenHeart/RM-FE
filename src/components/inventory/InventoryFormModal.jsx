import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { X, Save, Package, AlertTriangle, Loader2, Check, ChevronDown, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function InventoryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  units = [],
  isLoading
}) {
  const { user } = useAuthStore();
  const isEdit = !!initialData;
  const nameRef = useRef();

  const [formData, setFormData] = useState({
    ingredientName: '',
    quantity: '',
    minStockLevel: '',
    reorderLevel: '',
    averageUnitCost: '',
    unitId: ''
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  // Load data
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        ingredientName: initialData.ingredientName || initialData.itemName || '',
        quantity: initialData.quantity ?? '',
        minStockLevel: initialData.minStockLevel ?? '',
        reorderLevel: initialData.reorderLevel ?? '',
        averageUnitCost: initialData.averageUnitCost ?? '',
        unitId: initialData.unitId || ''
      });
    } else {
      setFormData({
        ingredientName: '',
        quantity: '',
        minStockLevel: '',
        reorderLevel: '',
        averageUnitCost: '',
        unitId: units[0]?.id || ''
      });
    }

    setErrors({});
    setFormError(null);
    setFieldErrors({});
  }, [isOpen, initialData, units]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!formData.ingredientName || !formData.ingredientName.trim()) {
      newErrors.ingredientName = 'Tên không được để trống';
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      newErrors.quantity = 'Số lượng không hợp lệ (>= 0)';
    }

    if (!formData.unitId) {
      newErrors.unitId = 'Vui lòng chọn đơn vị';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNumberChange = (field, value) => {
    // Sanitize: Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;

    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: sanitized }));
  };

  const handleChange = (field, value) => {
    if (field === 'unitId' && isEdit) return; // Prevent mutation
    setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!validate()) return;

    try {
      // THE FIX: Include branchId which is mandatory in CreateInventoryItemRequest
      await onSubmit({
        branchId: user?.branchId || 1, 
        ingredientName: formData.ingredientName.trim(),
        quantity: parseFloat(formData.quantity) || 0,
        minStockLevel: parseFloat(formData.minStockLevel) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        averageUnitCost: parseFloat(formData.averageUnitCost) || 0,
        unitId: Number(formData.unitId)
      });
    } catch (err) {
      console.error('Submit Error Modal:', err);
      // Backend Error Mapping
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
      } else if (data?.message) {
        setFormError(data.message);
      } else {
        setFormError('Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.');
      }
    }
  };

  const inputCls = (field) => {
    const isLocked = isEdit && (field === 'ingredientName' || field === 'unitId');
    const hasError = errors[field] || fieldErrors[field];

    return `
      w-full px-5 py-3.5 rounded-2xl border text-sm font-bold
      outline-none transition-all
      ${isLocked
        ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200 shadow-none'
        : hasError
          ? 'bg-red-50/20 border-red-500 focus:ring-4 focus:ring-red-500/10'
          : 'bg-white border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-sm'
      }
      disabled:opacity-100
    `;
  };

  const selectedUnit = units.find(u => Number(u.id) === Number(formData.unitId));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">

      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 scale-in-center">

        {/* HEADER */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 uppercase tracking-tight">
                {isEdit ? 'Cập nhật kho' : 'Thêm nguyên liệu'}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">Hệ thống quản lý vật tư</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* GLOBAL ERROR BANNER */}
          {formError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-slide-up">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold leading-tight uppercase tracking-tight">{formError}</p>
            </div>
          )}

          {/* NAME */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Tên nguyên liệu <span className="text-red-500 text-sm font-normal">*</span>
              {isEdit && <Lock className="w-3 h-3" />}
            </label>
            <input
              ref={nameRef}
              className={inputCls('ingredientName')}
              value={formData.ingredientName}
              placeholder="VD: Thịt bò tái, Hành lá..."
              disabled={isEdit}
              readOnly={isEdit}
              onChange={e => handleChange('ingredientName', e.target.value)}
            />
            {fieldErrors.ingredientName && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 italic">
                {fieldErrors.ingredientName}
              </p>
            )}
            {errors.ingredientName && !fieldErrors.ingredientName && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 italic">
                {errors.ingredientName}
              </p>
            )}
          </div>

          {/* ROW 1: QTY & UNIT */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Số lượng lẻ <span className="text-red-500 text-sm font-normal">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                className={inputCls('quantity')}
                value={formData.quantity}
                placeholder="0.00"
                onChange={e => handleNumberChange('quantity', e.target.value)}
              />
              {(errors.quantity || fieldErrors.quantity) && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 italic">
                  {errors.quantity || fieldErrors.quantity}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Đơn vị tính <span className="text-red-500 text-sm font-normal">*</span>
                {isEdit && <Lock className="w-3 h-3" />}
              </label>

              <Listbox value={formData.unitId} onChange={(val) => handleChange('unitId', val)} disabled={isEdit}>
                <div className="relative">
                  <Listbox.Button className={inputCls('unitId') + ' flex justify-between items-center text-left'}>
                    <span className="truncate">
                      {selectedUnit?.name || '-- Chọn đơn vị --'}
                    </span>
                    {!isEdit ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400/50 shrink-0" />
                    )}
                  </Listbox.Button>

                  {!isEdit && (
                    <Listbox.Options className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-slide-up duration-200">
                      {units.map(u => (
                        <Listbox.Option
                          key={u.id}
                          value={u.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-5 py-3 text-sm font-bold flex justify-between items-center transition-all
                            ${active ? 'bg-amber-50 text-amber-600' : 'text-gray-900'}
                            ${selected ? 'bg-amber-500 text-white' : ''}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <div className="flex flex-col">
                                <span>{u.name}</span>
                                <span className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${selected ? 'text-white/60' : 'text-gray-400'}`}>
                                  {u.symbol}
                                </span>
                              </div>
                              {selected && <Check className="w-4 h-4" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  )}
                </div>
              </Listbox>

              {isEdit && (
                <p className="text-[10px] text-gray-400 mt-2 font-medium leading-relaxed italic">
                  Không thể thay đổi đơn vị tính vì nguyên liệu đã có lịch sử kho.
                </p>
              )}

              {errors.unitId && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 italic">{errors.unitId}</p>}
            </div>
          </div>

          {/* ROW 2: AVG COST & MIN STOCK */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Giá vốn trung bình
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold leading-none">₫</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputCls('averageUnitCost') + ' pl-8'}
                  value={formData.averageUnitCost}
                  placeholder="0"
                  onChange={e => handleNumberChange('averageUnitCost', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Tồn tối thiểu
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              </label>
              <input
                type="text"
                inputMode="decimal"
                className={inputCls('minStockLevel')}
                value={formData.minStockLevel}
                placeholder="0"
                onChange={e => handleNumberChange('minStockLevel', e.target.value)}
              />
            </div>
          </div>

          {/* ROW 3: REORDER LEVEL */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Mức tái đặt hàng (Reorder Level)
              <Package className="w-3 h-3 text-amber-500" />
            </label>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls('reorderLevel')}
              value={formData.reorderLevel}
              placeholder="VD: 20"
              onChange={e => handleNumberChange('reorderLevel', e.target.value)}
            />
          </div>

          {/* FOOTER */}
          <div className="flex gap-4 pt-4 pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95 shadow-sm"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl flex justify-center items-center gap-3 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-gray-900/10 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isEdit ? 'Lưu thay đổi' : 'Xác nhận thêm'}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}
