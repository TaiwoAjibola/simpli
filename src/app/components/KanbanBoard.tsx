import React, { useState, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskStatus, DefectStatus, Defect, WorkType } from '../types';
import { Clock, AlertCircle, CheckCircle, Star, User, Bug, ArrowUpDown, Mail, Tag as TagIcon, FileText, GitPullRequest } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { DefectDetailModal } from './DefectDetailModal';
import { getCardClasses, getCardInlineStyle } from '../../utils/cardStyles';
import { TagBadges } from './TagBadges';
import { canTransitionDefect } from '../../utils/defectPermissions';
import { canTransitionWork } from '../../utils/workflow';

const DEV_TASK_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'not_started', title: 'Not Started', color: '#94A3B8' },
  { id: 'in_progress', title: 'In Progress', color: '#22C55E' },
  { id: 'blocked', title: 'Blocked', color: '#ff3b5c' },
  { id: 'pending_qa', title: 'Pending QA', color: '#8b5cf6' },
  { id: 'completed', title: 'Completed', color: '#22c55e' },
  { id: 'approved', title: 'Approved', color: '#10b981' }
];

const OPS_TASK_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'not_started', title: 'Not Started', color: '#94A3B8' },
  { id: 'in_progress', title: 'In Progress', color: '#22C55E' },
  { id: 'blocked', title: 'Blocked', color: '#ff3b5c' },
  { id: 'completed', title: 'Completed', color: '#22c55e' },
  { id: 'approved', title: 'Approved', color: '#10b981' }
];

const GH_LIFECYCLE_COLUMNS: { id: string; title: string; color: string; match: (t: any) => boolean }[] = [
  { id: 'no_branch', title: 'No Branch', color: '#94A3B8', match: (t) => !t.github?.branchName },
  {
    id: 'branch_created',
    title: 'Branch Created',
    color: '#22C55E',
    match: (t) => !!t.github?.branchName && ['not_started', 'branch_created'].includes(t.github?.status)
  },
  {
    id: 'in_review',
    title: 'In Review',
    color: '#f59e0b',
    match: (t) => !!t.github?.pullRequest?.prNumber && t.github?.pullRequest?.state === 'open'
      && t.github?.status !== 'approved' && t.github?.status !== 'qa'
  },
  {
    id: 'qa',
    title: 'In QA',
    color: '#8b5cf6',
    match: (t) => t.github?.status === 'qa'
  },
  {
    id: 'merged',
    title: 'Merged',
    color: '#8b5cf6',
    match: (t) => t.github?.status === 'merged' || t.github?.pullRequest?.state === 'merged'
  },
  {
    id: 'closed',
    title: 'Closed / Done',
    color: '#10b981',
    match: (t) => ['approved', 'closed'].includes(t.github?.status)
  }
];

const DEFECT_COLUMNS: { id: DefectStatus; title: string; color: string }[] = [
  { id: 'open', title: 'Open', color: '#dc2626' },
  { id: 'in_progress', title: 'In Progress', color: '#f97316' },
  { id: 'pending_qa', title: 'Pending QA', color: '#8b5cf6' },
  { id: 'resolved', title: 'Resolved', color: '#3b82f6' },
  { id: 'closed', title: 'Closed', color: '#10b981' }
];

type SortOption = 'default' | 'priority' | 'dueDate' | 'name';

export function KanbanBoard() {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanContent />
    </DndProvider>
  );
}

