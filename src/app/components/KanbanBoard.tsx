import React, { useState, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskStatus, DefectStatus, Defect, ActionPoint, ActionPointStatus, WorkType } from '../types';
import { Clock, AlertCircle, CheckCircle, Star, User, Bug, ArrowUpDown, Mail, Tag as TagIcon, FileText } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';
import { DefectDetailModal } from './DefectDetailModal';
import { getCardClasses, getCardInlineStyle } from '../../utils/cardStyles';
import { TagBadges } from './TagBadges';
import { canTransitionDefect } from '../../utils/defectPermissions';
import { canTransitionWork } from '../../utils/workflow';

const TASK_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'not_started', title: 'Not Started', color: '#6b6b80' },
  { id: 'in_progress', title: 'In Progress', color: '#00e5ff' },
  { id: 'blocked', title: 'Blocked', color: '#ff3b5c' },
  { id: 'completed', title: 'Completed', color: '#8b5cf6' },
  { id: 'approved', title: 'Approved', color: '#10b981' }
];

const DEFECT_COLUMNS: { id: DefectStatus; title: string; color: string }[] = [
  { id: 'open', title: 'Open', color: '#dc2626' },
  { id: 'in_progress', title: 'In Progress', color: '#f97316' },
  { id: 'pending_qa', title: 'Pending QA', color: '#8b5cf6' },
  { id: 'resolved', title: 'Resolved', color: '#3b82f6' },
  { id: 'closed', title: 'Closed', color: '#10b981' }
];

