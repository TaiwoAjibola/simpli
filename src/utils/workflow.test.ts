import { describe, it, expect } from 'vitest';
import { getWorkTargetStates, canTransitionWork } from './workflow';

const canAll = () => true;
const canNone = () => false;
const can = (...perms: string[]) => (p: string) => perms.includes(p);

describe('getWorkTargetStates - task', () => {
  it('dev task cannot start without develop_work', () => {
    const targets = getWorkTargetStates({ kind: 'task', currentStatus: 'not_started', workType: 'development', can: canNone });
    expect(targets).toEqual([]);
  });

  it('dev task with develop_work can move not_started -> in_progress', () => {
    const targets = getWorkTargetStates({ kind: 'task', currentStatus: 'not_started', workType: 'development', can: can('develop_work') });
    expect(targets).toContain('in_progress');
  });

  it('ops (non-development) task requires assign_tasks', () => {
    const withDev = getWorkTargetStates({ kind: 'task', currentStatus: 'not_started', workType: 'non-development', can: can('develop_work') });
    expect(withDev).toEqual([]);
    const withManager = getWorkTargetStates({ kind: 'task', currentStatus: 'not_started', workType: 'non-development', can: can('assign_tasks') });
    expect(withManager).toContain('in_progress');
  });

  it('completed -> approved requires approve_tasks; -> in_progress requires work rights', () => {
    const asDev = getWorkTargetStates({ kind: 'task', currentStatus: 'completed', workType: 'development', can: can('develop_work') });
    expect(asDev).toContain('in_progress');
    expect(asDev).not.toContain('approved');
    const asApprover = getWorkTargetStates({ kind: 'task', currentStatus: 'completed', workType: 'development', can: can('approve_tasks') });
    expect(asApprover).toContain('approved');
  });

  it('run_qa or manage_workflow allows completed -> pending_qa', () => {
    const asQa = getWorkTargetStates({ kind: 'task', currentStatus: 'in_progress', workType: 'development', can: can('run_qa', 'develop_work') });
    expect(asQa).toContain('pending_qa');
  });

  it('pending_qa -> completed requires run_qa', () => {
    const dev = getWorkTargetStates({ kind: 'task', currentStatus: 'pending_qa', workType: 'development', can: can('develop_work') });
    expect(dev).not.toContain('completed');
    const qa = getWorkTargetStates({ kind: 'task', currentStatus: 'pending_qa', workType: 'development', can: can('run_qa') });
    expect(qa).toContain('completed');
  });

  it('approved is terminal', () => {
    expect(getWorkTargetStates({ kind: 'task', currentStatus: 'approved', workType: 'development', can: canAll })).toEqual([]);
  });
});

describe('getWorkTargetStates - defect', () => {
  it('open -> in_progress requires handle_defects', () => {
    expect(getWorkTargetStates({ kind: 'defect', currentStatus: 'open', workType: 'development', can: canNone })).toEqual([]);
    expect(getWorkTargetStates({ kind: 'defect', currentStatus: 'open', workType: 'development', can: can('handle_defects') })).toContain('in_progress');
  });

  it('pending_qa requires run_qa / verify_defects', () => {
    const handler = getWorkTargetStates({ kind: 'defect', currentStatus: 'pending_qa', workType: 'development', can: can('handle_defects') });
    expect(handler).not.toContain('resolved');
    const qa = getWorkTargetStates({ kind: 'defect', currentStatus: 'pending_qa', workType: 'development', can: can('run_qa') });
    expect(qa).toContain('resolved');
  });
});

describe('canTransitionWork', () => {
  it('same status always allowed', () => {
    expect(canTransitionWork({ kind: 'task', currentStatus: 'approved', nextStatus: 'approved', workType: 'development', can: canNone })).toBe(true);
  });

  it('dev task not_started -> in_progress with develop_work', () => {
    expect(canTransitionWork({ kind: 'task', currentStatus: 'not_started', nextStatus: 'in_progress', workType: 'development', can: can('develop_work') })).toBe(true);
    expect(canTransitionWork({ kind: 'task', currentStatus: 'not_started', nextStatus: 'in_progress', workType: 'development', can: canNone })).toBe(false);
  });

  it('transition to non-target status blocked', () => {
    expect(canTransitionWork({ kind: 'task', currentStatus: 'in_progress', nextStatus: 'approved', workType: 'development', can: canAll })).toBe(false);
  });

  it('defect closed by non-manager blocked', () => {
    expect(canTransitionWork({ kind: 'defect', currentStatus: 'resolved', nextStatus: 'closed', workType: 'development', can: can('run_qa') })).toBe(false);
    expect(canTransitionWork({ kind: 'defect', currentStatus: 'resolved', nextStatus: 'closed', workType: 'development', can: can('verify_defects') })).toBe(true);
  });
});