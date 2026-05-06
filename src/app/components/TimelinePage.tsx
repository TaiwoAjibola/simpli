import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Layers,
  Target,
  CheckSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Star,
  Filter
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  isSameDay,
  isWithinInterval,
  isToday,
  isPast,
  isFuture
} from 'date-fns';

export function TimelinePage() {
  const { apps, goals, tasks, employees } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const selectedApp = apps.find(a => a.id === selectedAppId);
  const appGoals = goals.filter(g => g.appId === selectedAppId);
  const appGoalIds = appGoals.map(g => g.id);
  let appTasks = tasks.filter(t => appGoalIds.includes(t.goalId));

  if (filterStatus !== 'all') {
    appTasks = appTasks.filter(t => t.status === filterStatus);
  }

  const startDate = viewMode === 'month' ? startOfMonth(currentMonth) : startOfMonth(subMonths(currentMonth, 2));
  const endDate = viewMode === 'month' ? endOfMonth(currentMonth) : endOfMonth(addMonths(currentMonth, 0));
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#6b6b80]',
    in_progress: 'bg-[#00e5ff]',
    blocked: 'bg-[#ff3b5c]',
    completed: 'bg-[#8b5cf6]',
    approved: 'bg-[#10b981]'
  };

  const statusIcons: Record<string, any> = {
    not_started: XCircle,
    in_progress: Clock,
    blocked: AlertCircle,
    completed: CheckCircle,
    approved: CheckCircle
  };

  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'goal' | 'task';
      name: string;
      startDate: Date | null;
      endDate: Date | null;
      status: string;
      priority: string;
      assignedTo: string[];
      goalName?: string;
    }> = [];

    appGoals.forEach(goal => {
      if (goal.startDate || goal.endDate) {
        items.push({
          id: goal.id,
          type: 'goal',
          name: goal.name,
          startDate: goal.startDate || null,
          endDate: goal.endDate || null,
          status: 'goal',
          priority: '',
          assignedTo: []
        });
      }
    });

    appTasks.forEach(task => {
      const goal = goals.find(g => g.id === task.goalId);
      const start = task.startDate || task.createdAt;
      const end = task.endDate || task.dueDate || null;

      items.push({
        id: task.id,
        type: 'task',
        name: task.name,
        startDate: start || null,
        endDate: end,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo,
        goalName: goal?.name
      });
    });

    return items.filter(item => item.startDate && isWithinInterval(item.startDate, { start: startDate, end: endDate }));
  }, [appGoals, appTasks, startDate, endDate]);

  const getBarPosition = (itemStart: Date | null, itemEnd: Date | null) => {
    if (!itemStart) return { left: '0%', width: '0%' };
    const totalDays = differenceInDays(endDate, startDate) + 1;
    const startOffset = differenceInDays(itemStart, startDate);
    const left = Math.max(0, (startOffset / totalDays) * 100);

    let width: number;
    if (itemEnd) {
      const duration = differenceInDays(itemEnd, itemStart) + 1;
      width = (duration / totalDays) * 100;
    } else {
      width = (1 / totalDays) * 100;
    }

    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, viewMode === 'month' ? 1 : 3));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, viewMode === 'month' ? 1 : 3));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Timeline</h1>
          <p className="text-[#6b6b80]">Visualize project schedule and deadlines</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
          >
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>

          <div className="flex items-center bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm ${viewMode === 'month' ? 'text-[#00e5ff]' : 'text-[#6b6b80]'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('quarter')}
              className={`px-3 py-2 text-sm ${viewMode === 'quarter' ? 'text-[#00e5ff]' : 'text-[#6b6b80]'}`}
            >
              Quarter
            </button>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {!selectedApp && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Calendar className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80]">Select an app to view timeline</p>
        </div>
      )}

      {selectedApp && (
        <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(0,229,255,0.1)]">
            <button onClick={prevMonth} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
              <ChevronLeft className="w-5 h-5 text-[#f0f0f5]" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#f0f0f5]">
                {format(startDate, 'MMMM yyyy')}
                {viewMode === 'quarter' && ` - ${format(endDate, 'MMMM yyyy')}`}
              </h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.2)]"
              >
                Today
              </button>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-[rgba(255,255,255,0.02)] rounded">
              <ChevronRight className="w-5 h-5 text-[#f0f0f5]" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="flex border-b border-[rgba(0,229,255,0.1)]">
                <div className="w-64 flex-shrink-0 p-3 bg-[#1a1a2e] border-r border-[rgba(0,229,255,0.1)]">
                  <span className="text-sm font-medium text-[#f0f0f5]">Item</span>
                </div>
                <div className="flex-1 flex">
                  {days.map((day, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 min-w-[40px] p-2 text-center text-xs border-r border-[rgba(0,229,255,0.05)] ${
                        isToday(day) ? 'bg-[rgba(0,229,255,0.05)]' : ''
                      }`}
                    >
                      <span className={`font-medium ${isToday(day) ? 'text-[#00e5ff]' : 'text-[#6b6b80]'}`}>
                        {format(day, 'd')}
                      </span>
                      <span className="block text-[#6b6b80] opacity-50">{format(day, 'EEE')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {timelineItems.length === 0 && (
                  <div className="p-12 text-center">
                    <Calendar className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
                    <p className="text-[#6b6b80]">No items with dates in this period</p>
                  </div>
                )}

                {timelineItems.map(item => {
                  const pos = getBarPosition(item.startDate, item.endDate);
                  const Icon = item.type === 'goal' ? Target : (statusIcons[item.status] || CheckSquare);
                  const color = item.type === 'goal' ? 'bg-[#8b5cf6]' : statusColors[item.status];
                  const isOverdue = item.endDate && isPast(item.endDate) && item.status !== 'approved' && item.status !== 'completed';

                  return (
                    <div key={item.id} className="flex border-b border-[rgba(0,229,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                      <div className="w-64 flex-shrink-0 p-3 border-r border-[rgba(0,229,255,0.1)]">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${item.type === 'goal' ? 'text-[#8b5cf6]' : color.replace('bg-', 'text-')}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#f0f0f5] truncate">{item.name}</p>
                            {item.goalName && (
                              <p className="text-xs text-[#6b6b80] truncate">{item.goalName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.priority && (
                            <span className={`text-xs px-1.5 py-0.5 ${
                              item.priority === 'urgent' ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                              item.priority === 'high' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                              item.priority === 'medium' ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]' :
                              'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]'
                            }`}>
                              {item.priority}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs px-1.5 py-0.5 bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]">Overdue</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <div className="absolute inset-0 flex">
                          {days.map((day, idx) => (
                            <div
                              key={idx}
                              className={`flex-1 min-w-[40px] border-r border-[rgba(0,229,255,0.03)] ${
                                isToday(day) ? 'bg-[rgba(0,229,255,0.03)]' : ''
                              }`}
                            />
                          ))}
                        </div>
                        {item.startDate && (
                          <div
                            className={`absolute top-2 bottom-2 rounded ${color} ${isOverdue ? 'opacity-60' : 'opacity-80'} hover:opacity-100 transition cursor-pointer`}
                            style={{ left: pos.left, width: pos.width }}
                            title={`${item.name}: ${item.startDate ? format(item.startDate, 'MMM d') : ''} - ${item.endDate ? format(item.endDate, 'MMM d') : 'No end date'}`}
                          >
                            <div className="px-2 py-1 h-full flex items-center">
                              <span className="text-xs text-white font-medium truncate block">
                                {item.startDate && format(item.startDate, 'MMM d')}
                                {item.endDate && ` - ${format(item.endDate, 'MMM d')}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[rgba(0,229,255,0.1)] flex items-center gap-4 text-xs text-[#6b6b80]">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#6b6b80] rounded" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#00e5ff] rounded" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#ff3b5c] rounded" />
              <span>Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#8b5cf6] rounded" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#10b981] rounded" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#8b5cf6] rounded" />
              <span>Goal</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
