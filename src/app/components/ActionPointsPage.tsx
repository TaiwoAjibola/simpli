import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Plus,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  User,
  Calendar,
  ChevronDown,
  ChevronRight,
  Target,
  Layers,
  Check,
  X,
  Trash2,
  Edit2,
  Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ActionPointStatus } from '../types';

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ActionPointsPage() {
  const { currentUser, hasPermission } = useAuth();
  const {
    actionPoints,
    goals,
    tasks,
    employees,
    addActionPoint,
    updateActionPoint,
    deleteActionPoint,
    getGoalById,
    getAppById,
    getEmployeeById
  } = useApp();

  const canManage = hasPermission('manage_action_points');
  const [showForm, setShowForm] = useState(false);
  const [taskMode, setTaskMode] = useState<'single' | 'multi'>('single');
  const [editingActionPoint, setEditingActionPoint] = useState<ActionPoint | null>(null);
  const [viewingActionPoint, setViewingActionPoint] = useState<ActionPoint | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set([format(getWeekStart(), 'yyyy-MM-dd')]));
  const [filterStatus, setFilterStatus] = useState<ActionPointStatus | 'all'>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [view, setView] = useState<'list' | 'review'>('list');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalId: '',
    assignedTo: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    notes: '',
    date: '',
    linkType: 'new' as 'new' | 'existing',
    existingTaskId: ''
  });

  const [multiGoalId, setMultiGoalId] = useState('');
  const [multiDate, setMultiDate] = useState('');
  const [multiLinkType, setMultiLinkType] = useState<'new' | 'existing'>('new');
  const [multiRows, setMultiRows] = useState<{
    title: string;
    description: string;
    assignedTo: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    notes: string;
    existingTaskId: string;
  }[]>([]);

  const resetForm = () => {
    setFormData({
      title: '', description: '', goalId: '', assignedTo: [], priority: 'medium', notes: '',
      date: '', linkType: 'new', existingTaskId: ''
    });
    setMultiRows([]);
    setMultiGoalId('');
    setMultiDate('');
    setMultiLinkType('new');
    setShowForm(false);
    setTaskMode('single');
  };

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

  const groupedByWeek = useMemo(() => {
    const groups: Record<string, ActionPoint[]> = {};
    const filtered = actionPoints.filter(ap => {
      if (filterStatus !== 'all' && ap.status !== filterStatus) return false;
      if (filterGoal !== 'all' && ap.goalId !== filterGoal) return false;
      return true;
    });

    for (const ap of filtered) {
      const key = format(ap.weekStart, 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(ap);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, items]) => ({
        weekKey,
        weekStart: parseISO(weekKey),
        items
      }));
  }, [actionPoints, filterStatus, filterGoal]);

  const weeklyReview = useMemo(() => {
    const currentWeek = getWeekStart();
    const currentKey = format(currentWeek, 'yyyy-MM-dd');
    const thisWeek = actionPoints.filter(ap =>
      format(ap.weekStart, 'yyyy-MM-dd') === currentKey
    );
    const completed = thisWeek.filter(ap => ap.status === 'completed');
    const pending = thisWeek.filter(ap => ap.status === 'pending');
    const carriedOver = thisWeek.filter(ap => ap.status === 'carried_over');

    const prevWeekKey = format(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const carriedFromPrev = actionPoints.filter(ap =>
      format(ap.weekStart, 'yyyy-MM-dd') === prevWeekKey &&
      ap.status === 'carried_over'
    );

    return { thisWeek, completed, pending, carriedOver, carriedFromPrev, total: thisWeek.length };
  }, [actionPoints]);

  const toggleAssignee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(employeeId)
        ? prev.assignedTo.filter(id => id !== employeeId)
        : [...prev.assignedTo, employeeId]
    }));
  };

  const toggleMultiAssignee = (index: number, employeeId: string) => {
    setMultiRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      return {
        ...row,
        assignedTo: row.assignedTo.includes(employeeId)
          ? row.assignedTo.filter(id => id !== employeeId)
          : [...row.assignedTo, employeeId]
      };
    }));
  };

  const addMultiRow = () => {
    setMultiRows(prev => [...prev, {
      title: '', description: '', assignedTo: [], priority: 'medium' as const, notes: ''
    }]);
  };

  const updateMultiRow = (index: number, field: string, value: any) => {
    setMultiRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeMultiRow = (index: number) => {
    setMultiRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (taskMode === 'multi') {
      for (const row of multiRows) {
        await addActionPoint({
          title: row.title,
          description: row.description,
          goalId: multiGoalId,
          assignedTo: row.assignedTo,
          priority: row.priority,
          weekStart: getWeekStart(),
          createdBy: currentUser.id,
          notes: row.notes,
          taskId: row.existingTaskId || undefined,
          date: multiDate ? new Date(multiDate) : new Date()
        });
      }
    } else {
      await addActionPoint({
        title: formData.title,
        description: formData.description,
        goalId: formData.goalId,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        weekStart: getWeekStart(),
          createdBy: currentUser.id,
          notes: formData.notes,
        taskId: formData.linkType === 'existing' ? formData.existingTaskId : undefined,
        date: formData.date ? new Date(formData.date) : new Date()
      });
    }
    resetForm();
  };

  const handleStatusChange = async (apId: string, status: ActionPointStatus) => {
    await updateActionPoint(apId, {
      status,
      completedAt: status === 'completed' ? new Date() : undefined,
      completedBy: status === 'completed' ? currentUser?.id : undefined
    });
  };

  const weekStatusCounts = (items: ActionPoint[]) => {
    const done = items.filter(i => i.status === 'completed').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const carried = items.filter(i => i.status === 'carried_over').length;
    return { done, pending, carried, total: items.length };
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'text-[#ff3b5c] bg-[rgba(255,59,92,0.1)]';
      case 'high': return 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]';
      case 'medium': return 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]';
      default: return 'text-[#6b6b80] bg-[rgba(107,107,128,0.1)]';
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#f0f0f5] mb-1">Action Points</h1>
          <p className="text-sm text-[#6b6b80]">
            {actionPoints.length} total &middot; {actionPoints.filter(a => a.status === 'pending').length} pending
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs ${view === 'list' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
            >
              List
            </button>
            <button
              onClick={() => setView('review')}
              className={`px-3 py-1.5 text-xs ${view === 'review' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
            >
              Weekly Review
            </button>
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
            >
              <Plus className="w-4 h-4" />
              New Action Point
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">Create Action Point</h3>

          <div className="flex items-center gap-1 mb-6 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] w-fit">
            <button
              type="button"
              onClick={() => setTaskMode('single')}
              className={`px-4 py-2 text-sm font-medium transition ${
                taskMode === 'single'
                  ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]'
                  : 'text-[#6b6b80] hover:text-[#f0f0f5]'
              }`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setTaskMode('multi')}
              className={`px-4 py-2 text-sm font-medium transition ${
                taskMode === 'multi'
                  ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]'
                  : 'text-[#6b6b80] hover:text-[#f0f0f5]'
              }`}
            >
              Multiple
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {taskMode === 'single' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Goal</label>
                    <select
                      value={formData.goalId}
                      onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                      required
                    >
                      <option value="">Select goal</option>
                      {goals.map((goal) => {
                        const app = getAppById(goal.appId);
                        return (
                          <option key={goal.id} value={goal.id}>
                            {app?.name} / {goal.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Assign To</label>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((emp) => {
                      const selected = formData.assignedTo.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleAssignee(emp.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            selected
                              ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                              : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                          }`}
                        >
                          {emp.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                    rows={2}
                  />
                </div>

                <div className="pt-2 border-t border-[rgba(0,229,255,0.1)]">
                  <div className="flex items-center gap-4 mb-3">
                    <label className="text-sm font-medium text-[#f0f0f5]">Task</label>
                    <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, linkType: 'new', existingTaskId: '' }))}
                        className={`px-3 py-1.5 text-xs ${formData.linkType === 'new' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
                      >
                        Create New
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, linkType: 'existing' }))}
                        className={`px-3 py-1.5 text-xs ${formData.linkType === 'existing' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
                      >
                        Link Existing
                      </button>
                    </div>
                  </div>
                  {formData.linkType === 'existing' && (
                    <select
                      value={formData.existingTaskId}
                      onChange={(e) => {
                        const task = tasks.find(t => t.id === e.target.value);
                        if (task) {
                          const goal = getGoalById(task.goalId);
                          setFormData(prev => ({
                            ...prev,
                            existingTaskId: task.id,
                            title: task.name,
                            description: task.description,
                            goalId: task.goalId,
                            assignedTo: task.assignedTo,
                            priority: task.priority
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] outline-none text-sm"
                    >
                      <option value="">Select existing task...</option>
                      {tasks.filter(t => t.status !== 'approved').map(task => {
                        const goal = getGoalById(task.goalId);
                        const app = goal ? getAppById(goal.appId) : null;
                        return (
                          <option key={task.id} value={task.id}>
                            {app?.name} / {goal?.name} — {task.name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Goal (all rows)</label>
                    <select
                      value={multiGoalId}
                      onChange={(e) => setMultiGoalId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                      required
                    >
                      <option value="">Select goal</option>
                      {goals.map((goal) => {
                        const app = getAppById(goal.appId);
                        return (
                          <option key={goal.id} value={goal.id}>
                            {app?.name} / {goal.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Date (all rows)</label>
                    <input
                      type="date"
                      value={multiDate}
                      onChange={(e) => setMultiDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <label className="text-sm font-medium text-[#f0f0f5]">Task</label>
                  <div className="flex items-center gap-1 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                    <button
                      type="button"
                      onClick={() => setMultiLinkType('new')}
                      className={`px-3 py-1.5 text-xs ${multiLinkType === 'new' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
                    >
                      Create New
                    </button>
                    <button
                      type="button"
                      onClick={() => setMultiLinkType('existing')}
                      className={`px-3 py-1.5 text-xs ${multiLinkType === 'existing' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}
                    >
                      Link Existing
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-[#f0f0f5]">Action Points ({multiRows.length})</label>
                    <button
                      type="button"
                      onClick={addMultiRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>

                  {multiRows.length === 0 && (
                    <div className="text-center py-8 bg-[#1a1a2e] border border-dashed border-[rgba(0,229,255,0.1)]">
                      <p className="text-sm text-[#6b6b80]">Click "Add Row" to add action points</p>
                    </div>
                  )}

                  {multiRows.map((row, idx) => (
                    <div key={idx} className="p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#f0f0f5]">Item {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeMultiRow(idx)}
                          className="p-1 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Title</label>
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateMultiRow(idx, 'title', e.target.value)}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                            required={multiLinkType === 'new'}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Description</label>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateMultiRow(idx, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          />
                        </div>
                      </div>

                      {multiLinkType === 'existing' && (
                        <div>
                          <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Link Existing Task</label>
                          <select
                            value={row.existingTaskId}
                            onChange={(e) => {
                              const task = tasks.find(t => t.id === e.target.value);
                              if (task) {
                                updateMultiRow(idx, 'existingTaskId', task.id);
                                updateMultiRow(idx, 'title', task.name);
                                updateMultiRow(idx, 'description', task.description);
                                updateMultiRow(idx, 'assignedTo', task.assignedTo);
                                updateMultiRow(idx, 'priority', task.priority);
                              }
                            }}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          >
                            <option value="">Select task...</option>
                            {tasks.filter(t => t.status !== 'approved').map(task => {
                              const goal = getGoalById(task.goalId);
                              const app = goal ? getAppById(goal.appId) : null;
                              return (
                                <option key={task.id} value={task.id}>
                                  {app?.name} / {goal?.name} — {task.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Assign To</label>
                        <div className="flex flex-wrap gap-1.5">
                          {employees.map((emp) => {
                            const selected = row.assignedTo.includes(emp.id);
                            return (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => toggleMultiAssignee(idx, emp.id)}
                                className={`px-2 py-1 text-xs border transition ${
                                  selected
                                    ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff]'
                                    : 'bg-[#12121a] border-[rgba(0,229,255,0.1)] text-[#f0f0f5]'
                                }`}
                              >
                                {emp.name.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Priority</label>
                          <select
                            value={row.priority}
                            onChange={(e) => updateMultiRow(idx, 'priority', e.target.value)}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Notes</label>
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateMultiRow(idx, 'notes', e.target.value)}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={taskMode === 'multi' && (multiRows.length === 0 || !multiGoalId)}
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50"
              >
                {taskMode === 'multi'
                  ? `Create ${multiRows.filter(r => r.title.trim()).length} Action Points`
                  : 'Create Action Point'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'review' ? (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h2 className="text-lg font-semibold text-[#f0f0f5] mb-4">
            Weekly Review — {format(new Date(), 'MMM d, yyyy')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
              <p className="text-2xl font-bold text-[#f0f0f5]">{weeklyReview.total}</p>
              <p className="text-xs text-[#6b6b80]">Total This Week</p>
            </div>
            <div className="p-4 bg-[#1a1a2e] border border-[rgba(16,185,129,0.2)]">
              <p className="text-2xl font-bold text-[#10b981]">{weeklyReview.completed.length}</p>
              <p className="text-xs text-[#10b981]">Completed</p>
            </div>
            <div className="p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.2)]">
              <p className="text-2xl font-bold text-[#00e5ff]">{weeklyReview.pending.length}</p>
              <p className="text-xs text-[#00e5ff]">Pending</p>
            </div>
            <div className="p-4 bg-[#1a1a2e] border border-[rgba(245,158,11,0.2)]">
              <p className="text-2xl font-bold text-[#f59e0b]">{weeklyReview.carriedOver.length + weeklyReview.carriedFromPrev.length}</p>
              <p className="text-xs text-[#f59e0b]">Carried Over</p>
            </div>
          </div>

          {weeklyReview.carriedFromPrev.length > 0 && (
            <div className="mb-4 p-3 bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.2)]">
              <p className="text-sm font-medium text-[#f59e0b] flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {weeklyReview.carriedFromPrev.length} action point(s) carried over from last week
              </p>
            </div>
          )}

          <div className="space-y-2">
            {weeklyReview.thisWeek.map(ap => {
              const goal = getGoalById(ap.goalId);
              const app = goal ? getAppById(goal.appId) : null;
              const assignees = ap.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
              return (
                <div key={ap.id} className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(ap.id, ap.status === 'completed' ? 'pending' : 'completed')}
                        className={`p-1 transition ${ap.status === 'completed' ? 'text-[#10b981]' : 'text-[#6b6b80] hover:text-[#10b981]'}`}
                        title="Toggle complete"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <div>
                        <p className={`text-sm font-medium text-[#f0f0f5] ${ap.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                          {ap.title}
                        </p>
                        <p className="text-xs text-[#6b6b80]">{app?.name} → {goal?.name}</p>
                        {ap.taskId && (
                          <p className="text-xs text-[#00e5ff] mt-0.5 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Linked to task
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 ${priorityColor(ap.priority)}`}>
                      {ap.priority}
                    </span>
                    <div className="flex -space-x-2">
                      {assignees.slice(0, 2).map((emp, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] rounded-full flex items-center justify-center text-[#0a0a0f] text-xs font-bold border-2 border-[#1a1a2e]"
                          title={emp?.name}
                        >
                          {emp?.name?.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {weeklyReview.thisWeek.length === 0 && (
              <p className="text-sm text-[#6b6b80] text-center py-6">No action points for this week</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-[#1a1a2e] px-3 py-1.5 border border-[rgba(0,229,255,0.1)]">
          <Calendar className="w-3.5 h-3.5 text-[#6b6b80]" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ActionPointStatus | 'all')}
            className="bg-transparent text-[#f0f0f5] text-xs border-none outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="carried_over">Carried Over</option>
          </select>
        </div>
        <div className="flex items-center gap-1 bg-[#1a1a2e] px-3 py-1.5 border border-[rgba(0,229,255,0.1)]">
          <Target className="w-3.5 h-3.5 text-[#6b6b80]" />
          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            className="bg-transparent text-[#f0f0f5] text-xs border-none outline-none"
          >
            <option value="all">All Goals</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {groupedByWeek.map(({ weekKey, weekStart, items }) => {
        const counts = weekStatusCounts(items);
        const isExpanded = expandedWeeks.has(weekKey);

        return (
          <div key={weekKey} className="mb-4 bg-[#12121a] border border-[rgba(0,229,255,0.1)] overflow-hidden">
            <button
              onClick={() => toggleWeek(weekKey)}
              className="w-full flex items-center justify-between p-4 hover:bg-[rgba(0,229,255,0.02)] transition"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[#6b6b80]" /> : <ChevronRight className="w-4 h-4 text-[#6b6b80]" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#f0f0f5] text-sm">
                      Week of {format(weekStart, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-[#6b6b80] mt-0.5">{items.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[#10b981]">{counts.done} done</span>
                <span className="text-[#00e5ff]">{counts.pending} pending</span>
                {counts.carried > 0 && <span className="text-[#f59e0b]">{counts.carried} carried</span>}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-[rgba(0,229,255,0.1)]">
                {items.map(ap => {
                  const goal = getGoalById(ap.goalId);
                  const app = goal ? getAppById(goal.appId) : null;
                  const assignees = ap.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);

                  return (
                    <div key={ap.id} className="flex items-center justify-between p-4 hover:bg-[rgba(0,229,255,0.02)] transition border-b border-[rgba(0,229,255,0.05)] last:border-b-0">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleStatusChange(ap.id, ap.status === 'completed' ? 'pending' : 'completed')}
                          className={`mt-0.5 p-1 transition ${
                            ap.status === 'completed'
                              ? 'text-[#10b981]'
                              : 'text-[#6b6b80] hover:text-[#10b981]'
                          }`}
                          title="Toggle complete"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${ap.status === 'completed' ? 'line-through text-[#6b6b80]' : 'text-[#f0f0f5]'}`}>
                              {ap.title}
                            </p>
                            <span className={`text-xs font-medium px-2 py-0.5 ${priorityColor(ap.priority)}`}>
                              {ap.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-[#6b6b80]">{app?.name} / {goal?.name}</p>
                            <span className="text-xs text-[#6b6b80]">{format(ap.date, 'MMM d, yyyy')}</span>
                            {ap.status === 'carried_over' && (
                              <span className="text-xs text-[#f59e0b] flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Carried over
                              </span>
                            )}
                          </div>
                          {ap.description && (
                            <p className="text-xs text-[#6b6b80] mt-1">{ap.description}</p>
                          )}
                          {ap.taskId && (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); }}
                              className="text-xs text-[#00e5ff] mt-1 inline-flex items-center gap-1 hover:underline"
                            >
                              <Layers className="w-3 h-3" /> Linked to task
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 3).map((emp, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] rounded-full flex items-center justify-center text-[#0a0a0f] text-xs font-bold border-2 border-[#12121a]"
                              title={emp?.name}
                            >
                              {emp?.name?.charAt(0)}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewingActionPoint(ap)}
                            className="p-1.5 text-[#6b6b80] hover:text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {ap.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(ap.id, 'carried_over')}
                              className="flex items-center gap-1 px-2 py-1.5 text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] transition text-xs"
                              title="Carry over to next week"
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> Carry Over
                            </button>
                          )}
                          {ap.status === 'carried_over' && (
                            <button
                              onClick={() => handleStatusChange(ap.id, 'pending')}
                              className="flex items-center gap-1 px-2 py-1.5 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition text-xs"
                              title="Move back to pending"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Reverse
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                onClick={() => setEditingActionPoint(ap)}
                                className="p-1.5 text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this action point and its linked task?')) {
                                    deleteActionPoint(ap.id);
                                  }
                                }}
                                className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                                title="Delete"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-sm text-[#6b6b80] text-center py-6">No action points</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {groupedByWeek.length === 0 && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Target className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
          <p className="text-[#6b6b80]">No action points yet</p>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium"
            >
              Create First Action Point
            </button>
          )}
        </div>
      )}

      {editingActionPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#f0f0f5]">Edit Action Point</h3>
              <button onClick={() => setEditingActionPoint(null)} className="p-1 text-[#6b6b80] hover:text-[#f0f0f5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingActionPoint) return;
              await updateActionPoint(editingActionPoint.id, {
                title: editingActionPoint.title,
                description: editingActionPoint.description,
                goalId: editingActionPoint.goalId,
                assignedTo: editingActionPoint.assignedTo,
                priority: editingActionPoint.priority,
                notes: editingActionPoint.notes
              });
              setEditingActionPoint(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Title</label>
                <input
                  type="text"
                  value={editingActionPoint.title}
                  onChange={(e) => setEditingActionPoint({ ...editingActionPoint, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Description</label>
                <textarea
                  value={editingActionPoint.description || ''}
                  onChange={(e) => setEditingActionPoint({ ...editingActionPoint, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] outline-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Priority</label>
                  <select
                    value={editingActionPoint.priority}
                    onChange={(e) => setEditingActionPoint({ ...editingActionPoint, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Assign To</label>
                  <div className="flex flex-wrap gap-1.5">
                    {employees.map((emp) => {
                      const selected = editingActionPoint.assignedTo.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => setEditingActionPoint(prev => prev ? {
                            ...prev,
                            assignedTo: prev.assignedTo.includes(emp.id)
                              ? prev.assignedTo.filter(id => id !== emp.id)
                              : [...prev.assignedTo, emp.id]
                          } : prev)}
                          className={`px-2 py-1 text-xs border transition ${
                            selected
                              ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff]'
                              : 'bg-[#12121a] border-[rgba(0,229,255,0.1)] text-[#f0f0f5]'
                          }`}
                        >
                          {emp.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Notes</label>
                <textarea
                  value={editingActionPoint.notes || ''}
                  onChange={(e) => setEditingActionPoint({ ...editingActionPoint, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] outline-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]">
                  Update
                </button>
                <button type="button" onClick={() => setEditingActionPoint(null)} className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingActionPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewingActionPoint(null)}>
          <div className="w-full max-w-lg bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#f0f0f5]">{viewingActionPoint.title}</h3>
              <button onClick={() => setViewingActionPoint(null)} className="p-1 text-[#6b6b80] hover:text-[#f0f0f5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {viewingActionPoint.description && (
                <p className="text-sm text-[#6b6b80]">{viewingActionPoint.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[#6b6b80]">Goal:</span>
                  <p className="text-[#f0f0f5]">{getGoalById(viewingActionPoint.goalId)?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-[#6b6b80]">Priority:</span>
                  <p className={`font-medium ${priorityColor(viewingActionPoint.priority)}`}>{viewingActionPoint.priority}</p>
                </div>
                <div>
                  <span className="text-[#6b6b80]">Date:</span>
                  <p className="text-[#f0f0f5]">{format(viewingActionPoint.date, 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-[#6b6b80]">Status:</span>
                  <p className="text-[#f0f0f5] capitalize">{viewingActionPoint.status.replace('_', ' ')}</p>
                </div>
              </div>
              {viewingActionPoint.assignedTo.length > 0 && (
                <div>
                  <span className="text-sm text-[#6b6b80]">Assigned to:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingActionPoint.assignedTo.map(id => {
                      const emp = getEmployeeById(id);
                      return emp ? <span key={id} className="text-xs px-2 py-1 bg-[#1a1a2e] text-[#f0f0f5]">{emp.name}</span> : null;
                    })}
                  </div>
                </div>
              )}
              {viewingActionPoint.notes && (
                <div>
                  <span className="text-sm text-[#6b6b80]">Notes:</span>
                  <p className="text-sm text-[#f0f0f5] mt-1">{viewingActionPoint.notes}</p>
                </div>
              )}
              {viewingActionPoint.taskId && (
                <p className="text-xs text-[#00e5ff]">Linked to task</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