function KanbanContent() {
  const { currentUser, hasPermission } = useAuth();
  const { tasks, defects, updateTask, updateDefect, getEmployeeById, getGoalById, getAppById, getTasksForEmployee, apps, tags } = useApp();
  const { showToast } = useToast();

  const canViewAll = hasPermission('view_all_apps');
  const displayTasks = canViewAll ? tasks : getTasksForEmployee(currentUser!.id);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [viewMode, setViewMode] = useState<'tasks' | 'defects'>('tasks');
  const [boardMode, setBoardMode] = useState<'status' | 'github'>('status');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterWorkType, setFilterWorkType] = useState<'all' | WorkType>('all');

  const filteredDefects = useMemo(() => {
    let result = canViewAll ? defects : defects.filter(d => d.assignedTo === currentUser!.id);
    if (filterApp !== 'all') result = result.filter(d => d.applicationId === filterApp);
    if (filterWorkType !== 'all') result = result.filter(d => (d.workType || 'development') === filterWorkType);
    return sortItems(result, sortBy);
  }, [defects, filterApp, filterTag, filterWorkType, sortBy, canViewAll, currentUser]);

  const filteredTasks = useMemo(() => {
    let result = displayTasks;
    if (filterApp !== 'all') {
      result = result.filter(t => {
        const goal = getGoalById(t.goalId);
        return goal?.appId === filterApp;
      });
    }
    if (filterTag !== 'all') {
      result = result.filter(t => t.tags?.includes(filterTag));
    }
    if (filterWorkType !== 'all') {
      result = result.filter(t => (t.workType || 'non-development') === filterWorkType);
    }
    return sortItems(result, sortBy);
  }, [displayTasks, filterApp, filterTag, filterWorkType, sortBy]);

  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const allowed = canTransitionWork({
      kind: 'task',
      currentStatus: task.status,
      nextStatus: newStatus,
      workType: task.workType || 'non-development',
      can: hasPermission
    });
    if (!allowed) {
      showToast({
        type: 'error',
        title: 'Action not permitted',
        message: `You don't have permission to move this task to "${newStatus.replace(/_/g, ' ')}".`
      });
      return;
    }
    updateTask(taskId, { status: newStatus });
  };

  const handleDefectDrop = (defectId: string, newStatus: DefectStatus) => {
    if (!currentUser) return;
    if (!canTransitionDefect(newStatus, hasPermission)) {
      showToast({
        type: 'error',
        title: 'Action not permitted',
        message: `You don't have permission to move defects to "${newStatus.replace(/_/g, ' ')}".`
      });
      return;
    }
    updateDefect(defectId, { status: newStatus }, currentUser.id, currentUser.name);
  };

  const showTasks = viewMode === 'tasks';
  const showDefects = viewMode === 'defects';
  const activeTaskColumns = filterWorkType === 'non-development' ? OPS_TASK_COLUMNS : DEV_TASK_COLUMNS;

  return (
    <div className="h-full flex flex-col p-4 lg:p-8">
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#F8FAFC] mb-1">Work Board</h1>
            <p className="text-sm text-[#94A3B8]">Track tasks and defects — switch tabs to view each board, drag cards to update status</p>
          </div>
          <div className="flex items-center gap-2 bg-[rgba(15,23,42,0.4)] p-1.5 rounded-xl border border-[rgba(34,197,94,0.1)] flex-wrap">
            <div className="flex items-center bg-[#1E293B]/70 border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('tasks')} className={`px-3 py-1.5 text-xs ${viewMode === 'tasks' ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]' : 'text-[#94A3B8]'}`}>Tasks</button>
              <button onClick={() => setViewMode('defects')} className={`px-3 py-1.5 text-xs ${viewMode === 'defects' ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]' : 'text-[#94A3B8]'}`}>Defects</button>
            </div>
            {showTasks && (
              <div className="flex items-center bg-[#1E293B]/70 border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
                <button
                  onClick={() => setBoardMode('status')}
                  className={`px-3 py-1.5 text-xs ${boardMode === 'status' ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]' : 'text-[#94A3B8]'}`}
                >
                  Status
                </button>
                <button
                  onClick={() => setBoardMode('github')}
                  className={`px-3 py-1.5 text-xs ${boardMode === 'github' ? 'text-[#8b5cf6] bg-[rgba(139,92,246,0.1)]' : 'text-[#94A3B8]'}`}
                  title="Group development tasks by GitHub lifecycle (branch → PR → review → QA → merged)"
                >
                  GitHub Lifecycle
                </button>
              </div>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-[rgba(15,23,42,0.55)] backdrop-blur border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] text-xs rounded-lg relative z-10"
            >
              <option value="default">Default</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="name">Name</option>
            </select>
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="px-3 py-1.5 bg-[rgba(15,23,42,0.55)] backdrop-blur border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] text-xs rounded-lg relative z-10"
            >
              <option value="all">All Apps</option>
              {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value as 'all' | WorkType)}
              className="px-3 py-1.5 bg-[rgba(15,23,42,0.55)] backdrop-blur border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] text-xs rounded-lg relative z-10"
            >
              <option value="all">All Work Types</option>
              <option value="development">Development</option>
              <option value="non-development">Non-development</option>
            </select>
            <div className="flex items-center gap-1">
              <TagIcon className="w-3 h-3 text-[#94A3B8]" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-1.5 bg-[rgba(15,23,42,0.55)] backdrop-blur border border-[rgba(34,197,94,0.12)] text-[#F8FAFC] text-xs rounded-lg relative z-10"
              >
                <option value="all">All Tags</option>
                {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {showTasks && boardMode === 'github' && GH_LIFECYCLE_COLUMNS.map((column) => {
          const columnTasks = filteredTasks.filter(task => (task.workType || 'non-development') === 'development' && column.match(task));
          return (
            <KanbanColumn
              key={`gh-${column.id}`}
              column={column}
              tasks={columnTasks}
              onDrop={() => {}}
              onCardClick={(task) => setSelectedTask(task as Task)}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              type="task"
              readOnly
              allTags={tags}
            />
          );
        })}
        {showTasks && boardMode === 'status' && activeTaskColumns.map((column) => {
          const columnTasks = filteredTasks.filter(task => task.status === column.id);
          return (
            <KanbanColumn
              key={`task-${column.id}`}
              column={column}
              tasks={columnTasks}
              onDrop={(id) => handleTaskDrop(id, column.id)}
              onCardClick={(task) => setSelectedTask(task as Task)}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              type="task"
              allTags={tags}
            />
          );
        })}
        {showDefects && DEFECT_COLUMNS.map((column) => {
          const columnDefects = filteredDefects.filter(d => d.status === column.id);
          return (
            <KanbanColumn
              key={`defect-${column.id}`}
              column={column}
              tasks={columnDefects}
              onDrop={(id) => handleDefectDrop(id, column.id)}
              onCardClick={(defect) => setSelectedDefect(defect as Defect)}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              type="defect"
              allTags={tags}
            />
          );
        })}
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {selectedDefect && <DefectDetailModal defect={selectedDefect} onClose={() => setSelectedDefect(null)} />}
    </div>
  );
}

function sortItems(items: any[], sortBy: SortOption) {
  if (sortBy === 'default') return items;
  return [...items].sort((a, b) => {
    if (sortBy === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority as keyof typeof order] ?? 99) - (order[b.priority as keyof typeof order] ?? 99);
    }
    if (sortBy === 'dueDate') {
      const aDate = a.dueDate?.toDate?.() || a.dueDate || 0;
      const bDate = b.dueDate?.toDate?.() || b.dueDate || 0;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    }
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });
}

