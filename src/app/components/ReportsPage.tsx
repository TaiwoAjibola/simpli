import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  FileText,
  Sparkles,
  ArrowUpRight,
  Users,
  Layers
} from 'lucide-react';
import { InsightsPage } from './InsightsPage';
import { buildReportSnapshot } from '../../utils/reportLogic';

type ReportTab = 'analytics' | 'reports' | 'activity' | 'insights';

export function ReportsPage() {
  const { apps, goals, tasks, defects, repositories, employees, activities, reports } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('analytics');
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || 'all');
  const [dateRange, setDateRange] = useState('all');

  const canViewAll = hasPermission('view_all_apps');
  const visibleTasks = selectedAppId === 'all' ? tasks : tasks.filter(t => t.appId === selectedAppId);
  const visibleGoals = selectedAppId === 'all' ? goals : goals.filter(g => g.appId === selectedAppId);
  const visibleDefects = selectedAppId === 'all' ? defects : defects.filter(d => d.applicationId === selectedAppId);

  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
  const inProgressTasks = visibleTasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = visibleTasks.filter(t => t.status === 'blocked').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const overdueTasks = visibleTasks.filter(t => {
    if (!t.dueDate) return false;
    return t.dueDate < new Date() && t.status !== 'approved' && t.status !== 'completed';
  }).length;

  const statCards = [
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate}%`, subtext: `${completedTasks} of ${totalTasks} tasks`, color: 'text-[#10b981]', bgColor: 'bg-[rgba(16,185,129,0.1)]' },
    { icon: Clock, label: 'In Progress', value: inProgressTasks.toString(), subtext: `${blockedTasks} blocked`, color: 'text-[#22C55E]', bgColor: 'bg-[rgba(34,197,94,0.1)]' },
    { icon: AlertCircle, label: 'Overdue', value: overdueTasks.toString(), subtext: 'Need attention', color: 'text-[#ff3b5c]', bgColor: 'bg-[rgba(255,59,92,0.1)]' },
    { icon: Target, label: 'Goals', value: visibleGoals.length.toString(), subtext: `${visibleGoals.filter(g => g.status === 'completed').length} completed`, color: 'text-[#8b5cf6]', bgColor: 'bg-[rgba(139,92,246,0.1)]' }
  ];

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#94A3B8]',
    in_progress: 'bg-[#22C55E]',
    blocked: 'bg-[#ff3b5c]',
    completed: 'bg-[#8b5cf6]',
    approved: 'bg-[#10b981]'
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Reports & Analytics</h1>
          <p className="text-[#6D28D9] mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          >
            <option value="all">All Apps</option>
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium text-sm hover:bg-[#6D28D9] rounded-xl">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card rounded-xl p-6">
              <div className={`p-2 mb-3 w-fit ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-[#4C1D95]">{card.value}</p>
              <p className="text-sm text-[#6D28D9] mt-1">{card.label}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center glass w-fit mb-6 rounded-lg p-1">
        {[
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'insights', label: 'AI Insights', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'text-[#7C3AED] bg-[rgba(124,58,237,0.1)]'
                  : 'text-[#6D28D9] hover:text-[#4C1D95]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#4C1D95] mb-4">Task Status Distribution</h3>
              <div className="space-y-3">
                {[
                  { status: 'approved', label: 'Approved', color: 'bg-[#10b981]' },
                  { status: 'completed', label: 'Completed', color: 'bg-[#8b5cf6]' },
                  { status: 'in_progress', label: 'In Progress', color: 'bg-[#22C55E]' },
                  { status: 'blocked', label: 'Blocked', color: 'bg-[#ff3b5c]' },
                  { status: 'not_started', label: 'Not Started', color: 'bg-[#94A3B8]' }
                ].map(item => {
                  const count = visibleTasks.filter(t => t.status === item.status).length;
                  const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#4C1D95]">{item.label}</span>
                        <span className="text-sm text-[#6D28D9]">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#F5F3FF] rounded-full overflow-hidden">
                        <div className={`h-2 ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#4C1D95] mb-4">Team Workload</h3>
              <div className="space-y-3">
                {employees.map(emp => {
                  const assignedTasks = visibleTasks.filter(t => t.assignedTo.includes(emp.id));
                  const completed = assignedTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-bold rounded-full">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#4C1D95]">{emp.name}</p>
                        <p className="text-xs text-[#6D28D9]">{assignedTasks.length} tasks · {completed} completed</p>
                      </div>
                      <div className="w-16 h-1.5 bg-[#E9D5FF] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7C3AED] to-[#22C55E] rounded-full"
                          style={{ width: `${assignedTasks.length > 0 ? Math.round((completed / assignedTasks.length) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#4C1D95] mb-4">Goal Progress</h3>
              <div className="space-y-4">
                {visibleGoals.map(goal => {
                  const goalTasks = visibleTasks.filter(t => t.goalId === goal.id);
                  const completed = goalTasks.filter(t => t.status === 'approved').length;
                  const progress = goalTasks.length > 0 ? Math.round((completed / goalTasks.length) * 100) : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#4C1D95]">{goal.name}</span>
                        <span className="text-sm font-medium text-[#7C3AED]">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F5F3FF] rounded-full overflow-hidden">
                        <div className="h-full bg-[#7C3AED]" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">{completed} of {goalTasks.length} tasks</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#4C1D95] mb-4">Defect Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[#ff3b5c]" />
                    <span className="text-sm text-[#4C1D95]">Open Defects</span>
                  </div>
                  <span className="text-lg font-bold text-[#ff3b5c]">{visibleDefects.filter(d => !['resolved', 'closed'].includes(d.status)).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#10b981]" />
                    <span className="text-sm text-[#4C1D95]">Resolved</span>
                  </div>
                  <span className="text-lg font-bold text-[#10b981]">{visibleDefects.filter(d => d.status === 'resolved').length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-sm text-[#4C1D95]">In Review</span>
                  </div>
                  <span className="text-lg font-bold text-[#F59E0B]">{visibleDefects.filter(d => d.status === 'pending_qa').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-[#4C1D95]">Generated Reports</h2>
            <button
              onClick={() => setActiveTab('insights')}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium text-sm hover:bg-[#6D28D9] rounded-xl"
            >
              <Sparkles className="w-4 h-4" />
              Generate AI Report
            </button>
          </div>
          {reports.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
              <p className="text-[#6D28D9]">No reports generated yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#4C1D95]">{report.title}</h3>
                      <p className="text-sm text-[#6D28D9]">Generated {report.createdAt ? report.createdAt.toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button className="p-2 text-[#6D28D9] hover:text-[#7C3AED] transition">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activities.slice(0, 15).map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold ${
                  activity.type === 'task_approved' ? 'bg-[#10b981]' :
                  activity.type === 'task_completed' ? 'bg-[#22C55E]' :
                  'bg-[#7C3AED]'
                }`}>
                  {activity.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#4C1D95]">
                    <span className="font-medium">{activity.userName}</span>{' '}
                    {activity.description}
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {activity.timestamp ? activity.timestamp.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <InsightsPage />
      )}
    </div>
  );
}