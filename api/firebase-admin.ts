import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      return res.status(500).json({
        error: 'Missing environment variables',
        missing,
        hint: 'Set these in Vercel → Settings → Environment Variables'
      });
    }

    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = JSON.parse(privateKey);
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

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
    res.status(500).json({
      error: error?.message || 'Internal server error',
      code: error?.code || '',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
