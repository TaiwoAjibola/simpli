import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const roles = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: ['create_app', 'create_goal', 'assign_tasks', 'manage_users', 'configure_notifications', 'approve_tasks', 'view_all_apps', 'report_defects', 'manage_defects', 'handle_defects', 'verify_defects', 'manage_action_points']
  },
  {
    id: 'role-ceo',
    name: 'CEO',
    permissions: ['create_app', 'create_goal', 'approve_tasks', 'view_all_apps', 'report_defects']
  },
  {
    id: 'role-manager',
    name: 'Manager',
    permissions: ['create_goal', 'assign_tasks', 'approve_tasks', 'view_all_apps', 'report_defects', 'manage_defects']
  },
  {
    id: 'role-employee',
    name: 'Employee',
    permissions: ['view_assigned_only', 'report_defects']
  }
];

const adminUser = {
  id: 'emp-1',
  name: 'Admin User',
  email: 'admin@simpli.com',
  password: 'admin123',
  roleId: 'role-admin'
};

export function SeedPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSeed = async () => {
    setStatus('loading');
    setMessage('Seeding database...');

    try {
      const app = initializeApp(firebaseConfig, 'seed-app');
      const db = getFirestore(app);
      const auth = getAuth(app);

      // Seed roles
      for (const role of roles) {
        await setDoc(doc(db, 'roles', role.id), role);
      }

      // Check if admin exists
      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      const existingAdmin = snapshot.docs.find(d => d.data().email === adminUser.email);

      if (!existingAdmin) {
        try {
          await createUserWithEmailAndPassword(auth, adminUser.email, adminUser.password);
        } catch (e) {
          // Auth user might already exist
        }

        await setDoc(doc(db, 'employees', adminUser.id), {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          roleId: adminUser.roleId,
          createdAt: new Date().toISOString()
        });
      }

      setStatus('success');
      setMessage('Database seeded successfully!');
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-[#f0f0f5] mb-4">Seed Database</h1>
        <p className="text-[#6b6b80] mb-6">
          This will create the initial roles and admin user in Firebase.
        </p>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="w-full bg-[#00e5ff] text-[#0a0a0f] py-3 font-medium hover:bg-[#00c4e0] transition"
          >
            Seed Database
          </button>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 text-[#f0f0f5]">
            <Loader className="w-5 h-5 animate-spin" />
            <span>{message}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[#10b981]">
              <CheckCircle className="w-5 h-5" />
              <span>{message}</span>
            </div>
            <div className="bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] p-4">
              <p className="text-sm text-[#f0f0f5] mb-2">Admin credentials:</p>
              <p className="text-sm text-[#6b6b80]">Email: <span className="text-[#00e5ff]">{adminUser.email}</span></p>
              <p className="text-sm text-[#6b6b80]">Password: <span className="text-[#00e5ff]">{adminUser.password}</span></p>
            </div>
            <a
              href="/"
              className="block text-center bg-[#00e5ff] text-[#0a0a0f] py-3 font-medium hover:bg-[#00c4e0] transition"
            >
              Go to Login
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-3 text-[#ff3b5c]">
            <AlertCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
