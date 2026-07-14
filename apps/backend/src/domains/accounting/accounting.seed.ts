import type { SeedModule } from '../../seed/types';
import { AccountingRepository } from './accounting.repository';
import type * as T from './accounting.types';

const MONTHS: { id: string; name: string; start: string; end: string }[] = [
  {
    id: 'fp-2026-01',
    name: 'Jan 2026',
    start: '2026-01-01',
    end: '2026-01-31',
  },
  {
    id: 'fp-2026-02',
    name: 'Feb 2026',
    start: '2026-02-01',
    end: '2026-02-28',
  },
  {
    id: 'fp-2026-03',
    name: 'Mar 2026',
    start: '2026-03-01',
    end: '2026-03-31',
  },
  {
    id: 'fp-2026-04',
    name: 'Apr 2026',
    start: '2026-04-01',
    end: '2026-04-30',
  },
  {
    id: 'fp-2026-05',
    name: 'May 2026',
    start: '2026-05-01',
    end: '2026-05-31',
  },
  {
    id: 'fp-2026-06',
    name: 'Jun 2026',
    start: '2026-06-01',
    end: '2026-06-30',
  },
  {
    id: 'fp-2026-07',
    name: 'Jul 2026',
    start: '2026-07-01',
    end: '2026-07-31',
  },
  {
    id: 'fp-2026-08',
    name: 'Aug 2026',
    start: '2026-08-01',
    end: '2026-08-31',
  },
  {
    id: 'fp-2026-09',
    name: 'Sep 2026',
    start: '2026-09-01',
    end: '2026-09-30',
  },
  {
    id: 'fp-2026-10',
    name: 'Oct 2026',
    start: '2026-10-01',
    end: '2026-10-31',
  },
  {
    id: 'fp-2026-11',
    name: 'Nov 2026',
    start: '2026-11-01',
    end: '2026-11-30',
  },
  {
    id: 'fp-2026-12',
    name: 'Dec 2026',
    start: '2026-12-01',
    end: '2026-12-31',
  },
];

