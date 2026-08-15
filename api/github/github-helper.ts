// Shared helper for GitHub API routes. Token never exposed to the client:
// the browser calls /api/github/* which forwards to GitHub's REST API using
// GITHUB_TOKEN (or GITHUB_ACCESS_TOKEN) stored only in server env.
export type GithubRouteHandler = {
  method?: string;
  run: (body: any) => Promise<{ status: number; body: any }>;
};

const GH_API = 'https://api.github.com';

export async function githubApi(path: string, options: { method?: string; body?: any } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
  if (!token) {
    const err: any = new Error('GitHub token not configured. Set GITHUB_TOKEN in Vercel env vars.');
    err.status = 500;
    throw err;
  }
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