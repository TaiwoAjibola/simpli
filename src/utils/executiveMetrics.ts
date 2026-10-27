import { App, Goal, Phase, Task, Defect } from '../app/types';

export type RagStatus = 'green' | 'amber' | 'red';

export interface GoalProgress {
  goalId: string;
  name: string;
  status?: string;
  progressPct: number;
}

export interface ExecutiveMetrics {
  goalCompletionPct: number;
  phaseCompletionPct: number;
  totalGoals: number;
  completedGoals: number;
  totalPhases: number;
  completedPhases: number;
  daysToTarget: number | null;
  health: RagStatus;
  riskBlockers: number;
  riskCritical: number;
  riskOnHoldPhases: number;
  riskOverdueGoals: number;
  totalOpenDefects: number;
  goalProgress: GoalProgress[];
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function computeExecutiveMetrics(args: {
  app: App;
  goals: Goal[];
  phases: Phase[];
  tasks: Task[];
  defects: Defect[];
}): ExecutiveMetrics {
  const { app, goals, phases, tasks, defects } = args;

  const appGoals = goals.filter(g => g.appId === app.id);
  const appPhases = phases.filter(p => p.appId === app.id);
  const appDefects = defects.filter(d => d.applicationId === app.id);

  const totalGoals = appGoals.length;
  const completedGoals = appGoals.filter(g => g.status === 'completed').length;
  const goalCompletionPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const totalPhases = appPhases.length;
  const completedPhases = appPhases.filter(p => p.status === 'completed').length;
  const phaseCompletionPct = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const goalProgress: GoalProgress[] = appGoals.map(g => {
    const gTasks = tasks.filter(t => t.goalId === g.id);
    const total = gTasks.length;
    const done = gTasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : (g.status === 'completed' ? 100 : 0);
    return { goalId: g.id, name: g.name, status: g.status, progressPct };
  });

  const riskBlockers = appDefects.filter(d => d.severity === 'blocker' && d.status !== 'closed').length;
  const riskCritical = appDefects.filter(d => d.severity === 'critical' && d.status !== 'closed').length;
  const riskOnHoldPhases = appPhases.filter(p => p.status === 'on_hold').length;

  const today = new Date();
  const riskOverdueGoals = appGoals.filter(
    g => g.endDate && new Date(g.endDate) < today && g.status !== 'completed'
  ).length;

  const totalOpenDefects = appDefects.filter(d => d.status !== 'closed').length;

  let daysToTarget: number | null = null;
  if (app.expectedCompletionDate) {
    daysToTarget = Math.ceil((new Date(app.expectedCompletionDate).getTime() - today.getTime()) / DAY_MS);
  }

  let health: RagStatus = 'green';
  const targetPassed = daysToTarget !== null && daysToTarget < 0;
  if (riskBlockers > 0 || app.status === 'on_hold' || targetPassed) {
    health = 'red';
  } else if (
    riskCritical > 0 ||
    riskOnHoldPhases > 0 ||
    (daysToTarget !== null && daysToTarget <= 30 && goalCompletionPct < 50)
  ) {
    health = 'amber';
  }

  return {
    goalCompletionPct,
    phaseCompletionPct,
    totalGoals,
    completedGoals,
    totalPhases,
    completedPhases,
    daysToTarget,
    health,
    riskBlockers,
    riskCritical,
    riskOnHoldPhases,
    riskOverdueGoals,
    totalOpenDefects,
    goalProgress
  };
}

export function truncateSummary(summary: string | undefined, max = 160): string {
  if (!summary) return '';
  if (summary.length <= max) return summary;
  return summary.slice(0, max).trimEnd() + '…';
}
