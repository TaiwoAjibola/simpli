import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Bell, CheckCheck, ChevronDown, ChevronRight, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../types';

export function NotificationInbox({ onNavigate }: { onNavigate?: (page: string) => void }) {
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
        className="group relative p-2 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute top-0 right-0 bg-[#2383E2] text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-medium">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-96 max-w-[90vw] bg-white border border-[#E9E9E7] rounded-[8px] z-50 overflow-hidden" style={{ boxShadow: 'none' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E9E7]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#37352F]" />
                <h3 className="font-semibold text-[#37352F] text-[14px]">Notifications</h3>
                {unread.length > 0 && (
                  <span className="text-[12px] text-[#787774]">({unread.length} unread)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread.length > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead(currentUser.id)}
                    className="flex items-center gap-1 text-[12px] text-[#2383E2] hover:text-[#1a6fc0] font-medium transition-colors duration-150"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#787774] hover:text-[#37352F] p-1 hover:bg-[#F7F7F5] rounded-[4px]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {mine.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-10 h-10 text-[#787774] mx-auto mb-2" />
                  <p className="text-[13px] text-[#787774]">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E9E9E7]">
                  {mine.map(n => (
                    <NotificationRow key={n.id} notification={n} onRead={() => markNotificationRead(n.id)} />
                  ))}
                </div>
              )}
            </div>
            {mine.length > 0 && onNavigate && (
              <div className="border-t border-[#E9E9E7] p-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    onNavigate('notifications');
                  }}
                  className="w-full text-center text-[13px] font-medium text-[#2383E2] hover:text-[#1a6fc0] py-2 transition-colors duration-150"
                >
                  View all notifications →
                </button>
              </div>
            )}
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
      className={`w-full text-left px-4 py-3 transition-colors duration-150 hover:bg-[#F7F7F5] ${
        notification.read ? 'bg-white' : 'bg-[#F7F7F5] border-l-2 border-l-[#2383E2]'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium leading-snug ${notification.read ? 'text-[#787774]' : 'text-[#37352F]'}`}>{notification.title}</p>
          <p className="text-[11px] text-[#787774] mt-0.5 capitalize">{notification.type.replace(/_/g, ' ')}</p>
          <p className="text-[11px] text-[#787774] mt-1">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
          {expanded && notification.message && (
            <div className="mt-2 p-2 bg-white border border-[#E9E9E7] rounded-[6px]">
              <p className="text-[12px] text-[#37352F] whitespace-pre-line">{notification.message}</p>
              {notification.relatedTo && (
                <p className="text-[11px] text-[#787774] mt-2 uppercase tracking-wide">
                  {notification.relatedTo.type} · {notification.relatedTo.id}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!notification.read && <span className="w-2 h-2 rounded-full bg-[#2383E2]" />}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-[#787774]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#787774]" />}
        </div>
      </div>
    </button>
  );
}