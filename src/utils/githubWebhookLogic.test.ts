import { describe, it, expect } from 'vitest';
import {
  resolveWebhookBranch,
  resolveWebhookEventId,
  mapPushCommits,
  mergeCommits,
  computeWorkUpdate,
  GithubSubDoc
} from './githubWebhookLogic';

describe('resolveWebhookBranch', () => {
  it('strips refs/heads/ prefix for push events', () => {
    expect(resolveWebhookBranch('push', { ref: 'refs/heads/feature/login' })).toBe('feature/login');
  });

  it('uses pull_request head ref for pr and review events', () => {
    const pr = { pull_request: { head: { ref: 'feature/login' } } };
    expect(resolveWebhookBranch('pull_request', pr)).toBe('feature/login');
    expect(resolveWebhookBranch('pull_request_review', pr)).toBe('feature/login');
  });

  it('uses check_run head_branch', () => {
    expect(resolveWebhookBranch('check_run', { check_run: { head_branch: 'feature/login' } })).toBe('feature/login');
  });

  it('returns empty for unknown or missing branch', () => {
    expect(resolveWebhookBranch('ping', {})).toBe('');
    expect(resolveWebhookBranch('push', { ref: 'refs/tags/v1.0' })).toBe('');
  });
});

describe('resolveWebhookEventId', () => {
  it('keys pushers on head sha', () => {
    expect(resolveWebhookEventId('push', { after: 'abc123' })).toBe('push:abc123');
  });

  it('uses review/check_run/pr ids for their events', () => {
    expect(resolveWebhookEventId('pull_request_review', { review: { id: 7 } })).toBe('review:7');
    expect(resolveWebhookEventId('check_run', { check_run: { id: 9 } })).toBe('check_run:9');
    expect(resolveWebhookEventId('pull_request', { pull_request: { id: 42 } })).toBe('pr:42');
    expect(resolveWebhookEventId('issues', { issue: { id: 12 } })).toBe('issue:12');
  });

  it('falls back to timestamp-based id for unrecognized events', () => {
    const id = resolveWebhookEventId('ping', {});
    expect(id.startsWith('ping:')).toBe(true);
  });
});

describe('mapPushCommits / mergeCommits', () => {
  it('maps payload commits to the GithubCommit shape', () => {
    const out = mapPushCommits([
      { id: 'a', message: 'first', author: { name: 'Alice' }, timestamp: '2026-01-01', url: 'http://x' },
      { id: 'b', message: 'second' }
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ sha: 'a', message: 'first', author: 'Alice', date: '2026-01-01', url: 'http://x' });
    expect(out[1].author).toBe('unknown');
  });

  it('merges with existing commits without duplicates by sha', () => {
    const incoming = [{ sha: 'a', message: 'x1', author: 'A', date: 'd' }];
    const existing = [{ sha: 'a', message: 'old', author: 'A', date: 'd0' }, { sha: 'b', message: 'y', author: 'A', date: 'd1' }];
    const merged = mergeCommits(existing as GithubSubDoc['commits'], incoming);
    expect(merged.map(c => c.sha)).toEqual(['a', 'b']);
  });

  it('handles empty existing', () => {
    expect(mergeCommits(undefined, [{ sha: 'z', message: 'm', author: 'A', date: 'd' }])).toHaveLength(1);
  });
});

describe('computeWorkUpdate', () => {
  it('sets commits + commits_pushed for a push', () => {
    const update = computeWorkUpdate('push', { commits: [{ id: 'a', message: 'm' }] }, {} as GithubSubDoc);
    expect(update['github.status']).toBe('commits_pushed');
    expect(update['github.commits'][0].sha).toBe('a');
  });

  it('appends unique reviewers and sets reviewState on review', () => {
    const base = { pullRequest: { reviewers: ['alice'] } } as GithubSubDoc;
    const update = computeWorkUpdate(
      'pull_request_review',
      { review: { state: 'approved', user: { login: 'bob' } } },
      base
    );
    expect(update['github.pullRequest'].reviewState).toBe('approved');
    expect(update['github.pullRequest'].reviewers).toEqual(['alice', 'bob']);
  });

  it('ignores non-state reviews and returns empty update', () => {
    const update = computeWorkUpdate('pull_request_review', { review: { state: 'dismissed' } }, {} as GithubSubDoc);
    expect(Object.keys(update)).toHaveLength(0);
  });

  it('maps open pr to pr_open, merged to merged, closed to closed', () => {
    const open = computeWorkUpdate('pull_request', {
      pull_request: { state: 'open', draft: false, number: 1, html_url: 'http://pr/1', title: 'T' }
    }, {} as GithubSubDoc);
    expect(open['github.status']).toBe('pr_open');
    expect(open['github.pullRequest'].prNumber).toBe(1);

    const draft = computeWorkUpdate('pull_request', {
      pull_request: { state: 'open', draft: true, number: 2, html_url: 'http://pr/2', title: 'T' }
    }, {} as GithubSubDoc);
    expect(Object.keys(draft)).toHaveLength(0);

    const merged = computeWorkUpdate('pull_request', {
      pull_request: { merged: true, number: 3, html_url: 'http://pr/3', title: 'T' }
    }, {} as GithubSubDoc);
    expect(merged['github.status']).toBe('merged');
    expect(merged['github.pullRequest'].state).toBe('merged');

    const closed = computeWorkUpdate('pull_request', {
      pull_request: { state: 'closed', merged: false, number: 4, html_url: 'http://pr/4', title: 'T' }
    }, {} as GithubSubDoc);
    expect(closed['github.status']).toBe('closed');
  });

  it('maps check_run conclusion to checkStatus and preserves existing pr data', () => {
    const base = { pullRequest: { prNumber: 7, reviewers: [] } } as GithubSubDoc;
    const ok = computeWorkUpdate('check_run', { check_run: { conclusion: 'success' } }, base);
    expect(ok['github.pullRequest'].checkStatus).toBe('success');
    expect(ok['github.pullRequest'].prNumber).toBe(7);

    const fail = computeWorkUpdate('check_run', { check_run: { conclusion: 'failure' } }, base);
    expect(fail['github.pullRequest'].checkStatus).toBe('failure');
  });

  it('returns empty update for unknown event type', () => {
    expect(computeWorkUpdate('ping', {}, {} as GithubSubDoc)).toEqual({});
  });

  it('syncs issues.event state onto a defect linked to that issue number', () => {
    const base = { issue: { issueNumber: 5, url: 'http://x/5', state: 'open', title: 'T' } } as GithubSubDoc;
    const closed = computeWorkUpdate('issues', {
      issue: { number: 5, state: 'closed', title: 'Fixed', html_url: 'http://x/5' }
    }, base);
    expect(closed['github.issue'].state).toBe('closed');
    expect(closed['github.status']).toBe('closed');

    const opened = computeWorkUpdate('issues', {
      issue: { number: 5, state: 'open', title: 'Fixed', html_url: 'http://x/5' }
    }, base);
    expect(opened['github.issue'].state).toBe('open');
    expect(opened['github.status']).toBe('pr_open');
  });

  it('ignores issues events for unrelated or unlinked work items', () => {
    const unlinked = computeWorkUpdate('issues', { issue: { number: 5, state: 'closed' } }, {} as GithubSubDoc);
    expect(Object.keys(unlinked)).toHaveLength(0);

    const otherIssue = computeWorkUpdate('issues', { issue: { number: 99, state: 'closed' } },
      { issue: { issueNumber: 5, url: 'http://x/5', state: 'open', title: 'T' } } as GithubSubDoc);
    expect(Object.keys(otherIssue)).toHaveLength(0);
  });
});