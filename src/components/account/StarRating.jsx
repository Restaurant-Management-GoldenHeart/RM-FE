/**
 * StarRating.jsx
 * Component chọn / hiển thị điểm đánh giá 1–5 sao.
 *
 * Props:
 *   value      - số sao hiện tại (1-5)
 *   onChange   - callback(newRating) — nếu có thì interactive, nếu không thì read-only
 *   size       - 'sm' | 'md' | 'lg'
 */
export default function StarRating({ value = 0, onChange, size = 'md' }) {
  const sizePx = { sm: 14, md: 18, lg: 24 }[size];
  const isInteractive = !!onChange;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => isInteractive && onChange(star)}
          className={`leading-none transition-transform ${
            isInteractive ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
          }`}
          aria-label={`${star} sao`}
        >
          <svg
            width={sizePx}
            height={sizePx}
            viewBox="0 0 24 24"
            fill={star <= value ? '#ca8a04' : 'none'}
            stroke={star <= value ? '#ca8a04' : '#4a4a46'}
            strokeWidth={2}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}
