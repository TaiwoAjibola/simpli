import type { VercelRequest, VercelResponse } from '@vercel/node';

// Read-only Vercel deploy observer. Simpli only *observes* deployments — it
// never creates, cancels, or modifies them. Token (VERCEL_TOKEN) is server-side
// only. Query params:
//   project (optional) — filter deployments by Vercel project name
//   limit (optional, default 10)
// If VERCEL_PROJECT_ID is configured it is used directly; otherwise the token
// must be scoped to see the org's deployments to filter by name.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return res.status(200).json({ configured: false, deployments: [], note: 'VERCEL_TOKEN not configured' });
  }

  const { project = '', limit = 10 } = req.query as any;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  const params = new URLSearchParams();
  params.set('limit', String(Math.min(Math.max(parseInt(limit) || 10, 1), 50)));
  if (projectId) params.set('projectId', projectId);
  if (teamId) params.set('teamId', teamId);

  try {
    const res2 = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res2.ok) {
      const text = await res2.text();
      return res.status(502).json({ error: `Vercel API error ${res2.status}: ${text}` });
    }
    const data = await res2.json();
    let deployments = data.deployments || [];

    if (project && !projectId) {
      deployments = deployments.filter((d: any) => d.name === project);
    }

    const mapped = deployments.map((d: any) => ({
      id: d.uid,
      name: d.name,
      environment: d.target || 'preview',
      state: d.readyState || d.state,
      url: d.url ? `https://${d.url}` : null,
      createdAt: d.created || null,
      creator: d.creator?.username || d.creator?.email || null,
      commitSha: d.meta?.githubCommitSha || d.meta?.githubCommitRef || null,
      commitRef: d.meta?.githubCommitRef || null
    }));

    return res.status(200).json({ configured: true, deployments: mapped });
  } catch (e: any) {
    return res.status(502).json({ error: e.message || 'Vercel API failure' });
  }
}