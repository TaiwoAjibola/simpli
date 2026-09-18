import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Activity,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Sparkles,
} from 'lucide-react';
import { InsightsPage } from './InsightsPage';

type ReportTab = 'analytics' | 'reports' | 'activity' | 'insights';

export function ReportsPage() {
  const { apps, goals, tasks, defects, employees, activities, reports } = useApp();
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('analytics');
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || 'all');

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
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate}%`, subtext: `${completedTasks} of ${totalTasks} tasks` },
    { icon: Clock, label: 'In Progress', value: inProgressTasks.toString(), subtext: `${blockedTasks} blocked` },
    { icon: AlertCircle, label: 'Overdue', value: overdueTasks.toString(), subtext: 'Need attention' },
    { icon: Target, label: 'Goals', value: visibleGoals.length.toString(), subtext: `${visibleGoals.filter(g => g.status === 'completed').length} completed` }
  ];

  return (
    <div className="bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Reports & Analytics</h1>
          <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1a6fc7] rounded-[6px] transition-colors duration-150 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-[#E9E9E7] rounded-lg p-5">
              <div className="p-2 mb-3 w-fit bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
                <Icon className="w-5 h-5 text-[#787774]" />
              </div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{card.value}</p>
              <p className="text-sm text-[#37352F] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{card.label}</p>
              <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center bg-[#E9E9E7] rounded-md p-1 w-fit mb-6">
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
              className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-[6px] transition-colors duration-150 cursor-pointer ${activeTab === tab.id ? 'bg-white text-[#37352F] shadow-sm border border-[#E9E9E7]' : 'text-[#787774] hover:text-[#37352F]'}`}
              style={{ fontFamily: 'Inter, sans-serif' }}
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
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Task Status Distribution</h3>
              <div className="space-y-3">
                {[
                  { status: 'approved', label: 'Approved' },
                  { status: 'completed', label: 'Completed' },
                  { status: 'in_progress', label: 'In Progress' },
                  { status: 'blocked', label: 'Blocked' },
                  { status: 'not_started', label: 'Not Started' }
                ].map(item => {
                  const count = visibleTasks.filter(t => t.status === item.status).length;
                  const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{item.label}</span>
                        <span className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                        <div className="h-1.5 bg-[#2383E2] rounded-full transition-all duration-150" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Team Workload</h3>
              <div className="space-y-3">
                {employees.length === 0 && <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No team members</p>}
                {employees.map(emp => {
                  const assignedTasks = visibleTasks.filter(t => t.assignedTo.includes(emp.id));
                  const completed = assignedTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                  const pct = assignedTasks.length > 0 ? Math.round((completed / assignedTasks.length) * 100) : 0;
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F7F5] transition-colors duration-150">
                      <div className="w-8 h-8 bg-[#E9E9E7] flex items-center justify-center text-[#37352F] text-xs font-medium rounded-md" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{emp.name}</p>
                        <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{assignedTasks.length} tasks · {completed} completed</p>
                      </div>
                      <div className="w-16 h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2383E2] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Goal Progress</h3>
              <div className="space-y-4">
                {visibleGoals.length === 0 && <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No goals</p>}
                {visibleGoals.map(goal => {
                  const goalTasks = visibleTasks.filter(t => t.goalId === goal.id);
                  const completed = goalTasks.filter(t => t.status === 'approved').length;
                  const progress = goalTasks.length > 0 ? Math.round((completed / goalTasks.length) * 100) : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{goal.name}</span>
                        <span className="text-sm font-medium text-[#2383E2]" style={{ fontFamily: 'Inter, sans-serif' }}>{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2383E2] rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-[#9B9A97] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{completed} of {goalTasks.length} tasks</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
              <h3 className="text-sm font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Defect Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-[#EB5757]" />
                    <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Open Defects</span>
                  </div>
                  <span className="text-sm font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{visibleDefects.filter(d => !['resolved', 'closed'].includes(d.status)).length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />
                    <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Resolved</span>
                  </div>
                  <span className="text-sm font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{visibleDefects.filter(d => d.status === 'resolved').length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#787774]" />
                    <span className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>In Review</span>
                  </div>
                  <span className="text-sm font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{visibleDefects.filter(d => d.status === 'pending_qa').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[16px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Generated Reports</h2>
            <button
              onClick={() => setActiveTab('insights')}
              className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1a6fc7] rounded-[6px] transition-colors duration-150 cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Sparkles className="w-4 h-4" />
              Generate AI Report
            </button>
          </div>
          {reports.length === 0 ? (
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-12 text-center">
              <FileText className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
              <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No reports generated yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="bg-white border border-[#E9E9E7] rounded-lg p-5 hover:bg-[#F7F7F5] transition-colors duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{report.title}</h3>
                      <p className="text-xs text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Generated {report.createdAt ? report.createdAt.toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-md transition-colors duration-150">
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
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-6">
          <h2 className="text-[16px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Recent Activity</h2>
          <div className="space-y-1">
            {activities.slice(0, 15).map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border-b border-[#E9E9E7] last:border-0 hover:bg-[#F7F7F5] rounded-md transition-colors duration-150">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium bg-[#E9E9E7] text-[#37352F] flex-shrink-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {activity.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="font-medium">{activity.userName}</span>{' '}
                    <span className="text-[#787774]">{activity.description}</span>
                  </p>
                  <p className="text-xs text-[#9B9A97] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {activity.timestamp ? activity.timestamp.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-1">
          <InsightsPage initialTab="ai" embedded appId={selectedAppId} />
        </div>
      )}
    </div>
  );
}
