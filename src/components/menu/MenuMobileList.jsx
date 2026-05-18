import React from 'react';
import { CheckCircle2, Edit2, Tag, Trash2, UtensilsCrossed, XCircle } from 'lucide-react';

function StatusBadge({ status }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
        isAvailable
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-gray-100 bg-gray-50 text-gray-500'
      }`}
    >
      {isAvailable ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <XCircle className="h-3 w-3" aria-hidden="true" />}
      {isAvailable ? 'Co san' : 'Het hang'}
    </span>
  );
}

const resolveDisplayStatus = (item) => item?.effectiveStatus || item?.status || 'OUT_OF_STOCK';

export default function MenuMobileList({ items, loading, onEdit, onDelete, isAdmin }) {
  if (loading) {
    return (
      <div className="w-full space-y-3 px-4 md:px-0">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-2/3 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
                <div className="mt-3 h-5 w-1/4 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] border border-gray-100 bg-gray-50">
          <UtensilsCrossed size={32} className="text-gray-300" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-gray-900">Khong tim thay mon an</h3>
        <p className="mt-2 max-w-[250px] text-xs font-medium leading-relaxed text-gray-400">
          Du lieu hien tai dang trong hoac khong khop voi bo loc.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:px-0" style={{ touchAction: 'manipulation' }}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => isAdmin && onEdit(item)}
          className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-transform ${
            isAdmin ? 'cursor-pointer active:scale-[0.98]' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                    {item.price ? `${(item.price / 1000).toFixed(0)}K` : '—'}
                  </span>
                  <UtensilsCrossed size={16} className="mt-0.5 text-amber-400" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h4 className="min-w-0 flex-1 truncate text-sm font-black leading-tight text-gray-900">{item.name}</h4>
                <div className="shrink-0">
                  <StatusBadge status={resolveDisplayStatus(item)} />
                </div>
              </div>

              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {item.categoryName || 'Danh muc trong'}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1">
                  <Tag className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="text-[10px] font-bold text-gray-500">{item.recipes?.length || 0} nguyen lieu</span>
                </div>

                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                      }}
                      aria-label={`Sua mon ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 active:scale-90"
                    >
                      <Edit2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(item);
                      }}
                      aria-label={`Xoa mon ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-90"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
