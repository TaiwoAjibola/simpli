import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Layers,
  Target,
  Users,
  ArrowUpRight,
  Activity as ActivityIcon,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

type DashboardProps = {
  onNavigate: (page: string) => void;
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const { currentUser, hasPermission } = useAuth();
  const {
    tasks,
    apps,
    goals,
    activities,
    getTasksForEmployee,
    getTasksForGoal,
    employees,
    defects,
    phases,
    repositories
  } = useApp();

  const canViewAll = hasPermission('view_all_apps');
  const myTasks = canViewAll ? tasks : getTasksForEmployee(currentUser!.id);

  const stats = {
    total: myTasks.length,
    completed: myTasks.filter(t => t.status === 'approved').length,
    inProgress: myTasks.filter(t => t.status === 'in_progress').length,
    blocked: myTasks.filter(t => t.status === 'blocked').length,
    pending: myTasks.filter(t => t.status === 'not_started').length
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const activeApps = apps.filter(p => p.status === 'active');
  const viewedActivities = canViewAll
    ? activities
    : activities.filter(a =>
        a.relatedTo?.type === 'task'
          ? getTasksForEmployee(currentUser!.id).some(t => t.id === a.relatedTo!.id)
          : true
      );
  const recentActivities = viewedActivities.slice(0, 8);

  const priorityTasks = myTasks
    .filter(t => t.status !== 'approved' && t.priority === 'urgent')
    .slice(0, 5);

  const portfolioMetrics = React.useMemo(() => {
    const nowDate = new Date();
    const ms = 86400000;
    const blockedWork = tasks.filter(t => t.status === 'blocked').length;
    const openDefectsAll = defects.filter(d => d.status !== 'closed' && d.status !== 'resolved');
    const openDefectsAging = openDefectsAll.filter(d => {
      const base = d.dateReported || d.createdAt;
      if (!base) return false;
      return (nowDate.getTime() - new Date(base).getTime()) / ms > 7;
    }).length;
    const pendingQaAll = tasks.filter(t => t.status === 'pending_qa');
    const pendingQaAging = pendingQaAll.filter(t => {
      if (!t.createdAt) return false;
      return (nowDate.getTime() - new Date(t.createdAt).getTime()) / ms > 3;
    }).length;
    const upcomingDeadlines = tasks.filter(t => {
      if (!t.dueDate || t.status === 'approved') return false;
      const due = new Date(t.dueDate);
      const diff = (due.getTime() - nowDate.getTime()) / ms;
      return diff >= 0 && diff <= 7;
    }).length;
    const totalTasks = tasks.length || 1;
    const blockedRatio = blockedWork / totalTasks;
    let overallLabel = 'Healthy';
    let overallColor: 'green' | 'yellow' | 'red' = 'green';
    if (blockedWork === 0 && openDefectsAging === 0 && pendingQaAging === 0) {
      overallLabel = 'Healthy';
      overallColor = 'green';
    } else if (blockedWork <= 2 && openDefectsAging <= 2 && pendingQaAging <= 3) {
      overallLabel = 'At risk';
      overallColor = 'yellow';
    } else {
      overallLabel = 'Needs attention';
      overallColor = 'red';
    }
    if (blockedRatio > 0.2) {
      overallColor = 'red';
      overallLabel = 'Needs attention';
    } else if (blockedRatio > 0.05 && overallColor === 'green') {
      overallColor = 'yellow';
      overallLabel = 'At risk';
    }
    const budgetApps = apps.filter((a: any) => typeof a.budgetAmount === 'number');
    const totalBudget = budgetApps.reduce((sum: number, a: any) => sum + (a.budgetAmount || 0), 0);
    const avgBudget = budgetApps.length > 0 ? Math.round(totalBudget / budgetApps.length) : 0;
    return {
      blockedWork,
      openDefectsAging,
      pendingQaAging,
      upcomingDeadlines,
      overallLabel,
      overallColor,
      openDefectsCount: openDefectsAll.length,
      totalBudget,
      avgBudget,
      budgetCount: budgetApps.length
    };
  }, [tasks, defects, apps]);

  const portfolioRows = React.useMemo(() => {
    return apps.map(app => {
      const appGoals = goals.filter(g => g.appId === app.id);
      const goalIds = new Set(appGoals.map(g => g.id));
      const appTasks = tasks.filter(t => t.appId === app.id || (t.goalId !== undefined && t.goalId !== null && goalIds.has(t.goalId as string)));
      const total = appTasks.length;
      const approved = appTasks.filter(t => t.status === 'approved').length;
      const progress = total > 0 ? Math.round((approved / total) * 100) : 0;
      const appOpenDefects = defects.filter(d => d.applicationId === app.id && d.status !== 'closed' && d.status !== 'resolved');
      const openDefectsCount = appOpenDefects.length;
      const openDefectsAging = appOpenDefects.filter(d => {
        const base = d.dateReported || d.createdAt;
        if (!base) return false;
        return (Date.now() - new Date(base).getTime()) / 86400000 > 7;
      }).length;
      const blocked = appTasks.filter(t => t.status === 'blocked').length;
      const pendingQa = appTasks.filter(t => t.status === 'pending_qa').length;
      const pendingQaAging = appTasks.filter(t => {
        if (t.status !== 'pending_qa' || !t.createdAt) return false;
        return (Date.now() - new Date(t.createdAt).getTime()) / 86400000 > 3;
      }).length;
      let health: 'green' | 'yellow' | 'red' = 'green';
      if (blocked === 0 && openDefectsAging === 0) health = 'green';
      else if (blocked >= 1 && blocked <= 2) health = 'yellow';
      else health = 'red';
      const appRepos = repositories.filter(r => r.appId === app.id);
      const devActivityCount = appRepos.reduce((acc, r) => acc + (r.commits?.length || 0), 0);
      const upcomingWork = appTasks.filter(t => {
        if (!t.dueDate) return false;
        const diff = (new Date(t.dueDate).getTime() - Date.now()) / 86400000;
        return diff >= 0 && diff <= 7 && t.status !== 'approved';
      }).length;
      const phase = phases.find(p => p.appId === app.id && p.status === 'in_progress') || phases.find(p => p.appId === app.id);
      return {
        app,
        progress,
        openDefectsCount,
        openDefectsAging,
        blocked,
        pendingQa,
        pendingQaAging,
        health,
        devActivityCount,
        upcomingWork,
        phase,
        total,
        appRepos
      };
    });
  }, [apps, goals, tasks, defects, phases, repositories]);

  return (
    <div className="p-8 space-y-6 bg-[#FFFFFF] max-w-[900px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Dashboard</h1>
          <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Welcome back, {currentUser?.name}</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-[#FBFBFA] rounded-md text-xs text-[#787774] border border-[#E9E9E7]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-2 h-2 rounded-full bg-[#0F7B6C]" />
            Simpli is running smoothly
          </div>
          <button
            onClick={() => onNavigate('my-work')}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white rounded-md text-sm font-medium hover:bg-[#1a6fc7] transition-colors duration-150 cursor-pointer"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <FileText className="w-4 h-4" />
            My Work
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          icon={CheckCircle2}
          color="gray"
          trend={`${completionRate}% completed`}
          percentage={completionRate}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          color="blue"
          trend="Active work"
          percentage={stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}
        />
        <StatCard
          title="Blocked"
          value={stats.blocked}
          icon={AlertCircle}
          color="red"
          trend="Needs attention"
          percentage={stats.total > 0 ? Math.round((stats.blocked / stats.total) * 100) : 0}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={TrendingUp}
          color="green"
          trend={`${completionRate}% rate`}
          percentage={completionRate}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E9E9E7] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Recent Activity</h2>
            <button
              onClick={() => onNavigate('reports')}
              className="text-sm text-[#2383E2] hover:opacity-80 flex items-center gap-1 cursor-pointer transition-colors duration-150"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-md border-b border-[#E9E9E7] last:border-0 hover:bg-[#F7F7F5] transition-colors duration-150"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#E9E9E7] text-[#37352F] text-xs font-medium shrink-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {activity.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="font-medium">{activity.userName}</span>{' '}
                    <span className="text-[#787774]">{activity.description}</span>
                  </p>
                  <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {format(activity.timestamp, 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <ActivityIcon className="w-8 h-8 text-[#787774] mx-auto mb-2" />
                <p className="text-[#787774] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>No activity yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canViewAll && (
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
              <h3 className="font-semibold text-[#37352F] mb-4 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Quick Stats</h3>
              <div className="space-y-3">
                <QuickStat
                  icon={Layers}
                  label="Active Projects"
                  value={activeApps.length}
                  onClick={() => onNavigate('projects')}
                />
                <QuickStat
                  icon={Target}
                  label="Milestones"
                  value={goals.length}
                  onClick={() => onNavigate('milestones')}
                />
                <QuickStat
                  icon={Users}
                  label="Team Members"
                  value={employees.length}
                  onClick={() => onNavigate('admin')}
                />
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
            <h3 className="font-semibold text-[#37352F] mb-4 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Urgent Tasks</h3>
            {priorityTasks.length > 0 ? (
              <div className="space-y-2">
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white border border-[#E9E9E7] rounded-md hover:bg-[#F7F7F5] transition-colors duration-150"
                  >
                    <p className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#EB5757] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>URGENT</span>
                      <span className="text-xs text-[#787774]">•</span>
                      <span className="text-xs text-[#787774] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No urgent tasks</p>
            )}
          </div>
        </div>
      </div>

      {canViewAll && activeApps.length > 0 && (
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Active Projects</h2>
            <button
              onClick={() => onNavigate('projects')}
              className="text-sm text-[#2383E2] hover:opacity-80 flex items-center gap-1 cursor-pointer transition-colors duration-150"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeApps.slice(0, 3).map((app) => {
              const appGoals = goals.filter(g => g.appId === app.id);
              const appTasks = appGoals.flatMap(g =>
                tasks.filter(t => t.goalId === g.id)
              );
              const completedTasks = appTasks.filter(t => t.status === 'approved');
              const progress = appTasks.length > 0
                ? Math.round((completedTasks.length / appTasks.length) * 100)
                : 0;

              return (
                <div
                  key={app.id}
                  className="p-4 bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
                  onClick={() => onNavigate('app-details', app.id)}
                >
                  <h3 className="font-semibold text-[#37352F] mb-2 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{app.name}</h3>
                  <p className="text-sm text-[#787774] mb-4 line-clamp-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {app.description}
                  </p>
                  {(app as any).budgetAmount !== undefined && (app as any).budgetAmount !== null && (
                    <div className="mb-3">
                      <span className="inline-flex text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {(() => {
                          const amt = (app as any).budgetAmount as number;
                          const cur = (app as any).budgetCurrency || 'USD';
                          const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
                          const sym = symbols[cur] || cur;
                          return `${sym} ${amt.toLocaleString()} ${cur}`;
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="text-[#787774]">
                      {appGoals.length} goals
                    </span>
                    <span className="text-[#37352F] font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#E9E9E7] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2383E2] h-1.5 rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[16px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Portfolio Health</h2>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Cross-project overview</p>
          </div>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-150"
            style={{
              fontFamily: 'Inter, sans-serif',
              backgroundColor: portfolioMetrics.overallColor === 'green' ? '#EDF9F5' : portfolioMetrics.overallColor === 'yellow' ? '#FEF3C7' : '#FBE9E9',
              color: portfolioMetrics.overallColor === 'green' ? '#0F7B6C' : portfolioMetrics.overallColor === 'yellow' ? '#92400E' : '#EB5757',
              borderColor: portfolioMetrics.overallColor === 'green' ? '#A7D8CC' : portfolioMetrics.overallColor === 'yellow' ? '#FDE68A' : '#FECACA'
            }}
          >
            <span
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: portfolioMetrics.overallColor === 'green' ? '#0F7B6C' : portfolioMetrics.overallColor === 'yellow' ? '#D97706' : '#EB5757' }}
            />
            {portfolioMetrics.overallLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
            <p className="text-[12px] font-medium tracking-wider uppercase text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Blocked Work</p>
            <p className="text-[20px] font-semibold text-[#37352F] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.blockedWork}</p>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.blockedWork === 0 ? 'All clear' : 'Needs attention'}</p>
          </div>
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
            <p className="text-[12px] font-medium tracking-wider uppercase text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Open Defects &gt;7d</p>
            <p className="text-[20px] font-semibold text-[#37352F] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.openDefectsAging}</p>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.openDefectsCount} open total</p>
          </div>
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
            <p className="text-[12px] font-medium tracking-wider uppercase text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Pending QA &gt;3d</p>
            <p className="text-[20px] font-semibold text-[#37352F] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.pendingQaAging}</p>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Aging in QA</p>
          </div>
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
            <p className="text-[12px] font-medium tracking-wider uppercase text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Upcoming Deadlines</p>
            <p className="text-[20px] font-semibold text-[#37352F] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.upcomingDeadlines}</p>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Due within 7 days</p>
          </div>
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
            <p className="text-[12px] font-medium tracking-wider uppercase text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Total Budget</p>
            <p className="text-[20px] font-semibold text-[#37352F] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>${portfolioMetrics.totalBudget.toLocaleString()}</p>
            <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{portfolioMetrics.budgetCount > 0 ? `${portfolioMetrics.budgetCount} projects · avg $${portfolioMetrics.avgBudget.toLocaleString()}` : 'No budgets yet'}</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E9E9E7] rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FBFBFA] border-b border-[#E9E9E7]">
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Project</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Progress</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Open Defects</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Blocked</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Pending QA</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Budget</th>
                <th className="text-left text-[12px] font-medium tracking-wider uppercase text-[#787774] px-4 py-3" style={{ fontFamily: 'Inter, sans-serif' }}>Health</th>
              </tr>
            </thead>
            <tbody>
              {portfolioRows.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No projects</td>
                </tr>
              ) : portfolioRows.map(row => (
                <tr
                  key={row.app.id}
                  className="bg-white border-b border-[#E9E9E7] last:border-0 hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
                  onClick={() => onNavigate('app-details', row.app.id)}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{row.app.name}</div>
                    <div className="text-xs text-[#787774] capitalize flex items-center gap-1.5 flex-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span>{row.app.currentStage ? row.app.currentStage.replace('_', ' ') : row.phase ? row.phase.name : '—'}</span>
                      {row.phase && <span>• {row.phase.status.replace('_', ' ')}</span>}
                      {row.devActivityCount > 0 && <span>• {row.devActivityCount} commits</span>}
                      {row.appRepos.length > 0 && <span>• {row.appRepos.length} repos</span>}
                      {row.upcomingWork > 0 && <span>• {row.upcomingWork} upcoming</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{row.progress}%</span>
                      <div className="hidden sm:block w-16 h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                        <div className="h-1.5 bg-[#2383E2] rounded-full transition-all duration-150" style={{ width: `${row.progress}%` }} />
                      </div>
                    </div>
                    <div className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{row.total} tasks</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        backgroundColor: row.openDefectsCount > 0 ? '#FBE9E9' : '#F7F7F5',
                        borderColor: '#E9E9E7',
                        color: row.openDefectsCount > 0 ? '#EB5757' : '#787774'
                      }}
                    >
                      {row.openDefectsCount}{row.openDefectsAging > 0 ? ` • ${row.openDefectsAging} >7d` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        backgroundColor: row.blocked > 0 ? '#FBE9E9' : '#F7F7F5',
                        borderColor: '#E9E9E7',
                        color: row.blocked > 0 ? '#EB5757' : '#787774'
                      }}
                    >
                      {row.blocked}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-[#F7F7F5]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        borderColor: '#E9E9E7',
                        color: '#787774'
                      }}
                    >
                      {row.pendingQa}{row.pendingQaAging > 0 ? ` • ${row.pendingQaAging} >3d` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(row.app as any).budgetAmount !== undefined && (row.app as any).budgetAmount !== null ? (
                      <span className="inline-flex text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {(() => {
                          const amt = (row.app as any).budgetAmount as number;
                          const cur = (row.app as any).budgetCurrency || 'USD';
                          const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
                          const sym = symbols[cur] || cur;
                          return `${sym} ${amt.toLocaleString()} ${cur}`;
                        })()}
                      </span>
                    ) : (
                      <span className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: row.health === 'green' ? '#0F7B6C' : row.health === 'yellow' ? '#D97706' : '#EB5757' }}
                      aria-label={row.health}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  percentage
}: {
  title: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'red' | 'gray';
  trend: string;
  percentage: number;
}) {
  const colors = {
    blue: { bg: '#2383E2' },
    green: { bg: '#0F7B6C' },
    red: { bg: '#EB5757' },
    gray: { bg: '#787774' }
  };

  const { bg } = colors[color];
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150 cursor-default">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#E9E9E7"
              strokeWidth="4"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={bg}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#787774]" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</p>
        <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{title}</p>
        <p className="text-xs text-[#787774] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>{trend}</p>
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  onClick
}: {
  icon: any;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-md hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[#787774]" />
        <span className="text-sm text-[#37352F]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#37352F]">{value}</span>
    </button>
  );
}
