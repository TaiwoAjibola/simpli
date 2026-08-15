import { Automation, AutomationTriggerEvent } from '../app/types';

export type AutomationEvent = {
  event: AutomationTriggerEvent;
  workKind: string;
  workId: string;
  workStatus: string;
  workType?: string;
};

/**
 * Pure automation engine: given an event and a rule, decide whether it
 * applies and what side effects to run. Side-effect execution is handled
 * by the caller (AppContext) using guarded, idempotent apply(). Kept pure
 * so logic is unit-testable and safety dedupe lives in one place.
 */
export function evaluateAutomation(
  rule: Automation,
  event: AutomationEvent,
  seen: { event: string; workId: string; ruleId: string; timestamp: number }
): { applies: boolean; reason?: string } {
  if (!rule.enabled) return { applies: false, reason: 'rule disabled' };

  if (rule.trigger.event !== event.event) {
    return { applies: false, reason: 'event mismatch' };
  }

  const f = rule.trigger.filter;
  if (f) {
    if (f.workKind && f.workKind !== event.workKind) {
      return { applies: false, reason: 'workKind filter mismatch' };
    }
    if (f.workType && (!event.workType || f.workType !== event.workType)) {
      return { applies: false, reason: 'workType filter mismatch' };
    }
    if (f.status && f.status !== event.workStatus) {
      return { applies: false, reason: 'status filter mismatch' };
    }
  }

  // Dedupe: same (event, workId, ruleId) must not fire again within 30s.
  if (
    seen &&
    seen.event === event.event &&
    seen.workId === event.workId &&
    seen.ruleId === rule.id
  ) {
    const elapsed = Date.now() - seen.timestamp;
    if (elapsed < 30000) {
      return { applies: false, reason: 'duplicate trigger (dedupe window)' };
    }
  }

  return { applies: true };
}

export function nextRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}