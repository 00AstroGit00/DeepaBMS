import { GlobalState, Action } from '../types';
import { salesReducer } from './salesReducer';
import { txnReducer } from './txnReducer';
import { bankReducer } from './bankReducer';
import { hotelReducer } from './hotelReducer';
import { inventoryReducer } from './inventoryReducer';
import { liquorReducer } from './liquorReducer';
import { creditsReducer } from './creditsReducer';
import { employeesReducer } from './employeesReducer';
import { miscReducer } from './miscReducer';

export const rootReducer = (
  state: GlobalState,
  action: Action,
): GlobalState => {
  const bankState = bankReducer(
    { moves: state.bankMoves, statements: state.bankStatements },
    action,
  );
  const hotelState = hotelReducer(
    { rooms: state.rooms, stays: state.stays },
    action,
  );
  const invState = inventoryReducer(
    { items: state.inventory, moves: state.stockMoves },
    action,
  );
  const liqState = liquorReducer(
    { items: state.liquor, audits: state.liquorAudits },
    action,
  );
  const empState = employeesReducer(
    { employees: state.employees, leaves: state.leaves },
    action,
  );
  const miscState = miscReducer(
    {
      announcements: state.announcements,
      banks: state.banks,
      users: state.users,
      auditLog: state.auditLog,
      settings: state.settings,
    },
    action,
  );

  return {
    ...state,
    sales: salesReducer(state.sales, action),
    txns: txnReducer(state.txns, action),
    bankMoves: bankState.moves,
    bankStatements: bankState.statements,
    rooms: hotelState.rooms,
    stays: hotelState.stays,
    inventory: invState.items,
    stockMoves: invState.moves,
    liquor: liqState.items,
    liquorAudits: liqState.audits,
    credits: creditsReducer(state.credits, action),
    employees: empState.employees,
    leaves: empState.leaves,
    announcements: miscState.announcements,
    banks: miscState.banks,
    users: miscState.users,
    auditLog: miscState.auditLog,
    settings: miscState.settings,
    ready: state.ready,
  };
};
