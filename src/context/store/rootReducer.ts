import { GlobalState, Action } from './types';
import { salesReducer } from './reducers/salesReducer';
import { txnReducer } from './reducers/txnReducer';
import { bankReducer } from './reducers/bankReducer';
import { hotelReducer } from './reducers/hotelReducer';
import { inventoryReducer } from './reducers/inventoryReducer';
import { liquorReducer } from './reducers/liquorReducer';
import { creditsReducer } from './reducers/creditsReducer';
import { employeesReducer } from './reducers/employeesReducer';
import { miscReducer } from './reducers/miscReducer';

export const rootReducer = (
  state: GlobalState,
  action: Action,
): GlobalState => {
  const {
    sales,
    txns,
    bankMoves,
    bankStatements,
    rooms,
    stays,
    inventory,
    stockMoves,
    liquor,
    liquorAudits,
    credits,
    employees,
    leaves,
    announcements,
    banks,
    users,
    settings,
    auditLog,
  } = state;

  const newSales = salesReducer(sales, action);
  const newTxns = txnReducer(txns, action);
  const newBank = bankReducer(
    { moves: bankMoves, statements: bankStatements },
    action,
  );
  const newHotel = hotelReducer({ rooms, stays }, action);
  const newInventory = inventoryReducer(
    { items: inventory, moves: stockMoves },
    action,
  );
  const newLiquor = liquorReducer(
    { items: liquor, audits: liquorAudits },
    action,
  );
  const newCredits = creditsReducer(credits, action);
  const newEmployees = employeesReducer({ employees, leaves }, action);
  const newMisc = miscReducer(
    { announcements, banks, users, auditLog, settings },
    action,
  );

  let finalState = {
    ...state,
    sales: newSales,
    txns: newTxns,
    bankMoves: newBank.moves,
    bankStatements: newBank.statements,
    rooms: newHotel.rooms,
    stays: newHotel.stays,
    inventory: newInventory.items,
    stockMoves: newInventory.moves,
    liquor: newLiquor.items,
    liquorAudits: newLiquor.audits,
    credits: newCredits,
    employees: newEmployees.employees,
    leaves: newEmployees.leaves,
    announcements: newMisc.announcements,
    banks: newMisc.banks,
    users: newMisc.users,
    auditLog: newMisc.auditLog,
    settings: newMisc.settings,
  };

  if (action.type === 'HYDRATE') {
    finalState = {
      ...state,
      ...action.state,
      ready: true,
    };
  }

  if (action.type === 'RESET_DEMO') {
    const seed = (action as any).seed;
    if (seed) {
      finalState = {
        ...seed,
        settings: {
          ...seed.settings,
          serverUrl: state.settings.serverUrl || '',
          lastSyncedAt: state.settings.lastSyncedAt || '',
        },
      };
    }
  }

  return finalState;
};
