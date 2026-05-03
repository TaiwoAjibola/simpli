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
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus } from '../types';
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
    getEmployeeById
  } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    assignedTo: [] as string[],
    priority: 'medium' as const
  });

  const filteredTasks =
    filterStatus === 'all' ? tasks : tasks.filter((t) => t.status === filterStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTask(editingTask.id, formData);
    } else {
      addTask({
        ...formData,
        status: 'not_started'
      });
    }
    setFormData({
      name: '',
      description: '',
      goalId: '',
      assignedTo: [],
      priority: 'medium'
    });
    setShowAddForm(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setFormData({
      name: task.name,
      description: task.description,
      goalId: task.goalId,
      assignedTo: [...task.assignedTo],
      priority: task.priority
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

  const handleApprove = (taskId: string) => {
    approveTask(taskId, currentUser!.id);
  };

  const canApprove = hasPermission('approve_tasks');

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

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
              >
                {editingTask ? 'Update' : 'Create'} Task
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
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                            className="p-1 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                            className="p-1 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1.5 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded transition"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
