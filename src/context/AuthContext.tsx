import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  name: string;
  role: string;
  pin: string;
  active: boolean;
  createdAt: string;
}

export interface RoleDetail {
  label: string;
  desc: string;
  perms: string[];
}

export const ROLE_INFO: Record<string, RoleDetail> = {
  owner: {
    label: 'Owner',
    desc: 'Full access to every module and user management',
    perms: ['dashboard', 'daybook', 'sales', 'hotel', 'bar', 'inventory', 'credits', 'banking', 'employees', 'reports', 'users', 'settings']
  },
  manager: {
    label: 'Manager',
    desc: 'Runs daily operations - everything except user management',
    perms: ['dashboard', 'daybook', 'sales', 'hotel', 'bar', 'inventory', 'credits', 'banking', 'employees', 'reports', 'settings']
  },
  cashier: {
    label: 'Cashier (Billing Counter)',
    desc: 'Records sales and day book entries; no P&L or bank visibility',
    perms: ['daybook', 'sales']
  },
  reception: {
    label: 'Receptionist',
    desc: 'Hotel check-in/out, guest register and room sales',
    perms: ['hotel', 'sales']
  },
  fnb: {
    label: 'F&B Manager',
    desc: 'Restaurant sales, food inventory and customer credits',
    perms: ['sales', 'inventory', 'credits']
  },
  barstaff: {
    label: 'Bar Counter Staff',
    desc: 'Bar sales, liquor stock and audits only',
    perms: ['bar']
  },
  accountant: {
    label: 'Accountant',
    desc: 'Read/verify money flows: day book, banking, credits, reports',
    perms: ['dashboard', 'daybook', 'credits', 'banking', 'reports']
  }
};

export const DEFAULT_USERS: User[] = [
  {
    id: 'u-owner',
    name: 'Deepa (Owner)',
    role: 'owner',
    pin: '1234',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  },
  {
    id: 'u-manager',
    name: 'Rajan (Manager)',
    role: 'manager',
    pin: '2345',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  },
  {
    id: 'u-cashier',
    name: 'Sreeja (Cashier)',
    role: 'cashier',
    pin: '3456',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  },
  {
    id: 'u-reception',
    name: 'Anitha (Reception)',
    role: 'reception',
    pin: '4567',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  },
  {
    id: 'u-fnb',
    name: 'Vinod (F&B Manager)',
    role: 'fnb',
    pin: '5678',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  },
  {
    id: 'u-bar',
    name: 'Manoj (Bar Counter)',
    role: 'barstaff',
    pin: '6789',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString()
  }
];

export const hasPerm = (user: User | null, perm: string): boolean => {
  return !!user && ROLE_INFO[user.role]?.perms.includes(perm);
};

export interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  can: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: () => {},
  logout: () => {},
  can: () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (user: User) => setCurrentUser(user);
  const logout = () => setCurrentUser(null);
  const can = (perm: string) => hasPerm(currentUser, perm);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
