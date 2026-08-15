import { describe, it, expect } from 'vitest';
import { deriveGoalStatus, isGoalDone, isTaskDone } from './goalStatus';
import { Goal, Task } from '../app/types';

function makeGoal(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    appId: 'app1',
    name: 'Goal',
    description: '',
    createdAt: new Date(),
    ...partial
  };
}

function makeTask(partial: Partial<Task> = {}): Task {
  return {
    id: 't1',
    goalId: 'g1',
    name: 'Task',
    description: '',
    assignedTo: [],
    status: 'not_started',
    priority: 'medium',
    createdAt: new Date(),
    ...partial
  };
}

describe('isGoalDone / isTaskDone', () => {
  it('recognizes approved and completed as done', () => {
    expect(isGoalDone('approved')).toBe(true);
    expect(isGoalDone('completed')).toBe(true);
    expect(isGoalDone('in_progress')).toBe(false);
    expect(isTaskDone(makeTask({ status: 'approved' }))).toBe(true);
    expect(isTaskDone(makeTask({ status: 'in_progress' }))).toBe(false);
  });
});

describe('deriveGoalStatus', () => {
  it('returns pending when goal has no tasks', () => {
    expect(deriveGoalStatus(makeGoal(), [])).toBe('pending');
  });

  it('returns pending when no tasks are done', () => {
    const tasks = [makeTask({ status: 'not_started' }), makeTask({ id: 't2', status: 'blocked' })];
    expect(deriveGoalStatus(makeGoal(), tasks)).toBe('pending');
  });

  it('returns in_progress when some tasks are done', () => {
    const tasks = [makeTask({ status: 'approved' }), makeTask({ id: 't2', status: 'in_progress' })];
    expect(deriveGoalStatus(makeGoal(), tasks)).toBe('in_progress');
  });

  it('returns completed when all tasks are done', () => {
    const tasks = [makeTask({ status: 'approved' }), makeTask({ id: 't2', status: 'completed' })];
    expect(deriveGoalStatus(makeGoal(), tasks)).toBe('completed');
  });

  it('respects an explicit completed/on_hold status', () => {
    expect(deriveGoalStatus(makeGoal({ status: 'completed' }), [])).toBe('completed');
    expect(deriveGoalStatus(makeGoal({ status: 'on_hold' }), [])).toBe('on_hold');
  });

  it('only counts tasks belonging to the goal', () => {
    const tasks = [makeTask({ goalId: 'other', status: 'approved' })];
    expect(deriveGoalStatus(makeGoal(), tasks)).toBe('pending');
  });
});