type KanbanColumnProps = {
  column: { id: string; title: string; color: string };
  tasks: any[];
  onDrop: (id: string) => void;
  onCardClick: (item: any) => void;
  getEmployeeById: (id: string) => any;
  getGoalById: (id: string) => any;
  getAppById: (id: string) => any;
  type: 'task' | 'defect' | 'actionPoint';
  allTags: any[];
  readOnly?: boolean;
};

function KanbanColumn({ column, tasks, onDrop, onCardClick, getEmployeeById, getGoalById, getAppById, type, allTags, readOnly }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: readOnly ? 'none' : type === 'task' ? 'TASK' : type === 'defect' ? 'DEFECT' : 'ACTION_POINT',
    drop: (item: { taskId: string }) => {
      onDrop(item.taskId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const borderColor = type === 'defect' ? 'rgba(220,38,38,0.3)' : type === 'actionPoint' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.1)';
  const hoverBorder = type === 'defect' ? 'rgba(220,38,38,0.5)' : type === 'actionPoint' ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.3)';

  return (
    <div
      ref={readOnly ? undefined : drop}
      className={`flex-shrink-0 w-72 lg:w-80 bg-[#0F172A] ${readOnly ? '' : 'border-2 border-dashed'} transition ${
        isOver ? 'border-[#22C55E] bg-[rgba(34,197,94,0.05)]' : `border-transparent hover:border-[${borderColor}]`
      }`}
      style={readOnly ? {} : { borderColor: isOver ? '#22C55E' : borderColor }}
    >
      <div className="p-3 lg:p-4 border-b border-[rgba(34,197,94,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'defect' && <Bug className="w-4 h-4 text-[#dc2626]" />}
            {type === 'actionPoint' && <FileText className="w-4 h-4 text-[#f59e0b]" />}
            <h3 className="font-semibold text-[#F8FAFC] text-sm">{column.title}</h3>
          </div>
          <span className="bg-[#1E293B] text-[#F8FAFC] text-xs font-medium px-2 py-1">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="p-2 lg:p-3 space-y-2 lg:space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        {tasks.map((item: any) => (
          type === 'defect' ? (
            <DefectCard
              key={item.id}
              defect={item}
              onClick={onCardClick}
              getEmployeeById={getEmployeeById}
              getAppById={getAppById}
              allTags={allTags}
            />
          ) : type === 'actionPoint' ? (
            <ActionPointCard
              key={item.id}
              ap={item}
              onClick={onCardClick}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              allTags={allTags}
            />
          ) : (
            <TaskCard
              key={item.id}
              task={item}
              onClick={onCardClick}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              allTags={allTags}
            />
          )
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-[#94A3B8]">No {type === 'defect' ? 'bugs' : type === 'actionPoint' ? 'action points' : 'tasks'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  onClick: (task: Task) => void;
  getEmployeeById: (id: string) => any;
  getGoalById: (id: string) => any;
  getAppById: (id: string) => any;
  allTags: any[];
};

function TaskCard({ task, onClick, getEmployeeById, getGoalById, getAppById, allTags }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { taskId: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const assignee = getEmployeeById(task.assignedTo);
  const goal = getGoalById(task.goalId);
  const app = goal ? getAppById(goal.appId) : null;
  const appColor = app?.color || '#22C55E';
  const cardStyle = app?.cardStyle || 'default';

  const priorityColors: Record<string, string> = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]',
    medium: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  return (
    <div
      ref={drag}
      onClick={() => onClick(task)}
      className={`${getCardClasses(cardStyle, appColor, true)} cursor-pointer transition ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={getCardInlineStyle(cardStyle, appColor)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-[#F8FAFC] text-sm line-clamp-2">{task.name}</h4>
        {task.priority === 'urgent' && <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />}
      </div>
      <p className="text-xs text-[#94A3B8] mb-3 line-clamp-2">{task.description}</p>
      <div className="mb-2">
        <TagBadges tagIds={task.tags} allTags={allTags} />
      </div>
      {task.github?.pullRequest?.prNumber && (
        <div className="mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1 ${
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
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-1 ${priorityColors[task.priority]}`}>
          {task.priority.toUpperCase()}
        </span>
        {assignee && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#94A3B8]" />
            <span className="text-xs text-[#94A3B8]">{assignee.name.split(' ')[0]}</span>
          </div>
        )}
      </div>
      {goal && (
        <div className="mt-2 pt-2 border-t border-[rgba(34,197,94,0.1)]">
          <p className="text-xs text-[#94A3B8] truncate">{app?.name} → {goal.name}</p>
        </div>
      )}
    </div>
  );
}

type DefectCardProps = {
  defect: Defect;
  onClick: (defect: Defect) => void;
  getEmployeeById: (id: string) => any;
  getAppById: (id: string) => any;
  allTags: any[];
};

type ActionPointCardProps = {
  ap: ActionPoint;
  onClick: (ap: ActionPoint) => void;
  getEmployeeById: (id: string) => any;
  getGoalById: (id: string) => any;
  getAppById: (id: string) => any;
  allTags: any[];
};

function ActionPointCard({ ap, onClick, getEmployeeById, getGoalById, getAppById, allTags }: ActionPointCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'ACTION_POINT',
    item: { taskId: ap.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const assignees = ap.assignedTo.map(getEmployeeById).filter(Boolean);
  const goal = ap.goalId ? getGoalById(ap.goalId) : null;
  const app = goal ? getAppById(goal.appId) : ap.appId ? getAppById(ap.appId) : null;
  const appColor = app?.color || '#f59e0b';
  const cardStyle = app?.cardStyle || 'default';

  const priorityColors: Record<string, string> = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]',
    medium: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  return (
    <div
      ref={drag}
      onClick={() => onClick(ap)}
      className={`${getCardClasses(cardStyle, appColor, true)} cursor-pointer transition ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={getCardInlineStyle(cardStyle, appColor)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-[#F8FAFC] text-sm line-clamp-2">{ap.title}</h4>
        {ap.priority === 'urgent' && <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />}
      </div>
      {ap.description && <p className="text-xs text-[#94A3B8] mb-3 line-clamp-2">{ap.description}</p>}
      <div className="mb-2">
        <TagBadges tagIds={ap.tags} allTags={allTags} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 ${priorityColors[ap.priority]}`}>
            {ap.priority.toUpperCase()}
          </span>
          <span className={`text-xs font-medium px-2 py-1 ${
            (ap.workType || 'non-development') === 'development'
              ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
              : 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
          }`}>
            {(ap.workType || 'non-development') === 'development' ? 'DEV' : 'OPS'}
          </span>
        </div>
        {assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#94A3B8]" />
            <span className="text-xs text-[#94A3B8]">{assignees[0].name.split(' ')[0]}</span>
          </div>
        )}
      </div>
      {(goal || app) && (
        <div className="mt-2 pt-2 border-t border-[rgba(34,197,94,0.1)]">
          <p className="text-xs text-[#94A3B8] truncate">
            {app?.name}{goal ? ` → ${goal.name}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
  function DefectCard({ defect, onClick, getEmployeeById, getAppById, allTags }: DefectCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'DEFECT',
    item: { taskId: defect.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });
  const { sendDefectNotification } = useApp();
  const { showToast } = useToast();

  const assignee = getEmployeeById(defect.assignedTo);
  const defectApp = getAppById(defect.applicationId);

  const severityColors: Record<string, string> = {
    blocker: 'bg-[rgba(153,27,27,0.2)] text-[#991b1b]',
    critical: 'bg-[rgba(220,38,38,0.2)] text-[#dc2626]',
    major: 'bg-[rgba(245,158,11,0.2)] text-[#f59e0b]',
    minor: 'bg-[rgba(234,179,8,0.2)] text-[#eab308]'
  };

  const handleMailClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await sendDefectNotification(defect.id);
    showToast({ type: 'success', title: 'Email Sent', message: `Notification sent for "${defect.defectCode}"` });
  };

  return (
    <div
      ref={drag}
      onClick={() => onClick(defect)}
      className={`bg-[#0F172A] border border-[rgba(220,38,38,0.2)] p-3 lg:p-4 cursor-pointer hover:border-[rgba(220,38,38,0.4)] hover:shadow-md transition ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <Bug className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#dc2626]">{defect.defectCode}</span>
            {defect.severity === 'blocker' && <AlertCircle className="w-3 h-3 text-[#991b1b]" />}
          </div>
          <h4 className="font-medium text-[#F8FAFC] text-sm line-clamp-2 mt-1">{defect.title}</h4>
        </div>
      </div>
      <p className="text-xs text-[#94A3B8] mb-2 line-clamp-2">{defect.module || defect.description}</p>
      <div className="mb-2">
        <TagBadges tagIds={(defect as any).tags} allTags={allTags} />
      </div>
      {defect.github?.pullRequest?.prNumber && (
        <div className="mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1 ${
            defect.github.pullRequest.state === 'merged'
              ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
              : defect.github.pullRequest.reviewState === 'approved' && defect.github.pullRequest.checkStatus === 'success'
                ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                : defect.github.pullRequest.reviewState === 'changes_requested' ||
                  defect.github.pullRequest.checkStatus === 'failure'
                  ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
          }`}>
            <GitPullRequest className="w-3 h-3" />
            PR #{defect.github.pullRequest.prNumber}
          </span>
        </div>
      )}
      {defectApp && (
        <div className="mb-2 pt-2 border-t border-[rgba(220,38,38,0.15)]">
          <p className="text-xs text-[#94A3B8] truncate">{defectApp.name}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-1 ${severityColors[defect.severity]}`}>
          {defect.severity.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          {assignee && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#94A3B8]" />
              <span className="text-xs text-[#94A3B8]">{assignee.name.split(' ')[0]}</span>
            </div>
          )}
          <button
            onClick={handleMailClick}
            className={`p-1 rounded transition ${
              defect.lastEmailSentAt
                ? 'text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)]'
                : 'text-[#10b981] hover:bg-[rgba(16,185,129,0.1)]'
            }`}
            title={defect.lastEmailSentAt ? 'Resend email' : 'Send email'}
          >
            <Mail className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
