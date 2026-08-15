import { Task, ActionPoint, Defect, WorkType, TaskStatus } from '../app/types';

export type WorkKind = 'task' | 'action_point' | 'defect';

export type WorkStatus =
  | TaskStatus
  | 'pending'
  | 'completed'
  | 'carried_over'
  | 'open'
  | 'pending_qa'
  | 'resolved'
  | 'closed'
  | 'reopened';

export type WorkItem = {
  id: string;
  workKind: WorkKind;
  workType: WorkType;
  title: string;
  description: string;
  appId?: string;
  phaseId?: string;
  goalId?: string;
  assigneeIds: string[];
  priority: string;
  status: WorkStatus;
  startDate?: Date;
  dueDate?: Date;
  tags?: string[];
  followers?: string[];
  sprintId?: string;
  code?: string;
  createdAt: Date;
  completedAt?: Date;
  raw: Task | ActionPoint | Defect;
};

export function defaultWorkType(kind: WorkKind): WorkType {
  return kind === 'defect' ? 'development' : 'non-development';
}

export function taskWorkType(task: Task): WorkType {
  return task.workType || 'non-development';
}

export function actionPointWorkType(ap: ActionPoint): WorkType {
  return ap.workType || 'non-development';
}

export function defectWorkType(defect: Defect): WorkType {
  return defect.workType || 'development';
}

function pick<T>(value: T | undefined, fallback?: T): T | undefined {
  return value === undefined ? fallback : value;
}

export function taskToWork(task: Task, fallbackAppId?: string, fallbackPhaseId?: string): WorkItem {
  return {
    id: task.id,
    workKind: 'task',
    workType: taskWorkType(task),
    title: task.name,
    description: task.description,
    appId: pick(task.appId, fallbackAppId),
    phaseId: pick(task.phaseId, fallbackPhaseId),
    goalId: task.goalId,
    assigneeIds: task.assignedTo,
    priority: task.priority,
    status: task.status,
    startDate: task.startDate,
    dueDate: task.dueDate,
    tags: task.tags,
    followers: task.followers,
    sprintId: task.sprintId,
    code: task.code,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    raw: task
  };
}

export function actionPointToWork(ap: ActionPoint, fallbackAppId?: string, fallbackPhaseId?: string): WorkItem {
  return {
    id: ap.id,
    workKind: 'action_point',
    workType: actionPointWorkType(ap),
    title: ap.title,
    description: ap.description || '',
    appId: pick(ap.appId, fallbackAppId),
    phaseId: pick(ap.phaseId, fallbackPhaseId),
    goalId: ap.goalId,
    assigneeIds: ap.assignedTo,
    priority: ap.priority,
    status: ap.status,
    startDate: ap.date,
    dueDate: undefined,
    tags: ap.tags,
    followers: ap.followers,
    sprintId: ap.sprintId,
    createdAt: ap.createdAt,
    completedAt: ap.completedAt,
    raw: ap
  };
}

export function defectToWork(defect: Defect, fallbackPhaseId?: string): WorkItem {
  return {
    id: defect.id,
    workKind: 'defect',
    workType: defectWorkType(defect),
    title: defect.title,
    description: defect.description,
    appId: defect.applicationId,
    phaseId: pick(defect.phaseId, fallbackPhaseId),
    goalId: defect.goalId,
    assigneeIds: defect.assignedTo ? [defect.assignedTo] : [],
    priority: defect.priority,
    status: defect.status,
    startDate: defect.dateReported,
    dueDate: defect.dueDate,
    tags: defect.tags,
    followers: defect.followers,
    sprintId: defect.sprintId,
    code: defect.defectCode,
    createdAt: defect.createdAt,
    completedAt: defect.closedAt,
    raw: defect
  };
}

export function allWork(
  tasks: Task[],
  actionPoints: ActionPoint[],
  defects: Defect[],
  goalAppId: (goalId?: string) => string | undefined,
  goalPhaseId: (goalId?: string) => string | undefined
): WorkItem[] {
  const items: WorkItem[] = [];
  for (const t of tasks) items.push(taskToWork(t, goalAppId(t.goalId), goalPhaseId(t.goalId)));
  for (const ap of actionPoints) items.push(actionPointToWork(ap, goalAppId(ap.goalId), goalPhaseId(ap.goalId)));
  for (const d of defects) items.push(defectToWork(d, goalPhaseId(d.goalId)));
  return items;
}

export function workForUser(
  items: WorkItem[],
  userId: string
): WorkItem[] {
  return items.filter(
    item => item.assigneeIds.includes(userId) || item.followers?.includes(userId)
  );
}

export function isOpenWork(item: WorkItem): boolean {
  return item.status !== 'approved' && item.status !== 'merged' && item.status !== 'completed' && item.status !== 'closed';
}