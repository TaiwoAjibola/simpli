import { TaskStatus, DefectStatus, DefectSeverity } from '../app/types';

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#6D28D9',
  medium: '#7C3AED',
  high: '#F97316',
  urgent: '#7C3AED'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: '#6D28D9',
  in_progress: '#7C3AED',
  blocked: '#7C3AED',
  pending_qa: '#F97316',
  completed: '#3B82F6',
  approved: '#A78BFA'
};

export const TASK_STATUS_BG: Record<TaskStatus, string> = {
  not_started: 'rgba(109, 40, 217, 0.1)',
  in_progress: 'rgba(124, 58, 237, 0.1)',
  blocked: 'rgba(220, 38, 38, 0.1)',
  pending_qa: 'rgba(249, 115, 22, 0.1)',
  completed: 'rgba(59, 130, 246, 0.1)',
  approved: 'rgba(16, 185, 129, 0.1)'
};

export const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  open: '#7C3AED',
  in_progress: '#F97316',
  pending_qa: '#7C3AED',
  resolved: '#3B82F6',
  closed: '#A78BFA',
  reopened: '#991B1B'
};

export const DEFECT_SEVERITY_COLORS: Record<DefectSeverity, string> = {
  blocker: '#991B1B',
  critical: '#7C3AED',
  major: '#F97316',
  minor: '#F59E0B'
};

export function priorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || '#6D28D9';
}
