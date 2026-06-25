import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ReceiptText,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { inventoryApi } from '../../api/inventoryApi';
import { extractErrorMessage } from '../../utils/errorHelper';

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const fmtNumber = (value) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value || 0));
const fmtCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value || 0));

export default function InventoryImportModal({ isOpen, onClose, branchId, branchName, onImported }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [receiptDate, setReceiptDate] = useState(todayIso());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const canSubmit = Boolean(branchId && file);
  const hasErrors = Boolean(preview && !preview.importable);
  const canCommit = Boolean(preview?.importable && file && branchId && !isCommitting);

  const rows = useMemo(() => preview?.rows || [], [preview]);
  const firstErrors = useMemo(() => {
    const globalErrors = preview?.globalErrors || [];
    const rowErrors = rows.flatMap((row) => (row.errors || []).map((error) => `Dòng ${row.rowNumber}: ${error}`));
    return [...globalErrors, ...rowErrors].slice(0, 5);
  }, [preview, rows]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    setFile(null);
    setReceiptDate(todayIso());
    setInvoiceNumber('');
    setNote('');
    setPreview(null);
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const buildPayload = () => ({ file, branchId, receiptDate, invoiceNumber: invoiceNumber.trim(), note: note.trim() });

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const blob = await inventoryApi.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'goldenheart_inventory_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải file mẫu import kho');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không tải được file mẫu import.'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!branchId) {
      toast.error('Vui lòng chọn một chi nhánh cụ thể trước khi import.');
      return;
    }
    if (!file) {
      toast.error('Vui lòng chọn file Excel cần import.');
      return;
    }
    try {
      setIsPreviewing(true);
      const res = await inventoryApi.previewInventoryImport(buildPayload());
      setPreview(res.data);
      if (res.data?.importable) {
        toast.success('File hợp lệ, có thể nhập kho.');
      } else {
        toast.error('File còn lỗi, vui lòng kiểm tra bảng preview.');
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không đọc được file import.'));
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;
    try {
      setIsCommitting(true);
      const res = await inventoryApi.commitInventoryImport(buildPayload());
      const result = res.data;
      if (!result?.committed) {
        setPreview(result?.preview || null);
        toast.error('File vừa kiểm tra lại vẫn còn lỗi, chưa nhập kho.');
        return;
      }
      toast.success(`Đã nhập kho từ Excel: ${result.receiptCode}`);
      onImported?.();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Import thất bại.'));
    } finally {
      setIsCommitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-6xl max-h-[95vh] bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-zoom-in">
        <header className="px-5 py-4 sm:px-7 sm:py-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate">Import nhập kho Excel</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 truncate">
                {branchId ? branchName || `Chi nhánh #${branchId}` : 'Chưa chọn chi nhánh'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors">
            <X size={18} />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-7 space-y-5 custom-scrollbar">
          {!branchId && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 flex gap-3 text-amber-700">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">Chọn một chi nhánh cụ thể trên bộ lọc trước khi import kho.</p>
            </div>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">File import</p>
                  <p className="text-sm font-black text-gray-900 mt-1 break-all">{file?.name || 'Chưa chọn file Excel'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={isDownloading}
                    className="h-11 px-4 rounded-2xl bg-white border border-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    Tải mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 px-4 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black"
                  >
                    <Upload size={15} /> Chọn file
                  </button>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Calendar size={12} /> Ngày nhập</span>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => { setReceiptDate(e.target.value); setPreview(null); }}
                    className="w-full h-11 px-3 rounded-xl bg-white border border-gray-100 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><ReceiptText size={12} /> Số hóa đơn</span>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => { setInvoiceNumber(e.target.value); setPreview(null); }}
                    maxLength={50}
                    placeholder="VD: INV-1024"
                    className="w-full h-11 px-3 rounded-xl bg-white border border-gray-100 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ghi chú phiếu</span>
                  <input
                    value={note}
                    onChange={(e) => { setNote(e.target.value); setPreview(null); }}
                    maxLength={500}
                    placeholder="Nhà cung cấp, ca nhập..."
                    className="w-full h-11 px-3 rounded-xl bg-white border border-gray-100 text-sm font-bold outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SummaryTile label="Dòng hợp lệ" value={preview ? preview.validRows : 0} tone="green" />
              <SummaryTile label="Dòng lỗi" value={preview ? preview.invalidRows : 0} tone={hasErrors ? 'red' : 'gray'} />
              <SummaryTile label="Tổng lượng" value={preview ? fmtNumber(preview.totalQuantity) : '0'} tone="gray" />
              <SummaryTile label="Tổng tiền" value={preview ? fmtCurrency(preview.totalAmount) : '0 đ'} tone="orange" />
            </div>
          </section>

          {firstErrors.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest">
                <XCircle size={15} /> Lỗi cần sửa
              </div>
              <ul className="space-y-1 text-sm font-bold text-red-700">
                {firstErrors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
              </ul>
            </div>
          )}

          <PreviewTable rows={rows} />
        </div>

        <footer className="px-5 py-4 sm:px-7 sm:py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {preview ? (preview.importable ? 'File đã sẵn sàng nhập kho' : 'Chưa ghi dữ liệu vì file còn lỗi') : 'Preview file trước khi nhập kho'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canSubmit || isPreviewing || isCommitting}
              className="h-12 px-5 rounded-2xl bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:bg-gray-50"
            >
              {isPreviewing ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Preview
            </button>
            <button
              type="button"
              onClick={handleCommit}
              disabled={!canCommit}
              className="h-12 px-6 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 hover:bg-orange-600 shadow-xl shadow-orange-500/20"
            >
              {isCommitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Nhập kho
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function SummaryTile({ label, value, tone }) {
  const toneClass = {
    green: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-100',
    gray: 'text-gray-900 bg-white border-gray-100',
  }[tone] || 'text-gray-900 bg-white border-gray-100';
  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${toneClass}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-70 truncate">{label}</p>
      <p className="mt-2 text-lg font-black tracking-tight break-words">{value}</p>
    </div>
  );
}

function PreviewTable({ rows }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 px-4 text-center">
        <FileSpreadsheet size={28} className="mx-auto text-gray-300" />
        <p className="mt-3 text-xs font-black uppercase tracking-widest text-gray-400">Chưa có dữ liệu preview</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <tr>
              <th className="px-4 py-3">Dòng</th>
              <th className="px-4 py-3">Nguyên liệu</th>
              <th className="px-4 py-3">Đơn vị tồn</th>
              <th className="px-4 py-3 text-right">Mua thực tế</th>
              <th className="px-4 py-3">Quy đổi</th>
              <th className="px-4 py-3 text-right">Giá mua</th>
              <th className="px-4 py-3 text-right">Tồn sau</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Lỗi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const baseSymbol = row.unitSymbol || row.unit || '';
              const purchaseSymbol = row.purchaseUnitSymbol || row.purchaseUnit || '';
              return (
                <tr key={row.rowNumber} className={row.valid ? 'bg-white' : 'bg-red-50/40'}>
                  <td className="px-4 py-4 text-xs font-black text-gray-400">#{row.rowNumber}</td>
                  <td className="px-4 py-4 min-w-[190px]">
                    <p className="text-sm font-black text-gray-900 whitespace-normal break-words">{row.ingredientName || '-'}</p>
                    {row.batchNumber && <p className="text-[10px] font-bold text-gray-400 mt-1">Lô: {row.batchNumber}</p>}
                    {row.expiryDate && <p className="text-[10px] font-bold text-gray-400">HSD: {row.expiryDate}</p>}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-gray-600">{baseSymbol || '-'}</td>
                  <td className="px-4 py-4 text-sm font-black text-gray-900 text-right">
                    {fmtNumber(row.purchaseQuantity)} <span className="text-[10px] text-gray-400">{purchaseSymbol}</span>
                  </td>
                  <td className="px-4 py-4 min-w-[190px]">
                    <p className="text-xs font-black text-gray-900">1 {purchaseSymbol || 'đơn vị mua'} = {fmtNumber(row.purchaseToBaseRate)} {baseSymbol}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">Tổng: {fmtNumber(row.convertedQuantity ?? row.quantity)} {baseSymbol}</p>
                  </td>
                  <td className="px-4 py-4 text-right min-w-[160px]">
                    <p className="text-sm font-black text-gray-900">{fmtCurrency(row.purchaseUnitCost)}</p>
                    <p className="text-[10px] font-bold text-gray-400">/ {purchaseSymbol || 'đv mua'}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1">Base: {fmtCurrency(row.unitCost)}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-black text-gray-900 text-right">
                    {row.quantityAfterImport != null ? `${fmtNumber(row.quantityAfterImport)} ${baseSymbol}` : '-'}
                  </td>
                  <td className="px-4 py-4 min-w-[170px]">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${row.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {row.valid ? row.action : 'Cần sửa'}
                    </span>
                  </td>
                  <td className="px-4 py-4 min-w-[280px]">
                    {row.valid ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Hợp lệ</span>
                    ) : (
                      <div className="space-y-1">
                        {(row.errors || []).map((error, index) => (
                          <p key={index} className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}