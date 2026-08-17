import { describe, it, expect } from 'vitest';
import { filterTreeFiles, mapCompareFiles, summarizeReviews, summarizeChecks, parseGithubUrl } from './githubApiLogic';

describe('filterTreeFiles', () => {
  const tree = [
    { type: 'blob', path: 'src/index.ts', sha: 'a', size: 10 },
    { type: 'blob', path: 'package.json', sha: 'b', size: 20 },
    { type: 'tree', path: 'src', sha: 'c' },
    { type: 'blob', path: 'node_modules/x/index.js', sha: 'd', size: 30 },
    { type: 'blob', path: 'dist/main.js', sha: 'e', size: 40 },
    { type: 'blob', path: '.github/workflows/ci.yml', sha: 'f', size: 50 }
  ];

  it('keeps only blobs and drops node_modules/dist/.github', () => {
    const out = filterTreeFiles(tree);
    expect(out.map(f => f.path)).toEqual(['src/index.ts', 'package.json']);
  });

  it('returns only path/sha/size', () => {
    expect(filterTreeFiles(tree)[0]).toEqual({ path: 'src/index.ts', sha: 'a', size: 10 });
  });

  it('handles empty', () => {
    expect(filterTreeFiles([])).toEqual([]);
  });
});

describe('mapCompareFiles', () => {
  it('maps files with defaults for missing patch', () => {
    const out = mapCompareFiles([
      { filename: 'a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
      { filename: 'b.ts', status: 'added', additions: 5, deletions: 0, changes: 5, patch: '+++', raw_url: 'http://x' }
    ]);
    expect(out[0]).toEqual({ filename: 'a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3, patch: '', raw_url: undefined });
    expect(out[1].patch).toBe('+++');
  });

  it('handles empty', () => {
    expect(mapCompareFiles([])).toEqual([]);
  });
});

describe('summarizeReviews', () => {
  it('derives approved when any APPROVED and drops users without login', () => {
    const { reviewState, reviews } = summarizeReviews([
      { user: { login: 'alice' }, state: 'APPROVED', submitted_at: 't1', body: 'lgtm' },
      { user: {}, state: 'COMMENTED', submitted_at: 't2', body: 'x' }
    ]);
    expect(reviewState).toBe('approved');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual({ login: 'alice', state: 'APPROVED', submittedAt: 't1', body: 'lgtm' });
  });

  it('changes_requested wins over an earlier approval', () => {
    const { reviewState } = summarizeReviews([
      { user: { login: 'alice' }, state: 'APPROVED', submitted_at: 't1', body: '' },
      { user: { login: 'bob' }, state: 'CHANGES_REQUESTED', submitted_at: 't2', body: '' }
    ]);
    expect(reviewState).toBe('changes_requested');
  });

  it('pending without reviews', () => {
    const { reviewState, reviews } = summarizeReviews([]);
    expect(reviewState).toBe('pending');
    expect(reviews).toEqual([]);
  });
});

describe('summarizeChecks', () => {
  it('success when all check runs succeed', () => {
    const { checkStatus, checks } = summarizeChecks({
      check_runs: [
        { name: 'build', status: 'completed', conclusion: 'success', started_at: 'a', completed_at: 'b' },
        { name: 'test', status: 'completed', conclusion: 'success', started_at: 'a', completed_at: 'b' }
      ]
    });
    expect(checkStatus).toBe('success');
    expect(checks).toHaveLength(2);
    expect(checks[0].name).toBe('build');
  });

  it('failure when any conclusion fails or times out', () => {
    const { checkStatus } = summarizeChecks({
      check_runs: [
        { name: 'a', status: 'completed', conclusion: 'success' },
        { name: 'b', status: 'completed', conclusion: 'timed_out' }
      ]
    });
    expect(checkStatus).toBe('failure');
  });

  it('pending for in-flight checks or empty list', () => {
    expect(summarizeChecks({ check_runs: [{ name: 'a', status: 'in_progress', conclusion: null }] }).checkStatus).toBe('pending');
    expect(summarizeChecks(null).checkStatus).toBe('pending');
  });
});

describe('parseGithubUrl', () => {
  it('parses https URLs and strips .git / trailing slashes', () => {
    expect(parseGithubUrl('https://github.com/acme/webapp')).toEqual({
      owner: 'acme', name: 'webapp', url: 'https://github.com/acme/webapp'
    });
    expect(parseGithubUrl('https://github.com/acme/webapp.git/')).toEqual({
      owner: 'acme', name: 'webapp', url: 'https://github.com/acme/webapp'
    });
  });

  it('parses git@ SSH URLs', () => {
    expect(parseGithubUrl('git@github.com:acme/webapp.git')).toEqual({
      owner: 'acme', name: 'webapp', url: 'https://github.com/acme/webapp'
    });
  });

  it('parses bare owner/name', () => {
    expect(parseGithubUrl('acme/webapp')).toEqual({
      owner: 'acme', name: 'webapp', url: 'https://github.com/acme/webapp'
    });
  });

  it('returns null for invalid input', () => {
    expect(parseGithubUrl('')).toBeNull();
    expect(parseGithubUrl('not a github url')).toBeNull();
    expect(parseGithubUrl('acme')).toBeNull();
  });
});