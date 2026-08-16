import { describe, it, expect } from 'vitest';
import { buildReportSnapshot, buildReportPrompt } from './reportLogic';

const baseInput = {
  apps: [{ id: 'a1', name: 'BuyOps', currentStage: 'development', status: 'active' }],
  goals: [
    { id: 'g1', name: 'Launch', appId: 'a1', status: 'active' },
    { id: 'g2', name: 'Done Goal', appId: 'a1', status: 'completed' }
  ],
  tasks: [],
  defects: [],
  repositories: [],
  employees: [],
  activities: [],
  selectedAppId: 'a1',
  now: new Date('2026-01-10T00:00:00Z').getTime()
};

describe('buildReportSnapshot', () => {
  it('aggregates task status, work type, and priority for the selected app', () => {
    const tasks: any[] = [
      { id: 't1', name: 'Auth', goalId: 'g1', status: 'in_progress', priority: 'high', workType: 'development', dueDate: new Date('2026-01-05T00:00:00Z') },
      { id: 't2', name: 'Docs', goalId: 'g1', status: 'completed', priority: 'low', workType: 'non-development' },
      { id: 't3', name: 'Payments', goalId: 'g1', status: 'blocked', priority: 'urgent', workType: 'development', recurrence: { frequency: 'weekly', interval: 1 } }
    ];
    const snap = buildReportSnapshot({ ...baseInput, tasks });

    expect(snap.scope.appName).toBe('BuyOps');
    expect(snap.tasks.total).toBe(3);
    expect(snap.tasks.byStatus).toEqual({ in_progress: 1, completed: 1, blocked: 1 });
    expect(snap.tasks.byWorkType).toEqual({ development: 2, nonDevelopment: 1 });
    expect(snap.tasks.byPriority).toEqual({ high: 1, low: 1, urgent: 1 });
    expect(snap.tasks.completionRate).toBe(33);
    expect(snap.tasks.overdue).toBe(1); // t1 due 5 Jan, now 10 Jan, not completed
    expect(snap.tasks.recurring).toBe(1);
  });

  it('scopes tasks by goal->app linkage and defects by applicationId', () => {
    const tasks: any[] = [
      { id: 't1', name: 'In App', goalId: 'g1', status: 'not_started' },
      { id: 't2', name: 'Other App', goalId: 'gX', status: 'not_started' }
    ];
    const defects: any[] = [
      { id: 'd1', title: 'Crash', applicationId: 'a1', status: 'open', severity: 'critical' },
      { id: 'd2', title: 'Elsewhere', applicationId: 'aX', status: 'closed', severity: 'minor' }
    ];
    const snap = buildReportSnapshot({ ...baseInput, tasks, defects });
    expect(snap.tasks.total).toBe(1);
    expect(snap.defects.total).toBe(1);
    expect(snap.defects.openCritical).toBe(1);
    expect(snap.defects.bySeverity).toEqual({ critical: 1 });
  });

  it('handles all-apps scope and github lifecycle stats', () => {
    const tasks: any[] = [
      { id: 't1', name: 'A', goalId: 'g1', status: 'in_progress', github: { repositoryId: 'o/r', branchName: 'feat/a', pullRequest: { prNumber: 5, state: 'open', reviewState: 'changes_requested' } } },
      { id: 't2', name: 'B', goalId: 'g1', status: 'completed', github: { repositoryId: 'o/r', pullRequest: { prNumber: 6, state: 'merged' } } },
      { id: 't3', name: 'C', goalId: 'gX', status: 'open' }
    ];
    const snap = buildReportSnapshot({
      ...baseInput,
      selectedAppId: 'all',
      tasks,
      repositories: [{ connectionStatus: 'connected' }, { connectionStatus: 'not_connected' }]
    });
    expect(snap.scope.appName).toBe('All Applications');
    expect(snap.github.repositories).toBe(2);
    expect(snap.github.connected).toBe(1);
    expect(snap.github.tasksWithBranch).toBe(1);
    expect(snap.github.tasksWithPr).toBe(2);
    expect(snap.github.prOpen).toBe(1);
    expect(snap.github.prMerged).toBe(1);
    expect(snap.github.prChangesRequested).toBe(1);
  });

  it('computes team workload from assignments', () => {
    const employees: any[] = [{ id: 'e1', name: 'Ada' }, { id: 'e2', name: 'Bob' }];
    const tasks: any[] = [
      { id: 't1', name: 'A', goalId: 'g1', status: 'in_progress', assignedTo: ['e1'] },
      { id: 't2', name: 'B', goalId: 'g1', status: 'completed', assignedTo: ['e1'] },
      { id: 't3', name: 'C', goalId: 'g1', status: 'blocked', assignedTo: ['e1'] }
    ];
    const snap = buildReportSnapshot({ ...baseInput, tasks, employees });
    expect(snap.team.workload).toEqual([{ name: 'Ada', assigned: 3, completed: 1, inProgress: 1, blocked: 1 }]);
  });

  it('records recent activity timestamps', () => {
    const activities: any[] = [
      { id: 'x', userName: 'Ada', description: 'approved task', timestamp: new Date('2026-01-09T00:00:00Z') }
    ];
    const snap = buildReportSnapshot({ ...baseInput, activities });
    expect(snap.recentActivity[0].userName).toBe('Ada');
    expect(snap.recentActivity[0].timestamp).toContain('2026-01-09');
  });

  it('returns zeros for an app with no data', () => {
    const snap = buildReportSnapshot(baseInput);
    expect(snap.tasks.total).toBe(0);
    expect(snap.defects.total).toBe(0);
    expect(snap.github.repositories).toBe(0);
    expect(snap.goals.total).toBe(2);
    expect(snap.goals.completed).toBe(1);
  });
});

describe('buildReportPrompt', () => {
  it('produces a system prompt that demands grounding and a user message with the snapshot JSON', () => {
    const snap = buildReportSnapshot(baseInput);
    const { system, user } = buildReportPrompt(snap);
    expect(system).toContain('Health overview');
    expect(system).toContain('Never invent metrics');
    expect(user).toContain('BuyOps');
    expect(user).toContain('"tasks"');
  });
});