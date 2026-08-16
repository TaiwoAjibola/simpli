// Pure helpers that compile Simpli's live state into a compact, structured
// "snapshot" that the Groq-powered report route consumes. Kept free of
// Firebase/Groq imports so it is fully unit-testable (reportLogic.test.ts).
//
// The snapshot is intentionally an aggregate (counts + headline item names),
// not the full dataset, so API calls stay small and cheap while still being
// grounded in the real state of the system.

export type ReportScope = {
  appId: string;
  appName: string;
  stage?: string;
  status?: string;
};

export type ReportSnapshot = {
  generatedAt: string;
  scope: ReportScope;
  goals: {
    total: number;
    completed: number;
    names: string[];
  };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byWorkType: { development: number; nonDevelopment: number };
    byPriority: Record<string, number>;
    overdue: number;
    dueSoon: number;
    completionRate: number;
    recurring: number;
    recentNames: string[];
  };
  defects: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    openCritical: number;
    recentNames: string[];
  };
  github: {
    repositories: number;
    connected: number;
    tasksWithBranch: number;
    tasksWithPr: number;
    prOpen: number;
    prMerged: number;
    prChangesRequested: number;
    issuesOpen: number;
  };
  team: {
    total: number;
    workload: { name: string; assigned: number; completed: number; inProgress: number; blocked: number }[];
  };
  recentActivity: { userName: string; description: string; timestamp: string }[];
};

type TaskLike = {
  id: string;
  name: string;
  status: string;
  priority?: string;
  workType?: 'development' | 'non-development';
  goalId?: string;
  assignedTo?: string[];
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  completedAt?: Date;
  recurrence?: unknown;
  github?: {
    repositoryId?: string;
    branchName?: string;
    pullRequest?: { state?: string; reviewState?: string; prNumber?: number };
    issue?: { state?: string; issueNumber?: number };
  };
};

type DefectLike = {
  id: string;
  title: string;
  status: string;
  severity?: string;
  github?: {
    pullRequest?: { state?: string };
    issue?: { state?: string; issueNumber?: number };
  };
};

type GoalLike = { id: string; name: string; appId?: string; status?: string };
type RepoLike = { connectionStatus?: string };
type EmpLike = { id: string; name: string };
type ActLike = { id: string; userName: string; description: string; timestamp: any };

function isOverdue(t: TaskLike, now: number): boolean {
  if (!t.dueDate) return false;
  const due = t.dueDate instanceof Date ? t.dueDate.getTime() : new Date(t.dueDate as any).getTime();
  if (isNaN(due)) return false;
  return due < now && t.status !== 'completed' && t.status !== 'approved';
}

function isDueSoon(t: TaskLike, now: number): boolean {
  if (!t.dueDate) return false;
  const due = t.dueDate instanceof Date ? t.dueDate.getTime() : new Date(t.dueDate as any).getTime();
  if (isNaN(due)) return false;
  const daysLeft = (due - now) / 86400000;
  return daysLeft >= 0 && daysLeft <= 7 && t.status !== 'completed' && t.status !== 'approved';
}

function fmtTime(v: any): string {
  if (!v) return '';
  try {
    if (v instanceof Date) return v.toISOString();
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v === 'string' || typeof v === 'number') return new Date(v).toISOString();
    return '';
  } catch {
    return '';
  }
}

/**
 * Build a compact per-app snapshot from live AppContext state.
 * `now` is injectable for deterministic tests.
 */
