import { describe, it, expect } from 'vitest';
import { evaluateAutomation } from './automations';
import { Automation } from '../app/types';

function rule(partial: Partial<Automation>): Automation {
  return {
    id: 'rule-1',
    name: 'Test rule',
    enabled: true,
    trigger: { event: 'pr_opened', filter: { workKind: 'task' } },
    action: { setStatus: 'completed', notify: { role: 'reviewer' } },
    runHistory: [],
    createdAt: new Date(),
    ...partial
  } as Automation;
}

const event = { event: 'pr_opened', workKind: 'task', workId: 't1', workStatus: 'in_progress', workType: 'development' };

describe('evaluateAutomation', () => {
  it('applies when event + filters match', () => {
    const r = evaluateAutomation(rule({}), event, { event: '', workId: '', ruleId: '', timestamp: 0 });
    expect(r.applies).toBe(true);
  });

  it('skips disabled rules', () => {
    const r = evaluateAutomation(rule({ enabled: false }), event, { event: '', workId: '', ruleId: '', timestamp: 0 });
    expect(r).toEqual({ applies: false, reason: 'rule disabled' });
  });

  it('skips event mismatch', () => {
    const r = evaluateAutomation(rule({}), { ...event, event: 'review_approved' }, { event: '', workId: '', ruleId: '', timestamp: 0 });
    expect(r.applies).toBe(false);
  });

  it('filters by workKind', () => {
    const r = evaluateAutomation(
      rule({}),
      { ...event, workKind: 'defect' },
      { event: '', workId: '', ruleId: '', timestamp: 0 }
    );
    expect(r.applies).toBe(false);
  });

  it('filters by status', () => {
    const r = evaluateAutomation(
      rule({ trigger: { event: 'pr_opened', filter: { status: 'pending_qa' } } }),
      event,
      { event: '', workId: '', ruleId: '', timestamp: 0 }
    );
    expect(r.applies).toBe(false);
  });

  it('filters by workType', () => {
    const r = evaluateAutomation(
      rule({ trigger: { event: 'pr_opened', filter: { workType: 'non-development' } } }),
      event,
      { event: '', workId: '', ruleId: '', timestamp: 0 }
    );
    expect(r.applies).toBe(false);
  });

  it('dedupes duplicate triggers within window', () => {
    const seen = { event: 'pr_opened', workId: 't1', ruleId: 'rule-1', timestamp: Date.now() - 5000 };
    const second = evaluateAutomation(rule({}), event, seen);
    expect(second).toEqual({ applies: false, reason: 'duplicate trigger (dedupe window)' });
  });

  it('allows after dedupe window elapses', () => {
    const seen = { event: 'pr_opened', workId: 't1', ruleId: 'rule-1', timestamp: Date.now() - 60000 };
    const r = evaluateAutomation(rule({}), event, seen);
    expect(r.applies).toBe(true);
  });

  it('no filter matches everything for event', () => {
    const r = evaluateAutomation(
      rule({ trigger: { event: 'defect_created' } }),
      { event: 'defect_created', workKind: 'defect', workId: 'd1', workStatus: 'open', workType: 'development' },
      { event: '', workId: '', ruleId: '', timestamp: 0 }
    );
    expect(r.applies).toBe(true);
  });
});