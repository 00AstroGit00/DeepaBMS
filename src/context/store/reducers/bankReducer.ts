import { BankMove, BankStatement, Action } from '../types';

export const bankReducer = (
  state: { moves: BankMove[]; statements: BankStatement[] } = {
    moves: [],
    statements: [],
  },
  action: Action,
): { moves: BankMove[]; statements: BankStatement[] } => {
  switch (action.type) {
    case 'ADD_BANK_MOVE':
      return { ...state, moves: [action.move, ...state.moves] };
    case 'ADD_BANK_STATEMENT':
      return { ...state, statements: [action.statement, ...state.statements] };
    case 'REMOVE_BANK_STATEMENT':
      return {
        ...state,
        statements: state.statements.filter((s) => s.id !== action.statementId),
      };
    case 'HYDRATE':
      return {
        moves: action.state.bankMoves ?? state.moves,
        statements: action.state.bankStatements ?? state.statements,
      };
    case 'RESET_DEMO':
      const seed = (action as any).seed;
      return { moves: seed.bankMoves, statements: seed.bankStatements };
    default:
      return state;
  }
};
