import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Target,
  XCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter
} from 'lucide-react';
import {
  format,
  startOfQuarter,
  endOfQuarter,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  isPast
} from 'date-fns';
import { Task, TaskStatus } from '../types';

const statusColors: Record<TaskStatus, string> = {
  not_started: '#6b6b80',
  in_progress: '#00e5ff',
  blocked: '#ff3b5c',
  pending_qa: '#f59e0b',
  completed: '#8b5cf6',
  approved: '#10b981'
};

const statusLabels: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  pending_qa: 'Pending QA',
  completed: 'Completed',
  approved: 'Approved'
};

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (value.seconds) return new Date(value.seconds * 1000);
  return undefined;
}

type TaskTimelineProps = {
  tasks: Task[];
  filterStatus: TaskStatus | 'all';
  onStatusChange: (id: string, status: TaskStatus) => void;
  onSelect: (task: Task) => void;
  onFilterChange: (status: TaskStatus | 'all') => void;
};

export function TaskTimeline({ tasks, filterStatus, onStatusChange, onSelect, onFilterChange }: TaskTimelineProps) {
  const { goals, getAppById, getGoalById } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const qStart = startOfQuarter(currentDate);
  const qEnd = endOfQuarter(currentDate);
  const totalDays = differenceInDays(qEnd, qStart) + 1;
  const months = eachMonthOfInterval({ start: qStart, end: qEnd });

  const getDateLeft = (d: Date) => {
    const offset = differenceInDays(d, qStart);
    return `${Math.max(0, (offset / totalDays) * 100)}%`;
  };

  const getBarStyle = (start?: Date, end?: Date) => {
    if (!start) return { left: '0%', width: '0%' };
    const s = differenceInDays(start, qStart);
    const e = end ? differenceInDays(end, qStart) : s + 14;
    const left = Math.max(0, (s / totalDays) * 100);
    const width = Math.max(1, ((e - s + 1) / totalDays) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  const prevQuarter = () => setCurrentDate(subMonths(currentDate, 3));
  const nextQuarter = () => setCurrentDate(addMonths(currentDate, 3));
  const goToToday = () => setCurrentDate(new Date());

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const key = t.goalId || 'ungrouped';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    const result: { key: string; label: string; appColor: string; tasks: Task[] }[] = [];
    map.forEach((ts, key) => {
      if (key === 'ungrouped') {
        result.push({ key, label: 'Unassigned Tasks', appColor: '#6b6b80', tasks: ts });
      } else {
        const goal = getGoalById(key);
        const app = goal ? getAppById(goal.appId) : undefined;
        result.push({
          key,
          label: `${app?.name || 'App'} / ${goal?.name || 'Goal'}`,
          appColor: app?.color || '#00e5ff',
          tasks: ts
        });
      }
    });
    result.sort((a, b) => {
      const aMin = Math.min(...a.tasks.map(t => toDate(t.startDate)?.getTime() || 0));
      const bMin = Math.min(...b.tasks.map(t => toDate(t.startDate)?.getTime() || 0));
      return aMin - bMin;
    });
    return result;
  }, [tasks, getGoalById, getAppById]);

  const visibleGroups = filterStatus === 'all'
    ? groups
    : groups.map(g => ({ ...g, tasks: g.tasks.filter(t => t.status === filterStatus) }))
        .filter(g => g.tasks.length > 0);

  return (
    <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
      <div className="flex items-center justify-between p-4 border-b border-[rgba(0,229,255,0.1)]">
        <button onClick={prevQuarter} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
          <ChevronLeft className="w-5 h-5 text-[#f0f0f5]" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#f0f0f5]">
            {format(qStart, 'MMM yyyy')} - {format(qEnd, 'MMM yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.2)]"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6b6b80]" />
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value as TaskStatus | 'all')}
            className="px-2 py-1 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs"
          >
            <option value="all">All Statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button onClick={nextQuarter} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
            <ChevronRight className="w-5 h-5 text-[#f0f0f5]" />
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-56 flex-shrink-0 border-r border-[rgba(0,229,255,0.1)]">
          <div className="h-10 border-b border-[rgba(0,229,255,0.1)]" />
          {months.map(m => (
            <div key={m.toISOString()} className="h-10 border-b border-[rgba(0,229,255,0.05)] flex items-center px-3">
              <span className="text-xs font-medium text-[#6b6b80]">{format(m, 'MMMM')}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex h-10 border-b border-[rgba(0,229,255,0.1)] relative">
              {months.map(m => {
                const left = getDateLeft(startOfMonth(m));
                const width = getDateLeft(endOfMonth(m));
                return (
                  <div
                    key={m.toISOString()}
                    className="absolute top-0 bottom-0 border-r border-[rgba(0,229,255,0.1)]"
                    style={{ left, width }}
                  >
                    <span className="text-[10px] text-[#6b6b80] px-1">{format(m, 'MMM')}</span>
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-[rgba(0,229,255,0.05)]">
              {visibleGroups.length === 0 && (
                <div className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
                  <p className="text-[#6b6b80]">No tasks in this range</p>
                </div>
              )}
              {visibleGroups.map(group => (
                <div key={group.key}>
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(0,229,255,0.05)]">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.appColor }} />
                    <span className="font-semibold text-sm text-[#f0f0f5]">{group.label}</span>
                    <span className="text-xs text-[#6b6b80] ml-auto">{group.tasks.length} tasks</span>
                  </div>
                  {group.tasks.map(task => {
                    const start = toDate(task.startDate);
                    const end = toDate(task.endDate || task.dueDate);
                    const bar = getBarStyle(start, end);
                    const isOverdue = end && isPast(end) && task.status !== 'approved' && task.status !== 'completed';
                    const StatusIcon = task.status === 'approved' ? CheckCircle :
                      task.status === 'completed' ? Clock :
                      task.status === 'blocked' ? AlertCircle :
                      task.status === 'in_progress' ? Clock : XCircle;

                    return (
                      <div key={task.id} className="flex items-center ml-8 border-t border-[rgba(0,229,255,0.03)] hover:bg-[rgba(255,255,255,0.02)]">
                        <div className="w-48 flex-shrink-0 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="w-3 h-3 flex-shrink-0" style={{ color: statusColors[task.status] }} />
                            <span className="text-xs text-[#f0f0f5] truncate">{task.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#6b6b80]">{statusLabels[task.status]}</span>
                            {isOverdue && <span className="text-[10px] text-[#ff3b5c]">Overdue</span>}
                          </div>
                        </div>
                        <div className="flex-1 relative h-8">
                          {start && (
                            <button
                              className="absolute top-1 bottom-1 rounded flex items-center overflow-hidden cursor-pointer border"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                backgroundColor: `${statusColors[task.status]}25`,
                                borderColor: `${statusColors[task.status]}55`
                              }}
                              onClick={() => onSelect(task)}
                              title={`${task.name} — ${statusLabels[task.status]}`}
                            >
                              <div
                                className="h-full"
                                style={{ width: '100%', backgroundColor: `${statusColors[task.status]}55` }}
                              />
                              <span className="absolute inset-0 flex items-center px-1.5 text-[10px] text-[#f0f0f5] truncate">
                                {task.name}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[rgba(0,229,255,0.1)] flex items-center gap-4 text-xs text-[#6b6b80]">
        <span className="font-medium">Legend:</span>
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: statusColors[status as TaskStatus] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
