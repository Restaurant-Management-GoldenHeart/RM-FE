import { useEffect, useMemo, useState } from 'react';
import { X, Package, Calculator, Save, Scale } from 'lucide-react';
import toast from 'react-hot-toast';

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const fmtNumber = (n) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(n || 0));
const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));

const cleanNumber = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

const inputClass = 'h-12 w-full px-4 rounded-2xl border border-gray-100 bg-gray-50/80 font-bold text-gray-900 text-sm focus:outline-none focus:border-orange-300 focus:bg-white transition-all placeholder:text-gray-300 placeholder:font-normal';

export default function RestockModal({ isOpen, onClose, onSubmit, item, units = [], isLoading }) {
  const [formData, setFormData] = useState({
    purchaseQuantity: '',
    purchaseUnitId: '',
    purchaseToBaseRate: '',
    purchaseUnitCost: '',
    receiptDate: todayIso(),
    invoiceNumber: '',
    batchNumber: '',
    expiryDate: '',
    saveAsDefaultPurchaseUnit: true,
    note: ''
  });

  const baseUnit = useMemo(() => units.find((u) => Number(u.id) === Number(item?.unitId)), [units, item]);
  const purchaseUnit = useMemo(() => units.find((u) => Number(u.id) === Number(formData.purchaseUnitId)), [units, formData.purchaseUnitId]);

  useEffect(() => {
    if (!isOpen) return;
    const defaultPurchaseUnitId = item?.defaultPurchaseUnitId || item?.unitId || units[0]?.id || '';
    const defaultRate = item?.defaultPurchaseToBaseRate || (Number(defaultPurchaseUnitId) === Number(item?.unitId) ? 1 : '');
    setFormData({
      purchaseQuantity: '',
      purchaseUnitId: defaultPurchaseUnitId,
      purchaseToBaseRate: defaultRate ? String(defaultRate) : '',
      purchaseUnitCost: '',
      receiptDate: todayIso(),
      invoiceNumber: '',
      batchNumber: '',
      expiryDate: '',
      saveAsDefaultPurchaseUnit: true,
      note: ''
    });
  }, [isOpen, item, units]);

  useEffect(() => {
    if (!formData.purchaseUnitId || !item?.unitId) return;
    if (Number(formData.purchaseUnitId) === Number(item.unitId) && !formData.purchaseToBaseRate) {
      setFormData((prev) => ({ ...prev, purchaseToBaseRate: '1' }));
    }
  }, [formData.purchaseUnitId, formData.purchaseToBaseRate, item]);

  const preview = useMemo(() => {
    const oldQty = Number(item?.quantity || 0);
    const oldAvg = Number(item?.averageUnitCost || 0);
    const purchaseQty = Number(formData.purchaseQuantity || 0);
    const rate = Number(formData.purchaseToBaseRate || 0);
    const purchaseCost = Number(formData.purchaseUnitCost || 0);
    const convertedQty = purchaseQty * rate;
    const lineTotal = purchaseQty * purchaseCost;
    const baseUnitCost = convertedQty > 0 ? lineTotal / convertedQty : 0;
    const newQty = oldQty + convertedQty;
    const newAvg = newQty > 0 ? ((oldQty * oldAvg) + lineTotal) / newQty : oldAvg;
    return { oldQty, purchaseQty, rate, convertedQty, lineTotal, baseUnitCost, newQty, newAvg };
  }, [formData, item]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    const numericFields = ['purchaseQuantity', 'purchaseToBaseRate', 'purchaseUnitCost'];
    setFormData((prev) => ({ ...prev, [field]: numericFields.includes(field) ? cleanNumber(value) : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!item) return;
    if (!preview.purchaseQty || preview.purchaseQty <= 0) return toast.error('Nhập số lượng mua lớn hơn 0');
    if (!formData.purchaseUnitId) return toast.error('Chọn đơn vị mua');
    if (!preview.rate || preview.rate <= 0) return toast.error('Nhập hệ số quy đổi lớn hơn 0');
    if (formData.purchaseUnitCost === '' || Number(formData.purchaseUnitCost) < 0) return toast.error('Nhập đơn giá mua hợp lệ');
    onSubmit({
      purchaseQuantity: preview.purchaseQty,
      purchaseUnitId: Number(formData.purchaseUnitId),
      purchaseToBaseRate: preview.rate,
      purchaseUnitCost: Number(formData.purchaseUnitCost),
      receiptDate: formData.receiptDate || todayIso(),
      invoiceNumber: formData.invoiceNumber.trim(),
      batchNumber: formData.batchNumber.trim(),
      expiryDate: formData.expiryDate || null,
      saveAsDefaultPurchaseUnit: formData.saveAsDefaultPurchaseUnit,
      note: formData.note.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[1.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300">
        <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
              <Package size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Nhập hàng</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{item?.ingredientName ?? item?.itemName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><X size={20} className="text-gray-400" /></button>
        </header>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Số lượng mua">
              <input value={formData.purchaseQuantity} onChange={(e) => updateField('purchaseQuantity', e.target.value)} placeholder="VD: 10" className={inputClass} />
            </Field>
            <Field label="Đơn vị mua">
              <select value={formData.purchaseUnitId} onChange={(e) => updateField('purchaseUnitId', e.target.value)} className={inputClass}>
                <option value="">Chọn đơn vị</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}
              </select>
            </Field>
            <Field label="Đơn giá mua">
              <input value={formData.purchaseUnitCost} onChange={(e) => updateField('purchaseUnitCost', e.target.value)} placeholder="VD: 120000" className={inputClass} />
            </Field>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest"><Scale size={14} /> Quy đổi tồn kho</div>
            <div className="flex items-center gap-2">
              <div className="h-12 px-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold text-gray-400">1</span>
                <span className="text-sm font-black text-gray-900">{purchaseUnit?.symbol || purchaseUnit?.name || '—'}</span>
              </div>
              <span className="text-gray-400 font-black text-xl shrink-0">=</span>
              <input
                value={formData.purchaseToBaseRate}
                onChange={(e) => updateField('purchaseToBaseRate', e.target.value)}
                placeholder="VD: 2.5"
                className={`${inputClass} bg-white min-w-0 flex-1`}
              />
              <div className="h-12 px-4 rounded-2xl bg-white border border-gray-100 flex items-center font-black text-gray-900 shrink-0">
                {baseUnit?.symbol || item?.unitSymbol || '—'}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-500">
              <input type="checkbox" checked={formData.saveAsDefaultPurchaseUnit} onChange={(e) => updateField('saveAsDefaultPurchaseUnit', e.target.checked)} className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              Lưu làm quy đổi mặc định cho lần nhập sau
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Ngày nhập">
              <input type="date" value={formData.receiptDate} onChange={(e) => updateField('receiptDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Số hóa đơn">
              <input value={formData.invoiceNumber} onChange={(e) => updateField('invoiceNumber', e.target.value)} maxLength={50} placeholder="INV-1024" className={inputClass} />
            </Field>
            <Field label="Lô hàng">
              <input value={formData.batchNumber} onChange={(e) => updateField('batchNumber', e.target.value)} maxLength={50} placeholder="LOT-01" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-4">
            <Field label="Hạn dùng">
              <input type="date" value={formData.expiryDate} onChange={(e) => updateField('expiryDate', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Ghi chú">
              <input value={formData.note} onChange={(e) => updateField('note', e.target.value)} maxLength={500} placeholder="NCC, ca nhập, ghi chú kiểm hàng..." className={inputClass} />
            </Field>
          </div>

          <div className="bg-orange-50/60 rounded-2xl p-5 border border-orange-100 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest"><Calculator size={14} /> Dự kiến sau nhập</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Preview label="Quy đổi" value={`${fmtNumber(preview.convertedQty)} ${baseUnit?.symbol || item?.unitSymbol || ''}`} />
              <Preview label="Thành tiền" value={fmtCurrency(preview.lineTotal)} />
              <Preview label="Giá vốn/base" value={fmtCurrency(preview.baseUnitCost)} />
              <Preview label="Tồn mới" value={`${fmtNumber(preview.newQty)} ${baseUnit?.symbol || item?.unitSymbol || ''}`} align="right" />
            </div>
            <p className="text-xs font-bold text-gray-500">
              {preview.purchaseQty || 0} {purchaseUnit?.symbol || ''} × {preview.rate || 0} = {fmtNumber(preview.convertedQty)} {baseUnit?.symbol || item?.unitSymbol || ''}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={isLoading || !formData.purchaseQuantity} className="flex-1 h-14 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
              <Save size={18} /> {isLoading ? 'Đang lưu...' : 'Xác nhận nhập hàng'}
            </button>
            <button type="button" onClick={onClose} className="px-6 h-14 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="space-y-2 block"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</span>{children}</label>;
}

function Preview({ label, value, align }) {
  return <div className={align === 'right' ? 'text-right' : ''}><p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p><p className="mt-1 text-lg font-black text-gray-900 break-words">{value}</p></div>;
}