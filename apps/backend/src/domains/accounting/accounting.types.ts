export type AccountType =
  'asset' | 'liability' | 'equity' | 'income' | 'expense';

export type AccountSubType =
  | 'current_asset'
  | 'fixed_asset'
  | 'bank'
  | 'cash'
  | 'current_liability'
  | 'long_term_liability'
  | 'capital'
  | 'retained_earnings'
  | 'drawings'
  | 'operating_revenue'
  | 'other_revenue'
  | 'cost_of_goods_sold'
  | 'operating_expense'
  | 'administrative_expense'
  | 'other_expense';

export type JournalStatus = 'draft' | 'posted' | 'reversed' | 'cancelled';

export type VoucherType =
  | 'payment'
  | 'receipt'
  | 'contra'
  | 'journal'
  | 'purchase'
  | 'sales'
  | 'credit_note'
  | 'debit_note'
  | 'opening'
  | 'closing'
  | 'adjustment'
  | 'accrual';

export type GstType = 'input' | 'output';

export type GstRate = 0 | 5 | 12 | 18 | 28;

export type FinancialPeriodType = 'monthly' | 'quarterly' | 'yearly';

export type AutoPostingSource =
  | 'purchase_order'
  | 'goods_receipt'
  | 'supplier_invoice'
  | 'restaurant_sale'
  | 'bar_sale'
  | 'hotel_check_in'
  | 'hotel_check_out'
  | 'hotel_folio_charge'
  | 'inventory_adjustment'
  | 'stock_count';

export type BankReconciliationStatus =
  'unreconciled' | 'cleared' | 'reconciled' | 'discrepancy';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  accountSubType: AccountSubType;
  parentId: string | null;
  isGroup: boolean;
  isActive: boolean;
  taxRate: GstRate;
  description: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  periodType: FinancialPeriodType;
  isOpen: boolean;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  entryDate: string;
  description: string;
  debitTotal: number;
  creditTotal: number;
  status: JournalStatus;
  referenceType: string | null;
  referenceId: string | null;
  periodId: string | null;
  postedAt: string | null;
  postedBy: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalOf: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: JournalLine[];
}

export interface JournalLine {
  id: string;
  journalId: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string | null;
  costCenter: string | null;
  referenceType: string | null;
  referenceId: string | null;
}

export interface AccountBalance {
  id: string;
  accountId: string;
  accountCode: string;
  periodId: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  balance: number;
}

export interface GstRegister {
  id: string;
  gstType: GstType;
  gstRate: GstRate;
  taxableAmount: number;
  gstAmount: number;
  invoiceNo: string;
  invoiceDate: string;
  partyName: string;
  partyGstin: string | null;
  journalId: string | null;
  referenceType: string;
  referenceId: string;
  period: string;
  createdAt: string;
}

export interface AutoPostingConfig {
  id: string;
  source: AutoPostingSource;
  debitAccountId: string;
  creditAccountId: string;
  gstAccountId: string | null;
  description: string;
  isActive: boolean;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
  systemBalance: number;
  difference: number;
  status: BankReconciliationStatus;
  reconciledAt: string | null;
  reconciledBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ProfitLossRow {
  accountCode: string;
  accountName: string;
  amount: number;
  accountType: 'income' | 'expense';
}

export interface BalanceSheetRow {
  accountCode: string;
  accountName: string;
  amount: number;
  accountType: AccountType;
  isGroup: boolean;
  indent: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export const VALID_ACCOUNT_TYPES: AccountType[] = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
];

export const VALID_VOUCHER_TYPES: VoucherType[] = [
  'payment',
  'receipt',
  'contra',
  'journal',
  'purchase',
  'sales',
  'credit_note',
  'debit_note',
  'opening',
  'closing',
  'adjustment',
  'accrual',
];

export const VALID_GST_RATES: GstRate[] = [0, 5, 12, 18, 28];

export interface CreateAccountDto {
  code: string;
  name: string;
  accountType: AccountType;
  accountSubType: AccountSubType;
  parentId?: string;
  isGroup?: boolean;
  taxRate?: GstRate;
  description?: string;
}

export interface CreateJournalDto {
  entryDate: string;
  description: string;
  voucherType?: VoucherType;
  lines: CreateJournalLineDto[];
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface CreateJournalLineDto {
  accountId: string;
  debit?: number;
  credit?: number;
  description?: string;
  costCenter?: string;
}

export interface JournalFilter {
  status?: JournalStatus;
  voucherType?: VoucherType;
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface AccountFilter {
  accountType?: AccountType;
  isGroup?: boolean;
  isActive?: boolean;
  search?: string;
  parentId?: string;
  offset?: number;
  limit?: number;
}

export interface GstFilter {
  gstType?: GstType;
  gstRate?: GstRate;
  fromDate?: string;
  toDate?: string;
  partyGstin?: string;
  period?: string;
  offset?: number;
  limit?: number;
}

export interface CreateBankReconciliationDto {
  bankAccountId: string;
  statementDate: string;
  statementBalance: number;
  notes?: string;
}

export interface CreateFinancialPeriodDto {
  name: string;
  startDate: string;
  endDate: string;
  periodType?: FinancialPeriodType;
}

export interface AutoPostingEntry {
  source: AutoPostingSource;
  referenceId: string;
  referenceNo: string;
  amount: number;
  gstAmount?: number;
  entryDate: string;
  description: string;
}
