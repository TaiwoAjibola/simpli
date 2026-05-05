import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createFirebaseUser } from '../firebase/auth-utils';

export async function syncEmployeesToFirebaseAuth(): Promise<{ success: number; failed: { id: string; email: string; error: string }[] }> {
  const employeesSnapshot = await getDocs(collection(db, 'employees'));
  const results = { success: 0, failed: [] as { id: string; email: string; error: string }[] };

  for (const empDoc of employeesSnapshot.docs) {
    const employee = empDoc.data();

    if (employee.firebaseUid) {
      results.success++;
      continue;
    }

    if (!employee.email || !employee.password) {
      results.failed.push({ id: empDoc.id, email: employee.email || 'N/A', error: 'Missing email or password' });
      continue;
    }

    try {
      const firebaseUid = await createFirebaseUser(employee.email, employee.password);

      if (firebaseUid) {
        await updateDoc(doc(db, 'employees', empDoc.id), { firebaseUid });
        results.success++;
      } else {
        results.failed.push({ id: empDoc.id, email: employee.email, error: 'REST API returned null' });
      }
    } catch (error: any) {
      results.failed.push({ id: empDoc.id, email: employee.email, error: error.message });
    }
  }

  return results;
}
