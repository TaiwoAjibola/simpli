import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, HeartPulse, ArrowUpRight } from 'lucide-react';
import { computeAppHealth } from '../../utils/portfolio';
import { App } from '../types';

const LEVEL_STYLES: Record<string, string> = {
  healthy: 'text-[#10b981] bg-[rgba(16,185,129,0.12)]',
  at_risk: 'text-[#f59e0b] bg-[rgba(245,158,11,0.12)]',
  critical: 'text-[#ef4444] bg-[rgba(239,68,68,0.12)]'
};

export function PortfolioPage({ onNavigate }: { onNavigate?: (page: string, appId?: string) => void }) {
  const { apps, goals, tasks, defects, workDependencies, phases } = useApp();

  const rows = apps.map((app: App) => {
    const appGoalIds = goals.filter(g => g.appId === app.id).map(g => g.id);
    const appTasks = tasks.filter(t => appGoalIds.includes(t.goalId));
    const appDefects = defects.filter(d => d.applicationId === app.id);
    const blockedByDeps = workDependencies.filter(d => {
      const workInApp = (kind: string, wid: string) =>
        (kind === 'defect' ? appDefects.some(dd => dd.id === wid) : appTasks.some(tt => tt.id === wid));
      return d.type === 'blocked_by' && workInApp(d.toKind, d.toId);
    });
    const health = computeAppHealth({
      tasks: appTasks,
      defects: appDefects,
      blockedCount: blockedByDeps.length
    });
    const appPhases = phases.filter(p => p.appId === app.id);
    const currentPhase = appPhases.find(p => p.status === 'in_progress') || appPhases[0];
    return { app, health, currentPhase, appTaskCount: appTasks.length, appDefectCount: appDefects.length };
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0f0f5] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#00e5ff]" />
          Portfolio
        </h1>
        <p className="text-sm text-[#6b6b80] mt-1">Health snapshot of all applications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rows.map(({ app, health, currentPhase }) => (
          <button
            key={app.id}
            onClick={() => onNavigate?.('app-details', app.id)}
            className="text-left bg-[#161b22] border border-[rgba(0,229,255,0.1)] p-5 rounded-lg hover:border-[#00e5ff] transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-[#f0f0f5]">{app.name}</h3>
                <p className="text-xs text-[#6b6b80] mt-1 capitalize">
                  {app.status.replace('_', ' ')}
                  {currentPhase ? ` · ${currentPhase.name}` : ''}
                </p>
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${LEVEL_STYLES[health.level]}`}>
                {health.level.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[#0d1117] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${health.level === 'healthy' ? 'bg-[#10b981]' : health.level === 'at_risk' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                    style={{ width: `${health.score}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-[#f0f0f5]">{health.score}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#6b6b80]">
              <span>Open tasks: <span className="text-[#f0f0f5]">{health.openTasks}</span></span>
              <span>Overdue: <span className="text-[#f59e0b]">{health.overdueTasks}</span></span>
              <span>Open defects: <span className="text-[#f0f0f5]">{health.openDefects}</span></span>
              <span>Pending QA: <span className="text-[#8b5cf6]">{health.qaPending}</span></span>
              <span>Blocked: <span className="text-[#ef4444]">{health.blocked}</span></span>
              <span>Critical: <span className="text-[#ef4444]">{health.criticalDefects}</span></span>
            </div>

            <div className="mt-4 flex items-center gap-1 text-xs text-[#00e5ff] opacity-0 group-hover:opacity-100 transition">
              View app details <ArrowUpRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-[#161b22] border border-[rgba(0,229,255,0.1)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6b6b80] border-b border-[rgba(0,229,255,0.1)]">
              <th className="px-4 py-3 font-medium">Application</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Defects</th>
              <th className="px-4 py-3 font-medium">QA Pending</th>
              <th className="px-4 py-3 font-medium">Blocked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, health }) => (
              <tr key={app.id} className="border-b border-[rgba(0,229,255,0.05)] last:border-0 hover:bg-[rgba(0,229,255,0.03)]">
                <td className="px-4 py-3 text-[#f0f0f5]">{app.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${LEVEL_STYLES[health.level]}`}>
                    <HeartPulse className="w-3 h-3" />
                    {health.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#c0c0d0]">{health.openTasks}</td>
                <td className="px-4 py-3 text-[#c0c0d0]">{health.openDefects}</td>
                <td className="px-4 py-3 text-[#8b5cf6]">{health.qaPending}</td>
                <td className="px-4 py-3 text-[#ef4444]">{health.blocked}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-[#6b6b80] p-4">No applications yet.</p>}
      </div>
    </div>
  );
}