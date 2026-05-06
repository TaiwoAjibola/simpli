import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createFirebaseUser, findUserByEmail } from '../firebase/auth-utils';

export async function syncEmployeesToFirebaseAuth(): Promise<{ success: number; failed: { id: string; email: string; error: string }[] }> {
  const employeesSnapshot = await getDocs(collection(db, 'employees'));
  const results = { success: 0, failed: [] as { id: string; email: string; error: string }[] };

  for (const empDoc of employeesSnapshot.docs) {
    const employee = empDoc.data();

    if (employee.firebaseUid) {
      results.success++;
      continue;
    }

    if (!employee.email) {
      results.failed.push({ id: empDoc.id, email: 'N/A', error: 'Missing email' });
      continue;
    }

    try {
      const found = await findUserByEmail(employee.email);

      if (found) {
        await updateDoc(doc(db, 'employees', empDoc.id), { firebaseUid: found.uid });
        results.success++;
        continue;
      }

      if (!employee.password) {
        results.failed.push({ id: empDoc.id, email: employee.email, error: 'No Auth account exists and no password to create one' });
        continue;
      }

      const firebaseUid = await createFirebaseUser(employee.email, employee.password);

      if (firebaseUid) {
        await updateDoc(doc(db, 'employees', empDoc.id), { firebaseUid });
        results.success++;
      } else {
        results.failed.push({ id: empDoc.id, email: employee.email, error: 'Failed to create Auth account' });
      }
    } catch (error: any) {
      results.failed.push({ id: empDoc.id, email: employee.email, error: error.message });
    }
  }

  return results;
}
