import { describe, test, expect, beforeAll, jest } from '@jest/globals';

jest.mock('../src/domains/accounting/accounting.service', () => ({
  accountingService: { postAutoPosting: jest.fn() },
}));

import { postOperationalToLedger, retryLedgerFailures } from '../src/domains/accounting/ledger-integration';
import { accountingService } from '../src/domains/accounting/accounting.service';
import { initializeDatabase, query } from '../src/db';

/**
 * FIN-01 regression: every operational transaction must reach the general
 * ledger. The glue posts via `postOperationalToLedger`; on GL failure the entry
 * is durably queued in `ledger_post_failures` and drained by `retryLedgerFailures`.
 */
describe('FIN-01 — operational transactions post to the ledger', () => {
  beforeAll(async () => {
    await initializeDatabase();
  }, 30000);

  test('posts to GL on success and leaves no failure', async () => {
    (accountingService.postAutoPosting as jest.Mock).mockResolvedValueOnce({
      journalId: 'j-1',
    });
    const id = await postOperationalToLedger('bar_sale', {
      referenceId: 's1',
      amount: 100,
    } as any);
    expect(id).toBe('j-1');
    expect(accountingService.postAutoPosting).toHaveBeenCalled();
    const rows = await query(
      'SELECT * FROM ledger_post_failures WHERE reference_id=?',
      ['s1'],
    );
    expect(rows.length).toBe(0);
  });

  test('durably queues when GL post fails (no silent drop)', async () => {
    (accountingService.postAutoPosting as jest.Mock).mockRejectedValueOnce(
      new Error('GL misconfig'),
    );
    const id = await postOperationalToLedger('restaurant_sale', {
      referenceId: 's2',
      amount: 50,
    } as any);
    expect(id).toBeNull();
    const rows = await query(
      'SELECT * FROM ledger_post_failures WHERE reference_id=? AND resolved=0',
      ['s2'],
    );
    expect(rows.length).toBe(1);
  });

  test('retryLedgerFailures drains the queue once GL recovers', async () => {
    (accountingService.postAutoPosting as jest.Mock).mockResolvedValueOnce({
      journalId: 'j-2',
    });
    const retried = await retryLedgerFailures();
    expect(retried).toBeGreaterThanOrEqual(1);
    const rows = await query(
      'SELECT * FROM ledger_post_failures WHERE reference_id=? AND resolved=0',
      ['s2'],
    );
    expect(rows.length).toBe(0);
  });
});
