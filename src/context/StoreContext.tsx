import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid, dateKey } from '../utils/helpers';
import {
  GlobalState,
  Action,
  Sale,
  Txn,
  BankMove,
  BankStatementRow,
  BankStatement,
  Guest,
  Room,
  Stay,
  InvItem,
  StockMove,
  LiquorItem,
  LiquorAudit,
  CreditHistoryItem,
  CreditAccount,
  EmployeeReview,
  EmployeeDocument,
  EmployeeAdvance,
  Employee,
  LeaveRequest,
  Announcement,
  BankAccount,
  GeneralSettings,
  AuditEvent,
} from './store/types';
import { rootReducer } from './store/rootReducer';
import { buildSeed } from './store/buildSeed';
import {
  financeForDay,
  financeForMonth,
  cashInHand,
  bankBalance,
  customerOutstanding,
  vendorPayables,
  lowStockItems,
  occupancy,
  liquorStockValue,
  inventoryValue,
  DayFinance,
  OccupancyStats,
} from './store/selectors';

const STORAGE_KEY = 'deepa-bms-v4';
const SERVER_URL_KEY = '@DeepaBMS:serverUrl';

const initialState: GlobalState = {
  ...buildSeed(),
  ready: false,
};

export type SyncStatus =
  'idle' | 'syncing' | 'synced' | 'offline' | 'no-server';

export interface StoreContextType {
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  state: initialState,
  dispatch: () => {},
  syncStatus: 'idle',
  syncNow: async () => {},
});

