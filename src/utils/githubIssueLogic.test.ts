import { describe, it, expect } from 'vitest';
import {
  buildIssueFromDefect,
  githubIssueStateForAction,
  mapIssueEvent
} from './githubIssueLogic';

describe('buildIssueFromDefect', () => {
  it('builds title with defect code prefix and common body', () => {
    const payload = buildIssueFromDefect({
      title: 'Login fails on Safari',
      description: 'Unable to authenticate.',
      defectCode: 'DEF-1234',
      module: 'Authentication',
      environment: 'production',
      severity: 'critical',
      priority: 'high',
      issueType: 'bug',
      stepsToReproduce: '1. Open Safari\n2. Log in',
      expectedResult: 'Session created',
      actualResult: '403 returned'
    });

    expect(payload.title).toBe('[DEF-1234] Login fails on Safari');
    expect(payload.labels).toContain('severity:critical');
    expect(payload.labels).toContain('bug');
    expect(payload.labels).toContain('high');
    expect(payload.body).toContain('Module: Authentication');
    expect(payload.body).toContain('Environment: production');
    expect(payload.body).toContain('Defect: DEF-1234');
    expect(payload.body).toContain('### Steps to reproduce');
  });

  it('omits empty sections and labels that are not mapped', () => {
    const payload = buildIssueFromDefect({ title: 'T' });
    expect(payload.title).toBe('T');
    expect(payload.labels).toEqual([]);
    expect(payload.body).toContain('Module: n/a');
    expect(payload.body).not.toContain('### Steps');
  });

  it('dedupes labels', () => {
    const payload = buildIssueFromDefect({ title: 'T', severity: 'major', priority: 'high' });
    const counts: Record<string, number> = {};
    payload.labels.forEach(l => (counts[l] = (counts[l] || 0) + 1));
    expect(Object.values(counts).every(c => c === 1)).toBe(true);
  });
});

describe('githubIssueStateForAction', () => {
  it('maps open/reopen/close and ignores neutral actions', () => {
    expect(githubIssueStateForAction('opened')).toBe('open');
    expect(githubIssueStateForAction('reopened')).toBe('open');
    expect(githubIssueStateForAction('closed')).toBe('closed');
    expect(githubIssueStateForAction('edited')).toBeNull();
    expect(githubIssueStateForAction('created')).toBeNull();
  });
});

describe('mapIssueEvent', () => {
  it('returns issue sub-doc plus status for a matching issue number', () => {
    const result = mapIssueEvent(
      { githubIssueNumber: 7, repositoryId: 'acme/app' },
      { action: 'closed', issue: { number: 7, state: 'closed', title: 'Boom', html_url: 'https://github.com/acme/app/issues/7' } }
    );
    expect(result).not.toBeNull();
    expect(result?.issue.issueNumber).toBe(7);
    expect(result?.issue.state).toBe('closed');
    expect(result?.status).toBe('closed');
  });

  it('links an incoming issue when no issue is stored yet', () => {
    const result = mapIssueEvent(
      undefined,
      { action: 'opened', issue: { number: 3, state: 'open', title: 'New', html_url: 'https://github.com/acme/app/issues/3' } }
    );
    expect(result?.issue.state).toBe('open');
    expect(result?.status).toBe('pr_open');
  });

  it('returns null for a different issue than the stored one', () => {
    expect(mapIssueEvent(
      { githubIssueNumber: 99 },
      { action: 'opened', issue: { number: 3, state: 'open' } }
    )).toBeNull();
  });

  it('returns null when no issue is present in the event', () => {
    expect(mapIssueEvent(undefined, { action: 'opened', issue: undefined })).toBeNull();
  });
});