import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { AccountingRepository } from './accounting.repository';
import { accountingService } from './accounting.service';
import * as T from './accounting.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Invalid') ||
        err.message?.includes('required') ||
        err.message?.includes('Validation') ||
        err.message?.includes('balance') ||
        err.message?.includes('duplicate') ||
        err.message?.includes('Cannot') ||
        err.message?.includes('already') ||
        err.message?.includes('positive') ||
        err.message?.includes('unbalanced') ||
        err.message?.includes('must be') ||
        err.message?.includes('overlap') ||
        err.message?.includes('Insufficient')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || msg });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/accounts',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        accountType,
        isGroup,
        isActive,
        search,
        parentId,
        offset,
        limit,
      } = req.query as any;
      const result = await AccountingRepository.findAllAccounts({
        accountType,
        isGroup: isGroup !== undefined ? isGroup === 'true' : undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
        parentId,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/accounts/tree',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const accounts = await AccountingRepository.getAccountTree();
      res.json(accounts);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/accounts/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await AccountingRepository.findAccountById(req.params.id);
      if (!account) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      res.json(account);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/accounts/by-type/:type',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type } = req.params;
      if (!T.VALID_ACCOUNT_TYPES.includes(type as T.AccountType)) {
        res.status(400).json({ message: `Invalid account type: ${type}` });
        return;
      }
      const accounts = await AccountingRepository.findAccountsByType(
        type as T.AccountType,
      );
      res.json(accounts);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/accounts/:id/children',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await AccountingRepository.getAccountWithChildren(
        req.params.id,
      );
      if (!result) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/accounts',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        code,
        name,
        accountType,
        accountSubType,
        parentId,
        isGroup,
        taxRate,
        description,
      } = req.body;
      if (!code || !name || !accountType || !accountSubType) {
        res.status(400).json({
          message: 'code, name, accountType, and accountSubType are required',
        });
        return;
      }
      if (!T.VALID_ACCOUNT_TYPES.includes(accountType)) {
        res
          .status(400)
          .json({ message: `Invalid account type: ${accountType}` });
        return;
      }
      const account = await AccountingRepository.createAccount({
        code,
        name,
        accountType,
        accountSubType,
        parentId,
        isGroup,
        taxRate,
        description,
      });
      res.status(201).json(account);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/accounts/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await AccountingRepository.updateAccount(
        req.params.id,
        req.body,
      );
      res.json(account);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/accounts/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AccountingRepository.archiveAccount(req.params.id);
      res.json({ message: 'Account archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// JOURNAL ENTRIES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/journals',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        voucherType,
        fromDate,
        toDate,
        accountId,
        referenceType,
        referenceId,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await AccountingRepository.findAllJournals({
        status,
        voucherType,
        fromDate,
        toDate,
        accountId,
        referenceType,
        referenceId,
        search,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
        orderBy,
        orderDir,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/journals/unposted',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const journals = await AccountingRepository.getUnpostedJournals();
      res.json(journals);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/journals/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await AccountingRepository.findJournalById(req.params.id);
      if (!journal) {
        res.status(404).json({ message: 'Journal entry not found' });
        return;
      }
      res.json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/journals/by-voucher/:voucherNo',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await AccountingRepository.findJournalByVoucherNo(
        req.params.voucherNo,
      );
      if (!journal) {
        res.status(404).json({ message: 'Journal entry not found' });
        return;
      }
      res.json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/journals/totals',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const totals = await AccountingRepository.getJournalTotals(
        fromDate,
        toDate,
      );
      res.json(totals);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/journals',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.journal.createAndPostJournal(
        req.body,
        req.user?.name || 'system',
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/journals/draft',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.journal.createDraftJournal(
        req.body,
        req.user?.name || 'system',
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/journals/:id/post',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.journal.postJournal(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/journals/:id/reverse',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.journal.reverseJournal(
        req.params.id,
        req.user?.name || 'system',
        req.body.reason,
      );
      res.json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/journals/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await accountingService.journal.cancelJournal(req.params.id);
      res.json({ message: 'Journal entry cancelled' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-POSTING
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/auto-post/purchase',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.autoPost.postPurchaseOrder(
        req.body,
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/auto-post/restaurant-sale',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.autoPost.postRestaurantSale(
        req.body,
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/auto-post/bar-sale',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.autoPost.postBarSale(req.body);
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/auto-post/hotel-charge',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.autoPost.postHotelCharge(
        req.body,
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/auto-post/inventory-adjustment',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const journal = await accountingService.autoPost.postInventoryAdjustment(
        req.body,
      );
      res.status(201).json(journal);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/auto-post/config',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const configs = await AccountingRepository.findAllConfigs();
      res.json(configs);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/auto-post/config',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = await AccountingRepository.createConfig(req.body);
      res.status(201).json(config);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/auto-post/config/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = await AccountingRepository.updateConfig(
        req.params.id,
        req.body,
      );
      res.json(config);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// GST
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/gst',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        gstType,
        gstRate,
        fromDate,
        toDate,
        partyGstin,
        period,
        offset,
        limit,
      } = req.query as any;
      const result = await AccountingRepository.findAllGst({
        gstType,
        gstRate:
          gstRate !== undefined ? (Number(gstRate) as T.GstRate) : undefined,
        fromDate,
        toDate,
        partyGstin,
        period,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/gst/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gstType, fromDate, toDate, gstRate } = req.query as any;
      if (!gstType || !fromDate || !toDate) {
        res.status(400).json({
          message: 'gstType, fromDate, and toDate query params are required',
        });
        return;
      }
      const summary = await AccountingRepository.getGstSummary(
        gstType as T.GstType,
        fromDate,
        toDate,
        gstRate !== undefined ? (Number(gstRate) as T.GstRate) : undefined,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/gst/return',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { period, gstType } = req.query as any;
      if (!period || !gstType) {
        res
          .status(400)
          .json({ message: 'period and gstType query params are required' });
        return;
      }
      const result = await accountingService.gst.getGstReturn(
        period,
        gstType as T.GstType,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/gst/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await AccountingRepository.findGstById(req.params.id);
      if (!entry) {
        res.status(404).json({ message: 'GST entry not found' });
        return;
      }
      res.json(entry);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/gst/record',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await accountingService.gst.recordGstEntry(req.body);
      res.status(201).json(entry);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/gst/by-period/:period',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await accountingService.gst.getGstByPeriod(
        req.params.period,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL PERIODS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/periods',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit } = req.query as any;
      const periods = await AccountingRepository.findAllPeriods(
        limit ? Number(limit) : undefined,
      );
      res.json(periods);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/periods/open',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const periods = await accountingService.period.getOpenPeriods();
      res.json(periods);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/periods/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const period = await AccountingRepository.findPeriodById(req.params.id);
      if (!period) {
        res.status(404).json({ message: 'Financial period not found' });
        return;
      }
      res.json(period);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/periods',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, startDate, endDate, periodType } = req.body;
      if (!name || !startDate || !endDate) {
        res
          .status(400)
          .json({ message: 'name, startDate, and endDate are required' });
        return;
      }
      const period = await accountingService.period.openPeriod({
        name,
        startDate,
        endDate,
        periodType,
      });
      res.status(201).json(period);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/periods/:id/close',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const period = await accountingService.period.closePeriod(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(period);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/periods/generate-year',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { year } = req.body;
      if (!year) {
        res.status(400).json({ message: 'year is required' });
        return;
      }
      const periods = await accountingService.period.generateYearlyPeriods(
        Number(year),
      );
      res.status(201).json(periods);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// BANKING
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/banking/deposit',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'cashier'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bankAccountId, amount, description } = req.body;
      if (!bankAccountId || !amount || !description) {
        res.status(400).json({
          message: 'bankAccountId, amount, and description are required',
        });
        return;
      }
      const result = await accountingService.banking.deposit(
        bankAccountId,
        Number(amount),
        description,
        req.user?.name || 'system',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/banking/withdraw',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'cashier'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bankAccountId, amount, description } = req.body;
      if (!bankAccountId || !amount || !description) {
        res.status(400).json({
          message: 'bankAccountId, amount, and description are required',
        });
        return;
      }
      const result = await accountingService.banking.withdraw(
        bankAccountId,
        Number(amount),
        description,
        req.user?.name || 'system',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/banking/transfer',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromBankId, toBankId, amount, description } = req.body;
      if (!fromBankId || !toBankId || !amount || !description) {
        res.status(400).json({
          message: 'fromBankId, toBankId, amount, and description are required',
        });
        return;
      }
      const result = await accountingService.banking.transfer(
        fromBankId,
        toBankId,
        Number(amount),
        description,
        req.user?.name || 'system',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/banking/reconcile',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await accountingService.banking.reconcile(
        req.body,
        req.user?.name || 'system',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/banking/reconciliation',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bankAccountId, limit } = req.query as any;
      const result = await AccountingRepository.findAllReconciliations(
        bankAccountId,
        limit ? Number(limit) : undefined,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/banking/statement/:bankAccountId',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const statement = await accountingService.banking.getBankStatement(
        req.params.bankAccountId,
        fromDate,
        toDate,
      );
      res.json(statement);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/banking/outstanding/:bankAccountId',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      const result = await AccountingRepository.getOutstandingTransactions(
        req.params.bankAccountId,
        fromDate || '2000-01-01',
        toDate || '2099-12-31',
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/banking/reconciliation/:id/status',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ message: 'status is required' });
        return;
      }
      const result = await AccountingRepository.updateReconciliationStatus(
        req.params.id,
        status as T.BankReconciliationStatus,
        req.user?.name || 'system',
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/reports/trial-balance',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { periodId } = req.query as any;
      const report = await accountingService.report.getTrialBalance(periodId);
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/profit-loss',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await accountingService.report.getProfitAndLoss(
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/balance-sheet',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { asAtDate } = req.query as any;
      if (!asAtDate) {
        res.status(400).json({ message: 'asAtDate query param is required' });
        return;
      }
      const report = await accountingService.report.getBalanceSheet(asAtDate);
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/cash-flow',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await accountingService.report.getCashFlow(
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/day-book',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await accountingService.report.getDayBook(
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/account-statement/:accountId',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await accountingService.report.getAccountStatement(
        req.params.accountId,
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// DAY BOOK
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/day-book',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const entries = await accountingService.dayBook.getDayBookEntry(date);
      res.json(entries);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/day-book/cash-book',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const entries = await accountingService.dayBook.getCashBook(date);
      res.json(entries);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/day-book/bank-book',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, bankAccountId } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const entries = await accountingService.dayBook.getBankBook(
        date,
        bankAccountId,
      );
      res.json(entries);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/day-book/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const summary = await accountingService.dayBook.getDayBookSummary(
        fromDate,
        toDate,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TRIAL BALANCE & ACCOUNT BALANCES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/trial-balance',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { periodId } = req.query as any;
      const report = await AccountingRepository.getTrialBalanceReport(periodId);
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/balances/:accountId',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { periodId } = req.query as any;
      if (!periodId) {
        res.status(400).json({ message: 'periodId query param is required' });
        return;
      }
      const balance = await AccountingRepository.getAccountBalance(
        req.params.accountId,
        periodId,
      );
      if (!balance) {
        res.status(404).json({ message: 'Account balance not found' });
        return;
      }
      res.json(balance);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// PERIOD CLOSING
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/periods/close-year/:year',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const year = Number(req.params.year);
      if (isNaN(year)) {
        res.status(400).json({ message: 'Invalid year parameter' });
        return;
      }
      const result =
        await accountingService.periodClosing.closeFinancialYear(year);
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
