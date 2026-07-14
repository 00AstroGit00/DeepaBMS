import { query, run } from '../../db';
import * as R from './accounting.repository';
import * as T from './accounting.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function balancesAreEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

// ── 1. JournalService ─────────────────────────────────────────────────────

export const JournalService = {
  async createAndPostJournal(
    dto: T.CreateJournalDto,
    postedBy?: string,
  ): Promise<T.JournalEntry> {
    const validation = this.validateCreateJournal(dto);
    if (validation.length)
      throw new Error(`Validation failed: ${validation.join('; ')}`);

    const journal = await R.AccountingRepository.createJournal(
      dto,
      dto.voucherType,
    );
    const posted = await R.AccountingRepository.postJournal(
      journal.id,
      postedBy || 'system',
    );
    return posted;
  },

  async createDraftJournal(
    dto: T.CreateJournalDto,
    createdBy?: string,
  ): Promise<T.JournalEntry> {
    const validation = this.validateCreateJournal(dto);
    if (validation.length)
      throw new Error(`Validation failed: ${validation.join('; ')}`);
    return R.AccountingRepository.createJournal(dto, dto.voucherType);
  },

  async postJournal(
    journalId: string,
    postedBy: string,
  ): Promise<T.JournalEntry> {
    const journal = await R.AccountingRepository.findJournalById(journalId);
    if (!journal) throw new Error(`Journal not found: ${journalId}`);
    const val = this.validatePostJournal(journal);
    if (val.length) throw new Error(`Validation failed: ${val.join('; ')}`);

    const posted = await R.AccountingRepository.postJournal(
      journalId,
      postedBy,
    );

    for (const line of journal.lines) {
      const account = await R.AccountingRepository.findAccountById(
        line.accountId,
      );
      if (!account) continue;
      const balanceDelta =
        account.accountType === 'asset' || account.accountType === 'expense'
          ? line.debit - line.credit
          : line.credit - line.debit;
      await run(
        `UPDATE chart_of_accounts SET balance = balance + ?, updated_at = ? WHERE id = ?`,
        [balanceDelta, now(), line.accountId],
      );
    }

    return posted;
  },

  async reverseJournal(
    journalId: string,
    reversedBy: string,
    reason?: string,
  ): Promise<T.JournalEntry> {
    const journal = await R.AccountingRepository.findJournalById(journalId);
    if (!journal) throw new Error(`Journal not found: ${journalId}`);
    if (journal.status !== 'posted') {
      throw new Error(`Cannot reverse journal with status: ${journal.status}`);
    }
    return R.AccountingRepository.reverseJournal(journalId, reversedBy);
  },

  async cancelJournal(journalId: string): Promise<void> {
    const journal = await R.AccountingRepository.findJournalById(journalId);
    if (!journal) throw new Error(`Journal not found: ${journalId}`);
    if (journal.status !== 'draft') {
      throw new Error(`Cannot cancel journal with status: ${journal.status}`);
    }
    return R.AccountingRepository.cancelJournal(journalId);
  },

  async getJournal(id: string): Promise<T.JournalEntry | null> {
    return R.AccountingRepository.findJournalById(id);
  },

  async getJournals(
    filter: T.JournalFilter,
  ): Promise<T.PaginatedResult<T.JournalEntry>> {
    return R.AccountingRepository.findAllJournals(filter);
  },

  validateCreateJournal(dto: T.CreateJournalDto): string[] {
    const errors: string[] = [];
    if (!dto.entryDate) errors.push('Entry date is required');
    if (!dto.description?.trim()) errors.push('Description is required');
    if (!dto.lines || dto.lines.length < 2) {
      errors.push('Journal must have at least 2 lines');
      return errors;
    }
    const hasAccount = dto.lines.every((l) => !!l.accountId);
    if (!hasAccount) errors.push('All lines must have an account ID');
    const debitTotal = sum(dto.lines.map((l) => l.debit || 0));
    const creditTotal = sum(dto.lines.map((l) => l.credit || 0));
    if (!balancesAreEqual(debitTotal, creditTotal)) {
      errors.push(
        `Unbalanced journal: debit ${debitTotal} !== credit ${creditTotal}`,
      );
    }
    for (let i = 0; i < dto.lines.length; i++) {
      const l = dto.lines[i];
      if ((l.debit || 0) > 0 && (l.credit || 0) > 0) {
        errors.push(`Line ${i + 1}: cannot have both debit and credit`);
      }
      if ((l.debit || 0) === 0 && (l.credit || 0) === 0) {
        errors.push(`Line ${i + 1}: must have either debit or credit`);
      }
      if ((l.debit || 0) < 0 || (l.credit || 0) < 0) {
        errors.push(`Line ${i + 1}: amounts cannot be negative`);
      }
    }
    if (dto.voucherType && !T.VALID_VOUCHER_TYPES.includes(dto.voucherType)) {
      errors.push(`Invalid voucher type: ${dto.voucherType}`);
    }
    return errors;
  },

  validatePostJournal(journal: T.JournalEntry): string[] {
    const errors: string[] = [];
    if (journal.status === 'posted') errors.push('Journal is already posted');
    if (journal.status === 'cancelled') errors.push('Journal is cancelled');
    if (journal.status === 'reversed') errors.push('Journal is reversed');
    if (!balancesAreEqual(journal.debitTotal, journal.creditTotal)) {
      errors.push('Journal is unbalanced');
    }
    return errors;
  },
};

// ── 2. AutoPostService ────────────────────────────────────────────────────

