import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
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
  Eye,
  Mail,
  Tag as TagIcon,
  ShieldCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ActionPoint, ActionPointStatus } from '../types';
import { TagBadges } from './TagBadges';

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ActionPointsPage() {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const {
    actionPoints,
    goals,
    tasks,
    employees,
    addActionPoint,
    apps,
    updateActionPoint,
    deleteActionPoint,
    getGoalById,
    getAppById,
    getEmployeeById,
    sendActionPointNotification,
    tags,
    getTagsForApp,
    expectations
  } = useApp();

  const canManage = hasPermission('manage_action_points');
  const [showForm, setShowForm] = useState(false);
  const [taskMode, setTaskMode] = useState<'single' | 'multi'>('single');
  const [editingActionPoint, setEditingActionPoint] = useState<ActionPoint | null>(null);
  const [viewingActionPoint, setViewingActionPoint] = useState<ActionPoint | null>(null);
  const currentWeekKey = format(getWeekStart(), 'yyyy-MM-dd');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>(() => ({
    [currentWeekKey]: true
  }));
  const [filterStatus, setFilterStatus] = useState<ActionPointStatus | 'all'>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [tagAppId, setTagAppId] = useState<string>('');
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
    existingTaskId: '',
    tags: [] as string[],
    workType: 'non-development' as 'development' | 'non-development',
    source: 'manual' as 'meeting' | 'review' | 'discussion' | 'activity' | 'manual'
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
    tags: string[];
  }[]>([]);

  const resetForm = () => {
    setFormData({
      title: '', description: '', goalId: '', assignedTo: [], priority: 'medium', notes: '',
      date: '', linkType: 'new', existingTaskId: '', tags: [] as string[],
      workType: 'non-development' as 'development' | 'non-development',
      source: 'manual' as 'meeting' | 'review' | 'discussion' | 'activity' | 'manual'
    });
    setMultiRows([]);
    setMultiGoalId('');
    setMultiDate('');
    setMultiLinkType('new');
    setShowForm(false);
    setTaskMode('single');
  };

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));
  };

  const handleSendApEmail = async (ap: ActionPoint) => {
    await sendActionPointNotification(ap.id);
    showToast({ type: 'success', title: 'Email Sent', message: `Notification sent for "${ap.title}"` });
  };

  const groupedByWeek = useMemo(() => {
    const groups: Record<string, ActionPoint[]> = {};
    const filtered = actionPoints.filter(ap => {
      if (filterStatus !== 'all' && ap.status !== filterStatus) return false;
      if (filterGoal !== 'all' && ap.goalId !== filterGoal) return false;
      if (filterTag !== 'all' && !ap.tags?.includes(filterTag)) return false;
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
  }, [actionPoints, filterStatus, filterGoal, filterTag]);

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
      title: '', description: '', assignedTo: [], priority: 'medium' as const, notes: '', existingTaskId: '', tags: [] as string[]
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
          goalId: multiGoalId || undefined,
          assignedTo: row.assignedTo,
          priority: row.priority,
          weekStart: getWeekStart(),
          createdBy: currentUser.id,
          notes: row.notes,
          tags: row.tags,
          taskId: row.existingTaskId || undefined,
          date: multiDate ? new Date(multiDate) : new Date(),
          workType: formData.workType,
          source: formData.source
        });
      }
    } else {
      await addActionPoint({
        title: formData.title,
        description: formData.description,
        goalId: formData.goalId || undefined,
        assignedTo: formData.assignedTo,
        priority: formData.priority,
        weekStart: getWeekStart(),
          createdBy: currentUser.id,
          notes: formData.notes,
          tags: formData.tags,
        taskId: formData.linkType === 'existing' ? formData.existingTaskId : undefined,
        date: formData.date ? new Date(formData.date) : new Date(),
        workType: formData.workType,
        source: formData.source
      });
    }
    resetForm();
  };

  const handleStatusChange = async (apId: string, status: ActionPointStatus) => {
    const updates: any = {
      status,
      completedAt: status === 'completed' ? new Date() : undefined,
      completedBy: status === 'completed' ? currentUser?.id : undefined
    };
    if (status === 'carried_over') {
      const ap = actionPoints.find(a => a.id === apId);
      if (!ap) return;
      updates.carriedFrom = ap.weekStart;
      const base = new Date(ap.weekStart);
      base.setDate(base.getDate() + 7);
      updates.weekStart = base;
      updates.date = base;
    }
    await updateActionPoint(apId, updates);
  };

  const handleUndoCarryOver = async (apId: string) => {
    const ap = actionPoints.find(a => a.id === apId);
    if (!ap?.carriedFrom) return;
    await updateActionPoint(apId, {
      weekStart: ap.carriedFrom,
      date: ap.carriedFrom,
      carriedFrom: undefined
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
      case 'urgent': return 'bg-[#FBE9E9] text-[#EB5757] border border-[#EB5757]/20';
      case 'high': return 'bg-white text-[#37352F] border border-[#E9E9E7]';
      case 'medium': return 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]';
      default: return 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]';
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="max-w-[900px] mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F]">Action Points</h1>
            <p className="text-[14px] text-[#787774] mt-1">
              {actionPoints.length} total · {actionPoints.filter(a => a.status === 'pending').length} pending
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-[#E9E9E7] rounded-[6px] p-0.5">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${view === 'list' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
              >
                List
              </button>
              <button
                onClick={() => setView('review')}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${view === 'review' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
              >
                Weekly Review
              </button>
            </div>
            {canManage && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
              >
                <Plus className="w-4 h-4" />
                New Action Point
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px]">
            <h3 className="text-[16px] font-semibold text-[#37352F] mb-4">Create Action Point</h3>

            <div className="flex items-center gap-1 mb-6 bg-white border border-[#E9E9E7] rounded-[6px] p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setTaskMode('single')}
                className={`px-4 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
                  taskMode === 'single'
                    ? 'bg-[#E9E9E7] text-[#37352F]'
                    : 'text-[#787774] hover:bg-[#F7F7F5]'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setTaskMode('multi')}
                className={`px-4 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
                  taskMode === 'multi'
                    ? 'bg-[#E9E9E7] text-[#37352F]'
                    : 'text-[#787774] hover:bg-[#F7F7F5]'
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
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Title</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Goal (optional)</label>
                      <select
                        value={formData.goalId}
                        onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      >
                        <option value="">No Goal</option>
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
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Work Type</label>
                      <div className="flex items-center gap-1 bg-white border border-[#E9E9E7] rounded-[6px] p-0.5 w-fit">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, workType: 'development' })}
                          className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
                            formData.workType === 'development'
                              ? 'bg-[#E9E9E7] text-[#37352F]'
                              : 'text-[#787774] hover:bg-[#F7F7F5]'
                          }`}
                        >
                          Development
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, workType: 'non-development' })}
                          className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
                            formData.workType === 'non-development'
                              ? 'bg-[#E9E9E7] text-[#37352F]'
                              : 'text-[#787774] hover:bg-[#F7F7F5]'
                          }`}
                        >
                          Non-Development
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Origin</label>
                      <select
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      >
                        <option value="meeting">Meeting</option>
                        <option value="review">Review</option>
                        <option value="discussion">Discussion</option>
                        <option value="activity">Project Activity</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                  </div>
                  {formData.workType === 'development' && (
                    <p className="text-[12px] text-[#787774]">
                      This action point will create or link to a development task.
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Assign To</label>
                    <div className="flex flex-wrap gap-2">
                      {employees.map((emp) => {
                        const selected = formData.assignedTo.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleAssignee(emp.id)}
                            className={`px-3 py-1.5 text-[14px] border rounded-[6px] transition-colors duration-150 ${
                              selected
                                ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F] font-medium'
                                : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                            }`}
                          >
                            {emp.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Tags</label>
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={tagAppId}
                        onChange={(e) => setTagAppId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[12px] focus:border-[#2383E2] focus:outline-none"
                      >
                        <option value="">All tags</option>
                        {apps.map(app => (
                          <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(formData.goalId
                        ? getTagsForApp(getGoalById(formData.goalId)?.appId || '')
                        : tagAppId
                          ? getTagsForApp(tagAppId)
                          : tags
                      ).map(tag => {
                        const selected = formData.tags.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              tags: prev.tags.includes(tag.id)
                                ? prev.tags.filter(id => id !== tag.id)
                                : [...prev.tags, tag.id]
                            }))}
                            className={`px-3 py-1.5 text-[14px] border rounded-[6px] transition-colors duration-150 ${
                              selected
                                ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F] font-medium'
                                : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                      {tags.length === 0 && (
                        <p className="text-[12px] text-[#787774]">No tags available</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      rows={2}
                    />
                  </div>

                  <div className="pt-3 border-t border-[#E9E9E7]">
                    <div className="flex items-center gap-3 mb-3">
                      <label className="text-[14px] font-medium text-[#37352F]">Task</label>
                      <div className="flex items-center gap-1 bg-white border border-[#E9E9E7] rounded-[6px] p-0.5">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, linkType: 'new', existingTaskId: '' }))}
                          className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] ${formData.linkType === 'new' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
                        >
                          Create New
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, linkType: 'existing' }))}
                          className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] ${formData.linkType === 'existing' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
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
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
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
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Goal (optional, all rows)</label>
                      <select
                        value={multiGoalId}
                        onChange={(e) => setMultiGoalId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                      >
                        <option value="">No Goal</option>
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
                      <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Date (all rows)</label>
                      <input
                        type="date"
                        value={multiDate}
                        onChange={(e) => setMultiDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-[14px] font-medium text-[#37352F]">Task</label>
                    <div className="flex items-center gap-1 bg-white border border-[#E9E9E7] rounded-[6px] p-0.5">
                      <button
                        type="button"
                        onClick={() => setMultiLinkType('new')}
                        className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] ${multiLinkType === 'new' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
                      >
                        Create New
                      </button>
                      <button
                        type="button"
                        onClick={() => setMultiLinkType('existing')}
                        className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] ${multiLinkType === 'existing' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
                      >
                        Link Existing
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[14px] font-medium text-[#37352F]">Action Points ({multiRows.length})</label>
                      <button
                        type="button"
                        onClick={addMultiRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Row
                      </button>
                    </div>

                    {multiRows.length === 0 && (
                      <div className="text-center py-8 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
                        <p className="text-[14px] text-[#787774]">Click "Add Row" to add action points</p>
                      </div>
                    )}

                    {multiRows.map((row, idx) => (
                      <div key={idx} className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-medium text-[#37352F]">Item {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeMultiRow(idx)}
                            className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[12px] font-medium text-[#37352F] mb-1">Title</label>
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) => updateMultiRow(idx, 'title', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
                              required={multiLinkType === 'new'}
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-[#37352F] mb-1">Description</label>
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateMultiRow(idx, 'description', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
                            />
                          </div>
                        </div>

                        {multiLinkType === 'existing' && (
                          <div>
                            <label className="block text-[12px] font-medium text-[#37352F] mb-1">Link Existing Task</label>
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
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
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
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Assign To</label>
                          <div className="flex flex-wrap gap-1.5">
                            {employees.map((emp) => {
                              const selected = row.assignedTo.includes(emp.id);
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => toggleMultiAssignee(idx, emp.id)}
                                  className={`px-2 py-1 text-[12px] border rounded-[6px] transition-colors duration-150 ${
                                    selected
                                      ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F]'
                                      : 'bg-white border-[#E9E9E7] text-[#787774]'
                                  }`}
                                >
                                  {emp.name.split(' ')[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Tags</label>
                          <div className="flex items-center gap-2 mb-2">
                            <select
                              value={tagAppId}
                              onChange={(e) => setTagAppId(e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[12px] focus:border-[#2383E2] focus:outline-none"
                            >
                              <option value="">All tags</option>
                              {apps.map(app => (
                                <option key={app.id} value={app.id}>{app.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(multiGoalId
                              ? getTagsForApp(getGoalById(multiGoalId)?.appId || '')
                              : tagAppId
                                ? getTagsForApp(tagAppId)
                                : tags
                            ).map(tag => {
                              const selected = row.tags?.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => {
                                    const currentTags = row.tags || [];
                                    updateMultiRow(idx, 'tags',
                                      currentTags.includes(tag.id)
                                        ? currentTags.filter(id => id !== tag.id)
                                        : [...currentTags, tag.id]
                                    );
                                  }}
                                  className={`px-2 py-1 text-[12px] border rounded-[6px] transition-colors duration-150 ${
                                    selected
                                      ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F]'
                                      : 'bg-white border-[#E9E9E7] text-[#787774]'
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[12px] font-medium text-[#37352F] mb-1">Priority</label>
                            <select
                              value={row.priority}
                              onChange={(e) => updateMultiRow(idx, 'priority', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-[#37352F] mb-1">Notes</label>
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => updateMultiRow(idx, 'notes', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
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
                  disabled={taskMode === 'multi' && (multiRows.length === 0)}
                  className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 transition-colors duration-150"
                >
                  {taskMode === 'multi'
                    ? `Create ${multiRows.filter(r => r.title.trim()).length} Action Points`
                    : 'Create Action Point'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white text-[#37352F] text-[14px] font-medium border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {view === 'review' ? (
          <div className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px]">
            <h2 className="text-[16px] font-semibold text-[#37352F] mb-4">
              Weekly Review — {format(new Date(), 'MMM d, yyyy')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
                <p className="text-[20px] font-semibold text-[#37352F] leading-none">{weeklyReview.total}</p>
                <p className="text-[12px] text-[#787774] mt-1">Total This Week</p>
              </div>
              <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
                <p className="text-[20px] font-semibold text-[#0F7B6C] leading-none">{weeklyReview.completed.length}</p>
                <p className="text-[12px] text-[#787774] mt-1">Completed</p>
              </div>
              <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
                <p className="text-[20px] font-semibold text-[#37352F] leading-none">{weeklyReview.pending.length}</p>
                <p className="text-[12px] text-[#787774] mt-1">Pending</p>
              </div>
              <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
                <p className="text-[20px] font-semibold text-[#EB5757] leading-none">{weeklyReview.carriedOver.length + weeklyReview.carriedFromPrev.length}</p>
                <p className="text-[12px] text-[#787774] mt-1">Carried Over</p>
              </div>
            </div>

            {weeklyReview.carriedFromPrev.length > 0 && (
              <div className="mb-4 p-3 bg-[#FFFAEB] border border-[#FDE68A] rounded-[6px]">
                <p className="text-[14px] font-medium text-[#92400E] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {weeklyReview.carriedFromPrev.length} action point(s) carried over from last week
                </p>
              </div>
            )}

            <div className="space-y-2">
              {weeklyReview.thisWeek.map(ap => {
                const goal = ap.goalId ? getGoalById(ap.goalId) : null;
                const app = goal ? getAppById(goal.appId) : null;
                const assignees = ap.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
                const isCompleted = ap.status === 'completed';
                return (
                  <div key={ap.id} className="flex items-center justify-between bg-white border border-[#E9E9E7] rounded-[8px] p-4 hover:bg-[#F7F7F5] transition-colors duration-150"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStatusChange(ap.id, ap.status === 'completed' ? 'pending' : 'completed')}
                          className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${isCompleted ? 'bg-[#2383E2] border-[#2383E2] text-white' : 'bg-white border-[#E9E9E7] text-transparent hover:border-[#2383E2]'}`}
                          title="Toggle complete"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-medium leading-snug ${isCompleted ? 'line-through text-[#9B9A97]' : 'text-[#37352F]'}`}>
                            {ap.title}
                          </p>
                          <p className="text-[12px] text-[#787774] mt-0.5">
                            {app?.name}{goal ? ` → ${goal.name}` : ''}
                          </p>
                          {app && (
                            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 mt-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">
                              {app.name}
                            </span>
                          )}
                          {ap.tags && ap.tags.length > 0 && (
                            <div className="mt-1">
                              <TagBadges tagIds={ap.tags} allTags={tags} size="xs" />
                            </div>
                          )}
                          {ap.status === 'carried_over' && (
                            <span className="text-[12px] text-[#92400E] flex items-center gap-1 mt-1">
                              <ArrowRight className="w-3 h-3" />
                              {ap.carriedFrom ? `Carried from ${format(ap.carriedFrom, 'MMM d')}` : 'Carried over'}
                            </span>
                          )}
                          {ap.taskId && (
                            <p className="text-[12px] text-[#787774] mt-1 flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Linked to task
                            </p>
                          )}
                          {ap.taskId && expectations.some(e => e.taskId === ap.taskId) && (
                            <span className="text-[11px] text-[#787774] mt-1 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Gate Review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`text-[12px] font-medium px-2 py-1 rounded-full ${priorityColor(ap.priority)}`}>
                          {ap.priority}
                        </span>
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 2).map((emp, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 bg-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] text-[12px] font-medium border-2 border-white"
                              title={emp?.name}
                            >
                              {emp?.name?.charAt(0)}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleSendApEmail(ap)}
                          className={`p-1.5 rounded-[6px] border border-transparent transition-colors duration-150 ${
                            ap.lastEmailSentAt
                              ? 'text-[#2383E2] hover:bg-white hover:border-[#E9E9E7]'
                              : 'text-[#787774] hover:text-[#37352F] hover:bg-white hover:border-[#E9E9E7]'
                          }`}
                          title={ap.lastEmailSentAt ? 'Resend email' : 'Send email'}
                        >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {weeklyReview.thisWeek.length === 0 && (
                    <p className="text-[14px] text-[#787774] text-center py-6">No action points for this week</p>
                  )}
                </div>
              </div>
            ) : null}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-[#E9E9E7] rounded-[6px]">
            <Calendar className="w-3.5 h-3.5 text-[#787774]" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ActionPointStatus | 'all')}
              className="bg-transparent text-[#37352F] text-[12px] border-none outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="carried_over">Carried Over</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-[#E9E9E7] rounded-[6px]">
            <Target className="w-3.5 h-3.5 text-[#787774]" />
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value)}
              className="bg-transparent text-[#37352F] text-[12px] border-none outline-none"
            >
              <option value="all">All Goals</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-[#E9E9E7] rounded-[6px]">
            <TagIcon className="w-3.5 h-3.5 text-[#787774]" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="bg-transparent text-[#37352F] text-[12px] border-none outline-none"
            >
              <option value="all">All Tags</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {groupedByWeek.map(({ weekKey, weekStart, items }) => {
          const counts = weekStatusCounts(items);
          const isExpanded = expandedWeeks[weekKey] ?? false;

          return (
            <div key={weekKey} className="mb-4 bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden">
              <button
                onClick={() => toggleWeek(weekKey)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#F7F7F5] transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#37352F] text-[14px]">
                        Week of {format(weekStart, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#787774] mt-0.5">{items.length} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="text-[#0F7B6C]">{counts.done} done</span>
                  <span className="text-[#37352F]">{counts.pending} pending</span>
                  {counts.carried > 0 && <span className="text-[#92400E]">{counts.carried} carried</span>}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#E9E9E7]">
                  {items.map(ap => {
                    const goal = ap.goalId ? getGoalById(ap.goalId) : null;
                    const app = goal ? getAppById(goal.appId) : null;
                    const assignees = ap.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
                    const isCompleted = ap.status === 'completed';
                    return (
                      <div key={ap.id} className="flex items-center justify-between p-4 border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#F7F7F5] transition-colors duration-150"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleStatusChange(ap.id, ap.status === 'completed' ? 'pending' : 'completed')}
                            className={`mt-0.5 w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${isCompleted ? 'bg-[#2383E2] border-[#2383E2] text-white' : 'bg-white border-[#E9E9E7] text-transparent hover:border-[#2383E2]'}`}
                            title="Toggle complete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-[14px] font-medium leading-snug ${isCompleted ? 'line-through text-[#9B9A97]' : 'text-[#37352F]'}`}>
                                {ap.title}
                              </p>
                              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${priorityColor(ap.priority)}`}>
                                {ap.priority}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <p className="text-[12px] text-[#787774]">{app?.name}{goal ? ` / ${goal.name}` : ''}</p>
                              <span className="text-[12px] text-[#787774]">{format(ap.date, 'MMM d, yyyy')}</span>
                              {ap.status === 'carried_over' && (
                                <span className="text-[12px] text-[#92400E] flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" />
                                  {ap.carriedFrom ? `Carried from ${format(ap.carriedFrom, 'MMM d')}` : 'Carried over'}
                                </span>
                              )}
                              {app && (
                                <span className="text-[12px] px-2 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">
                                  {app.name}
                                </span>
                              )}
                              {ap.tags && ap.tags.length > 0 && (
                                <TagBadges tagIds={ap.tags} allTags={tags} size="xs" />
                              )}
                            </div>
                            {ap.description && (
                              <p className="text-[12px] text-[#787774] mt-1">{ap.description}</p>
                            )}
                            {ap.taskId && (
                              <span className="text-[12px] text-[#787774] mt-1 inline-flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Linked to task
                              </span>
                            )}
                            {ap.taskId && expectations.some(e => e.taskId === ap.taskId) && (
                              <span className="text-[11px] text-[#787774] mt-1 inline-flex items-center gap-1 ml-2">
                                <ShieldCheck className="w-3 h-3" /> Gate Review
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <div className="flex -space-x-2">
                            {assignees.slice(0, 3).map((emp, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 bg-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] text-[12px] font-medium border-2 border-white"
                                title={emp?.name}
                              >
                                {emp?.name?.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingActionPoint(ap)}
                              className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendApEmail(ap)}
                              className={`p-1.5 rounded-[6px] border border-transparent transition-colors duration-150 ${
                                ap.lastEmailSentAt
                                  ? 'text-[#2383E2] hover:bg-white hover:border-[#E9E9E7]'
                                  : 'text-[#787774] hover:text-[#37352F] hover:bg-white hover:border-[#E9E9E7]'
                              }`}
                              title={ap.lastEmailSentAt ? 'Resend email' : 'Send email'}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            {(ap.status === 'pending' || ap.status === 'carried_over') && (
                              <button
                                onClick={() => handleStatusChange(ap.id, 'carried_over')}
                                className="flex items-center gap-1 px-2 py-1.5 text-[#92400E] hover:bg-[#FFFAEB] border border-transparent hover:border-[#FDE68A] rounded-[6px] transition-colors duration-150 text-[12px]"
                                title={`Carry over to week of ${format(new Date(new Date(ap.weekStart).getTime() + 7 * 86400000), 'MMM d')}`}
                              >
                                <ArrowRight className="w-3.5 h-3.5" /> Carry Over
                              </button>
                            )}
                            {ap.status === 'carried_over' && ap.carriedFrom && (
                              <button
                                onClick={() => handleUndoCarryOver(ap.id)}
                                className="flex items-center gap-1 px-2 py-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150 text-[12px]"
                                title={`Undo carry over — move back to week of ${format(ap.carriedFrom, 'MMM d')}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Undo
                              </button>
                            )}
                            {canManage && (
                              <>
                                <button
                                  onClick={() => setEditingActionPoint(ap)}
                                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
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
                                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
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
                    <p className="text-[14px] text-[#787774] text-center py-6">No action points</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groupedByWeek.length === 0 && (
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <Target className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774]">No action points yet</p>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
              >
                Create First Action Point
              </button>
            )}
          </div>
        )}

        {editingActionPoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg bg-white border border-[#E9E9E7] rounded-[8px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#37352F] text-[16px]">Edit Action Point</h3>
                <button onClick={() => setEditingActionPoint(null)} className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px]">
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
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Title</label>
                  <input
                    type="text"
                    value={editingActionPoint.title}
                    onChange={(e) => setEditingActionPoint({ ...editingActionPoint, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Description</label>
                  <textarea
                    value={editingActionPoint.description || ''}
                    onChange={(e) => setEditingActionPoint({ ...editingActionPoint, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Priority</label>
                    <select
                      value={editingActionPoint.priority}
                      onChange={(e) => setEditingActionPoint({ ...editingActionPoint, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Assign To</label>
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
                            className={`px-2 py-1 text-[12px] border rounded-[6px] transition-colors duration-150 ${
                              selected
                                ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F]'
                                : 'bg-white border-[#E9E9E7] text-[#787774]'
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
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Notes</label>
                  <textarea
                    value={editingActionPoint.notes || ''}
                    onChange={(e) => setEditingActionPoint({ ...editingActionPoint, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150">
                    Update
                  </button>
                  <button type="button" onClick={() => setEditingActionPoint(null)} className="px-4 py-2 bg-white text-[#37352F] text-[14px] font-medium border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewingActionPoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setViewingActionPoint(null)}>
            <div className="w-full max-w-lg bg-white border border-[#E9E9E7] rounded-[8px] p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#37352F] text-[16px]">{viewingActionPoint.title}</h3>
                <button onClick={() => setViewingActionPoint(null)} className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {viewingActionPoint.description && (
                  <p className="text-[14px] text-[#787774]">{viewingActionPoint.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-[14px]">
                  <div>
                    <span className="text-[#787774] text-[12px]">Goal:</span>
                    <p className="text-[#37352F]">{getGoalById(viewingActionPoint.goalId)?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[#787774] text-[12px]">Priority:</span>
                    <p className={`inline-flex mt-1 text-[12px] font-medium px-2 py-0.5 rounded-full ${priorityColor(viewingActionPoint.priority)}`}>{viewingActionPoint.priority}</p>
                  </div>
                  <div>
                    <span className="text-[#787774] text-[12px]">Date:</span>
                    <p className="text-[#37352F]">{format(viewingActionPoint.date, 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-[#787774] text-[12px]">Status:</span>
                    <p className="text-[#37352F] capitalize">{viewingActionPoint.status.replace('_', ' ')}</p>
                  </div>
                </div>
                {viewingActionPoint.assignedTo.length > 0 && (
                  <div>
                    <span className="text-[14px] text-[#787774]">Assigned to:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {viewingActionPoint.assignedTo.map(id => {
                        const emp = getEmployeeById(id);
                        return emp ? <span key={id} className="text-[12px] px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#37352F]">{emp.name}</span> : null;
                      })}
                    </div>
                  </div>
                )}
                {viewingActionPoint.notes && (
                  <div>
                    <span className="text-[14px] text-[#787774]">Notes:</span>
                    <p className="text-[14px] text-[#37352F] mt-1">{viewingActionPoint.notes}</p>
                  </div>
                )}
                {viewingActionPoint.taskId && (
                  <p className="text-[12px] text-[#787774] flex items-center gap-1"><Layers className="w-3 h-3" /> Linked to task</p>
                )}
                {viewingActionPoint.taskId && expectations.some(e => e.taskId === viewingActionPoint.taskId) && (
                  <p className="text-[12px] text-[#787774] flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3" /> Gate Review item
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
