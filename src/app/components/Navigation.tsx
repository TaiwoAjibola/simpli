import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import SimpliLogo from '../assets/Simpli.svg';
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  LogOut,
  Zap,
  Briefcase,
  BarChart3,
  Bug,
  Menu,
  X,
  Rocket,
  LayoutTemplate,
  Plug,
  Clock,
  Sparkles,
  FolderKanban,
  CircleDot,
  ListTodo,
  ScrollText,
  Users,
  CalendarDays
} from 'lucide-react';
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
      label: 'Projects',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
        { id: 'my-work', label: 'My Work', icon: Briefcase, show: true },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays, show: true },
        { id: 'defects', label: 'Defects', icon: Bug, show: true },
        { id: 'action-points', label: 'Action Points', icon: CheckSquare, show: true },
        { id: 'sprints', label: 'Sprints', icon: Rocket, show: hasPermission('view_all_apps') },
        { id: 'repositories', label: 'Repositories', icon: FolderKanban, show: hasPermission('view_all_apps') },
        { id: 'integrations', label: 'Integrations', icon: Plug, show: hasPermission('view_all_apps') }
      ]
    },
    {
      label: 'Management',
      items: [
        { id: 'portfolio', label: 'Portfolio', icon: BarChart3, show: hasPermission('view_all_apps') },
        { id: 'clients', label: 'Clients', icon: Users, show: hasPermission('view_all_apps') },
        { id: 'milestones', label: 'Milestones', icon: Target, show: hasPermission('view_all_apps') },
        { id: 'tasks', label: 'Tasks', icon: ListTodo, show: hasPermission('view_all_apps') },
        { id: 'templates', label: 'Work Templates', icon: LayoutTemplate, show: hasPermission('view_all_apps') },
        { id: 'automations', label: 'Automations', icon: Zap, show: hasPermission('view_all_apps') }
      ]
    },
    {
      label: 'Settings',
      items: [
        { id: 'admin', label: 'Admin Panel', icon: Clock, show: hasPermission('manage_users') },
        { id: 'logs', label: 'System Logs', icon: ScrollText, show: hasPermission('manage_users') }
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-[#4C1D95]" /> : <Menu className="w-5 h-5 text-[#4C1D95]" />}
      </button>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`h-screen w-64 bg-white border-r border-[#E9D5FF] flex flex-col fixed lg:static z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-[#E9D5FF]">
          <div className="flex items-center justify-between gap-3 group">
            <div className="flex items-center gap-3">
              <img src={SimpliLogo} alt="Simpli" className="w-10 h-10" />
              <div>
                <h1 className="font-bold text-lg text-[#4C1D95] tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>Simpli</h1>
                <p className="text-xs text-[#6D28D9] uppercase tracking-wider">{currentRole?.name}</p>
              </div>
            </div>
            <NotificationInbox />
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navSections.map((section, si) => {
            const visibleItems = section.items.filter(item => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label} className={`mb-6 stagger-in`} style={{ animationDelay: `${si * 90}ms` }}>
                <p className="text-xs font-semibold text-[#6D28D9]/60 uppercase tracking-wider mb-2 px-4">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item, ii) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`group w-full flex items-center gap-3 px-3 py-2 nav-item rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'is-active bg-[#F3E8FF] font-medium text-[#7C3AED]'
                            : 'text-[#6D28D9]/70 hover:text-[#4C1D95] hover:bg-[#F5F3FF]'
                        }`}
                        style={{ animationDelay: `${si * 90 + ii * 40}ms` }}
                      >
                        <span className={`nav-icon-tile rounded-lg ${isActive ? 'bg-[#7C3AED]/15' : 'bg-[#F5F3FF]'}`}>
                          <Icon className={`w-[18px] h-[18px] transition-transform ${isActive ? 'text-[#7C3AED]' : 'text-[#6D28D9]/50'}`} />
                        </span>
                        <span>{item.label}</span>
                        {isActive && <CircleDot className="w-2 h-2 text-[#7C3AED] ml-auto animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E9D5FF]">
          <div className="flex items-center gap-3 mb-1 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#F97316] flex items-center justify-center text-white font-bold rounded-full">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#4C1D95] truncate">{currentUser?.name}</p>
              <p className="text-xs text-[#6D28D9] truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#DC2626] hover:bg-[rgba(220,38,38,0.05)] transition rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}