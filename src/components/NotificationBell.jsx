import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, BellOff, X } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';
import { useBranchContext } from '../context/BranchContext';
import NotificationItem from './NotificationItem';

const POLL_INTERVAL = 30_000; // 30 seconds

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [loading, setLoading] = useState(false);

  const buttonRef = useRef(null);
  const prevUnreadRef = useRef(0);
  const { buildApiParams } = useBranchContext();

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications(buildApiParams());
      const data = res.data?.content || [];
      const currentUnread = data.filter(n => !n.isRead).length;

      setNotifications(data);
      setUnreadCount(currentUnread);

      // Ring only when new notifications arrive (not on first load)
      if (currentUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
        setIsRinging(true);
        const t = setTimeout(() => setIsRinging(false), 1000);
        return () => clearTimeout(t);
      }
      prevUnreadRef.current = currentUnread;
    } catch {
      // silently swallow — polling errors should not disrupt UX
    }
  }, [buildApiParams]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // ── Close on outside click (via document, not per-component) ──────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (buttonRef.current && !buttonRef.current.closest('[data-notif-root]')?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    // Use capture phase so it runs before anything else
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [isOpen]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationApi.markAsRead(id);
    } catch {
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n));
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllAsRead();
    } catch {
      // Re-fetch on failure
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── Split into unread / read ───────────────────────────────────────────────
  const unread = notifications.filter(n => !n.isRead);
  const read = notifications.filter(n => n.isRead).slice(0, 5); // cap read at 5

  // ── Portal dropdown ────────────────────────────────────────────────────────
  const dropdown = isOpen && createPortal(
    <div
      data-notif-root=""
      style={{
        position: 'fixed',
        top: (buttonRef.current?.getBoundingClientRect().bottom ?? 64) + 8,
        right: 12,
        zIndex: 99999,
      }}
      className="w-[340px] md:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm text-gray-900">Thông báo</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors"
            >
              <CheckCircle2 size={11} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
              <BellOff size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-700">Không có thông báo</p>
            <p className="text-xs text-gray-400 mt-1">Bạn đã xem hết tất cả thông báo.</p>
          </div>
        ) : (
          <>
            {/* Unread section */}
            {unread.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  Chưa đọc · {unread.length}
                </p>
                <div className="divide-y divide-gray-50">
                  {unread.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={handleRead} />
                  ))}
                </div>
              </div>
            )}

            {/* Read section */}
            {read.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-[9px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 mt-1">
                  Đã đọc
                </p>
                <div className="divide-y divide-gray-50">
                  {read.map(n => (
                    <NotificationItem key={n.id} notification={n} onRead={handleRead} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div data-notif-root="" className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(v => !v)}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        aria-expanded={isOpen}
        className="relative w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <Bell
          size={20}
          className={`transition-colors ${isRinging ? 'animate-[ringing_0.5s_ease-in-out] text-amber-500' : 'text-gray-600'}`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-0.5 border-2 border-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdown}
    </div>
  );
}
