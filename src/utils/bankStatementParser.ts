/**
 * bankStatementParser.ts
 * ─────────────────────────────────────────────────────────────
 * Parses bank statement CSV / TXT files exported from SBI,
 * HDFC, ICICI, Axis, Kotak, and generic CSV formats into a
 * common BankStatementRow array.
 *
 * Indian bank statement formats are quite diverse in their
 * column naming and date formatting. This parser tries multiple
 * strategies:
 *
 *  1. Detect header row and map columns by name patterns
 *  2. Fall back to positional detection
 *  3. Support dd/MM/yyyy, d/M/yyyy, dd-MM-yyyy, dd MMM yyyy formats
 */

import { uid } from './helpers';

export interface ParsedBankRow {
  id: string;
  /** ISO date string */
  date: string;
  /** Transaction description / narration */
  description: string;
  /** Ref no / Cheque no — optional */
  refNo: string;
  /** Amount debited (outflow), 0 if credit */
  debit: number;
  /** Amount credited (inflow), 0 if debit */
  credit: number;
  /** Running balance after this transaction */
  balance: number;
}

export interface ParseResult {
  rows: ParsedBankRow[];
  /** Bank name guessed from content */
  bankGuess: string;
  /** Total credits */
  totalCredit: number;
  /** Total debits */
  totalDebit: number;
  /** Opening balance (first row balance minus first txn) */
  openingBalance: number;
  /** Closing balance (last row balance) */
  closingBalance: number;
  errors: string[];
}

// ─── Date parsing ──────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parseIndianDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, ' ');

  // dd MMM yyyy  → 09 Jul 2025
  const mmmMatch = s.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/);
  if (mmmMatch) {
    const d = parseInt(mmmMatch[1], 10);
    const m = MONTH_MAP[mmmMatch[2].toLowerCase()];
    const y = parseInt(mmmMatch[3], 10);
    if (m !== undefined) return new Date(y, m, d);
  }

  // dd/MM/yyyy or dd-MM-yyyy or d/M/yyyy
  const numMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const mon = parseInt(numMatch[2], 10) - 1;
    let yr = parseInt(numMatch[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, day);
  }

  // yyyy-MM-dd (ISO-like)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // dd/MM/yy hh:mm:ss
  const tsMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+\d/);
  if (tsMatch) {
    const day = parseInt(tsMatch[1], 10);
    const mon = parseInt(tsMatch[2], 10) - 1;
    let yr = parseInt(tsMatch[3], 10);
    if (yr < 100) yr += 2000;
    return new Date(yr, mon, day);
  }

  return null;
}

// ─── Number parsing ─────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  if (!raw) return 0;
  // Remove ₹, currency symbols, spaces, commas
  const cleaned = raw.replace(/[₹$€£,\s]/g, '').trim();
  // Handle Dr / Cr suffix sometimes present
  const noSuffix = cleaned.replace(/\s*(Dr|CR|Cr|DR)\s*$/i, '');
  const num = parseFloat(noSuffix);
  return isNaN(num) ? 0 : Math.abs(num);
}

// ─── CSV tokeniser (handles quoted fields) ──────────────────────────────────