async function getAutoPostingConfig(
  source: T.AutoPostingSource,
): Promise<T.AutoPostingConfig> {
  const rows = await query(
    `SELECT * FROM auto_posting_config WHERE source = ? AND is_active = 1 LIMIT 1`,
    [source],
  );
  if (!rows.length) {
    throw new Error(`No active auto-posting config for source: ${source}`);
  }
  const r = rows[0];
  return {
    id: r.id,
    source: r.source,
    debitAccountId: r.debit_account_id,
    creditAccountId: r.credit_account_id,
    gstAccountId: r.gst_account_id || null,
    description: r.description,
    isActive: Boolean(r.is_active),
  };
}

async function createAndPostAutoJournal(
  config: T.AutoPostingConfig,
  entry: T.AutoPostingEntry,
  voucherType: T.VoucherType,
  postedBy?: string,
): Promise<T.JournalEntry> {
  const lines: T.CreateJournalLineDto[] = [
    {
      accountId: config.debitAccountId,
      debit: entry.amount,
      credit: 0,
      description: entry.description,
    },
    {
      accountId: config.creditAccountId,
      debit: 0,
      credit: entry.amount,
      description: entry.description,
    },
  ];

  if (entry.gstAmount && config.gstAccountId) {
    lines.push({
      accountId: config.gstAccountId,
      debit: entry.gstAmount > 0 ? entry.gstAmount : 0,
      credit: entry.gstAmount < 0 ? Math.abs(entry.gstAmount) : 0,
      description: `GST on ${entry.description}`,
    });
  }

  const journal = await R.AccountingRepository.createJournal(
    {
      entryDate: entry.entryDate,
      description: entry.description,
      voucherType,
      lines,
      referenceType: entry.source,
      referenceId: entry.referenceId,
      notes: `Ref: ${entry.referenceNo}`,
    },
    voucherType,
  );

  return JournalService.postJournal(journal.id, postedBy || 'system');
}

export const AutoPostService = {
  async postPurchaseOrder(entry: T.AutoPostingEntry): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('purchase_order');
    return createAndPostAutoJournal(config, entry, 'purchase', 'system');
  },

  async postGoodsReceipt(entry: T.AutoPostingEntry): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('goods_receipt');
    return createAndPostAutoJournal(config, entry, 'purchase', 'system');
  },

  async postSupplierInvoice(
    entry: T.AutoPostingEntry,
  ): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('supplier_invoice');
    if (entry.gstAmount && config.gstAccountId) {
      const journal = await R.AccountingRepository.createJournal(
        {
          entryDate: entry.entryDate,
          description: entry.description,
          voucherType: 'purchase',
          lines: [
            {
              accountId: config.debitAccountId,
              debit: entry.amount,
              credit: 0,
              description: entry.description,
            },
            {
              accountId: config.gstAccountId,
              debit: entry.gstAmount,
              credit: 0,
              description: `GST Input on ${entry.description}`,
            },
            {
              accountId: config.creditAccountId,
              debit: 0,
              credit: entry.amount + entry.gstAmount,
              description: entry.description,
            },
          ],
          referenceType: entry.source,
          referenceId: entry.referenceId,
          notes: `Ref: ${entry.referenceNo}`,
        },
        'purchase',
      );
      return JournalService.postJournal(journal.id, 'system');
    }
    return createAndPostAutoJournal(config, entry, 'purchase', 'system');
  },

  async postRestaurantSale(entry: T.AutoPostingEntry): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('restaurant_sale');
    if (entry.gstAmount && config.gstAccountId) {
      const journal = await R.AccountingRepository.createJournal(
        {
          entryDate: entry.entryDate,
          description: entry.description,
          voucherType: 'sales',
          lines: [
            {
              accountId: config.debitAccountId,
              debit: entry.amount + entry.gstAmount,
              credit: 0,
              description: entry.description,
            },
            {
              accountId: config.creditAccountId,
              debit: 0,
              credit: entry.amount,
              description: `Sales - ${entry.description}`,
            },
            {
              accountId: config.gstAccountId,
              debit: 0,
              credit: entry.gstAmount,
              description: `GST Output on ${entry.description}`,
            },
          ],
          referenceType: entry.source,
          referenceId: entry.referenceId,
          notes: `Ref: ${entry.referenceNo}`,
        },
        'sales',
      );
      return JournalService.postJournal(journal.id, 'system');
    }
    return createAndPostAutoJournal(config, entry, 'sales', 'system');
  },

  async postBarSale(entry: T.AutoPostingEntry): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('bar_sale');
    if (entry.gstAmount && config.gstAccountId) {
      const totalAmount = entry.amount + entry.gstAmount;
      const journal = await R.AccountingRepository.createJournal(
        {
          entryDate: entry.entryDate,
          description: entry.description,
          voucherType: 'sales',
          lines: [
            {
              accountId: config.debitAccountId,
              debit: totalAmount,
              credit: 0,
              description: entry.description,
            },
            {
              accountId: config.creditAccountId,
              debit: 0,
              credit: entry.amount,
              description: `Bar sales - ${entry.description}`,
            },
            {
              accountId: config.gstAccountId,
              debit: 0,
              credit: entry.gstAmount,
              description: `GST Output on ${entry.description}`,
            },
          ],
          referenceType: entry.source,
          referenceId: entry.referenceId,
          notes: `Ref: ${entry.referenceNo}`,
        },
        'sales',
      );
      return JournalService.postJournal(journal.id, 'system');
    }
    return createAndPostAutoJournal(config, entry, 'sales', 'system');
  },

  async postHotelCharge(entry: T.AutoPostingEntry): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('hotel_folio_charge');
    return createAndPostAutoJournal(config, entry, 'journal', 'system');
  },

  async postInventoryAdjustment(
    entry: T.AutoPostingEntry,
  ): Promise<T.JournalEntry> {
    const config = await getAutoPostingConfig('inventory_adjustment');
    return createAndPostAutoJournal(config, entry, 'adjustment', 'system');
  },
};

