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
    employees
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
