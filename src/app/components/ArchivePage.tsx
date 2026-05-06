import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Archive,
  CheckCircle,
  Clock,
  Calendar,
  Target,
  Layers,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  User,
  FileText
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';

export function ArchivePage() {
  const { apps, goals, tasks, employees } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'goal' | 'task'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const selectedApp = apps.find(a => a.id === selectedAppId);
  const appGoals = goals.filter(g => g.appId === selectedAppId);
  const appGoalIds = appGoals.map(g => g.id);
  const appTasks = tasks.filter(t => appGoalIds.includes(t.goalId));

  const completedGoals = appGoals.filter(g => g.status === 'approved' || g.status === 'completed');
  const completedTasks = appTasks.filter(t => t.status === 'approved' || t.status === 'completed');

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
      goalName?: string;
      subtasks?: any[];
      completedAt?: any;
    }> = [];

    if (filterType === 'all' || filterType === 'goal') {
      completedGoals.forEach(goal => {
        items.push({
          id: goal.id,
          type: 'goal',
          name: goal.name,
          status: goal.status,
          startDate: goal.startDate,
          endDate: goal.endDate,
          assignedTo: [],
          description: goal.description,
          completedAt: goal.updatedAt
        });
      });
    }

    if (filterType === 'all' || filterType === 'task') {
      completedTasks.forEach(task => {
        const goal = goals.find(g => g.id === task.goalId);
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
          completedAt: task.updatedAt
        });
      });
    }

    if (searchQuery) {
      return items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items.sort((a, b) => {
      const dateA = a.completedAt?.seconds || 0;
      const dateB = b.completedAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [completedGoals, completedTasks, filterType, searchQuery, goals]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.name || 'Unknown';
  };

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Archive & History</h1>
          <p className="text-[#6b6b80]">View completed goals and tasks</p>
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
        </div>
      </div>

      {!selectedApp && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Archive className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80]">Select an app to view archive</p>
        </div>
      )}

      {selectedApp && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b80]" />
              <input
                type="text"
                placeholder="Search completed items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 text-sm ${filterType === 'all' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('goal')}
                className={`px-4 py-2 text-sm ${filterType === 'goal' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
              >
                Goals
              </button>
              <button
                onClick={() => setFilterType('task')}
                className={`px-4 py-2 text-sm ${filterType === 'task' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
              >
                Tasks
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(139,92,246,0.1)]">
                  <Target className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f0f0f5]">{completedGoals.length}</p>
                  <p className="text-sm text-[#6b6b80]">Completed Goals</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(0,229,255,0.1)]">
                  <CheckCircle className="w-5 h-5 text-[#00e5ff]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f0f0f5]">{completedTasks.length}</p>
                  <p className="text-sm text-[#6b6b80]">Completed Tasks</p>
                </div>
              </div>
            </div>
            <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(16,185,129,0.1)]">
                  <FileText className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f0f0f5]">
                    {completedTasks.reduce((sum, t) => sum + (t.subtasks?.filter(s => s.status === 'approved' || s.status === 'completed').length || 0), 0)}
                  </p>
                  <p className="text-sm text-[#6b6b80]">Completed Subtasks</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
            {filteredItems.length === 0 && (
              <div className="p-12 text-center">
                <Archive className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
                <p className="text-[#6b6b80]">No completed items found</p>
              </div>
            )}

            {filteredItems.map(item => {
              const isExpanded = expandedItems.has(item.id);
              const duration = getDuration(item.startDate, item.endDate);

              return (
                <div key={item.id} className="border-b border-[rgba(0,229,255,0.05)] last:border-b-0">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-[rgba(255,255,255,0.02)] text-left"
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#6b6b80]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[#6b6b80]" />
                      )}
                    </div>

                    <div className={`p-2 ${item.type === 'goal' ? 'bg-[rgba(139,92,246,0.1)]' : 'bg-[rgba(0,229,255,0.1)]'}`}>
                      {item.type === 'goal' ? (
                        <Target className="w-4 h-4 text-[#8b5cf6]" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-[#00e5ff]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#f0f0f5] truncate">{item.name}</p>
                        <span className={`text-xs px-2 py-0.5 ${
                          item.status === 'approved'
                            ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                            : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-[#6b6b80]">
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
                          <p className="text-sm text-[#6b6b80] mb-1">Description</p>
                          <p className="text-sm text-[#f0f0f5]">{item.description}</p>
                        </div>
                      )}

                      {item.subtasks && item.subtasks.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-[#f0f0f5] mb-2">Subtasks ({item.subtasks.length})</p>
                          <div className="space-y-1">
                            {item.subtasks.map((subtask, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm py-1">
                                {(subtask.status === 'approved' || subtask.status === 'completed') ? (
                                  <CheckCircle className="w-4 h-4 text-[#10b981]" />
                                ) : (
                                  <div className="w-4 h-4 border border-[#6b6b80]" />
                                )}
                                <span className={subtask.status === 'approved' || subtask.status === 'completed' ? 'text-[#6b6b80] line-through' : 'text-[#f0f0f5]'}>
                                  {subtask.name}
                                </span>
                                {subtask.assignedTo && subtask.assignedTo.length > 0 && (
                                  <span className="text-xs text-[#6b6b80] ml-auto">
                                    {subtask.assignedTo.map(getEmployeeName).join(', ')}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.completedAt && (
                        <div className="mt-4 pt-3 border-t border-[rgba(0,229,255,0.1)]">
                          <p className="text-xs text-[#6b6b80]">
                            Completed on {formatDate(item.completedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
