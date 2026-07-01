/**
 * WasteRequestPage.jsx — Phiếu xuất hủy kho
 * KITCHEN/STAFF: Tạo phiếu & xem phiếu đã gửi
 * MANAGER/ADMIN: Duyệt / từ chối phiếu
 */
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, X, Trash2, CheckCircle2, XCircle, Clock, Search,
  ChevronLeft, ChevronRight, ImagePlus, Eye, AlertTriangle,
  PackageX, Filter, Download, CalendarRange, TrendingDown, FileSpreadsheet,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { wasteApi } from '../../api/wasteApi';
import { inventoryApi } from '../../api/inventoryApi';
import { employeeApi } from '../../api/employeeApi';
import { extractErrorMessage } from '../../utils/errorHelper';

const fmtCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_LABELS = {
  EXPIRED:     'Hết hạn sử dụng',
  DAMAGED:     'Hư hỏng / vỡ',
  CONTAMINATED:'Nhiễm khuẩn / ô nhiễm',
  OTHER:       'Lý do khác',
};

const REASONS = Object.entries(REASON_LABELS).map(([value, label]) => ({ value, label }));

const STATUS_CONFIG = {
  PENDING:  { label: 'Chờ duyệt',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  Icon: Clock },
  APPROVED: { label: 'Đã duyệt',   bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',Icon: CheckCircle2 },
  REJECTED: { label: 'Đã từ chối', bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    Icon: XCircle },
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const EMPTY_ITEM = () => ({ ingredientId: '', quantity: '', reason: 'EXPIRED', note: '' });

const fmtDate = (dt) => {
  if (!dt) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dt));
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const { Icon } = cfg;
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${textSize} ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── IngredientSelect ─────────────────────────────────────────────────────────

function IngredientSelect({ value, onChange, inventoryItems, excludeIds = [] }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = (inventoryItems || []).filter((inv) => {
    if (excludeIds.includes(inv.ingredientId) && inv.ingredientId !== value) return false;
    if (!search) return true;
    return inv.ingredientName?.toLowerCase().includes(search.toLowerCase());
  });

  const selected = (inventoryItems || []).find((inv) => inv.ingredientId === value);

  const handleSelect = (inv) => {
    onChange(inv.ingredientId, inv);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:border-gold-300 focus:outline-none focus:border-gold-400 transition-colors"
      >
        {selected ? (
          <span className="font-medium text-gray-800">
            {selected.ingredientName}
            <span className="ml-1.5 text-xs text-gray-400 font-normal">({selected.unit})</span>
          </span>
        ) : (
          <span className="text-gray-400">Chọn nguyên liệu...</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nguyên liệu..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gold-300"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">Không tìm thấy</li>
            ) : (
              filtered.slice(0, 50).map((inv) => (
                <li key={inv.ingredientId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(inv)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800">{inv.ingredientName}</span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {inv.quantity != null ? `${Number(inv.quantity).toLocaleString('vi-VN')} ${inv.unit}` : inv.unit}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── ImageUploadZone ──────────────────────────────────────────────────────────

function ImageUploadZone({ images, onChange }) {
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    onChange((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (idx) => {
    onChange((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-gold-300 hover:bg-gold-50/30 transition-all"
      >
        <ImagePlus size={20} className="text-gray-400" />
        <p className="text-xs text-gray-500 text-center">
          Kéo ảnh vào đây hoặc <span className="text-gold-600 font-semibold">chọn file</span>
        </p>
        <p className="text-[10px] text-gray-400">PNG, JPG — tối đa 5 ảnh</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((file, idx) => (
            <div key={idx} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CreateWasteModal ─────────────────────────────────────────────────────────

function CreateWasteModal({ open, onClose, onSuccess, branchId, isAdmin }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState([EMPTY_ITEM()]);
  const [note, setNote] = useState('');
  const [images, setImages] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branchId ?? '');

  // Sync khi modal mở lại
  useEffect(() => {
    if (open) setSelectedBranchId(branchId ?? '');
  }, [open, branchId]);

  const effectiveBranchId = isAdmin ? selectedBranchId : branchId;

  // Danh sách branch cho admin chọn
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => employeeApi.getBranches().then((r) => r.data ?? []),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Nguyên liệu theo branch — lấy toàn bộ (size 999)
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-for-waste', effectiveBranchId],
    queryFn: () =>
      inventoryApi
        .getInventoryItems({ branchId: effectiveBranchId, size: 999 })
        .then(
          (r) =>
            r.data?.content?.map((inv) => ({
              ingredientId: inv.ingredientId,
              ingredientName: inv.ingredientName,
              quantity: inv.quantity,
              unit: inv.unitSymbol,
            })) ?? []
        ),
    enabled: !!effectiveBranchId,
    staleTime: 30_000,
  });

  const handleBranchChange = (newBranchId) => {
    setSelectedBranchId(newBranchId);
    setItems([EMPTY_ITEM()]); // reset khi đổi branch
  };

  const { mutate, isPending } = useMutation({
    mutationFn: ({ payload, images: imgs }) => wasteApi.create(payload, imgs),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['waste-requests'] });
      queryClient.invalidateQueries({ queryKey: ['waste-pending-count'] });
      toast.success('Phiếu xuất hủy đã được gửi. Vui lòng chờ quản lý duyệt.');
      handleClose();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Không thể gửi phiếu xuất hủy');
    },
  });

  const handleClose = () => {
    setItems([EMPTY_ITEM()]);
    setNote('');
    setImages([]);
    onClose();
  };

  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM()]);

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleIngredientSelect = (idx, ingredientId, invItem) => {
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, ingredientId, unit: invItem?.unit } : item
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validItems = items.filter((it) => it.ingredientId && it.quantity);
    if (validItems.length === 0) {
      toast.error('Vui lòng thêm ít nhất một nguyên liệu và số lượng');
      return;
    }

    const hasInvalid = validItems.some((it) => Number(it.quantity) <= 0);
    if (hasInvalid) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }

    if (isAdmin && !selectedBranchId) {
      toast.error('Vui lòng chọn chi nhánh');
      return;
    }

    if (images.length > 5) {
      toast.error('Tối đa 5 ảnh minh chứng');
      return;
    }

    const payload = {
      branchId: isAdmin ? (selectedBranchId ? Number(selectedBranchId) : undefined) : undefined,
      note: note.trim() || undefined,
      items: validItems.map((it) => ({
        ingredientId: Number(it.ingredientId),
        quantity: Number(it.quantity),
        reason: it.reason,
        note: it.note?.trim() || undefined,
      })),
    };

    mutate({ payload, images });
  };

  const usedIngredientIds = items.map((it) => it.ingredientId).filter(Boolean).map(Number);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Tạo phiếu xuất hủy</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ghi nhận nguyên liệu hư hỏng / hết hạn để quản lý duyệt</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Branch selector — chỉ admin */}
          {isAdmin && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                Chi nhánh <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold-400 transition-colors"
              >
                <option value="">Chọn chi nhánh...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ghi chú chung */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
              Ghi chú chung
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Lô hàng nhập ngày 25/06 bị nhiễm khuẩn..."
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gold-400 transition-colors"
            />
          </div>

          {/* Danh sách nguyên liệu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Danh sách nguyên liệu xuất hủy
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors"
              >
                <Plus size={13} />
                Thêm dòng
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="grid grid-cols-[1fr_auto] gap-2 mb-2">
                    <div className="grid grid-cols-[1fr_100px] gap-2">
                      <IngredientSelect
                        value={item.ingredientId ? Number(item.ingredientId) : ''}
                        onChange={(id, inv) => handleIngredientSelect(idx, id, inv)}
                        inventoryItems={inventoryItems}
                        excludeIds={usedIngredientIds.filter((id) => id !== (item.ingredientId ? Number(item.ingredientId) : ''))}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          placeholder="Số lượng"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-gold-400 transition-colors"
                        />
                        {item.unit && (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            {item.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={item.reason}
                      onChange={(e) => updateItem(idx, 'reason', e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 focus:outline-none focus:border-gold-400 transition-colors"
                    >
                      {REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateItem(idx, 'note', e.target.value)}
                      placeholder="Ghi chú nguyên liệu..."
                      maxLength={255}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-gold-400 transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ảnh minh chứng */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
              Ảnh minh chứng (tối đa 5)
            </label>
            <ImageUploadZone images={images} onChange={setImages} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Đang gửi...' : 'Gửi phiếu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetailModal ──────────────────────────────────────────────────────────────

function DetailModal({ wasteRequestId, open, onClose, canReview }) {
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState('');
  const [action, setAction] = useState(null); // 'approve' | 'reject'

  const { data: detailData, isLoading } = useQuery({
    queryKey: ['waste-requests', wasteRequestId],
    queryFn: () => wasteApi.getById(wasteRequestId),
    enabled: open && !!wasteRequestId,
    select: (res) => res.data,
  });

  const wr = detailData;

  const approveMutation = useMutation({
    mutationFn: () => wasteApi.approve(wasteRequestId, reviewNote.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-requests'] });
      queryClient.invalidateQueries({ queryKey: ['waste-pending-count'] });
      toast.success('Đã duyệt phiếu. Kho đã được trừ tương ứng.');
      handleClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Không thể duyệt phiếu'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => wasteApi.reject(wasteRequestId, reviewNote.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-requests'] });
      queryClient.invalidateQueries({ queryKey: ['waste-pending-count'] });
      toast.success('Đã từ chối phiếu xuất hủy.');
      handleClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Không thể từ chối phiếu'),
  });

  const handleClose = () => {
    setReviewNote('');
    setAction(null);
    onClose();
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;
  const showReviewPanel = canReview && wr?.status === 'PENDING';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <PackageX size={18} className="text-gray-500" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Phiếu xuất hủy #{wr?.id ?? '...'}
              </h2>
              {wr && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {fmtDate(wr.createdAt)} — {wr.requestedByName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wr && <StatusBadge status={wr.status} size="md" />}
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gold-500 animate-spin" />
            </div>
          ) : !wr ? null : (
            <div className="space-y-5">
              {/* Ghi chú */}
              {wr.note && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Ghi chú</p>
                  <p className="text-sm text-amber-800">{wr.note}</p>
                </div>
              )}

              {/* Danh sách nguyên liệu */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Nguyên liệu xuất hủy ({wr.items?.length ?? 0} loại)
                </p>
                <div className="space-y-2">
                  {(wr.items || []).map((item) => (
                    <div key={item.id} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.ingredientNameSnapshot}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {REASON_LABELS[item.reason] ?? item.reason}
                          {item.note && <span className="ml-1.5 text-gray-400">— {item.note}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-bold text-red-600">
                          -{Number(item.quantity).toLocaleString('vi-VN')}
                          {item.unitSymbolSnapshot && <span className="text-xs font-normal ml-1">{item.unitSymbolSnapshot}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ảnh minh chứng */}
              {wr.imageUrls?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Ảnh minh chứng ({wr.imageUrls.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wr.imageUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`evidence-${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Kết quả duyệt */}
              {wr.status !== 'PENDING' && (
                <div className={`rounded-xl px-4 py-3 border ${wr.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${wr.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {wr.status === 'APPROVED' ? 'Đã duyệt bởi' : 'Đã từ chối bởi'}
                  </p>
                  <p className={`text-sm font-semibold ${wr.status === 'APPROVED' ? 'text-emerald-800' : 'text-red-700'}`}>
                    {wr.reviewedByName} — {fmtDate(wr.reviewedAt)}
                  </p>
                  {wr.reviewNote && (
                    <p className={`text-xs mt-1 ${wr.status === 'APPROVED' ? 'text-emerald-700' : 'text-red-600'}`}>
                      "{wr.reviewNote}"
                    </p>
                  )}
                </div>
              )}

              {/* Review panel cho MANAGER/ADMIN */}
              {showReviewPanel && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quyết định duyệt</p>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Ghi chú (không bắt buộc)..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-gold-400 resize-none transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => rejectMutation.mutate()}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate()}
                      disabled={isPending}
                      className="flex-[2] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {isPending ? 'Đang xử lý...' : 'Duyệt & trừ kho'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WasteRequestCard ─────────────────────────────────────────────────────────

function WasteRequestCard({ wr, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-sm transition-all duration-200 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              #{wr.id}
            </span>
            <StatusBadge status={wr.status} />
          </div>
          <p className="text-sm font-bold text-gray-800 mt-1 truncate">
            {wr.requestedByName}
            <span className="text-gray-400 font-normal ml-1.5">— {wr.branchName}</span>
          </p>
        </div>
        <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{fmtDate(wr.createdAt)}</span>
      </div>

      {wr.note && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{wr.note}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Eye size={11} />
        <span>Xem chi tiết</span>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WasteRequestPage() {
  const { role, user } = useAuthStore();
  const canReview = ['ADMIN', 'MANAGER'].includes(role);
  const branchId = user?.branchId;

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const scopedBranchId = role === 'ADMIN' ? undefined : branchId;

  // Waste request list
  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ['waste-requests', statusFilter, dateFrom, dateTo, page, branchId],
    queryFn: () => wasteApi.list({
      branchId: scopedBranchId,
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      size: 20,
    }),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  });

  // Pending count badge
  const { data: pendingCountData } = useQuery({
    queryKey: ['waste-pending-count', branchId],
    queryFn: () => wasteApi.countPending(),
    select: (res) => res.data,
    enabled: canReview,
    refetchInterval: 60_000,
  });

  // Stats badges
  const { data: stats } = useQuery({
    queryKey: ['waste-stats', dateFrom, dateTo, branchId],
    queryFn: () => wasteApi.getStats({
      branchId: scopedBranchId,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    select: (res) => res.data,
  });

  const requests = listData?.content ?? [];
  const totalPages = listData?.totalPages ?? 1;
  const totalElements = listData?.totalElements ?? 0;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await wasteApi.exportExcel({
        branchId: scopedBranchId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = dateFrom || dateTo
        ? `_${dateFrom || 'all'}_${dateTo || 'now'}`
        : '';
      link.download = `bao_cao_xuat_huy${suffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo hủy kho');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Không xuất được file Excel.'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <PackageX size={20} className="text-gray-500" />
            <h1 className="text-xl font-black text-gray-900">Phiếu xuất hủy kho</h1>
            {canReview && pendingCountData > 0 && (
              <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingCountData}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Ghi nhận nguyên liệu hư hỏng, hết hạn để quản lý xét duyệt và trừ kho
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canReview && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet size={15} />
              {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Tạo phiếu mới
          </button>
        </div>
      </div>

      {/* Tracking badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Chờ duyệt</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats?.totalPending ?? '—'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">phiếu</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Đã duyệt</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats?.totalApproved ?? '—'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">phiếu</p>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-red-400" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Từ chối</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats?.totalRejected ?? '—'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">phiếu</p>
        </div>
        <div className="bg-white border border-rose-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-rose-500" />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Giá trị hủy</span>
          </div>
          <p className="text-lg font-black text-gray-900 leading-tight">
            {stats?.estimatedWastedValue != null ? fmtCurrency(stats.estimatedWastedValue) : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">ước tính giá vốn</p>
        </div>
      </div>

      {/* Pending alert for reviewers */}
      {canReview && pendingCountData > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            Có <span className="font-black">{pendingCountData}</span> phiếu đang chờ bạn duyệt.
            Kiểm tra và phê duyệt để hệ thống tự động trừ kho.
          </p>
        </div>
      )}

      {/* Filter bar — status + date range */}
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400 shrink-0" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                statusFilter === f.value
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-auto">
            {totalElements} phiếu
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarRange size={13} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 font-semibold">Từ ngày</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="h-8 px-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
          />
          <span className="text-xs text-gray-400">—</span>
          <span className="text-xs text-gray-500 font-semibold">đến ngày</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="h-8 px-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 transition-colors"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setPage(0); }}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold underline transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gold-500 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
          <PackageX size={40} className="opacity-30" />
          <p className="text-sm font-semibold">Chưa có phiếu xuất hủy nào</p>
          <p className="text-xs">Nhấn "Tạo phiếu mới" để bắt đầu</p>
        </div>
      ) : (
        <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-70' : ''}`}>
          {requests.map((wr) => (
            <WasteRequestCard
              key={wr.id}
              wr={wr}
              onClick={() => setSelectedId(wr.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-600">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateWasteModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        branchId={branchId}
        isAdmin={role === 'ADMIN'}
      />

      <DetailModal
        wasteRequestId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        canReview={canReview}
      />
    </div>
  );
}
