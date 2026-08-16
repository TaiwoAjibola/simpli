// GitHub webhook receiver: maps push / pull_request / pull_request_review /
// check_run events onto Simpli work items (tasks/defects linked by repository +
// branch name) idempotently via `githubEventId` dedupe. The token is NOT
// required on this route; GitHub signs payloads with a shared secret
// (GITHUB_WEBHOOK_SECRET).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  resolveWebhookBranch,
  resolveWebhookEventId,
  computeWorkUpdate
} from '../../src/utils/githubWebhookLogic.js';

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
  const repo = event?.repository;
  if (!repo) return res.status(200).json({ ack: true });

  const repoName = repo.full_name;
  const owner = repo.owner?.login || '';

  const branchName = resolveWebhookBranch(eventType, event);
  const githubEventId = resolveWebhookEventId(eventType, event);

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

    // Fetch work items linked to this repo, then filter by branch in memory
    // (Firestore equality on github.repositoryId == "owner/repo").
    const repoRef = `${owner}/${repoName}`;
    const workItems: any[] = [];
    const q = await db.collection('tasks')
      .where('github.repositoryId', '==', repoRef)
      .get();
    q.forEach(d => workItems.push({ id: d.id, data: d.data() }));
    const q2 = await db.collection('defects')
      .where('github.repositoryId', '==', repoRef)
      .get();
    q2.forEach(d => workItems.push({ id: d.id, data: d.data() }));

    // Push events target a specific branch; others are branch-scoped too when known.
    const scoped = branchName
      ? workItems.filter(w => (w.data?.github?.branchName || '') === branchName)
      : workItems;

    let processed = 0;
    for (const item of scoped) {
      // Dedupe: only apply if this event wasn't already processed.
      const ref = db.collection('events').doc(githubEventId);
      const existing = await ref.get();
      if (existing.exists) continue;

      const update = computeWorkUpdate(eventType, event, item.data?.github);

      if (Object.keys(update).length > 0) {
        await Promise.all([
          db.collection('tasks').doc(item.id).update(update).catch(() => {}),
          db.collection('defects').doc(item.id).update(update).catch(() => {})
        ]);
        await ref.set({ event: githubEventId, processedAt: new Date().toISOString() });
        processed++;
      }
    }

    return res.status(200).json({ ack: true, processed, scoped: scoped.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