export function buildReportSnapshot(input: {
  apps: any[];
  goals: GoalLike[];
  tasks: TaskLike[];
  defects: DefectLike[];
  repositories: RepoLike[];
  employees: EmpLike[];
  activities: ActLike[];
  selectedAppId: string;
  now?: number;
}): ReportSnapshot {
  const {
    apps, goals, tasks, defects, repositories, employees, activities, selectedAppId
  } = input;
  const now = input.now ?? Date.now();

  const app = apps.find(a => a.id === selectedAppId);
  const scope: ReportScope = {
    appId: selectedAppId,
    appName: app?.name || (selectedAppId === 'all' ? 'All Applications' : 'Unknown'),
    stage: app?.currentStage,
    status: app?.status
  };

  const appGoalIds = new Set(
    selectedAppId === 'all'
      ? goals.map(g => g.id)
      : goals.filter(g => g.appId === selectedAppId).map(g => g.id)
  );
  const appTasks = selectedAppId === 'all'
    ? tasks
    : tasks.filter(t => appGoalIds.has(t.goalId || ''));

  // Defects carry applicationId, not goalId.
  const appDefectIds = selectedAppId === 'all'
    ? new Set(defects.map(d => d.id))
    : new Set(defects.filter(d => (d as any).applicationId === selectedAppId).map(d => d.id));
  const scopedDefects = defects.filter(d => appDefectIds.has(d.id));

  const byStatus: Record<string, number> = {};
  for (const t of appTasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;

  const byWorkType = {
    development: appTasks.filter(t => (t.workType || 'non-development') === 'development').length,
    nonDevelopment: appTasks.filter(t => (t.workType || 'non-development') !== 'development').length
  };

  const byPriority: Record<string, number> = {};
  for (const t of appTasks) {
    const p = t.priority || 'unset';
    byPriority[p] = (byPriority[p] || 0) + 1;
  }

  const completed = appTasks.filter(t => t.status === 'completed' || t.status === 'approved').length;

  const defectByStatus: Record<string, number> = {};
  for (const d of scopedDefects) defectByStatus[d.status] = (defectByStatus[d.status] || 0) + 1;

  const defectBySeverity: Record<string, number> = {};
  for (const d of scopedDefects) {
    const s = d.severity || 'unset';
    defectBySeverity[s] = (defectBySeverity[s] || 0) + 1;
  }

  const githubTasks = appTasks.filter(t => t.github?.repositoryId);
  const prStates = appTasks.map(t => t.github?.pullRequest?.state).filter(Boolean);
  const prReviews = appTasks.map(t => t.github?.pullRequest?.reviewState).filter(Boolean);
  const openIssues = appTasks.filter(t => t.github?.issue?.state === 'open').length;

  const connectedRepos = repositories.filter(r => r.connectionStatus === 'connected').length;

  const workload = employees.map(emp => {
    const assigned = appTasks.filter(t => (t.assignedTo || []).includes(emp.id));
    return {
      name: emp.name,
      assigned: assigned.length,
      completed: assigned.filter(t => t.status === 'completed' || t.status === 'approved').length,
      inProgress: assigned.filter(t => t.status === 'in_progress').length,
      blocked: assigned.filter(t => t.status === 'blocked').length
    };
  }).filter(w => w.assigned > 0).sort((a, b) => b.assigned - a.assigned);

  const recentActivity = activities
    .slice(0, 8)
    .map(a => ({ userName: a.userName, description: a.description, timestamp: fmtTime(a.timestamp) }));

  return {
    generatedAt: new Date(now).toISOString(),
    scope,
    goals: {
      total: appGoalIds.size,
      completed: goals.filter(g => appGoalIds.has(g.id) && g.status === 'completed').length,
      names: goals.filter(g => appGoalIds.has(g.id)).slice(0, 10).map(g => g.name)
    },
    tasks: {
      total: appTasks.length,
      byStatus,
      byWorkType,
      byPriority,
      overdue: appTasks.filter(t => isOverdue(t, now)).length,
      dueSoon: appTasks.filter(t => isDueSoon(t, now)).length,
      completionRate: appTasks.length > 0 ? Math.round((completed / appTasks.length) * 100) : 0,
      recurring: appTasks.filter(t => !!t.recurrence).length,
      recentNames: appTasks.slice(0, 8).map(t => t.name)
    },
    defects: {
      total: scopedDefects.length,
      byStatus: defectByStatus,
      bySeverity: defectBySeverity,
      openCritical: scopedDefects.filter(d => d.status === 'open' && (d.severity === 'critical' || d.severity === 'blocker')).length,
      recentNames: scopedDefects.slice(0, 8).map(d => d.title)
    },
    github: {
      repositories: repositories.length,
      connected: connectedRepos,
      tasksWithBranch: githubTasks.filter(t => !!t.github?.branchName).length,
      tasksWithPr: appTasks.filter(t => !!t.github?.pullRequest?.prNumber).length,
      prOpen: prStates.filter(s => s === 'open').length,
      prMerged: prStates.filter(s => s === 'merged').length,
      prChangesRequested: prReviews.filter(s => s === 'changes_requested').length,
      issuesOpen: openIssues
    },
    team: {
      total: employees.length,
      workload
    },
    recentActivity
  };
}

/**
 * Build the Groq system+user prompt. The system prompt keeps the model on a
 * structured, honest report grounded in the snapshot; the user message embeds
 * the compact snapshot as JSON.
 */
export function buildReportPrompt(snapshot: ReportSnapshot): { system: string; user: string } {
  const system = [
    'You are the engineering lead for the "Simpli" product management platform.',
    'You are given a JSON snapshot of one application (or all apps) in Simpli: tasks, defects, goals, GitHub activity, and team workload.',
    'Write a concise but insightful progress report in plain Markdown (headings, bullet lists, short paragraphs).',
    'Cover, in this order:',
    '1. **Health overview** — is the app on track? completion rate, blocked items, open critical defects.',
    '2. **What is working** — cite specific strengths from the data (e.g. high completion, clean PR review states, low defect count).',
    '3. **What needs improvement / risks** — overdue or blocked work, changes-requested PRs, open critical defects, team overload.',
    '4. **Where we are right now** — status distribution, goal progress, GitHub lifecycle (branches, PRs, merges, issues).',
    '5. **Concrete recommendations** — 3-6 actionable, prioritized suggestions grounded ONLY in the snapshot.',
    'Rules:',
    '- Only reference numbers/items that actually appear in the snapshot. Never invent metrics.',
    '- If a section has no data (e.g. 0 defects), say so briefly instead of speculating.',
    '- Be direct and practical. No generic filler, no flattery, no corporate padding.',
    '- Keep it under ~600 words.'
  ].join('\n');

  const user = `Here is the current snapshot for "${snapshot.scope.appName}" (stage: ${snapshot.scope.stage || 'n/a'}, status: ${snapshot.scope.status || 'n/a'}):\n\n${JSON.stringify(snapshot, null, 2)}\n\nWrite the progress report now.`;

  return { system, user };
}