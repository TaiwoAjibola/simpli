import { describe, it, expect } from 'vitest';
import {
  currentMonthKey,
  monthKey,
  monthLabel,
  monthRange,
  defaultPlanName,
  planProgress,
  sortPlans
} from './plans';
import { MonthlyPlan, Goal, Task } from '../app/types';

function plan(overrides: Partial<MonthlyPlan> = {}): MonthlyPlan {
  return {
    id: 'plan-1',
    name: 'September 2026 Plan',
    month: '2026-09',
    status: 'active',
    createdBy: 'u1',
    createdAt: new Date('2026-09-01'),
    ...overrides
  } as MonthlyPlan;
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    appId: 'app-1',
    name: 'Goal',
    description: '',
    createdAt: new Date(),
    ...overrides
  } as Goal;
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    name: 'Task',
    description: '',
    assignedTo: [],
    status: 'not_started',
    priority: 'medium',
    createdAt: new Date(),
    ...overrides
  } as Task;
}

describe('month helpers', () => {
  it('currentMonthKey formats local month', () => {
    expect(currentMonthKey(new Date(2026, 8, 15))).toBe('2026-09');
    expect(currentMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
  });

  it('monthKey matches currentMonthKey', () => {
    const d = new Date(2026, 11, 31);
    expect(monthKey(d)).toBe('2026-12');
  });

  it('monthLabel renders human month', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
    expect(monthLabel('2026-01')).toBe('January 2026');
    expect(monthLabel('garbage')).toBe('garbage');
    expect(monthLabel('2026-13')).toBe('2026-13');
  });

  it('monthRange returns first/last local day', () => {
    const r = monthRange('2026-02')!;
    expect(r.start.getDate()).toBe(1);
    expect(r.start.getMonth()).toBe(1);
    expect(r.end.getDate()).toBe(28);
    expect(monthRange('2024-02')!.end.getDate()).toBe(29);
    expect(monthRange('bad')).toBeNull();
  });

  it('defaultPlanName derives from month', () => {
    expect(defaultPlanName('2026-09')).toBe('September 2026 Plan');
    expect(defaultPlanName('')).toBe('Monthly Plan');
  });
});

describe('planProgress', () => {
  it('counts tasks attached directly and via goals', () => {
    const p = plan();
    const goals = [goal({ id: 'g1', planId: p.id, status: 'completed' }), goal({ id: 'g2', planId: p.id })];
    const tasks = [
      task({ id: 't1', planId: p.id, status: 'approved' }),
      task({ id: 't2', goalId: 'g1', status: 'completed' }),
      task({ id: 't3', goalId: 'g2', status: 'in_progress' }),
      task({ id: 't4', goalId: 'other', status: 'approved' })
    ];
    const prog = planProgress(p, goals, tasks);
    expect(prog.goalsTotal).toBe(2);
    expect(prog.goalsCompleted).toBe(1);
    expect(prog.tasksTotal).toBe(3);
    expect(prog.tasksDone).toBe(2);
    expect(prog.percent).toBe(67);
  });

  it('falls back to goal-based percent when no tasks', () => {
    const p = plan();
    const goals = [goal({ id: 'g1', planId: p.id, status: 'completed' }), goal({ id: 'g2', planId: p.id })];
    const prog = planProgress(p, goals, []);
    expect(prog.percent).toBe(50);
  });

  it('empty plan is 0%', () => {
    expect(planProgress(plan(), [], []).percent).toBe(0);
  });
});

describe('sortPlans', () => {
  it('sorts by month desc, then status rank', () => {
    const a = plan({ id: 'a', month: '2026-08', status: 'active' });
    const b = plan({ id: 'b', month: '2026-09', status: 'completed' });
    const c = plan({ id: 'c', month: '2026-09', status: 'active' });
    const sorted = sortPlans([a, b, c]);
    expect(sorted.map(p => p.id)).toEqual(['c', 'b', 'a']);
  });
});
