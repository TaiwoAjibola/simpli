import React, { useState, useRef } from 'react';
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
  Github,
  Upload,
  Paperclip,
  Folder,
  Loader,
  ExternalLink,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { TagBadges } from './TagBadges';
import { QaWorkPanel } from './QaWorkPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { DevelopmentWorkspace } from './DevelopmentWorkspace';
import { isDevelopmentWork, getWorkTargetStates } from '../../utils/workflow';
import { PRIORITY_COLORS, TASK_STATUS_COLORS } from '../../utils/colors';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === task.status) return;
    const ok = await updateTask(task.id, { status: newStatus });
    if (!ok) {
      showToast({
        type: 'error',
        title: 'Status change blocked',
        message: `"${task.name}" can't move from ${task.status.replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')} for your role.`
      });
    }
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

  const priorityColors: Record<string, string> = {
    low: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    medium: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    high: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
    urgent: 'bg-[#FBE9E9] text-[#EB5757] border border-[#FBE9E9]'
  };

  const statusColors: Record<string, string> = {
    not_started: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    in_progress: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
    blocked: 'bg-[#FBE9E9] text-[#EB5757] border border-[#FBE9E9]',
    completed: 'bg-[#F7F7F5] text-[#0F7B6C] border border-[#E9E9E7]',
    approved: 'bg-[#EDF7ED] text-[#0F7B6C] border border-[#E9E9E7]'
  };

  const subtaskStatusColors: Record<string, string> = {
    pending: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    in_progress: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
    completed: 'bg-[#EDF7ED] text-[#0F7B6C] border border-[#E9E9E7]'
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] max-w-[900px] w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-6 border-b border-[#E9E9E7]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#37352F] truncate">{task.name}</h2>
              {task.priority === 'urgent' && (
                <Star className="w-4 h-4 text-[#EB5757] fill-[#EB5757] flex-shrink-0" />
              )}
            </div>
            <p className="text-[14px] text-[#787774]">
              {app?.name} → {goal?.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium rounded-[6px] border transition-colors duration-150 cursor-pointer ${
                task.lastEmailSentAt
                  ? 'bg-white border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5]'
                  : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]'
              } ${sendingEmail ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Mail className="w-3.5 h-3.5 text-[#787774]" />
              {sendingEmail ? 'Sending...' : task.lastEmailSentAt ? 'Resend Mail' : 'Send Mail'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#E9E9E7] px-6">
          <div className="flex gap-6 overflow-x-auto">
            <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={FileText} label="Details" />
            <TabButton active={activeTab === 'subtasks'} onClick={() => setActiveTab('subtasks')} icon={CheckCircle} label="Subtasks" count={subtasks.length} />
            <TabButton active={activeTab === 'comments'} onClick={() => setActiveTab('comments')} icon={MessageSquare} label="Comments" count={comments.length} />
            <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Activity} label="Activity" />
            <TabButton active={activeTab === 'qa'} onClick={() => setActiveTab('qa')} icon={CheckCircle} label="QA" />
            <TabButton active={activeTab === 'deps'} onClick={() => setActiveTab('deps')} icon={Link2} label="Deps" />
            <TabButton active={activeTab === 'github'} onClick={() => setActiveTab('github')} icon={Github} label={isDevelopmentWork(task.workType) ? 'Dev Workspace' : 'GitHub'} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
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
      className={`flex items-center gap-2 px-1 py-3 border-b-2 text-[14px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer -mb-px ${
        active
          ? 'border-[#2383E2] text-[#37352F]'
          : 'border-transparent text-[#787774] hover:text-[#37352F]'
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? 'text-[#2383E2]' : 'text-[#787774]'}`} />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.5 text-[12px] rounded-[4px] border ${active ? 'bg-[#E9E9E7] text-[#37352F] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
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
  const { tags, employees, updateTask, apps, goals, monthlyPlans } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [effortInput, setEffortInput] = useState<string>(task.effortHours != null ? String(task.effortHours) : '');
  const [showFollowerPicker, setShowFollowerPicker] = useState(false);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [recFreq, setRecFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recInterval, setRecInterval] = useState('1');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const centralInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const uploadCentral = async (file: File, appId: string, appName: string): Promise<string> => {
    const contentBase64 = await fileToBase64(file);
    const res = await fetch('/api/drive?action=upload-central', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appName, fileName: file.name, mimeType: file.type || 'application/octet-stream', contentBase64 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Central upload failed');
    return data.file?.webViewLink || data.webViewLink || `https://drive.google.com/file/d/${data.file?.id}/view`;
  };

  const getTaskAppInfo = () => {
    const appId = (task as any).appId || goals.find((g: any) => g.id === task.goalId)?.appId || app?.id || '';
    const appName = apps.find((a: any) => a.id === appId)?.name || app?.name || appId;
    return { appId, appName };
  };

  const handleDriveSelect = async (driveFiles: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string }[]) => {
    if (!currentUser) return;
    const newAttachments = driveFiles.map(df => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${df.id}`,
      name: df.name,
      url: df.webViewLink || `https://drive.google.com/file/d/${df.id}/view`,
      size: df.size ? parseInt(df.size, 10) : 0,
      uploadedAt: new Date(),
      uploadedBy: currentUser.id
    }));
    const updated = [...(task.attachments || []), ...newAttachments];
    await updateTask(task.id, { attachments: updated });
    setShowDrivePicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser) return;
    setUploading(true);
    const { appId, appName } = getTaskAppInfo();
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        let driveUrl: string | null = null;
        try {
          if (appId) driveUrl = await uploadCentral(file, appId, appName);
        } catch (centralErr: any) {
          const msg = centralErr?.message || '';
          if (msg.includes('Central Drive not configured')) {
            showToast({ type: 'error', title: 'Central Drive not configured', message: 'Use Import from my Drive or configure GOOGLE_DRIVE_REFRESH_TOKEN.' });
            continue;
          }
        }
        if (driveUrl) {
          uploaded.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: driveUrl,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: currentUser.id
          });
        } else {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileRef = ref(storage, `tasks/${task.id}/${Date.now()}_${safeName}`);
          await uploadBytes(fileRef, file);
          const downloadURL = await getDownloadURL(fileRef);
          uploaded.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: downloadURL,
            size: file.size,
            uploadedAt: new Date(),
            uploadedBy: currentUser.id
          });
        }
      }
      if (uploaded.length > 0) {
        await updateTask(task.id, { attachments: [...(task.attachments || []), ...uploaded] });
        if (uploaded.some((a: any) => a.url.includes('drive.google.com'))) {
          showToast({ type: 'success', title: 'Uploaded to Drive', message: `${uploaded.length} file(s) uploaded to Simpli/${appName}.` });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attId: string) => {
    const updated = (task.attachments || []).filter((a: any) => a.id !== attId);
    await updateTask(task.id, { attachments: updated });
  };
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-2">Description</h3>
        <p className="text-[14px] text-[#37352F] leading-relaxed">{task.description}</p>
      </div>

      <TagBadges tagIds={task.tags} allTags={tags} size="sm" />

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-[#787774]" />
            Assigned To
          </h3>
          {assignees && assignees.length > 0 && (
            <div className="space-y-2">
              {assignees.map((emp: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[8px]">
                  <div className="w-8 h-8 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] font-medium text-[14px] flex-shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#37352F] text-[14px]">{emp.name}</p>
                    <p className="text-[12px] text-[#787774] truncate">{emp.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4 text-[#787774]" />
            Priority
          </h3>
          <div className={`inline-flex px-3 py-1.5 text-[12px] font-medium rounded-[4px] ${priorityColors[task.priority]}`}>
            {task.priority.toUpperCase()}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-2">Status</h3>
        {(() => {
          const validStatuses = [
            task.status,
            ...getWorkTargetStates({
              kind: 'task',
              currentStatus: task.status,
              workType: task.workType || 'non-development',
              can: hasPermission
            })
          ].filter((s, i, arr) => arr.indexOf(s) === i) as TaskStatus[];
          return (
            <select
              value={task.status}
              onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
              disabled={validStatuses.length <= 1}
              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {validStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</option>
              ))}
            </select>
          );
        })()}
        {task.status === 'approved' && (
          <p className="text-[12px] text-[#0F7B6C] mt-1.5">Approved — status is locked.</p>
        )}
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-2">Monthly Plan</h3>
        <select
          value={task.planId || (goal as any)?.planId || ''}
          onChange={(e) => updateTask(task.id, { planId: e.target.value || null } as any)}
          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
        >
          <option value="">No Plan</option>
          {monthlyPlans.map((plan: any) => (
            <option key={plan.id} value={plan.id}>{plan.name}</option>
          ))}
        </select>
        {!task.planId && (goal as any)?.planId && (
          <p className="text-[12px] text-[#787774] mt-1.5">Inherited from goal — select a plan to override.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#787774]" />
            Effort (hours)
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={effortInput}
              onChange={e => setEffortInput(e.target.value)}
              placeholder="Estimated hours"
              className="flex-1 px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
            />
            <button
              onClick={() => {
                const v = parseFloat(effortInput);
                if (!isNaN(v) && v >= 0) updateTask(task.id, { effortHours: v });
              }}
              className="px-3 py-2 bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
            >
              Save
            </button>
          </div>
          {task.effortHours != null && (
            <p className="text-[12px] text-[#787774] mt-1.5">Current estimate: {task.effortHours} h</p>
          )}
        </div>

        <div>
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#787774]" />
            Followers
          </h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {(task.followers || []).map((fid: string) => {
              const emp = employees.find((e: any) => e.id === fid);
              return (
                <span key={fid} className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[4px] text-[14px] text-[#787774]">
                  {emp?.name || fid}
                  <button
                    onClick={() => updateTask(task.id, { followers: (task.followers || []).filter((x: string) => x !== fid) })}
                    className="text-[#787774] hover:text-[#37352F] ml-1 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              );
            })}
            <button
              onClick={() => setShowFollowerPicker(!showFollowerPicker)}
              className="px-2 py-1 text-[14px] bg-white border border-[#E9E9E7] rounded-[6px] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors duration-150 cursor-pointer"
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
              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
            >
              <option value="">Select employee...</option>
              {employees.filter((e: any) => !(task.followers || []).includes(e.id)).map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#787774]" />
          Recurrence
        </h3>
        {task.recurrence ? (
          <div className="flex items-center gap-3 bg-white border border-[#E9E9E7] rounded-[8px] p-3">
            <span className="text-[14px] text-[#37352F] capitalize">
              Every {task.recurrence.interval} {task.recurrence.frequency}{task.recurrence.interval > 1 ? 's' : ''}
            </span>
            <span className="text-[12px] text-[#787774]">Next occurrence auto-created on completion</span>
            <button onClick={() => updateTask(task.id, { recurrence: undefined })} className="text-[12px] text-[#EB5757] hover:underline cursor-pointer ml-auto">
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRecurrence(!showRecurrence)}
            className="px-3 py-1.5 text-[14px] bg-white border border-[#E9E9E7] rounded-[6px] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F] transition-colors duration-150 cursor-pointer"
          >
            + Set Recurrence
          </button>
        )}
        {showRecurrence && (
          <div className="mt-3 flex gap-2 items-end">
            <div>
              <label className="block text-[12px] text-[#787774] mb-1">Frequency</label>
              <select
                value={recFreq}
                onChange={e => setRecFreq(e.target.value as any)}
                className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#787774] mb-1">Interval</label>
              <input
                type="number"
                min="1"
                value={recInterval}
                onChange={e => setRecInterval(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] w-20"
              />
            </div>
            <button
              onClick={() => {
                const i = parseInt(recInterval) || 1;
                updateTask(task.id, { recurrence: { frequency: recFreq, interval: Math.max(1, i) } });
                setShowRecurrence(false);
              }}
              className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-[#787774]" />
          Attachments
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <label className="flex items-center gap-2 px-3 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer border border-[#2383E2]">
            {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            <input ref={centralInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <button
            onClick={() => setShowDrivePicker(!showDrivePicker)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
          >
            <Folder className="w-4 h-4 text-[#787774]" />
            {showDrivePicker ? 'Close Drive' : 'Import from my Drive'}
          </button>
        </div>
        {showDrivePicker && (
          <div className="mb-3">
            <GoogleDrivePicker onSelect={handleDriveSelect} onClose={() => setShowDrivePicker(false)} />
          </div>
        )}
        {(task.attachments || []).length === 0 ? (
          <div className="text-center py-8 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
            <Paperclip className="w-8 h-8 text-[#9B9A97] mx-auto mb-2" />
            <p className="text-[14px] text-[#787774]">No attachments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(task.attachments || []).map((att: any) => (
              <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#787774]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] text-[#37352F] truncate font-medium">{att.name}</p>
                    <p className="text-[12px] text-[#787774]">{formatFileSize(att.size || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-[#2383E2] hover:text-[#1A6FC0] transition-colors duration-150 cursor-pointer">
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                  <a href={att.url} download className="flex items-center gap-1 text-[12px] text-[#787774] hover:text-[#37352F] transition-colors duration-150 cursor-pointer">
                    <Download className="w-3 h-3" /> Download
                  </a>
                  <button onClick={() => handleRemoveAttachment(att.id)} className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition-colors duration-150 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-[14px] font-semibold text-[#37352F] mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#787774]" />
            Created
          </h3>
          <p className="text-[14px] text-[#37352F]">{format(task.createdAt, 'MMMM d, yyyy')}</p>
          <p className="text-[12px] text-[#787774]">{format(task.createdAt, 'h:mm a')}</p>
        </div>

        {task.completedAt && (
          <div>
            <h3 className="text-[14px] font-semibold text-[#37352F] mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#787774]" />
              Completed
            </h3>
            <p className="text-[14px] text-[#37352F]">{format(task.completedAt, 'MMMM d, yyyy')}</p>
            <p className="text-[12px] text-[#787774]">{format(task.completedAt, 'h:mm a')}</p>
          </div>
        )}
      </div>

      {task.status === 'completed' && !task.approvedBy && canApprove && (
        <div className="pt-4 border-t border-[#E9E9E7]">
          <button
            onClick={onApprove}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2383E2] text-white font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer text-[14px]"
          >
            <CheckCircle className="w-5 h-5" />
            Approve Task
          </button>
        </div>
      )}

      {task.approvedBy && approver && (
        <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
          <p className="text-[14px] font-medium text-[#0F7B6C] mb-1">✓ Task Approved</p>
          <p className="text-[14px] text-[#787774]">
            Approved by {approver.name} on {task.approvedAt && format(task.approvedAt, 'MMMM d, yyyy')}
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
        <h3 className="text-[14px] font-semibold text-[#37352F]">Subtasks ({subtasks.length})</h3>
        <button
          onClick={() => setShowAddSubtask(!showAddSubtask)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Subtask
        </button>
      </div>

      {showAddSubtask && (
        <form onSubmit={handleAddSubtask} className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] space-y-3">
          <div>
            <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Subtask Name</label>
            <input
              type="text"
              value={newSubtask.name}
              onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
              placeholder="Enter subtask name"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Priority</label>
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Assign To</label>
              <div className="flex flex-wrap gap-1">
                {employees.map((emp: any) => {
                  const selected = newSubtask.assignedTo.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleAssignee(emp.id)}
                      className={`px-2 py-1 text-[12px] border rounded-[6px] transition-colors duration-150 cursor-pointer ${
                        selected ? 'bg-[#E9E9E7] border-[#E9E9E7] text-[#37352F] font-medium' : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]'
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
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Start Date</label>
              <input
                type="date"
                value={newSubtask.startDate}
                onChange={(e) => setNewSubtask({ ...newSubtask, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">End Date</label>
              <input
                type="date"
                value={newSubtask.endDate}
                onChange={(e) => setNewSubtask({ ...newSubtask, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
              Add Subtask
            </button>
            <button
              type="button"
              onClick={() => { setShowAddSubtask(false); setNewSubtask({ name: '', assignedTo: [], priority: 'medium', status: 'pending', startDate: '', endDate: '' }); }}
              className="px-4 py-2 bg-white text-[#37352F] text-[14px] font-medium border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {subtasks.length > 0 && (
        <div className="overflow-x-auto border border-[#E9E9E7] rounded-[8px]">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[#E9E9E7] bg-[#F7F7F5]">
                <th className="text-left py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Subtask</th>
                <th className="text-left py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Assigned To</th>
                <th className="text-left py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Status</th>
                <th className="text-left py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Priority</th>
                <th className="text-left py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Updated</th>
                <th className="text-right py-2.5 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subtasks.map((subtask: Subtask) => {
                const assignees = subtask.assignedTo.map((id: string) => getEmployeeById(id)).filter(Boolean);
                const subtaskComments = getCommentsForSubtask(subtask.id);
                const isExpanded = expandedComments === subtask.id;
                return (
                  <React.Fragment key={subtask.id}>
                    <tr className="border-b border-[#E9E9E7] hover:bg-[#F7F7F5] transition-colors duration-150">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedComments(isExpanded ? null : subtask.id)} className="p-1 hover:bg-white rounded-[4px] transition-colors duration-150 cursor-pointer">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                          </button>
                          <span className="text-[#37352F] font-medium text-[14px]">{subtask.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex -space-x-1.5">
                          {assignees.slice(0, 3).map((emp: any, idx: number) => (
                            <div key={idx} className="w-6 h-6 bg-[#F7F7F5] border border-white rounded-full flex items-center justify-center text-[#37352F] text-[12px] font-medium" title={emp?.name}>
                              {emp?.name.charAt(0)}
                            </div>
                          ))}
                          {assignees.length > 3 && (
                            <div className="w-6 h-6 bg-white border border-[#E9E9E7] rounded-full flex items-center justify-center text-[#787774] text-[12px] font-medium">+{assignees.length - 3}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={subtask.status}
                          onChange={(e) => handleSubtaskStatusChange(subtask.id, e.target.value as SubtaskStatus)}
                          className={`text-[12px] px-2 py-1 rounded-[4px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2383E2] ${subtaskStatusColors[subtask.status]}`}
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
                          className={`text-[12px] px-2 py-1 rounded-[4px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2383E2] ${priorityColors[subtask.priority]}`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-[#787774] text-[12px]">{format(subtask.updatedAt, 'MMM d, h:mm a')}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteSubtask(subtask.id)} className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition-colors duration-150 cursor-pointer" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 bg-white">
                          <div className="ml-6 pl-4 border-l-2 border-[#E9E9E7]">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-0.5 text-[12px] font-medium bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7] rounded-[4px]">Subtask</span>
                              <h4 className="text-[14px] font-medium text-[#37352F]">Comments ({subtaskComments.length})</h4>
                            </div>
                            <div className="space-y-3 mb-3">
                              {subtaskComments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-2 p-3 bg-white border border-[#E9E9E7] rounded-[8px]">
                                  <div className="w-7 h-7 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] text-[12px] font-medium flex-shrink-0">
                                    {comment.userName.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-[#37352F] text-[14px]">{comment.userName}</p>
                                      <span className="text-[12px] text-[#9B9A97]">{format(comment.timestamp, 'MMM d, h:mm a')}</span>
                                    </div>
                                    <p className="text-[#37352F] text-[14px] whitespace-pre-wrap leading-relaxed">{comment.content}</p>
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
                                className="flex-1 px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
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
                                className="px-3 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
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
        <div className="text-center py-12 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
          <CheckCircle className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
          <p className="text-[14px] text-[#787774]">No subtasks yet</p>
          <button onClick={() => setShowAddSubtask(true)} className="mt-3 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
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
        <h3 className="text-[14px] font-semibold text-[#37352F]">Add Comment</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Share updates, ask questions, or provide feedback..."
          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] resize-none focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
          rows={4}
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Post Comment
        </button>
      </form>

      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4">Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <div className="text-center py-8 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
            <MessageSquare className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774]">No comments yet</p>
            <p className="text-[12px] text-[#9B9A97] mt-1">Be the first to comment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment: any) => {
              const isSubtaskComment = comment.subtaskId;
              const relatedSubtask = isSubtaskComment ? subtasks.find((s: any) => s.id === comment.subtaskId) : null;
              return (
                <div key={comment.id} className="flex gap-3 p-4 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
                  <div className="w-8 h-8 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full flex items-center justify-center text-[#37352F] font-medium text-[14px] flex-shrink-0">
                    {comment.userName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-[#37352F] text-[14px]">{comment.userName}</p>
                      {isSubtaskComment ? (
                        <span className="px-2 py-0.5 text-[12px] font-medium bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7] rounded-[4px]">Subtask: {relatedSubtask?.name || 'Unknown'}</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[12px] font-medium bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7] rounded-[4px]">Task</span>
                      )}
                      <span className="text-[12px] text-[#9B9A97]">{format(comment.timestamp, 'MMM d, yyyy · h:mm a')}</span>
                    </div>
                    <p className="text-[14px] text-[#37352F] whitespace-pre-wrap leading-relaxed">{comment.content}</p>
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
  activities.push({ id: '1', type: 'created', description: `Task created and assigned to ${assigneeNames}`, timestamp: task.createdAt });
  if (task.completedAt) {
    activities.push({ id: '2', type: 'completed', description: `Task marked as completed by ${assigneeNames}`, timestamp: task.completedAt });
  }
  if (task.approvedAt && approver) {
    activities.push({ id: '3', type: 'approved', description: `Task approved by ${approver.name}`, timestamp: task.approvedAt });
  }
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const activityIcons: Record<string, any> = { created: Clock, completed: CheckCircle, approved: CheckCircle };
  const activityColors: Record<string, string> = {
    created: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    completed: 'bg-[#F7F7F5] text-[#0F7B6C] border border-[#E9E9E7]',
    approved: 'bg-[#EDF7ED] text-[#0F7B6C] border border-[#E9E9E7]'
  };
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-[#37352F] mb-4">Activity Timeline</h3>
      {activities.length === 0 ? (
        <div className="text-center py-8 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
          <Activity className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
          <p className="text-[14px] text-[#787774]">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity: any) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons];
            const colorClass = activityColors[activity.type as keyof typeof activityColors];
            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`w-8 h-8 flex items-center justify-center rounded-[6px] flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-[14px] text-[#37352F] font-medium">{activity.description}</p>
                  <p className="text-[12px] text-[#787774] mt-1">{format(activity.timestamp, 'MMMM d, yyyy · h:mm a')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
