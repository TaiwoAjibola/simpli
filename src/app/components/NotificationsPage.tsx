import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Target,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../types';

type NotificationFilter = 'all' | 'unread' | 'read';
type NotificationType = 'all' | 'task' | 'defect' | 'goal' | 'system' | 'mention';

function NotificationRow({ notification, onRead }: {
  notification: Notification;
  onRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'task_approved': case 'task_completed': return <CheckCircle className="w-5 h-5 text-[#787774]" />;
      case 'defect_assigned': return <AlertCircle className="w-5 h-5 text-[#787774]" />;
      case 'goal_created': return <Target className="w-5 h-5 text-[#787774]" />;
      case 'task_assigned': return <Bell className="w-5 h-5 text-[#2383E2]" />;
      case 'mention': return <MessageCircle className="w-5 h-5 text-[#787774]" />;
      default: return <Bell className="w-5 h-5 text-[#787774]" />;
    }
  };

  const getTypeLabel = () => {
    return notification.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  return (
    <div
      onClick={() => {
        if (!notification.read) onRead();
        setExpanded(!expanded);
      }}
      className={`w-full text-left p-4 rounded-[8px] border transition-colors duration-150 cursor-pointer ${
        notification.read
          ? 'bg-white border-[#E9E9E7] hover:bg-[#F7F7F5]'
          : 'bg-[#F7F7F5] border-[#E9E9E7] border-l-2 border-l-[#2383E2] hover:bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-[14px] font-medium ${notification.read ? 'text-[#787774]' : 'text-[#37352F]'}`}>
                  {notification.title}
                </p>
                {!notification.read && <span className="w-2 h-2 bg-[#2383E2] rounded-full flex-shrink-0" />}
              </div>
              <p className="text-[12px] text-[#787774] mt-0.5">{getTypeLabel()}</p>
              <p className="text-[12px] text-[#787774] mt-1">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && <span className="w-2 h-2 rounded-full bg-[#2383E2]" />}
              {expanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
            </div>
          </div>
          {expanded && notification.message && (
            <div className="mt-3 p-3 bg-white border border-[#E9E9E7] rounded-[6px]">
              <p className="text-[13px] text-[#37352F] whitespace-pre-line">{notification.message}</p>
              {notification.relatedTo && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] px-2 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] rounded-[4px]">
                    {notification.relatedTo.type}
                  </span>
                  <span className="text-[12px] text-[#787774]">{notification.relatedTo.id}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const { currentUser } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) return null;

  const mine = notifications.filter(n => !n.recipientId || n.recipientId === currentUser.id);
  const unread = mine.filter(n => !n.read);
  const readNotifications = mine.filter(n => n.read);

  const filteredNotifications = mine.filter(n => {
    const matchesFilter = filter === 'all' || (filter === 'unread' && !n.read) || (filter === 'read' && n.read);
    const matchesType = typeFilter === 'all' || n.type.includes(typeFilter);
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesType && matchesSearch;
  });

  const stats = [
    { label: 'Total', value: mine.length, icon: Bell },
    { label: 'Unread', value: unread.length, icon: AlertCircle },
    { label: 'Read', value: readNotifications.length, icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">Notifications</h1>
            <p className="text-[14px] text-[#787774] mt-1">{unread.length} unread · {mine.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={() => markAllNotificationsRead(currentUser.id)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-[13px] hover:bg-[#1a6fc0] rounded-[6px] transition-colors duration-150"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7]">
                    <Icon className="w-5 h-5 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[22px] font-semibold text-[#37352F]">{stat.value}</p>
                    <p className="text-[13px] text-[#787774]">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] text-[14px] placeholder:text-[#787774] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
            />
          </div>
          <div className="flex items-center bg-white border border-[#E9E9E7] rounded-[6px] p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as NotificationFilter)}
                className={`px-3 py-1.5 text-[13px] font-medium rounded-[4px] transition-colors duration-150 ${
                  filter === tab.key
                    ? 'bg-[#37352F] text-white'
                    : 'text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType)}
            className="px-4 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] text-[13px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="defect">Defects</option>
            <option value="goal">Goals</option>
            <option value="system">System</option>
            <option value="mention">Mentions</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-12 text-center">
              <Bell className="w-10 h-10 text-[#787774] mx-auto mb-3" />
              <p className="text-[#37352F] text-[14px] font-medium">No notifications found</p>
              <p className="text-[13px] text-[#787774] mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
                <NotificationRow
                key={notification.id}
                notification={notification}
                onRead={() => markNotificationRead(notification.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}