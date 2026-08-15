import { describe, it, expect } from 'vitest';
import { nextOccurrence, isRecurring } from './recurrence';

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