function tokeniseCSV(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Column detection ────────────────────────────────────────────────────────

type ColMap = {
  date: number;
  description: number;
  debit: number;
  credit: number;
  balance: number;
  refNo: number;
  amount: number; // single-amount column (SBI style uses Debit/Credit combined)
  drCrFlag: number; // column that says "Dr" or "Cr"
};

const DATE_PATTERNS = ['date', 'txn date', 'value date', 'transaction date', 'posting date', 'trans date', 'tran date'];
const DESC_PATTERNS = ['narration', 'description', 'particulars', 'details', 'remarks', 'transaction particulars', 'transaction details'];
const DEBIT_PATTERNS = ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawals', 'payment', 'paid out'];
const CREDIT_PATTERNS = ['credit', 'deposit', 'cr', 'credit amount', 'deposits', 'receipt', 'money in'];
const BALANCE_PATTERNS = ['balance', 'closing balance', 'running balance', 'available balance', 'bal'];
const REF_PATTERNS = ['ref', 'cheque', 'chq', 'reference', 'utr', 'transaction id', 'txn id'];
const AMOUNT_PATTERNS = ['amount', 'transaction amount'];
const DRCR_PATTERNS = ['type', 'dr/cr', 'cr/dr', 'transaction type'];

function matchPattern(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim();
  return patterns.some((p) => h === p || h.includes(p));
}

function detectColumns(headers: string[]): ColMap {
  const map: ColMap = {
    date: -1, description: -1, debit: -1, credit: -1,
    balance: -1, refNo: -1, amount: -1, drCrFlag: -1
  };

  headers.forEach((h, i) => {
    if (map.date === -1 && matchPattern(h, DATE_PATTERNS)) map.date = i;
    else if (map.description === -1 && matchPattern(h, DESC_PATTERNS)) map.description = i;
    else if (map.debit === -1 && matchPattern(h, DEBIT_PATTERNS)) map.debit = i;
    else if (map.credit === -1 && matchPattern(h, CREDIT_PATTERNS)) map.credit = i;
    else if (map.balance === -1 && matchPattern(h, BALANCE_PATTERNS)) map.balance = i;
    else if (map.refNo === -1 && matchPattern(h, REF_PATTERNS)) map.refNo = i;
    else if (map.amount === -1 && matchPattern(h, AMOUNT_PATTERNS)) map.amount = i;
    else if (map.drCrFlag === -1 && matchPattern(h, DRCR_PATTERNS)) map.drCrFlag = i;
  });

  return map;
}

// ─── Bank name guesser ───────────────────────────────────────────────────────

function guessBankName(content: string): string {
  const lower = content.slice(0, 2000).toLowerCase();
  if (lower.includes('hdfc')) return 'HDFC Bank';
  if (lower.includes('state bank') || lower.includes('sbi')) return 'SBI';
  if (lower.includes('icici')) return 'ICICI Bank';
  if (lower.includes('axis')) return 'Axis Bank';
  if (lower.includes('kotak')) return 'Kotak Bank';
  if (lower.includes('federal')) return 'Federal Bank';
  if (lower.includes('south indian bank') || lower.includes('sib')) return 'South Indian Bank';
  if (lower.includes('canara')) return 'Canara Bank';
  if (lower.includes('union bank')) return 'Union Bank';
  if (lower.includes('punjab national') || lower.includes('pnb')) return 'PNB';
  if (lower.includes('indian bank')) return 'Indian Bank';
  return 'Unknown Bank';
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseBankStatement(rawContent: string): ParseResult {
  const errors: string[] = [];
  const rows: ParsedBankRow[] = [];

  const bankGuess = guessBankName(rawContent);

  // Normalise line endings
  const lines = rawContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows, bankGuess, totalCredit: 0, totalDebit: 0, openingBalance: 0, closingBalance: 0, errors: ['File appears empty or has no data rows.'] };
  }

  // Find the header row — look for a line with 'date' in it
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const lower = lines[i].toLowerCase();
    if (DATE_PATTERNS.some((p) => lower.includes(p))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // Try to use first row that has >= 4 comma/tab separated fields
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const cols = tokeniseCSV(lines[i]);
      if (cols.length >= 4) { headerIdx = i; break; }
    }
  }

  if (headerIdx === -1) {
    errors.push('Could not find a header row. Make sure you are uploading a CSV bank statement.');
    return { rows, bankGuess, totalCredit: 0, totalDebit: 0, openingBalance: 0, closingBalance: 0, errors };
  }

  const headers = tokeniseCSV(lines[headerIdx]);
  const map = detectColumns(headers);

  if (map.date === -1) {
    errors.push('No date column detected. Trying positional fallback.');
    // positional fallback: col 0 = date, 1 = description, 2 = debit, 3 = credit, 4 = balance
    map.date = 0; map.description = 1;
    if (headers.length >= 5) {
      map.debit = 2; map.credit = 3; map.balance = 4;
    } else if (headers.length >= 4) {
      map.amount = 2; map.balance = 3;
    }
  }

  // Parse data rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = tokeniseCSV(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = map.date >= 0 ? (cols[map.date] || '') : '';
    const parsedDate = parseIndianDate(rawDate);
    if (!parsedDate) continue; // skip non-data rows (summaries, blank, etc.)

    const description = map.description >= 0 ? (cols[map.description] || '') : '';
    const refNo = map.refNo >= 0 ? (cols[map.refNo] || '') : '';
    const balanceRaw = map.balance >= 0 ? (cols[map.balance] || '0') : '0';

    let debit = 0;
    let credit = 0;

    if (map.debit >= 0 && map.credit >= 0) {
      // Standard two-column format
      debit = parseAmount(cols[map.debit] || '');
      credit = parseAmount(cols[map.credit] || '');
    } else if (map.amount >= 0) {
      // Single amount column — use Dr/Cr flag if available
      const amt = parseAmount(cols[map.amount] || '');
      if (map.drCrFlag >= 0) {
        const flag = (cols[map.drCrFlag] || '').toLowerCase();
        if (flag.includes('cr') || flag.includes('credit')) credit = amt;
        else debit = amt;
      } else {
        // Guess from balance direction
        debit = amt; // will be refined after
      }
    }

    // Determine Dr/Cr from balance change if balance column available
    const balance = parseAmount(balanceRaw);

    rows.push({
      id: uid(),
      date: parsedDate.toISOString(),
      description: description.replace(/\s+/g, ' ').trim(),
      refNo: refNo.trim(),
      debit,
      credit,
      balance
    });
  }

  // If we have balance column, infer debit/credit direction from balance movement
  if (map.balance >= 0 && map.debit === -1 && map.amount >= 0) {
    for (let i = 0; i < rows.length; i++) {
      const prev = i > 0 ? rows[i - 1].balance : rows[0].balance;
      const cur = rows[i].balance;
      const diff = cur - prev;
      if (i === 0) continue;
      if (diff > 0) {
        rows[i].credit = Math.abs(diff);
        rows[i].debit = 0;
      } else if (diff < 0) {
        rows[i].debit = Math.abs(diff);
        rows[i].credit = 0;
      }
    }
  }

  // Sort by date ascending
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Compute totals
  let totalCredit = 0;
  let totalDebit = 0;
  rows.forEach((r) => {
    totalCredit += r.credit;
    totalDebit += r.debit;
  });

  const openingBalance = rows.length > 0 ? (rows[0].balance - rows[0].credit + rows[0].debit) : 0;
  const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;

  if (rows.length === 0) {
    errors.push('No valid transaction rows found. Please check the file format.');
  }

  return { rows, bankGuess, totalCredit, totalDebit, openingBalance, closingBalance, errors };
}
