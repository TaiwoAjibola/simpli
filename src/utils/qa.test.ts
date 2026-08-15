import { describe, it, expect } from 'vitest';
import { getQaTransition, nextQaCycleNumber } from './qa';

const permit = (...perms: string[]) => (p: string) => perms.includes(p);
const denyAll = () => false;

describe('getQaTransition', () => {
  it('passes defect to closed when verifier', () => {
    const t = getQaTransition({ kind: 'defect', currentStatus: 'pending_qa', result: 'pass', can: permit('verify_defects') });
    expect(t).toEqual({ status: 'closed', fixVerified: true });
  });

  it('fails defect back to in_progress', () => {
    const t = getQaTransition({ kind: 'defect', currentStatus: 'pending_qa', result: 'fail', can: permit('run_qa') });
    expect(t).toEqual({ status: 'in_progress', fixVerified: false, reopen: false });
  });

  it('reopens a closed defect on fail', () => {
    const t = getQaTransition({ kind: 'defect', currentStatus: 'closed', result: 'fail', can: permit('verify_defects') });
    expect(t).toEqual({ status: 'in_progress', fixVerified: false, reopen: true });
  });

  it('requires verifier permission to close pas defect', () => {
    const t = getQaTransition({ kind: 'defect', currentStatus: 'resolved', result: 'pass', can: denyAll });
    expect(t).toBeNull();
  });

  it('passes task from pending_qa to approved for approver', () => {
    const t = getQaTransition({ kind: 'task', currentStatus: 'pending_qa', result: 'pass', can: permit('approve_tasks') });
    expect(t).toEqual({ status: 'approved' });
  });

  it('fails task back to in_progress', () => {
    const t = getQaTransition({ kind: 'task', currentStatus: 'pending_qa', result: 'fail', can: permit('run_qa') });
    expect(t).toEqual({ status: 'in_progress', fixVerified: false });
  });

  it('does not approve task without approver permission', () => {
    const t = getQaTransition({ kind: 'task', currentStatus: 'pending_qa', result: 'pass', can: denyAll });
    expect(t).toBeNull();
  });
});

describe('nextQaCycleNumber', () => {
  it('assigns 1 when no prior cycles', () => {
    expect(nextQaCycleNumber([], 'defect', 'd1')).toBe(1);
  });
  it('increments from existing', () => {
    expect(nextQaCycleNumber([{ cycleNumber: 1 }, { cycleNumber: 3 } as any], 'task', 't1')).toBe(4);
  });
});