import { QaCycle, QaCycleResult, WorkKind } from '../app/types';
import { PermissionCheck } from './workflow';

/**
 * State transitions applied when a QA cycle is recorded:
 * - pass: defect/task moved forward (defect -> resolved/closed, task -> approved)
 * - fail: work bounced back to the assignee (in_progress) and reopens the count.
 */
export function getQaTransition(args: {
  kind: WorkKind;
  currentStatus: string;
  result: QaCycleResult;
  can: PermissionCheck;
}): { status?: string; fixVerified?: boolean; reopen?: boolean } | null {
  const { kind, currentStatus, result, can } = args;

  if (kind === 'defect') {
    if (result === 'fail') {
      return { status: 'in_progress', fixVerified: false, reopen: currentStatus === 'closed' };
    }
    const verifier = can('verify_defects') || can('manage_defects');
    if (currentStatus === 'pending_qa' || currentStatus === 'resolved') {
      return verifier ? { status: 'closed', fixVerified: true } : null;
    }
    return null;
  }

  if (kind === 'task') {
    if (result === 'fail') {
      return { status: 'in_progress', fixVerified: false };
    }
    const approve = can('approve_tasks') || can('manage_workflow');
    if (currentStatus === 'pending_qa') {
      return approve ? { status: 'approved' } : null;
    }
    return null;
  }

  return null;
}

export function nextQaCycleNumber(cycles: Pick<QaCycle, 'cycleNumber'>[], workKind: WorkKind, workId: string): number {
  const owned = cycles.filter(c => c.cycleNumber && c.cycleNumber > 0);
  const max = owned.reduce((acc, c) => Math.max(acc, c.cycleNumber), 0);
  return max + 1;
}