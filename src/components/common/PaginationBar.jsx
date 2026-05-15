import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const items = [0];
  const windowStart = Math.max(1, currentPage - 1);
  const windowEnd = Math.min(totalPages - 2, currentPage + 1);

  if (windowStart > 1) {
    items.push('left-ellipsis');
  }

  for (let index = windowStart; index <= windowEnd; index += 1) {
    items.push(index);
  }

  if (windowEnd < totalPages - 2) {
    items.push('right-ellipsis');
  }

  items.push(totalPages - 1);
  return items;
}

export default function PaginationBar({
  page = 0,
  totalPages = 0,
  totalElements = 0,
  start = 0,
  end = 0,
  itemLabel = 'bản ghi',
  onPageChange,
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(page, totalPages);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        Hiển thị <span className="text-gray-900">{start}</span>-<span className="text-gray-900">{end}</span> /{' '}
        <span className="text-gray-900">{totalElements}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange?.(page - 1)}
          disabled={page === 0}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-200 hover:text-amber-600 disabled:opacity-30"
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {pageItems.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange?.(item)}
                className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-xs font-black transition-all ${
                  page === item
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'border border-gray-200 bg-white text-gray-500 hover:border-amber-200 hover:text-amber-600'
                }`}
              >
                {item + 1}
              </button>
            ) : (
              <span
                key={item}
                className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-gray-300"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages - 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-200 hover:text-amber-600 disabled:opacity-30"
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
