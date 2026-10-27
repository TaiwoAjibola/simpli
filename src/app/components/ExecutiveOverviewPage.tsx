import React from 'react';
import { useApp } from '../context/AppContext';
import { Gauge, Target, Clock, AlertTriangle, ChevronRight, CalendarDays, Users, Building } from 'lucide-react';
import { computeExecutiveMetrics, truncateSummary, RagStatus } from '../../utils/executiveMetrics';

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

export function ExecutiveOverviewPage({ onNavigate }: { onNavigate: (page: string, appId?: string) => void }) {
  const { apps, goals, phases, tasks, defects, employees, clients } = useApp();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, ui-sans-serif, sans-serif' }}>
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F] flex items-center gap-2">
            <Gauge className="w-6 h-6 text-[#2383E2]" />
            Executive Overview
          </h1>
          <p className="text-[14px] text-[#787774] mt-1">High-level status across all applications</p>
        </div>

        {apps.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <p className="text-[14px] text-[#787774]">No applications to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {apps.map(app => {
              const m = computeExecutiveMetrics({ app, goals, phases, tasks, defects });
              const rag = RAG_BADGE[m.health];
              const pm = employees.find(e => e.id === app.projectManagerId);
              const client = clients.find(c => c.id === app.clientId);
              const target = safeDate(app.expectedCompletionDate);
              return (
                <button
                  key={app.id}
                  onClick={() => onNavigate('executive-app', app.id)}
                  className="text-left bg-white border border-[#E9E9E7] rounded-[8px] p-5 hover:border-[#2383E2] hover:shadow-sm transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-[#37352F] truncate">{app.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-[12px] text-[#787774] flex-wrap">
                        {client && <span className="inline-flex items-center gap-1"><Building className="w-3 h-3" />{client.name}</span>}
                        {pm && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{pm.name}</span>}
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-full border inline-flex items-center gap-1.5 ${rag.bg} ${rag.text} shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rag.dot}`} />
                      {rag.label}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <MetricBar label="Goals" pct={m.goalCompletionPct} detail={`${m.completedGoals}/${m.totalGoals}`} />
                    <MetricBar label="Phases" pct={m.phaseCompletionPct} detail={`${m.completedPhases}/${m.totalPhases}`} />
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-[12px] text-[#787774]">
                    {target ? (
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />
                        {m.daysToTarget !== null && m.daysToTarget < 0
                          ? `${Math.abs(m.daysToTarget)}d overdue`
                          : `${m.daysToTarget}d left`}
                      </span>
                    ) : (
                      <span>No target date</span>
                    )}
                    {m.riskBlockers + m.riskCritical > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#EB5757]">
                        <AlertTriangle className="w-3 h-3" />
                        {m.riskBlockers + m.riskCritical} risk{m.riskBlockers + m.riskCritical > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {app.executiveSummary ? (
                    <p className="text-[12px] text-[#787774] mt-3 line-clamp-2 leading-relaxed">{truncateSummary(app.executiveSummary, 140)}</p>
                  ) : (
                    <p className="text-[12px] text-[#9B9A97] mt-3 italic">No executive summary yet</p>
                  )}

                  <span className="inline-flex items-center gap-1 text-[12px] text-[#2383E2] mt-3 font-medium group-hover:gap-2 transition-all duration-150">
                    View dashboard <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const color = pct >= 70 ? 'bg-[#0F7B6C]' : pct >= 40 ? 'bg-[#F59E0B]' : 'bg-[#EB5757]';
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className="text-[#787774]">{label}</span>
        <span className="text-[#37352F] font-medium">{detail} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-[#F7F7F5] rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-150`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
