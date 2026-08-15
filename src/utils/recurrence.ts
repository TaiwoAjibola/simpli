import { Task } from '../app/types';

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