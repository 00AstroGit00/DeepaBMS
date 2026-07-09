import { Txn, Action } from '../types';

export const txnReducer = (state: Txn[] = [], action: Action): Txn[] => {
  switch (action.type) {
    case 'ADD_TXN':
    case 'PAY_SALARIES':
      return [action.txn, ...state];
    case 'LIQUOR_PURCHASE':
      return action.txn ? [action.txn, ...state] : state;
    case 'CREDIT_ENTRY':
      return action.cashEffect ? [action.cashEffect, ...state] : state;
    case 'ADD_ADVANCE':
      return [action.txn, ...state];
    case 'HYDRATE':
      return action.state.txns ?? state;
    case 'RESET_DEMO':
      return (action as any).seed.txns ?? state;
    default:
      return state;
  }
};
