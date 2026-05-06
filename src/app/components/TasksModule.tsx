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
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Send,
  Paperclip,
  FileText,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus, Subtask, SubtaskStatus } from '../types';
import { TaskDetailModal } from './TaskDetailModal';

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
    addComment
  } = useApp();

  const canAssignTasks = hasPermission('assign_tasks');
  const canViewAllApps = hasPermission('view_all_apps');
  const canApprove = hasPermission('approve_tasks');

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    assignedTo: [] as string[],
    priority: 'medium' as const,
    startDate: '',
    endDate: ''
  });
  const [showSubtasksSection, setShowSubtasksSection] = useState(false);
  const [subtasks, setSubtasks] = useState<{ name: string; assignedTo: string[]; priority: Subtask['priority'] }[]>([]);
  const [newSubtask, setNewSubtask] = useState({ name: '', assignedTo: [] as string[], priority: 'medium' as Subtask['priority'] });
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
      } else {
        const newTask = await addTask({
          ...formData,
          startDate: formData.startDate ? new Date(formData.startDate) : undefined,
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          status: 'not_started'
        });
        if (newTask && subtasks.length > 0) {
          for (const st of subtasks) {
            addSubtask({
              ...st,
              taskId: newTask.id,
              status: 'pending'
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
      }
      setFormData({
        name: '',
        description: '',
        goalId: '',
        assignedTo: [],
        priority: 'medium',
        startDate: '',
        endDate: ''
      });
      setSubtasks([]);
      setNewSubtask({ name: '', assignedTo: [], priority: 'medium' });
      setShowSubtasksSection(false);
      setAttachments([]);
      setShowAddForm(false);
      setEditingTask(null);
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
      goalId: task.goalId,
      assignedTo: [...task.assignedTo],
      priority: task.priority,
      startDate: task.startDate ? format(task.startDate, 'yyyy-MM-dd') : '',
      endDate: task.endDate ? format(task.endDate, 'yyyy-MM-dd') : ''
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
      setNewSubtask({ name: '', assignedTo: [], priority: 'medium' });
    }
  };

  const removeSubtaskFromList = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleApprove = (taskId: string) => {
    approveTask(taskId, currentUser!.id);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Tasks</h1>
          <p className="text-[#6b6b80]">{tasks.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'text-[#00e5ff]' : 'text-[#6b6b80]'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === 'kanban' ? 'text-[#00e5ff]' : 'text-[#6b6b80]'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
          </div>
          {canAssignTasks && (
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingTask(null);
                setFormData({ name: '', description: '', goalId: '', assignedTo: [], priority: 'medium' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Task Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                  Goal
                </label>
                <select
                  value={formData.goalId}
                  onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
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
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                  Assign To
                </label>
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
                            ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                            : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                        }`}
                      >
                        {emp.name}
                      </button>
                    );
                  })}
                </div>
                {formData.assignedTo.length === 0 && (
                  <p className="text-xs text-[#6b6b80] mt-1">Select one or more assignees</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                  })
                }
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {!editingTask && (
              <div className="pt-4 border-t border-[rgba(0,229,255,0.1)]">
                <button
                  type="button"
                  onClick={() => setShowSubtasksSection(!showSubtasksSection)}
                  className="flex items-center gap-2 text-sm font-medium text-[#00e5ff] hover:text-[#00c4e0] transition"
                >
                  {showSubtasksSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Layers className="w-4 h-4" />
                  Add Subtasks
                </button>

                {showSubtasksSection && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-[#f0f0f5] mb-1">Subtask Name</label>
                        <input
                          type="text"
                          value={newSubtask.name}
                          onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          placeholder="Enter subtask name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-[#f0f0f5] mb-1">Priority</label>
                          <select
                            value={newSubtask.priority}
                            onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value as Subtask['priority'] })}
                            className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#f0f0f5] mb-1">Assign To</label>
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
                      <button
                        type="button"
                        onClick={addSubtaskToList}
                        disabled={!newSubtask.name.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                        Add to List
                      </button>
                    </div>

                    {subtasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#f0f0f5]">Subtasks to be created ({subtasks.length})</p>
                        {subtasks.map((st, idx) => {
                          const assigneeNames = st.assignedTo.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ');
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#f0f0f5]">{st.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 ${
                                    st.priority === 'urgent' ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                                    st.priority === 'high' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                                    st.priority === 'medium' ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]' :
                                    'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]'
                                  }`}>
                                    {st.priority}
                                  </span>
                                  {assigneeNames && (
                                    <span className="text-xs text-[#6b6b80]">→ {assigneeNames}</span>
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

            {!editingTask && (
              <div className="pt-4 border-t border-[rgba(0,229,255,0.1)]">
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm cursor-pointer hover:bg-[#1e1e2a] transition">
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
                    <span className="text-xs text-[#6b6b80]">{attachments.length} file{attachments.length > 1 ? 's' : ''} selected</span>
                  )}
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#00e5ff] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-[#f0f0f5] truncate">{file.name}</p>
                            <p className="text-xs text-[#6b6b80]">{formatFileSize(file.size)}</p>
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
                disabled={uploading}
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : (editingTask ? 'Update' : 'Create') + ' Task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTask(null);
                  setFormData({
                    name: '',
                    description: '',
                    goalId: '',
                    assignedTo: [],
                    priority: 'medium'
                  });
                }}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <Filter className="w-5 h-5 text-[#6b6b80]" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
          className="px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
        >
          <option value="all">All Tasks</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
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
                canApprove={canApprove}
                canEdit={canAssignTasks}
                canDelete={canAssignTasks}
                getGoalById={getGoalById}
                getAppById={getAppById}
                getEmployeeById={getEmployeeById}
              />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {(['not_started', 'in_progress', 'blocked', 'completed', 'approved'] as TaskStatus[]).map((status) => {
            const statusTasks = filteredTasks.filter(t => t.status === status);
            return (
              <div key={status} className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4">
                <h3 className="font-semibold text-[#f0f0f5] mb-3 capitalize text-sm">{status.replace('_', ' ')}</h3>
                <div className="space-y-2">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] cursor-pointer hover:border-[rgba(0,229,255,0.3)] transition group"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#f0f0f5]">{task.name}</p>
                          <span className={`text-xs px-2 py-0.5 mt-1 inline-block ${
                            task.priority === 'urgent' ? 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]' :
                            task.priority === 'high' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                            task.priority === 'medium' ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]' :
                            'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition ml-2">
                          {canAssignTasks && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                              className="p-1 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded"
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <p className="text-[#6b6b80]">No tasks found</p>
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
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
  getGoalById: (id: string) => any;
  getAppById: (id: string) => any;
  getEmployeeById: (id: string) => any;
};

function TaskCard({
  task,
  onStatusChange,
  onApprove,
  onEdit,
  onDelete,
  onClick,
  canApprove,
  canEdit,
  canDelete,
  getGoalById,
  getAppById,
  getEmployeeById
}: TaskCardProps) {
  const goal = getGoalById(task.goalId);
  const app = goal ? getAppById(goal.appId) : null;
  const assignees = task.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
  const approver = task.approvedBy ? getEmployeeById(task.approvedBy) : null;

  const statusConfig = {
    not_started: { icon: XCircle, color: 'text-[#6b6b80]', bg: 'bg-[rgba(107,107,128,0.05)]' },
    in_progress: { icon: Clock, color: 'text-[#00e5ff]', bg: 'bg-[rgba(0,229,255,0.05)]' },
    blocked: { icon: AlertCircle, color: 'text-[#ff3b5c]', bg: 'bg-[rgba(255,59,92,0.05)]' },
    completed: { icon: Clock, color: 'text-[#8b5cf6]', bg: 'bg-[rgba(139,92,246,0.05)]' },
    approved: { icon: CheckCircle, color: 'text-[#10b981]', bg: 'bg-[rgba(16,185,129,0.05)]' }
  };

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  const config = statusConfig[task.status];
  const Icon = config.icon;

  return (
    <div
      className={`p-5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] ${config.bg} cursor-pointer hover:border-[rgba(0,229,255,0.3)] hover:shadow-lg transition`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Icon className={`w-6 h-6 mt-1 ${config.color}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-semibold text-[#f0f0f5]">{task.name}</h3>
              <p className="text-sm text-[#6b6b80] mt-1">{task.description}</p>
            </div>
            {task.priority === 'urgent' && (
              <Star className="w-5 h-5 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />
            )}
            <div className="flex gap-1 flex-shrink-0">
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded transition"
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
            <p className="text-xs text-[#6b6b80]">
              {app?.name} → {goal?.name}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span
              className={`text-xs font-medium px-3 py-1 ${
                priorityColors[task.priority]
              }`}
            >
              {task.priority.toUpperCase()}
            </span>

            <select
              value={task.status}
              onChange={(e) => {
                e.stopPropagation();
                onStatusChange(e.target.value as TaskStatus);
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

            {assignees.length > 0 && (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#6b6b80]" />
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((emp, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] rounded-full flex items-center justify-center text-[#0a0a0f] text-xs font-bold border-2 border-[#12121a]"
                      title={emp?.name}
                    >
                      {emp?.name.charAt(0)}
                    </div>
                  ))}
                  {assignees.length > 3 && (
                    <div className="w-6 h-6 bg-[#1a1a2e] rounded-full flex items-center justify-center text-[#6b6b80] text-xs font-bold border-2 border-[#12121a]">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            <span className="text-xs text-[#6b6b80]">
              Created {format(task.createdAt, 'MMM d, yyyy')}
            </span>
          </div>

          {task.status === 'completed' && !task.approvedBy && canApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-[#0a0a0f] font-medium hover:bg-[#0d9668] transition text-sm"
            >
              <Check className="w-4 h-4" />
              Approve Task
            </button>
          )}

          {task.approvedBy && approver && (
            <div className="mt-3 pt-3 border-t border-[rgba(0,229,255,0.1)]">
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
