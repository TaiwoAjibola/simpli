import { DefectStatus } from '../app/types';

export function getAllowedDefectStatuses(hasPermission: (p: string) => boolean): DefectStatus[] {
  if (hasPermission('manage_defects')) {
    return ['open', 'in_progress', 'pending_qa', 'resolved', 'closed'];
  }
  const allowed: DefectStatus[] = [];
  if (hasPermission('handle_defects') || hasPermission('develop_work')) {
    allowed.push('open', 'in_progress', 'pending_qa');
  }
  if (hasPermission('run_qa') || hasPermission('verify_defects')) {
    allowed.push('pending_qa', 'resolved');
  }
  if (hasPermission('verify_defects')) {
    allowed.push('closed');
  }
  return [...new Set(allowed)];
}

export function canTransitionDefect(
  status: DefectStatus,
  hasPermission: (p: string) => boolean
): boolean {
  return getAllowedDefectStatuses(hasPermission).includes(status);
}