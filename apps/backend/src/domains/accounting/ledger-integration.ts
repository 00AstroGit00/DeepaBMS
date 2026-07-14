/**
 * M0-1 — Ledger Integration Helper
 *
 * Centralizes the rule: "every business transaction must become an immutable
 * accounting transaction." Operational services (restaurant, bar, rooms,
 * banking) call `postOperationalToLedger` after a successful business write.
 *
 * Design: the GL post is attempted; on failure the entry is persisted to
 * `ledger_post_failures` (auditable + retryable) so a ledger misconfiguration
 * never silently drops revenue or breaks the business operation. A background
 * retry (`retryLedgerFailures`) drains the queue once the COA/config is fixed.
 */
import { run, query } from '../../db';
import { accountingService } from './accounting.service';
import type * as T from './accounting.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export type LedgerSource =
  'restaurant_sale' | 'bar_sale' | 'hotel_folio_charge';

export interface LedgerEntryInput {
  referenceId: string;
  referenceNo: string;
  amount: number;
  gstAmount?: number;
  entryDate: string;
  description: string;
}

async function dispatch(
  source: LedgerSource,
  entry: T.AutoPostingEntry,
): Promise<void> {
  const ap = accountingService.autoPost;
  if (source === 'restaurant_sale') await ap.postRestaurantSale(entry);
  else if (source === 'bar_sale') await ap.postBarSale(entry);
  else if (source === 'hotel_folio_charge') await ap.postHotelCharge(entry);
  else throw new Error(`Unknown ledger source: ${source}`);
}

export async function postOperationalToLedger(
  source: LedgerSource,
  input: LedgerEntryInput,
): Promise<void> {
  const entry: T.AutoPostingEntry = {
    source,
    referenceId: input.referenceId,
    referenceNo: input.referenceNo,
    amount: input.amount,
    gstAmount: input.gstAmount,
    entryDate: input.entryDate,
    description: input.description,
  };
  try {
    await dispatch(source, entry);
  } catch (err: any) {
    console.error(
      `[ledger] auto-post FAILED for ${source} ref=${input.referenceId}: ${err.message}`,
    );
    await run(
      `INSERT INTO ledger_post_failures (id, source, reference_id, payload, error)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uid('lpf'),
        source,
        input.referenceId,
        JSON.stringify(entry),
        err.message,
      ],
    ).catch(() => {});
  }
}

/** Drain the failure queue (call from a scheduled job / admin action). */
export async function retryLedgerFailures(): Promise<number> {
  const rows = await query(
    `SELECT * FROM ledger_post_failures WHERE resolved = 0`,
  );
  let retried = 0;
  for (const row of rows) {
    try {
      const entry: T.AutoPostingEntry = JSON.parse(row.payload);
      await dispatch(row.source, entry);
      await run(`UPDATE ledger_post_failures SET resolved = 1 WHERE id = ?`, [
        row.id,
      ]);
      retried++;
    } catch {
      /* leave for next retry */
    }
  }
  return retried;
}
