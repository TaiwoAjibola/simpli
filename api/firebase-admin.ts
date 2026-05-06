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

  const { action, uid, email, password } = req.body;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      return res.status(500).json({ error: 'Missing env vars' });
    }

    let keyPreview = privateKey.substring(0, 30);
    let hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
    let hasEnd = privateKey.includes('-----END PRIVATE KEY-----');

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = JSON.parse(privateKey);
      keyPreview = privateKey.substring(0, 30);
      hasBegin = privateKey.includes('-----BEGIN PRIVATE KEY-----');
      hasEnd = privateKey.includes('-----END PRIVATE KEY-----');
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

    switch (action) {
      case 'create': {
        const userRecord = await auth.createUser({ email, password });
        return res.status(200).json({ uid: userRecord.uid });
      }
      case 'findByEmail': {
        const userRecord = await auth.getUserByEmail(email);
        return res.status(200).json({ uid: userRecord.uid });
      }
      case 'delete': {
        await auth.deleteUser(uid);
        return res.status(200).json({ success: true });
      }
      case 'updatePassword': {
        await auth.updateUser(uid, { password });
        return res.status(200).json({ success: true });
      }
      case 'updateEmail': {
        await auth.updateUser(uid, { email });
        return res.status(200).json({ success: true });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
      case 'delete': {
        await auth.deleteUser(uid);
        return res.status(200).json({ success: true });
      }
      case 'updatePassword': {
        await auth.updateUser(uid, { password });
        return res.status(200).json({ success: true });
      }
      case 'updateEmail': {
        await auth.updateUser(uid, { email });
        return res.status(200).json({ success: true });
      }
      case 'test': {
        return res.status(200).json({
          keyPreview,
          hasBegin,
          hasEnd,
          keyLength: privateKey.length,
          newlines: (privateKey.match(/\n/g) || []).length,
          literalNewlines: (privateKey.match(/\\n/g) || []).length
        });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error: any) {
    res.status(500).json({
      error: error?.message || 'Internal server error',
      code: error?.code || '',
      errorInfo: error?.errorInfo || null
    });
  }
}
