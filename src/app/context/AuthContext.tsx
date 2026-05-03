import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Employee, Role } from '../types';
import { employees, roles } from '../data/mockData';

type AuthContextType = {
  currentUser: Employee | null;
  currentRole: Role | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const getCurrentRole = (user: Employee | null): Role | null => {
    if (!user) return null;
    return roles.find(r => r.id === user.roleId) || null;
  };

  const login = (email: string, password: string): boolean => {
    const user = employees.find(
      emp => emp.email === email && emp.password === password
    );

    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    const role = getCurrentRole(currentUser);
    if (!role) return false;
    return role.permissions.includes(permission as any);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: getCurrentRole(currentUser),
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
