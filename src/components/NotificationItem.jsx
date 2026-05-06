import { Bell, AlertTriangle, Info, CheckCircle2, Package, UtensilsCrossed, Check } from 'lucide-react';
import { memo } from 'react';

const ICONS = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ORDER: UtensilsCrossed,
  INVENTORY: Package,
  DEFAULT: Bell,
};

const COLORS = {
  INFO:      'text-blue-500 bg-blue-50',
  WARNING:   'text-amber-500 bg-amber-50',
  SUCCESS:   'text-emerald-500 bg-emerald-50',
  ORDER:     'text-orange-500 bg-orange-50',
  INVENTORY: 'text-purple-500 bg-purple-50',
  DEFAULT:   'text-gray-500 bg-gray-50',
};

// Relative time — always past-relative (notification happened in the past)
function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime(); // positive = in the past
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60)       return 'Vừa xong';
  if (diffSec < 3600)     return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400)    return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} ngày trước`;

  // Older than 7 days → absolute date
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
}

const NotificationItem = memo(function NotificationItem({ notification, onRead }) {
  const Icon = ICONS[notification.type] || ICONS.DEFAULT;
  const colorClass = COLORS[notification.type] || COLORS.DEFAULT;
  const isUnread = !notification.isRead;

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
        isUnread
          ? 'bg-blue-50/40 hover:bg-blue-50 border-l-[3px] border-blue-400'
          : 'bg-white hover:bg-gray-50 border-l-[3px] border-transparent opacity-70 hover:opacity-100'
      }`}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
        <Icon size={17} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] leading-snug ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-gray-400 mt-1 font-medium">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Read indicator */}
      {!isUnread && (
        <Check size={14} className="text-gray-300 shrink-0 mt-1" />
      )}
    </button>
  );
});

export default NotificationItem;
