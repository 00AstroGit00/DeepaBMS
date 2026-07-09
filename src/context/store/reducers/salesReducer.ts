import { Sale, Action } from '../types';

export const salesReducer = (state: Sale[] = [], action: Action): Sale[] => {
  switch (action.type) {
    case 'ADD_SALE':
      return [action.sale, ...state];
    case 'CHECK_OUT':
      return [action.sale, ...state];
    case 'SELL_LIQUOR':
      return [action.sale, ...state];
    case 'HYDRATE':
      return action.state.sales ?? state;
    case 'RESET_DEMO':
      return (action as any).seed.sales ?? state;
    default:
      return state;
  }
};
