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
    permissions: ['create_app', 'create_goal', 'assign_tasks', 'manage_users', 'configure_notifications', 'approve_tasks', 'view_all_apps', 'report_defects', 'manage_defects', 'handle_defects', 'verify_defects', 'manage_action_points', 'manage_modules', 'manage_documents', 'develop_work', 'review_code', 'merge_code', 'run_qa', 'manage_repositories', 'manage_sprints', 'manage_templates', 'manage_automations', 'manage_workflow', 'view_portfolio']
  },
  {
    id: 'role-ceo',
    name: 'CEO',
    permissions: ['create_app', 'create_goal', 'approve_tasks', 'view_all_apps', 'report_defects', 'view_portfolio']
  },
  {
    id: 'role-manager',
    name: 'Manager',
    permissions: ['create_goal', 'assign_tasks', 'approve_tasks', 'view_all_apps', 'report_defects', 'manage_defects', 'verify_defects', 'manage_sprints', 'manage_templates', 'manage_workflow', 'view_portfolio']
  },
  {
    id: 'role-developer',
    name: 'Developer',
    permissions: ['view_assigned_only', 'report_defects', 'handle_defects', 'develop_work', 'review_code']
  },
  {
    id: 'role-reviewer',
    name: 'Reviewer',
    permissions: ['view_assigned_only', 'report_defects', 'review_code']
  },
  {
    id: 'role-qa',
    name: 'QA',
    permissions: ['view_assigned_only', 'report_defects', 'run_qa', 'verify_defects', 'handle_defects']
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

      for (const role of roles) {
        await setDoc(doc(db, 'roles', role.id), role);
      }

      const employeesRef = collection(db, 'employees');
      const snapshot = await getDocs(employeesRef);
      const existingAdmin = snapshot.docs.find(d => d.data().email === adminUser.email);

      if (!existingAdmin) {
        try {
          await createUserWithEmailAndPassword(auth, adminUser.email, adminUser.password);
        } catch (e) {
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
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-8 max-w-[400px] w-full">
        <h1 className="text-[16px] font-semibold text-[#37352F] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Seed Database</h1>
        <p className="text-sm text-[#787774] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          This will create the initial roles and admin user in Firebase.
        </p>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="w-full bg-[#2383E2] text-white py-2 rounded-[6px] font-medium text-sm hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Seed Database
          </button>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 text-[#37352F] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Loader className="w-5 h-5 animate-spin text-[#787774]" />
            <span>{message}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#0F7B6C] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              <CheckCircle className="w-5 h-5" />
              <span>{message}</span>
            </div>
            <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
              <p className="text-sm text-[#37352F] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Admin credentials:</p>
              <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Email: <span className="text-[#37352F] font-medium">{adminUser.email}</span></p>
              <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Password: <span className="text-[#37352F] font-medium">{adminUser.password}</span></p>
            </div>
            <a
              href="/"
              className="block text-center bg-[#2383E2] text-white py-2 rounded-[6px] font-medium text-sm hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Go to Login
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-[#EB5757] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            <AlertCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
