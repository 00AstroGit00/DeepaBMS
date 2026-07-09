import { cashInHand, bankBalance, customerOutstanding, vendorPayables, inventoryValue, liquorStockValue, financeForMonth, GlobalState } from '../context/StoreContext';
import { todayKey, keyOf } from './helpers';

// Helper formatting functions matches original module_946 implementation
const fmtNumber = (val: number): string => {
  return Math.abs(val).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};

const fmtDateRegister = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const fmtTimeRegister = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPeriodMonthName = (): string => {
  return new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });
};

const generateReportCode = (prefix: string): string => {
  const datePart = todayKey().replace(/-/g, '');
  return `${prefix}/${datePart}`;
};

export interface ReportSection {
  heading?: string;
  headers: string[];
  align: ('l' | 'r' | 'c')[];
  rows: string[][];
  totalsRow?: string[];
}

export interface PrintableReport {
  code: string;
  title: string;
  period: string;
  sections: ReportSection[];
  summary: [string, string][];
  notes: string[];
}

// 1. Day Book
export const buildDayBook = (state: GlobalState, dateStr: string = todayKey()): PrintableReport => {
  interface DayBookItem {
    time: string;
    iso: string;
    particulars: string;
    ref: string;
    cashIn: number;
    bankIn: number;
    cashOut: number;
    bankOut: number;
  }

  const items: DayBookItem[] = [];

  state.sales.forEach((s) => {
    if (keyOf(s.date) === dateStr) {
      const isCash = s.mode === 'cash';
      const isBank = s.mode === 'upi' || s.mode === 'card' || s.mode === 'bank';
      items.push({
        time: fmtTimeRegister(s.date),
        iso: s.date,
        particulars: `${s.dept.toUpperCase()} sale - ${s.description}`,
        ref: s.billNo || '-',
        cashIn: isCash ? s.total : 0,
        bankIn: isBank ? s.total : 0,
        cashOut: 0,
        bankOut: 0
      });
    }
  });

  state.txns.forEach((t) => {
    if (keyOf(t.date) === dateStr) {
      const isCash = t.mode === 'cash';
      if (t.kind === 'income') {
        items.push({
          time: fmtTimeRegister(t.date),
          iso: t.date,
          particulars: `${t.category} - ${t.description}`,
          ref: '-',
          cashIn: isCash ? t.amount : 0,
          bankIn: isCash ? 0 : t.amount,
          cashOut: 0,
          bankOut: 0
        });
      } else {
        items.push({
          time: fmtTimeRegister(t.date),
          iso: t.date,
          particulars: `${t.category} - ${t.description}`,
          ref: t.hasBill ? 'Bill att.' : '-',
          cashIn: 0,
          bankIn: 0,
          cashOut: isCash ? t.amount : 0,
          bankOut: isCash ? 0 : t.amount
        });
      }
    }
  });

  state.bankMoves.forEach((bm) => {
    if (keyOf(bm.date) === dateStr) {
      if (bm.kind === 'deposit') {
        items.push({
          time: fmtTimeRegister(bm.date),
          iso: bm.date,
          particulars: `Contra - cash deposited to bank (${bm.note})`,
          ref: 'C',
          cashIn: 0,
          bankIn: bm.amount,
          cashOut: bm.amount,
          bankOut: 0
        });
      } else if (bm.kind === 'withdraw') {
        items.push({
          time: fmtTimeRegister(bm.date),
          iso: bm.date,
          particulars: `Contra - cash withdrawn from bank (${bm.note})`,
          ref: 'C',
          cashIn: bm.amount,
          bankIn: 0,
          cashOut: 0,
          bankOut: bm.amount
        });
      } else {
        items.push({
          time: fmtTimeRegister(bm.date),
          iso: bm.date,
          particulars: `Bank transfer - ${bm.note}`,
          ref: 'C',
          cashIn: 0,
          bankIn: 0,
          cashOut: 0,
          bankOut: 0
        });
      }
    }
  });

  items.sort((a, b) => a.iso.localeCompare(b.iso));

  const totalCashIn = items.reduce((sum, item) => sum + item.cashIn, 0);
  const totalBankIn = items.reduce((sum, item) => sum + item.bankIn, 0);
  const totalCashOut = items.reduce((sum, item) => sum + item.cashOut, 0);
  const totalBankOut = items.reduce((sum, item) => sum + item.bankOut, 0);

  const closingCash = cashInHand(state);
  const openingCash = closingCash - (totalCashIn - totalCashOut);

  const rows: string[][] = [
    ['-', 'OPENING BALANCE b/d', '-', fmtNumber(openingCash), '', '', ''],
    ...items.map((item) => [
      item.time,
      item.particulars,
      item.ref,
      item.cashIn ? fmtNumber(item.cashIn) : '',
      item.bankIn ? fmtNumber(item.bankIn) : '',
      item.cashOut ? fmtNumber(item.cashOut) : '',
      item.bankOut ? fmtNumber(item.bankOut) : ''
    ])
  ];

  return {
    code: generateReportCode('DRTH/DB'),
    title: 'DAY BOOK (Double-Column Cash Book)',
    period: `For the day: ${fmtDateRegister(dateStr + 'T12:00:00')}`,
    sections: [
      {
        headers: ['Time', 'Particulars', 'Ref/Bill', 'Cash In (Rs)', 'Bank In (Rs)', 'Cash Out (Rs)', 'Bank Out (Rs)'],
        align: ['l', 'l', 'l', 'r', 'r', 'r', 'r'],
        rows,
        totalsRow: ['', 'TOTAL', '', fmtNumber(openingCash + totalCashIn), fmtNumber(totalBankIn), fmtNumber(totalCashOut), fmtNumber(totalBankOut)]
      }
    ],
    summary: [
      ['Opening Cash b/d', `Rs ${fmtNumber(openingCash)}`],
      ['Total Receipts (Cash + Bank)', `Rs ${fmtNumber(totalCashIn + totalBankIn)}`],
      ['Total Payments (Cash + Bank)', `Rs ${fmtNumber(totalCashOut + totalBankOut)}`],
      ['CLOSING CASH c/d', `Rs ${fmtNumber(closingCash)}`]
    ],
    notes: [
      'Ref "C" denotes contra entries (cash-bank transfers) - not income or expense.',
      'Bank column includes UPI, card and NEFT settlements to the default current account.',
      'Closing cash c/d becomes opening balance b/d of the next working day.'
    ]
  };
};

