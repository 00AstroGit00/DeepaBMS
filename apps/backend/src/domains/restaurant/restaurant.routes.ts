import { Router, Response } from 'express';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { RestaurantRepository as repo } from './restaurant.repository';
import {
  OrderWorkflowService,
  KitchenEngineService,
  RecipeService,
  PricingService,
  TableService,
  BillingService,
} from './restaurant.service';

const router = Router();

function handleError(
  res: Response,
  err: any,
  message = 'Internal server error',
): void {
  console.error('[restaurant]', err.message);
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Cannot') ||
        err.message?.includes('Role') ||
        err.message?.includes('already') ||
        err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('must be') ||
        err.message?.includes('positive')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || message });
}

// ═════════════════════════════════════════════════════════════════════
// TABLES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/tables',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'reception', 'cashier'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { area, status, search, offset, limit } = req.query as any;
      const result = await repo.listTables({
        area,
        status,
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
  '/tables/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const table = await repo.findTableById(req.params.id);
      if (!table) {
        res.status(404).json({ message: 'Table not found' });
        return;
      }
      res.json(table);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/tables',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await repo.findTableByNo(req.body.tableNo);
      if (existing) {
        res
          .status(409)
          .json({ message: `Table ${req.body.tableNo} already exists` });
        return;
      }
      const table = await repo.createTable(req.body);
      res.status(201).json(table);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/tables/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const table = await repo.updateTable(req.params.id, req.body);
      if (!table) {
        res.status(404).json({ message: 'Table not found' });
        return;
      }
      res.json(table);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// MENU
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/menu/categories',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await repo.listMenuCategories();
      res.json(categories);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/menu/categories',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cat = await repo.createMenuCategory(req.body);
      res.status(201).json(cat);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/menu/items',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId, isActive, course, search, offset, limit } =
        req.query as any;
      const result = await repo.listMenuItems({
        categoryId,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        course,
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
  '/menu/items/:id',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await repo.findMenuItemById(req.params.id);
      if (!item) {
        res.status(404).json({ message: 'Menu item not found' });
        return;
      }
      res.json(item);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/menu/items',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await repo.createMenuItem(req.body);
      res.status(201).json(item);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/menu/items/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await repo.updateMenuItem(req.params.id, req.body);
      if (!item) {
        res.status(404).json({ message: 'Menu item not found' });
        return;
      }
      res.json(item);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// RECIPES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/menu/items/:menuItemId/recipe',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'kitchen'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recipe = await RecipeService.getRecipeWithIngredients(
        req.params.menuItemId,
      );
      if (!recipe) {
        res.status(404).json({ message: 'Recipe not found' });
        return;
      }
      res.json(recipe);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/menu/items/:menuItemId/recipe',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recipe = await repo.createRecipe({
        ...req.body,
        menuItemId: req.params.menuItemId,
      });
      res.status(201).json(recipe);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/menu/ingredient-check',
  authenticate,
  authorize('owner', 'manager', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { menuItemId, quantity } = req.query as any;
      if (!menuItemId || !quantity) {
        res.status(400).json({ message: 'menuItemId and quantity required' });
        return;
      }
      const result = await RecipeService.calculateIngredientRequirements(
        menuItemId,
        Number(quantity),
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// KITCHEN STATIONS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/kitchen/stations',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'kitchen'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stations = await repo.listKitchenStations();
      res.json(stations);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/kitchen/stations',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const station = await repo.createKitchenStation(req.body);
      res.status(201).json(station);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// ORDERS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        type,
        tableId,
        fromDate,
        toDate,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await repo.listOrders({
        status,
        type,
        tableId,
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
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await repo.findOrderById(req.params.id);
      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('cashier', 'manager', 'owner', 'fnb', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await repo.createOrder(
        req.body,
        req.user?.name || 'system',
      );
      await repo.recordOrderEvent(
        order.id,
        'ORDER_CREATED',
        null,
        'draft',
        JSON.stringify({ type: order.type, lineCount: order.lines.length }),
        req.user?.name,
      );
      if (req.body.tableId) {
        try {
          await TableService.assignTable(req.body.tableId, order.id);
        } catch (e: any) {
          console.warn(`[restaurant] Table assignment skipped: ${e.message}`);
        }
      }
      res.status(201).json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/items',
  authenticate,
  authorize('cashier', 'manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const line = await repo.addOrderLine(req.params.id, req.body);
      if (line) await repo.recalculateOrder(req.params.id);
      const order = await repo.findOrderById(req.params.id);
      await repo.recordOrderEvent(
        req.params.id,
        'ITEM_ADDED',
        null,
        null,
        JSON.stringify({
          menuItemId: req.body.menuItemId,
          quantity: req.body.quantity,
        }),
        req.user?.name,
      );
      res.status(201).json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id/items/:lineId',
  authenticate,
  authorize('cashier', 'manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const line = await repo.updateOrderLine(req.params.lineId, req.body);
      if (line) await repo.recalculateOrder(req.params.id);
      const order = await repo.findOrderById(req.params.id);
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/:id/items/:lineId',
  authenticate,
  authorize('cashier', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await repo.removeOrderLine(req.params.lineId);
      await repo.recalculateOrder(req.params.id);
      const order = await repo.findOrderById(req.params.id);
      await repo.recordOrderEvent(
        req.params.id,
        'ITEM_REMOVED',
        null,
        null,
        JSON.stringify({ lineId: req.params.lineId }),
        req.user?.name,
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// ORDER WORKFLOW
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/confirm',
  authenticate,
  authorize('cashier', 'manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'confirmed',
        req.user?.id || '',
        req.user?.role || '',
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/prepare',
  authenticate,
  authorize('fnb', 'manager', 'owner', 'kitchen'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'preparing',
        req.user?.id || '',
        req.user?.role || '',
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/ready',
  authenticate,
  authorize('fnb', 'kitchen', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'ready',
        req.user?.id || '',
        req.user?.role || '',
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/serve',
  authenticate,
  authorize('fnb', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'served',
        req.user?.id || '',
        req.user?.role || '',
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/complete',
  authenticate,
  authorize('cashier', 'manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'completed',
        req.user?.id || '',
        req.user?.role || '',
      );
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await OrderWorkflowService.transition(
        req.params.id,
        'cancelled',
        req.user?.id || '',
        req.user?.role || '',
        req.body.reason,
      );
      if (order.tableId) {
        await TableService.releaseTable(order.tableId);
      }
      res.json(order);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/transitions',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'cashier', 'kitchen'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transitions = await OrderWorkflowService.getAvailableTransitions(
        req.params.id,
      );
      res.json(transitions);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// KITCHEN (KOT)
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/kot',
  authenticate,
  authorize('fnb', 'manager', 'owner', 'cashier'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.generateKOT(
        { ...req.body, orderId: req.params.id },
        req.user?.name || 'system',
      );
      res.status(201).json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kitchen/queue',
  authenticate,
  authorize('fnb', 'kitchen', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { stationId } = req.query as any;
      const queue = await KitchenEngineService.getKitchenQueue(stationId);
      res.json(queue);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/acknowledge',
  authenticate,
  authorize('fnb', 'kitchen', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.acknowledgeKot(
        req.params.kotId,
        req.user?.name || '',
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/prepare',
  authenticate,
  authorize('fnb', 'kitchen', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.startPreparation(
        req.params.kotId,
        req.user?.name || '',
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/ready',
  authenticate,
  authorize('fnb', 'kitchen', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.markReady(
        req.params.kotId,
        req.user?.name || '',
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/serve',
  authenticate,
  authorize('fnb', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.markServed(
        req.params.kotId,
        req.user?.name || '',
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/cancel',
  authenticate,
  authorize('manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.cancelKot(
        req.params.kotId,
        req.user?.name || '',
        req.body.reason,
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/recall',
  authenticate,
  authorize('fnb', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.recallKot(
        req.params.kotId,
        req.user?.name || '',
        req.body.reason,
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/kitchen/kot/:kotId/refire',
  authenticate,
  authorize('fnb', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kot = await KitchenEngineService.refireKot(
        req.params.kotId,
        req.user?.name || '',
        req.body.reason,
      );
      res.json(kot);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// TABLE MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/transfer-table/:toTableId',
  authenticate,
  authorize('manager', 'owner', 'fnb'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await TableService.transferTable(
        req.params.id,
        req.params.toTableId,
        req.user?.name || '',
      );
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/tables/occupancy',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'reception'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const occupancy = await TableService.getTableOccupancy();
      res.json(occupancy);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// BILLING
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/:id/bill',
  authenticate,
  authorize('cashier', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bill = await BillingService.generateBill(
        { ...req.body, orderId: req.params.id },
        req.user?.name || 'system',
      );
      res.status(201).json(bill);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bills/:billId/payment',
  authenticate,
  authorize('cashier', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await BillingService.recordPayment(
        { ...req.body, billId: req.params.billId },
        req.user?.name || 'system',
      );
      res.status(201).json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/bills/:billId/split',
  authenticate,
  authorize('cashier', 'manager', 'owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { splits } = req.body;
      if (!Array.isArray(splits) || splits.length === 0) {
        res.status(400).json({ message: 'splits array is required' });
        return;
      }
      const bills = await BillingService.splitBill(req.params.billId, splits);
      res.json(bills);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/bills/:id',
  authenticate,
  authorize('owner', 'manager', 'cashier', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bill = await repo.findBillById(req.params.id);
      if (!bill) {
        res.status(404).json({ message: 'Bill not found' });
        return;
      }
      res.json(bill);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// EVENTS & SESSIONS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/:id/events',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await repo.getOrderEvents(req.params.id);
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/sessions/active',
  authenticate,
  authorize('owner', 'manager', 'fnb', 'reception'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await repo.getActiveSessions();
      res.json(sessions);
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
      const { fromDate, toDate } = req.query as any;
      const summary = await repo.getOrderSummary(fromDate, toDate);
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/table-turnover',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      const turnover = await repo.getTableTurnover(fromDate, toDate);
      res.json(turnover);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
