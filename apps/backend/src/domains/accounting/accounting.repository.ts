import { query, run } from '../../db';
import * as T from './accounting.types';

function rowToChartOfAccount(row: any): T.ChartOfAccount {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    accountType: row.account_type,
    accountSubType: row.account_sub_type || '',
    parentId: row.parent_id || null,
    isGroup: Boolean(row.is_group ?? false),
    isActive: Boolean(row.is_active ?? true),
    taxRate: Number(row.tax_rate || 0) as T.GstRate,
    description: row.description || null,
    balance: Number(row.balance || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToFinancialPeriod(row: any): T.FinancialPeriod {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    periodType: row.period_type || 'monthly',
    isOpen: Boolean(row.is_open ?? true),
    isClosed: Boolean(row.is_closed ?? false),
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    createdAt: row.created_at || '',
  };
}

function rowToJournalEntry(row: any): T.JournalEntry {
  return {
    id: row.id,
    voucherNo: row.voucher_no,
    voucherType: row.voucher_type,
    entryDate: row.entry_date,
    description: row.description,
    debitTotal: Number(row.debit_total || 0),
    creditTotal: Number(row.credit_total || 0),
    status: row.status || 'draft',
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
    periodId: row.period_id || null,
    postedAt: row.posted_at || null,
    postedBy: row.posted_by || null,
    reversedAt: row.reversed_at || null,
    reversedBy: row.reversed_by || null,
    reversalOf: row.reversal_of || null,
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lines: [],
  };
}

function rowToJournalLine(row: any): T.JournalLine {
  return {
    id: row.id,
    journalId: row.journal_id,
    accountId: row.account_id,
    accountCode: row.account_code,
    accountName: row.account_name,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    description: row.description || null,
    costCenter: row.cost_center || null,
    referenceType: row.reference_type || null,
    referenceId: row.reference_id || null,
  };
}

function rowToAccountBalance(row: any): T.AccountBalance {
  return {
    id: row.id,
    accountId: row.account_id,
    accountCode: row.account_code,
    periodId: row.period_id,
    openingDebit: Number(row.opening_debit || 0),
    openingCredit: Number(row.opening_credit || 0),
    periodDebit: Number(row.period_debit || 0),
    periodCredit: Number(row.period_credit || 0),
    closingDebit: Number(row.closing_debit || 0),
    closingCredit: Number(row.closing_credit || 0),
    balance: Number(row.balance || 0),
  };
}

function rowToGstRegister(row: any): T.GstRegister {
  return {
    id: row.id,
    gstType: row.gst_type,
    gstRate: Number(row.gst_rate) as T.GstRate,
    taxableAmount: Number(row.taxable_amount || 0),
    gstAmount: Number(row.gst_amount || 0),
    invoiceNo: row.invoice_no,
    invoiceDate: row.invoice_date,
    partyName: row.party_name,
    partyGstin: row.party_gstin || null,
    journalId: row.journal_id || null,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    period: row.period,
    createdAt: row.created_at || '',
  };
}

function rowToAutoPostingConfig(row: any): T.AutoPostingConfig {
  return {
    id: row.id,
    source: row.source,
    debitAccountId: row.debit_account_id,
    creditAccountId: row.credit_account_id,
    gstAccountId: row.gst_account_id || null,
    description: row.description,
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToBankReconciliation(row: any): T.BankReconciliation {
  return {
    id: row.id,
    bankAccountId: row.bank_account_id,
    statementDate: row.statement_date,
    statementBalance: Number(row.statement_balance || 0),
    systemBalance: Number(row.system_balance || 0),
    difference: Number(row.difference || 0),
    status: row.status || 'unreconciled',
    reconciledAt: row.reconciled_at || null,
    reconciledBy: row.reconciled_by || null,
    notes: row.notes || null,
    createdAt: row.created_at || '',
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function safeOrder(orderBy?: string, orderDir?: string): string {
  const allowed: string[] = [
    'created_at',
    'updated_at',
    'entry_date',
    'code',
    'name',
    'voucher_no',
    'amount',
    'balance',
  ];
  const dir = orderDir === 'asc' ? 'ASC' : 'DESC';
  return allowed.includes(orderBy || '')
    ? `ORDER BY ${orderBy} ${dir}`
    : 'ORDER BY created_at DESC';
}

function buildWhere(conditions: [string, any][], params: any[]): string {
  const cls: string[] = [];
  for (const [col, val] of conditions) {
    if (val !== undefined && val !== null) {
      if (col.includes('LIKE')) {
        cls.push(col);
        params.push(`%${val}%`);
      } else {
        cls.push(`${col} = ?`);
        params.push(val);
      }
    }
  }
  return cls.length ? 'WHERE ' + cls.join(' AND ') : '';
}

async function voucherNo(type: T.VoucherType): Promise<string> {
  const prefix =
    type === 'payment'
      ? 'PMT'
      : type === 'receipt'
        ? 'RCT'
        : type === 'contra'
          ? 'CTR'
          : type === 'purchase'
            ? 'PRC'
            : type === 'sales'
              ? 'SAL'
              : type === 'credit_note'
                ? 'CRN'
                : type === 'debit_note'
                  ? 'DBN'
                  : type === 'opening'
                    ? 'OPN'
                    : type === 'closing'
                      ? 'CLS'
                      : type === 'adjustment'
                        ? 'ADJ'
                        : type === 'accrual'
                          ? 'ACR'
                          : 'JRN';
  const now = new Date();
  const ym = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const rows = await query(
    `SELECT COUNT(*) as cnt FROM journal_entries WHERE voucher_no LIKE ?`,
    [`${prefix}-${ym}-%`],
  );
  const seq = (Number(rows[0]?.cnt || 0) + 1).toString().padStart(4, '0');
  return `${prefix}-${ym}-${seq}`;
}

export const AccountingRepository = {
  // ════════════════════════════════════════════════════════════════════════
  // CHART OF ACCOUNTS
  // ════════════════════════════════════════════════════════════════════════

  async findAllAccounts(
    filter?: T.AccountFilter,
  ): Promise<T.PaginatedResult<T.ChartOfAccount>> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.accountType)
      conditions.push(['account_type', filter.accountType]);
    if (filter?.isGroup !== undefined)
      conditions.push(['is_group', filter.isGroup ? 1 : 0]);
    if (filter?.isActive !== undefined)
      conditions.push(['is_active', filter.isActive ? 1 : 0]);
    if (filter?.parentId !== undefined)
      conditions.push(['parent_id', filter.parentId]);
    if (filter?.search)
      conditions.push(['(code LIKE ? OR name LIKE ?)', filter.search]);

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM chart_of_accounts ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM chart_of_accounts ${where} ORDER BY code ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToChartOfAccount), total, offset, limit };
  },

  async findAccountById(id: string): Promise<T.ChartOfAccount | null> {
    const rows = await query('SELECT * FROM chart_of_accounts WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToChartOfAccount(rows[0]) : null;
  },

  async findAccountByCode(code: string): Promise<T.ChartOfAccount | null> {
    const rows = await query('SELECT * FROM chart_of_accounts WHERE code = ?', [
      code,
    ]);
    return rows.length ? rowToChartOfAccount(rows[0]) : null;
  },

  async findAccountsByType(
    accountType: T.AccountType,
  ): Promise<T.ChartOfAccount[]> {
    const rows = await query(
      'SELECT * FROM chart_of_accounts WHERE account_type = ? AND is_active = 1 ORDER BY code ASC',
      [accountType],
    );
    return rows.map(rowToChartOfAccount);
  },

  async findChildAccounts(parentId: string): Promise<T.ChartOfAccount[]> {
    const rows = await query(
      'SELECT * FROM chart_of_accounts WHERE parent_id = ? ORDER BY code ASC',
      [parentId],
    );
    return rows.map(rowToChartOfAccount);
  },

  async findLeafAccounts(): Promise<T.ChartOfAccount[]> {
    const rows = await query(
      'SELECT * FROM chart_of_accounts WHERE is_group = 0 AND is_active = 1 ORDER BY code ASC',
    );
    return rows.map(rowToChartOfAccount);
  },

  async createAccount(dto: T.CreateAccountDto): Promise<T.ChartOfAccount> {
    const existing = await this.findAccountByCode(dto.code);
    if (existing)
      throw new Error(`Account with code ${dto.code} already exists`);

    if (dto.parentId) {
      const parent = await this.findAccountById(dto.parentId);
      if (!parent) throw new Error(`Parent account not found: ${dto.parentId}`);
    }

    const id = uid('coa');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO chart_of_accounts (id, code, name, account_type, account_sub_type, parent_id, is_group, is_active, tax_rate, description, balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, ?, ?)`,
      [
        id,
        dto.code,
        dto.name,
        dto.accountType,
        dto.accountSubType,
        dto.parentId || null,
        (dto.isGroup ?? false) ? 1 : 0,
        dto.taxRate ?? 0,
        dto.description || null,
        now,
        now,
      ],
    );
    const rows = await query('SELECT * FROM chart_of_accounts WHERE id = ?', [
      id,
    ]);
    return rowToChartOfAccount(rows[0]);
  },

  async updateAccount(
    id: string,
    changes: Partial<T.CreateAccountDto & { isActive: boolean }>,
  ): Promise<T.ChartOfAccount> {
    const existing = await this.findAccountById(id);
    if (!existing) throw new Error(`Account not found: ${id}`);

    if (changes.code !== undefined && changes.code !== existing.code) {
      const usedInLines = await query(
        'SELECT COUNT(*) as cnt FROM journal_lines WHERE account_id = ?',
        [id],
      );
      if (Number(usedInLines[0]?.cnt || 0) > 0) {
        throw new Error(
          'Cannot change code of account that has journal entries',
        );
      }
      const dup = await this.findAccountByCode(changes.code);
      if (dup)
        throw new Error(`Account with code ${changes.code} already exists`);
    }

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.code !== undefined) {
      sets.push('code = ?');
      params.push(changes.code);
    }
    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.accountType !== undefined) {
      sets.push('account_type = ?');
      params.push(changes.accountType);
    }
    if (changes.accountSubType !== undefined) {
      sets.push('account_sub_type = ?');
      params.push(changes.accountSubType);
    }
    if (changes.parentId !== undefined) {
      sets.push('parent_id = ?');
      params.push(changes.parentId || null);
    }
    if (changes.isGroup !== undefined) {
      sets.push('is_group = ?');
      params.push(changes.isGroup ? 1 : 0);
    }
    if (changes.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(changes.isActive ? 1 : 0);
    }
    if (changes.taxRate !== undefined) {
      sets.push('tax_rate = ?');
      params.push(changes.taxRate);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description || null);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE chart_of_accounts SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM chart_of_accounts WHERE id = ?', [
      id,
    ]);
    return rowToChartOfAccount(rows[0]);
  },

  async archiveAccount(id: string): Promise<void> {
    await run(
      'UPDATE chart_of_accounts SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  async getAccountTree(): Promise<T.ChartOfAccount[]> {
    const rows = await query(
      'SELECT * FROM chart_of_accounts ORDER BY code ASC',
    );
    return rows.map(rowToChartOfAccount);
  },

  async getAccountWithChildren(id: string): Promise<{
    account: T.ChartOfAccount;
    children: T.ChartOfAccount[];
  } | null> {
    const account = await this.findAccountById(id);
    if (!account) return null;
    const children = await this.findChildAccounts(id);
    return { account, children };
  },

  // ════════════════════════════════════════════════════════════════════════
  // FINANCIAL PERIODS
  // ════════════════════════════════════════════════════════════════════════

  async findAllPeriods(limit?: number): Promise<T.FinancialPeriod[]> {
    const rows = await query(
      'SELECT * FROM financial_periods ORDER BY start_date DESC LIMIT ?',
      [limit ?? 100],
    );
    return rows.map(rowToFinancialPeriod);
  },

  async findPeriodById(id: string): Promise<T.FinancialPeriod | null> {
    const rows = await query('SELECT * FROM financial_periods WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToFinancialPeriod(rows[0]) : null;
  },

  async findPeriodByDate(date: string): Promise<T.FinancialPeriod | null> {
    const rows = await query(
      'SELECT * FROM financial_periods WHERE start_date <= ? AND end_date >= ? ORDER BY start_date DESC LIMIT 1',
      [date, date],
    );
    return rows.length ? rowToFinancialPeriod(rows[0]) : null;
  },

  async findOpenPeriod(date?: string): Promise<T.FinancialPeriod | null> {
    let sql = 'SELECT * FROM financial_periods WHERE is_open = 1';
    const params: any[] = [];
    if (date) {
      sql += ' AND start_date <= ? AND end_date >= ?';
      params.push(date, date);
    }
    sql += ' ORDER BY start_date DESC LIMIT 1';
    const rows = await query(sql, params);
    return rows.length ? rowToFinancialPeriod(rows[0]) : null;
  },

  async createPeriod(
    dto: T.CreateFinancialPeriodDto,
  ): Promise<T.FinancialPeriod> {
    const overlap = await query(
      'SELECT * FROM financial_periods WHERE start_date <= ? AND end_date >= ? LIMIT 1',
      [dto.endDate, dto.startDate],
    );
    if (overlap.length) {
      throw new Error(
        `Period overlaps with existing period: ${overlap[0].name}`,
      );
    }

    const id = uid('fp');
    await run(
      `INSERT INTO financial_periods (id, name, start_date, end_date, period_type, is_open, is_closed)
       VALUES (?, ?, ?, ?, ?, 1, 0)`,
      [id, dto.name, dto.startDate, dto.endDate, dto.periodType || 'monthly'],
    );
    const rows = await query('SELECT * FROM financial_periods WHERE id = ?', [
      id,
    ]);
    return rowToFinancialPeriod(rows[0]);
  },

  async closePeriod(id: string, closedBy: string): Promise<T.FinancialPeriod> {
    const existing = await this.findPeriodById(id);
    if (!existing) throw new Error(`Period not found: ${id}`);

    const now = new Date().toISOString();
    await run(
      'UPDATE financial_periods SET is_open = 0, is_closed = 1, closed_at = ?, closed_by = ? WHERE id = ?',
      [now, closedBy, id],
    );

    await this.updatePeriodBalances(id);
    const rows = await query('SELECT * FROM financial_periods WHERE id = ?', [
      id,
    ]);
    return rowToFinancialPeriod(rows[0]);
  },

  // ════════════════════════════════════════════════════════════════════════
  // JOURNAL ENTRIES
  // ════════════════════════════════════════════════════════════════════════

  async findAllJournals(
    filter?: T.JournalFilter,
  ): Promise<T.PaginatedResult<any>> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    const orderClause = safeOrder(filter?.orderBy, filter?.orderDir);

    if (filter?.status) conditions.push(['je.status', filter.status]);
    if (filter?.voucherType)
      conditions.push(['je.voucher_type', filter.voucherType]);
    if (filter?.fromDate)
      conditions.push(['je.entry_date >= ?', filter.fromDate]);
    if (filter?.toDate) conditions.push(['je.entry_date <= ?', filter.toDate]);
    if (filter?.referenceType)
      conditions.push(['je.reference_type', filter.referenceType]);
    if (filter?.referenceId)
      conditions.push(['je.reference_id', filter.referenceId]);
    if (filter?.search)
      conditions.push([
        '(je.description LIKE ? OR je.voucher_no LIKE ?)',
        filter.search,
      ]);
    if (filter?.accountId) {
      conditions.push([
        'je.id IN (SELECT journal_id FROM journal_lines WHERE account_id = ?)',
        filter.accountId,
      ]);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM journal_entries je ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT je.*,
        (SELECT COUNT(*) FROM journal_lines WHERE journal_id = je.id) as line_count
       FROM journal_entries je ${where}
       ${orderClause} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const data = rows.map((r: any) => ({
      ...rowToJournalEntry(r),
      lineCount: Number(r.line_count || 0),
    }));
    return { data, total, offset, limit };
  },

  async findJournalById(id: string): Promise<T.JournalEntry | null> {
    const rows = await query('SELECT * FROM journal_entries WHERE id = ?', [
      id,
    ]);
    if (!rows.length) return null;
    const entry = rowToJournalEntry(rows[0]);
    entry.lines = await query(
      'SELECT * FROM journal_lines WHERE journal_id = ? ORDER BY debit DESC',
      [id],
    ).then((r) => r.map(rowToJournalLine));
    return entry;
  },

  async findJournalByVoucherNo(
    voucherNoStr: string,
  ): Promise<T.JournalEntry | null> {
    const rows = await query(
      'SELECT * FROM journal_entries WHERE voucher_no = ?',
      [voucherNoStr],
    );
    if (!rows.length) return null;
    const entry = rowToJournalEntry(rows[0]);
    entry.lines = await query(
      'SELECT * FROM journal_lines WHERE journal_id = ? ORDER BY debit DESC',
      [entry.id],
    ).then((r) => r.map(rowToJournalLine));
    return entry;
  },

  async findJournalsByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<T.JournalEntry[]> {
    const rows = await query(
      'SELECT * FROM journal_entries WHERE reference_type = ? AND reference_id = ? ORDER BY created_at DESC',
      [referenceType, referenceId],
    );
    return rows.map(rowToJournalEntry);
  },

  async findJournalsByPeriod(periodId: string): Promise<T.JournalEntry[]> {
    const rows = await query(
      'SELECT * FROM journal_entries WHERE period_id = ? ORDER BY entry_date ASC, created_at ASC',
      [periodId],
    );
    return rows.map(rowToJournalEntry);
  },

  async createJournal(
    dto: T.CreateJournalDto,
    voucherType?: T.VoucherType,
  ): Promise<T.JournalEntry> {
    const vType = voucherType || dto.voucherType || 'journal';

    let totalDebit = 0;
    let totalCredit = 0;
    const lineRows: {
      accountId: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      description: string | null;
      costCenter: string | null;
    }[] = [];

    for (const line of dto.lines) {
      const account = await this.findAccountById(line.accountId);
      if (!account) throw new Error(`Account not found: ${line.accountId}`);
      if (!account.isActive)
        throw new Error(`Account ${account.code} is archived`);

      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      if (debit === 0 && credit === 0) {
        throw new Error(
          `Line for account ${account.code} must have debit or credit`,
        );
      }
      totalDebit += debit;
      totalCredit += credit;

      lineRows.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit,
        description: line.description || null,
        costCenter: line.costCenter || null,
      });
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`,
      );
    }

    const period = await this.findOpenPeriod(dto.entryDate);
    const id = uid('je');
    const now = new Date().toISOString();
    const vNo = dto.voucherType
      ? await voucherNo(dto.voucherType as T.VoucherType)
      : await voucherNo(vType);

    await run(
      `INSERT INTO journal_entries (id, voucher_no, voucher_type, entry_date, description, debit_total, credit_total, status, reference_type, reference_id, period_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        vNo,
        vType,
        dto.entryDate,
        dto.description,
        totalDebit,
        totalCredit,
        dto.referenceType || null,
        dto.referenceId || null,
        period?.id || null,
        dto.notes || null,
        now,
        now,
      ],
    );

    for (const line of lineRows) {
      const lineId = uid('jl');
      await run(
        `INSERT INTO journal_lines (id, journal_id, account_id, account_code, account_name, debit, credit, description, cost_center)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          id,
          line.accountId,
          line.accountCode,
          line.accountName,
          line.debit,
          line.credit,
          line.description,
          line.costCenter,
        ],
      );
    }

    return (await this.findJournalById(id))!;
  },

  async postJournal(id: string, postedBy: string): Promise<T.JournalEntry> {
    const entry = await this.findJournalById(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    if (entry.status !== 'draft')
      throw new Error(`Journal entry ${id} is already ${entry.status}`);

    const now = new Date().toISOString();
    await run(
      `UPDATE journal_entries SET status = 'posted', posted_at = ?, posted_by = ?, updated_at = ? WHERE id = ?`,
      [now, postedBy, now, id],
    );

    for (const line of entry.lines) {
      const period = await this.findOpenPeriod(entry.entryDate);
      if (!period)
        throw new Error('No open financial period found for entry date');

      const existingBal = await query(
        'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
        [line.accountId, period.id],
      );

      if (existingBal.length) {
        await run(
          'UPDATE account_balances SET period_debit = period_debit + ?, period_credit = period_credit + ?, closing_debit = opening_debit + period_debit + ?, closing_credit = opening_credit + period_credit + ? WHERE id = ?',
          [line.debit, line.credit, line.debit, line.credit, existingBal[0].id],
        );
      } else {
        const balId = uid('ab');
        const acct = await this.findAccountById(line.accountId);
        const normalDebit =
          acct?.accountType === 'asset' || acct?.accountType === 'expense';
        const closingDebit = normalDebit ? line.debit : line.credit;
        const closingCredit = normalDebit ? line.credit : line.debit;
        const balance = closingDebit - closingCredit;

        await run(
          `INSERT INTO account_balances (id, account_id, account_code, period_id, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit, balance)
           VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`,
          [
            balId,
            line.accountId,
            line.accountCode,
            period.id,
            line.debit,
            line.credit,
            closingDebit,
            closingCredit,
            balance,
          ],
        );
      }
    }

    return (await this.findJournalById(id))!;
  },

  async reverseJournal(
    id: string,
    reversedBy: string,
  ): Promise<T.JournalEntry> {
    const original = await this.findJournalById(id);
    if (!original) throw new Error(`Journal entry not found: ${id}`);
    if (original.status !== 'posted')
      throw new Error(`Cannot reverse entry with status ${original.status}`);

    const reversalLines: T.CreateJournalLineDto[] = original.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal: ${l.description || original.description}`,
      costCenter: l.costCenter || undefined,
    }));

    const reversalId = uid('je');
    const now = new Date().toISOString();
    const vNo = await voucherNo(original.voucherType);

    await run(
      `INSERT INTO journal_entries (id, voucher_no, voucher_type, entry_date, description, debit_total, credit_total, status, reference_type, reference_id, period_id, notes, reversal_of, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)`,
      [
        reversalId,
        vNo,
        original.voucherType,
        now.split('T')[0],
        `Reversal of ${original.voucherNo}`,
        original.creditTotal,
        original.debitTotal,
        original.referenceType,
        original.referenceId,
        original.periodId,
        `Reversal: ${original.notes || ''}`,
        id,
        now,
        now,
      ],
    );

    for (const line of reversalLines) {
      const lineId = uid('jl');
      await run(
        `INSERT INTO journal_lines (id, journal_id, account_id, account_code, account_name, debit, credit, description, cost_center)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          reversalId,
          line.accountId,
          '',
          '',
          line.debit,
          line.credit,
          line.description,
          line.costCenter || null,
        ],
      );
    }

    await run(
      `UPDATE journal_entries SET status = 'reversed', reversed_at = ?, reversed_by = ?, updated_at = ? WHERE id = ?`,
      [now, reversedBy, now, id],
    );

    await this.postJournal(reversalId, reversedBy);
    return (await this.findJournalById(id))!;
  },

  async cancelJournal(id: string): Promise<void> {
    const entry = await this.findJournalById(id);
    if (!entry) throw new Error(`Journal entry not found: ${id}`);
    if (entry.status !== 'draft')
      throw new Error(`Cannot cancel entry with status ${entry.status}`);

    await run(
      "UPDATE journal_entries SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );
  },

  async getJournalTotals(fromDate: string, toDate: string): Promise<any[]> {
    const rows = await query(
      `SELECT voucher_type, COALESCE(SUM(debit_total), 0) as total_debit, COALESCE(SUM(credit_total), 0) as total_credit
       FROM journal_entries
       WHERE status = 'posted' AND entry_date >= ? AND entry_date <= ?
       GROUP BY voucher_type
       ORDER BY voucher_type`,
      [fromDate, toDate],
    );
    return rows.map((r: any) => ({
      voucherType: r.voucher_type,
      totalDebit: Number(r.total_debit),
      totalCredit: Number(r.total_credit),
    }));
  },

  async getUnpostedJournals(): Promise<T.JournalEntry[]> {
    const rows = await query(
      "SELECT * FROM journal_entries WHERE status = 'draft' ORDER BY created_at ASC",
    );
    return rows.map(rowToJournalEntry);
  },

  // ════════════════════════════════════════════════════════════════════════
  // ACCOUNT BALANCES
  // ════════════════════════════════════════════════════════════════════════

  async getAccountBalance(
    accountId: string,
    periodId: string,
  ): Promise<T.AccountBalance | null> {
    const rows = await query(
      `SELECT ab.*, coa.code as account_code
       FROM account_balances ab
       JOIN chart_of_accounts coa ON ab.account_id = coa.id
       WHERE ab.account_id = ? AND ab.period_id = ?`,
      [accountId, periodId],
    );
    return rows.length ? rowToAccountBalance(rows[0]) : null;
  },

  async getAllBalances(periodId: string): Promise<T.AccountBalance[]> {
    const rows = await query(
      `SELECT ab.*, coa.code as account_code
       FROM account_balances ab
       JOIN chart_of_accounts coa ON ab.account_id = coa.id
       WHERE ab.period_id = ?
       ORDER BY coa.code ASC`,
      [periodId],
    );
    return rows.map(rowToAccountBalance);
  },

  async updatePeriodBalances(periodId: string): Promise<void> {
    const accounts = await query(
      'SELECT * FROM chart_of_accounts WHERE is_group = 0 AND is_active = 1',
    );

    for (const acct of accounts) {
      await this.updateAccountBalanceFromLines(acct.id, periodId);
    }
  },

  async updateAccountBalanceFromLines(
    accountId: string,
    periodId: string,
  ): Promise<T.AccountBalance | null> {
    const period = await this.findPeriodById(periodId);
    if (!period) throw new Error(`Period not found: ${periodId}`);

    const lineTotals = await query(
      `SELECT
        COALESCE(SUM(jl.debit), 0) as total_debit,
        COALESCE(SUM(jl.credit), 0) as total_credit
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE jl.account_id = ? AND je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?`,
      [accountId, period.startDate, period.endDate],
    );

    const periodDebit = Number(lineTotals[0]?.total_debit || 0);
    const periodCredit = Number(lineTotals[0]?.total_credit || 0);

    const previousPeriods = await query(
      'SELECT * FROM financial_periods WHERE end_date < ? ORDER BY end_date DESC LIMIT 1',
      [period.startDate],
    );

    let openingDebit = 0;
    let openingCredit = 0;

    if (previousPeriods.length) {
      const prevBal = await query(
        'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
        [accountId, previousPeriods[0].id],
      );
      if (prevBal.length) {
        openingDebit = Number(prevBal[0].closing_debit || 0);
        openingCredit = Number(prevBal[0].closing_credit || 0);
      }
    }

    const acct = await this.findAccountById(accountId);
    const isDebitNormal =
      acct?.accountType === 'asset' || acct?.accountType === 'expense';

    const closingDebit = openingDebit + periodDebit;
    const closingCredit = openingCredit + periodCredit;
    const balance = isDebitNormal
      ? closingDebit - closingCredit
      : closingCredit - closingDebit;

    const existing = await query(
      'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
      [accountId, periodId],
    );

    if (existing.length) {
      await run(
        `UPDATE account_balances SET
          opening_debit = ?, opening_credit = ?,
          period_debit = ?, period_credit = ?,
          closing_debit = ?, closing_credit = ?,
          balance = ?
         WHERE id = ?`,
        [
          openingDebit,
          openingCredit,
          periodDebit,
          periodCredit,
          closingDebit,
          closingCredit,
          balance,
          existing[0].id,
        ],
      );
    } else {
      const balId = uid('ab');
      const acctRow = acct!;
      await run(
        `INSERT INTO account_balances (id, account_id, account_code, period_id, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit, balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          balId,
          accountId,
          acctRow.code,
          periodId,
          openingDebit,
          openingCredit,
          periodDebit,
          periodCredit,
          closingDebit,
          closingCredit,
          balance,
        ],
      );
    }

    const rows = await query(
      'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
      [accountId, periodId],
    );
    return rows.length ? rowToAccountBalance(rows[0]) : null;
  },

  async rollForwardBalance(
    accountId: string,
    fromPeriodId: string,
    toPeriodId: string,
  ): Promise<T.AccountBalance> {
    const fromBal = await this.getAccountBalance(accountId, fromPeriodId);
    if (!fromBal)
      throw new Error(
        `Balance not found for account ${accountId} in period ${fromPeriodId}`,
      );

    const toPeriod = await this.findPeriodById(toPeriodId);
    if (!toPeriod) throw new Error(`Target period not found: ${toPeriodId}`);

    const acct = await this.findAccountById(accountId);
    const isDebitNormal =
      acct?.accountType === 'asset' || acct?.accountType === 'expense';
    const openingDebit = isDebitNormal
      ? fromBal.closingDebit
      : fromBal.closingCredit;
    const openingCredit = isDebitNormal
      ? fromBal.closingCredit
      : fromBal.closingDebit;

    const existing = await query(
      'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
      [accountId, toPeriodId],
    );

    if (existing.length) {
      await run(
        `UPDATE account_balances SET
          opening_debit = opening_debit + ?, opening_credit = opening_credit + ?
         WHERE id = ?`,
        [openingDebit, openingCredit, existing[0].id],
      );
      const rows = await query('SELECT * FROM account_balances WHERE id = ?', [
        existing[0].id,
      ]);
      return rowToAccountBalance(rows[0]);
    }

    const balId = uid('ab');
    await run(
      `INSERT INTO account_balances (id, account_id, account_code, period_id, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit, balance)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        balId,
        accountId,
        fromBal.accountCode,
        toPeriodId,
        openingDebit,
        openingCredit,
        openingDebit,
        openingCredit,
        openingDebit - openingCredit,
      ],
    );
    const rows = await query('SELECT * FROM account_balances WHERE id = ?', [
      balId,
    ]);
    return rowToAccountBalance(rows[0]);
  },

  async initializeAccountBalance(
    accountId: string,
    periodId: string,
    openingDebit: number,
    openingCredit: number,
  ): Promise<T.AccountBalance> {
    const existing = await query(
      'SELECT * FROM account_balances WHERE account_id = ? AND period_id = ?',
      [accountId, periodId],
    );

    if (existing.length) {
      throw new Error(
        `Balance already exists for account ${accountId} in period ${periodId}`,
      );
    }

    const acct = await this.findAccountById(accountId);
    if (!acct) throw new Error(`Account not found: ${accountId}`);

    const isDebitNormal =
      acct.accountType === 'asset' || acct.accountType === 'expense';
    const balId = uid('ab');
    const closingDebit = isDebitNormal ? openingDebit : openingCredit;
    const closingCredit = isDebitNormal ? openingCredit : openingDebit;
    const balance = closingDebit - closingCredit;

    await run(
      `INSERT INTO account_balances (id, account_id, account_code, period_id, opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit, balance)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        balId,
        accountId,
        acct.code,
        periodId,
        openingDebit,
        openingCredit,
        closingDebit,
        closingCredit,
        balance,
      ],
    );
    const rows = await query('SELECT * FROM account_balances WHERE id = ?', [
      balId,
    ]);
    return rowToAccountBalance(rows[0]);
  },

  async getTrialBalance(periodId: string): Promise<T.TrialBalanceRow[]> {
    const rows = await query(
      `SELECT ab.*, coa.code as account_code, coa.name as account_name, coa.account_type
       FROM account_balances ab
       JOIN chart_of_accounts coa ON ab.account_id = coa.id
       WHERE ab.period_id = ?
       ORDER BY coa.code ASC`,
      [periodId],
    );

    return rows.map((r: any) => ({
      accountCode: r.account_code,
      accountName: r.account_name,
      accountType: r.account_type,
      openingDebit: Number(r.opening_debit || 0),
      openingCredit: Number(r.opening_credit || 0),
      periodDebit: Number(r.period_debit || 0),
      periodCredit: Number(r.period_credit || 0),
      closingDebit: Number(r.closing_debit || 0),
      closingCredit: Number(r.closing_credit || 0),
    }));
  },

  // ════════════════════════════════════════════════════════════════════════
  // GST REGISTERS
  // ════════════════════════════════════════════════════════════════════════

  async findAllGst(
    filter?: T.GstFilter,
  ): Promise<T.PaginatedResult<T.GstRegister>> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.gstType) conditions.push(['gst_type', filter.gstType]);
    if (filter?.gstRate !== undefined)
      conditions.push(['gst_rate', filter.gstRate]);
    if (filter?.fromDate)
      conditions.push(['invoice_date >= ?', filter.fromDate]);
    if (filter?.toDate) conditions.push(['invoice_date <= ?', filter.toDate]);
    if (filter?.partyGstin) conditions.push(['party_gstin', filter.partyGstin]);
    if (filter?.period) conditions.push(['period', filter.period]);

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM gst_registers ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM gst_registers ${where} ORDER BY invoice_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToGstRegister), total, offset, limit };
  },

  async findGstById(id: string): Promise<T.GstRegister | null> {
    const rows = await query('SELECT * FROM gst_registers WHERE id = ?', [id]);
    return rows.length ? rowToGstRegister(rows[0]) : null;
  },

  async getGstSummary(
    gstType: T.GstType,
    fromDate: string,
    toDate: string,
    gstRate?: T.GstRate,
  ): Promise<any[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    conditions.push(['gst_type', gstType]);
    conditions.push(['invoice_date >= ?', fromDate]);
    conditions.push(['invoice_date <= ?', toDate]);
    if (gstRate !== undefined) conditions.push(['gst_rate', gstRate]);

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT gst_rate, COALESCE(SUM(taxable_amount), 0) as total_taxable, COALESCE(SUM(gst_amount), 0) as total_gst, COUNT(*) as entry_count
       FROM gst_registers ${where}
       GROUP BY gst_rate
       ORDER BY gst_rate`,
      params,
    );
    return rows.map((r: any) => ({
      gstRate: Number(r.gst_rate),
      totalTaxable: Number(r.total_taxable),
      totalGst: Number(r.total_gst),
      entryCount: Number(r.entry_count),
    }));
  },

  async getGstByPeriod(period: string): Promise<any> {
    const rows = await query(
      `SELECT
        gst_type, gst_rate,
        COALESCE(SUM(taxable_amount), 0) as total_taxable,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COUNT(*) as entry_count
       FROM gst_registers WHERE period = ?
       GROUP BY gst_type, gst_rate
       ORDER BY gst_type, gst_rate`,
      [period],
    );
    return rows.map((r: any) => ({
      gstType: r.gst_type,
      gstRate: Number(r.gst_rate),
      totalTaxable: Number(r.total_taxable),
      totalGst: Number(r.total_gst),
      entryCount: Number(r.entry_count),
    }));
  },

  async createGstEntry(
    dto: Omit<T.GstRegister, 'id' | 'createdAt'>,
  ): Promise<T.GstRegister> {
    const id = uid('gr');
    await run(
      `INSERT INTO gst_registers (id, gst_type, gst_rate, taxable_amount, gst_amount, invoice_no, invoice_date, party_name, party_gstin, journal_id, reference_type, reference_id, period, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.gstType,
        dto.gstRate,
        dto.taxableAmount,
        dto.gstAmount,
        dto.invoiceNo,
        dto.invoiceDate,
        dto.partyName,
        dto.partyGstin || null,
        dto.journalId || null,
        dto.referenceType,
        dto.referenceId,
        dto.period,
        new Date().toISOString(),
      ],
    );
    const rows = await query('SELECT * FROM gst_registers WHERE id = ?', [id]);
    return rowToGstRegister(rows[0]);
  },

  async getGstReturnData(period: string, gstType: T.GstType): Promise<any> {
    const rows = await query(
      `SELECT
        gst_rate,
        COALESCE(SUM(taxable_amount), 0) as total_taxable,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COUNT(*) as invoice_count
       FROM gst_registers
       WHERE period = ? AND gst_type = ?
       GROUP BY gst_rate
       ORDER BY gst_rate`,
      [period, gstType],
    );
    const summary = {
      period,
      gstType,
      totalTaxable: 0,
      totalGst: 0,
      totalInvoices: 0,
      byRate: rows.map((r: any) => {
        summary.totalTaxable += Number(r.total_taxable);
        summary.totalGst += Number(r.total_gst);
        summary.totalInvoices += Number(r.invoice_count);
        return {
          gstRate: Number(r.gst_rate),
          taxableAmount: Number(r.total_taxable),
          gstAmount: Number(r.total_gst),
          invoiceCount: Number(r.invoice_count),
        };
      }),
    };
    return summary;
  },

  // ════════════════════════════════════════════════════════════════════════
  // AUTO-POSTING CONFIG
  // ════════════════════════════════════════════════════════════════════════

  async findAllConfigs(): Promise<T.AutoPostingConfig[]> {
    const rows = await query(
      'SELECT * FROM auto_posting_config ORDER BY source ASC',
    );
    return rows.map(rowToAutoPostingConfig);
  },

  async findConfigBySource(
    source: T.AutoPostingSource,
  ): Promise<T.AutoPostingConfig | null> {
    const rows = await query(
      'SELECT * FROM auto_posting_config WHERE source = ?',
      [source],
    );
    return rows.length ? rowToAutoPostingConfig(rows[0]) : null;
  },

  async createConfig(
    dto: Omit<T.AutoPostingConfig, 'id'>,
  ): Promise<T.AutoPostingConfig> {
    const existing = await this.findConfigBySource(dto.source);
    if (existing)
      throw new Error(`Config for source ${dto.source} already exists`);

    const debitAcct = await this.findAccountById(dto.debitAccountId);
    if (!debitAcct)
      throw new Error(`Debit account not found: ${dto.debitAccountId}`);
    const creditAcct = await this.findAccountById(dto.creditAccountId);
    if (!creditAcct)
      throw new Error(`Credit account not found: ${dto.creditAccountId}`);
    if (dto.gstAccountId) {
      const gstAcct = await this.findAccountById(dto.gstAccountId);
      if (!gstAcct)
        throw new Error(`GST account not found: ${dto.gstAccountId}`);
    }

    const id = uid('apc');
    await run(
      `INSERT INTO auto_posting_config (id, source, debit_account_id, credit_account_id, gst_account_id, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.source,
        dto.debitAccountId,
        dto.creditAccountId,
        dto.gstAccountId || null,
        dto.description,
        dto.isActive ? 1 : 0,
      ],
    );
    const rows = await query('SELECT * FROM auto_posting_config WHERE id = ?', [
      id,
    ]);
    return rowToAutoPostingConfig(rows[0]);
  },

  async updateConfig(
    id: string,
    changes: Partial<Omit<T.AutoPostingConfig, 'id'>>,
  ): Promise<T.AutoPostingConfig> {
    const existing = await query(
      'SELECT * FROM auto_posting_config WHERE id = ?',
      [id],
    );
    if (!existing.length)
      throw new Error(`Auto-posting config not found: ${id}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (changes.debitAccountId !== undefined) {
      sets.push('debit_account_id = ?');
      params.push(changes.debitAccountId);
    }
    if (changes.creditAccountId !== undefined) {
      sets.push('credit_account_id = ?');
      params.push(changes.creditAccountId);
    }
    if (changes.gstAccountId !== undefined) {
      sets.push('gst_account_id = ?');
      params.push(changes.gstAccountId || null);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(changes.isActive ? 1 : 0);
    }

    if (params.length === 0) return rowToAutoPostingConfig(existing[0]);
    await run(
      `UPDATE auto_posting_config SET ${sets.join(', ')} WHERE id = ?`,
      [...params, id],
    );
    const rows = await query('SELECT * FROM auto_posting_config WHERE id = ?', [
      id,
    ]);
    return rowToAutoPostingConfig(rows[0]);
  },

  async autoPost(
    entry: T.AutoPostingEntry,
    postedBy: string,
  ): Promise<T.JournalEntry> {
    const config = await this.findConfigBySource(entry.source);
    if (!config)
      throw new Error(`No auto-posting config for source: ${entry.source}`);
    if (!config.isActive)
      throw new Error(`Auto-posting config for ${entry.source} is inactive`);

    const lines: T.CreateJournalLineDto[] = [
      {
        accountId: config.debitAccountId,
        debit: entry.amount,
        description: entry.description,
      },
      {
        accountId: config.creditAccountId,
        credit: entry.amount,
        description: entry.description,
      },
    ];

    if (entry.gstAmount && config.gstAccountId) {
      lines.push({
        accountId: config.gstAccountId,
        debit: entry.gstAmount,
        description: `GST on ${entry.description}`,
      });
    }

    const journal = await this.createJournal({
      entryDate: entry.entryDate,
      description: `${config.description}: ${entry.description}`,
      lines,
      referenceType: entry.source,
      referenceId: entry.referenceId,
    });

    await run(`UPDATE journal_entries SET notes = ? WHERE id = ?`, [
      entry.referenceNo ? `Ref: ${entry.referenceNo}` : null,
      journal.id,
    ]);

    return this.postJournal(journal.id, postedBy);
  },

  // ════════════════════════════════════════════════════════════════════════
  // BANK RECONCILIATION
  // ════════════════════════════════════════════════════════════════════════

  async findAllReconciliations(
    bankAccountId?: string,
    limitNum?: number,
  ): Promise<T.BankReconciliation[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (bankAccountId) conditions.push(['bank_account_id', bankAccountId]);

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM bank_reconciliation ${where} ORDER BY statement_date DESC LIMIT ?`,
      [...params, limitNum ?? 50],
    );
    return rows.map(rowToBankReconciliation);
  },

  async findReconciliationById(
    id: string,
  ): Promise<T.BankReconciliation | null> {
    const rows = await query('SELECT * FROM bank_reconciliation WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToBankReconciliation(rows[0]) : null;
  },

  async createReconciliation(
    dto: T.CreateBankReconciliationDto,
    systemBalance: number,
  ): Promise<T.BankReconciliation> {
    const id = uid('br');
    const difference = dto.statementBalance - systemBalance;
    await run(
      `INSERT INTO bank_reconciliation (id, bank_account_id, statement_date, statement_balance, system_balance, difference, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'unreconciled', ?, ?)`,
      [
        id,
        dto.bankAccountId,
        dto.statementDate,
        dto.statementBalance,
        systemBalance,
        difference,
        dto.notes || null,
        new Date().toISOString(),
      ],
    );
    const rows = await query('SELECT * FROM bank_reconciliation WHERE id = ?', [
      id,
    ]);
    return rowToBankReconciliation(rows[0]);
  },

  async updateReconciliationStatus(
    id: string,
    status: T.BankReconciliationStatus,
    reconciledBy: string,
  ): Promise<T.BankReconciliation> {
    const now = new Date().toISOString();
    await run(
      `UPDATE bank_reconciliation SET status = ?, reconciled_at = ?, reconciled_by = ? WHERE id = ?`,
      [status, now, reconciledBy, id],
    );
    const rows = await query('SELECT * FROM bank_reconciliation WHERE id = ?', [
      id,
    ]);
    return rowToBankReconciliation(rows[0]);
  },

  async getOutstandingTransactions(
    bankAccountId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any[]> {
    const rows = await query(
      `SELECT bm.*, ba.name as bank_name
       FROM bank_moves bm
       JOIN bank_accounts ba ON bm.bank_id = ba.id
       WHERE bm.bank_id = ?
         AND bm.date >= ? AND bm.date <= ?
         AND bm.id NOT IN (
           SELECT reference_id FROM bank_reconciliation br
           WHERE br.bank_account_id = ? AND br.status IN ('reconciled', 'cleared')
         )
       ORDER BY bm.date ASC`,
      [bankAccountId, fromDate, toDate, bankAccountId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      date: r.date,
      kind: r.kind,
      amount: Number(r.amount),
      note: r.note || null,
      bankName: r.bank_name,
    }));
  },

  async getReconciliationSummary(bankAccountId: string): Promise<any> {
    const lastRecon = await query(
      `SELECT * FROM bank_reconciliation WHERE bank_account_id = ? ORDER BY statement_date DESC LIMIT 1`,
      [bankAccountId],
    );

    const bankAccount = await query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [bankAccountId],
    );

    const systemBalance = bankAccount.length
      ? Number(bankAccount[0].balance)
      : 0;

    return {
      bankAccountId,
      systemBalance,
      lastReconciliation: lastRecon.length
        ? {
            date: lastRecon[0].statement_date,
            statementBalance: Number(lastRecon[0].statement_balance),
            difference: Number(lastRecon[0].difference),
            status: lastRecon[0].status,
          }
        : null,
    };
  },

  // ════════════════════════════════════════════════════════════════════════
  // REPORTING
  // ════════════════════════════════════════════════════════════════════════

  async getTrialBalanceReport(periodId?: string): Promise<any> {
    let period = null;
    if (periodId) {
      period = await this.findPeriodById(periodId);
      if (!period) throw new Error(`Period not found: ${periodId}`);
    } else {
      const periods = await this.findAllPeriods(1);
      period = periods[0] || null;
    }

    if (!period) {
      return { period: null, rows: [], totalDebit: 0, totalCredit: 0 };
    }

    const rows = await this.getTrialBalance(period.id);

    let totalDebit = 0;
    let totalCredit = 0;
    for (const r of rows) {
      totalDebit += r.closingDebit;
      totalCredit += r.closingCredit;
    }

    return {
      period: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
      },
      rows,
      totalDebit,
      totalCredit,
      inBalance: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  },

  async getProfitAndLoss(fromDate: string, toDate: string): Promise<any> {
    const incomePeriod = await this.findPeriodByDate(toDate);
    const periodId = incomePeriod?.id || null;

    const incomeRows = await query(
      `SELECT coa.id, coa.code, coa.name, coa.account_sub_type,
              COALESCE(ab.closing_debit, 0) as closing_debit,
              COALESCE(ab.closing_credit, 0) as closing_credit
       FROM chart_of_accounts coa
       LEFT JOIN account_balances ab ON coa.id = ab.account_id AND ab.period_id = ?
       WHERE coa.account_type = 'income' AND coa.is_group = 0 AND coa.is_active = 1
       ORDER BY coa.code ASC`,
      periodId ? [periodId] : [],
    );

    const expenseRows = await query(
      `SELECT coa.id, coa.code, coa.name, coa.account_sub_type,
              COALESCE(ab.closing_debit, 0) as closing_debit,
              COALESCE(ab.closing_credit, 0) as closing_credit
       FROM chart_of_accounts coa
       LEFT JOIN account_balances ab ON coa.id = ab.account_id AND ab.period_id = ?
       WHERE coa.account_type = 'expense' AND coa.is_group = 0 AND coa.is_active = 1
       ORDER BY coa.code ASC`,
      periodId ? [periodId] : [],
    );

    const income: T.ProfitLossRow[] = incomeRows.map((r: any) => ({
      accountCode: r.code,
      accountName: r.name,
      amount: Number(r.closing_credit) - Number(r.closing_debit),
      accountType: 'income' as const,
    }));

    const expenses: T.ProfitLossRow[] = expenseRows.map((r: any) => ({
      accountCode: r.code,
      accountName: r.name,
      amount: Number(r.closing_debit) - Number(r.closing_credit),
      accountType: 'expense' as const,
    }));

    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      fromDate,
      toDate,
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      isProfit: netProfit >= 0,
    };
  },

  async getBalanceSheet(asAtDate: string): Promise<any> {
    const period = await this.findPeriodByDate(asAtDate);
    const periodId = period?.id || null;
    const params: any[] = periodId ? [periodId] : [];

    const assetRows = await query(
      `SELECT coa.id, coa.code, coa.name, coa.is_group, coa.parent_id,
              COALESCE(ab.closing_debit, 0) - COALESCE(ab.closing_credit, 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN account_balances ab ON coa.id = ab.account_id AND ab.period_id = ?
       WHERE coa.account_type = 'asset' AND coa.is_active = 1
       ORDER BY coa.code ASC`,
      params.length ? params : [],
    );

    const liabilityRows = await query(
      `SELECT coa.id, coa.code, coa.name, coa.is_group, coa.parent_id,
              COALESCE(ab.closing_credit, 0) - COALESCE(ab.closing_debit, 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN account_balances ab ON coa.id = ab.account_id AND ab.period_id = ?
       WHERE coa.account_type = 'liability' AND coa.is_active = 1
       ORDER BY coa.code ASC`,
      params.length ? params : [],
    );

    const equityRows = await query(
      `SELECT coa.id, coa.code, coa.name, coa.is_group, coa.parent_id,
              COALESCE(ab.closing_credit, 0) - COALESCE(ab.closing_debit, 0) as balance
       FROM chart_of_accounts coa
       LEFT JOIN account_balances ab ON coa.id = ab.account_id AND ab.period_id = ?
       WHERE coa.account_type = 'equity' AND coa.is_active = 1
       ORDER BY coa.code ASC`,
      params.length ? params : [],
    );

    const mapRow = (r: any, indent: number): T.BalanceSheetRow => ({
      accountCode: r.code,
      accountName: r.name,
      amount: Number(r.balance || 0),
      accountType: r.account_type || r.accountType,
      isGroup: Boolean(r.is_group ?? false),
      indent,
    });

    const assets = assetRows.map((r: any) => mapRow(r, 0));
    const liabilities = liabilityRows.map((r: any) => mapRow(r, 0));
    const equity = equityRows.map((r: any) => mapRow(r, 0));

    const totalAssets = assets
      .filter((a) => !a.isGroup)
      .reduce((s, r) => s + Math.abs(r.amount), 0);
    const totalLiabilities = liabilities
      .filter((l) => !l.isGroup)
      .reduce((s, r) => s + Math.abs(r.amount), 0);
    const totalEquity = equity
      .filter((e) => !e.isGroup)
      .reduce((s, r) => s + Math.abs(r.amount), 0);

    return {
      asAtDate,
      periodName: period?.name || null,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesEquity: totalLiabilities + totalEquity,
      inBalance:
        Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  },

  async getCashFlow(fromDate: string, toDate: string): Promise<any> {
    const bankAccounts = await query('SELECT id, name FROM bank_accounts');

    const operatingIncome = await query(
      `SELECT COALESCE(SUM(jl.debit), 0) as total
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND je.voucher_type IN ('sales', 'receipt')`,
      [fromDate, toDate],
    );

    const operatingExpenses = await query(
      `SELECT COALESCE(SUM(jl.credit), 0) as total
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND je.voucher_type IN ('purchase', 'payment')`,
      [fromDate, toDate],
    );

    const investing = await query(
      `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) as total
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       JOIN chart_of_accounts coa ON jl.account_id = coa.id
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND coa.account_type = 'asset' AND coa.account_sub_type = 'fixed_asset'`,
      [fromDate, toDate],
    );

    return {
      fromDate,
      toDate,
      operating: {
        inflows: Number(operatingIncome[0]?.total || 0),
        outflows: Number(operatingExpenses[0]?.total || 0),
        net:
          Number(operatingIncome[0]?.total || 0) -
          Number(operatingExpenses[0]?.total || 0),
      },
      investing: {
        net: Number(investing[0]?.total || 0),
      },
      financing: {
        net: 0,
      },
      netCashFlow:
        Number(operatingIncome[0]?.total || 0) -
        Number(operatingExpenses[0]?.total || 0) +
        Number(investing[0]?.total || 0),
      bankAccounts: bankAccounts.map((b: any) => ({
        id: b.id,
        name: b.name,
      })),
    };
  },

  async getDayBook(fromDate: string, toDate: string): Promise<any[]> {
    const rows = await query(
      `SELECT je.*,
        (SELECT COUNT(*) FROM journal_lines WHERE journal_id = je.id) as line_count
       FROM journal_entries je
       WHERE je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
       ORDER BY je.entry_date ASC, je.created_at ASC`,
      [fromDate, toDate],
    );

    const result = [];
    for (const r of rows) {
      const entry = rowToJournalEntry(r);
      entry.lines = await query(
        'SELECT * FROM journal_lines WHERE journal_id = ? ORDER BY debit DESC',
        [entry.id],
      ).then((lr) => lr.map(rowToJournalLine));
      result.push(entry);
    }
    return result;
  },

  async getAccountStatement(
    accountId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any> {
    const account = await this.findAccountById(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);

    const openingBalance = await query(
      `SELECT COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE jl.account_id = ? AND je.status = 'posted' AND je.entry_date < ?`,
      [accountId, fromDate],
    );

    const transactions = await query(
      `SELECT je.entry_date, je.voucher_no, je.voucher_type, je.description as je_description,
              jl.debit, jl.credit, jl.description as line_description
       FROM journal_lines jl
       JOIN journal_entries je ON jl.journal_id = je.id
       WHERE jl.account_id = ? AND je.status = 'posted'
         AND je.entry_date >= ? AND je.entry_date <= ?
       ORDER BY je.entry_date ASC, je.created_at ASC`,
      [accountId, fromDate, toDate],
    );

    const isDebitNormal =
      account.accountType === 'asset' || account.accountType === 'expense';
    const openingBal = isDebitNormal
      ? Number(openingBalance[0]?.balance || 0)
      : -Number(openingBalance[0]?.balance || 0);

    let runningBalance = openingBal;
    const lines = transactions.map((r: any) => {
      const debit = Number(r.debit || 0);
      const credit = Number(r.credit || 0);
      runningBalance += isDebitNormal ? debit - credit : credit - debit;
      return {
        date: r.entry_date,
        voucherNo: r.voucher_no,
        voucherType: r.voucher_type,
        description: r.line_description || r.je_description,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
      },
      fromDate,
      toDate,
      openingBalance: openingBal,
      closingBalance: lines.length ? runningBalance : openingBal,
      transactions: lines,
    };
  },
};
