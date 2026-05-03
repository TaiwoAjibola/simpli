import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

export function MyWork() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { currentUser } = useAuth();
  const {
    getTasksForEmployee,
    getAppById,
    getGoalById,
    updateTask
  } = useApp();

  const myTasks = getTasksForEmployee(currentUser!.id);

  const groupedTasks = myTasks.reduce((acc, task) => {
    const goal = getGoalById(task.goalId);
    if (!goal) return acc;

    const app = getAppById(goal.appId);
    if (!app) return acc;

    if (!acc[app.id]) {
      acc[app.id] = {
        app,
        goals: {}
      };
    }

    if (!acc[app.id].goals[goal.id]) {
      acc[app.id].goals[goal.id] = {
        goal,
        tasks: []
      };
    }

    acc[app.id].goals[goal.id].tasks.push(task);

    return acc;
  }, {} as any);

  const [expandedApps, setExpandedApps] = useState<Set<string>>(
    new Set(Object.keys(groupedTasks))
  );
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleApp = (appId: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const toggleGoal = (goalId: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">My Work</h1>
        <p className="text-[#6b6b80]">{myTasks.length} tasks assigned to you</p>
      </div>

      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
        {Object.entries(groupedTasks).length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#6b6b80]">No tasks assigned yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,229,255,0.1)]">
            {Object.entries(groupedTasks).map(([appId, appData]: any) => (
              <div key={appId}>
                <button
                  onClick={() => toggleApp(appId)}
                  className="w-full px-6 py-4 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.02)] transition"
                >
                  {expandedApps.has(appId) ? (
                    <ChevronDown className="w-5 h-5 text-[#6b6b80]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#6b6b80]" />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#f0f0f5]">
                      {appData.app.name}
                    </h3>
                  </div>
                  <span className="text-sm text-[#6b6b80]">
                    {Object.values(appData.goals).reduce(
                      (sum: number, g: any) => sum + g.tasks.length,
                      0
                    )}{' '}
                    tasks
                  </span>
                </button>

                {expandedApps.has(appId) && (
                  <div className="bg-[#0e0e16]">
                    {Object.entries(appData.goals).map(([goalId, goalData]: any) => (
                      <div key={goalId}>
                        <button
                          onClick={() => toggleGoal(goalId)}
                          className="w-full px-12 py-3 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.02)] transition"
                        >
                          {expandedGoals.has(goalId) ? (
                            <ChevronDown className="w-4 h-4 text-[#6b6b80]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#6b6b80]" />
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-[#f0f0f5]">
                              {goalData.goal.name}
                            </p>
                          </div>
                          <span className="text-xs text-[#6b6b80]">
                            {goalData.tasks.length} tasks
                          </span>
                        </button>

                        {expandedGoals.has(goalId) && (
                          <div className="px-12 py-2 space-y-2">
                            {goalData.tasks.map((task: Task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                onClick={() => setSelectedTask(task)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onStatusChange,
  onClick
}: {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onClick: () => void;
}) {
  const statusConfig = {
    not_started: { icon: Circle, color: 'text-[#6b6b80]', bg: 'bg-[rgba(107,107,128,0.05)]', label: 'Not Started' },
    in_progress: { icon: Clock, color: 'text-[#00e5ff]', bg: 'bg-[rgba(0,229,255,0.05)]', label: 'In Progress' },
    blocked: { icon: XCircle, color: 'text-[#ff3b5c]', bg: 'bg-[rgba(255,59,92,0.05)]', label: 'Blocked' },
    completed: { icon: CheckCircle, color: 'text-[#8b5cf6]', bg: 'bg-[rgba(139,92,246,0.05)]', label: 'Completed' },
    approved: { icon: CheckCircle, color: 'text-[#10b981]', bg: 'bg-[rgba(16,185,129,0.05)]', label: 'Approved' }
  };

  const config = statusConfig[task.status];
  const Icon = config.icon;

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  return (
    <div
      className={`p-4 border border-[rgba(0,229,255,0.1)] ${config.bg} cursor-pointer hover:border-[rgba(0,229,255,0.3)] hover:shadow-md transition`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-[#f0f0f5]">{task.name}</h4>
              <p className="text-sm text-[#6b6b80] mt-1">{task.description}</p>
            </div>
            {task.priority === 'urgent' && (
              <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-medium px-2 py-1 ${priorityColors[task.priority]}`}>
              {task.priority.toUpperCase()}
            </span>

            <select
              value={task.status}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, e.target.value as TaskStatus);
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] px-2 py-1"
              disabled={task.status === 'approved'}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
              <option value="approved" disabled>
                Approved
              </option>
            </select>

            <span className="text-xs text-[#6b6b80]">
              Created {format(task.createdAt, 'MMM d')}
            </span>

            {task.completedAt && (
              <span className="text-xs text-[#6b6b80]">
                Completed {format(task.completedAt, 'MMM d')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
