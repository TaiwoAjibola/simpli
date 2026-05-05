import { auth } from './config';

export async function createFirebaseUser(email: string, password: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${auth.app.options.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Firebase Auth REST API error:', data);
      return null;
    }

    return data.localId;
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    return null;
  }
}

export async function updateFirebaseUserPassword(uid: string, newPassword: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${auth.app.options.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: uid, password: newPassword, returnSecureToken: false })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error updating Firebase user password:', error);
    return false;
  }
}

export async function updateFirebaseUserEmail(uid: string, newEmail: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${auth.app.options.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: uid, email: newEmail, returnSecureToken: false })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error updating Firebase user email:', error);
    return false;
  }
}

export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${auth.app.options.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: uid })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error deleting Firebase user:', error);
    return false;
  }
}
