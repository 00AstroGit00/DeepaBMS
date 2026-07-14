import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { PurchasingRepository as repo } from './purchasing.repository';
import {
  PurchaseWorkflowService,
  GoodsReceiptService,
  PurchaseReturnService,
  SupplierPerformanceService,
  PurchaseCostService,
  PurchasingValidationService,
  GstExciseHooks,
} from './purchasing.service';

const router = Router();

function handleError(
  res: Response,
  err: any,
  message = 'Internal server error',
): void {
  console.error('[purchasing]', err.message);
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Cannot') ||
        err.message?.includes('Role') ||
        err.message?.includes('already') ||
        err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('must be')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || message });
}

// ═════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/suppliers',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        search,
        isActive,
        isPreferred,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await repo.listSuppliers({
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        isPreferred:
          isPreferred !== undefined ? isPreferred === 'true' : undefined,
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
  '/suppliers/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplier = await repo.findSupplierById(req.params.id);
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      res.json(supplier);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/suppliers',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = PurchasingValidationService.validateSupplier(req.body);
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const existing = await repo.findSupplierByName(req.body.name);
      if (existing) {
        res
          .status(409)
          .json({ message: `Supplier already exists: ${req.body.name}` });
        return;
      }

      const supplier = await repo.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/suppliers/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const supplier = await repo.updateSupplier(req.params.id, req.body);
      if (!supplier) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      res.json(supplier);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/suppliers/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await repo.archiveSupplier(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/suppliers/:id/performance',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const perf = await SupplierPerformanceService.getPerformance(
        req.params.id,
      );
      if (!perf) {
        res.status(404).json({ message: 'Supplier not found' });
        return;
      }
      res.json(perf);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        supplierId,
        fromDate,
        toDate,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await repo.listPOs({
        status,
        supplierId,
        fromDate,
        toDate,
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
  '/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await repo.findPOById(req.params.id);
      if (!po) {
        res.status(404).json({ message: 'Purchase order not found' });
        return;
      }
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = PurchasingValidationService.validatePOCreation(req.body);
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const supplier = await repo.findSupplierById(req.body.supplierId);
      if (!supplier) {
        res.status(400).json({ message: 'Supplier not found' });
        return;
      }

      const po = await repo.createPO(req.body, req.user?.name || 'system');
      res.status(201).json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await repo.findPOById(req.params.id);
      if (!po) {
        res.status(404).json({ message: 'Purchase order not found' });
        return;
      }
      if (po.status !== 'draft') {
        res
          .status(400)
          .json({ message: `Cannot edit PO in status: ${po.status}` });
        return;
      }
      const { notes, expectedDate, freight, tax, discount, otherCharges } =
        req.body;
      await repo.updatePO(req.params.id, {
        notes,
        expectedDate,
        freight,
        tax,
        discount,
        otherCharges,
      });

      if (req.body.lines && Array.isArray(req.body.lines)) {
        for (const line of req.body.lines) {
          if (line.id) {
            await repo.updatePO(req.params.id, line);
          }
        }
      }

      await repo.recalculatePO(req.params.id);
      const updated = await repo.findPOById(req.params.id);
      res.json(updated);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// PURCHASE ORDER WORKFLOW (State Machine)
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/submit',
  authenticate,
  authorize('manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'submitted',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/approve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'approved',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/reject',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'rejected',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/order',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'ordered',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'cancelled',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/close',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const po = await PurchaseWorkflowService.transition(
        req.params.id,
        'closed',
        req.user?.id || 'unknown',
        req.user?.role || '',
        req.body.comment,
      );
      res.json(po);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/transitions',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transitions = await PurchaseWorkflowService.getAvailableTransitions(
        req.params.id,
      );
      res.json(transitions);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// GOODS RECEIPTS
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/receive',
  authenticate,
  authorize('fnb', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = PurchasingValidationService.validateReceiptCreation({
        ...req.body,
        poId: req.params.id,
      });
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const result = await GoodsReceiptService.receive(
        { ...req.body, poId: req.params.id },
        req.user?.name || 'unknown',
        req.user?.role || '',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/receipts',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const receipts = await repo.listReceipts({ poId: req.params.id });
      res.json(receipts);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// INVOICES
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/invoices',
  authenticate,
  authorize('accountant', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = PurchasingValidationService.validateInvoiceCreation({
        ...req.body,
        poId: req.params.id,
      });
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const invoice = await repo.createInvoice({
        ...req.body,
        poId: req.params.id,
      });
      res.status(201).json(invoice);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/invoices',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invoices = await repo.listInvoices(req.params.id);
      res.json(invoices);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// RETURNS
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/returns',
  authenticate,
  authorize('fnb', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = PurchasingValidationService.validateReturnCreation({
        ...req.body,
        poId: req.params.id,
      });
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const result = await PurchaseReturnService.processReturn(
        { ...req.body, poId: req.params.id },
        req.user?.name || 'unknown',
        req.user?.role || '',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/returns',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const returns = await repo.listReturns(req.params.id);
      res.json(returns);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// EVENTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/:id/events',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await repo.getEvents('PurchaseOrder', req.params.id);
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// REPORTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/reports/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await repo.getSummary();
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/supplier-performances',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const performances =
        await SupplierPerformanceService.getAllSupplierPerformances();
      res.json(performances);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/gst-compliance',
  authenticate,
  authorize('accountant', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params required' });
        return;
      }
      const report = await GstExciseHooks.getGstComplianceReport(
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
  '/reports/excise-compliance',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params required' });
        return;
      }
      const report = await GstExciseHooks.getExciseComplianceReport(
        fromDate,
        toDate,
      );
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// RECEIPTS (global)
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/receipts/all',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { poId, fromDate, toDate, offset, limit } = req.query as any;
      const result = await repo.listReceipts({
        poId,
        fromDate,
        toDate,
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
  '/receipts/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const receipt = await repo.findReceiptById(req.params.id);
      if (!receipt) {
        res.status(404).json({ message: 'Receipt not found' });
        return;
      }
      res.json(receipt);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// INVOICES (global)
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/invoices/all',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invoices = await repo.listInvoices();
      res.json(invoices);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/invoices/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invoice = await repo.findInvoiceById(req.params.id);
      if (!invoice) {
        res.status(404).json({ message: 'Invoice not found' });
        return;
      }
      res.json(invoice);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// RETURNS (global)
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/returns/all',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const returns = await repo.listReturns();
      res.json(returns);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/returns/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ret = await repo.findReturnById(req.params.id);
      if (!ret) {
        res.status(404).json({ message: 'Return not found' });
        return;
      }
      res.json(ret);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// SEARCH
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/search/:query',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await repo.listPOs({
        search: req.params.query,
        limit: 20,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
