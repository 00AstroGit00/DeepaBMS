import { CreditAccount, Action } from '../types';

export const creditsReducer = (
  state: CreditAccount[] = [],
  action: Action,
): CreditAccount[] => {
  switch (action.type) {
    case 'ADD_CREDIT_ACCOUNT':
      return [action.account, ...state];
    case 'CREDIT_ENTRY': {
      const diff =
        action.entry.kind === 'credit'
          ? action.entry.amount
          : -action.entry.amount;
      return state.map((c) =>
        c.id === action.accountId
          ? {
              ...c,
              balance: Math.max(0, c.balance + diff),
              history: [action.entry, ...c.history],
            }
          : c,
      );
    }
    case 'HYDRATE':
      return action.state.credits ?? state;
    case 'RESET_DEMO':
      return (action as any).seed.credits ?? state;
    default:
      return state;
  }
};
