import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Diamond
} from 'lucide-react';
import {
  format,
  startOfQuarter,
  endOfQuarter,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  isPast,
  isWithinInterval,
  max,
  min
} from 'date-fns';

const stageConfig = {
  'pre-development': { label: 'Pre-Development', color: 'border-l-[#3b82f6]', headerBg: 'bg-[rgba(59,130,246,0.08)]', badge: 'bg-[#3b82f6]' },
  'development': { label: 'Development', color: 'border-l-[#10b981]', headerBg: 'bg-[rgba(16,185,129,0.08)]', badge: 'bg-[#10b981]' },
  'post-development': { label: 'Post-Development', color: 'border-l-[#8b5cf6]', headerBg: 'bg-[rgba(139,92,246,0.08)]', badge: 'bg-[#8b5cf6]' }
};

const statusColors: Record<string, string> = {
  not_started: '#6b6b80',
  in_progress: '#00e5ff',
  blocked: '#ff3b5c',
  completed: '#8b5cf6',
  approved: '#10b981'
};

export function TimelinePage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { apps, phases, goals, tasks, modules, expectations } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMilestonesOnly, setShowMilestonesOnly] = useState(false);

  const qStart = startOfQuarter(currentDate);
  const qEnd = endOfQuarter(currentDate);
  const totalDays = differenceInDays(qEnd, qStart) + 1;

  const months = eachMonthOfInterval({ start: qStart, end: qEnd });

  const selectedApp = apps.find(a => a.id === selectedAppId);

  const appPhases = useMemo(() => {
    if (!selectedAppId) return [];
    return phases
      .filter(p => p.appId === selectedAppId)
      .sort((a, b) => {
        const stageOrder = { 'pre-development': 0, 'development': 1, 'post-development': 2 };
        const sa = stageOrder[a.stage], sb = stageOrder[b.stage];
        if (sa !== sb) return sa - sb;
        return (a.startDate?.getTime() || 0) - (b.startDate?.getTime() || 0);
      });
  }, [phases, selectedAppId]);

  const appModules = useMemo(() => {
    if (!selectedAppId) return [];
    return modules.filter(m => m.appId === selectedAppId && m.targetDate);
  }, [modules, selectedAppId]);

  const getDateLeft = (d: Date) => {
    const offset = differenceInDays(d, qStart);
    return `${Math.max(0, (offset / totalDays) * 100)}%`;
  };

  const getBarStyle = (start?: Date, end?: Date, fillPct?: number) => {
    if (!start) return { left: '0%', width: '0%' };
    const s = differenceInDays(start, qStart);
    const e = end ? differenceInDays(end, qStart) : s + 14;
    const left = Math.max(0, (s / totalDays) * 100);
    const width = Math.max(1, ((e - s + 1) / totalDays) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  const prevQuarter = () => setCurrentDate(subMonths(currentDate, 3));
  const nextQuarter = () => setCurrentDate(addMonths(currentDate, 3));
  const goToToday = () => setCurrentDate(new Date());

  if (!selectedApp) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Goal Timeline</h1>
            <p className="text-[#6b6b80]">Phase-swimlane view of goals, milestones, and progress by quarter</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}
              className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm">
              <option value="">Select app...</option>
              {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Calendar className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80]">Select an app to view the goal timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-[#00e5ff]" />
            <h1 className="text-3xl font-bold text-[#f0f0f5]">Goal Timeline</h1>
          </div>
          <p className="text-[#6b6b80]">Phase-swimlane view of goals, milestones, and progress by quarter</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm">
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            onClick={() => setShowMilestonesOnly(!showMilestonesOnly)}
            className={`px-3 py-2 text-sm border ${showMilestonesOnly ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border-[#00e5ff]' : 'bg-[#12121a] text-[#6b6b80] border-[rgba(0,229,255,0.1)]'}`}
          >
            <Diamond className="w-3.5 h-3.5 inline mr-1" />
            Milestones
          </button>
        </div>
      </div>

      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,229,255,0.1)]">
          <button onClick={prevQuarter} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
            <ChevronLeft className="w-5 h-5 text-[#f0f0f5]" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#f0f0f5]">
              {format(qStart, 'MMM yyyy')} - {format(qEnd, 'MMM yyyy')}
            </h2>
            <button onClick={goToToday}
              className="px-3 py-1 text-sm bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.2)]">
              Today
            </button>
          </div>
          <button onClick={nextQuarter} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
            <ChevronRight className="w-5 h-5 text-[#f0f0f5]" />
          </button>
        </div>

        <div className="flex">
          <div className="w-56 flex-shrink-0 border-r border-[rgba(0,229,255,0.1)]">
            <div className="h-10 border-b border-[rgba(0,229,255,0.1)]" />
            {months.map(m => (
              <div key={m.toISOString()} className="h-10 border-b border-[rgba(0,229,255,0.05)] flex items-center px-3">
                <span className="text-xs font-medium text-[#6b6b80]">{format(m, 'MMMM')}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex h-10 border-b border-[rgba(0,229,255,0.1)] relative">
                {months.map(m => {
                  const mStart = startOfMonth(m);
                  const mEnd = endOfMonth(m);
                  const left = getDateLeft(mStart);
                  const width = getDateLeft(mEnd);
                  return (
                    <div key={m.toISOString()} className="absolute top-0 bottom-0 border-r border-[rgba(0,229,255,0.1)]"
                      style={{ left, width }}>
                      <span className="text-[10px] text-[#6b6b80] px-1">{format(m, 'MMM')}</span>
                    </div>
                  );
                })}
              </div>

              <div className="divide-y divide-[rgba(0,229,255,0.05)]">
                {appPhases.length === 0 && (
                  <div className="p-12 text-center">
                    <Layers className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
                    <p className="text-[#6b6b80]">No phases defined for this app</p>
                  </div>
                )}
                {appPhases.map(phase => {
                  const phaseGoals = goals.filter(g => g.phaseId === phase.id);
                  const goalIds = new Set(phaseGoals.map(g => g.id));
                  const phaseTasks = tasks.filter(t => t.goalId && goalIds.has(t.goalId));
                  const totalTasks = phaseTasks.length;
                  const doneTasks = phaseTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                  if (showMilestonesOnly && !appModules.some(m => isWithinInterval(m.targetDate!, { start: qStart, end: qEnd }))) {
                    return null;
                  }

                  return (
                    <div key={phase.id} className={`${stageConfig[phase.stage].headerBg}`}>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,229,255,0.05)]">
                        <div className={`w-1 h-8 ${stageConfig[phase.stage].color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#f0f0f5]">{phase.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 text-white ${stageConfig[phase.stage].badge}`}>
                              {stageConfig[phase.stage].label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[#6b6b80] mt-0.5">
                            <span>{phaseGoals.length} goals</span>
                            <span>{totalTasks} tasks</span>
                            {phase.startDate && <span>{format(phase.startDate, 'MMM d')} → {phase.endDate ? format(phase.endDate, 'MMM d') : '-'}</span>}
                          </div>
                        </div>
                        {totalTasks > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                              <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-[#6b6b80]">{pct}%</span>
                          </div>
                        )}
                      </div>

                      {!showMilestonesOnly && phaseGoals.map(goal => {
                        const goalTasks = tasks.filter(t => t.goalId === goal.id);
                        const gDone = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                        const gPct = goalTasks.length > 0 ? Math.round((gDone / goalTasks.length) * 100) : 0;
                        const bar = getBarStyle(goal.startDate, goal.endDate, gPct);
                        const isOverdue = goal.endDate && isPast(goal.endDate);

                        return (
                          <div key={goal.id} className="flex items-center ml-8 border-t border-[rgba(0,229,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                            <div className="w-48 flex-shrink-0 px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-[#8b5cf6] flex-shrink-0" />
                                <span className="text-xs text-[#f0f0f5] truncate">{goal.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#6b6b80]">{gDone}/{goalTasks.length} tasks</span>
                                {isOverdue && <span className="text-[10px] text-[#ff3b5c]">Overdue</span>}
                              </div>
                            </div>
                            <div className="flex-1 relative h-8">
                              {goal.startDate && (
                                <div className="absolute top-1 bottom-1 rounded flex items-center overflow-hidden cursor-pointer"
                                  style={{ left: bar.left, width: bar.width, backgroundColor: `${statusColors.approved}30` }}>
                                  <div className="h-full bg-[#10b981] rounded-l"
                                    style={{ width: `${gPct}%` }} />
                                  <span className="absolute inset-0 flex items-center px-1.5 text-[10px] text-[#f0f0f5] truncate">
                                    {goal.name} {gPct}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {appModules.filter(m => m.targetDate).map(mod => {
                        if (!isWithinInterval(mod.targetDate!, { start: qStart, end: qEnd })) return null;
                        const modExps = expectations.filter(e => e.moduleId === mod.id);
                        const achieved = modExps.filter(e => e.status === 'achieved').length;
                        const diamondColor = modExps.length > 0 && achieved === modExps.length ? '#10b981' :
                          modExps.some(e => e.status === 'missed') ? '#ff3b5c' : '#f59e0b';
                        return (
                          <div key={mod.id} className="flex items-center ml-8 border-t border-[rgba(0,229,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                            <div className="w-48 flex-shrink-0 px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <Diamond className="w-3 h-3 flex-shrink-0" style={{ color: diamondColor }} />
                                <span className="text-xs text-[#f0f0f5] truncate">{mod.name}</span>
                              </div>
                              <span className="text-[10px] text-[#6b6b80]">{achieved}/{modExps.length} achieved</span>
                            </div>
                            <div className="flex-1 relative h-8">
                              <button className="absolute top-2" style={{ left: getDateLeft(mod.targetDate!) }}
                                onClick={() => onNavigate?.('gate-review')}
                                title={`${mod.name} - ${achieved}/${modExps.length} achieved. Click to open Gate Review`}>
                                <div className="flex flex-col items-center">
                                  <Diamond className="w-4 h-4" style={{ color: diamondColor }} fill={diamondColor} />
                                  <span className="text-[9px] text-[#6b6b80] whitespace-nowrap">{format(mod.targetDate!, 'MMM d')}</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[rgba(0,229,255,0.1)] flex items-center gap-4 text-xs text-[#6b6b80]">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#3b82f6] rounded" />
            <span>Pre-Dev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#10b981] rounded" />
            <span>Dev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#8b5cf6] rounded" />
            <span>Post-Dev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-[#10b981]" />
            <span>Achieved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-[#f59e0b]" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Diamond className="w-3 h-3 text-[#ff3b5c]" />
            <span>Missed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
