// Pure logic for the Defect <-> GitHub issue sync. Kept free of firestore/github
// imports so it can be unit tested (see githubIssueLogic.test.ts). The route
// (api/github/issues.ts) and webhook (api/github/webhook.ts) call into these.

export type GithubIssuePayload = {
  title: string;
  body?: string;
  labels?: string[];
};

export type IssueSyncEvent = {
  issueNumber?: number;
  state?: 'open' | 'closed';
  title?: string;
  url?: string;
};

export type IssueTransition =
  | 'open'
  | 'closed'
  | 'reopened'
  | 'created'
  | 'edited';

const LABEL_SEVERITY: Record<string, string> = {
  blocker: 'severity:blocker',
  critical: 'severity:critical',
  major: 'severity:major',
  minor: 'severity:minor'
};

const LABEL_TYPE: Record<string, string> = {
  bug: 'bug',
  ui_issue: 'ui',
  performance: 'performance',
  security: 'security',
  crash: 'crash',
  enhancement: 'enhancement'
};

/** Build the create-issue payload from the fields found on a Defect. */
export function buildIssueFromDefect(input: {
  title: string;
  description?: string;
  defectCode?: string;
  module?: string;
  environment?: string;
  severity?: string;
  priority?: string;
  issueType?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
}): GithubIssuePayload {
  const labels: string[] = [];
  const sev = LABEL_SEVERITY[input.severity || ''];
  if (sev) labels.push(sev);
  const type = LABEL_TYPE[input.issueType || ''];
  if (type) labels.push(type);
  if (input.priority) labels.push(input.priority);

  const bodyParts: string[] = [];
  if (input.description) bodyParts.push(input.description);
  bodyParts.push(`- Module: ${input.module || 'n/a'}`);
  bodyParts.push(`- Environment: ${input.environment || 'n/a'}`);
  bodyParts.push(`- Severity: ${input.severity || 'n/a'}`);
  bodyParts.push(`- Priority: ${input.priority || 'n/a'}`);
  bodyParts.push(`- Defect: ${input.defectCode || 'n/a'}`);
  if (input.stepsToReproduce) {
    bodyParts.push(`\n### Steps to reproduce\n${input.stepsToReproduce}`);
  }
  if (input.expectedResult) {
    bodyParts.push(`\n### Expected\n${input.expectedResult}`);
  }
  if (input.actualResult) {
    bodyParts.push(`\n### Actual\n${input.actualResult}`);
  }

  const codePrefix = input.defectCode ? `[${input.defectCode}] ` : '';
  return {
    title: `${codePrefix}${input.title}`,
    body: bodyParts.join('\n'),
    labels: [...new Set(labels)]
  };
}

/** GitHub issue state to sync onto a defect for a given action. */
export function githubIssueStateForAction(action: string): 'open' | 'closed' | null {
  if (action === 'opened' || action === 'reopened') return 'open';
  if (action === 'closed') return 'closed';
  if (action === 'edited' || action === 'created') return null;
  return null;
}

/**
 * Map a GitHub webhook `issues` event onto the `github` sub-doc of a defect.
 * Returns a partial sub-doc to deep-merge, or null when this event should not
 * affect the defect (e.g. a different issue number).
 */
export function mapIssueEvent(existing: {
  githubIssueNumber?: number;
  repositoryId?: string;
} | undefined, event: {
  action?: string;
  issue?: {
    number?: number;
    state?: string;
    title?: string;
    html_url?: string;
  };
}): { issue: IssueSyncEvent; status?: string } | null {
  if (!event?.issue) return null;
  const number = event.issue.number;
  if (number == null) return null;
  if (existing?.githubIssueNumber != null && existing.githubIssueNumber !== number) {
    return null;
  }

  const state = event.issue.state === 'closed' ? 'closed' : 'open';
  const issue: IssueSyncEvent = {
    issueNumber: number,
    state,
    title: event.issue.title,
    url: event.issue.html_url
  };

  const transition = githubIssueStateForAction(event.action || '');
  const status = transition === 'closed' ? 'closed' : transition === 'open' ? 'pr_open' : undefined;
  return { issue, status: status || undefined };
}