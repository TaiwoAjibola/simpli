import { githubApi, runRoute, getGithubAuthMode } from './github-helper.js';

// Verify the configured token is valid and report the authenticated account.
// Used by the Integrations page "connect/sync" for GitHub — no hardcoded repo.
export default runRoute({
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
});