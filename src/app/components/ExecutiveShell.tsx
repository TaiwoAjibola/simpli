import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gauge, LogOut, ArrowLeft } from 'lucide-react';
import SimpliLogo from '../assets/Simpli.svg';
import { ExecutiveOverviewPage } from './ExecutiveOverviewPage';
import { ExecutiveAppDashboard } from './ExecutiveAppDashboard';

export function ExecutiveShell() {
  const { currentUser, logout } = useAuth();
  const [page, setPage] = useState<'overview' | 'app'>('overview');
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  const handleNavigate = (p: string, appId?: string) => {
    if (p === 'executive-app' && appId) {
      setSelectedAppId(appId);
      setPage('app');
    } else {
      setPage('overview');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white" style={{ fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>
      <header className="h-14 flex items-center justify-between px-6 border-b border-[#E9E9E7] bg-[#FBFBFA] shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={SimpliLogo} alt="Simpli" className="w-6 h-6" />
          <div>
            <h1 className="font-semibold text-[14px] text-[#37352F] leading-none">Simpli</h1>
            <p className="text-[11px] text-[#787774] mt-0.5">Executive View</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#787774] hidden sm:inline">{currentUser?.name}</span>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#787774] border border-[#E9E9E7] rounded-[6px] hover:bg-white hover:text-[#37352F] transition-colors duration-150"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      {page === 'app' && (
        <button
          onClick={() => handleNavigate('executive')}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#787774] hover:text-[#37352F] px-6 pt-4 transition-colors duration-150"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> <Gauge className="w-3.5 h-3.5" /> All applications
        </button>
      )}

      <main className="flex-1 overflow-y-auto">
        {page === 'overview' ? (
          <ExecutiveOverviewPage onNavigate={handleNavigate} />
        ) : (
          <ExecutiveAppDashboard appId={selectedAppId} onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
}
