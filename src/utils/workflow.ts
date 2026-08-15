import { TaskStatus, DefectStatus, ActionPointStatus } from '../app/types';
import { WorkType } from '../app/types';

export type PermissionCheck = (permission: string) => boolean;

export type WorkKind = 'task' | 'defect' | 'action_point';

const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed', 'approved'];

const DEFECT_STATUSES: DefectStatus[] = ['open', 'in_progress', 'pending_qa', 'resolved', 'closed'];

const AP_STATUSES: ActionPointStatus[] = ['pending', 'carried_over', 'completed'];

export function getWorkStatuses(kind: WorkKind): string[] {
  if (kind === 'task') return TASK_STATUSES as string[];
  if (kind === 'defect') return DEFECT_STATUSES as string[];
  return AP_STATUSES as string[];
}

/**
 * Allowed next statuses given current status + work type + permissions.
 * Pure engine — UI (kanban, modals) and AppContext writers both call this so
 * permission rules are enforced in one place.
 */
export function getWorkTargetStates(args: {
  kind: 'task';
  currentStatus: TaskStatus;
  workType: WorkType;
  can: PermissionCheck;
}): TaskStatus[];
export function getWorkTargetStates(args: {
  kind: 'defect';
  currentStatus: DefectStatus;
  workType: WorkType;
  can: PermissionCheck;
}): DefectStatus[];
export function getWorkTargetStates(args: {
  kind: 'action_point';
  currentStatus: ActionPointStatus;
  workType: WorkType;
  can: PermissionCheck;
}): ActionPointStatus[];
export function getWorkTargetStates(args: any): any[] {
  const { kind, currentStatus, workType, can } = args;

  if (kind === 'task') {
    const isDev = workType === 'development';
    const isOps = workType === 'non-development';
    const manager = can('assign_tasks');
    const developer = can('develop_work');
    const approve = can('approve_tasks');
    const qa = can('run_qa');

    const canDoWork = (isDev && (developer || manager)) || (isOps && manager);

    switch (currentStatus) {
      case 'not_started':
        return canDoWork ? ['in_progress'] : [];
      case 'in_progress':
        return [
          ...(canDoWork ? ['blocked', 'completed'] : []),
          ...(qa || manageAllTasks(can) ? ['pending_qa'] : [])
        ];
      case 'pending_qa':
        return [
          ...(canDoWork ? ['in_progress'] : []),
          ...(qa || manageAllTasks(can) ? ['completed'] : [])
        ];
      case 'blocked':
        return canDoWork ? ['in_progress', 'completed'] : [];
      case 'completed':
        return [
          ...(canDoWork ? ['in_progress'] : []),
          ...(approve ? ['approved'] : [])
        ];
      case 'approved':
        return [];
      default:
        return [];
    }
  }

  if (kind === 'defect') {
    const manager = can('manage_defects');
    const handler = can('handle_defects') || manager;
    const qa = can('run_qa');
    const verifier = can('verify_defects') || manager;

    switch (currentStatus) {
      case 'open':
        return handler ? ['in_progress'] : [];
      case 'in_progress':
        return handler ? ['pending_qa', 'resolved'] : [];
      case 'pending_qa':
        return qa || verifier ? ['resolved', 'open'] : [];
      case 'resolved':
        return verifier ? ['closed', 'in_progress'] : [];
      case 'closed':
        return manager ? [] : [];
      default:
        return [];
    }
  }

  if (kind === 'action_point') {
    return currentStatus === 'pending' || currentStatus === 'carried_over'
      ? ['completed' as any, 'carried_over' as any]
      : currentStatus === 'completed'
      ? ['pending' as any]
      : [];
  }

  return [];
}

function manageAllTasks(can: PermissionCheck): boolean {
  return can('manage_workflow');
}

export function canTransitionWork(args: {
  kind: 'task';
  currentStatus: TaskStatus;
  nextStatus: TaskStatus;
  workType: WorkType;
  can: PermissionCheck;
}): boolean;
export function canTransitionWork(args: {
  kind: 'defect';
  currentStatus: DefectStatus;
  nextStatus: DefectStatus;
  workType: WorkType;
  can: PermissionCheck;
}): boolean;
export function canTransitionWork(args: {
  kind: 'action_point';
  currentStatus: ActionPointStatus;
  nextStatus: ActionPointStatus;
  workType: WorkType;
  can: PermissionCheck;
}): boolean;
export function canTransitionWork(args: any): boolean {
  const { kind, currentStatus, nextStatus, workType, can } = args;
  if (currentStatus === nextStatus) return true;
  const targets = getWorkTargetStates({ kind, currentStatus, workType, can });
  return targets.includes(nextStatus);
}

export function isOpenTaskStatus(status: TaskStatus): boolean {
  return status !== 'approved';
}