// ── 3. GstService ─────────────────────────────────────────────────────────

export const GstService = {
  async recordGstEntry(dto: {
    gstRate: T.GstRate;
    amount: number;
    referenceType: string;
    referenceId: string;
    invoiceNo: string;
    invoiceDate: string;
    partyName: string;
    partyGstin?: string;
    period?: string;
  }): Promise<T.GstRegister> {
    const gstType: T.GstType = [
      'purchase',
      'supplier_invoice',
      'goods_receipt',
      'expense',
    ].includes(dto.referenceType)
      ? 'input'
      : 'output';
    const { taxableAmount, gstAmount } = this.calculateGst(
      dto.amount,
      dto.gstRate,
    );
    const period = dto.period || dto.invoiceDate.slice(0, 7);
    return R.AccountingRepository.createGstEntry({
      gstType,
      gstRate: dto.gstRate,
      taxableAmount,
      gstAmount,
      invoiceNo: dto.invoiceNo,
      invoiceDate: dto.invoiceDate,
      partyName: dto.partyName,
      partyGstin: dto.partyGstin || null,
      journalId: null,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      period,
    });
  },

  async getGstSummary(
    gstType: T.GstType,
    fromDate: string,
    toDate: string,
  ): Promise<{ rate: T.GstRate; taxableAmount: number; gstAmount: number }[]> {
    const rows = await query(
      `SELECT gst_rate, SUM(taxable_amount) AS taxable, SUM(gst_amount) AS gst
       FROM gst_registers
       WHERE gst_type = ? AND invoice_date >= ? AND invoice_date <= ?
       GROUP BY gst_rate
       ORDER BY gst_rate`,
      [gstType, fromDate, toDate],
    );
    return rows.map((r: any) => ({
      rate: Number(r.gst_rate) as T.GstRate,
      taxableAmount: Number(r.taxable),
      gstAmount: Number(r.gst),
    }));
  },

  async getGstReturn(
    period: string,
    gstType: T.GstType,
  ): Promise<{
    period: string;
    gstType: T.GstType;
    summary: { rate: T.GstRate; taxableAmount: number; gstAmount: number }[];
    totalTaxable: number;
    totalGst: number;
    entries: T.GstRegister[];
  }> {
    const fromDate = `${period}-01`;
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${period}-${String(lastDay).padStart(2, '0')}`;
    const summary = await this.getGstSummary(gstType, fromDate, toDate);
    const totalTaxable = sum(summary.map((s) => s.taxableAmount));
    const totalGst = sum(summary.map((s) => s.gstAmount));
    const entriesResult = await R.AccountingRepository.findAllGst({
      gstType,
      period,
      offset: 0,
      limit: 10000,
    });
    return {
      period,
      gstType,
      summary,
      totalTaxable,
      totalGst,
      entries: entriesResult.data,
    };
  },

  async getGstByPeriod(period: string): Promise<{
    input: { rate: T.GstRate; taxableAmount: number; gstAmount: number }[];
    output: { rate: T.GstRate; taxableAmount: number; gstAmount: number }[];
  }> {
    const fromDate = `${period}-01`;
    const year = Number(period.slice(0, 4));
    const month = Number(period.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${period}-${String(lastDay).padStart(2, '0')}`;
    const [input, output] = await Promise.all([
      this.getGstSummary('input', fromDate, toDate),
      this.getGstSummary('output', fromDate, toDate),
    ]);
    return { input, output };
  },

  calculateGst(
    amount: number,
    rate: T.GstRate,
  ): { taxableAmount: number; gstAmount: number } {
    if (rate === 0) return { taxableAmount: amount, gstAmount: 0 };
    const gstAmount = Math.round(((amount * rate) / (100 + rate)) * 100) / 100;
    const taxableAmount = Math.round((amount - gstAmount) * 100) / 100;
    return { taxableAmount, gstAmount };
  },
};

// ── 4. PeriodService ──────────────────────────────────────────────────────

