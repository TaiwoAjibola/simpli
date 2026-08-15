import { Task, Defect } from '../app/types';

export type AppHealthInput = {
  tasks: Pick<Task, 'status' | 'workType' | 'dueDate' | 'createdAt'>[];
  defects: Pick<Defect, 'status' | 'severity' | 'createdAt'>[];
  blockedCount: number;
};

export type AppHealth = {
  score: number;
  level: 'healthy' | 'at_risk' | 'critical';
  openTasks: number;
  overdueTasks: number;
  openDefects: number;
  criticalDefects: number;
  agingDefects: number;
  qaPending: number;
  blocked: number;
};

/** Pure derived health from client-side subscriptions (no server machinery). */
export function computeAppHealth(input: AppHealthInput): AppHealth {
  const openTasks = input.tasks.filter(t => !['completed', 'approved'].includes(t.status)).length;
  const now = Date.now();
  const overdueTasks = input.tasks.filter(t =>
    t.dueDate && !['completed', 'approved'].includes(t.status) && new Date(t.dueDate).getTime() < now
  ).length;

  const openDefects = input.defects.filter(d => !['resolved', 'closed'].includes(d.status)).length;
  const criticalDefects = input.defects.filter(d =>
    ['critical', 'blocker'].includes(d.severity) && !['resolved', 'closed'].includes(d.status)
  ).length;
  const agingDefects = input.defects.filter(d =>
    !['resolved', 'closed'].includes(d.status) &&
    (now - new Date(d.createdAt).getTime()) > 7 * 86400000
  ).length;
  const qaPending = input.defects.filter(d => d.status === 'pending_qa').length;
  const blocked = input.blockedCount;

  let score = 100;
  score -= openDefects * 3;
  score -= criticalDefects * 15;
  score -= agingDefects * 5;
  score -= overdueTasks * 2;
  score -= blocked * 4;
  if (qaPending > 0) score -= Math.min(qaPending * 2, 10);

  score = Math.max(0, Math.min(100, score));
  const level: AppHealth['level'] = score >= 75 ? 'healthy' : score >= 45 ? 'at_risk' : 'critical';

  return { score, level, openTasks, overdueTasks, openDefects, criticalDefects, agingDefects, qaPending, blocked };
}