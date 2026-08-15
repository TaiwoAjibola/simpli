import { describe, it, expect } from 'vitest';
import {
  defaultWorkType,
  taskWorkType,
  actionPointWorkType,
  defectWorkType,
  taskToWork,
  actionPointToWork,
  defectToWork,
  allWork,
  workForUser,
  isOpenWork
} from './work';
import { Task, ActionPoint, Defect, WorkType } from '../app/types';

function makeTask(partial: Partial<Task> = {}): Task {
  return {
    id: 't1',
    name: 'Task',
    description: '',
    assignedTo: [],
    status: 'not_started',
    priority: 'medium',
    createdAt: new Date(),
    ...partial
  };
}

function makeAp(partial: Partial<ActionPoint> = {}): ActionPoint {
  const now = new Date();
  return {
    id: 'ap1',
    title: 'AP',
    description: '',
    assignedTo: [],
    priority: 'medium',
    status: 'pending',
    weekStart: now,
    date: now,
    createdBy: 'u1',
    createdAt: now,
    ...partial
  };
}

function makeDefect(partial: Partial<Defect> = {}): Defect {
  const now = new Date();
  return {
    id: 'd1',
    defectCode: 'BUG-0001',
    title: 'Defect',
    description: '',
    applicationId: 'app1',
    module: '',
    environment: 'dev',
    reportedBy: 'u1',
    assignedTo: 'u1',
    dateReported: now,
    issueType: 'bug',
    severity: 'major',
    priority: 'medium',
    reproducibility: 'always',
    frequency: '100',
    status: 'open',
    fixVerified: false,
    reopenedCount: 0,
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    qaComments: '',
    developerNotes: '',
    activityLogs: [],
    createdAt: now,
    updatedAt: now,
    ...partial
  };
}

describe('work type defaults', () => {
  it('defaults task and action point to non-development', () => {
    expect(defaultWorkType('task')).toBe('non-development');
    expect(defaultWorkType('action_point')).toBe('non-development');
  });

  it('defaults defect to development', () => {
    expect(defaultWorkType('defect')).toBe('development');
  });

  it('reads explicit work type when present', () => {
    expect(taskWorkType(makeTask({ workType: 'development' }))).toBe('development');
    expect(taskWorkType(makeTask())).toBe('non-development');
    expect(actionPointWorkType(makeAp({ workType: 'development' }))).toBe('development');
    expect(defectWorkType(makeDefect({ workType: 'non-development' }))).toBe('non-development');
    expect(defectWorkType(makeDefect())).toBe('development');
  });
});

describe('entity -> work federation', () => {
  it('maps a task with fallback app/phase', () => {
    const w = taskToWork(makeTask({ id: 't1', followers: ['f1'] }), 'appX', 'phaseY');
    expect(w.id).toBe('t1');
    expect(w.workKind).toBe('task');
    expect(w.appId).toBe('appX');
    expect(w.phaseId).toBe('phaseY');
    expect(w.followers).toEqual(['f1']);
  });

  it('prefers denormalized appId over fallback', () => {
    const w = taskToWork(makeTask({ appId: 'appDirect' }), 'fallback');
    expect(w.appId).toBe('appDirect');
  });

  it('maps an action point', () => {
    const w = actionPointToWork(makeAp({ taskId: 't9' }), 'appA');
    expect(w.workKind).toBe('action_point');
    expect(w.appId).toBe('appA');
    expect((w.raw as ActionPoint).taskId).toBe('t9');
  });

  it('maps a defect using applicationId', () => {
    const w = defectToWork(makeDefect());
    expect(w.workKind).toBe('defect');
    expect(w.appId).toBe('app1');
    expect(w.code).toBe('BUG-0001');
    expect(w.workType).toBe('development');
  });
});

describe('work aggregation and filtering', () => {
  it('combines all three kinds and falls back to goal app/phase', () => {
    const items = allWork(
      [makeTask({ id: 't' })],
      [makeAp({ id: 'ap' })],
      [makeDefect({ id: 'd' })],
      () => 'appGoal',
      () => 'phaseGoal'
    );
    expect(items.map(i => i.workKind).sort()).toEqual(['action_point', 'defect', 'task']);
    expect(items.find(i => i.workKind === 'task')?.appId).toBe('appGoal');
    expect(items.find(i => i.workKind === 'task')?.phaseId).toBe('phaseGoal');
  });

  it('filters by assignee or follower', () => {
    const items = [
      taskToWork(makeTask({ id: 'a', assignedTo: ['u2'] })),
      taskToWork(makeTask({ id: 'b', assignedTo: ['u1'], followers: ['x'] })),
      taskToWork(makeTask({ id: 'c', followers: ['u1'] }))
    ];
    const mine = workForUser(items, 'u1').map(i => i.id);
    expect(mine).toEqual(['b', 'c']);
  });

  it('distinguishes open vs closed work', () => {
    expect(isOpenWork(taskToWork(makeTask({ status: 'in_progress' })))).toBe(true);
    expect(isOpenWork(taskToWork(makeTask({ status: 'approved' })))).toBe(false);
  });
});

describe('work type validation', () => {
  it('only exposes valid WorkType values', () => {
    const valid: WorkType[] = ['development', 'non-development'];
    expect(valid).toContain(taskWorkType(makeTask()));
    expect(valid).toContain(defectWorkType(makeDefect()));
  });
});