const ACTION_POINT_COLUMNS: { id: ActionPointStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'Pending', color: '#6b6b80' },
  { id: 'carried_over', title: 'Carried Over', color: '#f59e0b' },
  { id: 'completed', title: 'Completed', color: '#10b981' }
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
  const { tasks, actionPoints, defects, updateTask, updateActionPoint, updateDefect, getEmployeeById, getGoalById, getAppById, getTasksForEmployee, apps, tags } = useApp();
  const { showToast } = useToast();

  const canViewAll = hasPermission('view_all_apps');
  const displayTasks = canViewAll ? tasks : getTasksForEmployee(currentUser!.id);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'tasks' | 'defects' | 'actionPoints'>('all');
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

  const filteredActionPoints = useMemo(() => {
    let result = canViewAll ? actionPoints : actionPoints.filter(ap => ap.assignedTo.includes(currentUser!.id));
    if (filterApp !== 'all') {
      result = result.filter(ap => {
        const goal = ap.goalId ? getGoalById(ap.goalId) : null;
        return ap.appId === filterApp || goal?.appId === filterApp;
      });
    }
    if (filterWorkType !== 'all') {
      result = result.filter(ap => (ap.workType || 'non-development') === filterWorkType);
    }
    return sortItems(result, sortBy);
  }, [actionPoints, filterApp, filterWorkType, sortBy, canViewAll, currentUser]);

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

  const handleActionPointDrop = (apId: string, newStatus: ActionPointStatus) => {
    updateActionPoint(apId, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined,
      completedBy: newStatus === 'completed' ? currentUser?.id : undefined
    });
  };

  const showTasks = viewMode === 'all' || viewMode === 'tasks';
  const showDefects = viewMode === 'all' || viewMode === 'defects';
  const showActionPoints = viewMode === 'all' || viewMode === 'actionPoints';

  return (
    <div className="h-full flex flex-col p-4 lg:p-8">
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#f0f0f5] mb-1">Work Board</h1>
            <p className="text-sm text-[#6b6b80]">Unified board across tasks, action points and defects — drag cards to update status</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
              <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 text-xs ${viewMode === 'all' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}>All</button>
              <button onClick={() => setViewMode('tasks')} className={`px-3 py-1.5 text-xs ${viewMode === 'tasks' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}>Tasks</button>
              <button onClick={() => setViewMode('defects')} className={`px-3 py-1.5 text-xs ${viewMode === 'defects' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}>Bugs</button>
              <button onClick={() => setViewMode('actionPoints')} className={`px-3 py-1.5 text-xs ${viewMode === 'actionPoints' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]' : 'text-[#6b6b80]'}`}>Action Points</button>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs"
            >
              <option value="default">Default</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="name">Name</option>
            </select>
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="px-3 py-1.5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs"
            >
              <option value="all">All Apps</option>
              {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value as 'all' | WorkType)}
              className="px-3 py-1.5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs"
            >
              <option value="all">All Work Types</option>
              <option value="development">Development</option>
              <option value="non-development">Non-development</option>
            </select>
            <div className="flex items-center gap-1">
              <TagIcon className="w-3 h-3 text-[#6b6b80]" />
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-3 py-1.5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs"
              >
                <option value="all">All Tags</option>
                {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {showTasks && TASK_COLUMNS.map((column) => {
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
        {showActionPoints && ACTION_POINT_COLUMNS.map((column) => {
          const columnAPs = filteredActionPoints.filter(ap => ap.status === column.id);
          return (
            <KanbanColumn
              key={`ap-${column.id}`}
              column={column}
              tasks={columnAPs}
              onDrop={(id) => handleActionPointDrop(id, column.id)}
              onCardClick={(ap) => {}}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
              getAppById={getAppById}
              type="actionPoint"
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
};

function KanbanColumn({ column, tasks, onDrop, onCardClick, getEmployeeById, getGoalById, getAppById, type, allTags }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: type === 'task' ? 'TASK' : type === 'defect' ? 'DEFECT' : 'ACTION_POINT',
    drop: (item: { taskId: string }) => {
      onDrop(item.taskId);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const borderColor = type === 'defect' ? 'rgba(220,38,38,0.3)' : type === 'actionPoint' ? 'rgba(245,158,11,0.3)' : 'rgba(0,229,255,0.1)';
  const hoverBorder = type === 'defect' ? 'rgba(220,38,38,0.5)' : type === 'actionPoint' ? 'rgba(245,158,11,0.5)' : 'rgba(0,229,255,0.3)';

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-72 lg:w-80 bg-[#12121a] border-2 border-dashed transition ${
        isOver ? 'border-[#00e5ff] bg-[rgba(0,229,255,0.05)]' : `border-transparent hover:border-[${borderColor}]`
      }`}
      style={{ borderColor: isOver ? '#00e5ff' : borderColor }}
    >
      <div className="p-3 lg:p-4 border-b border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'defect' && <Bug className="w-4 h-4 text-[#dc2626]" />}
            {type === 'actionPoint' && <FileText className="w-4 h-4 text-[#f59e0b]" />}
            <h3 className="font-semibold text-[#f0f0f5] text-sm">{column.title}</h3>
          </div>
          <span className="bg-[#1a1a2e] text-[#f0f0f5] text-xs font-medium px-2 py-1">
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
            <p className="text-xs text-[#6b6b80]">No {type === 'defect' ? 'bugs' : type === 'actionPoint' ? 'action points' : 'tasks'}</p>
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
  const appColor = app?.color || '#00e5ff';
  const cardStyle = app?.cardStyle || 'default';

  const priorityColors: Record<string, string> = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
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
        <h4 className="font-medium text-[#f0f0f5] text-sm line-clamp-2">{task.name}</h4>
        {task.priority === 'urgent' && <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />}
      </div>
      <p className="text-xs text-[#6b6b80] mb-3 line-clamp-2">{task.description}</p>
      <div className="mb-2">
        <TagBadges tagIds={task.tags} allTags={allTags} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-1 ${priorityColors[task.priority]}`}>
          {task.priority.toUpperCase()}
        </span>
        {assignee && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#6b6b80]" />
            <span className="text-xs text-[#6b6b80]">{assignee.name.split(' ')[0]}</span>
          </div>
        )}
      </div>
      {goal && (
        <div className="mt-2 pt-2 border-t border-[rgba(0,229,255,0.1)]">
          <p className="text-xs text-[#6b6b80] truncate">{app?.name} → {goal.name}</p>
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
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
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
        <h4 className="font-medium text-[#f0f0f5] text-sm line-clamp-2">{ap.title}</h4>
        {ap.priority === 'urgent' && <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c] flex-shrink-0" />}
      </div>
      {ap.description && <p className="text-xs text-[#6b6b80] mb-3 line-clamp-2">{ap.description}</p>}
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
              : 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]'
          }`}>
            {(ap.workType || 'non-development') === 'development' ? 'DEV' : 'OPS'}
          </span>
        </div>
        {assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#6b6b80]" />
            <span className="text-xs text-[#6b6b80]">{assignees[0].name.split(' ')[0]}</span>
          </div>
        )}
      </div>
      {(goal || app) && (
        <div className="mt-2 pt-2 border-t border-[rgba(0,229,255,0.1)]">
          <p className="text-xs text-[#6b6b80] truncate">
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
      className={`bg-[#1a0a0a] border border-[rgba(220,38,38,0.2)] p-3 lg:p-4 cursor-pointer hover:border-[rgba(220,38,38,0.4)] hover:shadow-md transition ${
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
          <h4 className="font-medium text-[#f0f0f5] text-sm line-clamp-2 mt-1">{defect.title}</h4>
        </div>
      </div>
      <p className="text-xs text-[#6b6b80] mb-2 line-clamp-2">{defect.module || defect.description}</p>
      <div className="mb-2">
        <TagBadges tagIds={(defect as any).tags} allTags={allTags} />
      </div>
      {defectApp && (
        <div className="mb-2 pt-2 border-t border-[rgba(220,38,38,0.15)]">
          <p className="text-xs text-[#6b6b80] truncate">{defectApp.name}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-1 ${severityColors[defect.severity]}`}>
          {defect.severity.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          {assignee && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#6b6b80]" />
              <span className="text-xs text-[#6b6b80]">{assignee.name.split(' ')[0]}</span>
            </div>
          )}
          <button
            onClick={handleMailClick}
            className={`p-1 rounded transition ${
              defect.lastEmailSentAt
                ? 'text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)]'
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
