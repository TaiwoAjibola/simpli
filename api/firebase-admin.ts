import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel env vars.');
  }

  const formattedKey = privateKey.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: formattedKey
    })
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, uid, email, password } = req.body;

  try {
    const app = getFirebaseAdminApp();
    const auth = getAuth(app);

    let result: any;

    switch (action) {
      case 'create':
        result = await auth.createUser({ email, password });
        return res.status(200).json({ uid: result.uid });

      case 'delete':
        await auth.deleteUser(uid);
        return res.status(200).json({ success: true });

      case 'updatePassword':
        await auth.updateUser(uid, { password });
        return res.status(200).json({ success: true });

      case 'updateEmail':
        await auth.updateUser(uid, { email });
        return res.status(200).json({ success: true });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error: any) {
    console.error('Firebase Admin API error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      hint: error.code === 'auth/email-already-exists' ? 'Email already in use' : error.code || ''
    });
  }
}
