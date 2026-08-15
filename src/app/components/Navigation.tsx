import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Kanban,
  Layers,
  Target,
  CheckSquare,
  LogOut,
  Zap,
  Briefcase,
  BarChart3,
  Bug,
  Menu,
  X,
  ShieldCheck,
  Rocket,
  LayoutTemplate,
  Plug,
  Clock
} from 'lucide-react';
import SimpliLogo from '../assets/Simpli.svg';
import { NotificationInbox } from './NotificationInbox';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { currentUser, currentRole, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
        { id: 'my-work', label: 'My Work', icon: Briefcase, show: true },
        { id: 'kanban', label: 'Board', icon: Kanban, show: true },
        { id: 'defects', label: 'Defects', icon: Bug, show: true },
        { id: 'action-points', label: 'Action Points', icon: CheckSquare, show: true },
        { id: 'sprints', label: 'Sprints', icon: Rocket, show: hasPermission('view_all_apps') },
        { id: 'portfolio', label: 'Portfolio', icon: BarChart3, show: hasPermission('view_all_apps') },
        { id: 'repositories', label: 'Repositories', icon: Layers, show: hasPermission('view_all_apps') },
        { id: 'integrations', label: 'Integrations', icon: Plug, show: hasPermission('view_all_apps') },
        { id: 'insights', label: 'Insights', icon: BarChart3, show: true },
        { id: 'gate-review', label: 'Gate Review', icon: ShieldCheck, show: true }
      ]
    },
    {
      label: 'Management',
      items: [
        { id: 'apps', label: 'Applications', icon: Layers, show: hasPermission('view_all_apps') },
        { id: 'goals', label: 'Goals', icon: Target, show: hasPermission('view_all_apps') },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, show: hasPermission('view_all_apps') },
        { id: 'templates', label: 'Work Templates', icon: LayoutTemplate, show: hasPermission('view_all_apps') },
        { id: 'automations', label: 'Automations', icon: Zap, show: hasPermission('view_all_apps') }
      ]
    },
    {
      label: 'Settings',
      items: [
        { id: 'admin', label: 'Admin Panel', icon: Clock, show: hasPermission('manage_users') }
      ]
    }
  ];

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)]"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-[#f0f0f5]" /> : <Menu className="w-5 h-5 text-[#f0f0f5]" />}
      </button>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`h-screen w-64 bg-[#0e0e16] border-r border-[rgba(0,229,255,0.1)] flex flex-col fixed lg:static z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
      <div className="p-6 border-b border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center gap-3">
          <img src={SimpliLogo} alt="Simpli" className="w-10 h-10" />
          <div>
            <h1 className="font-bold text-lg text-[#f0f0f5] tracking-wide">Simpli</h1>
            <p className="text-xs text-[#6b6b80] uppercase tracking-wider">{currentRole?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-6">
              <p className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-2 px-4">
                {section.label}
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${
                        isActive
                          ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] font-medium border-l-2 border-[#00e5ff]'
                          : 'text-[#6b6b80] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.03)]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center gap-3 mb-1 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-[#f0f0f5] truncate">{currentUser?.name}</p>
            <p className="text-xs text-[#6b6b80] truncate">{currentUser?.email}</p>
          </div>
          <NotificationInbox />
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
    </>
  );
}
