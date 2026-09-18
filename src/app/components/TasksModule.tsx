import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Star,
  User,
  Check,
  Filter,
  List,
  LayoutGrid,
  CalendarRange,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Send,
  Paperclip,
  FileText,
  X,
  Tag as TagIcon,
  GitPullRequest,
  GripVertical,
  NotebookText
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus, Subtask, SubtaskStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskTimeline } from './TaskTimeline';
import { TagBadges } from './TagBadges';
import { getWorkTargetStates } from '../../utils/workflow';
import { monthLabel, sortPlans } from '../../utils/plans';

const KANBAN_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'pending_qa', 'completed', 'approved'];

const KANBAN_COLUMN_META: Record<TaskStatus, { label: string; dot: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-[#9B9A97]' },
  in_progress: { label: 'In Progress', dot: 'bg-[#2383E2]' },
  blocked: { label: 'Blocked', dot: 'bg-[#EB5757]' },
  pending_qa: { label: 'Pending QA', dot: 'bg-[#787774]' },
  completed: { label: 'Completed', dot: 'bg-[#0F7B6C]' },
  approved: { label: 'Approved', dot: 'bg-[#0F7B6C]' }
};

function availableTaskStatuses(task: Task, can: (permission: string) => boolean): TaskStatus[] {
  const targets = getWorkTargetStates({
    kind: 'task',
    currentStatus: task.status,
    workType: task.workType || 'non-development',
    can
  });
  const result = [task.status, ...targets] as TaskStatus[];
  return [...new Set(result)];
}

export function TasksModule() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const {
    tasks,
    goals,
    employees,
    addTask,
    updateTask,
    deleteTask,
    approveTask,
    getGoalById,
    getAppById,
    getEmployeeById,
    addSubtask,
    getSubtasksForTask,
    getCommentsForSubtask,
    addComment,
    sendTaskNotification,
    tags,
    getTagsForApp,
    monthlyPlans,
    getMonthlyPlanById
  } = useApp();

  const canAssignTasks = hasPermission('assign_tasks');
  const canViewAllApps = hasPermission('view_all_apps');
  const canApprove = hasPermission('approve_tasks');

  const [showAddForm, setShowAddForm] = useState(false);
  const [taskMode, setTaskMode] = useState<'single' | 'multi'>('single');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>('list');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    planId: '',
    assignedTo: [] as string[],
    priority: 'medium' as const,
    startDate: '',
    endDate: '',
    tags: [] as string[],
    workType: 'non-development' as 'development' | 'non-development'
  });
  const [multiGoalId, setMultiGoalId] = useState('');
  const [multiPlanId, setMultiPlanId] = useState('');
  const [multiTasks, setMultiTasks] = useState<{
    name: string;
    description: string;
    assignedTo: string[];
    priority: 'low' | 'medium' | 'high' | 'urgent';
    startDate: string;
    endDate: string;
  }[]>([]);
  const [showSubtasksSection, setShowSubtasksSection] = useState(false);
  const [subtasks, setSubtasks] = useState<{ name: string; assignedTo: string[]; priority: Subtask['priority']; startDate: string; endDate: string }[]>([]);
  const [newSubtask, setNewSubtask] = useState({ name: '', assignedTo: [] as string[], priority: 'medium' as Subtask['priority'], startDate: '', endDate: '' });
  const [expandedSubtaskComments, setExpandedSubtaskComments] = useState<string | null>(null);
  const [subtaskCommentText, setSubtaskCommentText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const sortedPlans = useMemo(() => sortPlans(monthlyPlans), [monthlyPlans]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterPlan !== 'all') {
      const planGoalIds = new Set(goals.filter(g => g.planId === filterPlan).map(g => g.id));
      result = result.filter(t => t.planId === filterPlan || (t.goalId && planGoalIds.has(t.goalId)));
    }
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    return result;
  }, [tasks, goals, filterPlan, filterStatus]);

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    if (status === task.status) return;
    const ok = await updateTask(task.id, { status });
    if (!ok) {
      showToast({
        type: 'error',
        title: 'Status change blocked',
        message: `"${task.name}" can't move from ${task.status.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')} for your role.`
      });
    }
  };

  const handleKanbanDrop = async (task: Task, targetStatus: TaskStatus) => {
    setDragOverColumn(null);
    setDragTaskId(null);
    if (targetStatus === task.status) return;
    const allowed = getWorkTargetStates({
      kind: 'task',
      currentStatus: task.status,
      workType: task.workType || 'non-development',
      can: hasPermission
    });
    if (!allowed.includes(targetStatus)) {
      showToast({
        type: 'error',
        title: 'Move not allowed',
        message: `"${task.name}" can't move from ${task.status.replace(/_/g, ' ')} to ${targetStatus.replace(/_/g, ' ')} for your role.`
      });
      return;
    }
    const ok = await updateTask(task.id, { status: targetStatus });
    if (ok) {
      showToast({ type: 'success', title: 'Task moved', message: `"${task.name}" → ${targetStatus.replace(/_/g, ' ')}` });
    } else {
      showToast({
        type: 'error',
        title: 'Move blocked',
        message: `"${task.name}" is blocked by a dependency or workflow rule.`
      });
    }
  };

  const dragTask = dragTaskId ? tasks.find(t => t.id === dragTaskId) : null;
  const dragValidTargets = useMemo(() => {
    if (!dragTask) return new Set<TaskStatus>();
    return new Set(getWorkTargetStates({
      kind: 'task',
      currentStatus: dragTask.status,
      workType: dragTask.workType || 'non-development',
      can: hasPermission
    }) as TaskStatus[]);
  }, [dragTask, hasPermission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          name: formData.name,
          description: formData.description,
          goalId: formData.goalId || null,
          planId: formData.planId || null,
          assignedTo: formData.assignedTo,
          priority: formData.priority,
          tags: formData.tags,
          workType: formData.workType,
          startDate: formData.startDate ? new Date(formData.startDate) : null,
          endDate: formData.endDate ? new Date(formData.endDate) : null
        } as any);
        resetForm();
      } else if (taskMode === 'multi') {
        const createdTasks = [];
        for (const row of multiTasks) {
          const task = await addTask({
            name: row.name,
            description: row.description,
            goalId: multiGoalId || undefined,
            planId: multiPlanId || undefined,
            assignedTo: row.assignedTo,
            priority: row.priority,
            startDate: row.startDate ? new Date(row.startDate) : undefined,
            endDate: row.endDate ? new Date(row.endDate) : undefined,
            status: 'not_started'
          });
          if (task) createdTasks.push(task);
        }
        resetForm();
      } else {
        const newTask = await addTask({
          ...formData,
          goalId: formData.goalId || undefined,
          planId: formData.planId || undefined,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          status: 'not_started',
          workType: formData.workType
        });
        if (newTask && subtasks.length > 0) {
          for (const st of subtasks) {
            addSubtask({
              ...st,
              taskId: newTask.id,
              status: 'pending',
              startDate: st.startDate ? new Date(st.startDate) : undefined,
              endDate: st.endDate ? new Date(st.endDate) : undefined
            });
          }
        }
        if (newTask && attachments.length > 0) {
          const { storage } = await import('../../firebase/config');
          const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const uploadedAttachments = [];

          for (const file of attachments) {
            const fileRef = ref(storage, `tasks/${newTask.id}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            uploadedAttachments.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              url: downloadURL,
              size: file.size,
              uploadedAt: new Date(),
              uploadedBy: currentUser!.id
            });
          }

          if (uploadedAttachments.length > 0) {
            await updateTask(newTask.id, { attachments: uploadedAttachments });
          }
        }
        resetForm();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setFormData({
      name: task.name,
      description: task.description,
      goalId: task.goalId || '',
      planId: task.planId || '',
      assignedTo: [...task.assignedTo],
      priority: task.priority,
      startDate: task.startDate ? format(task.startDate, 'yyyy-MM-dd') : '',
      endDate: task.endDate ? format(task.endDate, 'yyyy-MM-dd') : '',
      tags: [...(task.tags || [])],
      workType: task.workType || 'non-development'
    });
    setEditingTask(task);
    setShowAddForm(true);
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  const toggleAssignee = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(employeeId)
        ? prev.assignedTo.filter(id => id !== employeeId)
        : [...prev.assignedTo, employeeId]
    }));
  };

  const toggleSubtaskAssignee = (employeeId: string) => {
    setNewSubtask(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(employeeId)
        ? prev.assignedTo.filter(id => id !== employeeId)
        : [...prev.assignedTo, employeeId]
    }));
  };

  const addSubtaskToList = () => {
    if (newSubtask.name.trim()) {
      setSubtasks(prev => [...prev, { ...newSubtask }]);
      setNewSubtask({ name: '', assignedTo: [], priority: 'medium', startDate: '', endDate: '' });
    }
  };

  const removeSubtaskFromList = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const addMultiTaskRow = () => {
    setMultiTasks(prev => [...prev, {
      name: '',
      description: '',
      assignedTo: [],
      priority: 'medium',
      startDate: '',
      endDate: ''
    }]);
  };

  const updateMultiTaskRow = (index: number, field: string, value: any) => {
    setMultiTasks(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeMultiTaskRow = (index: number) => {
    setMultiTasks(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMultiAssignee = (index: number, employeeId: string) => {
    setMultiTasks(prev => prev.map((row, i) => {
      if (i !== index) return row;
      return {
        ...row,
        assignedTo: row.assignedTo.includes(employeeId)
          ? row.assignedTo.filter(id => id !== employeeId)
          : [...row.assignedTo, employeeId]
      };
    }));
  };

  const handleApprove = (taskId: string) => {
    approveTask(taskId, currentUser!.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      goalId: '',
      planId: '',
      assignedTo: [],
      priority: 'medium',
      startDate: '',
      endDate: '',
      tags: [],
      workType: 'non-development'
    });
    setMultiTasks([]);
    setMultiGoalId('');
    setMultiPlanId('');
    setSubtasks([]);
    setNewSubtask({ name: '', assignedTo: [], priority: 'medium', startDate: '', endDate: '' });
    setShowSubtasksSection(false);
    setAttachments([]);
    setShowAddForm(false);
    setEditingTask(null);
    setTaskMode('single');
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F]">Tasks</h1>
            <p className="text-[14px] text-[#787774] mt-1">{tasks.length} total tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-[#E9E9E7] rounded-[6px] p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] flex items-center gap-1.5 transition-[background] duration-150 ${viewMode === 'list' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
              >
                <List className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] flex items-center gap-1.5 transition-[background] duration-150 ${viewMode === 'kanban' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Board
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] flex items-center gap-1.5 transition-[background] duration-150 ${viewMode === 'timeline' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
              >
                <CalendarRange className="w-4 h-4" /> Timeline
              </button>
            </div>
            {canAssignTasks && (
              <button
                onClick={() => {
                  if (showAddForm) {
                    resetForm();
                  } else {
                    setShowAddForm(true);
                    setEditingTask(null);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Task
              </button>
            )}
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px]">
            <h3 className="text-[16px] font-semibold text-[#37352F] mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>

            {!editingTask && (
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
                  Single Task
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
                  Multiple Tasks
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {taskMode === 'single' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Task Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    required
                  />
                </div>
              )}

              {taskMode === 'single' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    rows={3}
                    required
                  />
                </div>
              )}

              {taskMode === 'single' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">
                    Work Type
                  </label>
                  <div className="flex items-center gap-1 bg-white border border-[#E9E9E7] rounded-[6px] p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, workType: 'development' })}
                      className={`px-4 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
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
                      className={`px-4 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 ${
                        formData.workType === 'non-development'
                          ? 'bg-[#E9E9E7] text-[#37352F]'
                          : 'text-[#787774] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      Non-Development
                    </button>
                  </div>
                  {formData.workType === 'development' && (
                    <p className="text-[12px] text-[#787774] mt-1.5">
                      Development tasks can be linked to a repository, branch and pull request.
                    </p>
                  )}
                </div>
              )}

              {taskMode === 'single' ? (
                <div className="grid grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5 flex items-center gap-1.5">
                      <NotebookText className="w-4 h-4 text-[#787774]" />
                      Monthly Plan (optional)
                    </label>
                    <select
                      value={formData.planId}
                      onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    >
                      <option value="">No Plan</option>
                      {sortedPlans.map((plan) => {
                        const app = plan.appId ? getAppById(plan.appId) : null;
                        return (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}{app ? ` — ${app.name}` : ` — ${monthLabel(plan.month)}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Goal (optional, all tasks)</label>
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
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5 flex items-center gap-1.5">
                      <NotebookText className="w-4 h-4 text-[#787774]" />
                      Monthly Plan (optional, all tasks)
                    </label>
                    <select
                      value={multiPlanId}
                      onChange={(e) => setMultiPlanId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    >
                      <option value="">No Plan</option>
                      {sortedPlans.map((plan) => {
                        const app = plan.appId ? getAppById(plan.appId) : null;
                        return (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}{app ? ` — ${app.name}` : ` — ${monthLabel(plan.month)}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {taskMode === 'single' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Assign To</label>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((emp) => {
                      const isSelected = formData.assignedTo.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleAssignee(emp.id)}
                          className={`px-3 py-1.5 text-[14px] border rounded-[6px] transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F] font-medium'
                              : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]'
                          }`}
                        >
                          {emp.name}
                        </button>
                      );
                    })}
                  </div>
                  {formData.assignedTo.length === 0 && (
                    <p className="text-[12px] text-[#787774] mt-1">Select one or more assignees</p>
                  )}
                </div>
              )}

              {taskMode === 'single' && (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}

              {taskMode === 'single' && (() => {
                const selectedGoal = formData.goalId ? getGoalById(formData.goalId) : null;
                const selectedAppId = selectedGoal?.appId;
                const appTags = selectedAppId ? getTagsForApp(selectedAppId) : [];
                const toggleTag = (tagId: string) => {
                  setFormData(prev => ({
                    ...prev,
                    tags: prev.tags.includes(tagId)
                      ? prev.tags.filter(id => id !== tagId)
                      : [...prev.tags, tagId]
                  }));
                };
                return (
                <div>
                  <label className="block text-[14px] font-medium text-[#37352F] mb-1.5 flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-[#787774]" />
                    Tags
                  </label>
                  {appTags.length === 0 ? (
                    <p className="text-[12px] text-[#787774]">Select a goal with an app to see available tags</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {appTags.map(tag => {
                        const isSelected = formData.tags.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-3 py-1.5 text-[14px] border rounded-[6px] transition-colors duration-150 ${
                              isSelected
                                ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F] font-medium'
                                : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5]'
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })()}

              {taskMode === 'single' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    />
                  </div>
                </div>
              )}

              {taskMode === 'multi' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[14px] font-medium text-[#37352F]">Tasks ({multiTasks.length})</label>
                    <button
                      type="button"
                      onClick={addMultiTaskRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Task
                    </button>
                  </div>

                  {multiTasks.length === 0 && (
                    <div className="text-center py-8 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
                      <p className="text-[14px] text-[#787774]">Click "Add Task" to add tasks under this goal</p>
                    </div>
                  )}

                  {multiTasks.map((row, idx) => (
                    <div key={idx} className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium text-[#37352F]">Task {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeMultiTaskRow(idx)}
                          className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-white rounded-[6px] transition-colors duration-150"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Task Name</label>
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateMultiTaskRow(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Description</label>
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => updateMultiTaskRow(idx, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
                          />
                        </div>
                      </div>

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

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Priority</label>
                          <select
                            value={row.priority}
                            onChange={(e) => updateMultiTaskRow(idx, 'priority', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">Start Date</label>
                          <input
                            type="date"
                            value={row.startDate}
                            onChange={(e) => updateMultiTaskRow(idx, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#37352F] mb-1">End Date</label>
                          <input
                            type="date"
                            value={row.endDate}
                            onChange={(e) => updateMultiTaskRow(idx, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {taskMode === 'single' && !editingTask && (
                <div className="pt-4 border-t border-[#E9E9E7]">
                  <button
                    type="button"
                    onClick={() => setShowSubtasksSection(!showSubtasksSection)}
                    className="flex items-center gap-2 text-[14px] font-medium text-[#37352F] hover:text-[#2383E2] transition-colors duration-150"
                  >
                    {showSubtasksSection ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                    <Layers className="w-4 h-4 text-[#787774]" />
                    Add Subtasks
                  </button>

                  {showSubtasksSection && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] space-y-3">
                        <div>
                          <label className="block text-[14px] font-medium text-[#37352F] mb-1">Subtask Name</label>
                          <input
                            type="text"
                            value={newSubtask.name}
                            onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none"
                            placeholder="Enter subtask name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[14px] font-medium text-[#37352F] mb-1">Priority</label>
                            <select
                              value={newSubtask.priority}
                              onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value as Subtask['priority'] })}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[14px] font-medium text-[#37352F] mb-1">Assign To</label>
                            <div className="flex flex-wrap gap-1">
                              {employees.map((emp) => {
                                const selected = newSubtask.assignedTo.includes(emp.id);
                                return (
                                  <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => toggleSubtaskAssignee(emp.id)}
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
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[14px] font-medium text-[#37352F] mb-1">Start Date</label>
                            <input
                              type="date"
                              value={newSubtask.startDate}
                              onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                            />
                          </div>
                          <div>
                            <label className="block text-[14px] font-medium text-[#37352F] mb-1">End Date</label>
                            <input
                              type="date"
                              value={newSubtask.endDate}
                              onChange={(e) => setNewSubtask({ ...newSubtask, endDate: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px]"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addSubtaskToList}
                          disabled={!newSubtask.name.trim()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          <Plus className="w-3 h-3" />
                          Add to List
                        </button>
                      </div>

                      {subtasks.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[14px] font-medium text-[#37352F]">Subtasks to be created ({subtasks.length})</p>
                          {subtasks.map((st, idx) => {
                            const assigneeNames = st.assignedTo.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ');
                            return (
                              <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-[8px]">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-medium text-[#37352F]">{st.name}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-[12px] px-2 py-0.5 rounded-full border ${st.priority === 'urgent' ? 'bg-[#FBE9E9] text-[#EB5757] border-[#FBE9E9]' : st.priority === 'high' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
                                      {st.priority}
                                    </span>
                                    {assigneeNames && (
                                      <span className="text-[12px] text-[#787774]">→ {assigneeNames}</span>
                                    )}
                                    {st.startDate && (
                                      <span className="text-[12px] text-[#787774]">{st.startDate}{st.endDate ? ` - ${st.endDate}` : ''}</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSubtaskFromList(idx)}
                                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition ml-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {taskMode === 'single' && !editingTask && (
                <div className="pt-4 border-t border-[#E9E9E7]">
                  <label className="block text-[14px] font-medium text-[#37352F] mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-[#787774]" />
                    Attachments
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-[#37352F] text-[14px] cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150">
                      <Paperclip className="w-4 h-4 text-[#787774]" />
                      Choose Files
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.txt"
                      />
                    </label>
                    {attachments.length > 0 && (
                      <span className="text-[12px] text-[#787774]">{attachments.length} file{attachments.length > 1 ? 's' : ''} selected</span>
                    )}
                  </div>

                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#787774] flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[14px] text-[#37352F] truncate">{file.name}</p>
                              <p className="text-[12px] text-[#787774]">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-white rounded-[6px] transition flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading || (taskMode === 'multi' && (multiTasks.length === 0 || !multiGoalId))}
                  className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                >
                  {uploading ? 'Uploading...' : editingTask ? 'Update Task' : taskMode === 'multi' ? `Create ${multiTasks.filter(t => t.name.trim()).length} Tasks` : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white text-[#37352F] text-[14px] font-medium border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[#787774]" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
          >
            <option value="all">All Tasks</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="pending_qa">Pending QA</option>
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
          </select>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
          >
            <option value="all">All Plans</option>
            {sortedPlans.map(plan => {
              const app = plan.appId ? getAppById(plan.appId) : null;
              return (
                <option key={plan.id} value={plan.id}>
                  {plan.name}{app ? ` — ${app.name}` : ` — ${monthLabel(plan.month)}`}
                </option>
              );
            })}
          </select>
          {(filterStatus !== 'all' || filterPlan !== 'all') && (
            <>
              <span className="text-[13px] text-[#787774]">{filteredTasks.length} matching</span>
              <button
                onClick={() => { setFilterStatus('all'); setFilterPlan('all'); }}
                className="flex items-center gap-1 px-2 py-1 text-[13px] text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            </>
          )}
        </div>

        {viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(status) => handleStatusChange(task, status)}
                  onApprove={() => handleApprove(task.id)}
                  onEdit={() => handleEdit(task)}
                  onDelete={() => handleDelete(task.id)}
                  onClick={() => setSelectedTask(task)}
                  onMailTask={() => sendTaskNotification(task.id)}
                  canApprove={canApprove}
                  canEdit={canAssignTasks}
                  canDelete={canAssignTasks}
                  getGoalById={getGoalById}
                  getAppById={getAppById}
                  getEmployeeById={getEmployeeById}
                  getPlanById={getMonthlyPlanById}
                  allTags={tags}
                />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className={`flex gap-4 items-start pb-4 ${filterStatus === 'all' ? 'overflow-x-auto' : ''}`}>
            {KANBAN_STATUSES
              .filter(status => filterStatus === 'all' || filterStatus === status)
              .map((status) => {
              const statusTasks = filteredTasks.filter(t => t.status === status);
              const meta = KANBAN_COLUMN_META[status];
              const isValidTarget = !!dragTask && dragTask.status !== status && dragValidTargets.has(status);
              const isInvalidTarget = !!dragTask && dragTask.status !== status && !dragValidTargets.has(status);
              const isOver = dragOverColumn === status;
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    if (!dragTask) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = isValidTarget ? 'move' : 'none';
                    if (dragOverColumn !== status) setDragOverColumn(status);
                  }}
                  onDragLeave={() => setDragOverColumn(prev => (prev === status ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragTask) handleKanbanDrop(dragTask, status);
                  }}
                  className={`bg-[#F7F7F5] border rounded-[8px] p-3 flex flex-col transition-colors duration-150 ${
                    filterStatus === 'all' ? 'w-[280px] flex-shrink-0' : 'flex-1 min-w-0'
                  } ${isOver && isValidTarget ? 'border-[#2383E2] bg-[#E8F0FE]' : 'border-[#E9E9E7]'} ${isInvalidTarget ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <h3 className="font-semibold text-[#37352F] capitalize text-[12px] tracking-wide">{meta.label}</h3>
                    <span className="text-[12px] text-[#787774] font-normal ml-auto bg-white border border-[#E9E9E7] rounded-full px-2 py-0.5">{statusTasks.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {statusTasks.map(task => {
                      const taskGoal = task.goalId ? getGoalById(task.goalId) : null;
                      const taskApp = taskGoal ? getAppById(taskGoal.appId) : (task.appId ? getAppById(task.appId) : null);
                      const isDragging = dragTaskId === task.id;
                      return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          setDragTaskId(task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          try { e.dataTransfer.setData('text/plain', task.id); } catch {}
                        }}
                        onDragEnd={() => { setDragTaskId(null); setDragOverColumn(null); }}
                        className={`bg-white border border-[#E9E9E7] rounded-[8px] p-3 cursor-grab active:cursor-grabbing hover:bg-[#F7F7F5] transition-colors duration-150 group ${isDragging ? 'opacity-40' : ''}`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1.5">
                              <GripVertical className="w-3.5 h-3.5 text-[#9B9A97] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                              <p className="text-[14px] font-medium text-[#37352F] leading-snug">{task.name}</p>
                            </div>
                            <p className="text-[12px] text-[#787774] mt-0.5 truncate">{taskApp?.name}{taskGoal ? ` → ${taskGoal.name}` : ''}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${task.priority === 'urgent' ? 'bg-[#FBE9E9] text-[#EB5757] border-[#FBE9E9]' : task.priority === 'high' ? 'bg-white text-[#37352F] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'urgent' ? 'bg-[#EB5757]' : task.priority === 'high' ? 'bg-[#37352F]' : 'bg-[#9B9A97]'}`} />
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span className="text-[11px] text-[#787774] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(task.dueDate, 'MMM d')}
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5">
                              <TagBadges tagIds={task.tags} allTags={tags} />
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); sendTaskNotification(task.id); }}
                              className={`p-1 rounded-[6px] ${task.lastEmailSentAt ? 'text-[#787774] hover:bg-white hover:text-[#37352F]' : 'text-[#9B9A97] hover:bg-white hover:text-[#37352F]'}`}
                              title={task.lastEmailSentAt ? `Resend email` : 'Send email'}
                            >
                              <Send className="w-3 h-3" />
                            </button>
                            {canAssignTasks && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                                className="p-1 text-[#787774] hover:bg-white hover:text-[#37352F] rounded-[6px]"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            {canAssignTasks && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                className="p-1 text-[#787774] hover:bg-white hover:text-[#37352F] rounded-[6px]"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {statusTasks.length === 0 && (
                    <div className={`text-[12px] text-[#9B9A97] text-center py-4 border-2 border-dashed rounded-[8px] transition-colors duration-150 ${isOver && isValidTarget ? 'border-[#2383E2] text-[#2383E2]' : 'border-transparent'}`}>
                      {dragTask && isValidTarget ? 'Drop here' : 'No tasks'}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <TaskTimeline
            tasks={filteredTasks}
            filterStatus={filterStatus}
            onStatusChange={(id, status) => {
              const task = tasks.find(t => t.id === id);
              if (task) handleStatusChange(task, status);
            }}
            onSelect={(task) => setSelectedTask(task)}
            onFilterChange={(status) => setFilterStatus(status)}
          />
        )}

        {filteredTasks.length === 0 && viewMode !== 'timeline' && (
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <p className="text-[14px] text-[#787774]">No tasks found</p>
          </div>
        )}

        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  onMailTask: () => void;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  getGoalById: (id: string) => any;
  getAppById: (id: string) => any;
  getEmployeeById: (id: string) => any;
  getPlanById: (id: string) => any;
  allTags: any[];
};

function TaskCard({
  task,
  onStatusChange,
  onApprove,
  onEdit,
  onDelete,
  onClick,
  onMailTask,
  canApprove,
  canEdit,
  canDelete,
  getGoalById,
  getAppById,
  getEmployeeById,
  getPlanById,
  allTags
}: TaskCardProps) {
  const { hasPermission } = useAuth();
  const goal = task.goalId ? getGoalById(task.goalId) : null;
  const app = goal ? getAppById(goal.appId) : null;
  const plan = task.planId ? getPlanById(task.planId) : (goal?.planId ? getPlanById(goal.planId) : null);
  const assignees = task.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
  const approver = task.approvedBy ? getEmployeeById(task.approvedBy) : null;

  const statusConfig: Record<TaskStatus, { icon: typeof XCircle; label: string; dot: string }> = {
    not_started: { icon: XCircle, label: 'Not started', dot: 'bg-[#9B9A97]' },
    in_progress: { icon: Clock, label: 'In progress', dot: 'bg-[#2383E2]' },
    blocked: { icon: AlertCircle, label: 'Blocked', dot: 'bg-[#EB5757]' },
    pending_qa: { icon: Clock, label: 'Pending QA', dot: 'bg-[#787774]' },
    completed: { icon: Clock, label: 'Completed', dot: 'bg-[#0F7B6C]' },
    approved: { icon: CheckCircle, label: 'Approved', dot: 'bg-[#0F7B6C]' }
  };

  const config = statusConfig[task.status] ?? statusConfig.not_started;
  const Icon = config.icon;

  const availableStatuses = availableTaskStatuses(task, hasPermission);

  return (
    <div
      className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-7 h-7 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-[#787774]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-[#37352F] leading-snug">{task.name}</h3>
              <p className="text-[14px] text-[#787774] mt-1 leading-normal line-clamp-2">{task.description}</p>
            </div>
            {task.priority === 'urgent' && (
              <Star className="w-4 h-4 text-[#EB5757] fill-[#EB5757] flex-shrink-0" />
            )}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onMailTask(); }}
                className={`p-1.5 rounded-[6px] transition-colors duration-150 ${task.lastEmailSentAt ? 'text-[#787774] hover:bg-white hover:text-[#37352F] border border-transparent hover:border-[#E9E9E7]' : 'text-[#9B9A97] hover:bg-white hover:text-[#37352F] border border-transparent hover:border-[#E9E9E7]'}`}
                title={task.lastEmailSentAt ? 'Resend email' : 'Send email'}
              >
                <Send className="w-4 h-4" />
              </button>
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[12px] text-[#787774]">
              {app?.name}{goal ? ` → ${goal.name}` : ''}
            </p>
            {app && (
              <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 mt-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">
                {app.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${task.priority === 'urgent' ? 'bg-[#FBE9E9] text-[#EB5757] border-[#EB5757]/20' : task.priority === 'high' ? 'bg-white text-[#37352F] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'urgent' ? 'bg-[#EB5757]' : task.priority === 'high' ? 'bg-[#37352F]' : 'bg-[#9B9A97]'}`} />
              {task.priority.toUpperCase()}
            </span>

            <span className="text-[12px] font-medium px-2 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774]">
              {(task.workType || 'non-development') === 'development' ? 'DEV' : 'OPS'}
            </span>

            {plan && (
              <span className="text-[12px] font-medium px-2 py-1 rounded-full bg-[#E8F0FE] border border-[#E9E9E7] text-[#2383E2] inline-flex items-center gap-1">
                <NotebookText className="w-3 h-3" />
                {plan.name}
              </span>
            )}

            {task.github?.pullRequest?.prNumber && (
              <span className="text-[12px] font-medium px-2 py-1 rounded-full bg-white border border-[#E9E9E7] text-[#787774] inline-flex items-center gap-1">
                <GitPullRequest className="w-3 h-3" />
                PR #{task.github.pullRequest.prNumber}
              </span>
            )}

            <select
              value={task.status}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange(e.target.value as TaskStatus);
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[12px] bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] px-2 py-1 focus:border-[#2383E2] focus:outline-none"
              disabled={task.status === 'approved'}
            >
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>

            {assignees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#787774]" />
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((emp, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 bg-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] text-[12px] font-medium border-2 border-white"
                      title={emp?.name}
                    >
                      {emp?.name.charAt(0)}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-6 h-6 bg-[#F7F7F5] rounded-full flex items-center justify-center text-[#787774] text-[12px] font-medium border-2 border-white">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            <span className="text-[12px] text-[#9B9A97]">
              Created {format(task.createdAt, 'MMM d, yyyy')}
            </span>
          </div>

          <TagBadges tagIds={task.tags} allTags={allTags} />

          {task.status === 'completed' && !task.approvedBy && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
            >
              <Check className="w-4 h-4" />
              Approve Task
            </button>
          )}

          {task.approvedBy && approver && (
            <div className="mt-3 pt-3 border-t border-[#E9E9E7]">
              <p className="text-[12px] text-[#0F7B6C] font-medium">
                ✓ Approved by {approver.name} on{' '}
                {task.approvedAt && format(task.approvedAt, 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
