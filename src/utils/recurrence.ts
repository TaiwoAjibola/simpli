import { Task, TaskOrigin } from '../app/types';

export function nextOccurrence(task: Pick<Task, 'recurrence' | 'dueDate' | 'completedAt'>): Date | null {
  const rec = task.recurrence;
  if (!rec) return null;
  const anchor = task.completedAt || task.dueDate || new Date();
  const next = new Date(anchor);
  const interval = Math.max(1, rec.interval || 1);
  if (rec.frequency === 'daily') {
    next.setDate(next.getDate() + interval);
  } else if (rec.frequency === 'weekly') {
    next.setDate(next.getDate() + interval * 7);
  } else {
    next.setMonth(next.getMonth() + interval);
  }
  if (rec.endDate && next > rec.endDate) return null;
  return next;
}

export function isRecurring(task: Pick<Task, 'recurrence'>): boolean {
  return !!task.recurrence;
}

export type NextTaskTemplate = Omit<
  Task,
  'id' | 'createdAt' | 'status' | 'completedAt' | 'approvedAt' | 'approvedBy' | 'github' | 'lastEmailSentAt'
>;

export function buildNextOccurrence<T extends NextTaskTemplate>(
  task: T,
  dueDate: Date,
  origin: TaskOrigin
): NextTaskTemplate {
  const {
    completedAt: _c,
    approvedAt: _a,
    approvedBy: _b,
    github: _g,
    lastEmailSentAt: _l,
    ...rest
  } = task as any;
  const next: any = {
    ...rest,
    dueDate,
    startDate: task.startDate ? new Date(task.startDate) : undefined,
    endDate: task.recurrence?.endDate ? new Date(task.recurrence.endDate) : undefined,
    createdAt: undefined
  };
  delete next.createdAt;
  delete next.completedAt;
  delete next.approvedAt;
  delete next.approvedBy;
  delete next.github;
  delete next.lastEmailSentAt;
  next.origin = origin;
  return next;
}

export function nextOccurrencePayload<T extends NextTaskTemplate>(
  task: T,
  doneAt: Date
): { payload: NextTaskTemplate; dueDate: Date; origin: TaskOrigin } | null {
  if (!isRecurring(task)) return null;
  const next = nextOccurrence({ ...(task as any), completedAt: task.completedAt || doneAt });
  if (!next) return null;
  const parentTaskId = (task.origin as any)?.source === 'recurrence' ? (task.origin as any).parentTaskId || task.id : task.id;
  return {
    payload: buildNextOccurrence(task, next, { source: 'recurrence', parentTaskId }),
    dueDate: next,
    origin: { source: 'recurrence', parentTaskId }
  };
}