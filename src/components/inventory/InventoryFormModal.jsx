import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from '@headlessui/react';
import { X, Save, Package, AlertTriangle, Loader2, Check, ChevronDown, Lock, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { extractErrorMessage, extractAllFieldErrors } from '../../utils/errorHelper';

/**
 * InventoryFormModal - Tối ưu hóa toàn diện cho Kho hàng
 */
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
  const [touched, setTouched] = useState({});

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
    setTouched({});
  }, [isOpen, initialData, units, branches, isManager, user]);

  if (!isOpen) return null;

  // Real-time validation logic
  const validateField = (name, value) => {
    let error = '';
    const num = parseFloat(value);
    switch (name) {
      case 'ingredientName':
        if (!value.trim()) error = 'Tên không được để trống';
        break;
      case 'quantity':
        if (value === '') error = 'Nhập số lượng';
        else if (isNaN(num) || num < 0) error = 'Số lượng ≥ 0';
        break;
      case 'unitId':
        if (!value) error = 'Chọn đơn vị';
        break;
      case 'branchId':
        if (!value) error = 'Chọn chi nhánh';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (field, value) => {
    if ((field === 'unitId' || field === 'branchId') && isEdit) return;
    
    // Xử lý số học cho các trường đặc thù
    let finalValue = value;
    if (['quantity', 'minStockLevel', 'reorderLevel', 'averageUnitCost'].includes(field)) {
        finalValue = value.replace(/[^0-9.]/g, '');
        if (finalValue.split('.').length > 2) return;
    }

    setFormData(prev => ({ ...prev, [field]: finalValue }));
    
    if (touched[field]) {
      const error = validateField(field, finalValue);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all
    const newErrors = {};
    const newTouched = {};
    Object.keys(formData).forEach(key => {
      newTouched[key] = true;
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0]);
      return;
    }

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
      console.error('CRITICAL INVENTORY ERROR:', err);
      const fieldErrs = extractAllFieldErrors(err);
      if (Object.keys(fieldErrs).length > 0) {
        setErrors(prev => ({ ...prev, ...fieldErrs }));
        toast.error(Object.values(fieldErrs)[0]);
      } else {
        const msg = extractErrorMessage(err, 'Không thể lưu dữ liệu kho. Vui lòng kiểm tra lại.');
        setErrors(prev => ({ ...prev, submit: msg }));
        toast.error(msg);
      }
    }
  };

  const inputCls = (field) => {
    const isLocked = isEdit && (field === 'ingredientName' || field === 'unitId' || field === 'branchId');
    const hasError = errors[field];
    return [
      'w-full px-4 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all duration-200',
      isLocked
        ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100'
        : hasError
          ? 'bg-red-50 border-red-200 focus:ring-4 focus:ring-red-500/5'
          : 'bg-white border-gray-100 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 shadow-sm',
    ].join(' ');
  };

  const selectedUnit = units.find(u => Number(u.id) === Number(formData.unitId));
  const selectedBranch = branches.find(b => Number(b.id) === Number(formData.branchId));

  const Label = ({ children }) => (
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1.5 ml-1">
      {children}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-fade-in" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-zoom-in">

        {/* Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Package size={20} className="sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Cập nhật kho' : 'Thêm nguyên liệu'}
              </h3>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                Quản lý vật tư CRM
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-900 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-shake">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="font-bold">{errors.submit}</p>
            </div>
          )}

          <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Branch */}
            <div className="space-y-1">
              <Label>Chi nhánh { (isEdit || isManager) && <Lock size={10} className="inline" /> }</Label>
              <Listbox value={formData.branchId} onChange={val => handleChange('branchId', val)} disabled={isEdit || isManager}>
                <div className="relative">
                  <Listbox.Button className={`${inputCls('branchId')} flex justify-between items-center text-left`}>
                    <span className="truncate">{selectedBranch?.name || '-- Chọn chi nhánh --'}</span>
                    <ChevronDown size={15} className="text-gray-400" />
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-50 mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-xl shadow-2xl py-2 max-h-60 overflow-auto outline-none animate-in fade-in zoom-in-95">
                    {branchesLoading ? (
                      <div className="px-4 py-2 text-[10px] font-bold text-gray-400 flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin text-orange-500" /> Đang tải…
                      </div>
                    ) : branches.map(b => (
                      <Listbox.Option
                        key={b.id}
                        value={b.id}
                        className={({ active, selected }) =>
                          `cursor-pointer px-4 py-2.5 text-xs font-bold flex justify-between items-center transition-colors
                          ${selected ? 'bg-orange-50 text-orange-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className="truncate">{b.name}</span>
                            {selected && <Check size={14} className="text-orange-500" />}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
              {errors.branchId && <p className="text-[9px] font-bold text-red-500 uppercase ml-1">{errors.branchId}</p>}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>Tên nguyên liệu * { isEdit && <Lock size={10} className="inline" /> }</Label>
              <input
                ref={nameRef}
                className={inputCls('ingredientName')}
                value={formData.ingredientName}
                placeholder="VD: Thịt bò, Hành lá..."
                disabled={isEdit}
                onChange={e => handleChange('ingredientName', e.target.value)}
                onBlur={() => handleBlur('ingredientName')}
                maxLength={100}
              />
              {errors.ingredientName && <p className="text-[9px] font-bold text-red-500 uppercase ml-1">{errors.ingredientName}</p>}
            </div>

            {/* Qty + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Số lượng *</Label>
                <input
                  className={inputCls('quantity')}
                  value={formData.quantity}
                  placeholder="0.00"
                  onChange={e => handleChange('quantity', e.target.value)}
                  onBlur={() => handleBlur('quantity')}
                />
                {errors.quantity && <p className="text-[9px] font-bold text-red-500 uppercase ml-1">{errors.quantity}</p>}
              </div>

              <div className="space-y-1">
                <Label>Đơn vị * { isEdit && <Lock size={10} className="inline" /> }</Label>
                <Listbox value={formData.unitId} onChange={val => handleChange('unitId', val)} disabled={isEdit}>
                  <div className="relative">
                    <Listbox.Button className={`${inputCls('unitId')} flex justify-between items-center text-left`}>
                      <span className="truncate">{selectedUnit?.name || 'Chọn...'}</span>
                      <ChevronDown size={15} className="text-gray-400" />
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-50 mt-1.5 w-full bg-white/95 backdrop-blur-xl border border-gray-100 rounded-xl shadow-2xl py-2 max-h-60 overflow-auto outline-none">
                      {units.map(u => (
                        <Listbox.Option
                          key={u.id}
                          value={u.id}
                          className={({ active, selected }) =>
                            `cursor-pointer px-4 py-2 text-xs font-bold flex justify-between items-center
                            ${selected ? 'bg-orange-50 text-orange-600' : active ? 'bg-gray-50 text-gray-900' : 'text-gray-700'}`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <div>
                                <p>{u.name}</p>
                                <p className="text-[8px] text-gray-400">{u.symbol}</p>
                              </div>
                              {selected && <Check size={14} className="text-orange-500" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>
            </div>

            {/* Cost + Min Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Giá vốn (₫)</Label>
                <input
                  className={inputCls('averageUnitCost')}
                  value={formData.averageUnitCost}
                  placeholder="0"
                  onChange={e => handleChange('averageUnitCost', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Tồn tối thiểu</Label>
                <input
                  className={inputCls('minStockLevel')}
                  value={formData.minStockLevel}
                  placeholder="0"
                  onChange={e => handleChange('minStockLevel', e.target.value)}
                />
              </div>
            </div>

            {/* Reorder Level */}
            <div className="space-y-1">
              <Label>Mức tái đặt hàng</Label>
              <input
                className={inputCls('reorderLevel')}
                value={formData.reorderLevel}
                placeholder="VD: 10..."
                onChange={e => handleChange('reorderLevel', e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50/50 border-t border-gray-100 flex items-center gap-3">
          <button
            type="submit"
            form="inventory-form"
            disabled={isLoading}
            className="flex-[2] bg-gray-900 hover:bg-black text-white h-12 sm:h-14 rounded-xl sm:rounded-2xl flex justify-center items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-900/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin text-orange-500" /> : <Save size={18} className="text-orange-500" />}
            <span>{isEdit ? 'Lưu' : 'Thêm mới'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl border border-gray-200 bg-white text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
