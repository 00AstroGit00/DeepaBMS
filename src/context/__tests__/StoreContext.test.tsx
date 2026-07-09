import { reducer, buildSeed } from '../StoreContext';
import { uid } from '../../utils/helpers';

describe('Global Store Reducer', () => {
  const seedState = buildSeed();

  test('ADD_SALE appends to sales register and affects DayBook flows', () => {
    const saleRecord = {
      id: uid(),
      date: new Date().toISOString(),
      dept: 'restaurant' as const,
      description: 'Test dinner party',
      amount: 1000,
      gstRate: 5,
      gstAmount: 50,
      total: 1050,
      mode: 'cash' as const
    };

    const nextState = reducer(seedState, {
      type: 'ADD_SALE',
      sale: saleRecord
    });

    expect(nextState.sales).toHaveLength(seedState.sales.length + 1);
    expect(nextState.sales[0]).toEqual(saleRecord);
  });

  test('ADD_TXN adds a transaction (e.g. expense)', () => {
    const txnRecord = {
      id: uid(),
      date: new Date().toISOString(),
      kind: 'expense' as const,
      category: 'Provisions',
      amount: 200,
      description: 'Buy vegetables',
      bankId: undefined,
      mode: 'cash' as const
    };

    const nextState = reducer(seedState, {
      type: 'ADD_TXN',
      txn: txnRecord
    });

    expect(nextState.txns).toHaveLength(seedState.txns.length + 1);
    expect(nextState.txns[0]).toEqual(txnRecord);
  });

  test('SELL_LIQUOR deducts peg volumes and registers a bar sale', () => {
    const barItem = seedState.liquor[0];
    const initialML = barItem.fullBottles * barItem.sizeML + barItem.looseML;

    const saleRecord = {
      id: uid(),
      date: new Date().toISOString(),
      dept: 'bar' as const,
      description: `${barItem.brand} Peg Sale`,
      amount: barItem.pricePerPeg,
      gstRate: 0,
      gstAmount: 0,
      total: barItem.pricePerPeg,
      mode: 'cash' as const
    };

    const nextState = reducer(seedState, {
      type: 'SELL_LIQUOR',
      itemId: barItem.id,
      ml: 30, // sell 1 peg of 30ml
      sale: saleRecord
    });

    const updatedItem = nextState.liquor.find((item) => item.id === barItem.id)!;
    const finalML = updatedItem.fullBottles * updatedItem.sizeML + updatedItem.looseML;

    expect(initialML - finalML).toBe(30);
    expect(nextState.sales).toHaveLength(seedState.sales.length + 1);
  });

  test('CHECK_IN puts a guest in a room', () => {
    const room = seedState.rooms.find((r) => r.status === 'vacant')!;
    const guestDetail = {
      name: 'Guest A',
      phone: '9999999999',
      idProof: 'Aadhaar 1234',
      adults: 2,
      address: 'Kochi',
      checkIn: new Date().toISOString(),
      advance: 500,
      advanceMode: 'upi' as const
    };

    const nextState = reducer(seedState, {
      type: 'CHECK_IN',
      roomId: room.id,
      guest: guestDetail
    });

    const updatedRoom = nextState.rooms.find((r) => r.id === room.id)!;
    expect(updatedRoom.status).toBe('occupied');
    expect(updatedRoom.guest).toEqual(guestDetail);
  });

  test('RESET_DEMO reverts database back to initial seeds', () => {
    const stateWithModifications = {
      ...seedState,
      sales: []
    };

    const resetState = reducer(stateWithModifications, {
      type: 'RESET_DEMO'
    });

    expect(resetState.sales.length).toBeGreaterThan(0);
    expect(resetState.ready).toBe(true);
  });
});
