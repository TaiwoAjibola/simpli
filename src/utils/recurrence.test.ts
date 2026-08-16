import { describe, it, expect } from 'vitest';
import { nextOccurrence, isRecurring, nextOccurrencePayload } from './recurrence';

describe('nextOccurrence', () => {
  it('returns null when no recurrence', () => {
    expect(nextOccurrence({ recurrence: undefined, dueDate: undefined, completedAt: undefined })).toBeNull();
  });

  it('daily advances by interval', () => {
    const anchor = new Date('2026-01-01T00:00:00Z');
    const next = nextOccurrence({ recurrence: { frequency: 'daily', interval: 2 }, dueDate: anchor, completedAt: undefined })!;
    expect(next.getTime()).toBe(new Date('2026-01-03T00:00:00Z').getTime());
  });

  it('weekly advances by 7*interval', () => {
    const anchor = new Date('2026-01-01T00:00:00Z');
    const next = nextOccurrence({ recurrence: { frequency: 'weekly', interval: 1 }, dueDate: anchor, completedAt: undefined })!;
    expect(next.getTime()).toBe(new Date('2026-01-08T00:00:00Z').getTime());
  });

  it('monthly advances month', () => {
    const anchor = new Date('2026-01-15T00:00:00Z');
    const next = nextOccurrence({ recurrence: { frequency: 'monthly', interval: 1 }, dueDate: anchor, completedAt: undefined })!;
    expect(next.getTime()).toBe(new Date('2026-02-15T00:00:00Z').getTime());
  });

  it('stops when past endDate', () => {
    const anchor = new Date('2026-01-01T00:00:00Z');
    const next = nextOccurrence({
      recurrence: { frequency: 'weekly', interval: 1, endDate: new Date('2026-01-05T00:00:00Z') },
      dueDate: anchor,
      completedAt: undefined
    });
    expect(next).toBeNull();
  });

  it('uses completedAt as anchor when present', () => {
    const completed = new Date('2026-03-01T00:00:00Z');
    const next = nextOccurrence({
      recurrence: { frequency: 'daily', interval: 1 },
      dueDate: new Date('2026-01-01T00:00:00Z'),
      completedAt: completed
    })!;
    expect(next.getTime()).toBe(new Date('2026-03-02T00:00:00Z').getTime());
  });
});

describe('isRecurring', () => {
  it('detects recurring tasks', () => {
    expect(isRecurring({ recurrence: { frequency: 'weekly', interval: 1 } })).toBe(true);
    expect(isRecurring({ recurrence: undefined })).toBe(false);
  });
});

describe('nextOccurrencePayload', () => {
  const base = {
    id: 'task-1',
    goalId: 'goal-1',
    appId: 'app-1',
    name: 'Weekly standup notes',
    description: 'Capture notes',
    assignedTo: ['emp-1'],
    priority: 'medium' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'completed' as const,
    workType: 'non-development' as const,
    recurrence: { frequency: 'weekly' as const, interval: 1 }
  };

  it('returns null for non-recurring tasks', () => {
    const { recurrence, ...noRec } = base;
    expect(nextOccurrencePayload({ ...(noRec as any), recurrence: undefined }, new Date('2026-01-08T00:00:00Z'))).toBeNull();
  });

  it('clones with advanced due date and reset lifecycle fields', () => {
    const doneAt = new Date('2026-01-08T00:00:00Z');
    const result = nextOccurrencePayload(base as any, doneAt)!;
    expect(result).not.toBeNull();
    expect(result.dueDate.getTime()).toBe(new Date('2026-01-15T00:00:00Z').getTime());
    expect(result.payload.name).toBe('Weekly standup notes');
    expect(result.payload.assignedTo).toEqual(['emp-1']);
    expect(result.payload.origin).toEqual({ source: 'recurrence', parentTaskId: 'task-1' });
    expect((result.payload as any).completedAt).toBeUndefined();
    expect((result.payload as any).approvedAt).toBeUndefined();
    expect((result.payload as any).github).toBeUndefined();
  });

  it('chains lineage to the original parent on descendants', () => {
    const descendant = {
      ...base,
      id: 'task-2',
      origin: { source: 'recurrence', parentTaskId: 'task-1' },
      completedAt: new Date('2026-01-15T00:00:00Z')
    };
    const result = nextOccurrencePayload(descendant as any, new Date('2026-01-15T00:00:00Z'))!;
    expect(result.payload.origin).toEqual({ source: 'recurrence', parentTaskId: 'task-1' });
  });

  it('returns null when past endDate', () => {
    const withEnd = {
      ...base,
      recurrence: { frequency: 'weekly' as const, interval: 1, endDate: new Date('2026-01-10T00:00:00Z') }
    };
    expect(nextOccurrencePayload(withEnd as any, new Date('2026-01-08T00:00:00Z'))).toBeNull();
  });
});