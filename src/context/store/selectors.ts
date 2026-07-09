import { GlobalState } from './types';
import { keyOf, todayKey } from '../../utils/helpers';

export interface DayFinance {
  revenue: number;
  restaurant: number;
  bar: number;
  rooms: number;
  takeaway: number;
  online: number;
  expenses: number;
  purchases: number;
  otherIncome: number;
  profit: number;
  gstCollected: number;
}

export const financeForDay = (state: GlobalState, day: string): DayFinance => {
  const data: DayFinance = {
    revenue: 0,
    restaurant: 0,
    bar: 0,
    rooms: 0,
    takeaway: 0,
    online: 0,
    expenses: 0,
    purchases: 0,
    otherIncome: 0,
    profit: 0,
    gstCollected: 0,
  };

  state.sales.forEach((s) => {
    if (keyOf(s.date) === day) {
      data.revenue += s.total;
      data.gstCollected += s.gstAmount;
      if (s.dept in data) {
        (data as any)[s.dept] += s.total;
      }
    }
  });

  state.txns.forEach((t) => {
    if (keyOf(t.date) === day) {
      if (t.kind === 'expense') {
        data.expenses += t.amount;
        if (
          [
            'Provisions',
            'Meat & Fish',
            'Liquor Purchase',
            'Soft Drinks Purchase',
          ].includes(t.category)
        ) {
          data.purchases += t.amount;
        }
      } else {
        data.otherIncome += t.amount;
      }
    }
  });

  data.profit = data.revenue + data.otherIncome - data.expenses;
  return data;
};

export const financeForMonth = (state: GlobalState): DayFinance => {
  const currentMonthPrefix = todayKey().slice(0, 7);
  const data: DayFinance = {
    revenue: 0,
    restaurant: 0,
    bar: 0,
    rooms: 0,
    takeaway: 0,
    online: 0,
    expenses: 0,
    purchases: 0,
    otherIncome: 0,
    profit: 0,
    gstCollected: 0,
  };

  state.sales.forEach((s) => {
    if (keyOf(s.date).startsWith(currentMonthPrefix)) {
      data.revenue += s.total;
      data.gstCollected += s.gstAmount;
      if (s.dept in data) {
        (data as any)[s.dept] += s.total;
      }
    }
  });

  state.txns.forEach((t) => {
    if (keyOf(t.date).startsWith(currentMonthPrefix)) {
      if (t.kind === 'expense') {
        data.expenses += t.amount;
        if (
          [
            'Provisions',
            'Meat & Fish',
            'Liquor Purchase',
            'Soft Drinks Purchase',
          ].includes(t.category)
        ) {
          data.purchases += t.amount;
        }
      } else {
        data.otherIncome += t.amount;
      }
    }
  });

  data.profit = data.revenue + data.otherIncome - data.expenses;
  return data;
};

export const cashInHand = (state: GlobalState): number => {
  let cash = state.settings.openingCash;
  state.sales.forEach((s) => {
    if (s.mode === 'cash') cash += s.total;
  });
  state.txns.forEach((t) => {
    if (t.mode === 'cash') {
      cash += t.kind === 'income' ? t.amount : -t.amount;
    }
  });
  state.bankMoves.forEach((bm) => {
    if (bm.kind === 'deposit') cash -= bm.amount;
    if (bm.kind === 'withdraw') cash += bm.amount;
  });
  return cash;
};

export const bankBalance = (state: GlobalState, bankId?: string): number => {
  let bal = 0;
  state.banks.forEach((b) => {
    if (!bankId || b.id === bankId) bal += b.baseBalance;
  });

  const matchesBank = (id: string) => !bankId || id === bankId;

  state.sales.forEach((s) => {
    if (
      ['upi', 'card', 'bank'].includes(s.mode) &&
      matchesBank(state.settings.defaultBankId)
    ) {
      bal += s.total;
    }
  });

  state.txns.forEach((t) => {
    const txnBankId = t.bankId || state.settings.defaultBankId;
    if (t.mode === 'bank' && matchesBank(txnBankId)) {
      bal += t.kind === 'income' ? t.amount : -t.amount;
    }
  });

  state.bankMoves.forEach((bm) => {
    if (bm.kind === 'deposit' && matchesBank(bm.bankId)) bal += bm.amount;
    if (bm.kind === 'withdraw' && matchesBank(bm.bankId)) bal -= bm.amount;
    if (bm.kind === 'transfer') {
      if (matchesBank(bm.bankId)) bal -= bm.amount;
      if (bm.toBankId && matchesBank(bm.toBankId)) bal += bm.amount;
    }
  });

  return bal;
};

export const customerOutstanding = (state: GlobalState): number => {
  return state.credits
    .filter((c) => c.type === 'customer')
    .reduce((sum, current) => sum + current.balance, 0);
};

export const vendorPayables = (state: GlobalState): number => {
  return state.credits
    .filter((c) => c.type === 'vendor')
    .reduce((sum, current) => sum + current.balance, 0);
};

export const lowStockItems = (state: GlobalState) => {
  return state.inventory.filter((item) => item.stock <= item.reorder);
};

export interface OccupancyStats {
  occupied: number;
  total: number;
  pct: number;
}

export const occupancy = (state: GlobalState): OccupancyStats => {
  const occupiedCount = state.rooms.filter(
    (r) => r.status === 'occupied',
  ).length;
  const totalCount = state.rooms.length;
  return {
    occupied: occupiedCount,
    total: totalCount,
    pct: totalCount ? Math.round((occupiedCount / totalCount) * 100) : 0,
  };
};

export const liquorStockValue = (state: GlobalState): number => {
  return state.liquor.reduce((sum, item) => {
    const qty = item.fullBottles + item.looseML / item.sizeML;
    return sum + qty * item.costPerBottle;
  }, 0);
};

export const inventoryValue = (state: GlobalState): number => {
  return state.inventory.reduce((sum, item) => sum + item.stock * item.cost, 0);
};
