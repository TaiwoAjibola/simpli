import { githubApi, runRoute } from './github-helper.js';
import { filterTreeFiles } from '../../src/utils/githubApiLogic.js';

export default runRoute({
  run: async (query) => {
    const { owner, repo, ref = '', path = '' } = query || {};
    if (!owner || !repo) return { status: 400, body: { error: 'owner and repo are required' } };

    // path provided → return single file contents (decoded, with base64)
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

    // no path → return recursive file tree for the ref (default branch falls back to 'main')
    const tree = await githubApi(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref || 'main')}?recursive=1`
    );
    return { status: 200, body: { type: 'tree', files: filterTreeFiles(tree.tree), truncated: !!tree.truncated } };
  }
});