const WRITE_ACTIONS = new Set<string>([
  'ADD_SALE',
  'ADD_TXN',
  'PAY_SALARIES',
  'ADD_BANK_MOVE',
  'ADD_BANK_STATEMENT',
  'REMOVE_BANK_STATEMENT',
  'CHECK_IN',
  'CHECK_OUT',
  'SET_ROOM_STATUS',
  'ADD_INV_ITEM',
  'STOCK_MOVE',
  'SELL_LIQUOR',
  'LIQUOR_PURCHASE',
  'LIQUOR_AUDIT',
  'ADD_LIQUOR_ITEM',
  'UPDATE_LIQUOR_ITEM',
  'REMOVE_LIQUOR_ITEM',
  'ADD_CREDIT_ACCOUNT',
  'CREDIT_ENTRY',
  'ADD_EMPLOYEE',
  'UPDATE_EMPLOYEE',
  'MARK_ATTENDANCE',
  'BULK_ATTENDANCE',
  'ADD_ADVANCE',
  'REQUEST_LEAVE',
  'DECIDE_LEAVE',
  'ADD_REVIEW',
  'ADD_EMP_DOC',
  'REMOVE_EMP_DOC',
  'ADD_ANNOUNCEMENT',
  'REMOVE_ANNOUNCEMENT',
  'SET_PIN',
  'ADD_USER',
  'UPDATE_USER',
  'REMOVE_USER',
  'AUDIT',
]);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  const isLoaded = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const stateRef = useRef(state);
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const syncNow = useCallback(async (silent = false): Promise<void> => {
    const currentState = stateRef.current;
    const serverUrl = currentState.settings?.serverUrl?.trim();
    if (!serverUrl || !currentState.ready) {
      if (!silent) setSyncStatus('no-server');
      return;
    }
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    let targetUrl = serverUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'http://' + targetUrl;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${targetUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: currentState }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const mergedState = await res.json();

      mergedState.settings = {
        ...mergedState.settings,
        serverUrl: serverUrl,
        lastSyncedAt:
          new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }) +
          ', ' +
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
      };

      dispatch({ type: 'HYDRATE', state: mergedState });
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      setSyncStatus('offline');
      setTimeout(() => setSyncStatus('idle'), 8000);
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const dispatchAndSync = useCallback(
    (action: Action) => {
      dispatch(action);
      if (
        WRITE_ACTIONS.has(action.type) &&
        stateRef.current.settings?.serverUrl?.trim()
      ) {
        if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = setTimeout(() => syncNow(true), 200);
      }
    },
    [syncNow],
  );

  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (
        stateRef.current.settings?.serverUrl?.trim() &&
        stateRef.current.ready
      ) {
        syncNow(true);
      }
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          nextState === 'active' &&
          stateRef.current.settings?.serverUrl?.trim()
        ) {
          syncNow(true);
        }
      },
    );
    return () => subscription.remove();
  }, [syncNow]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => {
        if (
          stateRef.current.settings?.serverUrl?.trim() &&
          stateRef.current.ready
        ) {
          syncNow(true);
        }
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [syncNow]);

  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value) {
          const parsed = JSON.parse(value);
          const freshSeed = buildSeed();
          if (!parsed.users || parsed.users.length === 0)
            parsed.users = freshSeed.users;
          parsed.auditLog = parsed.auditLog || [];
          parsed.leaves = parsed.leaves || freshSeed.leaves;
          parsed.announcements =
            parsed.announcements || freshSeed.announcements;

          parsed.stays = parsed.stays || freshSeed.stays;
          parsed.rooms =
            parsed.rooms && parsed.rooms.length > 0
              ? parsed.rooms
              : freshSeed.rooms;
          parsed.banks =
            parsed.banks && parsed.banks.length > 0
              ? parsed.banks
              : freshSeed.banks;
          parsed.inventory = parsed.inventory || freshSeed.inventory;
          parsed.stockMoves = parsed.stockMoves || freshSeed.stockMoves;
          parsed.liquor = parsed.liquor || freshSeed.liquor;
          parsed.liquorAudits = parsed.liquorAudits || freshSeed.liquorAudits;
          parsed.credits = parsed.credits || freshSeed.credits;
          parsed.bankMoves = parsed.bankMoves || freshSeed.bankMoves;
          parsed.bankStatements = parsed.bankStatements || [];
          parsed.sales = parsed.sales || freshSeed.sales;
          parsed.txns = parsed.txns || freshSeed.txns;
          parsed.settings = parsed.settings || freshSeed.settings;

          parsed.employees = (parsed.employees || freshSeed.employees).map(
            (emp: any) => ({
              status: 'active',
              joinDate: '2022-01-01',
              access: 'staff',
              leaveBalance: { casual: 6, sick: 6 },
              reviews: [],
              documents: [],
              ...emp,
            }),
          );

          dispatch({ type: 'HYDRATE', state: parsed });

          const savedServerUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
          if (savedServerUrl && !parsed.settings?.serverUrl) {
            dispatch({
              type: 'HYDRATE',
              state: {
                settings: {
                  ...(parsed.settings || {}),
                  serverUrl: savedServerUrl,
                },
              },
            });
          }

          if ((parsed.settings?.serverUrl || savedServerUrl)?.trim()) {
            setTimeout(() => syncNow(true), 1500);
          }
        } else {
          dispatch({ type: 'HYDRATE', state: buildSeed() });
        }
      } catch {
        dispatch({ type: 'HYDRATE', state: buildSeed() });
      } finally {
        isLoaded.current = true;
      }
    })();
  }, [syncNow]);

  useEffect(() => {
    if (isLoaded.current && state.ready) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
      if (state.settings?.serverUrl) {
        AsyncStorage.setItem(SERVER_URL_KEY, state.settings.serverUrl).catch(
          () => {},
        );
      }
    }
  }, [state]);

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch: dispatchAndSync,
        syncStatus,
        syncNow: () => syncNow(false),
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

