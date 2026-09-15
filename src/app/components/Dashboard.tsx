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

  const bgColors = {
    'task_approved': 'bg-[#7C3AED]',
    'task_completed': 'bg-[#A78BFA]',
    default: 'bg-[#6D28D9]'
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Dashboard</h1>
          <p className="text-foreground">Welcome back, {currentUser?.name}</p>
        </div>
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white rounded-full text-sm text-foreground border border-[#E9D5FF]">
          <span className="w-2 h-2 rounded-full bg-[#A78BFA] animate-pulse" />
          Simpli is running smoothly
        </div>
        <button
          onClick={() => onNavigate('my-work')}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-full text-sm font-medium hover:bg-[#6D28D9] transition"
        >
          <FileText className="w-4 h-4" />
          My Work
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          icon={CheckCircle2}
          color="cyan"
          trend={`${completionRate}% completed`}
          percentage={completionRate}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          color="purple"
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
        <div className="lg:col-span-2 glass-card rounded-xl p-6" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <button
              onClick={() => onNavigate('reports')}
              className="group text-sm text-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 hover:bg-[rgba(124,58,237,0.05)] transition"
              >
                <div className={`w-8 h-8 flex items-center justify-center ${
                  activity.type === 'task_approved' ? bgColors['task_approved'] :
                  activity.type === 'task_completed' ? bgColors['task_completed'] :
                  bgColors.default
                }`}>
                  {activity.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.userName}</span>{' '}
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(activity.timestamp, 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No activity yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canViewAll && (
            <div className="glass-card rounded-xl p-6">
              <h3 className="font-bold text-foreground mb-4">Quick Stats</h3>
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

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-bold text-foreground mb-4">Urgent Tasks</h3>
            {priorityTasks.length > 0 ? (
              <div className="space-y-2">
                {priorityTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-[rgba(124,58,237,0.1)] border border-[rgba(255,59,92,0.2)]"
                  >
                    <p className="text-sm font-medium text-foreground">{task.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-destructive font-medium">URGENT</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No urgent tasks</p>
            )}
          </div>
        </div>
      </div>

      {canViewAll && activeApps.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Active Projects</h2>
  <button
      onClick={() => onNavigate('projects')}
      className="group text-sm text-[#7C3AED] hover:text-foreground flex items-center gap-1 cursor-pointer"
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
                  className="group p-4 border border-[rgba(124,58,237,0.1)] hover:border-[#7C3AED] transition cursor-pointer bg-white"
                  onClick={() => onNavigate('app-details', app.id)}
                >
                  <h3 className="font-semibold text-foreground mb-2">{app.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {app.description}
                  </p>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">
                      {appGoals.length} goals
                    </span>
                    <span className="text-foreground font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-[rgba(124,58,237,0.1)] h-1.5">
                    <div
                      className="bg-[#7C3AED] h-1.5 transition-all"
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
  color: 'cyan' | 'purple' | 'red' | 'green';
  trend: string;
  percentage: number;
}) {
  const colors = {
    cyan: { bg: '#7C3AED' },
    purple: { bg: '#A78BFA' },
    red: { bg: '#7C3AED' },
    green: { bg: '#A78BFA' }
  };

  const { bg } = colors[color];
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="group bg-white rounded-2xl p-6 relative overflow-hidden border border-[#E9D5FF] hover:border-[#7C3AED]/30 cursor-default transition-all duration-150">
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 bg-[#7C3AED]"></div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="rgba(124,58,237,0.1)"
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
            <Icon className="w-6 h-6" style={{ color: bg }} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-foreground mt-1">{title}</p>
        <p className="text-xs text-foreground/60 mt-2">{trend}</p>
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
      className="group w-full flex items-center justify-between p-3 bg-white border border-[#E9D5FF] hover:border-[#7C3AED] transition cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-[#7C3AED]" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </button>
  );
}
