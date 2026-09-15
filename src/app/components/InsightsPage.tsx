import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Clock,
  AlertCircle,
  Target,
  BarChart3,
  Calendar,
  CheckCircle,
  Activity as ActivityIcon,
  Archive,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  XCircle
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { deriveGoalStatus, isTaskDone } from '../../utils/goalStatus';
import { buildReportSnapshot } from '../../utils/reportLogic';
import { Sparkles, RefreshCw } from 'lucide-react';

type Tab = 'analytics' | 'activities' | 'archive' | 'ai';

export function InsightsPage() {
  const { apps, goals, tasks, subtasks, employees, activities, defects, repositories } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>('analytics');
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || 'all');

  const canViewAll = hasPermission('view_all_apps');

  const getVisibleTasks = () => {
    if (selectedAppId === 'all') return tasks;
    const appGoalIds = new Set(goals.filter(g => g.appId === selectedAppId).map(g => g.id));
    return tasks.filter(t => appGoalIds.has(t.goalId || ''));
  };

  const appTasks = getVisibleTasks();
  const appGoalIds = selectedAppId === 'all'
    ? new Set(goals.map(g => g.id))
    : new Set(goals.filter(g => g.appId === selectedAppId).map(g => g.id));
  const appGoals = goals.filter(g => appGoalIds.has(g.id));
  const appSubtasks = subtasks.filter(s => appTasks.some(t => t.id === s.taskId));

  const filterActivities = () => {
    if (canViewAll) return activities;
    const myTasks = tasks.filter(t => t.assignedTo.includes(currentUser!.id));
    const myTaskIds = new Set(myTasks.map(t => t.id));
    return activities.filter(a => {
      if (a.relatedTo?.type === 'task' && a.relatedTo.id) return myTaskIds.has(a.relatedTo.id);
      return true;
    });
  };

  const visibleActivities = filterActivities();

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'activities', label: 'Activities', icon: ActivityIcon },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'ai', label: 'AI Report', icon: Sparkles }
  ];

  return (
    <div className="p-8 bg-[#FFFFFF] max-w-[900px] mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Insights</h1>
          <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Performance, activity, and history in one place</p>
        </div>
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] text-sm focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] cursor-pointer transition-colors duration-150"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center bg-[#E9E9E7] rounded-md p-1 w-fit mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-[6px] transition-colors duration-150 cursor-pointer ${tab === t.id ? 'bg-white text-[#37352F] shadow-sm border border-[#E9E9E7]' : 'text-[#787774] hover:text-[#37352F]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'analytics' && (
        <AnalyticsTab
          apps={apps}
          selectedAppId={selectedAppId}
          appGoals={appGoals}
          appTasks={appTasks}
          appSubtasks={appSubtasks}
          employees={employees}
        />
      )}
      {tab === 'activities' && <ActivitiesTab activities={visibleActivities} />}
      {tab === 'archive' && (
        <ArchiveTab
          apps={apps}
          goals={goals}
          tasks={tasks}
          employees={employees}
          selectedAppId={selectedAppId}
        />
      )}
      {tab === 'ai' && (
        <AiReportTab
          apps={apps}
          goals={goals}
          tasks={tasks}
          defects={defects}
          repositories={repositories}
          employees={employees}
          activities={activities}
          selectedAppId={selectedAppId}
        />
      )}
    </div>
  );
}

