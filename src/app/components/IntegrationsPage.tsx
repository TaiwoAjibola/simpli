import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Plug, Github, Mail, Calendar as CalendarIcon, MessageSquare, HardDrive, CheckCircle, Loader, XCircle } from 'lucide-react';
import { INTEGRATIONS, integrationStatusOf, IntegrationStatus } from '../../utils/integrations';

const ICONS: Record<string, any> = {
  github: Github,
  calendar: CalendarIcon,
  slack: MessageSquare,
  drive: HardDrive,
  email: Mail
};

const STATUS_STYLES: Record<IntegrationStatus, string> = {
  connected: 'bg-[rgba(16,185,129,0.12)] text-[#10b981]',
  configured: 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b]',
  error: 'bg-[rgba(239,68,68,0.12)] text-[#ef4444]'
};

export function IntegrationsPage() {
  const { repositories } = useApp();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const connectedRepos = repositories.filter(r => r.connectionStatus === 'connected').length;

  const handleConnect = async (type: string) => {
    setBusy(type);
    try {
      const def = INTEGRATIONS.find(i => i.type === type)!;
      if (def.implementation === 'stub') {
        showToast({ type: 'info', title: `${def.name}`, message: 'This integration is planned but not yet implemented.' });
        return;
      }
      await def.connect();
      showToast({ type: 'success', title: `${def.name}`, message: 'Integration works.' });
    } catch (e) {
      showToast({ type: 'error', title: 'Integration failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5] flex items-center gap-2">
          <Plug className="w-6 h-6 text-[#00e5ff]" />
          Integrations
        </h1>
        <p className="text-sm text-[#6b6b80] mt-1">Connect Simpli to external tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(def => {
          const Icon = ICONS[def.type] || Plug;
          const status = integrationStatusOf(def.type, connectedRepos);
          return (
            <div key={def.type} className="bg-[#161b22] border border-[rgba(0,229,255,0.1)] p-5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0d1117] border border-[rgba(0,229,255,0.1)] rounded flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#00e5ff]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#f0f0f5]">{def.name}</h3>
                    <p className="text-xs text-[#6b6b80] mt-0.5">{def.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_STYLES[status]}`}>
                  {status}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-[#6b6b80]">
                  {def.implementation === 'real'
                    ? <CheckCircle className="w-3 h-3 text-[#10b981]" />
                    : <XCircle className="w-3 h-3 text-[#6b6b80]" />}
                  {def.implementation === 'real' ? 'Implemented' : 'Planned'}
                </span>
                {def.type === 'github' && connectedRepos > 0 && (
                  <span className="text-xs text-[#6b6b80]">{connectedRepos} repo{connectedRepos === 1 ? '' : 's'} connected</span>
                )}
                <button
                  onClick={() => handleConnect(def.type)}
                  disabled={busy === def.type}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm bg-[rgba(0,229,255,0.1)] text-[#00e5ff] hover:bg-[rgba(0,229,255,0.2)] rounded disabled:opacity-50"
                >
                  {busy === def.type ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {status === 'connected' && def.type !== 'email' ? 'Re-test' : 'Test'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}