export function filterTreeFiles(tree: any[]): any[] {
  return (tree || [])
    .filter(
      (t: any) =>
        t.type === 'blob' &&
        t.path &&
        !t.path.startsWith('node_modules/') &&
        !t.path.includes('/node_modules/') &&
        !t.path.startsWith('dist/') &&
        !t.path.startsWith('.git')
    )
    .map((t: any) => ({ path: t.path, sha: t.sha, size: t.size }));
}

export function mapCompareFiles(files: any[]): any[] {
  return (files || []).map((f: any) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch || '',
    raw_url: f.raw_url
  }));
}

export type ReviewSummary = {
  reviewState: 'changes_requested' | 'approved' | 'pending';
  reviews: { login: string; state: string; submittedAt: string; body: string }[];
};

export type CheckSummary = {
  checkStatus: 'failure' | 'success' | 'pending';
  checks: { name: string; status: string; conclusion: string; startedAt: string; completedAt: string }[];
};

export function summarizeReviews(reviews: any[]): ReviewSummary {
  const list = (reviews || [])
    .filter((r: any) => r.user?.login)
    .map((r: any) => ({ login: r.user.login, state: r.state, submittedAt: r.submitted_at, body: r.body || '' }));
  const approved = (reviews || []).some((r: any) => r.state === 'APPROVED');
  const changesRequested = (reviews || []).some((r: any) => r.state === 'CHANGES_REQUESTED');
  return {
    reviewState: changesRequested ? 'changes_requested' : approved ? 'approved' : 'pending',
    reviews: list
  };
}

export function summarizeChecks(checks: any): CheckSummary {
  const checkRuns = checks?.check_runs || [];
  const failure = checkRuns.some((c: any) => c.conclusion === 'failure' || c.conclusion === 'timed_out');
  const success = checkRuns.length > 0 && checkRuns.every((c: any) => c.conclusion === 'success');
  return {
    checkStatus: failure ? 'failure' : success ? 'success' : 'pending',
    checks: checkRuns.map((c: any) => ({
      name: c.name,
      status: c.status,
      conclusion: c.conclusion,
      startedAt: c.started_at,
      completedAt: c.completed_at
    }))
  };
}