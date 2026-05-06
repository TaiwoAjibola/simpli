import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel env vars.');
  }

  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = JSON.parse(privateKey);
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

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
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);

    switch (action) {
      case 'create': {
        const userRecord = await auth.createUser({ email, password });
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
  } catch (error: any) {
    console.error('Firebase Admin API error:', error);
    const message = error?.message || 'Internal server error';
    const code = error?.code || '';
    res.status(500).json({
      error: message,
      code,
      hint: code === 'auth/email-already-exists' ? 'Email already in use' : ''
    });
  }
}
