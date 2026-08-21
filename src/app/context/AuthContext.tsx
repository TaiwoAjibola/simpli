import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { Employee, Role } from '../types';

type AuthContextType = {
  currentUser: Employee | null;
  currentRole: Role | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = useCallback((roleId: string) => {
    const roleRef = doc(db, 'roles', roleId);
    const unsub = onSnapshot(roleRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentRole(docSnap.data() as Role);
      } else {
        setCurrentRole(null);
      }
    }, (error) => {
      console.error('Error listening to role:', error);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let roleUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          let employeeDoc = await getDoc(doc(db, 'employees', user.uid));

          if (!employeeDoc.exists()) {
            const employeeQuery = query(collection(db, 'employees'), where('firebaseUid', '==', user.uid));
            const employeeSnapshot = await getDocs(employeeQuery);
            if (!employeeSnapshot.empty) {
              employeeDoc = employeeSnapshot.docs[0];
            }
          }

          if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data() as Employee;
            setCurrentUser(employeeData);

            if (employeeData.roleId) {
              if (roleUnsub) roleUnsub();
              roleUnsub = loadRole(employeeData.roleId);
            }
          } else {
            console.warn('No employee document found for Firebase UID:', user.uid);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setCurrentUser(null);
        setCurrentRole(null);
        if (roleUnsub) roleUnsub();
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (roleUnsub) roleUnsub();
    };
  }, [loadRole]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const code = error?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        return { success: false, error: 'Invalid email or password' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many failed attempts. Try again later.' };
      }
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    return currentRole.permissions.includes(permission as any);
  };

  // Persist for logger (outside React) to pick up user identity without importing Auth
  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('simpli_current_user', JSON.stringify({ id: currentUser.id, name: currentUser.name, email: currentUser.email }));
      else localStorage.removeItem('simpli_current_user');
    } catch {}
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        firebaseUser,
        loading,
        login,
        logout,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
