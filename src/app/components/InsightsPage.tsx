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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Insights</h1>
          <p className="text-muted-foreground">Performance, activity, and history in one place</p>
        </div>
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="px-4 py-2 bg-[#0F172A]/70 backdrop-blur border border-[rgba(124,58,237,0.12)] text-foreground rounded-lg"
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center glass w-fit mb-6 rounded-lg p-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'text-[#7C3AED] bg-[rgba(124,58,237,0.1)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
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
            <li key={i} className="flex items-start gap-2 text-sm text-[#CBD5E1]">
              <span className="text-[#7C3AED] mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" />
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
          <Tag key={`h${idx}`} className={`${Tag === 'h2' ? 'text-xl' : 'text-lg'} font-semibold text-foreground mt-6 mb-2 flex items-center gap-2`}>
            <span className="w-1.5 h-5 bg-[#7C3AED]" />
            {text}
          </Tag>
        );
      } else if (/^[-*]\s/.test(line)) {
        list.push(line.replace(/^[-*]\s/, ''));
      } else {
        flushList(`l${idx}`);
        const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>');
        blocks.push(
          <p key={`p${idx}`} className="text-sm text-[#CBD5E1] leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: bolded }} />
        );
      }
    });
    flushList('final');
    return blocks;
  };

  const appName = selectedAppId === 'all' ? 'All Apps' : (apps.find(a => a.id === selectedAppId)?.name || 'App');

  return (
    <div className="space-y-4">
      <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
              AI Progress Report
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Groq analyzes live Simpli data for <span className="text-[#7C3AED]">{appName}</span> — health, what's working,
              risks, and recommendations.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : report ? 'Regenerate Report' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[rgba(124,58,237,0.1)] border border-[rgba(255,59,92,0.2)] text-sm text-[#7C3AED]">
          {error}
        </div>
      )}

      {report && (
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(124,58,237,0.1)]">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs text-muted-foreground">
              Generated by Groq {model ? `· ${model}` : ''} · {new Date().toLocaleString()}
            </span>
          </div>
          <div className="space-y-1">{renderMarkdown(report)}</div>
        </div>
      )}

      {!report && !error && !loading && (
        <div className="text-center py-14 bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No report yet. Hit "Generate Report" to get an AI analysis of this app's progress.</p>
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
    if (progress >= 80) return 'text-[#A78BFA]';
    if (progress >= 50) return 'text-[#7C3AED]';
    if (progress >= 25) return 'text-[#f59e0b]';
    return 'text-[#7C3AED]';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 80) return 'bg-[#A78BFA]';
    if (progress >= 50) return 'bg-[#7C3AED]';
    if (progress >= 25) return 'bg-[#f59e0b]';
    return 'bg-[#7C3AED]';
  };

  const statCards = [
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate}%`, subtext: `${completedTasks} of ${totalTasks} tasks`, color: 'text-[#A78BFA]', bgColor: 'bg-[rgba(124,58,237,0.1)]' },
    { icon: Clock, label: 'In Progress', value: inProgressTasks.toString(), subtext: `${blockedTasks} blocked`, color: 'text-[#7C3AED]', bgColor: 'bg-[rgba(124,58,237,0.1)]' },
    { icon: AlertCircle, label: 'Overdue', value: overdueTasks.toString(), subtext: `${dueThisWeek} due this week`, color: 'text-[#7C3AED]', bgColor: 'bg-[rgba(124,58,237,0.1)]' },
    { icon: Target, label: 'Subtask Progress', value: `${subtaskCompletionRate}%`, subtext: `${completedSubtasks} of ${totalSubtasks}`, color: 'text-[#8b5cf6]', bgColor: 'bg-[rgba(139,92,246,0.1)]' }
  ];

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#94A3B8]',
    in_progress: 'bg-[#7C3AED]',
    blocked: 'bg-[#7C3AED]',
    completed: 'bg-[#8b5cf6]',
    approved: 'bg-[#A78BFA]'
  };

  const priorityColorMap: Record<string, string> = {
    urgent: 'text-[#7C3AED]',
    high: 'text-[#f59e0b]',
    medium: 'text-[#7C3AED]',
    low: 'text-muted-foreground'
  };
  const priorityBgMap: Record<string, string> = {
    urgent: 'bg-[rgba(124,58,237,0.1)]',
    high: 'bg-[rgba(245,158,11,0.1)]',
    medium: 'bg-[rgba(124,58,237,0.1)]',
    low: 'bg-[rgba(107,107,128,0.1)]'
  };

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
        <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No apps yet — create an app to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
              <div className={`p-2 mb-3 w-fit ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Task Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-sm text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white">
                    <div className={`h-2 ${statusColors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(priorityDistribution).map(([priority, count]) => (
              <div key={priority} className={`p-4 ${priorityBgMap[priority]} border border-[rgba(124,58,237,0.1)]`}>
                <p className={`text-2xl font-bold ${priorityColorMap[priority]}`}>{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{priority}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Goal Progress</h3>
          <div className="space-y-4">
            {goalProgress.length === 0 && <p className="text-sm text-muted-foreground">No goals yet</p>}
            {goalProgress.map((goal) => (
              <div key={goal.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{goal.name}</span>
                  <span className={`text-sm font-medium ${getProgressColor(goal.progress)}`}>{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-white">
                  <div className={`h-2 ${getProgressBg(goal.progress)}`} style={{ width: `${goal.progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{goal.completed} of {goal.total} tasks completed</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Team Workload</h3>
          <div className="space-y-3">
            {employeeWorkload.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet</p>}
            {employeeWorkload.map((emp) => (
              <div key={emp.name} className="flex items-center gap-3 p-3 bg-white border border-[rgba(124,58,237,0.1)]">
                <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#8b5cf6] flex items-center justify-center text-[#020617] font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.total} tasks · {emp.completed} completed · {emp.inProgress} in progress</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
        <div className="space-y-3">
          {upcomingDeadlines.length === 0 && <p className="text-sm text-muted-foreground">No upcoming deadlines</p>}
          {upcomingDeadlines.map((task) => {
            const daysLeft = task.dueDate ? differenceInDays(task.dueDate, new Date()) : 0;
            const isOverdue = daysLeft < 0;
            const isDueToday = daysLeft === 0;
            return (
              <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-[rgba(124,58,237,0.1)]">
                <div className="flex items-center gap-3">
                  {isOverdue ? <XCircle className="w-5 h-5 text-[#7C3AED]" /> : isDueToday ? <AlertCircle className="w-5 h-5 text-[#f59e0b]" /> : <Calendar className="w-5 h-5 text-[#7C3AED]" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : 'No date'}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 ${
                  isOverdue ? 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]' :
                  isDueToday ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                  'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]'
                }`}>
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
      case 'task_approved': return 'bg-[rgba(124,58,237,0.1)] text-[#A78BFA] border-[rgba(124,58,237,0.2)]';
      case 'task_completed': return 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED] border-[rgba(124,58,237,0.2)]';
      case 'task_created': return 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]';
      case 'app_created': return 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED] border-[rgba(124,58,237,0.2)]';
      case 'goal_created': return 'bg-[rgba(124,58,237,0.1)] text-[#A78BFA] border-[rgba(124,58,237,0.2)]';
      default: return 'bg-[rgba(107,107,128,0.1)] text-muted-foreground border-[rgba(107,107,128,0.2)]';
    }
  };

  const getTypeLabel = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
      {activities.length > 0 ? (
        <div className="divide-y divide-[rgba(124,58,237,0.1)]">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-5 hover:bg-[rgba(124,58,237,0.05)] transition">
              <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                activity.type === 'task_approved' ? 'bg-[#A78BFA]' :
                activity.type === 'task_completed' ? 'bg-[#7C3AED]' :
                activity.type === 'task_created' ? 'bg-[#f59e0b]' :
                activity.type === 'app_created' ? 'bg-[#7C3AED]' :
                'bg-[#94A3B8]'
              }`}>
                {activity.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-foreground">
                      <span className="font-medium">{activity.userName}</span>{' '}
                      {activity.description}
                    </p>
                    {activity.relatedTo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.relatedTo.type}: {activity.relatedTo.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium whitespace-nowrap ${getTypeColor(activity.type)}`}>
                    {getTypeLabel(activity.type)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ActivityIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg mb-2">No activities yet</p>
          <p className="text-muted-foreground text-sm">Activities will appear here as you work on tasks</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search completed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-[rgba(124,58,237,0.1)] text-foreground text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center bg-white border border-[rgba(124,58,237,0.1)]">
          {(['all', 'goal', 'task'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 text-sm capitalize ${filterType === t ? 'text-[#7C3AED] bg-[rgba(124,58,237,0.1)]' : 'text-muted-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(139,92,246,0.1)]">
              <Target className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedGoals.length}</p>
              <p className="text-sm text-muted-foreground">Completed Goals</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(124,58,237,0.1)]">
              <CheckCircle className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedTasks.length}</p>
              <p className="text-sm text-muted-foreground">Completed Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(124,58,237,0.1)]">
              <FileText className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedSubtaskCount}</p>
              <p className="text-sm text-muted-foreground">Completed Subtasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No completed items found</p>
          </div>
        )}
        {filteredItems.map(item => {
          const isExpanded = expandedItems.has(item.id);
          const duration = getDuration(item.startDate, item.endDate);
          return (
            <div key={item.id} className="border-b border-[rgba(124,58,237,0.05)] last:border-b-0">
              <button onClick={() => toggleExpand(item.id)} className="w-full flex items-center gap-4 p-4 hover:bg-[rgba(124,58,237,0.05)] text-left">
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className={`p-2 ${item.type === 'goal' ? 'bg-[rgba(139,92,246,0.1)]' : 'bg-[rgba(124,58,237,0.1)]'}`}>
                  {item.type === 'goal' ? <Target className="w-4 h-4 text-[#8b5cf6]" /> : <CheckCircle className="w-4 h-4 text-[#7C3AED]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <span className={`text-xs px-2 py-0.5 ${
                      item.status === 'approved' ? 'bg-[rgba(124,58,237,0.1)] text-[#A78BFA]' : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-foreground">{item.description}</p>
                    </div>
                  )}
                  {item.subtasks && item.subtasks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Subtasks ({item.subtasks.length})</p>
                      <div className="space-y-1">
                        {item.subtasks.map((subtask, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1">
                            {(subtask.status === 'approved' || subtask.status === 'completed') ? (
                              <CheckCircle className="w-4 h-4 text-[#A78BFA]" />
                            ) : (
                              <div className="w-4 h-4 border border-[#94A3B8]" />
                            )}
                            <span className={subtask.status === 'approved' || subtask.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}>
                              {subtask.name}
                            </span>
                            {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {subtask.assignedTo.map(getEmployeeName).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.completedAt && (
                    <div className="mt-4 pt-3 border-t border-[rgba(124,58,237,0.1)]">
                      <p className="text-xs text-muted-foreground">Completed on {formatDate(item.completedAt)}</p>
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
