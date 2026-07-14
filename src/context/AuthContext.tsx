import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from './store/types';
import { isBiometricAvailable } from '../utils/biometrics';

export { User };

const SESSION_KEY = '@DeepaBMS:session';
const BIOMETRIC_KEY = '@DeepaBMS:biometric';

export interface RoleDetail {
  label: string;
  desc: string;
  perms: string[];
}

export const ROLE_INFO: Record<string, RoleDetail> = {
  owner: {
    label: 'Owner',
    desc: 'Full access to every module and user management',
    perms: [
      'dashboard',
      'daybook',
      'sales',
      'hotel',
      'bar',
      'inventory',
      'credits',
      'banking',
      'employees',
      'reports',
      'users',
      'settings',
    ],
  },
  manager: {
    label: 'Manager',
    desc: 'Runs daily operations - everything except user management',
    perms: [
      'dashboard',
      'daybook',
      'sales',
      'hotel',
      'bar',
      'inventory',
      'credits',
      'banking',
      'employees',
      'reports',
      'settings',
    ],
  },
  cashier: {
    label: 'Cashier (Billing Counter)',
    desc: 'Day book entries only; maximum 4-day view history; no sales reports or bank visibility',
    perms: ['daybook'],
  },
  reception: {
    label: 'Receptionist',
    desc: 'Hotel check-in/out, guest register and room sales',
    perms: ['hotel', 'sales'],
  },
  fnb: {
    label: 'F&B Manager',
    desc: 'Restaurant sales, food inventory and customer credits',
    perms: ['sales', 'inventory', 'credits'],
  },
  barstaff: {
    label: 'Bar Counter Staff',
    desc: 'Bar sales, liquor stock and audits only',
    perms: ['bar'],
  },
  accountant: {
    label: 'Accountant',
    desc: 'Read/verify money flows: day book, banking, credits, reports',
    perms: ['dashboard', 'daybook', 'credits', 'banking', 'reports'],
  },
  employee: {
    label: 'Employee',
    desc: 'View own profile, attendance, leave balance, payslips, and apply for leave/advances',
    perms: ['selfservice'],
  },
};

export const DEFAULT_USERS: User[] = [
  {
    id: 'u-owner',
    name: 'Deepa (Owner)',
    role: 'owner',
    pin: '1234',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-manager',
    name: 'Rajan (Manager)',
    role: 'manager',
    pin: '2345',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-cashier',
    name: 'Sreeja (Cashier)',
    role: 'cashier',
    pin: '3456',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-reception',
    name: 'Anitha (Reception)',
    role: 'reception',
    pin: '4567',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-fnb',
    name: 'Vinod (F&B Manager)',
    role: 'fnb',
    pin: '5678',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-bar',
    name: 'Manoj (Bar Counter)',
    role: 'barstaff',
    pin: '6789',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
  {
    id: 'u-emp-01',
    name: 'Suresh (Staff)',
    role: 'employee',
    pin: '1111',
    active: true,
    createdAt: new Date('2025-09-22T00:00:00Z').toISOString(),
  },
];

export const hasPerm = (user: User | null, perm: string): boolean => {
  return !!user && ROLE_INFO[user.role]?.perms.includes(perm);
};

export interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  can: (perm: string) => boolean;
  savedUserId: string | null;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: () => {},
  logout: () => {},
  can: () => false,
  savedUserId: null,
  biometricEnabled: false,
  biometricAvailable: false,
  enableBiometric: async () => {},
  disableBiometric: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [session, biom] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(BIOMETRIC_KEY),
        ]);
        if (session) setSavedUserId(session);
        if (biom === 'true') setBiometricEnabled(true);
        const avail = await isBiometricAvailable();
        setBiometricAvailable(avail);
      } catch {
        // ignore
      }
    })();
  }, []);

  const login = useCallback(
    async (user: User) => {
      setCurrentUser(user);
      await AsyncStorage.setItem(SESSION_KEY, user.id);
      setSavedUserId(user.id);
    },
    [],
  );

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
    setSavedUserId(null);
    setBiometricEnabled(false);
  }, []);

  const can = useCallback(
    (perm: string) => hasPerm(currentUser, perm),
    [currentUser],
  );

  const enableBiometric = useCallback(async () => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
    setBiometricEnabled(true);
  }, []);

  const disableBiometric = useCallback(async () => {
    await AsyncStorage.removeItem(BIOMETRIC_KEY);
    setBiometricEnabled(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        can,
        savedUserId,
        biometricEnabled,
        biometricAvailable,
        enableBiometric,
        disableBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