const ACCOUNTS: {
  code: string;
  name: string;
  accountType: T.AccountType;
  accountSubType: T.AccountSubType;
  isGroup: boolean;
  parentCode?: string;
  taxRate?: T.GstRate;
  description?: string;
}[] = [
  // Level 0 — Root groups
  {
    code: '1',
    name: 'Assets',
    accountType: 'asset',
    accountSubType: '' as T.AccountSubType,
    isGroup: true,
  },
  {
    code: '2',
    name: 'Liabilities',
    accountType: 'liability',
    accountSubType: '' as T.AccountSubType,
    isGroup: true,
  },
  {
    code: '3',
    name: 'Equity',
    accountType: 'equity',
    accountSubType: '' as T.AccountSubType,
    isGroup: true,
  },
  {
    code: '4',
    name: 'Income',
    accountType: 'income',
    accountSubType: '' as T.AccountSubType,
    isGroup: true,
  },
  {
    code: '5',
    name: 'Expenses',
    accountType: 'expense',
    accountSubType: '' as T.AccountSubType,
    isGroup: true,
  },

  // 1 — Assets
  {
    code: '1.1',
    name: 'Current Assets',
    accountType: 'asset',
    accountSubType: 'current_asset',
    isGroup: true,
    parentCode: '1',
  },
  {
    code: '1.1.1',
    name: 'Cash in Hand',
    accountType: 'asset',
    accountSubType: 'cash',
    isGroup: false,
    parentCode: '1.1',
  },
  {
    code: '1.1.2',
    name: 'Bank Accounts',
    accountType: 'asset',
    accountSubType: 'bank',
    isGroup: false,
    parentCode: '1.1',
  },
  {
    code: '1.1.3',
    name: 'Accounts Receivable',
    accountType: 'asset',
    accountSubType: 'current_asset',
    isGroup: false,
    parentCode: '1.1',
  },
  {
    code: '1.1.4',
    name: 'Inventory',
    accountType: 'asset',
    accountSubType: 'current_asset',
    isGroup: false,
    parentCode: '1.1',
  },
  {
    code: '1.1.5',
    name: 'GST Input Credit',
    accountType: 'asset',
    accountSubType: 'current_asset',
    isGroup: false,
    parentCode: '1.1',
  },
  {
    code: '1.2',
    name: 'Fixed Assets',
    accountType: 'asset',
    accountSubType: 'fixed_asset',
    isGroup: true,
    parentCode: '1',
  },
  {
    code: '1.2.1',
    name: 'Furniture & Fixtures',
    accountType: 'asset',
    accountSubType: 'fixed_asset',
    isGroup: false,
    parentCode: '1.2',
  },
  {
    code: '1.2.2',
    name: 'Equipment',
    accountType: 'asset',
    accountSubType: 'fixed_asset',
    isGroup: false,
    parentCode: '1.2',
  },

  // 2 — Liabilities
  {
    code: '2.1',
    name: 'Current Liabilities',
    accountType: 'liability',
    accountSubType: 'current_liability',
    isGroup: true,
    parentCode: '2',
  },
  {
    code: '2.1.1',
    name: 'Accounts Payable',
    accountType: 'liability',
    accountSubType: 'current_liability',
    isGroup: false,
    parentCode: '2.1',
  },
  {
    code: '2.1.2',
    name: 'GST Payable',
    accountType: 'liability',
    accountSubType: 'current_liability',
    isGroup: false,
    parentCode: '2.1',
  },
  {
    code: '2.1.3',
    name: 'TOT Payable',
    accountType: 'liability',
    accountSubType: 'current_liability',
    isGroup: false,
    parentCode: '2.1',
  },
  {
    code: '2.1.4',
    name: 'Salary Payable',
    accountType: 'liability',
    accountSubType: 'current_liability',
    isGroup: false,
    parentCode: '2.1',
  },
  {
    code: '2.2',
    name: 'Long Term Liabilities',
    accountType: 'liability',
    accountSubType: 'long_term_liability',
    isGroup: true,
    parentCode: '2',
  },
  {
    code: '2.2.1',
    name: 'Loans',
    accountType: 'liability',
    accountSubType: 'long_term_liability',
    isGroup: false,
    parentCode: '2.2',
  },

  // 3 — Equity
  {
    code: '3.1',
    name: 'Capital',
    accountType: 'equity',
    accountSubType: 'capital',
    isGroup: false,
    parentCode: '3',
  },
  {
    code: '3.2',
    name: 'Retained Earnings',
    accountType: 'equity',
    accountSubType: 'retained_earnings',
    isGroup: false,
    parentCode: '3',
  },
  {
    code: '3.3',
    name: 'Drawings',
    accountType: 'equity',
    accountSubType: 'drawings',
    isGroup: false,
    parentCode: '3',
  },

  // 4 — Income
  {
    code: '4.1',
    name: 'Operating Revenue',
    accountType: 'income',
    accountSubType: 'operating_revenue',
    isGroup: true,
    parentCode: '4',
  },
  {
    code: '4.1.1',
    name: 'Room Revenue',
    accountType: 'income',
    accountSubType: 'operating_revenue',
    isGroup: false,
    parentCode: '4.1',
  },
  {
    code: '4.1.2',
    name: 'Restaurant Revenue',
    accountType: 'income',
    accountSubType: 'operating_revenue',
    isGroup: false,
    parentCode: '4.1',
  },
  {
    code: '4.1.3',
    name: 'Bar Revenue',
    accountType: 'income',
    accountSubType: 'operating_revenue',
    isGroup: false,
    parentCode: '4.1',
  },
  {
    code: '4.1.4',
    name: 'Service Charge Income',
    accountType: 'income',
    accountSubType: 'operating_revenue',
    isGroup: false,
    parentCode: '4.1',
  },
  {
    code: '4.2',
    name: 'Other Income',
    accountType: 'income',
    accountSubType: 'other_revenue',
    isGroup: false,
    parentCode: '4',
  },

  // 5 — Expenses
  {
    code: '5.1',
    name: 'Cost of Goods Sold',
    accountType: 'expense',
    accountSubType: 'cost_of_goods_sold',
    isGroup: true,
    parentCode: '5',
  },
  {
    code: '5.1.1',
    name: 'COGS - Food',
    accountType: 'expense',
    accountSubType: 'cost_of_goods_sold',
    isGroup: false,
    parentCode: '5.1',
  },
  {
    code: '5.1.2',
    name: 'COGS - Beverages',
    accountType: 'expense',
    accountSubType: 'cost_of_goods_sold',
    isGroup: false,
    parentCode: '5.1',
  },
  {
    code: '5.2',
    name: 'Operating Expenses',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: true,
    parentCode: '5',
  },
  {
    code: '5.2.1',
    name: 'Salary & Wages',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.2.2',
    name: 'Electricity',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.2.3',
    name: 'Water',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.2.4',
    name: 'Internet & Phone',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.2.5',
    name: 'Repairs & Maintenance',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.2.6',
    name: 'Cleaning Supplies',
    accountType: 'expense',
    accountSubType: 'operating_expense',
    isGroup: false,
    parentCode: '5.2',
  },
  {
    code: '5.3',
    name: 'Administrative Expenses',
    accountType: 'expense',
    accountSubType: 'administrative_expense',
    isGroup: true,
    parentCode: '5',
  },
  {
    code: '5.3.1',
    name: 'Rent',
    accountType: 'expense',
    accountSubType: 'administrative_expense',
    isGroup: false,
    parentCode: '5.3',
  },
  {
    code: '5.3.2',
    name: 'Insurance',
    accountType: 'expense',
    accountSubType: 'administrative_expense',
    isGroup: false,
    parentCode: '5.3',
  },
  {
    code: '5.3.3',
    name: 'Professional Fees',
    accountType: 'expense',
    accountSubType: 'administrative_expense',
    isGroup: false,
    parentCode: '5.3',
  },
  {
    code: '5.3.4',
    name: 'Printing & Stationery',
    accountType: 'expense',
    accountSubType: 'administrative_expense',
    isGroup: false,
    parentCode: '5.3',
  },
  {
    code: '5.4',
    name: 'Other Expenses',
    accountType: 'expense',
    accountSubType: 'other_expense',
    isGroup: false,
    parentCode: '5',
  },
];

