import { githubApi, runRoute } from './github-helper';

export default runRoute({
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
});