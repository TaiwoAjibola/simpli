import { MonthlyPlan, MonthlyPlanStatus, Goal, Task } from '../app/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Current month key in `YYYY-MM` (local time). */
export function currentMonthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

/** Build a `YYYY-MM` key from a Date. */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

/** Human label for a `YYYY-MM` key, e.g. "September 2026". Falls back to the raw key. */
export function monthLabel(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key || '');
  if (!m) return key || '';
  const year = m[1];
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return key;
  return `${MONTH_NAMES[idx]} ${year}`;
}

/** First and last day (local) of the month described by a `YYYY-MM` key. */
export function monthRange(key: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key || '');
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11) return null;
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/** Sensible default plan name for a month key. */
export function defaultPlanName(key: string): string {
  const label = monthLabel(key);
  return label ? `${label} Plan` : 'Monthly Plan';
}

export type PlanProgress = {
  goalsTotal: number;
  goalsCompleted: number;
  tasksTotal: number;
  tasksDone: number;
  percent: number;
};

function isDone(status?: string): boolean {
  return status === 'completed' || status === 'approved';
}

/**
 * Progress for a plan, counting goals attached directly to the plan and tasks
 * attached to the plan OR to one of the plan's goals. Percent is task-based
 * (falls back to goal-based when the plan has goals but no tasks).
 */
export function planProgress(
  plan: MonthlyPlan,
  goals: Goal[],
  tasks: Task[]
): PlanProgress {
  const planGoals = goals.filter(g => g.planId === plan.id);
  const planGoalIds = new Set(planGoals.map(g => g.id));
  const planTasks = tasks.filter(t => t.planId === plan.id || (t.goalId && planGoalIds.has(t.goalId)));

  const goalsTotal = planGoals.length;
  const goalsCompleted = planGoals.filter(g => g.status === 'completed').length;
  const tasksTotal = planTasks.length;
  const tasksDone = planTasks.filter(t => isDone(t.status)).length;

  let percent = 0;
  if (tasksTotal > 0) percent = Math.round((tasksDone / tasksTotal) * 100);
  else if (goalsTotal > 0) percent = Math.round((goalsCompleted / goalsTotal) * 100);

  return { goalsTotal, goalsCompleted, tasksTotal, tasksDone, percent };
}

/** Sort plans by month (desc), then active-first, then name. */
export function sortPlans(plans: MonthlyPlan[]): MonthlyPlan[] {
  const rank: Record<MonthlyPlanStatus, number> = { active: 0, planned: 1, completed: 2 };
  return [...plans].sort((a, b) => {
    if (a.month !== b.month) return a.month < b.month ? 1 : -1;
    if (a.status !== b.status) return rank[a.status] - rank[b.status];
    return a.name.localeCompare(b.name);
  });
}
