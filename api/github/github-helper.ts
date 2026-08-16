// Shared helper for GitHub API routes. Token(s) never exposed to the client:
// the browser calls /api/github/* which forwards to GitHub's REST API using a
// fine-grained/classic PAT (GITHUB_TOKEN or GITHUB_ACCESS_TOKEN) or, when a
// GitHub App is configured (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY, optional
// GITHUB_APP_INSTALLATION_ID), a short-lived installation access token minted
// for that app. Values live only in server env.
import {
  createAppJwt,
  resolveGithubAuthMode,
  resolvePatToken,
  resolveInstallationId,
  type GithubAuthConfig
} from '../../src/utils/githubAuthLogic';

export type GithubRouteHandler = {
  method?: string;
  run: (body: any) => Promise<{ status: number; body: any }>;
};

const GH_API = 'https://api.github.com';

let cachedInstallationToken: { token: string; expiresAt: number } | null = null;

/** Mint a GitHub App installation access token (cached until ~60s before expiry). */
async function getAppInstallationToken(config: GithubAuthConfig): Promise<string> {
  if (
    cachedInstallationToken &&
    cachedInstallationToken.expiresAt - 60_000 > Date.now()
  ) {
    return cachedInstallationToken.token;
  }

  const appId = config.GITHUB_APP_ID as string;
  const privateKey = (config.GITHUB_APP_PRIVATE_KEY as string).replace(/\\n/g, '\n');
  const jwt = createAppJwt(appId, privateKey);

  const installations = await fetch(`${GH_API}/app/installations`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!installations.ok) {
    const text = await installations.text();
    const err: any = new Error(`GitHub App installation lookup failed (${installations.status}): ${text}`);
    err.status = installations.status;
    throw err;
  }
  const installationList: any[] = await installations.json();
  const explicitId = resolveInstallationId(config);
  const installation = explicitId
    ? installationList.find((i: any) => String(i.id) === String(explicitId))
    : installationList[0];
  if (!installation) {
    const err: any = new Error(
      'No GitHub App installation found for this app. Install the GitHub App on the target account/org or set GITHUB_APP_INSTALLATION_ID.'
    );
    err.status = 500;
    throw err;
  }

  const tokenRes = await fetch(`${GH_API}/app/installations/${installation.id}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    const err: any = new Error(`GitHub App token mint failed (${tokenRes.status}): ${text}`);
    err.status = tokenRes.status;
    throw err;
  }
  const tokenData = await tokenRes.json();
  cachedInstallationToken = {
    token: tokenData.token,
    expiresAt: new Date(tokenData.expires_at).getTime()
  };
  return cachedInstallationToken.token;
}

/** Resolve the effective auth header token honoring app-over-PAT preference. */
export async function getGithubToken(): Promise<string> {
  const config = process.env as GithubAuthConfig;
  const mode = resolveGithubAuthMode(config);
  if (mode === 'app') return getAppInstallationToken(config);
  const pat = resolvePatToken(config);
  if (!pat) {
    const err: any = new Error(
      'GitHub auth not configured. Set GITHUB_TOKEN (PAT) or GitHub App vars (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY) in Vercel env.'
    );
    err.status = 500;
    throw err;
  }
  return pat;
}

/** Top-level auth mode for reporting in /api/github/status. */
export function getGithubAuthMode(): 'app' | 'token' | 'none' {
  return resolveGithubAuthMode(process.env as GithubAuthConfig);
}

export async function githubApi(path: string, options: { method?: string; body?: any } = {}) {
  const token = await getGithubToken();
  const res = await fetch(`${GH_API}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(`GitHub API error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function runRoute(handler: GithubRouteHandler) {
  return async function (req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (handler.method && handler.method !== req.method) {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const result = await handler.run(req.body || req.query);
      return res.status(result.status || 200).json(result.body);
    } catch (e: any) {
      return res.status(e.status || 500).json({ error: e.message || 'Internal server error' });
    }
  };
}