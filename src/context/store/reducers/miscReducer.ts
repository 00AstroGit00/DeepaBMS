import {
  Announcement,
  BankAccount,
  User,
  AuditEvent,
  GeneralSettings,
  Action,
} from '../types';

export const miscReducer = (
  state: {
    announcements: Announcement[];
    banks: BankAccount[];
    users: User[];
    auditLog: AuditEvent[];
    settings: GeneralSettings;
  } = {
    announcements: [],
    banks: [],
    users: [],
    auditLog: [],
    settings: {} as GeneralSettings,
  },
  action: Action,
) => {
  switch (action.type) {
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
    case 'HYDRATE':
      return {
        announcements: action.state.announcements ?? state.announcements,
        banks:
          action.state.banks && action.state.banks.length > 0
            ? action.state.banks
            : state.banks,
        users: action.state.users ?? state.users,
        auditLog: action.state.auditLog ?? state.auditLog,
        settings: action.state.settings ?? state.settings,
      };
    case 'RESET_DEMO': {
      const seed = (action as any).seed;
      const { serverUrl, lastSyncedAt } = state.settings;
      return {
        announcements: seed.announcements,
        banks: seed.banks,
        users: seed.users,
        auditLog: seed.auditLog,
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
};