export const PeriodService = {
  async openPeriod(
    dto: T.CreateFinancialPeriodDto,
  ): Promise<T.FinancialPeriod> {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new Error('End date must be after start date');
    }
    const overlapping = await query(
      `SELECT * FROM financial_periods
       WHERE is_open = 1 AND is_closed = 0
       AND ((start_date <= ? AND end_date >= ?)
         OR (start_date <= ? AND end_date >= ?)
         OR (start_date >= ? AND end_date <= ?))`,
      [
        dto.startDate,
        dto.startDate,
        dto.endDate,
        dto.endDate,
        dto.startDate,
        dto.endDate,
      ],
    );
    if (overlapping.length) {
      throw new Error('Overlapping open period exists');
    }
    return R.AccountingRepository.createPeriod({
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      periodType: dto.periodType || 'monthly',
    });
  },

  async closePeriod(
    periodId: string,
    closedBy: string,
  ): Promise<T.FinancialPeriod> {
    const period = await R.AccountingRepository.findPeriodById(periodId);
    if (!period) throw new Error(`Period not found: ${periodId}`);
    if (period.isClosed) throw new Error('Period is already closed');

    const openJournals = await query(
      `SELECT COUNT(*) AS cnt FROM journal_entries
       WHERE period_id = ? AND status NOT IN ('posted', 'reversed', 'cancelled')`,
      [periodId],
    );
    if (Number(openJournals[0].cnt) > 0) {
      throw new Error(
        `Cannot close period: ${openJournals[0].cnt} unposted journal(s)`,
      );
    }

    await R.AccountingRepository.updatePeriodBalances(periodId);

    const balances = await R.AccountingRepository.getAllBalances(periodId);
    for (const bal of balances) {
      const closingDebit = bal.openingDebit + bal.periodDebit;
      const closingCredit = bal.openingCredit + bal.periodCredit;
      await run(
        `UPDATE account_balances
         SET closing_debit = ?, closing_credit = ?, balance = ? - ?
         WHERE id = ?`,
        [closingDebit, closingCredit, closingDebit, closingCredit, bal.id],
      );
    }

    const nextPeriods = await query(
      `SELECT * FROM financial_periods
       WHERE start_date > (SELECT end_date FROM financial_periods WHERE id = ?)
       AND is_open = 1
       ORDER BY start_date ASC LIMIT 1`,
      [periodId],
    );
    if (nextPeriods.length) {
      const nextPeriod = nextPeriods[0];
      for (const bal of balances) {
        const closingBal = bal.closingDebit - bal.closingCredit;
        if (closingBal === 0) continue;
        const nextBal = await R.AccountingRepository.getAccountBalance(
          bal.accountId,
          nextPeriod.id,
        );
        if (nextBal) {
          await run(
            `UPDATE account_balances
             SET opening_debit = opening_debit + ?,
                 opening_credit = opening_credit + ?,
                 closing_debit = opening_debit + period_debit + ?,
                 closing_credit = opening_credit + period_credit + ?,
                 balance = (opening_debit + period_debit + ?) - (opening_credit + period_credit + ?)
             WHERE account_id = ? AND period_id = ?`,
            [
              closingBal > 0 ? closingBal : 0,
              closingBal < 0 ? Math.abs(closingBal) : 0,
              closingBal > 0 ? closingBal : 0,
              closingBal < 0 ? Math.abs(closingBal) : 0,
              closingBal > 0 ? closingBal : 0,
              closingBal < 0 ? Math.abs(closingBal) : 0,
              bal.accountId,
              nextPeriod.id,
            ],
          );
        } else {
          const account = await R.AccountingRepository.findAccountById(
            bal.accountId,
          );
          const code = account ? account.code : '';
          const openDebit = closingBal > 0 ? closingBal : 0;
          const openCredit = closingBal < 0 ? Math.abs(closingBal) : 0;
          await run(
            `INSERT INTO account_balances
             (id, account_id, account_code, period_id, opening_debit, opening_credit,
              period_debit, period_credit, closing_debit, closing_credit, balance)
             VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
            [
              uid('bal'),
              bal.accountId,
              code,
              nextPeriod.id,
              openDebit,
              openCredit,
              openDebit,
              openCredit,
              closingBal,
            ],
          );
        }
      }
    }

    return R.AccountingRepository.closePeriod(periodId, closedBy);
  },

  async getCurrentPeriod(date?: string): Promise<T.FinancialPeriod | null> {
    const target = date || now().slice(0, 10);
    const rows = await query(
      `SELECT * FROM financial_periods
       WHERE start_date <= ? AND end_date >= ? AND is_closed = 0 AND is_open = 1
       LIMIT 1`,
      [target, target],
    );
    return rows.length ? rowToFinancialPeriod(rows[0]) : null;
  },

  async getOpenPeriods(): Promise<T.FinancialPeriod[]> {
    return R.AccountingRepository.findAllPeriods();
  },

  async generateYearlyPeriods(year: number): Promise<T.FinancialPeriod[]> {
    const periods: T.FinancialPeriod[] = [];
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const existing = await query(
      `SELECT * FROM financial_periods WHERE start_date >= ? AND end_date <= ?`,
      [startDate, endDate],
    );
    if (existing.length) {
      throw new Error(`Periods for year ${year} already exist`);
    }
    for (let month = 1; month <= 12; month++) {
      const lastDay = new Date(year, month, 0).getDate();
      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const period = await R.AccountingRepository.createPeriod({
        name: `${year}-${String(month).padStart(2, '0')}`,
        startDate: periodStart,
        endDate: periodEnd,
        periodType: 'monthly',
      });
      periods.push(period);
    }
    return periods;
  },
};

function rowToFinancialPeriod(row: any): T.FinancialPeriod {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    periodType: row.period_type,
    isOpen: Boolean(row.is_open),
    isClosed: Boolean(row.is_closed),
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    createdAt: row.created_at || '',
  };
}

// ── 5. BankingService ─────────────────────────────────────────────────────

// FIN-06: banking moves are two-sided; resolve the contra (cash) account so
// the journal always has ≥2 balanced lines.
async function resolveCashAccountId(): Promise<string> {
  const rows = await query(
    "SELECT id FROM chart_of_accounts WHERE account_sub_type = 'cash' LIMIT 1",
  );
  if (!rows.length) {
    throw new Error(
      'No cash-in-hand account configured; cannot post banking journal',
    );
  }
  return rows[0].id;
}

export const BankingService = {
  async deposit(
    bankAccountId: string,
    amount: number,
    description: string,
    operator?: string,
  ): Promise<{ journal: T.JournalEntry; move: any }> {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    const cashId = await resolveCashAccountId();
    const journal = await JournalService.createAndPostJournal(
      {
        entryDate: now().slice(0, 10),
        description: `Deposit: ${description}`,
        voucherType: 'receipt',
        lines: [
          { accountId: bankAccountId, debit: amount, credit: 0, description },
          {
            accountId: cashId,
            debit: 0,
            credit: amount,
            description: `From cash: ${description}`,
          },
        ],
        referenceType: 'bank_deposit',
      },
      operator,
    );
    const moveId = uid('bnk');
    await run(
      `INSERT INTO bank_moves
       (id, bank_account_id, move_type, amount, description, operator, reference_id, reference_type)
       VALUES (?, ?, 'deposit', ?, ?, ?, ?, 'journal')`,
      [
        moveId,
        bankAccountId,
        amount,
        description,
        operator || null,
        journal.id,
      ],
    );
    const move = await query('SELECT * FROM bank_moves WHERE id = ?', [moveId]);
    return { journal, move: move[0] };
  },

  async withdraw(
    bankAccountId: string,
    amount: number,
    description: string,
    operator?: string,
  ): Promise<{ journal: T.JournalEntry; move: any }> {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    const cashId = await resolveCashAccountId();
    const journal = await JournalService.createAndPostJournal(
      {
        entryDate: now().slice(0, 10),
        description: `Withdrawal: ${description}`,
        voucherType: 'payment',
        lines: [
          {
            accountId: cashId,
            debit: amount,
            credit: 0,
            description: `To cash: ${description}`,
          },
          { accountId: bankAccountId, debit: 0, credit: amount, description },
        ],
        referenceType: 'bank_withdrawal',
      },
      operator,
    );
    const moveId = uid('bnk');
    await run(
      `INSERT INTO bank_moves
       (id, bank_account_id, move_type, amount, description, operator, reference_id, reference_type)
       VALUES (?, ?, 'withdrawal', ?, ?, ?, ?, 'journal')`,
      [
        moveId,
        bankAccountId,
        amount,
        description,
        operator || null,
        journal.id,
      ],
    );
    const move = await query('SELECT * FROM bank_moves WHERE id = ?', [moveId]);
    return { journal, move: move[0] };
  },

  async transfer(
    fromBankId: string,
    toBankId: string,
    amount: number,
    description: string,
    operator?: string,
  ): Promise<{ journal: T.JournalEntry; fromMove: any; toMove: any }> {
    if (amount <= 0) throw new Error('Transfer amount must be positive');
    const journal = await JournalService.createAndPostJournal(
      {
        entryDate: now().slice(0, 10),
        description: `Transfer: ${description}`,
        voucherType: 'contra',
        lines: [
          {
            accountId: toBankId,
            debit: amount,
            credit: 0,
            description: `Transfer from - ${description}`,
          },
          {
            accountId: fromBankId,
            debit: 0,
            credit: amount,
            description: `Transfer to - ${description}`,
          },
        ],
        referenceType: 'bank_transfer',
      },
      operator,
    );
    const fromMoveId = uid('bnk');
    const toMoveId = uid('bnk');
    await run(
      `INSERT INTO bank_moves
       (id, bank_account_id, move_type, amount, description, operator, reference_id, reference_type)
       VALUES (?, ?, 'transfer_out', ?, ?, ?, ?, 'journal')`,
      [
        fromMoveId,
        fromBankId,
        amount,
        `Transfer to: ${description}`,
        operator || null,
        journal.id,
      ],
    );
    await run(
      `INSERT INTO bank_moves
       (id, bank_account_id, move_type, amount, description, operator, reference_id, reference_type)
       VALUES (?, ?, 'transfer_in', ?, ?, ?, ?, 'journal')`,
      [
        toMoveId,
        toBankId,
        amount,
        `Transfer from: ${description}`,
        operator || null,
        journal.id,
      ],
    );
    const [fromMove, toMove] = await Promise.all([
      query('SELECT * FROM bank_moves WHERE id = ?', [fromMoveId]),
      query('SELECT * FROM bank_moves WHERE id = ?', [toMoveId]),
    ]);
    return { journal, fromMove: fromMove[0], toMove: toMove[0] };
  },

  async reconcile(
    dto: T.CreateBankReconciliationDto,
    operator?: string,
  ): Promise<T.BankReconciliation> {
    const systemBalance = await getBankBalance(dto.bankAccountId);
    const id = uid('bnk');
    const difference = dto.statementBalance - systemBalance;
    const status: T.BankReconciliationStatus =
      Math.abs(difference) < 0.01 ? 'reconciled' : 'discrepancy';
    await run(
      `INSERT INTO bank_reconciliations
       (id, bank_account_id, statement_date, statement_balance, system_balance, difference, status, reconciled_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.bankAccountId,
        dto.statementDate,
        dto.statementBalance,
        systemBalance,
        difference,
        status,
        operator || null,
        dto.notes || null,
      ],
    );
    const rows = await query(
      'SELECT * FROM bank_reconciliations WHERE id = ?',
      [id],
    );
    return rowToBankReconciliation(rows[0]);
  },

  async getBankStatement(
    bankAccountId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any[]> {
    return query(
      `SELECT bm.*, bm.created_at
       FROM bank_moves bm
       WHERE bm.bank_account_id = ? AND bm.created_at >= ? AND bm.created_at <= ?
       ORDER BY bm.created_at`,
      [bankAccountId, `${fromDate} 00:00:00`, `${toDate} 23:59:59`],
    );
  },

  async getOutstandingItems(bankAccountId: string): Promise<any[]> {
    return query(
      `SELECT bm.* FROM bank_moves bm
       LEFT JOIN bank_reconciliation_items bri ON bri.bank_move_id = bm.id
       WHERE bm.bank_account_id = ? AND (bri.id IS NULL OR bri.status = 'unreconciled')
       ORDER BY bm.created_at`,
      [bankAccountId],
    );
  },
};

async function getBankBalance(bankAccountId: string): Promise<number> {
  const rows = await query(
    `SELECT balance FROM chart_of_accounts WHERE id = ? AND account_sub_type = 'bank'`,
    [bankAccountId],
  );
  return rows.length ? Number(rows[0].balance) : 0;
}

function rowToBankReconciliation(row: any): T.BankReconciliation {
  return {
    id: row.id,
    bankAccountId: row.bank_account_id,
    statementDate: row.statement_date,
    statementBalance: Number(row.statement_balance),
    systemBalance: Number(row.system_balance),
    difference: Number(row.difference),
    status: row.status,
    reconciledAt: row.reconciled_at || null,
    reconciledBy: row.reconciled_by || null,
    notes: row.notes || null,
    createdAt: row.created_at || '',
  };
}

// ── 6. ReportService ──────────────────────────────────────────────────────

export const ReportService = {
  async getTrialBalance(periodId?: string): Promise<T.TrialBalanceRow[]> {
    let actualPeriodId = periodId;
    if (!actualPeriodId) {
      const current = await PeriodService.getCurrentPeriod();
      if (current) actualPeriodId = current.id;
    }
    if (!actualPeriodId) return [];
    return R.AccountingRepository.getTrialBalance(actualPeriodId);
  },

  async getProfitAndLoss(
    fromDate: string,
    toDate: string,
  ): Promise<{
    income: T.ProfitLossRow[];
    expense: T.ProfitLossRow[];
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
  }> {
    const rows = await query(
      `SELECT c.code, c.name, c.account_type,
              SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)) AS amount
       FROM journal_lines jl
       JOIN chart_of_accounts c ON c.id = jl.account_id
       JOIN journal_entries je ON je.id = jl.journal_id
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND c.account_type IN ('income', 'expense')
         AND c.is_group = 0
       GROUP BY c.id, c.code, c.name, c.account_type
       ORDER BY c.code`,
      [fromDate, toDate],
    );
    const income: T.ProfitLossRow[] = [];
    const expense: T.ProfitLossRow[] = [];
    let totalIncome = 0;
    let totalExpense = 0;
    for (const r of rows) {
      const amount = Math.abs(Number(r.amount));
      const row: T.ProfitLossRow = {
        accountCode: r.code,
        accountName: r.name,
        amount,
        accountType: r.account_type,
      };
      if (r.account_type === 'income') {
        income.push(row);
        totalIncome += amount;
      } else {
        expense.push(row);
        totalExpense += amount;
      }
    }
    return {
      income,
      expense,
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
    };
  },

  async getBalanceSheet(asAtDate: string): Promise<{
    assets: T.BalanceSheetRow[];
    liabilities: T.BalanceSheetRow[];
    equity: T.BalanceSheetRow[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }> {
    const rows = await query(
      `SELECT c.id, c.code, c.name, c.account_type, c.is_group, c.parent_id,
              COALESCE(c.balance, 0) AS amount
       FROM chart_of_accounts c
       WHERE c.account_type IN ('asset', 'liability', 'equity')
         AND c.is_active = 1
       ORDER BY c.code`,
    );
    const assets: T.BalanceSheetRow[] = [];
    const liabilities: T.BalanceSheetRow[] = [];
    const equity: T.BalanceSheetRow[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    for (const r of rows) {
      const amount = Number(r.amount);
      const row: T.BalanceSheetRow = {
        accountCode: r.code,
        accountName: r.name,
        amount,
        accountType: r.account_type,
        isGroup: Boolean(r.is_group),
        indent: r.parent_id ? 1 : 0,
      };
      if (r.account_type === 'asset') {
        assets.push(row);
        if (!r.is_group) totalAssets += amount;
      } else if (r.account_type === 'liability') {
        liabilities.push(row);
        if (!r.is_group) totalLiabilities += amount;
      } else {
        equity.push(row);
        if (!r.is_group) totalEquity += amount;
      }
    }
    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  },

  async getCashFlow(
    fromDate: string,
    toDate: string,
  ): Promise<{
    operating: { description: string; amount: number }[];
    investing: { description: string; amount: number }[];
    financing: { description: string; amount: number }[];
    netOperating: number;
    netInvesting: number;
    netFinancing: number;
    netCashFlow: number;
    openingBalance: number;
    closingBalance: number;
  }> {
    const bankAccounts = await query(
      `SELECT id, code, name, balance FROM chart_of_accounts
       WHERE account_sub_type = 'bank' AND is_active = 1`,
    );
    const openingBalance = sum(bankAccounts.map((a: any) => Number(a.balance)));
    const operating: { description: string; amount: number }[] = [];
    const investing: { description: string; amount: number }[] = [];
    const financing: { description: string; amount: number }[] = [];
    let netOperating = 0;
    let netInvesting = 0;
    let netFinancing = 0;

    const transactions = await query(
      `SELECT je.entry_date, je.description, je.voucher_type, jl.debit, jl.credit, c.account_sub_type
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_id
       JOIN chart_of_accounts c ON c.id = jl.account_id
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND c.account_sub_type = 'bank'
       ORDER BY je.entry_date`,
      [fromDate, toDate],
    );
    for (const t of transactions) {
      const amount = Number(t.debit) - Number(t.credit);
      const item = { description: t.description || '', amount };
      if (t.voucher_type === 'receipt' || t.voucher_type === 'payment') {
        operating.push(item);
        netOperating += amount;
      } else if (t.voucher_type === 'contra') {
        investing.push(item);
        netInvesting += amount;
      }
    }
    const netCashFlow = netOperating + netInvesting + netFinancing;
    const closingBalance = openingBalance + netCashFlow;
    return {
      operating,
      investing,
      financing,
      netOperating,
      netInvesting,
      netFinancing,
      netCashFlow,
      openingBalance,
      closingBalance,
    };
  },

  async getDayBook(
    fromDate: string,
    toDate: string,
  ): Promise<T.JournalEntry[]> {
    const rows = await query(
      `SELECT * FROM journal_entries
       WHERE status = 'posted' AND entry_date >= ? AND entry_date <= ?
       ORDER BY entry_date, created_at`,
      [fromDate, toDate],
    );
    const journals: T.JournalEntry[] = [];
    for (const r of rows) {
      const j = await R.AccountingRepository.findJournalById(r.id);
      if (j) journals.push(j);
    }
    return journals;
  },

  async getAccountStatement(
    accountId: string,
    fromDate: string,
    toDate: string,
  ): Promise<
    {
      date: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[]
  > {
    const rows = await query(
      `SELECT je.entry_date, je.description, jl.debit, jl.credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_id
       WHERE jl.account_id = ? AND je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
       ORDER BY je.entry_date, je.created_at`,
      [accountId, fromDate, toDate],
    );
    let balance = 0;
    const account = await R.AccountingRepository.findAccountById(accountId);
    const accountType = account ? account.accountType : 'asset';
    const isDebitNormal = ['asset', 'expense'].includes(accountType);
    return rows.map((r: any) => {
      const debit = Number(r.debit);
      const credit = Number(r.credit);
      if (isDebitNormal) {
        balance += debit - credit;
      } else {
        balance += credit - debit;
      }
      return {
        date: r.entry_date,
        description: r.description,
        debit,
        credit,
        balance: Math.round(balance * 100) / 100,
      };
    });
  },
};

// ── 7. DayBookService ─────────────────────────────────────────────────────

export const DayBookService = {
  async getDayBookEntry(date: string): Promise<T.JournalEntry[]> {
    return ReportService.getDayBook(date, date);
  },

  async getCashBook(date: string): Promise<any[]> {
    const cashAccounts = await query(
      `SELECT id FROM chart_of_accounts WHERE account_sub_type = 'cash' AND is_active = 1`,
    );
    if (!cashAccounts.length) return [];
    const accountIds = cashAccounts.map((a: any) => a.id);
    const placeholders = accountIds.map(() => '?').join(',');
    const rows = await query(
      `SELECT je.entry_date, je.voucher_no, je.description, jl.account_id,
              c.name AS account_name, jl.debit, jl.credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_id
       JOIN chart_of_accounts c ON c.id = jl.account_id
       WHERE jl.account_id IN (${placeholders})
         AND je.status = 'posted'
         AND je.entry_date = ?
       ORDER BY je.created_at`,
      [...accountIds, date],
    );
    return rows;
  },

  async getBankBook(date: string, bankAccountId?: string): Promise<any[]> {
    let where = `je.entry_date = ? AND je.status = 'posted'`;
    const params: any[] = [date];
    if (bankAccountId) {
      where += ` AND jl.account_id = ?`;
      params.push(bankAccountId);
    } else {
      const bankAccounts = await query(
        `SELECT id FROM chart_of_accounts WHERE account_sub_type = 'bank' AND is_active = 1`,
      );
      if (!bankAccounts.length) return [];
      const accountIds = bankAccounts.map((a: any) => a.id);
      where += ` AND jl.account_id IN (${accountIds.map(() => '?').join(',')})`;
      params.push(...accountIds);
    }
    const rows = await query(
      `SELECT je.entry_date, je.voucher_no, je.description, jl.account_id,
              c.name AS account_name, jl.debit, jl.credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_id
       JOIN chart_of_accounts c ON c.id = jl.account_id
       WHERE ${where}
       ORDER BY je.created_at`,
      params,
    );
    return rows;
  },

  async getDayBookSummary(
    fromDate: string,
    toDate: string,
  ): Promise<
    {
      voucherType: string;
      count: number;
      totalDebit: number;
      totalCredit: number;
    }[]
  > {
    return R.AccountingRepository.getJournalTotals(fromDate, toDate);
  },
};

// ── 8. ValidationService ──────────────────────────────────────────────────

export const ValidationService = {
  validateCreateJournal(dto: T.CreateJournalDto): string[] {
    return JournalService.validateCreateJournal(dto);
  },

  async validatePostJournal(journalId: string): Promise<string[]> {
    const journal = await R.AccountingRepository.findJournalById(journalId);
    if (!journal) return ['Journal not found'];
    return JournalService.validatePostJournal(journal);
  },

  async validateClosePeriod(periodId: string): Promise<string[]> {
    const errors: string[] = [];
    const period = await R.AccountingRepository.findPeriodById(periodId);
    if (!period) {
      errors.push('Period not found');
      return errors;
    }
    if (period.isClosed) errors.push('Period is already closed');
    const openJournals = await query(
      `SELECT COUNT(*) AS cnt FROM journal_entries
       WHERE period_id = ? AND status NOT IN ('posted', 'reversed', 'cancelled')`,
      [periodId],
    );
    if (Number(openJournals[0].cnt) > 0) {
      errors.push(`${openJournals[0].cnt} unposted journal(s) exist`);
    }
    const draftJournals = await query(
      `SELECT COUNT(*) AS cnt FROM journal_entries
       WHERE period_id = ? AND status = 'draft'`,
      [periodId],
    );
    if (Number(draftJournals[0].cnt) > 0) {
      errors.push(`${draftJournals[0].cnt} draft journal(s) exist`);
    }
    return errors;
  },
};

// ── 9. PeriodClosingService ───────────────────────────────────────────────

export const PeriodClosingService = {
  async closeFinancialYear(year: number): Promise<{
    closedPeriods: T.FinancialPeriod[];
    closingEntry: T.JournalEntry | null;
    openingEntry: T.JournalEntry | null;
  }> {
    const periods = await query(
      `SELECT * FROM financial_periods
       WHERE start_date >= ? AND end_date <= ? AND is_closed = 0
       ORDER BY start_date`,
      [`${year}-01-01`, `${year}-12-31`],
    );
    const closedPeriods: T.FinancialPeriod[] = [];
    for (const p of periods) {
      const closed = await PeriodService.closePeriod(p.id, 'system');
      closedPeriods.push(closed);
    }
    const pnl = await ReportService.getProfitAndLoss(
      `${year}-01-01`,
      `${year}-12-31`,
    );
    let closingEntry: T.JournalEntry | null = null;
    let openingEntry: T.JournalEntry | null = null;
    const retainedRows = await query(
      `SELECT id FROM chart_of_accounts
       WHERE account_sub_type = 'retained_earnings' AND is_active = 1
       LIMIT 1`,
    );
    if (pnl.netProfit !== 0 && retainedRows.length) {
      const retainedAccountId = retainedRows[0].id;
      const incomeAccounts = await query(
        `SELECT id, code, name FROM chart_of_accounts
         WHERE account_type = 'income' AND is_group = 0 AND is_active = 1`,
      );
      const expenseAccounts = await query(
        `SELECT id, code, name FROM chart_of_accounts
         WHERE account_type = 'expense' AND is_group = 0 AND is_active = 1`,
      );
      const closingLines: T.CreateJournalLineDto[] = [];
      for (const acct of incomeAccounts) {
        const bal = await query(
          `SELECT COALESCE(SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)), 0) AS bal
           FROM journal_lines jl
           JOIN journal_entries je ON je.id = jl.journal_id
           WHERE jl.account_id = ? AND je.status = 'posted'
             AND je.entry_date >= ? AND je.entry_date <= ?`,
          [acct.id, `${year}-01-01`, `${year}-12-31`],
        );
        const amount = Math.abs(Number(bal[0].bal));
        if (amount > 0.01) {
          closingLines.push({
            accountId: acct.id,
            debit: 0,
            credit: amount,
            description: `Closing ${year}`,
          });
        }
      }
      for (const acct of expenseAccounts) {
        const bal = await query(
          `SELECT COALESCE(SUM(COALESCE(jl.debit, 0) - COALESCE(jl.credit, 0)), 0) AS bal
           FROM journal_lines jl
           JOIN journal_entries je ON je.id = jl.journal_id
           WHERE jl.account_id = ? AND je.status = 'posted'
             AND je.entry_date >= ? AND je.entry_date <= ?`,
          [acct.id, `${year}-01-01`, `${year}-12-31`],
        );
        const amount = Math.abs(Number(bal[0].bal));
        if (amount > 0.01) {
          closingLines.push({
            accountId: acct.id,
            debit: amount,
            credit: 0,
            description: `Closing ${year}`,
          });
        }
      }
      const totalDebit = sum(
        closingLines.filter((l) => (l.debit || 0) > 0).map((l) => l.debit!),
      );
      const totalCredit = sum(
        closingLines.filter((l) => (l.credit || 0) > 0).map((l) => l.credit!),
      );
      if (!balancesAreEqual(totalDebit, totalCredit)) {
        if (totalDebit > totalCredit) {
          closingLines.push({
            accountId: retainedAccountId,
            debit: 0,
            credit: totalDebit - totalCredit,
            description: `Transfer to retained earnings ${year}`,
          });
        } else {
          closingLines.push({
            accountId: retainedAccountId,
            debit: totalCredit - totalDebit,
            credit: 0,
            description: `Transfer from retained earnings ${year}`,
          });
        }
      }
      if (closingLines.length >= 2) {
        closingEntry = await JournalService.createAndPostJournal(
          {
            entryDate: `${year}-12-31`,
            description: `Closing entries for financial year ${year}`,
            voucherType: 'closing',
            lines: closingLines,
            notes: `Year-end closing for FY ${year}`,
          },
          'system',
        );
      }
      const retainedBal = await query(
        `SELECT COALESCE(balance, 0) AS bal FROM chart_of_accounts WHERE id = ?`,
        [retainedAccountId],
      );
      const nextYear = year + 1;
      const retainedAmount = Number(retainedBal[0].bal);
      const openingLines: T.CreateJournalLineDto[] = [
        {
          accountId: retainedAccountId,
          debit: retainedAmount < 0 ? Math.abs(retainedAmount) : 0,
          credit: retainedAmount > 0 ? retainedAmount : 0,
          description: `Opening balance FY ${nextYear}`,
        },
      ];
      if (openingLines[0].debit || openingLines[0].credit) {
        openingEntry = await JournalService.createAndPostJournal(
          {
            entryDate: `${nextYear}-01-01`,
            description: `Opening entries for financial year ${nextYear}`,
            voucherType: 'opening',
            lines: openingLines,
            notes: `Year-end opening for FY ${nextYear}`,
          },
          'system',
        );
      }
    }
    return { closedPeriods, closingEntry, openingEntry };
  },

  async runPeriodClosure(periodId: string): Promise<{
    period: T.FinancialPeriod;
    closureSummary: any;
  }> {
    const period = await R.AccountingRepository.findPeriodById(periodId);
    if (!period) throw new Error(`Period not found: ${periodId}`);
    const valErrors = await ValidationService.validateClosePeriod(periodId);
    if (valErrors.length) {
      throw new Error(`Validation failed: ${valErrors.join('; ')}`);
    }
    const trialBalance = await ReportService.getTrialBalance(periodId);
    const pnl = await ReportService.getProfitAndLoss(
      period.startDate,
      period.endDate,
    );
    const dayBook = await ReportService.getDayBook(
      period.startDate,
      period.endDate,
    );
    const closed = await PeriodService.closePeriod(periodId, 'system');
    return {
      period: closed,
      closureSummary: {
        trialBalance,
        profitAndLoss: pnl,
        totalJournals: dayBook.length,
        closedAt: now(),
      },
    };
  },
};

// ── Unified export ────────────────────────────────────────────────────────

export const accountingService = {
  journal: JournalService,
  autoPost: AutoPostService,
  gst: GstService,
  period: PeriodService,
  banking: BankingService,
  report: ReportService,
  dayBook: DayBookService,
  validation: ValidationService,
  periodClosing: PeriodClosingService,
};
