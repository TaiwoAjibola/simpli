import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Target, Clock, AlertTriangle, Gauge, CalendarDays, Users, Building, CheckSquare, Layers, FileText } from 'lucide-react';
import { computeExecutiveMetrics, RagStatus } from '../../utils/executiveMetrics';

const RAG_BADGE: Record<RagStatus, { label: string; dot: string; text: string; bg: string }> = {
  green: { label: 'On Track', dot: 'bg-[#0F7B6C]', text: 'text-[#0F7B6C]', bg: 'bg-[#E7F5F0] border-[#0F7B6C]/20' },
  amber: { label: 'At Risk', dot: 'bg-[#F59E0B]', text: 'text-[#B76E00]', bg: 'bg-[#FEF3E2] border-[#F59E0B]/20' },
  red: { label: 'Critical', dot: 'bg-[#EB5757]', text: 'text-[#EB5757]', bg: 'bg-[#FBE9E9] border-[#EB5757]/20' }
};

const safeDate = (d: any): Date | null => {
  if (!d) return null;
  const dt = d instanceof Date ? d : (typeof d.toDate === 'function' ? d.toDate() : new Date(d));
  return isNaN(dt.getTime()) ? null : dt;
};

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

export function ExecutiveAppDashboard({ appId, onNavigate }: { appId: string; onNavigate: (page: string, appId?: string) => void }) {
  const { apps, goals, phases, tasks, defects, employees, clients } = useApp();
  const app = apps.find(a => a.id === appId);

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-[#787774]">Application not found.</p>
          <button onClick={() => onNavigate('executive')} className="mt-3 px-4 py-2 bg-[#2383E2] text-white text-[14px] rounded-[6px]">Back to overview</button>
        </div>
      </div>
    );
  }

  const m = computeExecutiveMetrics({ app, goals, phases, tasks, defects });
  const rag = RAG_BADGE[m.health];
  const pm = employees.find(e => e.id === app.projectManagerId);
  const client = clients.find(c => c.id === app.clientId);
  const target = safeDate(app.expectedCompletionDate);

  const statusColor: Record<string, string> = {
    active: 'bg-[#E7F5F0] text-[#0F7B6C] border-[#0F7B6C]/20',
    completed: 'bg-[#E8F0FE] text-[#2383E2] border-[#2383E2]/20',
    on_hold: 'bg-[#FBE9E9] text-[#EB5757] border-[#EB5757]/20'
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>
      <div className="px-6 py-8">
        <button
          onClick={() => onNavigate('executive')}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#787774] hover:text-[#37352F] mb-4 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" /> Executive Overview
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F]">{app.name}</h1>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full border ${statusColor[app.status] || 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>{app.status}</span>
            </div>
            <p className="text-[14px] text-[#787774] mt-1 capitalize">{app.currentStage.replace('_', ' ')} stage</p>
            <div className="flex items-center gap-3 mt-2 text-[13px] text-[#787774] flex-wrap">
              {client && <span className="inline-flex items-center gap-1"><Building className="w-3.5 h-3.5" />{client.name}</span>}
              {pm && <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{pm.name}</span>}
              {target && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fmtDate(target)}</span>}
            </div>
          </div>
          <span className={`text-[13px] font-medium px-3 py-1.5 rounded-full border inline-flex items-center gap-2 ${rag.bg} ${rag.text}`}>
            <span className={`w-2 h-2 rounded-full ${rag.dot}`} />
            {rag.label}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard icon={<Target className="w-4 h-4" />} label="Goals" value={`${m.completedGoals}/${m.totalGoals}`} sub={`${m.goalCompletionPct}%`} />
          <KpiCard icon={<Layers className="w-4 h-4" />} label="Phases" value={`${m.completedPhases}/${m.totalPhases}`} sub={`${m.phaseCompletionPct}%`} />
          <KpiCard icon={<Gauge className="w-4 h-4" />} label="Milestone" value={`${m.goalCompletionPct}%`} sub="complete" />
          <KpiCard icon={<CalendarDays className="w-4 h-4" />} label="Target" value={m.daysToTarget !== null ? (m.daysToTarget < 0 ? `${Math.abs(m.daysToTarget)}d over` : `${m.daysToTarget}d`) : '—'} sub="to deadline" />
          <KpiCard icon={<CheckSquare className="w-4 h-4" />} label="Open Defects" value={`${m.totalOpenDefects}`} sub="all severities" />
          <KpiCard icon={<AlertTriangle className="w-4 h-4" />} label="Risks" value={`${m.riskBlockers + m.riskCritical}`} sub="blocker + critical" danger={(m.riskBlockers + m.riskCritical) > 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-5">
            <h3 className="text-[15px] font-semibold text-[#37352F] mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-[#787774]" /> Milestones & Goals</h3>
            {m.goalProgress.length === 0 ? (
              <p className="text-[13px] text-[#9B9A97]">No goals defined yet.</p>
            ) : (
              <div className="space-y-3">
                {m.goalProgress.map(g => {
                  const color = g.progressPct >= 70 ? 'bg-[#0F7B6C]' : g.progressPct >= 40 ? 'bg-[#F59E0B]' : 'bg-[#EB5757]';
                  return (
                    <div key={g.goalId}>
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="text-[#37352F] truncate pr-3">{g.name}</span>
                        <span className="text-[#787774] shrink-0">{g.progressPct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F7F7F5] rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${g.progressPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-5">
            <h3 className="text-[15px] font-semibold text-[#37352F] mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-[#787774]" /> Phases</h3>
            {phases.filter(p => p.appId === app.id).length === 0 ? (
              <p className="text-[13px] text-[#9B9A97]">No phases defined yet.</p>
            ) : (
              <div className="space-y-2">
                {phases.filter(p => p.appId === app.id).map(phase => {
                  const pc = phase.status === 'completed' ? 'bg-[#0F7B6C] text-[#0F7B6C]' : phase.status === 'in_progress' ? 'bg-[#2383E2] text-[#2383E2]' : phase.status === 'on_hold' ? 'bg-[#EB5757] text-[#EB5757]' : 'bg-[#9B9A97] text-[#9B9A97]';
                  return (
                    <div key={phase.id} className="flex items-center justify-between text-[13px]">
                      <span className="text-[#37352F] truncate pr-3">{phase.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#E9E9E7] capitalize ${pc}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.split(' ')[0]} mr-1.5`} />
                        {phase.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-5 mb-6">
          <h3 className="text-[15px] font-semibold text-[#37352F] mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#787774]" /> Risk Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RiskStat label="Blocker defects" value={m.riskBlockers} />
            <RiskStat label="Critical defects" value={m.riskCritical} />
            <RiskStat label="On-hold phases" value={m.riskOnHoldPhases} />
            <RiskStat label="Overdue goals" value={m.riskOverdueGoals} />
          </div>
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-5">
          <h3 className="text-[15px] font-semibold text-[#37352F] mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-[#787774]" /> Executive Summary</h3>
          {app.executiveSummary ? (
            <p className="text-[14px] text-[#37352F] leading-relaxed whitespace-pre-wrap">{app.executiveSummary}</p>
          ) : (
            <p className="text-[14px] text-[#9B9A97] italic">No executive summary has been provided yet. The internal team can add one from the application's "Executive" tab.</p>
          )}
          {app.executiveSummaryUpdatedAt && (
            <p className="text-[12px] text-[#787774] mt-3">
              Last updated {fmtDate(safeDate(app.executiveSummaryUpdatedAt))}{app.executiveSummaryUpdatedBy ? ` by ${app.executiveSummaryUpdatedBy}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, danger }: { icon: React.ReactNode; label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
      <div className="flex items-center gap-2 text-[#787774] mb-2">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className={`text-[20px] font-semibold leading-none ${danger ? 'text-[#EB5757]' : 'text-[#37352F]'}`}>{value}</p>
      <p className="text-[12px] text-[#9B9A97] mt-1">{sub}</p>
    </div>
  );
}

function RiskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-[#F7F7F5] rounded-[8px]">
      <p className={`text-[22px] font-semibold leading-none ${value > 0 ? 'text-[#EB5757]' : 'text-[#0F7B6C]'}`}>{value}</p>
      <p className="text-[12px] text-[#787774] mt-1">{label}</p>
    </div>
  );
}
