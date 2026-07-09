import { InvItem, StockMove, Action } from '../types';

export const inventoryReducer = (
  state: { items: InvItem[]; moves: StockMove[] } = { items: [], moves: [] },
  action: Action,
): { items: InvItem[]; moves: StockMove[] } => {
  switch (action.type) {
    case 'ADD_INV_ITEM':
      return { ...state, items: [action.item, ...state.items] };
    case 'STOCK_MOVE': {
      const diff =
        action.move.kind === 'in' ? action.move.qty : -action.move.qty;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.move.itemId
            ? { ...item, stock: Math.max(0, item.stock + diff) }
            : item,
        ),
        moves: [action.move, ...state.moves],
      };
    }
    case 'HYDRATE':
      return {
        items: action.state.inventory ?? state.items,
        moves: action.state.stockMoves ?? state.moves,
      };
    case 'RESET_DEMO':
      const seed = (action as any).seed;
      return { items: seed.inventory, moves: seed.stockMoves };
    default:
      return state;
  }
};
