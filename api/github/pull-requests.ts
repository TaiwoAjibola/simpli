import { githubApi, runRoute } from './github-helper';

export default runRoute({
  method: 'POST',
  run: async (body) => {
    const { owner, repo } = body || {};
    if (!owner || !repo) return { status: 400, body: { error: 'owner, repo are required' } };

    const { action, prNumber, title, head, base = 'main', body: prBody } = body;

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

      const approved = reviews.some((r: any) => r.state === 'APPROVED');
      const changesRequested = reviews.some((r: any) => r.state === 'CHANGES_REQUESTED');
      const checkRuns = checks?.check_runs || [];
      const failure = checkRuns.some((c: any) => c.conclusion === 'failure' || c.conclusion === 'timed_out');
      const success = checkRuns.length > 0 && checkRuns.every((c: any) => c.conclusion === 'success');

      return {
        status: 200,
        body: {
          prNumber: pr.number,
          url: pr.html_url,
          state: pr.merged ? 'merged' : pr.state,
          title: pr.title,
          head: pr.head?.ref,
          base: pr.base?.ref,
          merged: pr.merged,
          mergedAt: pr.merged_at,
          reviewState: changesRequested ? 'changes_requested' : approved ? 'approved' : 'pending',
          checkStatus: failure ? 'failure' : success ? 'success' : 'pending'
        }
      };
    }

    return { status: 400, body: { error: 'Unsupported action' } };
  }
});