// 2. Sales Register
export const buildSalesRegister = (state: GlobalState): PrintableReport => {
  const monthKey = todayKey().slice(0, 7);
  const periodSales = state.sales
    .filter((s) => keyOf(s.date).startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows = periodSales.map((s, index) => [
    String(index + 1),
    fmtDateRegister(s.date),
    s.billNo || '-',
    s.dept.toUpperCase(),
    s.description,
    fmtNumber(s.amount),
    s.gstRate ? `${s.gstRate}%` : 'NON-GST',
    fmtNumber(s.gstAmount / 2),
    fmtNumber(s.gstAmount / 2),
    fmtNumber(s.total),
    s.mode.toUpperCase()
  ]);

  const totalTaxable = periodSales.reduce((sum, s) => sum + s.amount, 0);
  const totalGst = periodSales.reduce((sum, s) => sum + s.gstAmount, 0);
  const totalGross = periodSales.reduce((sum, s) => sum + s.total, 0);

  const gstRatesMap = new Map<number, { taxable: number; tax: number }>();
  periodSales.forEach((s) => {
    const rate = s.gstRate;
    const current = gstRatesMap.get(rate) || { taxable: 0, tax: 0 };
    current.taxable += s.amount;
    current.tax += s.gstAmount;
    gstRatesMap.set(rate, current);
  });

  const rateRows = Array.from(gstRatesMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([rate, vals]) => [
      rate ? `${rate}%` : 'Non-GST (liquor)',
      fmtNumber(vals.taxable),
      fmtNumber(vals.tax / 2),
      fmtNumber(vals.tax / 2),
      fmtNumber(vals.taxable + vals.tax)
    ]);

  return {
    code: generateReportCode('DRTH/SR'),
    title: 'SALES REGISTER (Outward Supplies)',
    period: `For the month: ${getPeriodMonthName()}`,
    sections: [
      {
        heading: 'A. Invoice-level Listing',
        headers: ['Sl', 'Date', 'Bill No', 'Dept', 'Description', 'Taxable (Rs)', 'Rate', 'CGST (Rs)', 'SGST (Rs)', 'Total (Rs)', 'Mode'],
        align: ['r', 'l', 'l', 'l', 'l', 'r', 'l', 'r', 'r', 'r', 'l'],
        rows,
        totalsRow: ['', '', '', '', 'TOTAL', fmtNumber(totalTaxable), '', fmtNumber(totalGst / 2), fmtNumber(totalGst / 2), fmtNumber(totalGross), '']
      },
      {
        heading: 'B. Rate-wise Summary (for GSTR-1 / GSTR-3B Table 3.1)',
        headers: ['GST Rate', 'Taxable Value (Rs)', 'CGST (Rs)', 'SGST (Rs)', 'Invoice Value (Rs)'],
        align: ['l', 'r', 'r', 'r', 'r'],
        rows: rateRows,
        totalsRow: ['TOTAL', fmtNumber(totalTaxable), fmtNumber(totalGst / 2), fmtNumber(totalGst / 2), fmtNumber(totalGross)]
      }
    ],
    summary: [
      ['Total invoices', String(periodSales.length)],
      ['Taxable turnover', `Rs ${fmtNumber(totalTaxable)}`],
      ['Output GST (CGST+SGST)', `Rs ${fmtNumber(totalGst)}`],
      ['Gross sales', `Rs ${fmtNumber(totalGross)}`]
    ],
    notes: [
      'All supplies are intra-state (Kerala); IGST not applicable.',
      'Liquor sales are non-GST supplies under Entry 54, State List; reported in GSTR-1 Table 8 as non-GST outward supply.',
      'Restaurant & room services taxed @5% without ITC (GST 2.0, w.e.f. 22-Sep-2025).'
    ]
  };
};

// 3. Expense Register
export const buildExpenseRegister = (state: GlobalState): PrintableReport => {
  const monthKey = todayKey().slice(0, 7);
  const periodExpenses = state.txns
    .filter((t) => t.kind === 'expense' && keyOf(t.date).startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  const rows = periodExpenses.map((t, index) => [
    String(index + 1),
    fmtDateRegister(t.date),
    t.category,
    t.description,
    t.mode.toUpperCase(),
    t.hasBill ? 'Yes' : 'No',
    fmtNumber(t.amount)
  ]);

  const totalExpense = periodExpenses.reduce((sum, t) => sum + t.amount, 0);

  const categoriesMap = new Map<string, number>();
  periodExpenses.forEach((t) => {
    categoriesMap.set(t.category, (categoriesMap.get(t.category) || 0) + t.amount);
  });

  const catRows = Array.from(categoriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [
      cat,
      fmtNumber(amt),
      `${((amt / (totalExpense || 1)) * 100).toFixed(1)}%`
    ]);

  return {
    code: generateReportCode('DRTH/ER'),
    title: 'EXPENSE REGISTER',
    period: `For the month: ${getPeriodMonthName()}`,
    sections: [
      {
        heading: 'A. Voucher-level Listing',
        headers: ['Sl', 'Date', 'Category', 'Particulars', 'Mode', 'Bill', 'Amount (Rs)'],
        align: ['r', 'l', 'l', 'l', 'l', 'l', 'r'],
        rows,
        totalsRow: ['', '', '', '', '', 'TOTAL', fmtNumber(totalExpense)]
      },
      {
        heading: 'B. Category-wise Analysis',
        headers: ['Category', 'Amount (Rs)', '% of Total'],
        align: ['l', 'r', 'r'],
        rows: catRows,
        totalsRow: ['TOTAL', fmtNumber(totalExpense), '100%']
      }
    ],
    summary: [
      ['Total vouchers', String(periodExpenses.length)],
      ['Total expenses', `Rs ${fmtNumber(totalExpense)}`],
      ['With supporting bills', `${periodExpenses.filter((e) => e.hasBill).length} of ${periodExpenses.length}`]
    ],
    notes: [
      'Vouchers marked "Bill: Yes" carry scanned supporting documents inside Deepa BMS.'
    ]
  };
};

// 4. Profit & Loss Statement
export const buildPL = (state: GlobalState): PrintableReport => {
  const monthKey = todayKey().slice(0, 7);
  const finance = financeForMonth(state);

  const expensesMap = new Map<string, number>();
  state.txns.forEach((t) => {
    if (t.kind === 'expense' && keyOf(t.date).startsWith(monthKey)) {
      expensesMap.set(t.category, (expensesMap.get(t.category) || 0) + t.amount);
    }
  });

  const totalIncome = finance.revenue + finance.otherIncome;
  const incomeRows = [
    ['Restaurant sales (incl. GST)', fmtNumber(finance.restaurant)],
    ['Bar sales (non-GST)', fmtNumber(finance.bar)],
    ['Room revenue (incl. GST)', fmtNumber(finance.rooms)],
    ['Takeaway & online orders', fmtNumber(finance.takeaway + finance.online)],
    ['Other income', fmtNumber(finance.otherIncome)]
  ];

  const expenseRows = Array.from(expensesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => [cat, fmtNumber(amt)]);

  return {
    code: generateReportCode('DRTH/PL'),
    title: 'PROFIT & LOSS STATEMENT',
    period: `For the month: ${getPeriodMonthName()}`,
    sections: [
      {
        heading: 'A. Income',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: incomeRows,
        totalsRow: ['TOTAL INCOME (A)', fmtNumber(totalIncome)]
      },
      {
        heading: 'B. Expenses',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: expenseRows,
        totalsRow: ['TOTAL EXPENSES (B)', fmtNumber(finance.expenses)]
      },
      {
        heading: 'C. Result',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: [[finance.profit >= 0 ? 'NET PROFIT (A - B)' : 'NET LOSS (A - B)', fmtNumber(finance.profit)]]
      }
    ],
    summary: [
      ['Total income', `Rs ${fmtNumber(totalIncome)}`],
      ['Total expenses', `Rs ${fmtNumber(finance.expenses)}`],
      ['Net result', `Rs ${fmtNumber(finance.profit)} ${finance.profit >= 0 ? '(Profit)' : '(Loss)'}`],
      ['GST collected in period', `Rs ${fmtNumber(finance.gstCollected)}`]
    ],
    notes: [
      'Income figures are gross (inclusive of GST collected, which is a liability payable to Government).',
      'Statement is on cash/day-book basis; depreciation, licence amortisation and stock adjustment are made at year-end by the accountant.'
    ]
  };
};

// 5. GST Summary
export const buildGST = (state: GlobalState): PrintableReport => {
  const monthKey = todayKey().slice(0, 7);

  let restaurantTaxable = 0;
  let restaurantGst = 0;
  let roomsTaxable = 0;
  let roomsGst = 0;
  let barSalesTurnover = 0;

  state.sales.forEach((s) => {
    if (keyOf(s.date).startsWith(monthKey)) {
      if (s.dept === 'rooms') {
        roomsTaxable += s.amount;
        roomsGst += s.gstAmount;
      } else if (s.gstRate > 0) {
        restaurantTaxable += s.amount;
        restaurantGst += s.gstAmount;
      } else {
        barSalesTurnover += s.total;
      }
    }
  });

  const totalGstPayable = restaurantGst + roomsGst;
  const turnoverTaxKGST = Math.round(0.1 * barSalesTurnover);

  const gstRows = [
    ['Restaurant / takeaway / online (SAC 996331)', '5%', fmtNumber(restaurantTaxable), fmtNumber(restaurantGst / 2), fmtNumber(restaurantGst / 2), fmtNumber(restaurantGst)],
    ['Hotel accommodation, tariff <= Rs 7,500 (SAC 996311)', '5%', fmtNumber(roomsTaxable), fmtNumber(roomsGst / 2), fmtNumber(roomsGst / 2), fmtNumber(roomsGst)]
  ];

  return {
    code: generateReportCode('DRTH/GST'),
    title: 'GST & TURNOVER TAX SUMMARY',
    period: `Tax period: ${getPeriodMonthName()}`,
    sections: [
      {
        heading: 'A. Outward Taxable Supplies (GSTR-3B Table 3.1(a) basis)',
        headers: ['Nature of Supply', 'Rate', 'Taxable Value (Rs)', 'CGST (Rs)', 'SGST (Rs)', 'Total Tax (Rs)'],
        align: ['l', 'l', 'r', 'r', 'r', 'r'],
        rows: gstRows,
        totalsRow: ['TOTAL', '', fmtNumber(restaurantTaxable + roomsTaxable), fmtNumber(totalGstPayable / 2), fmtNumber(totalGstPayable / 2), fmtNumber(totalGstPayable)]
      },
      {
        heading: 'B. Non-GST Outward Supplies (GSTR-1 Table 8)',
        headers: ['Nature of Supply', 'Value (Rs)'],
        align: ['l', 'r'],
        rows: [['Liquor for human consumption (FL-3 bar sales)', fmtNumber(barSalesTurnover)]]
      },
      {
        heading: 'C. Kerala Turnover Tax on Liquor (KGST Act, S.5(2))',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: [
          ['Liquor turnover for the period', fmtNumber(barSalesTurnover)],
          ['Turnover Tax @ 10% (bar-attached hotel)', fmtNumber(turnoverTaxKGST)]
        ]
      }
    ],
    summary: [
      ['Output GST payable (cash, no ITC)', `Rs ${fmtNumber(totalGstPayable)}`],
      ['- CGST component', `Rs ${fmtNumber(totalGstPayable / 2)}`],
      ['- SGST component', `Rs ${fmtNumber(totalGstPayable / 2)}`],
      ['Kerala TOT payable (KITIS portal)', `Rs ${fmtNumber(turnoverTaxKGST)}`]
    ],
    notes: [
      'GST 2.0 rates effective 22-Sep-2025: restaurant service and hotel rooms (tariff <= Rs 7,500/day) attract 5% WITHOUT input tax credit.',
      'All supplies are intra-state; IGST is nil. File GSTR-1 by the 11th and GSTR-3B by the 20th of the following month.',
      'Liquor is outside GST. Turnover Tax @10% is filed separately under the KGST Act through the KITIS portal.',
      'This summary is a filing aid - reconcile with the GSTN auto-populated GSTR-3B before submission.'
    ]
  };
};

// 6. Guest Register
export const buildGuestRegister = (state: GlobalState): PrintableReport => {
  const departures = [...state.stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const arrivals = state.rooms.filter((r) => r.guest);

  const depRows = departures.map((stay, index) => [
    String(index + 1),
    stay.guestName,
    stay.phone,
    stay.roomNo,
    stay.category,
    `${fmtDateRegister(stay.checkIn)} ${fmtTimeRegister(stay.checkIn)}`,
    `${fmtDateRegister(stay.checkOut)} ${fmtTimeRegister(stay.checkOut)}`,
    String(stay.nights),
    fmtNumber(stay.amount),
    stay.mode.toUpperCase()
  ]);

  const arrRows = arrivals.map((room, index) => [
    String(index + 1),
    room.guest!.name,
    room.guest!.phone,
    room.guest!.idProof,
    room.no,
    `${fmtDateRegister(room.guest!.checkIn)} ${fmtTimeRegister(room.guest!.checkIn)}`,
    String(room.guest!.adults),
    fmtNumber(room.guest!.advance)
  ]);

  const totalNights = departures.reduce((sum, d) => sum + d.nights, 0);
  const totalAmount = departures.reduce((sum, d) => sum + d.amount, 0);

  return {
    code: generateReportCode('DRTH/GR'),
    title: 'GUEST REGISTER (Arrival / Departure Record)',
    period: `As on: ${fmtDateRegister(new Date().toISOString())}`,
    sections: [
      {
        heading: 'A. Guests Currently In House',
        headers: ['Sl', 'Guest Name', 'Phone', 'ID Proof', 'Room', 'Arrival', 'Pax', 'Advance (Rs)'],
        align: ['r', 'l', 'l', 'l', 'l', 'l', 'r', 'r'],
        rows: arrRows
      },
      {
        heading: 'B. Departed Guests (Completed Stays)',
        headers: ['Sl', 'Guest Name', 'Phone', 'Room', 'Category', 'Arrival', 'Departure', 'Nights', 'Bill (Rs)', 'Mode'],
        align: ['r', 'l', 'l', 'l', 'l', 'l', 'l', 'r', 'r', 'l'],
        rows: depRows,
        totalsRow: ['', '', '', '', '', '', 'TOTAL', String(totalNights), fmtNumber(totalAmount), '']
      }
    ],
    summary: [
      ['Guests in house', String(arrivals.length)],
      ['Completed stays on record', String(departures.length)],
      ['Room revenue (all stays listed)', `Rs ${fmtNumber(totalAmount)}`]
    ],
    notes: [
      'Maintained as per Kerala Police lodging-house rules; produce on demand to authorities.',
      'ID proof details of in-house guests are recorded at check-in and retained in the system.',
      'Foreign nationals additionally require Form-C submission within 24 hours of arrival (via FRRO portal).'
    ]
  };
};

// 7. Credits & Payables
export const buildCredits = (state: GlobalState): PrintableReport => {
  const customers = state.credits.filter((c) => c.type === 'customer');
  const vendors = state.credits.filter((c) => c.type === 'vendor');
  const now = Date.now();

  const calculateAgeing = (account: any) => {
    const firstCredit = account.history.find((h: any) => h.kind === 'credit');
    if (!firstCredit || account.balance === 0) return '-';
    const diffDays = Math.floor((now - new Date(firstCredit.date).getTime()) / 86400000);
    if (diffDays <= 30) return '0-30 days';
    if (diffDays <= 60) return '31-60 days';
    return '60+ days';
  };

  const debtorRows = customers
    .sort((a, b) => b.balance - a.balance)
    .map((c, index) => [
      String(index + 1),
      c.name,
      c.phone,
      calculateAgeing(c),
      fmtNumber(c.balance)
    ]);

  const creditorRows = vendors
    .sort((a, b) => b.balance - a.balance)
    .map((v, index) => [
      String(index + 1),
      v.name,
      v.gstin || '-',
      calculateAgeing(v),
      fmtNumber(v.balance)
    ]);

  const totalDebtors = customerOutstanding(state);
  const totalCreditors = vendorPayables(state);

  return {
    code: generateReportCode('DRTH/CR'),
    title: 'OUTSTANDING CREDITS & PAYABLES',
    period: `As on: ${fmtDateRegister(new Date().toISOString())}`,
    sections: [
      {
        heading: 'A. Sundry Debtors (Customers who owe us)',
        headers: ['Sl', 'Customer', 'Phone', 'Ageing', 'Outstanding (Rs)'],
        align: ['r', 'l', 'l', 'l', 'r'],
        rows: debtorRows,
        totalsRow: ['', '', '', 'TOTAL RECEIVABLE', fmtNumber(totalDebtors)]
      },
      {
        heading: 'B. Sundry Creditors (Vendors we owe)',
        headers: ['Sl', 'Vendor', 'GSTIN', 'Ageing', 'Outstanding (Rs)'],
        align: ['r', 'l', 'l', 'l', 'r'],
        rows: creditorRows,
        totalsRow: ['', '', '', 'TOTAL PAYABLE', fmtNumber(totalCreditors)]
      }
    ],
    summary: [
      ['Total receivable from customers', `Rs ${fmtNumber(totalDebtors)}`],
      ['Total payable to vendors', `Rs ${fmtNumber(totalCreditors)}`],
      ['Net position', `Rs ${fmtNumber(totalDebtors - totalCreditors)}`]
    ],
    notes: [
      'Ageing is measured from the most recent credit extended. Follow up 60+ day receivables first.'
    ]
  };
};

// 8. Financial Position (Balance Sheet / Working Capital)
export const buildPosition = (state: GlobalState): PrintableReport => {
  const cash = cashInHand(state);
  const bank = bankBalance(state);
  const debtors = customerOutstanding(state);
  const creds = vendorPayables(state);
  const inv = inventoryValue(state);
  const liq = liquorStockValue(state);

  const totalAssets = cash + bank + debtors + inv + liq;

  return {
    code: generateReportCode('DRTH/FP'),
    title: 'STATEMENT OF FINANCIAL POSITION (Working Capital)',
    period: `As on: ${fmtDateRegister(new Date().toISOString())}`,
    sections: [
      {
        heading: 'A. Current Assets',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: [
          ['Cash in hand', fmtNumber(cash)],
          ['Bank balances (all accounts)', fmtNumber(bank)],
          ['Sundry debtors (customer credits)', fmtNumber(debtors)],
          ['Inventory - food & consumables at cost', fmtNumber(inv)],
          ['Inventory - liquor stock at cost', fmtNumber(liq)]
        ],
        totalsRow: ['TOTAL CURRENT ASSETS', fmtNumber(totalAssets)]
      },
      {
        heading: 'B. Current Liabilities',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: [['Sundry creditors (vendor payables)', fmtNumber(creds)]],
        totalsRow: ['TOTAL CURRENT LIABILITIES', fmtNumber(creds)]
      },
      {
        heading: 'C. Net Working Capital',
        headers: ['Particulars', 'Amount (Rs)'],
        align: ['l', 'r'],
        rows: [['Net working capital (A - B)', fmtNumber(totalAssets - creds)]]
      }
    ],
    summary: [
      ['Total current assets', `Rs ${fmtNumber(totalAssets)}`],
      ['Total current liabilities', `Rs ${fmtNumber(creds)}`],
      ['Net working capital', `Rs ${fmtNumber(totalAssets - creds)}`]
    ],
    notes: [
      'Fixed assets (building, kitchen equipment, furniture) are outside the scope of this operational statement.'
    ]
  };
};
