import { RestaurantRepository as repo } from '../src/domains/restaurant/restaurant.repository';
import {
  OrderWorkflowService,
  KitchenEngineService,
  RecipeService,
  PricingService,
  TableService,
  BillingService,
  InventoryConsumptionService,
} from '../src/domains/restaurant/restaurant.service';
import type {
  DiningTable,
  MenuItem,
  OrderStatus,
} from '../src/domains/restaurant/restaurant.types';

let testTableId = '';
let testMenuId = '';
let testCategoryId = '';
let testOrderId = '';
let testOrderLineId = '';
let testKotId = '';
let testBillId = '';

function uid(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ═════════════════════════════════════════════════════════════════════
// TABLES
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Tables', () => {
  test('createTable creates a table', async () => {
    const t = await repo.createTable({
      tableNo: `T${uid().slice(0, 6)}`,
      capacity: 4,
      area: 'main',
    });
    expect(t.id).toBeTruthy();
    expect(t.tableNo).toBeTruthy();
    expect(t.capacity).toBe(4);
    expect(t.status).toBe('available');
    expect(t.isActive).toBe(true);
    testTableId = t.id;
  });

  test('findTableById returns table', async () => {
    const t = await repo.findTableById(testTableId);
    expect(t).not.toBeNull();
    expect(t!.id).toBe(testTableId);
  });

  test('findTableByNo finds by table number', async () => {
    const t = await repo.findTableById(testTableId);
    const found = await repo.findTableByNo(t!.tableNo);
    expect(found).not.toBeNull();
  });

  test('listTables returns paginated results', async () => {
    const result = await repo.listTables({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('listTables filters by area', async () => {
    const result = await repo.listTables({ area: 'main', limit: 10 });
    for (const t of result.data) {
      expect(t.area).toBe('main');
    }
  });

  test('updateTable modifies fields', async () => {
    const t = await repo.updateTable(testTableId, { capacity: 6 } as any);
    expect(t!.capacity).toBe(6);
  });

  test('archiveTable soft-deletes', async () => {
    await repo.archiveTable(testTableId);
    const t = await repo.findTableById(testTableId);
    expect(t!.isActive).toBe(false);
    await repo.updateTable(testTableId, { status: 'available' } as any);
  });
});

// ═════════════════════════════════════════════════════════════════════
// MENU
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Menu', () => {
  const catName = `Cat ${uid().slice(0, 6)}`;

  test('createMenuCategory creates category', async () => {
    const cat = await repo.createMenuCategory({
      name: catName,
      displayOrder: 1,
    });
    expect(cat.id).toBeTruthy();
    expect(cat.name).toBe(catName);
    testCategoryId = cat.id;
  });

  test('listMenuCategories returns all', async () => {
    const cats = await repo.listMenuCategories();
    expect(cats.length).toBeGreaterThanOrEqual(1);
    expect(cats.some((c) => c.name === catName)).toBe(true);
  });

  test('createMenuItem creates item', async () => {
    const item = await repo.createMenuItem({
      categoryId: testCategoryId,
      name: `Test Item ${uid().slice(0, 6)}`,
      price: 250,
      course: 'main',
      preparationTime: 10,
    });
    expect(item.id).toBeTruthy();
    expect(item.price).toBe(250);
    expect(item.isActive).toBe(true);
    testMenuId = item.id;
  });

  test('findMenuItemById returns item with category', async () => {
    const item = await repo.findMenuItemById(testMenuId);
    expect(item).not.toBeNull();
    expect(item!.categoryName).toBeTruthy();
  });

  test('listMenuItems returns paginated', async () => {
    const result = await repo.listMenuItems({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('listMenuItems filters by category', async () => {
    const result = await repo.listMenuItems({
      categoryId: testCategoryId,
      limit: 10,
    });
    for (const i of result.data) {
      expect(i.categoryId).toBe(testCategoryId);
    }
  });

  test('updateMenuItem changes item', async () => {
    const item = await repo.updateMenuItem(testMenuId, { price: 300 } as any);
    expect(item!.price).toBe(300);
  });
});

// ═════════════════════════════════════════════════════════════════════
// RECIPES
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Recipes', () => {
  test('createRecipe creates recipe with ingredients', async () => {
    const recipe = await repo.createRecipe({
      menuItemId: testMenuId,
      name: `Recipe ${uid().slice(0, 6)}`,
      yieldQty: 1,
      yieldUnit: 'pc',
      ingredients: [
        {
          inventoryItemName: 'Test Ingredient A',
          quantity: 0.5,
          unit: 'kg',
          wasteFactor: 5,
        },
        {
          inventoryItemName: 'Test Ingredient B',
          quantity: 2,
          unit: 'pc',
          wasteFactor: 0,
        },
      ],
    });
    expect(recipe.id).toBeTruthy();
    expect(recipe.ingredients.length).toBe(2);
  });

  test('findRecipeByMenuItemId returns recipe with ingredients', async () => {
    const recipe = await repo.findRecipeByMenuItemId(testMenuId);
    expect(recipe).not.toBeNull();
    expect(recipe!.ingredients.length).toBeGreaterThanOrEqual(1);
  });

  test('calculateIngredientRequirements computes totals', async () => {
    const result = await RecipeService.calculateIngredientRequirements(
      testMenuId,
      3,
    );
    expect(result.ingredients.length).toBeGreaterThanOrEqual(1);
    expect(result.canFulfill).toBeDefined();
    for (const ing of result.ingredients) {
      expect(ing.qty).toBeGreaterThan(0);
    }
  });

  test('listRecipes returns all recipes', async () => {
    const recipes = await repo.listRecipes();
    expect(Array.isArray(recipes)).toBe(true);
  });

  test('deleteRecipe removes recipe', async () => {
    const recipe = await repo.findRecipeByMenuItemId(testMenuId);
    if (recipe) {
      await repo.deleteRecipe(recipe.id);
      const gone = await repo.findRecipeByMenuItemId(testMenuId);
      expect(gone).toBeNull();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// KITCHEN STATIONS
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Kitchen Stations', () => {
  const stationCode = `STN${uid().slice(0, 4).toUpperCase()}`;

  test('createKitchenStation creates station', async () => {
    const s = await repo.createKitchenStation({
      name: 'Test Station',
      code: stationCode,
      description: 'Test',
    });
    expect(s.id).toBeTruthy();
    expect(s.code).toBe(stationCode);
  });

  test('listKitchenStations returns all', async () => {
    const stations = await repo.listKitchenStations();
    expect(stations.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// ORDERS
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Orders', () => {
  test('createOrder creates order with lines', async () => {
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        guestCount: 2,
        notes: 'Test order',
        lines: [{ menuItemId: testMenuId, quantity: 2, notes: 'No onions' }],
      },
      'test-user',
    );
    expect(order.id).toBeTruthy();
    expect(order.orderNo).toMatch(/^ORD-/);
    expect(order.status).toBe('draft');
    expect(order.lines.length).toBe(1);
    expect(order.guestCount).toBe(2);
    testOrderId = order.id;
    testOrderLineId = order.lines[0].id;
  });

  test('findOrderById returns order with lines and events', async () => {
    const order = await repo.findOrderById(testOrderId);
    expect(order).not.toBeNull();
    expect(order.lines.length).toBeGreaterThanOrEqual(1);
    expect(order.events.length).toBeGreaterThanOrEqual(1);
  });

  test('findOrderByNo finds by order number', async () => {
    const order = await repo.findOrderById(testOrderId);
    const found = await repo.findOrderByNo(order.orderNo);
    expect(found.id).toBe(testOrderId);
  });

  test('listOrders returns paginated results', async () => {
    const result = await repo.listOrders({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('addOrderLine adds line to order', async () => {
    const line = await repo.addOrderLine(testOrderId, {
      menuItemId: testMenuId,
      quantity: 1,
    });
    expect(line).not.toBeNull();
  });

  test('recalculateOrder updates totals', async () => {
    await repo.recalculateOrder(testOrderId);
    const order = await repo.findOrderById(testOrderId);
    expect(order.subtotal).toBeGreaterThan(0);
    expect(order.totalAmount).toBeGreaterThan(0);
  });

  test('updateOrderLine changes line', async () => {
    const line = await repo.updateOrderLine(testOrderLineId, {
      quantity: 3,
      notes: 'Extra spicy',
    });
    expect(line!.quantity).toBe(3);
    expect(line!.notes).toContain('spicy');
  });

  test('removeOrderLine deletes line', async () => {
    const lines = await repo.getOrderLines(testOrderId);
    if (lines.length > 1) {
      const lineToRemove = lines.find((l) => l.id !== testOrderLineId);
      if (lineToRemove) {
        await repo.removeOrderLine(lineToRemove.id);
        const remaining = await repo.getOrderLines(testOrderId);
        expect(remaining.find((l) => l.id === lineToRemove.id)).toBeUndefined();
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// ORDER WORKFLOW (State Machine)
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Order Workflow', () => {
  let wfOrderId = '';

  beforeEach(async () => {
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        lines: [{ menuItemId: testMenuId, quantity: 1 }],
      },
      'test-user',
    );
    wfOrderId = order.id;
  });

  test('draft -> open -> confirmed -> preparing -> ready -> served -> completed', async () => {
    expect(
      (await OrderWorkflowService.transition(wfOrderId, 'open', 'u', 'cashier'))
        .status,
    ).toBe('open');
    expect(
      (
        await OrderWorkflowService.transition(
          wfOrderId,
          'confirmed',
          'u',
          'fnb',
        )
      ).status,
    ).toBe('confirmed');
    expect(
      (
        await OrderWorkflowService.transition(
          wfOrderId,
          'preparing',
          'u',
          'kitchen',
        )
      ).status,
    ).toBe('preparing');
    expect(
      (
        await OrderWorkflowService.transition(
          wfOrderId,
          'ready',
          'u',
          'kitchen',
        )
      ).status,
    ).toBe('ready');
    expect(
      (await OrderWorkflowService.transition(wfOrderId, 'served', 'u', 'fnb'))
        .status,
    ).toBe('served');
    expect(
      (
        await OrderWorkflowService.transition(
          wfOrderId,
          'completed',
          'u',
          'cashier',
        )
      ).status,
    ).toBe('completed');
  });

  test('draft -> cancelled', async () => {
    expect(
      (
        await OrderWorkflowService.transition(
          wfOrderId,
          'cancelled',
          'u',
          'manager',
        )
      ).status,
    ).toBe('cancelled');
  });

  test('cannot transition without correct role', async () => {
    await expect(
      OrderWorkflowService.transition(wfOrderId, 'confirmed', 'u', 'cashier'),
    ).rejects.toThrow(/Role/);
  });

  test('cannot skip status', async () => {
    await expect(
      OrderWorkflowService.transition(wfOrderId, 'paid', 'u', 'owner'),
    ).rejects.toThrow(/Cannot transition/);
  });

  test('getAvailableTransitions returns valid transitions', async () => {
    const transitions =
      await OrderWorkflowService.getAvailableTransitions(wfOrderId);
    expect(transitions.from).toBe('draft');
    expect(transitions.to).toContain('open');
    expect(transitions.to).toContain('cancelled');
  });

  test('events are recorded on transitions', async () => {
    await OrderWorkflowService.transition(wfOrderId, 'open', 'u', 'cashier');
    const order = await repo.findOrderById(wfOrderId);
    const openEvent = order.events.find(
      (e) => e.eventType === 'ORDER_OPENED' || e.toStatus === 'open',
    );
    expect(openEvent).toBeTruthy();
  });
});

// ═════════════════════════════════════════════════════════════════════
// KITCHEN (KOT)
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Kitchen Engine', () => {
  let kotOrderId = '';
  let kotLineId = '';
  let kotId = '';

  beforeEach(async () => {
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        lines: [{ menuItemId: testMenuId, quantity: 2 }],
      },
      'test-user',
    );
    kotOrderId = order.id;
    kotLineId = order.lines[0].id;
  });

  test('generateKOT creates KOT with items', async () => {
    const kot = await KitchenEngineService.generateKOT(
      {
        orderId: kotOrderId,
        itemIds: [kotLineId],
        course: 'main',
        priority: 1,
      },
      'test-user',
    );
    expect(kot.id).toBeTruthy();
    expect(kot.kotNumber).toMatch(/^KOT-/);
    expect(kot.items.length).toBe(1);
    expect(kot.status).toBe('pending');
    kotId = kot.id;
    testKotId = kot.id;
  });

  test('acknowledgeKot updates status', async () => {
    const kot = await KitchenEngineService.acknowledgeKot(kotId, 'test-user');
    expect(kot.status).toBe('acknowledged');
  });

  test('startPreparation changes to preparing', async () => {
    await KitchenEngineService.acknowledgeKot(kotId, 'test-user');
    const kot = await KitchenEngineService.startPreparation(kotId, 'test-user');
    expect(kot.status).toBe('preparing');
  });

  test('markReady changes to ready', async () => {
    await KitchenEngineService.acknowledgeKot(kotId, 'test-user');
    await KitchenEngineService.startPreparation(kotId, 'test-user');
    const kot = await KitchenEngineService.markReady(kotId, 'test-user');
    expect(kot.status).toBe('ready');
  });

  test('markServed changes to served', async () => {
    await KitchenEngineService.acknowledgeKot(kotId, 'test-user');
    await KitchenEngineService.startPreparation(kotId, 'test-user');
    await KitchenEngineService.markReady(kotId, 'test-user');
    const kot = await KitchenEngineService.markServed(kotId, 'test-user');
    expect(kot.status).toBe('served');
  });

  test('cancelKot cancels KOT and lines', async () => {
    const kot = await KitchenEngineService.cancelKot(
      kotId,
      'test-user',
      'Test cancel',
    );
    expect(kot.status).toBe('cancelled');
  });

  test('recallKot reverts to pending', async () => {
    await KitchenEngineService.acknowledgeKot(kotId, 'test-user');
    const kot = await KitchenEngineService.recallKot(
      kotId,
      'test-user',
      'Recall test',
    );
    expect(kot.status).toBe('pending');
  });

  test('getKitchenQueue returns pending KOTs', async () => {
    const queue = await KitchenEngineService.getKitchenQueue();
    expect(Array.isArray(queue)).toBe(true);
  });

  test('findKotByOrderId returns KOTs for order', async () => {
    const kots = await repo.findKotByOrderId(kotOrderId);
    expect(kots.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// TABLE MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Table Service', () => {
  let tableSessionId = '';
  let tableOrderId = '';
  let table2Id = '';

  beforeEach(async () => {
    const t = await repo.createTable({
      tableNo: `TS${uid().slice(0, 5)}`,
      capacity: 4,
      area: 'main',
    });
    tableSessionId = t.id;
    const t2 = await repo.createTable({
      tableNo: `TS2${uid().slice(0, 4)}`,
      capacity: 2,
      area: 'main',
    });
    table2Id = t2.id;
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        guestCount: 3,
        lines: [{ menuItemId: testMenuId, quantity: 2 }],
      },
      'test-user',
    );
    tableOrderId = order.id;
  });

  test('assignTable assigns table to order', async () => {
    const result = await TableService.assignTable(tableSessionId, tableOrderId);
    expect(result.table.status).toBe('occupied');
    expect(result.session.id).toBeTruthy();
  });

  test('findActiveSessionByTableId returns session', async () => {
    const session = await repo.findActiveSessionByTableId(tableSessionId);
    expect(session).not.toBeNull();
    expect(session!.isActive).toBe(true);
  });

  test('getActiveSessions lists active sessions', async () => {
    const sessions = await repo.getActiveSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });

  test('transferTable moves order to another table', async () => {
    await TableService.assignTable(tableSessionId, tableOrderId);
    const result = await TableService.transferTable(
      tableOrderId,
      table2Id,
      'test-user',
    );
    expect(result.toTable.status).toBe('occupied');
    // Source table should be released
    const srcTable = await repo.findTableById(tableSessionId);
    expect(srcTable!.status).toBe('available');
  });

  test('releaseTable frees table', async () => {
    await TableService.assignTable(tableSessionId, tableOrderId);
    const t = await TableService.releaseTable(tableSessionId);
    expect(t.status).toBe('available');
  });

  test('getTableOccupancy returns counts', async () => {
    const occ = await TableService.getTableOccupancy();
    expect(occ.total).toBeGreaterThanOrEqual(1);
    expect(occ.available).toBeGreaterThanOrEqual(0);
    expect(occ.occupied).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// BILLING
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Billing', () => {
  let billOrderId = '';
  let billId = '';

  beforeEach(async () => {
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        lines: [{ menuItemId: testMenuId, quantity: 3 }],
      },
      'test-user',
    );
    billOrderId = order.id;
  });

  test('generateBill creates bill from order', async () => {
    const bill = await BillingService.generateBill(
      {
        orderId: billOrderId,
        discountAmount: 0,
        notes: 'Test bill',
      },
      'test-user',
    );
    expect(bill.id).toBeTruthy();
    expect(bill.billNumber).toMatch(/^BIL-/);
    expect(bill.subtotal).toBeGreaterThan(0);
    expect(bill.totalAmount).toBeGreaterThan(0);
    expect(bill.status).toBe('open');
    billId = bill.id;
  });

  test('findBillById returns bill with payments', async () => {
    const bill = await repo.findBillById(billId);
    expect(bill).not.toBeNull();
    expect(Array.isArray(bill.payments)).toBe(true);
  });

  test('findBillByOrderId returns bill', async () => {
    const bill = await repo.findBillByOrderId(billOrderId);
    expect(bill).not.toBeNull();
    expect(bill!.orderId).toBe(billOrderId);
  });

  test('recordPayment records payment and closes bill', async () => {
    const bill = await BillingService.generateBill(
      {
        orderId: billOrderId,
        discountAmount: 0,
      },
      'test-user',
    );
    const result = await BillingService.recordPayment(
      {
        billId: bill.id,
        mode: 'cash',
        amount: bill.totalAmount,
      },
      'test-user',
    );
    expect(result.payment.id).toBeTruthy();
    expect(result.payment.mode).toBe('cash');
    expect(result.bill.status).toBe('paid');
  });

  test('recordPayment with extra amount returns change', async () => {
    const bill = await BillingService.generateBill(
      {
        orderId: billOrderId,
        discountAmount: 0,
      },
      'test-user',
    );
    const result = await BillingService.recordPayment(
      {
        billId: bill.id,
        mode: 'cash',
        amount: bill.totalAmount + 100,
      },
      'test-user',
    );
    expect(result.bill.status).toBe('paid');
  });

  test('splitBill splits payment across modes', async () => {
    const bill = await BillingService.generateBill(
      {
        orderId: billOrderId,
        discountAmount: 0,
      },
      'test-user',
    );
    const half = bill.totalAmount / 2;
    const bills = await BillingService.splitBill(bill.id, [
      { amount: half, mode: 'cash' },
      { amount: bill.totalAmount - half, mode: 'upi' },
    ]);
    const updatedBill = await repo.findBillById(bill.id);
    expect(updatedBill.status).toBe('paid');
  });

  test('splitBill rejects mismatched total', async () => {
    const bill = await BillingService.generateBill(
      {
        orderId: billOrderId,
        discountAmount: 0,
      },
      'test-user',
    );
    await expect(
      BillingService.splitBill(bill.id, [{ amount: 1, mode: 'cash' }]),
    ).rejects.toThrow(/does not match/);
  });
});

// ═════════════════════════════════════════════════════════════════════
// PRICING
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Pricing', () => {
  test('calculateLineTotal computes values', () => {
    const r = PricingService.calculateLineTotal(250, 3, 10);
    expect(r.lineTotal).toBe(750);
    expect(r.discountAmount).toBe(75);
    expect(r.netTotal).toBe(675);
  });

  test('calculateLineTotal with no discount', () => {
    const r = PricingService.calculateLineTotal(100, 5);
    expect(r.lineTotal).toBe(500);
    expect(r.discountAmount).toBe(0);
    expect(r.netTotal).toBe(500);
  });

  test('calculateBillTotal computes all components', () => {
    const r = PricingService.calculateBillTotal(1000, 10, 0, 5, 5);
    expect(r.discountAmount).toBe(100);
    expect(r.serviceCharge).toBe(45);
    expect(r.taxAmount).toBe(47.25);
    expect(r.totalAmount).toBe(992.25);
  });

  test('calculateBillTotal with fixed discount', () => {
    const r = PricingService.calculateBillTotal(1000, 0, 50, 0, 0);
    expect(r.discountAmount).toBe(50);
    expect(r.totalAmount).toBe(950);
  });

  test('roundAmount rounds to nearest integer', () => {
    expect(PricingService.roundAmount(992.5)).toBe(993);
    expect(PricingService.roundAmount(992.4)).toBe(992);
  });
});

// ═════════════════════════════════════════════════════════════════════
// EVENTS
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Events', () => {
  test('recordOrderEvent creates event', async () => {
    const events = await repo.getOrderEvents(testOrderId);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  test('events are ordered by timestamp desc', async () => {
    const events = await repo.getOrderEvents(testOrderId);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].timestamp >= events[i].timestamp).toBe(true);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// SESSIONS
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Sessions', () => {
  let sessionTableId = '';
  let sessionId = '';

  beforeEach(async () => {
    const t = await repo.createTable({
      tableNo: `SS${uid().slice(0, 5)}`,
      capacity: 4,
    });
    sessionTableId = t.id;
  });

  test('createSession creates dining session', async () => {
    const session = await repo.createSession({
      tableId: sessionTableId,
      guestCount: 2,
      type: 'dine-in',
    });
    expect(session.id).toBeTruthy();
    expect(session.isActive).toBe(true);
    sessionId = session.id;
  });

  test('findSessionById returns session', async () => {
    const session = await repo.findSessionById(sessionId);
    expect(session).not.toBeNull();
    expect(session!.id).toBe(sessionId);
  });

  test('endSession closes session', async () => {
    await repo.endSession(sessionId);
    const session = await repo.findSessionById(sessionId);
    expect(session!.isActive).toBe(false);
    expect(session!.endedAt).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// REPORTING
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Reports', () => {
  test('getOrderSummary returns statistics', async () => {
    const summary = await repo.getOrderSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.totalOrders).toBe('number');
    expect(typeof summary.totalRevenue).toBe('number');
  });

  test('getOrderSummary with date range', async () => {
    const summary = await repo.getOrderSummary(today(), today());
    expect(summary).toBeDefined();
  });

  test('getTableTurnover returns turnover data', async () => {
    const turnover = await repo.getTableTurnover();
    expect(Array.isArray(turnover)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// INVENTORY CONSUMPTION
// ═════════════════════════════════════════════════════════════════════

describe('Restaurant — Inventory Consumption', () => {
  test('consumeForOrder handles order with no recipe gracefully', async () => {
    const order = await repo.createOrder(
      {
        type: 'dine-in',
        lines: [{ menuItemId: testMenuId, quantity: 1 }],
      },
      'test-user',
    );
    const movements = await InventoryConsumptionService.consumeForOrder(
      order.id,
    );
    expect(Array.isArray(movements)).toBe(true);
  });
});
