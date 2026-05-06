import { auth } from './config';

export async function createFirebaseUser(email: string, password: string): Promise<string | null> {
  try {
    const response = await fetch('/api/firebase-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firebase Admin API error (create):', data);
      if (data.code === 'auth/email-already-exists') {
        const existing = await findUserByEmail(email);
        if (existing) return existing.uid;
      }
      return null;
    }

    return data.uid;
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    return null;
  }
}

export async function findUserByEmail(email: string): Promise<{ uid: string } | null> {
  try {
    const response = await fetch('/api/firebase-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'findByEmail', email })
    });

    if (response.status === 404) {
      return null;
    }

    const data = await response.json();

    if (response.ok && data.uid) {
      return { uid: data.uid };
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function updateFirebaseUserPassword(uid: string, newPassword: string): Promise<boolean> {
  try {
    const response = await fetch('/api/firebase-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updatePassword', uid, password: newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firebase Admin API error (updatePassword):', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating Firebase user password:', error);
    return false;
  }
}

export async function updateFirebaseUserEmail(uid: string, newEmail: string): Promise<boolean> {
  try {
    const response = await fetch('/api/firebase-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateEmail', uid, email: newEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firebase Admin API error (updateEmail):', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating Firebase user email:', error);
    return false;
  }
}

export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  try {
    const response = await fetch('/api/firebase-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', uid })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firebase Admin API error (delete):', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    return false;
  }
}
