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
  not_started: '#787774',
  in_progress: '#2383E2',
  blocked: '#EB5757',
  pending_qa: '#9B9A97',
  completed: '#0F7B6C',
  approved: '#0F7B6C'
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

  const todayLeft = useMemo(() => {
    const now = new Date();
    if (now < qStart || now > qEnd) return null;
    return getDateLeft(now);
  }, [qStart, qEnd, totalDays]);

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
        result.push({ key, label: 'Unassigned', appColor: '#787774', tasks: ts });
      } else {
        const goal = getGoalById(key);
        const app = goal ? getAppById(goal.appId) : undefined;
        result.push({
          key,
          label: `${app?.name || 'App'} / ${goal?.name || 'Goal'}`,
          appColor: '#2383E2',
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
    <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="flex items-center justify-between p-4 border-b border-[#E9E9E7]">
        <button onClick={prevQuarter} className="p-1.5 hover:bg-[#F7F7F5] rounded-[6px] cursor-pointer transition-colors duration-150">
          <ChevronLeft className="w-4 h-4 text-[#787774]" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-semibold text-[#37352F] tracking-[-0.01em]">
            {format(qStart, 'MMM yyyy')} – {format(qEnd, 'MMM yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-[12px] font-medium bg-white border border-[#E9E9E7] rounded-[6px] text-[#37352F] hover:bg-[#F7F7F5] cursor-pointer transition-colors duration-150"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#787774]" />
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value as TaskStatus | 'all')}
            className="px-2 py-1 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[12px] outline-none focus:border-[#2383E2] cursor-pointer"
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button onClick={nextQuarter} className="p-1.5 hover:bg-[#F7F7F5] rounded-[6px] cursor-pointer transition-colors duration-150">
            <ChevronRight className="w-4 h-4 text-[#787774]" />
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-56 flex-shrink-0 border-r border-[#E9E9E7] bg-[#FBFBFA]">
          <div className="h-10 border-b border-[#E9E9E7] flex items-center px-3">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#787774]">Timeline</span>
          </div>
          {months.map(m => (
            <div key={m.toISOString()} className="h-10 border-b border-[#E9E9E7] flex items-center px-3">
              <span className="text-[12px] font-medium text-[#787774]">{format(m, 'MMMM')}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex h-10 border-b border-[#E9E9E7] relative bg-white">
              {months.map(m => {
                const left = getDateLeft(startOfMonth(m));
                const right = getDateLeft(endOfMonth(m));
                const widthNum = parseFloat(right) - parseFloat(left);
                return (
                  <div
                    key={m.toISOString()}
                    className="absolute top-0 bottom-0 border-r border-[#E9E9E7] flex items-center"
                    style={{ left, width: `${widthNum}%` }}
                  >
                    <span className="text-[11px] font-medium text-[#787774] px-2">{format(m, 'MMM')}</span>
                  </div>
                );
              })}
              {todayLeft && (
                <div className="absolute top-0 bottom-0 w-px bg-[#2383E2] pointer-events-none" style={{ left: todayLeft }}>
                  <span className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2383E2]" />
                </div>
              )}
            </div>

            <div className="divide-y divide-[#E9E9E7] relative">
              {todayLeft && (
                <div className="absolute inset-y-0 w-px bg-[#2383E2]/30 pointer-events-none" style={{ left: todayLeft }} />
              )}
              {visibleGroups.length === 0 && (
                <div className="p-12 text-center bg-white">
                  <span className="w-12 h-12 rounded-[8px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-[#9B9A97]" />
                  </span>
                  <p className="text-[14px] text-[#787774]">No tasks in this range</p>
                </div>
              )}
              {visibleGroups.map(group => (
                <div key={group.key} className="bg-white">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E9E9E7] bg-[#FBFBFA]">
                    <span className="w-2 h-2 rounded-full bg-[#2383E2] shrink-0" />
                    <span className="font-medium text-[12px] text-[#37352F] truncate">{group.label}</span>
                    <span className="text-[11px] text-[#787774] ml-auto bg-white border border-[#E9E9E7] rounded-[6px] px-1.5 py-0.5">{group.tasks.length}</span>
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
                      <div key={task.id} className="flex items-center border-t border-[#E9E9E7] hover:bg-[#F7F7F5] transition-colors duration-150">
                        <div className="w-48 shrink-0 px-3 py-2 border-r border-[#E9E9E7]/60">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="w-3 h-3 shrink-0" style={{ color: statusColors[task.status] }} />
                            <span className="text-[12px] text-[#37352F] truncate font-medium">{task.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[#787774]">{statusLabels[task.status]}</span>
                            {isOverdue && <span className="text-[11px] font-medium text-[#EB5757]">Overdue</span>}
                          </div>
                        </div>
                        <div className="flex-1 relative h-8 ml-2">
                          {start && (
                            <button
                              className="absolute top-1.5 bottom-1.5 rounded-[6px] flex items-center overflow-hidden cursor-pointer border transition-colors duration-150"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                backgroundColor: task.status === 'blocked' ? '#EB5757' : task.status === 'in_progress' ? '#2383E2' : task.status === 'approved' || task.status === 'completed' ? '#0F7B6C' : '#787774',
                                borderColor: task.status === 'blocked' ? '#EB5757' : task.status === 'in_progress' ? '#2383E2' : task.status === 'approved' || task.status === 'completed' ? '#0F7B6C' : '#787774'
                              }}
                              onClick={() => onSelect(task)}
                              title={`${task.name} — ${statusLabels[task.status]}`}
                            >
                              <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-white truncate">
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

      <div className="p-3 border-t border-[#E9E9E7] flex flex-wrap items-center gap-4 text-[12px] text-[#787774] bg-[#FBFBFA]">
        <span className="font-medium text-[#37352F]">Legend</span>
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] border border-[#E9E9E7]" style={{ backgroundColor: statusColors[status as TaskStatus] }} />
            <span>{label}</span>
          </div>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#2383E2] rounded-full" /> Today
        </span>
      </div>
    </div>
  );
}
