import { githubApi, runRoute } from './github-helper.js';

export default runRoute({
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
});