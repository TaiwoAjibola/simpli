import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Kanban,
  Layers,
  Target,
  Flag,
  CheckSquare,
  LogOut,
  Zap,
  Briefcase,
  Activity
} from 'lucide-react';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { currentUser, currentRole, logout, hasPermission } = useAuth();
  const { notifications } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'my-work', label: 'My Work', icon: Briefcase, show: true },
    { id: 'kanban', label: 'Kanban Board', icon: Kanban, show: true },
    { id: 'activities', label: 'Activities', icon: Activity, show: true },
    { id: 'apps', label: 'Apps', icon: Layers, show: hasPermission('view_all_apps') },
    { id: 'goals', label: 'Goals', icon: Target, show: hasPermission('view_all_apps') },
    { id: 'milestones', label: 'Milestones', icon: Flag, show: hasPermission('view_all_apps') },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, show: hasPermission('view_all_apps') },
    { id: 'admin', label: 'Admin Panel', icon: Zap, show: hasPermission('manage_users') }
  ];

  return (
    <div className="h-screen w-64 bg-[#0e0e16] border-r border-[rgba(0,229,255,0.1)] flex flex-col">
      <div className="p-6 border-b border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-[#00e5ff] clip-hexagon flex items-center justify-center">
              <span className="text-[#0a0a0f] font-bold text-lg">S</span>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#f0f0f5] tracking-wide">Simpli</h1>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wider">{currentRole?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] font-medium border-l-2 border-[#00e5ff]'
                    : 'text-[#6b6b80] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.id === 'my-work' && unreadCount > 0 && (
                  <span className="ml-auto bg-[#ff006e] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[#f0f0f5] truncate">{currentUser?.name}</p>
            <p className="text-xs text-[#6b6b80] truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
