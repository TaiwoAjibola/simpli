import { githubApi, runRoute } from './github-helper.js';

export default runRoute({
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
});