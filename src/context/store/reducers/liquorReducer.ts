import { LiquorItem, LiquorAudit, Action } from '../types';

export const liquorReducer = (
  state: { items: LiquorItem[]; audits: LiquorAudit[] } = {
    items: [],
    audits: [],
  },
  action: Action,
): { items: LiquorItem[]; audits: LiquorAudit[] } => {
  switch (action.type) {
    case 'SELL_LIQUOR': {
      const updatedLiquor = state.items.map((item) => {
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
      return { ...state, items: updatedLiquor };
    }
    case 'LIQUOR_PURCHASE':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.itemId
            ? { ...item, fullBottles: item.fullBottles + action.bottles }
            : item,
        ),
      };
    case 'LIQUOR_AUDIT':
      return { ...state, audits: [action.audit, ...state.audits] };
    case 'ADD_LIQUOR_ITEM':
      return { ...state, items: [action.item, ...state.items] };
    case 'UPDATE_LIQUOR_ITEM':
      return {
        ...state,
        items: state.items.map((l) =>
          l.id === action.item.id ? action.item : l,
        ),
      };
    case 'REMOVE_LIQUOR_ITEM':
      return {
        ...state,
        items: state.items.filter((l) => l.id !== action.itemId),
      };
    case 'HYDRATE':
      return {
        items: action.state.liquor ?? state.items,
        audits: action.state.liquorAudits ?? state.audits,
      };
    case 'RESET_DEMO':
      const seed = (action as any).seed;
      return { items: seed.liquor, audits: seed.liquorAudits };
    default:
      return state;
  }
};