function AiReportTab({ apps, goals, tasks, defects, repositories, employees, activities, selectedAppId }: {
  apps: any[];
  goals: any[];
  tasks: any[];
  defects: any[];
  repositories: any[];
  employees: any[];
  activities: any[];
  selectedAppId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = buildReportSnapshot({
        apps, goals, tasks, defects, repositories, employees, activities, selectedAppId
      });
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report generation failed');
      setReport(data.report);
      setModel(data.model || null);
    } catch (e: any) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const blocks: React.ReactNode[] = [];
    const lines = md.split('\n');
    let list: string[] = [];
    const flushList = (key: string) => {
      if (list.length === 0) return;
      blocks.push(
        <ul key={key} className="space-y-1.5 my-3">
          {list.map((li, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2383E2] flex-shrink-0" />
              <span>{li}</span>
            </li>
          ))}
        </ul>
      );
      list = [];
    };
    lines.forEach((raw, idx) => {
      const line = raw.trimEnd();
      if (line.trim() === '') { flushList(`l${idx}`); return; }
      if (/^#{1,3}\s/.test(line)) {
        flushList(`l${idx}`);
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const Tag = level === 1 ? 'h2' : 'h3';
        blocks.push(
          <Tag key={`h${idx}`} className={`${Tag === 'h2' ? 'text-[16px]' : 'text-[14px]'} font-semibold text-[#37352F] mt-6 mb-2 flex items-center gap-2`} style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-1 h-5 bg-[#2383E2] rounded-full" />
            {text}
          </Tag>
        );
      } else if (/^[-*]\s/.test(line)) {
        list.push(line.replace(/^[-*]\s/, ''));
      } else {
        flushList(`l${idx}`);
        const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#37352F] font-semibold">$1</strong>');
        blocks.push(
          <p key={`p${idx}`} className="text-sm text-[#37352F] leading-relaxed my-2" style={{ fontFamily: 'Inter, sans-serif' }} dangerouslySetInnerHTML={{ __html: bolded }} />
        );
      }
    });
    flushList('final');
    return blocks;
  };

  const appName = selectedAppId === 'all' ? 'All Apps' : (apps.find(a => a.id === selectedAppId)?.name || 'App');

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[14px] font-semibold text-[#37352F] flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Sparkles className="w-4 h-4 text-[#2383E2]" />
              AI Progress Report
            </h3>
            <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Groq analyzes live Simpli data for <span className="text-[#2383E2] font-medium">{appName}</span> — health, what's working,
              risks, and recommendations.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white rounded-[6px] font-medium text-sm hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : report ? 'Regenerate Report' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] text-sm text-[#EB5757]" style={{ fontFamily: 'Inter, sans-serif' }}>
          {error}
        </div>
      )}

      {report && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E9E9E7]">
            <Sparkles className="w-4 h-4 text-[#2383E2]" />
            <span className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Generated by Groq {model ? `· ${model}` : ''} · {new Date().toLocaleString()}
            </span>
          </div>
          <div className="space-y-1">{renderMarkdown(report)}</div>
        </div>
      )}

      {!report && !error && !loading && (
        <div className="text-center py-14 bg-white border border-[#E9E9E7] rounded-[8px]">
          <Sparkles className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
          <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No report yet. Hit "Generate Report" to get an AI analysis of this app's progress.</p>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ apps, selectedAppId, appGoals, appTasks, appSubtasks, employees }: {
  apps: any[];
  selectedAppId: string;
  appGoals: any[];
  appTasks: any[];
  appSubtasks: any[];
  employees: any[];
}) {
  const selectedApp = apps.find(a => a.id === selectedAppId);

  const totalTasks = appTasks.length;
  const completedTasks = appTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
  const inProgressTasks = appTasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = appTasks.filter(t => t.status === 'blocked').length;
  const notStartedTasks = appTasks.filter(t => t.status === 'not_started').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalSubtasks = appSubtasks.length;
  const completedSubtasks = appSubtasks.filter(s => s.status === 'completed').length;
  const subtaskCompletionRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const overdueTasks = appTasks.filter(t => {
    if (!t.dueDate) return false;
    return isPast(t.dueDate) && t.status !== 'approved' && t.status !== 'completed';
  }).length;

  const dueThisWeek = appTasks.filter(t => {
    if (!t.dueDate) return false;
    const daysUntil = differenceInDays(t.dueDate, new Date());
    return daysUntil >= 0 && daysUntil <= 7 && t.status !== 'approved' && t.status !== 'completed';
  }).length;

  const statusDistribution = {
    not_started: notStartedTasks,
    in_progress: inProgressTasks,
    blocked: blockedTasks,
    completed: appTasks.filter(t => t.status === 'completed').length,
    approved: appTasks.filter(t => t.status === 'approved').length
  };

  const priorityDistribution = {
    urgent: appTasks.filter(t => t.priority === 'urgent').length,
    high: appTasks.filter(t => t.priority === 'high').length,
    medium: appTasks.filter(t => t.priority === 'medium').length,
    low: appTasks.filter(t => t.priority === 'low').length
  };

  const employeeWorkload = employees.map(emp => {
    const assignedTasks = appTasks.filter(t => t.assignedTo.includes(emp.id));
    return {
      name: emp.name,
      total: assignedTasks.length,
      completed: assignedTasks.filter(t => t.status === 'approved' || t.status === 'completed').length,
      inProgress: assignedTasks.filter(t => t.status === 'in_progress').length,
      blocked: assignedTasks.filter(t => t.status === 'blocked').length
    };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

  const goalProgress = appGoals.map(goal => {
    const goalTasks = appTasks.filter(t => t.goalId === goal.id);
    const completed = goalTasks.filter(t => t.status === 'approved').length;
    const progress = goalTasks.length > 0 ? Math.round((completed / goalTasks.length) * 100) : 0;
    return { name: goal.name, progress, total: goalTasks.length, completed };
  });

  const upcomingDeadlines = appTasks
    .filter(t => t.dueDate && t.status !== 'approved' && t.status !== 'completed')
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
    .slice(0, 5);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-[#0F7B6C]';
    if (progress >= 50) return 'text-[#2383E2]';
    if (progress >= 25) return 'text-[#787774]';
    return 'text-[#787774]';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 80) return 'bg-[#0F7B6C]';
    if (progress >= 50) return 'bg-[#2383E2]';
    if (progress >= 25) return 'bg-[#787774]';
    return 'bg-[#E9E9E7]';
  };

  const statCards = [
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate}%`, subtext: `${completedTasks} of ${totalTasks} tasks`, pct: completionRate },
    { icon: Clock, label: 'In Progress', value: inProgressTasks.toString(), subtext: `${blockedTasks} blocked`, pct: totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0 },
    { icon: AlertCircle, label: 'Overdue', value: overdueTasks.toString(), subtext: `${dueThisWeek} due this week`, pct: totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0 },
    { icon: Target, label: 'Subtask Progress', value: `${subtaskCompletionRate}%`, subtext: `${completedSubtasks} of ${totalSubtasks}`, pct: subtaskCompletionRate }
  ];

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#787774]',
    in_progress: 'bg-[#2383E2]',
    blocked: 'bg-[#EB5757]',
    completed: 'bg-[#2383E2]',
    approved: 'bg-[#0F7B6C]'
  };

  const priorityColorMap: Record<string, string> = {
    urgent: 'text-[#EB5757]',
    high: 'text-[#EB5757]',
    medium: 'text-[#2383E2]',
    low: 'text-[#787774]'
  };

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
        <BarChart3 className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
        <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No apps yet — create an app to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          const stroke = card.label === 'Completion Rate' || card.label === 'Subtask Progress' ? (card.pct >= 80 ? '#0F7B6C' : '#2383E2') : card.label === 'Overdue' ? '#EB5757' : '#2383E2';
          const circumference = 2 * Math.PI * 36;
          const offset = circumference - (card.pct / 100) * circumference;
          return (
            <div key={card.label} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="relative w-20 h-20">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#E9E9E7" strokeWidth="4" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke={stroke} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 40 40)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#787774]" />
                  </div>
                </div>
              </div>
              <p className="text-[20px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{card.value}</p>
              <p className="text-sm text-[#37352F] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{card.label}</p>
              <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Task Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#37352F] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>{status.replace('_', ' ')}</span>
                    <span className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${statusColors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Priority Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
                <p className={`text-xl font-semibold ${priorityColorMap[priority]}`} style={{ fontFamily: 'Inter, sans-serif' }}>{count}</p>
                <p className="text-sm text-[#787774] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>{priority}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Goal Progress</h3>
          <div className="space-y-4">
            {goalProgress.length === 0 && <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No goals yet</p>}
            {goalProgress.map((goal) => (
              <div key={goal.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{goal.name}</span>
                  <span className={`text-sm font-medium ${getProgressColor(goal.progress)}`} style={{ fontFamily: 'Inter, sans-serif' }}>{goal.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                  <div className={`h-1.5 rounded-full ${getProgressBg(goal.progress)}`} style={{ width: `${goal.progress}%` }} />
                </div>
                <p className="text-xs text-[#9B9A97] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{goal.completed} of {goal.total} tasks completed</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Team Workload</h3>
          <div className="space-y-2">
            {employeeWorkload.length === 0 && <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No assignments yet</p>}
            {employeeWorkload.map((emp) => (
              <div key={emp.name} className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150">
                <div className="w-8 h-8 bg-[#E9E9E7] rounded-md flex items-center justify-center text-[#37352F] text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{emp.name}</p>
                  <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{emp.total} tasks · {emp.completed} completed · {emp.inProgress} in progress</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Upcoming Deadlines</h3>
        <div className="space-y-2">
          {upcomingDeadlines.length === 0 && <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No upcoming deadlines</p>}
          {upcomingDeadlines.map((task) => {
            const daysLeft = task.dueDate ? differenceInDays(task.dueDate, new Date()) : 0;
            const isOverdue = daysLeft < 0;
            const isDueToday = daysLeft === 0;
            return (
              <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150">
                <div className="flex items-center gap-3">
                  {isOverdue ? <XCircle className="w-4 h-4 text-[#EB5757]" /> : isDueToday ? <AlertCircle className="w-4 h-4 text-[#787774]" /> : <Calendar className="w-4 h-4 text-[#787774]" />}
                  <div>
                    <p className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{task.name}</p>
                    <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : 'No date'}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-md border ${isOverdue ? 'bg-[#F7F7F5] text-[#EB5757] border-[#E9E9E7]' : isDueToday ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                  {isOverdue ? `${Math.abs(daysLeft)}d overdue` : isDueToday ? 'Due today' : `${daysLeft}d left`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActivitiesTab({ activities }: { activities: any[] }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_approved': return 'bg-[#F7F7F5] text-[#0F7B6C] border-[#E9E9E7]';
      case 'task_completed': return 'bg-[#F7F7F5] text-[#2383E2] border-[#E9E9E7]';
      case 'task_created': return 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]';
      case 'app_created': return 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]';
      case 'goal_created': return 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]';
      default: return 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]';
    }
  };

  const getTypeLabel = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden">
      {activities.length > 0 ? (
        <div className="divide-y divide-[#E9E9E7]">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-[#37352F] text-xs font-medium flex-shrink-0 bg-[#E9E9E7]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {activity.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className="font-medium">{activity.userName}</span>{' '}
                      <span className="text-[#787774]">{activity.description}</span>
                    </p>
                    {activity.relatedTo && (
                      <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {activity.relatedTo.type}: {activity.relatedTo.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium whitespace-nowrap rounded-md border ${getTypeColor(activity.type)}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                    {getTypeLabel(activity.type)}
                  </span>
                </div>
                <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ActivityIcon className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
          <p className="text-[#37352F] text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>No activities yet</p>
          <p className="text-[#787774] text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Activities will appear here as you work on tasks</p>
        </div>
      )}
    </div>
  );
}

function ArchiveTab({ apps, goals, tasks, employees, selectedAppId }: {
  apps: any[];
  goals: any[];
  tasks: any[];
  employees: any[];
  selectedAppId: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'goal' | 'task'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
    if (value.seconds) return value.seconds * 1000;
    return 0;
  };

  const appGoalIds = selectedAppId === 'all'
    ? new Set(goals.map(g => g.id))
    : new Set(goals.filter(g => g.appId === selectedAppId).map(g => g.id));
  const appGoals = goals.filter(g => appGoalIds.has(g.id));
  const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));

  const goalsWithStatus = appGoals.map(goal => ({
    goal,
    status: deriveGoalStatus(goal, appTasks),
    completedAt: goal.endDate
  }));
  const completedGoals = goalsWithStatus.filter(g => g.status === 'completed');
  const completedTasks = appTasks.filter(isTaskDone);

  const filteredItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'goal' | 'task';
      name: string;
      status: string;
      startDate: any;
      endDate: any;
      assignedTo: string[];
      priority?: string;
      description?: string;
      subtasks?: any[];
      completedAt?: any;
    }> = [];

    if (filterType === 'all' || filterType === 'goal') {
      completedGoals.forEach(({ goal, status, completedAt }) => {
        items.push({
          id: goal.id,
          type: 'goal',
          name: goal.name,
          status,
          startDate: goal.startDate,
          endDate: goal.endDate,
          assignedTo: [],
          description: goal.description,
          completedAt
        });
      });
    }

    if (filterType === 'all' || filterType === 'task') {
      completedTasks.forEach(task => {
        items.push({
          id: task.id,
          type: 'task',
          name: task.name,
          status: task.status,
          startDate: task.startDate,
          endDate: task.endDate || task.dueDate,
          assignedTo: task.assignedTo,
          priority: task.priority,
          description: task.description,
          subtasks: task.subtasks,
          completedAt: task.completedAt || task.endDate || task.dueDate
        });
      });
    }

    if (searchQuery) {
      return items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items.sort((a, b) => toMillis(b.completedAt) - toMillis(a.completedAt));
  }, [completedGoals, completedTasks, filterType, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getEmployeeName = (employeeId: string) => employees.find(e => e.id === employeeId)?.name || 'Unknown';

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No date';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getDuration = (start: any, end: any) => {
    if (!start || !end) return null;
    try {
      const startDate = start.toDate ? start.toDate() : new Date(start);
      const endDate = end.toDate ? end.toDate() : new Date(end);
      const days = differenceInDays(endDate, startDate);
      return days >= 0 ? `${days} days` : `${Math.abs(days)} days early`;
    } catch {
      return null;
    }
  };

  const completedSubtaskCount = completedTasks.reduce(
    (sum, t) => sum + (t.subtasks?.filter(s => s.status === 'approved' || s.status === 'completed').length || 0), 0
  );

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#787774]" />
          <input
            type="text"
            placeholder="Search completed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-sm placeholder:text-[#9B9A97] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>
        <div className="flex items-center bg-[#E9E9E7] rounded-md p-1">
          {(['all', 'goal', 'task'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-sm capitalize rounded-[6px] transition-colors duration-150 cursor-pointer ${filterType === t ? 'bg-white text-[#37352F] shadow-sm border border-[#E9E9E7]' : 'text-[#787774] hover:text-[#37352F]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <Target className="w-4 h-4 text-[#787774]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{completedGoals.length}</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Completed Goals</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{completedTasks.length}</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Completed Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <FileText className="w-4 h-4 text-[#787774]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{completedSubtaskCount}</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Completed Subtasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden">
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Archive className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No completed items found</p>
          </div>
        )}
        {filteredItems.map(item => {
          const isExpanded = expandedItems.has(item.id);
          const duration = getDuration(item.startDate, item.endDate);
          return (
            <div key={item.id} className="border-b border-[#E9E9E7] last:border-b-0">
              <button onClick={() => toggleExpand(item.id)} className="w-full flex items-center gap-4 p-4 hover:bg-[#F7F7F5] text-left transition-colors duration-150 cursor-pointer">
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                </div>
                <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
                  {item.type === 'goal' ? <Target className="w-4 h-4 text-[#787774]" /> : <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#37352F] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{item.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-md border bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.startDate)} → {formatDate(item.endDate)}
                    </span>
                    {duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                    {item.assignedTo.length > 0 && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.assignedTo.map(getEmployeeName).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pl-14">
                  {item.description && (
                    <div className="mb-4">
                      <p className="text-xs text-[#787774] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Description</p>
                      <p className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{item.description}</p>
                    </div>
                  )}
                  {item.subtasks && item.subtasks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#37352F] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Subtasks ({item.subtasks.length})</p>
                      <div className="space-y-1">
                        {item.subtasks.map((subtask, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1 px-2 rounded-md hover:bg-[#F7F7F5] border border-transparent hover:border-[#E9E9E7] transition-colors duration-150">
                            {(subtask.status === 'approved' || subtask.status === 'completed') ? (
                              <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />
                            ) : (
                              <div className="w-4 h-4 border border-[#E0E0DE] rounded-sm" />
                            )}
                            <span className={subtask.status === 'approved' || subtask.status === 'completed' ? 'text-[#787774] line-through' : 'text-[#37352F]'} style={{ fontFamily: 'Inter, sans-serif' }}>
                              {subtask.name}
                            </span>
                            {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                              <span className="text-xs text-[#787774] ml-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {subtask.assignedTo.map(getEmployeeName).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.completedAt && (
                    <div className="mt-4 pt-3 border-t border-[#E9E9E7]">
                      <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Completed on {formatDate(item.completedAt)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
