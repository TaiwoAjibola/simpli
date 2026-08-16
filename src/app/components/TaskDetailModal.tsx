import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskStatus, Subtask, SubtaskStatus } from '../types';
import {
  X,
  User,
  Calendar,
  Flag,
  Target,
  Layers,
  MessageSquare,
  Clock,
  FileText,
  Activity,
  Send,
  CheckCircle,
  Star,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Mail,
  Link2,
  Github
} from 'lucide-react';
import { format } from 'date-fns';
import { TagBadges } from './TagBadges';
import { QaWorkPanel } from './QaWorkPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { DevelopmentWorkspace } from './DevelopmentWorkspace';
import { isDevelopmentWork } from '../../utils/workflow';

type TaskDetailModalProps = {
  task: Task;
  onClose: () => void;
};

export function TaskDetailModal({ task: initialTask, onClose }: TaskDetailModalProps) {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const {
    tasks,
    defects,
    actionPoints,
    updateTask,
    approveTask,
    getEmployeeById,
    getGoalById,
    getAppById,
    addComment,
    getCommentsForTask,
    getSubtasksForTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    employees,
    sendTaskNotification,
    tags
  } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments' | 'activity' | 'qa' | 'deps' | 'github'>('details');
  const [commentText, setCommentText] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    name: '',
    assignedTo: [] as string[],
    priority: 'medium' as Subtask['priority'],
    status: 'pending' as SubtaskStatus,
    startDate: '',
    endDate: ''
  });
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [subtaskCommentText, setSubtaskCommentText] = useState('');

  const task = tasks.find(t => t.id === initialTask.id) || initialTask;

  const assignees = task.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
  const goal = getGoalById(task.goalId);
  const app = goal ? getAppById(goal.appId) : null;
  const approver = task.approvedBy ? getEmployeeById(task.approvedBy) : null;

  const comments = getCommentsForTask(task.id);
  const subtasks = getSubtasksForTask(task.id);
  const canApprove = hasPermission('approve_tasks');

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateTask(task.id, { status: newStatus });
  };

  const handleApprove = () => {
    approveTask(task.id, currentUser!.id);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      addComment({ taskId: task.id, userId: currentUser!.id, content: commentText });
      setCommentText('');
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtask.name.trim()) {
      addSubtask({
        ...newSubtask,
        taskId: task.id,
        startDate: newSubtask.startDate ? new Date(newSubtask.startDate) : undefined,
        endDate: newSubtask.endDate ? new Date(newSubtask.endDate) : undefined
      });
      setNewSubtask({ name: '', assignedTo: [], priority: 'medium', status: 'pending', startDate: '', endDate: '' });
      setShowAddSubtask(false);
    }
  };

  const handleSubtaskStatusChange = (subtaskId: string, status: SubtaskStatus) => {
    updateSubtask(subtaskId, { status });
  };

  const handleSubtaskPriorityChange = (subtaskId: string, priority: Subtask['priority']) => {
    updateSubtask(subtaskId, { priority });
  };

  const handleSubtaskAssigneeChange = (subtaskId: string, assignedTo: string[]) => {
    updateSubtask(subtaskId, { assignedTo });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (confirm('Delete this subtask?')) {
      deleteSubtask(subtaskId);
    }
  };

  const [sendingEmail, setSendingEmail] = useState(false);
  const handleSendEmail = async () => {
    setSendingEmail(true);
    await sendTaskNotification(task.id);
    setSendingEmail(false);
    showToast({ type: 'success', title: 'Email Sent', message: `Notification sent for "${task.name}"` });
  };

  const toggleAssignee = (employeeId: string) => {
    setNewSubtask(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(employeeId)
        ? prev.assignedTo.filter(id => id !== employeeId)
        : [...prev.assignedTo, employeeId]
    }));
  };

  const handleAddSubtaskComment = (subtaskId: string) => {
    if (subtaskCommentText.trim()) {
      addComment({ subtaskId, userId: currentUser!.id, content: subtaskCommentText });
      setSubtaskCommentText('');
    }
  };

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8] border-[rgba(107,107,128,0.2)]',
    medium: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.2)]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c] border-[rgba(255,59,92,0.2)]'
  };

  const statusColors = {
    not_started: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]',
    in_progress: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    blocked: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]',
    completed: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
    approved: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
  };

  const subtaskStatusColors = {
    pending: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]',
    in_progress: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    completed: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-[rgba(34,197,94,0.1)]">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#F8FAFC]">{task.name}</h2>
              {task.priority === 'urgent' && (
                <Star className="w-6 h-6 text-[#ff3b5c] fill-[#ff3b5c]" />
              )}
            </div>
            <p className="text-sm text-[#94A3B8]">
              {app?.name} → {goal?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                  task.lastEmailSentAt
                    ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)]'
                    : 'bg-[rgba(16,185,129,0.1)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)]'
                } ${sendingEmail ? 'opacity-50 cursor-wait' : ''}`}
              >
                <Mail className="w-3.5 h-3.5" />
                {sendingEmail ? 'Sending...' : task.lastEmailSentAt ? 'Resend Mail' : 'Send Mail'}
              </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[rgba(255,255,255,0.02)] transition"
            >
              <X className="w-6 h-6 text-[#94A3B8]" />
            </button>
          </div>
        </div>

        <div className="border-b border-[rgba(34,197,94,0.1)]">
          <div className="flex gap-1 px-6">
            <TabButton
              active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              icon={FileText}
              label="Details"
            />
            <TabButton
              active={activeTab === 'subtasks'}
              onClick={() => setActiveTab('subtasks')}
              icon={CheckCircle}
              label="Subtasks"
              count={subtasks.length}
            />
            <TabButton
              active={activeTab === 'comments'}
              onClick={() => setActiveTab('comments')}
              icon={MessageSquare}
              label="Comments"
              count={comments.length}
            />
            <TabButton
              active={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
              icon={Activity}
              label="Activity"
            />
            <TabButton
              active={activeTab === 'qa'}
              onClick={() => setActiveTab('qa')}
              icon={CheckCircle}
              label="QA"
            />
            <TabButton
              active={activeTab === 'deps'}
              onClick={() => setActiveTab('deps')}
              icon={Link2}
              label="Deps"
            />
            <TabButton
              active={activeTab === 'github'}
              onClick={() => setActiveTab('github')}
              icon={Github}
              label={isDevelopmentWork(task.workType) ? 'Dev Workspace' : 'GitHub'}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <DetailsTab
              task={task}
              assignees={assignees}
              goal={goal}
              app={app}
              approver={approver}
              onStatusChange={handleStatusChange}
              onApprove={handleApprove}
              canApprove={canApprove}
              priorityColors={priorityColors}
              statusColors={statusColors}
            />
          )}

          {activeTab === 'subtasks' && (
            <SubtasksTab
              subtasks={subtasks}
              employees={employees}
              showAddSubtask={showAddSubtask}
              setShowAddSubtask={setShowAddSubtask}
              newSubtask={newSubtask}
              setNewSubtask={setNewSubtask}
              toggleAssignee={toggleAssignee}
              handleAddSubtask={handleAddSubtask}
              editingSubtaskId={editingSubtaskId}
              setEditingSubtaskId={setEditingSubtaskId}
              handleSubtaskStatusChange={handleSubtaskStatusChange}
              handleSubtaskPriorityChange={handleSubtaskPriorityChange}
              handleSubtaskAssigneeChange={handleSubtaskAssigneeChange}
              handleDeleteSubtask={handleDeleteSubtask}
              expandedComments={expandedComments}
              setExpandedComments={setExpandedComments}
              subtaskCommentText={subtaskCommentText}
              setSubtaskCommentText={setSubtaskCommentText}
              handleAddSubtaskComment={handleAddSubtaskComment}
              getCommentsForSubtask={useApp().getCommentsForSubtask}
              getEmployeeById={getEmployeeById}
              subtaskStatusColors={subtaskStatusColors}
              priorityColors={priorityColors}
            />
          )}

          {activeTab === 'comments' && (
            <CommentsTab
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              onAddComment={handleAddComment}
              currentUser={currentUser!}
              getSubtasksForTask={getSubtasksForTask}
              task={task}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab task={task} assignees={assignees} approver={approver} />
          )}

          {activeTab === 'qa' && (
            <QaWorkPanel
              workKind="task"
              workId={task.id}
              qualifies={task.status === 'pending_qa' || task.status === 'in_progress' || task.status === 'completed'}
            />
          )}

          {activeTab === 'deps' && (
            <DependenciesPanel
              workKind="task"
              workId={task.id}
              workRefs={[
                ...tasks.map(t => ({ kind: 'task' as const, id: t.id, label: t.name })),
                ...defects.map(d => ({ kind: 'defect' as const, id: d.id, label: `${d.defectCode} - ${d.title}` })),
                ...actionPoints.map(a => ({ kind: 'action_point' as const, id: a.id, label: a.text }))
              ]}
            />
          )}

          {activeTab === 'github' && (
            <DevelopmentWorkspace workKind="task" workId={task.id} github={task.github} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
        active
          ? 'border-[#22C55E] text-[#22C55E] font-medium'
          : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`px-2 py-0.5 text-xs ${
            active ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function DetailsTab({
  task,
  assignees,
  goal,
  app,
  approver,
  onStatusChange,
  onApprove,
  canApprove,
  priorityColors,
  statusColors
}: any) {
  const { tags, employees, updateTask } = useApp();
  const [effortInput, setEffortInput] = useState<string>(task.effortHours != null ? String(task.effortHours) : '');
  const [showFollowerPicker, setShowFollowerPicker] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recFreq, setRecFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recInterval, setRecInterval] = useState('1');
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">Description</h3>
        <p className="text-[#F8FAFC] leading-relaxed">{task.description}</p>
      </div>

      <TagBadges tagIds={task.tags} allTags={tags} size="sm" />

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Assigned To
          </h3>
          {assignees && assignees.length > 0 && (
            <div className="space-y-2">
              {assignees.map((emp: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#22C55E] to-[#8b5cf6] flex items-center justify-center text-[#020617] font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#F8FAFC]">{emp.name}</p>
                    <p className="text-sm text-[#94A3B8]">{emp.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Priority
          </h3>
          <div
            className={`inline-flex px-4 py-2 border-2 font-medium ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority.toUpperCase()}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3">Status</h3>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          disabled={task.status === 'approved'}
          className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] font-medium"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="pending_qa">Pending QA</option>
          <option value="completed">Completed</option>
          <option value="approved" disabled>
            Approved
          </option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Effort (hours)
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={effortInput}
              onChange={e => setEffortInput(e.target.value)}
              placeholder="Estimated hours"
              className="flex-1 px-4 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] w-24"
            />
            <button
              onClick={() => {
                const v = parseFloat(effortInput);
                if (!isNaN(v) && v >= 0) updateTask(task.id, { effortHours: v });
              }}
              className="px-3 py-2 bg-[rgba(34,197,94,0.1)] text-[#22C55E] text-sm hover:bg-[rgba(34,197,94,0.2)]"
            >
              Save
            </button>
          </div>
          {task.effortHours != null && (
            <p className="text-xs text-[#94A3B8] mt-1">Current estimate: {task.effortHours} h</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Followers
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {(task.followers || []).map(fid => {
              const emp = employees.find(e => e.id === fid);
              return (
                <span key={fid} className="inline-flex items-center gap-1 px-2 py-1 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-sm text-[#F8FAFC]">
                  {emp?.name || fid}
                  <button
                    onClick={() => updateTask(task.id, { followers: (task.followers || []).filter(x => x !== fid) })}
                    className="text-[#94A3B8] hover:text-[#ef4444]"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => setShowFollowerPicker(!showFollowerPicker)}
              className="px-2 py-1 text-sm bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)]"
            >
              + Add
            </button>
          </div>
          {showFollowerPicker && (
            <select
              value=""
              onChange={e => {
                const fid = e.target.value;
                if (fid) updateTask(task.id, { followers: [...new Set([...(task.followers || []), fid])] });
                setShowFollowerPicker(false);
              }}
              className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
            >
              <option value="">Select employee...</option>
              {employees.filter(e => !(task.followers || []).includes(e.id)).map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recurrence
        </h3>
        {task.recurrence ? (
          <div className="flex items-center gap-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3">
            <span className="text-sm text-[#F8FAFC] capitalize">
              Every {task.recurrence.interval} {task.recurrence.frequency}{task.recurrence.interval > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-[#94A3B8]">
              Next occurrence auto-created on completion
            </span>
            <button
              onClick={() => updateTask(task.id, { recurrence: undefined })}
              className="text-xs text-[#ef4444] hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRecurrence(!showRecurrence)}
            className="px-3 py-2 text-sm bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)]"
          >
            + Set Recurrence
          </button>
        )}
        {showRecurrence && (
          <div className="mt-2 flex gap-2 items-end">
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Frequency</label>
              <select
                value={recFreq}
                onChange={e => setRecFreq(e.target.value as any)}
                className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Interval</label>
              <input
                type="number"
                min="1"
                value={recInterval}
                onChange={e => setRecInterval(e.target.value)}
                className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm w-20"
              />
            </div>
            <button
              onClick={() => {
                const i = parseInt(recInterval) || 1;
                updateTask(task.id, { recurrence: { frequency: recFreq, interval: Math.max(1, i) } });
                setShowRecurrence(false);
              }}
              className="px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Created
          </h3>
          <p className="text-[#F8FAFC]">{format(task.createdAt, 'MMMM d, yyyy')}</p>
          <p className="text-sm text-[#94A3B8]">{format(task.createdAt, 'h:mm a')}</p>
        </div>

        {task.completedAt && (
          <div>
            <h3 className="text-sm font-semibold text-[#F8FAFC] mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </h3>
            <p className="text-[#F8FAFC]">{format(task.completedAt, 'MMMM d, yyyy')}</p>
            <p className="text-sm text-[#94A3B8]">{format(task.completedAt, 'h:mm a')}</p>
          </div>
        )}
      </div>

      {task.status === 'completed' && !task.approvedBy && canApprove && (
        <div className="pt-4 border-t border-[rgba(34,197,94,0.1)]">
          <button
            onClick={onApprove}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#10b981] text-[#020617] font-medium hover:bg-[#0d9668] transition"
          >
            <CheckCircle className="w-5 h-5" />
            Approve Task
          </button>
        </div>
      )}

      {task.approvedBy && approver && (
        <div className="p-4 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
          <p className="text-sm font-medium text-[#10b981] mb-1">✓ Task Approved</p>
          <p className="text-sm text-[#10b981]">
            Approved by {approver.name} on{' '}
            {task.approvedAt && format(task.approvedAt, 'MMMM d, yyyy')}
          </p>
        </div>
      )}
    </div>
  );
}

function SubtasksTab({
  subtasks,
  employees,
  showAddSubtask,
  setShowAddSubtask,
  newSubtask,
  setNewSubtask,
  toggleAssignee,
  handleAddSubtask,
  editingSubtaskId,
  setEditingSubtaskId,
  handleSubtaskStatusChange,
  handleSubtaskPriorityChange,
  handleSubtaskAssigneeChange,
  handleDeleteSubtask,
  expandedComments,
  setExpandedComments,
  subtaskCommentText,
  setSubtaskCommentText,
  handleAddSubtaskComment,
  getCommentsForSubtask,
  getEmployeeById,
  subtaskStatusColors,
  priorityColors
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">
          Subtasks ({subtasks.length})
        </h3>
        <button
          onClick={() => setShowAddSubtask(!showAddSubtask)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] transition"
        >
          <Plus className="w-4 h-4" />
          Add Subtask
        </button>
      </div>

      {showAddSubtask && (
        <form onSubmit={handleAddSubtask} className="p-4 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Subtask Name</label>
            <input
              type="text"
              value={newSubtask.name}
              onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
              placeholder="Enter subtask name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-1">Priority</label>
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
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
                {employees.map((emp: any) => {
                  const selected = newSubtask.assignedTo.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleAssignee(emp.id)}
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
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]">
              Add Subtask
            </button>
            <button
              type="button"
              onClick={() => { setShowAddSubtask(false); setNewSubtask({ name: '', assignedTo: [], priority: 'medium', status: 'pending', startDate: '', endDate: '' }); }}
              className="px-4 py-2 bg-[#0F172A] text-[#F8FAFC] text-sm border border-[rgba(34,197,94,0.1)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {subtasks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(34,197,94,0.1)]">
                <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Subtask</th>
                <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Assigned To</th>
                <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Status</th>
                <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Priority</th>
                <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Updated</th>
                <th className="text-right py-3 px-4 text-[#94A3B8] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subtasks.map((subtask: Subtask) => {
                const assignees = subtask.assignedTo.map((id: string) => getEmployeeById(id)).filter(Boolean);
                const subtaskComments = getCommentsForSubtask(subtask.id);
                const isExpanded = expandedComments === subtask.id;

                return (
                  <React.Fragment key={subtask.id}>
                    <tr className="border-b border-[rgba(34,197,94,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedComments(isExpanded ? null : subtask.id)}
                            className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                          </button>
                          <span className="text-[#F8FAFC] font-medium">{subtask.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 3).map((emp: any, idx: number) => (
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
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={subtask.status}
                          onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.value as SubtaskStatus)}
                          className={`text-xs px-2 py-1 border ${subtaskStatusColors[subtask.status]} bg-transparent`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={subtask.priority}
                          onChange={(e) => handleSubtaskPriorityChange(subtask.id, e.target.value as Subtask['priority'])}
                          className={`text-xs px-2 py-1 border ${priorityColors[subtask.priority]} bg-transparent`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] text-xs">
                        {format(subtask.updatedAt, 'MMM d, h:mm a')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4">
                          <div className="ml-6 pl-4 border-l-2 border-[rgba(34,197,94,0.1)]">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-0.5 text-xs font-medium bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]">
                                Subtask
                              </span>
                              <h4 className="text-sm font-medium text-[#F8FAFC]">Comments ({subtaskComments.length})</h4>
                            </div>
                            <div className="space-y-3 mb-3">
                              {subtaskComments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-2 p-3 bg-[#1E293B] border border-[rgba(139,92,246,0.1)]">
                                  <div className="w-8 h-8 bg-gradient-to-br from-[#8b5cf6] to-[#22C55E] rounded-full flex items-center justify-center text-[#020617] text-xs font-bold flex-shrink-0">
                                    {comment.userName.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-semibold text-[#F8FAFC] text-sm">{comment.userName}</p>
                                      <span className="text-xs text-[#94A3B8]">
                                        {format(comment.timestamp, 'MMM d, h:mm a')}
                                      </span>
                                    </div>
                                    <p className="text-[#F8FAFC] text-sm whitespace-pre-wrap">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={subtaskCommentText}
                                onChange={(e) => setSubtaskCommentText(e.target.value)}
                                placeholder="Add a comment to this subtask..."
                                className="flex-1 px-3 py-2 bg-[#0F172A] border border-[rgba(139,92,246,0.1)] text-[#F8FAFC] text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubtaskComment(subtask.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => handleAddSubtaskComment(subtask.id)}
                                disabled={!subtaskCommentText.trim()}
                                className="px-3 py-2 bg-[#8b5cf6] text-[#020617] text-sm font-medium hover:bg-[#7c4fe0] disabled:opacity-50"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subtasks.length === 0 && !showAddSubtask && (
        <div className="text-center py-12 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
          <CheckCircle className="w-12 h-12 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-[#94A3B8] text-sm">No subtasks yet</p>
          <button
            onClick={() => setShowAddSubtask(true)}
            className="mt-3 px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]"
          >
            Add First Subtask
          </button>
        </div>
      )}
    </div>
  );
}

function CommentsTab({ comments, commentText, setCommentText, onAddComment, currentUser, getSubtasksForTask, task }: any) {
  const subtasks = getSubtasksForTask ? getSubtasksForTask(task.id) : [];

  return (
    <div className="space-y-6">
      <form onSubmit={onAddComment} className="space-y-3">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Add Comment</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Share updates, ask questions, or provide feedback..."
          className="w-full px-4 py-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] resize-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
          rows={4}
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Post Comment
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="text-center py-8 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
            <MessageSquare className="w-12 h-12 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-[#94A3B8] text-sm">No comments yet</p>
            <p className="text-[#94A3B8] text-xs mt-1">Be the first to comment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => {
              const isSubtaskComment = comment.subtaskId;
              const relatedSubtask = isSubtaskComment ? subtasks.find((s: any) => s.id === comment.subtaskId) : null;

              return (
                <div key={comment.id} className={`flex gap-3 p-4 border ${
                  isSubtaskComment
                    ? 'bg-[#1E293B] border-[rgba(139,92,246,0.1)]'
                    : 'bg-[#1E293B] border-[rgba(34,197,94,0.1)]'
                }`}>
                  <div className={`w-10 h-10 bg-gradient-to-br flex items-center justify-center text-[#020617] font-bold flex-shrink-0 ${
                    isSubtaskComment ? 'from-[#8b5cf6] to-[#22C55E]' : 'from-[#22C55E] to-[#8b5cf6]'
                  }`}>
                    {comment.userName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-[#F8FAFC]">{comment.userName}</p>
                      {isSubtaskComment ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]">
                          Subtask: {relatedSubtask?.name || 'Unknown'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]">
                          Task
                        </span>
                      )}
                      <span className="text-xs text-[#94A3B8]">
                        {format(comment.timestamp, 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>
                    <p className="text-[#F8FAFC] whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTab({ task, assignees, approver }: any) {
  const activities = [];
  const assigneeNames = assignees?.map((e: any) => e.name).join(', ') || 'Unknown';

  activities.push({
    id: '1',
    type: 'created',
    description: `Task created and assigned to ${assigneeNames}`,
    timestamp: task.createdAt
  });

  if (task.completedAt) {
    activities.push({
      id: '2',
      type: 'completed',
      description: `Task marked as completed by ${assigneeNames}`,
      timestamp: task.completedAt
    });
  }

  if (task.approvedAt && approver) {
    activities.push({
      id: '3',
      type: 'approved',
      description: `Task approved by ${approver.name}`,
      timestamp: task.approvedAt
    });
  }

  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const activityIcons = {
    created: Clock,
    completed: CheckCircle,
    approved: CheckCircle
  };

  const activityColors = {
    created: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    completed: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
    approved: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4">Activity Timeline</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
          <Activity className="w-12 h-12 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-[#94A3B8] text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity: any) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons];
            const colorClass = activityColors[activity.type as keyof typeof activityColors];

            return (
              <div key={activity.id} className="flex gap-4">
                <div className={`w-10 h-10 flex items-center justify-center ${colorClass} flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-[#F8FAFC] font-medium">{activity.description}</p>
                  <p className="text-sm text-[#94A3B8] mt-1">
                    {format(activity.timestamp, 'MMMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
