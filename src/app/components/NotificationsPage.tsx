import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCheck,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Marking,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Mail,
  Github,
  AlertTriangle,
  MessageCircle,
  Calendar,
  Target,
  Folder,
  Users,
  Activity,
  FilterX
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
      case 'task_approved': case 'task_completed': return <CheckCircle className="w-5 h-5 text-[#7C3AED]" />;
      case 'defect_assigned': return <AlertCircle className="w-5 h-5 text-[#ff3b5c]" />;
      case 'goal_created': return <Target className="w-5 h-5 text-[#7C3AED]" />;
      case 'task_assigned': return <Users className="w-5 h-5 text-[#3B82F6]" />;
      case 'mention': return <MessageCircle className="w-5 h-5 text-[#F59E0B]" />;
      default: return <Bell className="w-5 h-5 text-[#6D28D9]" />;
    }
  };

  const getTypeLabel = () => {
    return notification.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  return (
    <button
      onClick={() => {
        if (!notification.read) onRead();
        setExpanded(!expanded);
      }}
      className={`w-full text-left p-4 rounded-xl transition ${
        notification.read
          ? 'bg-[#FAF5FF] opacity-70'
          : 'bg-white border border-[rgba(124,58,237,0.1)]'
      } hover:border-[#7C3AED]/20`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${notification.read ? 'text-[#94A3B8]' : 'text-[#4C1D95]'}`}>
                  {notification.title}
                </p>
                {!notification.read && <span className="w-2 h-2 bg-[#7C3AED] rounded-full flex-shrink-0" />}
              </div>
              <p className="text-xs text-[#6D28D9] mt-0.5">{getTypeLabel()}</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />}
              {expanded ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
            </div>
          </div>
          {expanded && notification.message && (
            <div className="mt-3 p-3 bg-[#F5F3FF] border border-[#E9D5FF] rounded-lg">
              <p className="text-sm text-[#4C1D95] whitespace-pre-line">{notification.message}</p>
              {notification.relatedTo && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-[rgba(124,58,237,0.1)] text-[#7C3AED] rounded">
                    {notification.relatedTo.type}
                  </span>
                  <span className="text-xs text-[#6D28D9]">{notification.relatedTo.id}</span>
                </div>
              )}
            </div>
          )}
          {expanded && (
            <div className="flex items-center gap-2 mt-3">
              <button className="text-xs text-[#94A3B8] hover:text-[#6D28D9] flex items-center gap-1">
                <Archive className="w-3 h-3" /> Archive
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
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
    { label: 'Total', value: mine.length, icon: Bell, color: '#7C3AED' },
    { label: 'Unread', value: unread.length, icon: AlertCircle, color: '#22C55E' },
    { label: 'Read', value: readNotifications.length, icon: CheckCircle, color: '#94A3B8' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Notifications</h1>
          <p className="text-[#6D28D9] mt-1">{unread.length} unread · {mine.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              onClick={() => markAllNotificationsRead(currentUser.id)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium text-sm hover:bg-[#6D28D9] rounded-xl"
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
            <div key={stat.label} className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#4C1D95]">{stat.value}</p>
                  <p className="text-sm text-[#6D28D9]">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center bg-white border border-[#E9D5FF] rounded-xl p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'read', label: 'Read' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as NotificationFilter)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                filter === tab.key
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#6D28D9] hover:text-[#4C1D95]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as NotificationType)}
          className="px-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
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
          <div className="glass-card rounded-xl p-12 text-center">
            <Bell className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
            <p className="text-[#6D28D9] text-lg">No notifications found</p>
            <p className="text-sm text-[#94A3B8] mt-1">Try adjusting your filters or search query</p>
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
  );
}