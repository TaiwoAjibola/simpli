import { githubApi, runRoute } from './github-helper';
import { summarizeReviews, summarizeChecks } from '../../src/utils/githubApiLogic';

export default runRoute({
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
          event: reviewEvent, // APPROVE | REQUEST_CHANGES | COMMENT
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
});