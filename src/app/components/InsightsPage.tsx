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

type Tab = 'analytics' | 'activities' | 'archive';

export function InsightsPage() {
  const { apps, goals, tasks, subtasks, employees, activities } = useApp();
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
    { id: 'archive', label: 'Archive', icon: Archive }
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">Insights</h1>
          <p className="text-[#94A3B8]">Performance, activity, and history in one place</p>
        </div>
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="px-4 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center bg-[#0F172A] border border-[rgba(34,197,94,0.1)] w-fit mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
    if (progress >= 80) return 'text-[#10b981]';
    if (progress >= 50) return 'text-[#22C55E]';
    if (progress >= 25) return 'text-[#f59e0b]';
    return 'text-[#ff3b5c]';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 80) return 'bg-[#10b981]';
    if (progress >= 50) return 'bg-[#22C55E]';
    if (progress >= 25) return 'bg-[#f59e0b]';
    return 'bg-[#ff3b5c]';
  };

  const statCards = [
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate}%`, subtext: `${completedTasks} of ${totalTasks} tasks`, color: 'text-[#10b981]', bgColor: 'bg-[rgba(16,185,129,0.1)]' },
    { icon: Clock, label: 'In Progress', value: inProgressTasks.toString(), subtext: `${blockedTasks} blocked`, color: 'text-[#22C55E]', bgColor: 'bg-[rgba(34,197,94,0.1)]' },
    { icon: AlertCircle, label: 'Overdue', value: overdueTasks.toString(), subtext: `${dueThisWeek} due this week`, color: 'text-[#ff3b5c]', bgColor: 'bg-[rgba(255,59,92,0.1)]' },
    { icon: Target, label: 'Subtask Progress', value: `${subtaskCompletionRate}%`, subtext: `${completedSubtasks} of ${totalSubtasks}`, color: 'text-[#8b5cf6]', bgColor: 'bg-[rgba(139,92,246,0.1)]' }
  ];

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#94A3B8]',
    in_progress: 'bg-[#22C55E]',
    blocked: 'bg-[#ff3b5c]',
    completed: 'bg-[#8b5cf6]',
    approved: 'bg-[#10b981]'
  };

  const priorityColorMap: Record<string, string> = {
    urgent: 'text-[#ff3b5c]',
    high: 'text-[#f59e0b]',
    medium: 'text-[#22C55E]',
    low: 'text-[#94A3B8]'
  };
  const priorityBgMap: Record<string, string> = {
    urgent: 'bg-[rgba(255,59,92,0.1)]',
    high: 'bg-[rgba(245,158,11,0.1)]',
    medium: 'bg-[rgba(34,197,94,0.1)]',
    low: 'bg-[rgba(107,107,128,0.1)]'
  };

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
        <BarChart3 className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
        <p className="text-[#94A3B8]">No apps yet — create an app to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
              <div className={`p-2 mb-3 w-fit ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{card.value}</p>
              <p className="text-sm text-[#94A3B8] mt-1">{card.label}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Task Status Distribution</h3>
          <div className="space-y-3">
            {Object.entries(statusDistribution).map(([status, count]) => {
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#F8FAFC] capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-sm text-[#94A3B8]">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#1E293B]">
                    <div className={`h-2 ${statusColors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(priorityDistribution).map(([priority, count]) => (
              <div key={priority} className={`p-4 ${priorityBgMap[priority]} border border-[rgba(34,197,94,0.1)]`}>
                <p className={`text-2xl font-bold ${priorityColorMap[priority]}`}>{count}</p>
                <p className="text-sm text-[#94A3B8] capitalize">{priority}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Goal Progress</h3>
          <div className="space-y-4">
            {goalProgress.length === 0 && <p className="text-sm text-[#94A3B8]">No goals yet</p>}
            {goalProgress.map((goal) => (
              <div key={goal.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#F8FAFC]">{goal.name}</span>
                  <span className={`text-sm font-medium ${getProgressColor(goal.progress)}`}>{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-[#1E293B]">
                  <div className={`h-2 ${getProgressBg(goal.progress)}`} style={{ width: `${goal.progress}%` }} />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">{goal.completed} of {goal.total} tasks completed</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
          <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Team Workload</h3>
          <div className="space-y-3">
            {employeeWorkload.length === 0 && <p className="text-sm text-[#94A3B8]">No assignments yet</p>}
            {employeeWorkload.map((emp) => (
              <div key={emp.name} className="flex items-center gap-3 p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                <div className="w-10 h-10 bg-gradient-to-br from-[#22C55E] to-[#8b5cf6] flex items-center justify-center text-[#020617] font-bold">
                  {emp.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#F8FAFC]">{emp.name}</p>
                  <p className="text-xs text-[#94A3B8]">{emp.total} tasks · {emp.completed} completed · {emp.inProgress} in progress</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
        <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Upcoming Deadlines</h3>
        <div className="space-y-3">
          {upcomingDeadlines.length === 0 && <p className="text-sm text-[#94A3B8]">No upcoming deadlines</p>}
          {upcomingDeadlines.map((task) => {
            const daysLeft = task.dueDate ? differenceInDays(task.dueDate, new Date()) : 0;
            const isOverdue = daysLeft < 0;
            const isDueToday = daysLeft === 0;
            return (
              <div key={task.id} className="flex items-center justify-between p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                <div className="flex items-center gap-3">
                  {isOverdue ? <XCircle className="w-5 h-5 text-[#ff3b5c]" /> : isDueToday ? <AlertCircle className="w-5 h-5 text-[#f59e0b]" /> : <Calendar className="w-5 h-5 text-[#22C55E]" />}
                  <div>
                    <p className="text-sm font-medium text-[#F8FAFC]">{task.name}</p>
                    <p className="text-xs text-[#94A3B8]">{task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : 'No date'}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 ${
                  isOverdue ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                  isDueToday ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                  'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
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
      case 'task_approved': return 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]';
      case 'task_completed': return 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.2)]';
      case 'task_created': return 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]';
      case 'app_created': return 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.2)]';
      case 'goal_created': return 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]';
      default: return 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8] border-[rgba(107,107,128,0.2)]';
    }
  };

  const getTypeLabel = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
      {activities.length > 0 ? (
        <div className="divide-y divide-[rgba(34,197,94,0.1)]">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-5 hover:bg-[rgba(255,255,255,0.02)] transition">
              <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                activity.type === 'task_approved' ? 'bg-[#10b981]' :
                activity.type === 'task_completed' ? 'bg-[#22C55E]' :
                activity.type === 'task_created' ? 'bg-[#f59e0b]' :
                activity.type === 'app_created' ? 'bg-[#22C55E]' :
                'bg-[#94A3B8]'
              }`}>
                {activity.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[#F8FAFC]">
                      <span className="font-medium">{activity.userName}</span>{' '}
                      {activity.description}
                    </p>
                    {activity.relatedTo && (
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {activity.relatedTo.type}: {activity.relatedTo.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium whitespace-nowrap ${getTypeColor(activity.type)}`}>
                    {getTypeLabel(activity.type)}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ActivityIcon className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#94A3B8] text-lg mb-2">No activities yet</p>
          <p className="text-[#94A3B8] text-sm">Activities will appear here as you work on tasks</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search completed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
          {(['all', 'goal', 'task'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 text-sm capitalize ${filterType === t ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]' : 'text-[#94A3B8]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(139,92,246,0.1)]">
              <Target className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{completedGoals.length}</p>
              <p className="text-sm text-[#94A3B8]">Completed Goals</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(34,197,94,0.1)]">
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{completedTasks.length}</p>
              <p className="text-sm text-[#94A3B8]">Completed Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(16,185,129,0.1)]">
              <FileText className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{completedSubtaskCount}</p>
              <p className="text-sm text-[#94A3B8]">Completed Subtasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Archive className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-[#94A3B8]">No completed items found</p>
          </div>
        )}
        {filteredItems.map(item => {
          const isExpanded = expandedItems.has(item.id);
          const duration = getDuration(item.startDate, item.endDate);
          return (
            <div key={item.id} className="border-b border-[rgba(34,197,94,0.05)] last:border-b-0">
              <button onClick={() => toggleExpand(item.id)} className="w-full flex items-center gap-4 p-4 hover:bg-[rgba(255,255,255,0.02)] text-left">
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-[#94A3B8]" /> : <ChevronRight className="w-5 h-5 text-[#94A3B8]" />}
                </div>
                <div className={`p-2 ${item.type === 'goal' ? 'bg-[rgba(139,92,246,0.1)]' : 'bg-[rgba(34,197,94,0.1)]'}`}>
                  {item.type === 'goal' ? <Target className="w-4 h-4 text-[#8b5cf6]" /> : <CheckCircle className="w-4 h-4 text-[#22C55E]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#F8FAFC] truncate">{item.name}</p>
                    <span className={`text-xs px-2 py-0.5 ${
                      item.status === 'approved' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[#94A3B8]">
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
                      <p className="text-sm text-[#94A3B8] mb-1">Description</p>
                      <p className="text-sm text-[#F8FAFC]">{item.description}</p>
                    </div>
                  )}
                  {item.subtasks && item.subtasks.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#F8FAFC] mb-2">Subtasks ({item.subtasks.length})</p>
                      <div className="space-y-1">
                        {item.subtasks.map((subtask, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1">
                            {(subtask.status === 'approved' || subtask.status === 'completed') ? (
                              <CheckCircle className="w-4 h-4 text-[#10b981]" />
                            ) : (
                              <div className="w-4 h-4 border border-[#94A3B8]" />
                            )}
                            <span className={subtask.status === 'approved' || subtask.status === 'completed' ? 'text-[#94A3B8] line-through' : 'text-[#F8FAFC]'}>
                              {subtask.name}
                            </span>
                            {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                              <span className="text-xs text-[#94A3B8] ml-auto">
                                {subtask.assignedTo.map(getEmployeeName).join(', ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.completedAt && (
                    <div className="mt-4 pt-3 border-t border-[rgba(34,197,94,0.1)]">
                      <p className="text-xs text-[#94A3B8]">Completed on {formatDate(item.completedAt)}</p>
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
