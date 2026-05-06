import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Star,
  Target,
  Layers,
  BarChart3,
  Calendar,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, differenceInDays, isPast, isToday, isFuture } from 'date-fns';

export function AnalyticsPage() {
  const { apps, goals, tasks, subtasks, employees } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');

  const selectedApp = apps.find(a => a.id === selectedAppId);
  const appGoals = goals.filter(g => g.appId === selectedAppId);
  const appGoalIds = appGoals.map(g => g.id);
  const appTasks = tasks.filter(t => appGoalIds.includes(t.goalId));
  const appTaskIds = appTasks.map(t => t.id);
  const appSubtasks = subtasks.filter(s => appTaskIds.includes(s.taskId));

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

  const priorityDistribution = {
    urgent: appTasks.filter(t => t.priority === 'urgent').length,
    high: appTasks.filter(t => t.priority === 'high').length,
    medium: appTasks.filter(t => t.priority === 'medium').length,
    low: appTasks.filter(t => t.priority === 'low').length
  };

  const statusDistribution = {
    not_started: notStartedTasks,
    in_progress: inProgressTasks,
    blocked: blockedTasks,
    completed: appTasks.filter(t => t.status === 'completed').length,
    approved: appTasks.filter(t => t.status === 'approved').length
  };

  const employeeWorkload = employees.map(emp => {
    const assignedTasks = appTasks.filter(t => t.assignedTo.includes(emp.id));
    const completedAssigned = assignedTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
    return {
      name: emp.name,
      total: assignedTasks.length,
      completed: completedAssigned,
      inProgress: assignedTasks.filter(t => t.status === 'in_progress').length,
      blocked: assignedTasks.filter(t => t.status === 'blocked').length
    };
  }).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

  const goalProgress = appGoals.map(goal => {
    const goalTasks = tasks.filter(t => t.goalId === goal.id);
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
    if (progress >= 50) return 'text-[#00e5ff]';
    if (progress >= 25) return 'text-[#f59e0b]';
    return 'text-[#ff3b5c]';
  };

  const getProgressBg = (progress: number) => {
    if (progress >= 80) return 'bg-[#10b981]';
    if (progress >= 50) return 'bg-[#00e5ff]';
    if (progress >= 25) return 'bg-[#f59e0b]';
    return 'bg-[#ff3b5c]';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Analytics</h1>
          <p className="text-[#6b6b80]">Track progress and performance across your apps</p>
        </div>
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="px-4 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
        >
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      {!selectedApp && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <BarChart3 className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80]">Select an app to view analytics</p>
        </div>
      )}

      {selectedApp && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle}
              label="Completion Rate"
              value={`${completionRate}%`}
              subtext={`${completedTasks} of ${totalTasks} tasks`}
              color="text-[#10b981]"
              bgColor="bg-[rgba(16,185,129,0.1)]"
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressTasks.toString()}
              subtext={`${blockedTasks} blocked`}
              color="text-[#00e5ff]"
              bgColor="bg-[rgba(0,229,255,0.1)]"
            />
            <StatCard
              icon={AlertCircle}
              label="Overdue"
              value={overdueTasks.toString()}
              subtext={`${dueThisWeek} due this week`}
              color="text-[#ff3b5c]"
              bgColor="bg-[rgba(255,59,92,0.1)]"
            />
            <StatCard
              icon={Target}
              label="Subtask Progress"
              value={`${subtaskCompletionRate}%`}
              subtext={`${completedSubtasks} of ${totalSubtasks}`}
              color="text-[#8b5cf6]"
              bgColor="bg-[rgba(139,92,246,0.1)]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
              <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">Task Status Distribution</h3>
              <div className="space-y-3">
                {Object.entries(statusDistribution).map(([status, count]) => {
                  const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  const colors: Record<string, string> = {
                    not_started: 'bg-[#6b6b80]',
                    in_progress: 'bg-[#00e5ff]',
                    blocked: 'bg-[#ff3b5c]',
                    completed: 'bg-[#8b5cf6]',
                    approved: 'bg-[#10b981]'
                  };
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#f0f0f5] capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-sm text-[#6b6b80]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#1a1a2e]">
                        <div
                          className={`h-2 ${colors[status]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
              <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">Priority Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(priorityDistribution).map(([priority, count]) => {
                  const colors: Record<string, string> = {
                    urgent: 'text-[#ff3b5c]',
                    high: 'text-[#f59e0b]',
                    medium: 'text-[#00e5ff]',
                    low: 'text-[#6b6b80]'
                  };
                  const bgColors: Record<string, string> = {
                    urgent: 'bg-[rgba(255,59,92,0.1)]',
                    high: 'bg-[rgba(245,158,11,0.1)]',
                    medium: 'bg-[rgba(0,229,255,0.1)]',
                    low: 'bg-[rgba(107,107,128,0.1)]'
                  };
                  return (
                    <div key={priority} className={`p-4 ${bgColors[priority]} border border-[rgba(0,229,255,0.1)]`}>
                      <p className={`text-2xl font-bold ${colors[priority]}`}>{count}</p>
                      <p className="text-sm text-[#6b6b80] capitalize">{priority}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
              <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">Goal Progress</h3>
              <div className="space-y-4">
                {goalProgress.length === 0 && (
                  <p className="text-sm text-[#6b6b80]">No goals yet</p>
                )}
                {goalProgress.map((goal) => (
                  <div key={goal.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#f0f0f5]">{goal.name}</span>
                      <span className={`text-sm font-medium ${getProgressColor(goal.progress)}`}>{goal.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#1a1a2e]">
                      <div
                        className={`h-2 ${getProgressBg(goal.progress)}`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#6b6b80] mt-1">{goal.completed} of {goal.total} tasks completed</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
              <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">Team Workload</h3>
              <div className="space-y-3">
                {employeeWorkload.length === 0 && (
                  <p className="text-sm text-[#6b6b80]">No assignments yet</p>
                )}
                {employeeWorkload.map((emp) => (
                  <div key={emp.name} className="flex items-center gap-3 p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#f0f0f5]">{emp.name}</p>
                      <p className="text-xs text-[#6b6b80]">{emp.total} tasks · {emp.completed} completed · {emp.inProgress} in progress</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
            <h3 className="text-lg font-semibold text-[#f0f0f5] mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 && (
                <p className="text-sm text-[#6b6b80]">No upcoming deadlines</p>
              )}
              {upcomingDeadlines.map((task) => {
                const daysLeft = task.dueDate ? differenceInDays(task.dueDate, new Date()) : 0;
                const isOverdue = daysLeft < 0;
                const isDueToday = daysLeft === 0;
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                    <div className="flex items-center gap-3">
                      {isOverdue ? (
                        <XCircle className="w-5 h-5 text-[#ff3b5c]" />
                      ) : isDueToday ? (
                        <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
                      ) : (
                        <Calendar className="w-5 h-5 text-[#00e5ff]" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#f0f0f5]">{task.name}</p>
                        <p className="text-xs text-[#6b6b80]">{task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : 'No date'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 ${
                      isOverdue ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                      isDueToday ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                      'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]'
                    }`}>
                      {isOverdue ? `${Math.abs(daysLeft)}d overdue` :
                       isDueToday ? 'Due today' :
                       `${daysLeft}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, bgColor }: any) {
  return (
    <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#f0f0f5]">{value}</p>
      <p className="text-sm text-[#6b6b80] mt-1">{label}</p>
      <p className="text-xs text-[#6b6b80] mt-1">{subtext}</p>
    </div>
  );
}
