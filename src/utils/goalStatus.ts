import { Goal, Task } from '../app/types';

export type DerivedGoalStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';

export function isGoalDone(status?: string): boolean {
  return status === 'approved' || status === 'completed';
}

export function isTaskDone(task: Task): boolean {
  return task.status === 'approved' || task.status === 'completed';
}

export function deriveGoalStatus(goal: Goal, tasks: Task[]): DerivedGoalStatus {
  if (goal.status === 'completed' || goal.status === 'on_hold') {
    return goal.status;
  }
  const goalTasks = tasks.filter(t => t.goalId === goal.id);
  if (goalTasks.length === 0) return 'pending';
  const done = goalTasks.filter(isTaskDone).length;
  if (done === goalTasks.length) return 'completed';
  if (done > 0) return 'in_progress';
  return 'pending';
}