import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Bell, CheckCheck, ChevronDown, ChevronRight, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../types';

export function NotificationInbox() {
  const { currentUser } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  const mine = notifications.filter(n => !n.recipientId || n.recipientId === currentUser.id);
  const unread = mine.filter(n => !n.read);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-[#6b6b80] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.03)] transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute top-0 right-0 bg-[#ff006e] text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-96 max-w-[90vw] bg-[#12121a] border border-[rgba(0,229,255,0.15)] shadow-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,229,255,0.1)]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#00e5ff]" />
                <h3 className="font-semibold text-[#f0f0f5] text-sm">Notifications</h3>
                {unread.length > 0 && (
                  <span className="text-xs text-[#6b6b80]">({unread.length} unread)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread.length > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead(currentUser.id)}
                    className="flex items-center gap-1 text-xs text-[#00e5ff] hover:text-[#00d5ef] transition"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#6b6b80] hover:text-[#f0f0f5]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {mine.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-10 h-10 text-[#6b6b80] mx-auto mb-2" />
                  <p className="text-sm text-[#6b6b80]">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(255,255,255,0.04)]">
                  {mine.map(n => (
                    <NotificationRow key={n.id} notification={n} onRead={() => markNotificationRead(n.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => {
        if (!notification.read) onRead();
        setExpanded(!expanded);
      }}
      className={`w-full text-left px-4 py-3 transition hover:bg-[rgba(255,255,255,0.02)] ${
        notification.read ? 'opacity-60' : 'bg-[rgba(0,229,255,0.03)]'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#f0f0f5] leading-snug">{notification.title}</p>
          <p className="text-xs text-[#6b6b80] mt-0.5">{notification.type.replace(/_/g, ' ')}</p>
          <p className="text-xs text-[#6b6b80] mt-1">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
          {expanded && notification.message && (
            <div className="mt-2 p-2 bg-[#0e0e16] border border-[rgba(255,255,255,0.05)]">
              <p className="text-xs text-[#f0f0f5] whitespace-pre-line">{notification.message}</p>
              {notification.relatedTo && (
                <p className="text-[11px] text-[#6b6b80] mt-1 mt-2 uppercase tracking-wide">
                  {notification.relatedTo.type} · {notification.relatedTo.id}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.read && <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-[#6b6b80]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#6b6b80]" />}
        </div>
      </div>
    </button>
  );
}