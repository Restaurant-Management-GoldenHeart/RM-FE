import React from 'react';
import { CheckCircle2, Edit2, Tag, Trash2, UtensilsCrossed, XCircle } from 'lucide-react';
import PaginationBar from '../common/PaginationBar';

const fmt = (value) => (value != null ? `${Number(value).toLocaleString('vi-VN')}₫` : '—');

function StatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
        isAvailable ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-500'
      }`}
    >
      {isAvailable ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isAvailable ? 'Có sẵn' : 'Hết hàng'}
    </span>
  );
}

const resolveDisplayStatus = (item) => item?.effectiveStatus || item?.status || 'OUT_OF_STOCK';

function SkeletonRow({ isAdmin }) {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      <td className="px-6 py-4"><div className="h-4 w-48 rounded bg-gray-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-gray-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-gray-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-16 rounded bg-gray-100" /></td>
      {isAdmin ? <td className="px-6 py-4"><div className="h-8 w-16 rounded bg-gray-100" /></td> : null}
    </tr>
  );
}

export function MenuTable({
  items = [],
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  isAdmin,
  showPagination = true,
}) {
  const { page = 0, totalPages = 0, totalElements = 0, start = 0, end = 0 } = pagination || {};

  if (loading && items.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              {['Món ăn', 'Danh mục', 'Chi nhánh', 'Giá', 'Trạng thái', 'Nguyên liệu'].map((header) => (
                <th key={header} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {header}
                </th>
              ))}
              {isAdmin ? <th className="px-6 py-4" /> : null}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonRow key={index} isAdmin={isAdmin} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white p-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50">
          <UtensilsCrossed className="h-10 w-10 text-gray-200" />
        </div>
        <h3 className="text-xl font-black text-gray-900">Không tìm thấy món ăn</h3>
        <p className="mt-2 text-sm text-gray-500">Dữ liệu hiện tại đang trống hoặc không khớp với bộ lọc.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="max-h-[calc(100vh-280px)] overflow-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Món ăn</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Danh mục</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Chi nhánh</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Giá niêm yết</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Trạng thái</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Recipe</th>
              {isAdmin ? <th className="px-6 py-4" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-amber-50/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 transition-colors group-hover:bg-amber-100">
                      <UtensilsCrossed className="h-5 w-5 text-gray-300 group-hover:text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight text-gray-900">{item.name}</p>
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-gray-400">{item.description || 'Không có mô tả'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-600">{item.categoryName || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{item.branchName || 'Toàn hệ thống'}</td>
                <td className="px-6 py-4">
                  <span className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-sm font-black tabular-nums text-gray-900">
                    {fmt(item.price)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={resolveDisplayStatus(item)} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                    <Tag className="h-3.5 w-3.5 text-gray-300" />
                    <span>{item.recipes?.length || 0} nguyên liệu</span>
                  </div>
                </td>
                {isAdmin ? (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 transition-all lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-gray-50 transition-colors hover:border-amber-200 hover:text-amber-600"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-gray-50 transition-colors hover:border-red-200 hover:text-red-500"
                        title="Xóa món"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 ? (
        <div className="border-t border-gray-100 bg-gray-50/30 px-6 py-4">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            start={start}
            end={end}
            itemLabel="món"
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
