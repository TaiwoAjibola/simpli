export type GithubSubDoc = {
  repositoryId?: string;
  branchName?: string;
  branchUrl?: string;
  commits?: GithubCommit[];
  pullRequest?: GithubPullRequest;
  issue?: {
    issueNumber: number;
    url: string;
    state: string;
    title: string;
    updatedAt?: string;
  };
  status: string;
};

export type GithubCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
};

export type GithubPullRequest = {
  prNumber: number;
  url: string;
  state: 'open' | 'closed' | 'merged';
  title: string;
  reviewers: string[];
  reviewState?: 'approved' | 'changes_requested' | 'pending';
  checkStatus?: 'pending' | 'success' | 'failure';
};

export function resolveWebhookBranch(eventType: string, event: any): string {
  if (eventType === 'push') {
    const ref = event?.ref || '';
    return ref.startsWith('refs/heads/') ? ref.replace(/^refs\/heads\//, '') : '';
  }
  if (eventType === 'pull_request' || eventType === 'pull_request_review') {
    return event?.pull_request?.head?.ref || '';
  }
  if (eventType === 'check_run') return event?.check_run?.head_branch || '';
  return '';
}

export function resolveWebhookEventId(eventType: string, event: any): string {
  if (eventType === 'push') return `push:${event?.after}`;
  if (eventType === 'pull_request_review') return `review:${event?.review?.id}`;
  if (eventType === 'pull_request') return `pr:${event?.pull_request?.id}`;
  if (eventType === 'check_run') return `check_run:${event?.check_run?.id}`;
  if (eventType === 'issues') return `issue:${event?.issue?.id}`;
  return `${eventType}:${Date.now()}`;
}

export function mapPushCommits(commits: any[]): GithubCommit[] {
  return (commits || []).map(c => ({
    sha: c.id,
    message: c.message,
    author: c.author?.name || c.committer?.name || 'unknown',
    date: c.timestamp,
    url: c.url
  }));
}

export function mergeCommits(existing: GithubCommit[] | undefined, incoming: GithubCommit[]): GithubCommit[] {
  const merged = [...(incoming || [])];
  for (const c of existing || []) {
    if (!merged.some(m => m.sha === c.sha)) merged.push(c);
  }
  return merged;
}

export function computeWorkUpdate(eventType: string, event: any, existing: GithubSubDoc | undefined): any {
  const g: GithubSubDoc = existing || { status: 'not_started' };
  const update: any = {};

  if (eventType === 'push') {
    const incoming = mapPushCommits(event?.commits);
    update['github.commits'] = mergeCommits(g.commits, incoming);
    update['github.status'] = 'commits_pushed';
  } else if (eventType === 'pull_request_review') {
    const state = event?.review?.state;
    if (state === 'approved' || state === 'changes_requested' || state === 'commented') {
      const reviewState = state === 'approved' ? 'approved' : state === 'changes_requested' ? 'changes_requested' : 'pending';
      const reviewers = new Set<string>([...(g.pullRequest?.reviewers || []), event?.review?.user?.login].filter(Boolean));
      update['github.pullRequest'] = {
        ...(g.pullRequest || {}),
        reviewState,
        reviewers: [...reviewers]
      };
    }
  } else if (eventType === 'pull_request') {
    const pr = event?.pull_request;
    if (pr?.state === 'open' && pr?.draft === false) {
      update['github.pullRequest'] = { prNumber: pr.number, url: pr.html_url, state: 'open', title: pr.title };
      update['github.status'] = 'pr_open';
    } else if (pr?.merged) {
      update['github.pullRequest'] = { prNumber: pr.number, url: pr.html_url, state: 'merged', title: pr.title };
      update['github.status'] = 'merged';
    } else if (pr?.state === 'closed') {
      update['github.status'] = 'closed';
    }
  } else if (eventType === 'check_run') {
    const conclusion = event?.check_run?.conclusion;
    update['github.pullRequest'] = {
      ...(g.pullRequest || {}),
      checkStatus: conclusion === 'success' ? 'success' : 'failure'
    };
  } else if (eventType === 'issues') {
    const existingIssue = g.issue;
    const number = event?.issue?.number;
    if (number != null && existingIssue?.issueNumber === number) {
      const isClosed = event?.issue?.state === 'closed';
      update['github.issue'] = {
        issueNumber: number,
        url: event.issue.html_url || existingIssue.url || '',
        state: isClosed ? 'closed' : 'open',
        title: event.issue.title || existingIssue.title,
        updatedAt: new Date().toISOString()
      };
      update['github.status'] = isClosed ? 'closed' : 'pr_open';
    }
  }

  return update;
}