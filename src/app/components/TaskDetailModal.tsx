import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Task, TaskStatus } from '../types';
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
  Star
} from 'lucide-react';
import { format } from 'date-fns';

type TaskDetailModalProps = {
  task: Task;
  onClose: () => void;
};

export function TaskDetailModal({ task: initialTask, onClose }: TaskDetailModalProps) {
  const { currentUser, hasPermission } = useAuth();
  const {
    tasks,
    updateTask,
    approveTask,
    getEmployeeById,
    getGoalById,
    getAppById,
    addComment,
    getCommentsForTask
  } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');
  const [commentText, setCommentText] = useState('');

  const task = tasks.find(t => t.id === initialTask.id) || initialTask;

  const assignees = task.assignedTo.map(id => getEmployeeById(id)).filter(Boolean);
  const goal = getGoalById(task.goalId);
  const app = goal ? getAppById(goal.appId) : null;
  const approver = task.approvedBy ? getEmployeeById(task.approvedBy) : null;

  const comments = getCommentsForTask(task.id);
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
      addComment(task.id, currentUser!.id, commentText);
      setCommentText('');
    }
  };

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80] border-[rgba(107,107,128,0.2)]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border-[rgba(0,229,255,0.2)]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c] border-[rgba(255,59,92,0.2)]'
  };

  const statusColors = {
    not_started: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    in_progress: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
    blocked: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]',
    completed: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
    approved: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-[rgba(0,229,255,0.1)]">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#f0f0f5]">{task.name}</h2>
              {task.priority === 'urgent' && (
                <Star className="w-6 h-6 text-[#ff3b5c] fill-[#ff3b5c]" />
              )}
            </div>
            <p className="text-sm text-[#6b6b80]">
              {app?.name} → {goal?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(255,255,255,0.02)] transition"
          >
            <X className="w-6 h-6 text-[#6b6b80]" />
          </button>
        </div>

        <div className="border-b border-[rgba(0,229,255,0.1)]">
          <div className="flex gap-1 px-6">
            <TabButton
              active={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              icon={FileText}
              label="Details"
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

          {activeTab === 'comments' && (
            <CommentsTab
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              onAddComment={handleAddComment}
              currentUser={currentUser!}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab task={task} assignees={assignees} approver={approver} />
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
          ? 'border-[#00e5ff] text-[#00e5ff] font-medium'
          : 'border-transparent text-[#6b6b80] hover:text-[#f0f0f5]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`px-2 py-0.5 text-xs ${
            active ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]' : 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]'
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
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3">Description</h3>
        <p className="text-[#f0f0f5] leading-relaxed">{task.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Assigned To
          </h3>
          {assignees && assignees.length > 0 && (
            <div className="space-y-2">
              {assignees.map((emp: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#f0f0f5]">{emp.name}</p>
                    <p className="text-sm text-[#6b6b80]">{emp.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3 flex items-center gap-2">
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
        <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3">Status</h3>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          disabled={task.status === 'approved'}
          className="w-full px-4 py-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] font-medium"
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
          <option value="approved" disabled>
            Approved
          </option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Created
          </h3>
          <p className="text-[#f0f0f5]">{format(task.createdAt, 'MMMM d, yyyy')}</p>
          <p className="text-sm text-[#6b6b80]">{format(task.createdAt, 'h:mm a')}</p>
        </div>

        {task.completedAt && (
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f5] mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </h3>
            <p className="text-[#f0f0f5]">{format(task.completedAt, 'MMMM d, yyyy')}</p>
            <p className="text-sm text-[#6b6b80]">{format(task.completedAt, 'h:mm a')}</p>
          </div>
        )}
      </div>

      {task.status === 'completed' && !task.approvedBy && canApprove && (
        <div className="pt-4 border-t border-[rgba(0,229,255,0.1)]">
          <button
            onClick={onApprove}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#10b981] text-[#0a0a0f] font-medium hover:bg-[#0d9668] transition"
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

function CommentsTab({ comments, commentText, setCommentText, onAddComment, currentUser }: any) {
  return (
    <div className="space-y-6">
      <form onSubmit={onAddComment} className="space-y-3">
        <h3 className="text-sm font-semibold text-[#f0f0f5]">Add Comment</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Share updates, ask questions, or provide feedback..."
          className="w-full px-4 py-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] resize-none focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent"
          rows={4}
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Post Comment
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-[#f0f0f5] mb-4">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="text-center py-8 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
            <MessageSquare className="w-12 h-12 text-[#6b6b80] mx-auto mb-2" />
            <p className="text-[#6b6b80] text-sm">No comments yet</p>
            <p className="text-[#6b6b80] text-xs mt-1">Be the first to comment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3 p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold flex-shrink-0">
                  {comment.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-[#f0f0f5]">{comment.userName}</p>
                    <span className="text-xs text-[#6b6b80]">
                      {format(comment.timestamp, 'MMM d, yyyy · h:mm a')}
                    </span>
                  </div>
                  <p className="text-[#f0f0f5] whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
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
    created: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
    completed: 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]',
    approved: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-[#f0f0f5] mb-4">Activity Timeline</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
          <Activity className="w-12 h-12 text-[#6b6b80] mx-auto mb-2" />
          <p className="text-[#6b6b80] text-sm">No activity yet</p>
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
                  <p className="text-[#f0f0f5] font-medium">{activity.description}</p>
                  <p className="text-sm text-[#6b6b80] mt-1">
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
