import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = JSON.parse(privateKey);
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');

    if (!getApps().length) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey })
      });
    }

    const auth = getAuth();

    try {
      const userRecord = await auth.getUserByEmail(email);
      return res.status(200).json({
        exists: true,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        createdAt: userRecord.metadata.creationTime
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.status(200).json({ exists: false, email });
      }
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
