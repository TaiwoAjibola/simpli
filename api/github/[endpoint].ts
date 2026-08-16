import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  githubApi,
  runRoute,
  getGithubAuthMode,
  type GithubRouteHandler
} from '../../server/github-helper.js';
import { mapCompareFiles, filterTreeFiles, summarizeReviews, summarizeChecks } from '../../src/utils/githubApiLogic.js';

// Consolidated GitHub API: one serverless function serves every /api/github/*
// sub-route via the [endpoint] path segment, keeping the Hobby-plan function
// count under the 12-function cap.

const handlers: Record<string, GithubRouteHandler> = {
  branches: {
    method: 'POST',
    run: async (body) => {
      const { owner, repo, name, baseBranch = 'main' } = body || {};
      if (!owner || !repo || !name) {
        return { status: 400, body: { error: 'owner, repo, and name are required' } };
      }
      const refEncoded = encodeURIComponent(`heads/${name}`);
      try {
        await githubApi(`/repos/${owner}/${repo}/git/ref/${refEncoded}`);
        return { status: 409, body: { error: `Branch ${name} already exists` } };
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const base = await githubApi(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`);
      const sha = base.object?.sha;
      if (!sha) return { status: 500, body: { error: `Could not resolve base branch ${baseBranch}` } };

      const ref = await githubApi(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        body: { ref: `refs/heads/${name}`, sha }
      });
      const branch = await githubApi(`/repos/${owner}/${repo}/branches/${encodeURIComponent(name)}`);
      return { status: 201, body: { success: true, branch, ref, url: branch._links?.html } };
    }
  },

  commits: {
    run: async (query) => {
      const { owner, repo, branch = 'main', per_page = 50 } = query || {};
      if (!owner || !repo) return { status: 400, body: { error: 'owner and repo are required' } };
      const commits = await githubApi(
        `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${per_page}`
      );
      return {
        status: 200,
        body: {
          commits: commits.map((c: any) => ({
            sha: c.sha,
            message: c.commit?.message,
            author: c.commit?.author?.name || c.author?.login || 'unknown',
            date: c.commit?.author?.date,
            url: c.html_url
          }))
        }
      };
    }
  },

  compare: {
    run: async (query) => {
      const { owner, repo, base = 'main', head = '', prNumber } = query || {};
      if (!owner || !repo || !head) {
        return { status: 400, body: { error: 'owner, repo, and head are required' } };
      }

      let baseRef = base;
      let headRef = head;
      if (prNumber) {
        try {
          const pr = await githubApi(`/repos/${owner}/${repo}/pulls/${prNumber}`);
          baseRef = pr.base?.ref || base;
          headRef = pr.head?.ref || head;
        } catch { /* fall back to provided base/head */ }
      }

      const compare = await githubApi(
        `/repos/${owner}/${repo}/compare/${encodeURIComponent(baseRef)}...${encodeURIComponent(headRef)}`
      );

      const files = mapCompareFiles(compare.files);

      return {
        status: 200,
        body: {
          base: baseRef,
          head: headRef,
          ahead_by: compare.ahead_by,
          behind_by: compare.behind_by,
          total_commits: compare.total_commits,
          status: compare.status,
          files
        }
      };
    }
  },

  contents: {
    run: async (query) => {
      const { owner, repo, ref = '', path = '' } = query || {};
      if (!owner || !repo) return { status: 400, body: { error: 'owner and repo are required' } };

      if (path) {
        const file = await githubApi(
          `/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`
        );
        const content = file.content ? Buffer.from(file.content, 'base64').toString('utf8') : '';
        return {
          status: 200,
          body: {
            type: 'file',
            name: file.name,
            path: file.path,
            size: file.size,
            content,
            sha: file.sha,
            url: file.html_url
          }
        };
      }

      const tree = await githubApi(
        `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref || 'main')}?recursive=1`
      );
      return { status: 200, body: { type: 'tree', files: filterTreeFiles(tree.tree), truncated: !!tree.truncated } };
    }
  },

  issues: {
    method: 'POST',
    run: async (body) => {
      const { owner, repo } = body || {};
      if (!owner || !repo) return { status: 400, body: { error: 'owner, repo are required' } };

      const { action, issueNumber, title, description, labels, state } = body;

      if (action === 'create') {
        if (!title) return { status: 400, body: { error: 'create requires title' } };
        const issue = await githubApi(`/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          body: {
            title,
            body: description || '',
            labels: Array.isArray(labels) ? labels : []
          }
        });
        return {
          status: 201,
          body: { issueNumber: issue.number, url: issue.html_url, state: issue.state, title: issue.title }
        };
      }

      if (action === 'update') {
        if (!issueNumber) return { status: 400, body: { error: 'update requires issueNumber' } };
        const patch: any = {};
        if (title !== undefined) patch.title = title;
        if (description !== undefined) patch.body = description;
        if (Array.isArray(labels)) patch.labels = labels;
        if (Object.keys(patch).length === 0) {
          return { status: 400, body: { error: 'update requires at least one field' } };
        }
        const issue = await githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          body: patch
        });
        return {
          status: 200,
          body: { issueNumber: issue.number, url: issue.html_url, state: issue.state, title: issue.title }
        };
      }

      if (action === 'close' || action === 'reopen' || action === 'set_state') {
        if (!issueNumber) return { status: 400, body: { error: 'state change requires issueNumber' } };
        const nextState = action === 'close' ? 'closed' : action === 'reopen' ? 'open' : (state === 'closed' ? 'closed' : 'open');
        const issue = await githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          body: { state: nextState }
        });
        return {
          status: 200,
          body: { issueNumber: issue.number, url: issue.html_url, state: issue.state, title: issue.title }
        };
      }

      if (action === 'get') {
        if (!issueNumber) return { status: 400, body: { error: 'get requires issueNumber' } };
        const issue = await githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}`);
        return {
          status: 200,
          body: {
            issueNumber: issue.number,
            url: issue.html_url,
            state: issue.state,
            title: issue.title,
            description: issue.body || '',
            labels: (issue.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name)).filter(Boolean),
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            user: issue.user?.login || null
          }
        };
      }

      return { status: 400, body: { error: 'Unsupported action' } };
    }
  },

  merge: {
    method: 'POST',
    run: async (body) => {
      const { owner, repo, prNumber, method = 'merge' } = body || {};
      if (!owner || !repo || !prNumber) {
        return { status: 400, body: { error: 'owner, repo, prNumber are required' } };
      }
      const data = await githubApi(`/repos/${owner}/${repo}/pulls/${prNumber}/${method}`, {
        method: 'PUT'
      });
      return { status: 200, body: { success: true, merged: data.merged, sha: data.sha, url: data.html_url } };
    }
  },

  'pull-requests': {
    method: 'POST',
    run: async (body) => {
      const { owner, repo } = body || {};
      if (!owner || !repo) return { status: 400, body: { error: 'owner, repo are required' } };

      const { action, prNumber, title, head, base = 'main', body: prBody, reviewEvent, reviewComment } = body;

      if (action === 'review') {
        if (!prNumber || !reviewEvent) return { status: 400, body: { error: 'review requires prNumber and reviewEvent' } };
        await githubApi(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
          method: 'POST',
          body: {
            event: reviewEvent,
            ...(reviewComment ? { body: reviewComment } : {})
          }
        });
        return { status: 200, body: { ok: true } };
      }

      if (action === 'open') {
        if (!title || !head) return { status: 400, body: { error: 'open requires title and head' } };
        const pr = await githubApi(`/repos/${owner}/${repo}/pulls`, {
          method: 'POST',
          body: { title, head, base, body: prBody || '' }
        });
        return { status: 201, body: { prNumber: pr.number, url: pr.html_url, state: pr.state, title: pr.title } };
      }

      if (action === 'get' || (!prNumber && body.state)) {
        if (!prNumber) return { status: 400, body: { error: 'get requires prNumber' } };
        const pr = await githubApi(`/repos/${owner}/${repo}/pulls/${prNumber}`);
        let reviews: any[] = [];
        let checks: any = null;
        try {
          reviews = await githubApi(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`);
        } catch { /* reviews may be empty */ }
        try {
          checks = await githubApi(`/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`);
        } catch { /* checks may not exist */ }

        const { reviewState, reviews: reviewerRows } = summarizeReviews(reviews || []);
        const { checkStatus, checks: checkRows } = summarizeChecks(checks);

        return {
          status: 200,
          body: {
            prNumber: pr.number,
            url: pr.html_url,
            state: pr.merged ? 'merged' : pr.state,
            title: pr.title,
            description: pr.body || '',
            head: pr.head?.ref,
            base: pr.base?.ref,
            merged: pr.merged,
            mergedAt: pr.merged_at,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            user: pr.user?.login || null,
            draft: !!pr.draft,
            reviewState,
            checkStatus,
            reviewers: reviewerRows,
            checks: checkRows
          }
        };
      }

      return { status: 400, body: { error: 'Unsupported action' } };
    }
  },

  status: {
    run: async () => {
      const user = await githubApi('/user');
      const mode = getGithubAuthMode();
      return {
        status: 200,
        body: {
          login: user.login,
          name: user.name || user.login,
          avatar_url: user.avatar_url,
          html_url: user.html_url,
          authMode: mode,
          tokenType: mode === 'app' ? 'GITHUB_APP' : mode === 'token' ? (process.env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : 'GITHUB_ACCESS_TOKEN') : 'none'
        }
      };
    }
  }
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const endpoint = (req.query.endpoint as string) || '';
  const route = handlers[endpoint];
  if (!route) {
    return res.status(404).json({ error: `Unknown GitHub endpoint: ${endpoint}` });
  }
  return runRoute(route)(req, res);
}
