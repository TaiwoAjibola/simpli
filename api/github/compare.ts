import { githubApi, runRoute } from './github-helper';
import { mapCompareFiles } from '../../src/utils/githubApiLogic';

// Compare two branches (or base...head shas). Returns changed files with patches.
export default runRoute({
  run: async (query) => {
    const { owner, repo, base = 'main', head = '', prNumber } = query || {};
    if (!owner || !repo || !head) {
      return { status: 400, body: { error: 'owner, repo, and head are required' } };
    }

    // If a PR number is given, prefer comparing against the PR's base/head directly.
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
});
