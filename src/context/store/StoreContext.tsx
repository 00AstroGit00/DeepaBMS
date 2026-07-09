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
import { GlobalState, Action } from './types';
import { rootReducer } from './rootReducer';
import { buildSeed } from './buildSeed';

const STORAGE_KEY = 'deepa-bms-v4';
const SERVER_URL_KEY = '@DeepaBMS:serverUrl';

export type SyncStatus =
  'idle' | 'syncing' | 'synced' | 'offline' | 'no-server';

export interface StoreContextType {
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
  syncStatus: SyncStatus;
  syncNow: (silent?: boolean) => Promise<void>;
}

const initialState: GlobalState = {
  ...buildSeed(),
  ready: false,
};

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
            setTimeout(() => syncNow(true), 500);
          }
        }
      } catch (e) {
        console.error('Hydration error', e);
      } finally {
        isLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoaded.current && state.ready) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (state.settings?.serverUrl) {
        AsyncStorage.setItem(SERVER_URL_KEY, state.settings.serverUrl);
      }
    }
  }, [state]);

  return (
    <StoreContext.Provider
      value={{ state, dispatch: dispatchAndSync, syncStatus, syncNow }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
export { buildSeed } from './buildSeed';
