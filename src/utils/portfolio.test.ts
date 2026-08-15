import { describe, it, expect } from 'vitest';
import { computeAppHealth } from './portfolio';
import { AppHealthInput } from './portfolio';

const base: AppHealthInput = { tasks: [], defects: [], blockedCount: 0 };

function task(partial?: any) {
  return { status: 'in_progress', workType: 'development', dueDate: undefined, createdAt: new Date(), ...partial };
}
function defect(partial?: any) {
  return { status: 'open', severity: 'minor', createdAt: new Date(), ...partial };
}

describe('computeAppHealth', () => {
  it('empty app is healthy', () => {
    const h = computeAppHealth(base);
    expect(h.level).toBe('healthy');
    expect(h.score).toBe(100);
  });

  it('open critical defects drag score down to critical', () => {
    const h = computeAppHealth({
      ...base,
      defects: [defect({ severity: 'blocker', status: 'open' }), defect({ severity: 'blocker', status: 'open' }), defect({ severity: 'critical', status: 'open' }), defect({ severity: 'blocker', status: 'open' })]
    });
    expect(h.level).toBe('critical');
    expect(h.criticalDefects).toBe(4);
  });

  it('overdue tasks reduce score', () => {
    const h = computeAppHealth({
      ...base,
      tasks: [task({ status: 'in_progress', dueDate: new Date(Date.now() - 86400000) })]
    });
    expect(h.overdueTasks).toBe(1);
    expect(h.score).toBeLessThan(100);
  });

  it('pending_qa counts toward qaPending', () => {
    const h = computeAppHealth({ ...base, defects: [defect({ status: 'pending_qa' })] });
    expect(h.qaPending).toBe(1);
  });

  it('blocked work reduces health', () => {
    const h = computeAppHealth({ ...base, blockedCount: 3 });
    expect(h.score).toBeLessThan(100);
    expect(h.blocked).toBe(3);
  });

  it('aging defects (7+ days) counted', () => {
    const h = computeAppHealth({
      ...base,
      defects: [defect({ status: 'open', createdAt: new Date(Date.now() - 8 * 86400000) })]
    });
    expect(h.agingDefects).toBe(1);
  });
});