import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, BellOff } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';
import { useBranchContext } from '../context/BranchContext';
import NotificationItem from './NotificationItem';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef(null);
  const { buildApiParams } = useBranchContext();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications(buildApiParams());
      const data = res.data?.content || [];
      const currentUnread = data.filter(n => !n.isRead).length;
      
      setNotifications(data);
      
      // If unread count increased, trigger ring animation
      setUnreadCount(prev => {
        if (currentUnread > prev && prev !== 0) {
          setIsRinging(true);
          setTimeout(() => setIsRinging(false), 1000);
        }
        return currentUnread;
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [buildApiParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        <Bell className={`w-6 h-6 text-gray-600 ${isRinging ? 'animate-ringing text-amber-500' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors bg-amber-50 px-2 py-1 rounded-md"
              >
                <CheckCircle2 size={14} />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                  <BellOff size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-900 font-bold">Không có thông báo mới</p>
                <p className="text-gray-500 text-sm mt-1">Bạn đã xem hết tất cả thông báo.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notification => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onRead={handleRead}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-50 bg-gray-50/50">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-2 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
