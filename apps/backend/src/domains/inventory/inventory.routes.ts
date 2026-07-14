import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { InventoryRepository as repo } from './inventory.repository';
import {
  StockService,
  CostService,
  ReorderService,
  MovementService,
  InventoryValidationService,
} from './inventory.service';
import type { MovementKind } from './inventory.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  message = 'Internal server error',
): void {
  console.error('[inventory]', err.message);
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('underflow') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('must be')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || message });
}

// ── CRUD ────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        category,
        isActive,
        search,
        lowStock,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await repo.findAll({
        category,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
        lowStock: lowStock === 'true',
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
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await repo.findById(req.params.id);
      if (!item) {
        res.status(404).json({ message: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = InventoryValidationService.validateAll(req.body);
      if (errors.length > 0) {
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }

      const existing = await repo.findByName(req.body.name);
      if (existing) {
        res
          .status(409)
          .json({ message: `Item already exists: ${req.body.name}` });
        return;
      }

      const result = await StockService.createItemWithOpeningStock(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await repo.update(req.params.id, req.body);
      res.json(item);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await repo.archive(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Movements ───────────────────────────────────────────────────────

router.post(
  '/:id/movements',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { kind, quantity, reference, reason, note, unitCost, batchId } =
        req.body;

      const kindErr = InventoryValidationService.validateMovementKind(kind);
      if (kindErr) {
        res.status(400).json({ message: kindErr });
        return;
      }

      const qtyErr = InventoryValidationService.validateQuantity(quantity);
      if (qtyErr) {
        res.status(400).json({ message: qtyErr });
        return;
      }

      const result = await StockService.recordMovement({
        itemId: req.params.id,
        kind,
        quantity,
        operator: req.user?.name || 'unknown',
        reference,
        reason,
        note,
        unitCost,
        batchId,
      });

      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/movements',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { offset, limit } = req.query as any;
      const result = await MovementService.getHistory(
        req.params.id,
        Number(limit) || 50,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Transfer ─────────────────────────────────────────────────────────

router.post(
  '/:id/transfer',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { quantity, note } = req.body;
      if (!quantity || quantity <= 0) {
        res.status(400).json({ message: 'Quantity must be positive' });
        return;
      }
      const result = await StockService.transfer(
        req.params.id,
        quantity,
        req.user?.name || 'unknown',
        note,
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Physical Count ──────────────────────────────────────────────────

router.post(
  '/:id/count',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { actualQuantity, note } = req.body;
      if (actualQuantity === undefined || actualQuantity < 0) {
        res
          .status(400)
          .json({ message: 'Actual quantity is required and must be >= 0' });
        return;
      }
      const result = await StockService.physicalCount(
        req.params.id,
        actualQuantity,
        req.user?.name || 'unknown',
        note,
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Reports ─────────────────────────────────────────────────────────

router.get(
  '/reports/summary',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'accountant', 'auditor'),
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
  '/reports/low-stock',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const items = await ReorderService.getLowStockItems();
      res.json(items);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/reorder-suggestions',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const suggestions = await ReorderService.getSuggestedReorder();
      res.json(suggestions);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/valuation',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const valuation = await CostService.getValuation();
      res.json(valuation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/movements/all',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        itemId,
        kind,
        fromDate,
        toDate,
        operator,
        batchId,
        offset,
        limit,
      } = req.query as any;
      const result = await MovementService.getMovements({
        itemId,
        kind,
        fromDate,
        toDate,
        operator,
        batchId,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Search ──────────────────────────────────────────────────────────

router.get(
  '/search/:query',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const results = await repo.search(req.params.query);
      res.json(results);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ── Bulk ────────────────────────────────────────────────────────────

router.post(
  '/bulk',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'items array is required' });
        return;
      }

      const results: any[] = [];
      const errors: any[] = [];

      for (let i = 0; i < items.length; i++) {
        try {
          const result = await StockService.createItemWithOpeningStock(
            items[i],
          );
          results.push(result);
        } catch (err: any) {
          errors.push({ index: i, name: items[i].name, message: err.message });
        }
      }

      res.status(errors.length > 0 ? 207 : 201).json({
        results,
        errors,
        total: items.length,
        succeeded: results.length,
        failed: errors.length,
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
