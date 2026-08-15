// GitHub webhook receiver: maps pull_request/check_run events onto Simpli work
// items (tasks/defects linked by repository + branch name) idempotently via
// `githubEventId` dedupe. The token is NOT required on this route; GitHub
// signs payloads with a shared secret (GITHUB_WEBHOOK_SECRET).
import type { VercelRequest, VercelResponse } from '@vercel/node';

function verify(body: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const { createHmac } = require('crypto');
  const sig = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return require('crypto').timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret && !verify(rawBody, req.headers['x-hub-signature-256'] as string | undefined, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const eventType = (req.headers['x-github-event'] as string) || '';
  const githubEventId = `${eventType}:${event?.pull_request?.id || event?.check_run?.id || Date.now()}`;

  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    if (!getApps().length) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
    const db = getFirestore();

    const pr = event?.pull_request;
    const checkRun = event?.check_run;
    const repo = event?.repository;
    if (!repo) return res.status(200).json({ ack: true });

    const repoName = repo.full_name;
    const branchName = pr?.head?.ref || checkRun?.check_run?.head_branch || '';
    const link = { owner: repo.owner?.login || '', repoName, branchName };

    const workItems: { id?: string }[] = [];
    const q = await db.collection('tasks')
      .where('github.repositoryId', '==', `${link.owner}/${link.repoName}`)
      .get();
    q.forEach(d => workItems.push({ id: d.id }));
    const q2 = await db.collection('defects')
      .where('github.repositoryId', '==', `${link.owner}/${link.repoName}`)
      .get();
    q2.forEach(d => workItems.push({ id: d.id }));

    for (const item of workItems) {
      // Dedupe: only apply if this event wasn't already processed for this work item.
      const ref = db.collection('events').doc(githubEventId);
      const existing = await ref.get();
      if (existing.exists) continue;

      let update: any = {};
      if (eventType === 'pull_request') {
        if (pr.state === 'open' && pr.draft === false) {
          update['github.pullRequest'] = { prNumber: pr.number, url: pr.html_url, state: 'open', title: pr.title };
          update['github.status'] = 'pr_open';
        } else if (pr.merged) {
          update['github.pullRequest'] = { prNumber: pr.number, url: pr.html_url, state: 'merged', title: pr.title };
          update['github.status'] = 'merged';
        } else if (pr.state === 'closed') {
          update['github.status'] = 'closed';
        }
      } else if (eventType === 'check_run') {
        const conclusion = checkRun?.conclusion;
        update['github.pullRequest'] = { ...(item as any).github?.pullRequest, checkStatus: conclusion === 'success' ? 'success' : 'failure' };
      }

      if (Object.keys(update).length > 0) {
        await Promise.all([
          db.collection('tasks').doc(item.id).update(update).catch(() => {}),
          db.collection('defects').doc(item.id).update(update).catch(() => {})
        ]);
        await ref.set({ event: githubEventId, processedAt: new Date().toISOString() });
      }
    }

    return res.status(200).json({ ack: true, processed: workItems.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}