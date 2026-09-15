import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import SimpliLogo from '../assets/Simpli.svg';
import {
  LayoutDashboard,
  Briefcase,
  FolderKanban,
  ListTodo,
  Bug,
  CheckSquare,
  CalendarDays,
  Users,
  FileText,
  Target,
  BarChart3,
  Clock,
  ScrollText,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { NotificationInbox } from './NotificationInbox';

type NavigationProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { currentUser, currentRole, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'my-work', label: 'My Work', icon: Briefcase, show: true },
    { id: 'projects', label: 'Projects', icon: FolderKanban, show: true },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, show: true },
    { id: 'defects', label: 'Defects', icon: Bug, show: true },
    { id: 'action-points', label: 'Action Points', icon: CheckSquare, show: true },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, show: true },
    { id: 'clients', label: 'Clients', icon: Users, show: true },
    { id: 'documents', label: 'Documents & Files', icon: FileText, show: true },
    { id: 'milestones', label: 'Milestones', icon: Target, show: true },
    { id: 'reports', label: 'Reports', icon: BarChart3, show: true },
    { id: 'admin', label: 'Settings / Administration', icon: Clock, show: true },
    { id: 'logs', label: 'System Logs', icon: ScrollText, show: true }
  ];

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-[#E9E9E7] rounded-md"
      >
        {sidebarOpen ? <X className="w-4 h-4 text-[#37352F]" /> : <Menu className="w-4 h-4 text-[#37352F]" />}
      </button>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`h-screen w-64 bg-[#FBFBFA] border-r border-[#E9E9E7] flex flex-col fixed lg:static z-40 transition-transform duration-150 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-[#E9E9E7]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img src={SimpliLogo} alt="Simpli" className="w-7 h-7" />
              <div>
                <h1 className="font-semibold text-[14px] text-[#37352F] tracking-tight">Simpli</h1>
                <p className="text-xs text-[#787774]">{currentRole?.name}</p>
              </div>
            </div>
            <NotificationInbox onNavigate={onNavigate} />
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 nav-item text-[14px] ${
                    isActive ? 'is-active' : ''
                  }`}
                >
                  <span className="nav-icon-tile">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#37352F]' : 'text-[#787774]'}`} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-[#E9E9E7]">
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-7 h-7 bg-[#37352F] flex items-center justify-center text-white font-medium rounded-full text-xs">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#37352F] truncate leading-tight">{currentUser?.name}</p>
              <p className="text-xs text-[#787774] truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] transition rounded-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
