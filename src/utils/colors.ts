import { TaskStatus, DefectStatus, DefectSeverity } from '../app/types';

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#787774',
  medium: '#2383E2',
  high: '#EB5757',
  urgent: '#EB5757'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: '#787774',
  in_progress: '#2383E2',
  blocked: '#EB5757',
  pending_qa: '#787774',
  completed: '#2383E2',
  approved: '#0F7B6C'
};

export const TASK_STATUS_BG: Record<TaskStatus, string> = {
  not_started: 'rgba(120, 119, 116, 0.08)',
  in_progress: 'rgba(35, 131, 226, 0.08)',
  blocked: 'rgba(235, 87, 87, 0.08)',
  pending_qa: 'rgba(120, 119, 116, 0.08)',
  completed: 'rgba(35, 131, 226, 0.08)',
  approved: 'rgba(15, 123, 108, 0.08)'
};

export const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  open: '#EB5757',
  in_progress: '#2383E2',
  pending_qa: '#787774',
  resolved: '#2383E2',
  closed: '#787774',
  reopened: '#EB5757'
};

export const DEFECT_SEVERITY_COLORS: Record<DefectSeverity, string> = {
  blocker: '#EB5757',
  critical: '#EB5757',
  major: '#787774',
  minor: '#9B9A97'
};

export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || '#787774';
}
