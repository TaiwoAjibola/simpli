import { githubApi, runRoute } from './github-helper';

// GitHub issues API: create / update (title/body/labels) / set state (open,
// closed) and get. Wired to Defects — a defect creates a linked issue, and
// closing/reopening the defect flips the issue state here.
export default runRoute({
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
});