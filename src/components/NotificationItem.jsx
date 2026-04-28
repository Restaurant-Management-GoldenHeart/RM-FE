import { Bell, AlertTriangle, Info, CheckCircle2, Package, UtensilsCrossed, Check } from 'lucide-react';

const ICONS = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ORDER: UtensilsCrossed,
  INVENTORY: Package,
  DEFAULT: Bell
};

const COLORS = {
  INFO: 'text-blue-500 bg-blue-50',
  WARNING: 'text-amber-500 bg-amber-50',
  SUCCESS: 'text-emerald-500 bg-emerald-50',
  ORDER: 'text-orange-500 bg-orange-50',
  INVENTORY: 'text-purple-500 bg-purple-50',
  DEFAULT: 'text-gray-500 bg-gray-50'
};

export default function NotificationItem({ notification, onRead }) {
  const Icon = ICONS[notification.type] || ICONS.DEFAULT;
  const colorClass = COLORS[notification.type] || COLORS.DEFAULT;
  const isUnread = !notification.isRead;

  // Relative time format
  const getRelativeTime = (dateStr) => {
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference === 0) {
      const hours = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.round((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60));
        return rtf.format(mins, 'minute');
      }
      return rtf.format(hours, 'hour');
    }
    return rtf.format(daysDifference, 'day');
  };

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={`
        w-full flex items-start gap-3 p-4 text-left transition-all border-l-4
        ${isUnread 
          ? 'bg-blue-50/50 border-blue-500 hover:bg-blue-50' 
          : 'bg-white border-transparent hover:bg-gray-50 opacity-75'
        }
      `}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
          {getRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!isUnread && (
        <div className="shrink-0 mt-1">
          <Check size={16} className="text-gray-300" />
        </div>
      )}
    </button>
  );
}
