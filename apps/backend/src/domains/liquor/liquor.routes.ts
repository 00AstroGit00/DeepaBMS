import { Router, Response } from 'express';
import { query } from '../../db';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { liquorService } from './liquor.service';
import { LiquorRepository } from './liquor.repository';
import * as T from './liquor.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  message = 'Internal server error',
): void {
  console.error('[liquor]', err.message);
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Cannot') ||
        err.message?.includes('already') ||
        err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('must be') ||
        err.message?.includes('positive') ||
        err.message?.includes('negative') ||
        err.message?.includes('Insufficient') ||
        err.message?.includes('No available') ||
        err.message?.includes('Validation') ||
        err.message?.includes('already') ||
        err.message?.includes('Concurrent')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || message });
}

// ═════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/categories',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { isActive, search, offset, limit } = req.query as any;
      const result = await LiquorRepository.findAllCategories({
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
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
  '/categories/:id',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await LiquorRepository.findCategoryById(req.params.id);
      if (!category) {
        res.status(404).json({ message: 'Category not found' });
        return;
      }
      res.json(category);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/categories',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await LiquorRepository.createCategory(req.body);
      res.status(201).json(category);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/categories/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await LiquorRepository.updateCategory(
        req.params.id,
        req.body,
      );
      res.json(category);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/categories/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.archiveCategory(req.params.id);
      res.json({ message: 'Category archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// BRANDS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/brands',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId, isActive, search, offset, limit } = req.query as any;
      const result = await LiquorRepository.findAllBrands({
        categoryId,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
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
  '/brands/search',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q } = req.query as any;
      if (!q) {
        res.status(400).json({ message: 'Search query q is required' });
        return;
      }
      const brands = await LiquorRepository.searchBrands(q);
      res.json(brands);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/brands/by-category/:categoryId',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const brands = await LiquorRepository.findBrandsByCategory(
        req.params.categoryId,
      );
      res.json(brands);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/brands/:id',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const brand = await LiquorRepository.findBrandById(req.params.id);
      if (!brand) {
        res.status(404).json({ message: 'Brand not found' });
        return;
      }
      res.json(brand);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/brands',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = liquorService.validation.validateCreateBrand(req.body);
      if (errors.length) {
        res.status(400).json({ message: errors.join('; ') });
        return;
      }
      const brand = await LiquorRepository.createBrand(req.body);
      res.status(201).json(brand);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/brands/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const brand = await LiquorRepository.updateBrand(req.params.id, req.body);
      res.json(brand);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/brands/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.archiveBrand(req.params.id);
      res.json({ message: 'Brand archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// BOTTLES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/bottles',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        brandId,
        categoryId,
        status,
        location,
        supplierId,
        isActive,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await LiquorRepository.findAllBottles({
        brandId,
        categoryId,
        status,
        location,
        supplierId,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
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
  '/bottles/active',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { location } = req.query as any;
      const bottles = await LiquorRepository.findActiveBottles(location);
      res.json(bottles);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/by-status/:status',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.params;
      if (!T.VALID_BOTTLE_STATUSES.includes(status as T.BottleStatus)) {
        res.status(400).json({ message: `Invalid bottle status: ${status}` });
        return;
      }
      const bottles = await LiquorRepository.findBottlesByStatus(
        status as T.BottleStatus,
      );
      res.json(bottles);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await LiquorRepository.getBottleSummary();
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/by-brand/:brandId',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottles = await LiquorRepository.findBottlesByBrand(
        req.params.brandId,
      );
      res.json(bottles);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/:id',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottle = await LiquorRepository.findBottleById(req.params.id);
      if (!bottle) {
        res.status(404).json({ message: 'Bottle not found' });
        return;
      }
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = liquorService.validation.validateCreateBottle(req.body);
      if (errors.length) {
        res.status(400).json({ message: errors.join('; ') });
        return;
      }
      const bottle = await LiquorRepository.createBottle(req.body);
      res.status(201).json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/bulk',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'items array is required' });
        return;
      }
      const bottles = await LiquorRepository.bulkCreateBottles(items);
      res.status(201).json(bottles);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/bottles/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottle = await LiquorRepository.updateBottle(
        req.params.id,
        req.body,
      );
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/bottles/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.archiveBottle(req.params.id);
      res.json({ message: 'Bottle archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/transition',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, reason } = req.body;
      if (!status) {
        res.status(400).json({ message: 'status is required' });
        return;
      }
      const bottle = await liquorService.bottleLifecycle.transitionBottle(
        req.params.id,
        status,
        req.user?.name || 'system',
        { reason },
      );
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/open',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottle = await liquorService.bottleLifecycle.openBottle({
        bottleId: req.params.id,
        openedBy: req.user?.name || 'system',
        location: req.body.location,
        notes: req.body.notes,
      });
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/close',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { remainingMl, reason, notes } = req.body;
      if (remainingMl === undefined || !reason) {
        res
          .status(400)
          .json({ message: 'remainingMl and reason are required' });
        return;
      }
      const bottle = await liquorService.bottleLifecycle.closeBottle({
        bottleId: req.params.id,
        closedBy: req.user?.name || 'system',
        remainingMl: Number(remainingMl),
        reason,
        notes,
      });
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/transfer',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { toLocation, notes } = req.body;
      if (!toLocation) {
        res.status(400).json({ message: 'toLocation is required' });
        return;
      }
      const bottle = await liquorService.bottleLifecycle.transferBottle({
        bottleId: req.params.id,
        toLocation,
        transferredBy: req.user?.name || 'system',
        notes,
      });
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/break',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottle = await liquorService.bottleLifecycle.reportBroken(
        req.params.id,
        req.user?.name || 'system',
        req.body.notes,
      );
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/write-off',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bottle = await liquorService.bottleLifecycle.writeOffBottle(
        req.params.id,
        req.user?.name || 'system',
        req.body.notes,
      );
      res.json(bottle);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bottles/:id/reconcile',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { expectedMl, actualMl } = req.body;
      if (expectedMl === undefined || actualMl === undefined) {
        res
          .status(400)
          .json({ message: 'expectedMl and actualMl are required' });
        return;
      }
      const result = await liquorService.inventory.reconcileBottle(
        req.params.id,
        Number(expectedMl),
        Number(actualMl),
        req.user?.name || 'system',
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// PEG DEFINITIONS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/peg-definitions',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const pegDefs = await LiquorRepository.findAllPegDefinitions();
      res.json(pegDefs);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/peg-definitions/:id',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pegDef = await LiquorRepository.findPegDefinitionById(
        req.params.id,
      );
      if (!pegDef) {
        res.status(404).json({ message: 'Peg definition not found' });
        return;
      }
      res.json(pegDef);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/peg-definitions',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pegDef = await LiquorRepository.createPegDefinition(req.body);
      res.status(201).json(pegDef);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/peg-definitions/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pegDef = await LiquorRepository.updatePegDefinition(
        req.params.id,
        req.body,
      );
      res.json(pegDef);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/peg-definitions/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.archivePegDefinition(req.params.id);
      res.json({ message: 'Peg definition archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// PEG PRICES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/peg-prices',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { brandId } = req.query as any;
      const prices = await LiquorRepository.findAllPegPrices(brandId);
      res.json(prices);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/peg-prices/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await query(
        `SELECT pp.*, pd.size_ml as peg_size_ml
         FROM peg_prices pp
         LEFT JOIN peg_definitions pd ON pp.peg_size_id = pd.id
         WHERE pp.id = ?`,
        [req.params.id],
      );
      if (!rows.length) {
        res.status(404).json({ message: 'Peg price not found' });
        return;
      }
      const r = rows[0];
      res.json({
        id: r.id,
        brandId: r.brand_id,
        pegSizeId: r.peg_size_id,
        pegSizeMl: Number(r.peg_size_ml || r.size_ml || 0),
        tier: r.tier,
        price: Number(r.price),
        isActive: Boolean(r.is_active ?? true),
        createdAt: r.created_at || '',
        updatedAt: r.updated_at || '',
      });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/peg-prices',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const price = await LiquorRepository.createPegPrice(req.body);
      res.status(201).json(price);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/peg-prices/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const price = await LiquorRepository.updatePegPrice(
        req.params.id,
        req.body,
      );
      res.json(price);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/peg-prices/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.archivePegPrice(req.params.id);
      res.json({ message: 'Peg price archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/peg-prices/bulk-update',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { brandId, tier, adjustmentPercent } = req.body;
      if (!brandId || !tier || adjustmentPercent === undefined) {
        res.status(400).json({
          message: 'brandId, tier, and adjustmentPercent are required',
        });
        return;
      }
      const count = await liquorService.pricing.bulkUpdatePrices(
        brandId,
        tier,
        Number(adjustmentPercent),
      );
      res.json({ updated: count });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// SALES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/sales',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        counter,
        bartenderId,
        fromDate,
        toDate,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await LiquorRepository.findAllSales({
        status,
        counter,
        bartenderId,
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
  '/sales/:id',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await LiquorRepository.findSaleById(req.params.id);
      if (!sale) {
        res.status(404).json({ message: 'Sale not found' });
        return;
      }
      res.json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/sales',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.createSale(
        req.body,
        req.user?.name || 'system',
      );
      res.status(201).json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/sales/:id/complete',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.completeSale(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/sales/:id/cancel',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.cancelSale(
        req.params.id,
        req.user?.name || 'system',
        req.body.reason,
      );
      res.json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/sales/:id/refund',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.refundSale(
        req.params.id,
        req.user?.name || 'system',
        req.body.reason,
      );
      res.json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/sales/:id/lines',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.addLineToSale(
        req.params.id,
        req.body,
      );
      res.status(201).json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/sales/lines/:lineId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const line = await LiquorRepository.updateSaleLine(
        req.params.lineId,
        req.body,
      );
      res.json(line);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/sales/lines/:lineId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await LiquorRepository.removeSaleLine(req.params.lineId);
      res.json({ message: 'Sale line removed' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/sales/:id/with-details',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await liquorService.barSale.getSaleWithDetails(
        req.params.id,
      );
      res.json(sale);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// BOTTLE OPERATIONS (Openings, Closings, Transfers, Movements)
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/bottles/:id/openings',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const openings = await LiquorRepository.findOpeningsByBottle(
        req.params.id,
      );
      res.json(openings);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/:id/closings',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const closings = await LiquorRepository.findClosingsByBottle(
        req.params.id,
      );
      res.json(closings);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/:id/transfers',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transfers = await LiquorRepository.findTransfersByBottle(
        req.params.id,
      );
      res.json(transfers);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bottles/:id/movements',
  authenticate,
  authorize('owner', 'manager', 'barstaff', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const movements = await LiquorRepository.findMovementsByBottle(
        req.params.id,
      );
      res.json(movements);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// MOVEMENTS / LEDGER
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/movements',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        bottleId,
        brandId,
        kind,
        pourType,
        saleId,
        fromDate,
        toDate,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await LiquorRepository.findMovements({
        bottleId,
        brandId,
        kind,
        pourType,
        saleId,
        fromDate,
        toDate,
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
  '/movements/by-brand/:brandId',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const movements = await LiquorRepository.findMovementsByBrand(
        req.params.brandId,
      );
      res.json(movements);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/movements/by-date',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { from, to } = req.query as any;
      if (!from || !to) {
        res
          .status(400)
          .json({ message: 'from and to query params are required' });
        return;
      }
      const movements = await LiquorRepository.findMovementsByDateRange(
        from,
        to,
      );
      res.json(movements);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// EXCISE
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/excise',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        date,
        fromDate,
        toDate,
        brandId,
        categoryId,
        counter,
        offset,
        limit,
      } = req.query as any;
      const result = await LiquorRepository.findExciseEntries({
        date,
        fromDate,
        toDate,
        brandId,
        categoryId,
        counter,
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
  '/excise/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, counter } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const summary = await liquorService.excise.getExciseSummary(
        date,
        counter,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/excise/:id',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await LiquorRepository.findExciseEntry(req.params.id);
      if (!entry) {
        res.status(404).json({ message: 'Excise entry not found' });
        return;
      }
      res.json(entry);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/excise/generate-daily',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, counter } = req.body;
      if (!date) {
        res.status(400).json({ message: 'date is required' });
        return;
      }
      const registers = await liquorService.excise.generateDailyRegister(
        date,
        counter || 'main',
        req.user?.name || 'system',
      );
      res.status(201).json(registers);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/excise/:id/verify',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await liquorService.excise.verifyDailyRegister(
        req.params.id,
        req.user?.name || 'system',
      );
      res.json(entry);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/excise/:id/approve',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await liquorService.excise.approveExciseEntry(
        req.params.id,
      );
      res.json(entry);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// REPORTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/reports/brand-performance',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      const report = await liquorService.reporting.getBrandPerformance(
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
  '/reports/peg-variance',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { brandId, fromDate, toDate } = req.query as any;
      const report = await liquorService.reporting.getPegVarianceReport(
        brandId,
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
  '/reports/bartender-performance',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      const report = await liquorService.reporting.getBartenderPerformance(
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
  '/reports/bottle-summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await liquorService.reporting.getBottleSummary();
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/excise-summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, counter } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const summary = await liquorService.reporting.getDailyExciseSummary(
        date,
        counter,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/daily',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, counter } = req.query as any;
      if (!date) {
        res.status(400).json({ message: 'date query param is required' });
        return;
      }
      const summary = await liquorService.reporting.getDailyExciseSummary(
        date,
        counter,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// EVENTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/events',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aggregateType, aggregateId } = req.query as any;
      const events = await LiquorRepository.findBarEvents(
        aggregateType,
        aggregateId,
      );
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// INTERNAL UTILITY
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/peg-sizes',
  authenticate,
  authorize('owner', 'manager', 'barstaff'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const sizes = liquorService.pegEngine.getStandardPegSizes();
      res.json(sizes);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
