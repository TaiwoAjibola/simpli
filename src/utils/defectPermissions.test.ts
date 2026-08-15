import { describe, it, expect } from 'vitest';
import { getAllowedDefectStatuses, canTransitionDefect } from './defectPermissions';
import { DefectStatus } from '../app/types';

function perms(own: string[]) {
  return (p: string) => own.includes(p);
}

describe('getAllowedDefectStatuses', () => {
  it('grants the full set to manage_defects holders', () => {
    const statuses = getAllowedDefectStatuses(perms(['manage_defects']));
    expect(statuses).toEqual(['open', 'in_progress', 'pending_qa', 'resolved', 'closed']);
  });

  it('grants a subset to handle_defects holders', () => {
    const statuses = getAllowedDefectStatuses(perms(['handle_defects']));
    expect(statuses).toEqual(['open', 'in_progress', 'pending_qa']);
  });

  it('grants nothing when no defect permission exists', () => {
    expect(getAllowedDefectStatuses(perms([]))).toEqual([]);
  });

  it('prefers manage_defects over handle_defects', () => {
    const statuses = getAllowedDefectStatuses(perms(['handle_defects', 'manage_defects']));
    expect(statuses).toEqual(['open', 'in_progress', 'pending_qa', 'resolved', 'closed']);
  });
});

describe('canTransitionDefect', () => {
  it('allows permitted statuses', () => {
    expect(canTransitionDefect('closed' as DefectStatus, perms(['manage_defects']))).toBe(true);
    expect(canTransitionDefect('closed' as DefectStatus, perms(['handle_defects']))).toBe(false);
    expect(canTransitionDefect('pending_qa' as DefectStatus, perms(['handle_defects']))).toBe(true);
  });

  it('never allows reopened via this helper', () => {
    expect(canTransitionDefect('reopened' as DefectStatus, perms(['manage_defects']))).toBe(false);
  });
});