export const accountingSeed: SeedModule = {
  name: 'accounting',
  dependsOn: ['auth'],

  async run(): Promise<void> {
    try {
      const existing = await AccountingRepository.findAllAccounts({});
      if (existing.total > 0) {
        console.log(
          '[accounting.seed] Chart of accounts already exists, skipping...',
        );
        return;
      }

      console.log('[accounting.seed] Seeding accounting domain...');

      // ── 1. Chart of Accounts ──────────────────────────────────────────

      const accountsByCode: Record<string, T.ChartOfAccount> = {};

      async function createAccountFromSeed(
        seed: (typeof ACCOUNTS)[number],
      ): Promise<T.ChartOfAccount> {
        const parentId = seed.parentCode
          ? accountsByCode[seed.parentCode]?.id
          : undefined;
        const acct = await AccountingRepository.createAccount({
          code: seed.code,
          name: seed.name,
          accountType: seed.accountType,
          accountSubType: seed.accountSubType,
          parentId,
          isGroup: seed.isGroup,
          taxRate: seed.taxRate,
          description: seed.description,
        });
        accountsByCode[seed.code] = acct;
        return acct;
      }

      for (const seed of ACCOUNTS) {
        await createAccountFromSeed(seed);
      }
      console.log(
        `[accounting.seed]   Created ${Object.keys(accountsByCode).length} chart of accounts`,
      );

      // ── 2. Financial Periods ──────────────────────────────────────────

      for (const m of MONTHS) {
        await AccountingRepository.createPeriod({
          name: m.name,
          startDate: m.start,
          endDate: m.end,
          periodType: 'monthly',
        });
      }
      console.log(
        `[accounting.seed]   Created ${MONTHS.length} financial periods`,
      );

      // ── 3. Auto-Posting Configs ───────────────────────────────────────

      const cashInHand = accountsByCode['1.1.1']!;
      const accountsReceivable = accountsByCode['1.1.3']!;
      const inventory = accountsByCode['1.1.4']!;
      const accountsPayable = accountsByCode['2.1.1']!;
      const gstPayable = accountsByCode['2.1.2']!;
      const totPayable = accountsByCode['2.1.3']!;
      const roomRevenue = accountsByCode['4.1.1']!;
      const restaurantRevenue = accountsByCode['4.1.2']!;
      const barRevenue = accountsByCode['4.1.3']!;

      await AccountingRepository.createConfig({
        source: 'restaurant_sale',
        debitAccountId: cashInHand.id,
        creditAccountId: restaurantRevenue.id,
        gstAccountId: gstPayable.id,
        description: 'Restaurant sales posting',
        isActive: true,
      });

      await AccountingRepository.createConfig({
        source: 'bar_sale',
        debitAccountId: cashInHand.id,
        creditAccountId: barRevenue.id,
        gstAccountId: totPayable.id,
        description: 'Bar sales posting (incl. Kerala TOT)',
        isActive: true,
      });

      await AccountingRepository.createConfig({
        source: 'hotel_check_out',
        debitAccountId: cashInHand.id,
        creditAccountId: roomRevenue.id,
        gstAccountId: null,
        description: 'Hotel folio settlement',
        isActive: true,
      });

      await AccountingRepository.createConfig({
        source: 'supplier_invoice',
        debitAccountId: inventory.id,
        creditAccountId: accountsPayable.id,
        gstAccountId: gstPayable.id,
        description: 'Purchase invoice posting',
        isActive: true,
      });

      await AccountingRepository.createConfig({
        source: 'hotel_folio_charge',
        debitAccountId: accountsReceivable.id,
        creditAccountId: roomRevenue.id,
        gstAccountId: null,
        description: 'Room charges posting',
        isActive: true,
      });
      console.log('[accounting.seed]   Created 5 auto-posting configs');

      // ── 4. Opening Journal Entry ──────────────────────────────────────

      const openingJournal = await AccountingRepository.createJournal(
        {
          entryDate: '2026-01-01',
          description: 'Opening balance for financial year 2026',
          lines: [
            {
              accountId: cashInHand.id,
              debit: 100000,
              description: 'Opening cash in hand balance',
            },
            {
              accountId: accountsByCode['1.1.2']!.id,
              debit: 500000,
              description: 'Opening bank balance',
            },
            {
              accountId: accountsReceivable.id,
              debit: 25000,
              description: 'Opening receivables',
            },
            {
              accountId: inventory.id,
              debit: 150000,
              description: 'Opening inventory stock',
            },
            {
              accountId: accountsPayable.id,
              credit: 45000,
              description: 'Opening payables',
            },
            {
              accountId: accountsByCode['3.1']!.id,
              credit: 730000,
              description: 'Opening capital contribution',
            },
          ],
        },
        'opening',
      );
      await AccountingRepository.postJournal(openingJournal.id, 'system');
      console.log(
        `[accounting.seed]   Posted opening journal: ${openingJournal.voucherNo}`,
      );

      console.log('[accounting.seed] Accounting seeding complete.');
    } catch (err) {
      console.error('[accounting.seed] Seeding failed:', err);
    }
  },

  async verify(): Promise<boolean> {
    const result = await AccountingRepository.findAllAccounts({});
    return result.total >= ACCOUNTS.length;
  },
};
