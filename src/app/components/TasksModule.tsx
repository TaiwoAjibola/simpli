import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
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
  GitPullRequest
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus, Subtask, SubtaskStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';
import { TaskTimeline } from './TaskTimeline';
import { TagBadges } from './TagBadges';
import { getCardClasses, getCardInlineStyle } from '../../utils/cardStyles';
import { getWorkTargetStates, PermissionCheck } from '../../utils/workflow';

function availableTaskStatuses(task: Task): TaskStatus[] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { hasPermission } = useAuth();
  const targets = getWorkTargetStates({
    kind: 'task',
    currentStatus: task.status,
    workType: task.workType || 'non-development',
    can: hasPermission
  });
  const result = [task.status, ...targets] as TaskStatus[];
  return [...new Set(result)];
}

export function TasksModule() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { currentUser, hasPermission } = useAuth();
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
    getTagsForApp
  } = useApp();

  const canAssignTasks = hasPermission('assign_tasks');
  const canViewAllApps = hasPermission('view_all_apps');
  const canApprove = hasPermission('approve_tasks');

  const [showAddForm, setShowAddForm] = useState(false);
  const [taskMode, setTaskMode] = useState<'single' | 'multi'>('single');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'timeline'>('list');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    assignedTo: [] as string[],
    priority: 'medium' as const,
    startDate: '',
    endDate: '',
    tags: [] as string[],
    workType: 'non-development' as 'development' | 'non-development'
  });
  const [multiGoalId, setMultiGoalId] = useState('');
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

  const filteredTasks =
    filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          ...formData,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined
        });
        resetForm();
      } else if (taskMode === 'multi') {
        const createdTasks = [];
        for (const row of multiTasks) {
          const task = await addTask({
            name: row.name,
            description: row.description,
            goalId: multiGoalId || undefined,
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
      assignedTo: [],
      priority: 'medium',
      startDate: '',
      endDate: '',
      tags: [],
      workType: 'non-development'
    });
    setMultiTasks([]);
    setMultiGoalId('');
    setSubtasks([]);
    setNewSubtask({ name: '', assignedTo: [], priority: 'medium' });
    setShowSubtasksSection(false);
    setAttachments([]);
    setShowAddForm(false);
    setEditingTask(null);
    setTaskMode('single');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">Tasks</h1>
          <p className="text-[#94A3B8]">{tasks.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === 'kanban' ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === 'timeline' ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}
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
              className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] transition"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 p-6 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
          <h3 className="font-semibold text-[#F8FAFC] mb-4">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h3>

          {!editingTask && (
            <div className="flex items-center gap-1 mb-6 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] w-fit">
              <button
                type="button"
                onClick={() => setTaskMode('single')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  taskMode === 'single'
                    ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Single Task
              </button>
              <button
                type="button"
                onClick={() => setTaskMode('multi')}
                className={`px-4 py-2 text-sm font-medium transition ${
                  taskMode === 'multi'
                    ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Multiple Tasks
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {taskMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Task Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                  required
                />
              </div>
            )}

            {taskMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                  rows={3}
                  required
                />
              </div>
            )}

            {taskMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                  Work Type
                </label>
                <div className="flex items-center gap-1 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] w-fit">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, workType: 'development' })}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      formData.workType === 'development'
                        ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    Development
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, workType: 'non-development' })}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      formData.workType === 'non-development'
                        ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    Non-Development
                  </button>
                </div>
                {formData.workType === 'development' && (
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Development tasks can be linked to a repository, branch and pull request.
                  </p>
                )}
              </div>
            )}

            {taskMode === 'single' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Goal (optional)</label>
                  <select
                    value={formData.goalId}
                    onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
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
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Assign To</label>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((emp) => {
                      const isSelected = formData.assignedTo.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleAssignee(emp.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(34,197,94,0.1)] border-[#22C55E] text-[#22C55E] font-medium'
                              : 'bg-[#1E293B] border-[rgba(34,197,94,0.1)] text-[#F8FAFC] hover:border-[rgba(34,197,94,0.3)]'
                          }`}
                        >
                          {emp.name}
                        </button>
                      );
                    })}
                  </div>
                  {formData.assignedTo.length === 0 && (
                    <p className="text-xs text-[#94A3B8] mt-1">Select one or more assignees</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Goal (optional, all tasks)</label>
                <select
                  value={multiGoalId}
                  onChange={(e) => setMultiGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
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
            )}

            {taskMode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                    })
                  }
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
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
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2 flex items-center gap-2">
                  <TagIcon className="w-4 h-4" />
                  Tags
                </label>
                {appTags.length === 0 ? (
                  <p className="text-xs text-[#94A3B8]">Select a goal with an app to see available tags</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {appTags.map(tag => {
                      const isSelected = formData.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(34,197,94,0.1)] border-[#22C55E] text-[#22C55E] font-medium'
                              : 'bg-[#1E293B] border-[rgba(34,197,94,0.1)] text-[#F8FAFC] hover:border-[rgba(34,197,94,0.3)]'
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
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}

            {taskMode === 'multi' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[#F8FAFC]">Tasks ({multiTasks.length})</label>
                  <button
                    type="button"
                    onClick={addMultiTaskRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>

                {multiTasks.length === 0 && (
                  <div className="text-center py-8 bg-[#1E293B] border border-dashed border-[rgba(34,197,94,0.1)]">
                    <p className="text-sm text-[#94A3B8]">Click "Add Task" to add tasks under this goal</p>
                  </div>
                )}

                {multiTasks.map((row, idx) => (
                  <div key={idx} className="p-4 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#F8FAFC]">Task {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMultiTaskRow(idx)}
                        className="p-1 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#F8FAFC] mb-1">Task Name</label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateMultiTaskRow(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#F8FAFC] mb-1">Description</label>
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateMultiTaskRow(idx, 'description', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#F8FAFC] mb-1">Assign To</label>
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
                                  ? 'bg-[rgba(34,197,94,0.1)] border-[#22C55E] text-[#22C55E]'
                                  : 'bg-[#0F172A] border-[rgba(34,197,94,0.1)] text-[#F8FAFC]'
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
                        <label className="block text-xs font-medium text-[#F8FAFC] mb-1">Priority</label>
                        <select
                          value={row.priority}
                          onChange={(e) => updateMultiTaskRow(idx, 'priority', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#F8FAFC] mb-1">Start Date</label>
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(e) => updateMultiTaskRow(idx, 'startDate', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#F8FAFC] mb-1">End Date</label>
                        <input
                          type="date"
                          value={row.endDate}
                          onChange={(e) => updateMultiTaskRow(idx, 'endDate', e.target.value)}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {taskMode === 'single' && !editingTask && (
              <div className="pt-4 border-t border-[rgba(34,197,94,0.1)]">
                <button
                  type="button"
                  onClick={() => setShowSubtasksSection(!showSubtasksSection)}
                  className="flex items-center gap-2 text-sm font-medium text-[#22C55E] hover:text-[#16a34a] transition"
                >
                  {showSubtasksSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Layers className="w-4 h-4" />
                  Add Subtasks
                </button>

                {showSubtasksSection && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Subtask Name</label>
                        <input
                          type="text"
                          value={newSubtask.name}
                          onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                          placeholder="Enter subtask name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Priority</label>
                          <select
                            value={newSubtask.priority}
                            onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value as Subtask['priority'] })}
                            className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Assign To</label>
                          <div className="flex flex-wrap gap-1">
                            {employees.map((emp) => {
                              const selected = newSubtask.assignedTo.includes(emp.id);
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => toggleSubtaskAssignee(emp.id)}
                                  className={`px-2 py-1 text-xs border transition ${
                                    selected
                                      ? 'bg-[rgba(34,197,94,0.1)] border-[#22C55E] text-[#22C55E]'
                                      : 'bg-[#0F172A] border-[rgba(34,197,94,0.1)] text-[#F8FAFC]'
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
                          <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Start Date</label>
                          <input
                            type="date"
                            value={newSubtask.startDate}
                            onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#F8FAFC] mb-1">End Date</label>
                          <input
                            type="date"
                            value={newSubtask.endDate}
                            onChange={(e) => setNewSubtask({ ...newSubtask, endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addSubtaskToList}
                        disabled={!newSubtask.name.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                        Add to List
                      </button>
                    </div>

                    {subtasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#F8FAFC]">Subtasks to be created ({subtasks.length})</p>
                        {subtasks.map((st, idx) => {
                          const assigneeNames = st.assignedTo.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ');
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#F8FAFC]">{st.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 ${
                                    st.priority === 'urgent' ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                                    st.priority === 'high' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                                    st.priority === 'medium' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' :
                                    'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
                                  }`}>
                                    {st.priority}
                                  </span>
                                  {assigneeNames && (
                                    <span className="text-xs text-[#94A3B8]">→ {assigneeNames}</span>
                                  )}
                                  {st.startDate && (
                                    <span className="text-xs text-[#94A3B8]">{st.startDate}{st.endDate ? ` - ${st.endDate}` : ''}</span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSubtaskFromList(idx)}
                                className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition ml-2"
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
              <div className="pt-4 border-t border-[rgba(34,197,94,0.1)]">
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm cursor-pointer hover:bg-[#1E293B] transition">
                    <Paperclip className="w-4 h-4" />
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
                    <span className="text-xs text-[#94A3B8]">{attachments.length} file{attachments.length > 1 ? 's' : ''} selected</span>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-[#F8FAFC] truncate">{file.name}</p>
                            <p className="text-xs text-[#94A3B8]">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-1 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition flex-shrink-0"
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
                className="px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : editingTask ? 'Update Task' : taskMode === 'multi' ? `Create ${multiTasks.filter(t => t.name.trim()).length} Tasks` : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-[#1E293B] text-[#F8FAFC] border border-[rgba(34,197,94,0.1)] hover:bg-[#1E293B]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <Filter className="w-5 h-5 text-[#94A3B8]" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
          className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        >
          <option value="all">All Tasks</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="pending_qa">Pending QA</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={(status) => updateTask(task.id, { status })}
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
                allTags={tags}
              />
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {(['not_started', 'in_progress', 'blocked', 'pending_qa', 'completed', 'approved'] as TaskStatus[]).map((status) => {
            const statusTasks = filteredTasks.filter(t => t.status === status);
            return (
              <div key={status} className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
                <h3 className="font-semibold text-[#F8FAFC] mb-3 capitalize text-sm">{status.replace('_', ' ')}</h3>
                <div className="space-y-2">
                  {statusTasks.map(task => {
                    const taskGoal = task.goalId ? getGoalById(task.goalId) : null;
                    const taskApp = taskGoal ? getAppById(taskGoal.appId) : null;
                    const taskAppColor = taskApp?.color || '#22C55E';
                    const taskCardStyle = (taskApp?.cardStyle || 'default') as 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';
                    return (
                    <div
                      key={task.id}
                      className={`${getCardClasses(taskCardStyle, taskAppColor, true)}`}
                      style={getCardInlineStyle(taskCardStyle, taskAppColor)}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#F8FAFC]">{task.name}</p>
                          <p className="text-xs text-[#94A3B8] mt-0.5">{taskApp?.name}{taskGoal ? ` → ${taskGoal.name}` : ''}</p>
                          <span className={`text-xs px-2 py-0.5 mt-1 inline-block ${
                            task.priority === 'urgent' ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                            task.priority === 'high' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                            task.priority === 'medium' ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' :
                            'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
                          }`}>
                            {task.priority}
                          </span>
                          <TagBadges tagIds={task.tags} allTags={tags} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); sendTaskNotification(task.id); }}
                            className={`p-1 rounded ${
                              task.lastEmailSentAt
                                ? 'text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)]'
                                : 'text-[#10b981] hover:bg-[rgba(16,185,129,0.1)]'
                            }`}
                            title={task.lastEmailSentAt ? `Resend email` : 'Send email'}
                          >
                            <Send className="w-3 h-3" />
                          </button>
                          {canAssignTasks && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                              className="p-1 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {canAssignTasks && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                              className="p-1 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded"
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
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <TaskTimeline
          tasks={filteredTasks}
          filterStatus={filterStatus}
          onStatusChange={(id, status) => updateTask(id, { status })}
          onSelect={(task) => setSelectedTask(task)}
          onFilterChange={(status) => setFilterStatus(status)}
        />
      )}

      {filteredTasks.length === 0 && viewMode !== 'timeline' && (
        <div className="text-center py-12 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
          <p className="text-[#94A3B8]">No tasks found</p>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
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
  allTags
}: TaskCardProps) {
  const { hasPermission } = useAuth();
  const goal = task.goalId ? getGoalById(task.goalId) : null;
  const app = goal ? getAppById(goal.appId) : null;
  const appColor = app?.color || '#22C55E';
  const cardStyle = (app?.cardStyle || 'default') as 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';
  const assignees = task.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
  const approver = task.approvedBy ? getEmployeeById(task.approvedBy) : null;

  const statusConfig: Record<TaskStatus, { icon: typeof XCircle; color: string; bg: string }> = {
    not_started: { icon: XCircle, color: 'text-[#94A3B8]', bg: 'bg-[rgba(107,107,128,0.05)]' },
    in_progress: { icon: Clock, color: 'text-[#22C55E]', bg: 'bg-[rgba(34,197,94,0.05)]' },
    blocked: { icon: AlertCircle, color: 'text-[#ff3b5c]', bg: 'bg-[rgba(255,59,92,0.05)]' },
    pending_qa: { icon: Clock, color: 'text-[#8b5cf6]', bg: 'bg-[rgba(139,92,246,0.05)]' },
    completed: { icon: Clock, color: 'text-[#8b5cf6]', bg: 'bg-[rgba(139,92,246,0.05)]' },
    approved: { icon: CheckCircle, color: 'text-[#10b981]', bg: 'bg-[rgba(16,185,129,0.05)]' }
  };

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]',
    medium: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  const config = statusConfig[task.status] ?? statusConfig.not_started;
  const Icon = config.icon;

  const availableStatuses = availableTaskStatuses(task);

  return (
    <div
      className={`${getCardClasses(cardStyle, appColor)} ${config.bg}`}
      style={getCardInlineStyle(cardStyle, appColor)}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Icon className={`w-6 h-6 mt-1 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-semibold text-[#F8FAFC]">{task.name}</h3>
              <p className="text-sm text-[#94A3B8] mt-1">{task.description}</p>
            </div>
            {task.priority === 'urgent' && (
              <Star className="w-5 h-5 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />
            )}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onMailTask(); }}
                className={`p-1.5 rounded transition ${
                  task.lastEmailSentAt
                    ? 'text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)]'
                    : 'text-[#10b981] hover:bg-[rgba(16,185,129,0.1)]'
                }`}
                title={task.lastEmailSentAt ? 'Resend email' : 'Send email'}
              >
                <Send className="w-4 h-4" />
              </button>
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] rounded transition"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-[#94A3B8]">
              {app?.name}{goal ? ` → ${goal.name}` : ''}
            </p>
            {app && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 mt-1"
                style={{
                  backgroundColor: `${appColor}20`,
                  color: appColor,
                  borderLeft: `2px solid ${appColor}`
                }}
              >
                {app.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span
              className={`text-xs font-medium px-3 py-1 ${
                priorityColors[task.priority]
              }`}
            >
              {task.priority.toUpperCase()}
            </span>

            <span className={`text-xs font-medium px-2 py-1 ${
              (task.workType || 'non-development') === 'development'
                ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                : 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
            }`}>
              {(task.workType || 'non-development') === 'development' ? 'DEV' : 'OPS'}
            </span>

            {task.github?.pullRequest?.prNumber && (
              <span className={`text-xs font-medium px-2 py-1 inline-flex items-center gap-1 ${
                task.github.pullRequest.state === 'merged'
                  ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                  : task.github.pullRequest.reviewState === 'approved' && task.github.pullRequest.checkStatus === 'success'
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                    : task.github.pullRequest.reviewState === 'changes_requested' ||
                      task.github.pullRequest.checkStatus === 'failure'
                      ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                      : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
              }`}>
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
              className="text-xs bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] px-2 py-1"
              disabled={task.status === 'approved'}
            >
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>

            {assignees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#94A3B8]" />
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((emp, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 bg-gradient-to-br from-[#22C55E] to-[#8b5cf6] rounded-full flex items-center justify-center text-[#020617] text-xs font-bold border-2 border-[#0F172A]"
                      title={emp?.name}
                    >
                      {emp?.name.charAt(0)}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-6 h-6 bg-[#1E293B] rounded-full flex items-center justify-center text-[#94A3B8] text-xs font-bold border-2 border-[#0F172A]">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            <span className="text-xs text-[#94A3B8]">
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
              className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-[#020617] font-medium hover:bg-[#0d9668] transition text-sm"
            >
              <Check className="w-4 h-4" />
              Approve Task
            </button>
          )}

          {task.approvedBy && approver && (
            <div className="mt-3 pt-3 border-t border-[rgba(34,197,94,0.1)]">
              <p className="text-xs text-[#10b981] font-medium">
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
