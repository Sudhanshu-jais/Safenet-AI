import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types/index.js';
import { setActiveUser } from '../services/api.js';

interface AuthContextType {
  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isOperator: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('ADMINISTRATOR');

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setActiveUser(newRole);
  };

  useEffect(() => {
    setActiveUser(role);
  }, [role]);

  const userName = role === 'ADMINISTRATOR' 
    ? 'Chief Administrator' 
    : role === 'OPERATOR' 
    ? 'Duty Dispatcher' 
    : 'Compliance Auditor';

  return (
    <AuthContext.Provider
      value={{
        role,
        userName,
        setRole,
        isAdmin: role === 'ADMINISTRATOR',
        isOperator: role === 'OPERATOR',
        isAuditor: role === 'AUDITOR',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