export function reducer(state: GlobalState, action: Action): GlobalState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state, ready: true };

    case 'ADD_SALE':
      return { ...state, sales: [action.sale, ...state.sales] };

    case 'ADD_TXN':
    case 'PAY_SALARIES':
      return { ...state, txns: [action.txn, ...state.txns] };

    case 'ADD_BANK_MOVE':
      return { ...state, bankMoves: [action.move, ...state.bankMoves] };

    case 'ADD_BANK_STATEMENT':
      return {
        ...state,
        bankStatements: [action.statement, ...(state.bankStatements || [])],
      };

    case 'REMOVE_BANK_STATEMENT':
      return {
        ...state,
        bankStatements: (state.bankStatements || []).filter(
          (s) => s.id !== action.statementId,
        ),
      };

    case 'CHECK_IN':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'occupied', guest: action.guest }
            : r,
        ),
      };

    case 'CHECK_OUT':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'cleaning', guest: undefined }
            : r,
        ),
        stays: [action.stay, ...state.stays],
        sales: [action.sale, ...state.sales],
      };

    case 'SET_ROOM_STATUS':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId ? { ...r, status: action.status } : r,
        ),
      };

    case 'ADD_INV_ITEM':
      return { ...state, inventory: [action.item, ...state.inventory] };

    case 'STOCK_MOVE': {
      const diff =
        action.move.kind === 'in' ? action.move.qty : -action.move.qty;
      return {
        ...state,
        inventory: state.inventory.map((item) =>
          item.id === action.move.itemId
            ? { ...item, stock: Math.max(0, item.stock + diff) }
            : item,
        ),
        stockMoves: [action.move, ...state.stockMoves],
      };
    }

    case 'SELL_LIQUOR': {
      const updatedLiquor = state.liquor.map((item) => {
        if (item.id !== action.itemId) return item;
        let currentML =
          item.fullBottles * item.sizeML + item.looseML - action.ml;
        if (currentML < 0) currentML = 0;
        return {
          ...item,
          fullBottles: Math.floor(currentML / item.sizeML),
          looseML: currentML % item.sizeML,
        };
      });
      return {
        ...state,
        liquor: updatedLiquor,
        sales: [action.sale, ...state.sales],
      };
    }

    case 'LIQUOR_PURCHASE':
      return {
        ...state,
        liquor: state.liquor.map((item) =>
          item.id === action.itemId
            ? { ...item, fullBottles: item.fullBottles + action.bottles }
            : item,
        ),
        txns: action.txn ? [action.txn, ...state.txns] : state.txns,
      };

    case 'LIQUOR_AUDIT':
      return { ...state, liquorAudits: [action.audit, ...state.liquorAudits] };

    case 'ADD_LIQUOR_ITEM':
      return { ...state, liquor: [action.item, ...state.liquor] };

    case 'UPDATE_LIQUOR_ITEM':
      return {
        ...state,
        liquor: state.liquor.map((l) =>
          l.id === action.item.id ? action.item : l,
        ),
      };

    case 'REMOVE_LIQUOR_ITEM':
      return {
        ...state,
        liquor: state.liquor.filter((l) => l.id !== action.itemId),
      };

    case 'ADD_CREDIT_ACCOUNT':
      return { ...state, credits: [action.account, ...state.credits] };

    case 'CREDIT_ENTRY': {
      const diff =
        action.entry.kind === 'credit'
          ? action.entry.amount
          : -action.entry.amount;
      return {
        ...state,
        credits: state.credits.map((c) =>
          c.id === action.accountId
            ? {
                ...c,
                balance: Math.max(0, c.balance + diff),
                history: [action.entry, ...c.history],
              }
            : c,
        ),
        txns: action.cashEffect
          ? [action.cashEffect, ...state.txns]
          : state.txns,
      };
    }

    case 'ADD_EMPLOYEE':
      return { ...state, employees: [action.emp, ...state.employees] };

    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.emp.id ? action.emp : e,
        ),
      };

    case 'MARK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                attendance: { ...e.attendance, [action.day]: action.status },
              }
            : e,
        ),
      };

    case 'BULK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          action.empIds.includes(e.id)
            ? {
                ...e,
                attendance: { ...e.attendance, [action.day]: action.status },
              }
            : e,
        ),
      };

    case 'ADD_ADVANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                advances: [
                  { id: uid(), date: action.txn.date, amount: action.amount },
                  ...e.advances,
                ],
              }
            : e,
        ),
        txns: [action.txn, ...state.txns],
      };

    case 'REQUEST_LEAVE':
      return { ...state, leaves: [action.leave, ...state.leaves] };

    case 'DECIDE_LEAVE': {
      const leave = state.leaves.find((l) => l.id === action.leaveId);
      if (!leave) return state;

      let updatedEmployees = state.employees;
      if (action.status === 'approved') {
        updatedEmployees = state.employees.map((emp) => {
          if (emp.id !== leave.empId) return emp;

          const updatedAttendance = { ...emp.attendance };
          const fromDate = new Date(leave.from + 'T12:00:00');
          const toDate = new Date(leave.to + 'T12:00:00');
          let safety = 0;

          while (fromDate <= toDate && safety < 62) {
            const dateStr = dateKey(fromDate);
            updatedAttendance[dateStr] = 'L';
            fromDate.setDate(fromDate.getDate() + 1);
            safety++;
          }

          const updatedBalance = { ...emp.leaveBalance };
          if (leave.type === 'casual') {
            updatedBalance.casual = Math.max(
              0,
              updatedBalance.casual - leave.days,
            );
          } else if (leave.type === 'sick') {
            updatedBalance.sick = Math.max(0, updatedBalance.sick - leave.days);
          }

          return {
            ...emp,
            attendance: updatedAttendance,
            leaveBalance: updatedBalance,
          };
        });
      }

      return {
        ...state,
        employees: updatedEmployees,
        leaves: state.leaves.map((l) =>
          l.id === action.leaveId ? { ...l, status: action.status } : l,
        ),
      };
    }

    case 'ADD_REVIEW':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, reviews: [action.review, ...e.reviews] }
            : e,
        ),
      };

    case 'ADD_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, documents: [action.doc, ...e.documents] }
            : e,
        ),
      };

    case 'REMOVE_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                documents: e.documents.filter((d) => d.id !== action.docId),
              }
            : e,
        ),
      };

    case 'ADD_ANNOUNCEMENT':
      return {
        ...state,
        announcements: [action.announcement, ...state.announcements],
      };

    case 'REMOVE_ANNOUNCEMENT':
      return {
        ...state,
        announcements: state.announcements.filter((a) => a.id !== action.id),
      };

    case 'SET_PIN':
      return { ...state, settings: { ...state.settings, pin: action.pin } };

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] };

    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.user.id ? action.user : u,
        ),
      };

    case 'REMOVE_USER':
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.userId),
      };

    case 'AUDIT':
      return {
        ...state,
        auditLog: [action.event, ...state.auditLog].slice(0, 500),
      };

    case 'RESET_DEMO': {
      const { serverUrl, lastSyncedAt } = state.settings;
      const seed = buildSeed();
      return {
        ...seed,
        settings: {
          ...seed.settings,
          serverUrl: serverUrl || '',
          lastSyncedAt: lastSyncedAt || '',
        },
      };
    }

    default:
      return state;
  }
}

export {
  Sale,
  Txn,
  BankMove,
  BankStatementRow,
  BankStatement,
  Guest,
  Room,
  Stay,
  InvItem,
  StockMove,
  LiquorItem,
  LiquorAudit,
  CreditHistoryItem,
  CreditAccount,
  EmployeeReview,
  EmployeeDocument,
  EmployeeAdvance,
  Employee,
  LeaveRequest,
  Announcement,
  BankAccount,
  GeneralSettings,
  AuditEvent,
  GlobalState,
  Action,
};
export {
  buildSeed,
  financeForDay,
  financeForMonth,
  cashInHand,
  bankBalance,
  customerOutstanding,
  vendorPayables,
  lowStockItems,
  occupancy,
  liquorStockValue,
  inventoryValue,
};
export type { DayFinance, OccupancyStats };
