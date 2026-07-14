import { RestaurantRepository as repo } from './restaurant.repository';
import { InventoryRepository as invRepo } from '../inventory/inventory.repository';
import type {
  RestaurantOrder,
  OrderLine,
  Kot,
  KotItem,
  Bill,
  Payment,
  DiningTable,
  DiningSession,
  OrderStatus,
  KotStatus,
  OrderEventType,
  CreateOrderDto,
  CreateKotDto,
  CreateBillDto,
  CreatePaymentDto,
  MenuItem,
  Recipe,
  RecipeIngredient,
} from './restaurant.types';
import { ORDER_TRANSITIONS, TRANSITION_PERMISSIONS } from './restaurant.types';
import { postOperationalToLedger } from '../accounting/ledger-integration';

// ── Order Workflow Service ───────────────────────────────────────────

export const OrderWorkflowService = {
  async transition(
    orderId: string,
    toStatus: OrderStatus,
    userId: string,
    userRole: string,
    reason?: string,
  ): Promise<RestaurantOrder> {
    const order = await repo.findOrderById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status === toStatus)
      throw new Error(`Order is already ${toStatus}`);

    const allowed = ORDER_TRANSITIONS[order.status] || [];
    if (!allowed.includes(toStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${toStatus}`);
    }

    const key = `${order.status}->${toStatus}`;
    const permitted = TRANSITION_PERMISSIONS[key];
    if (permitted && !permitted.includes(userRole)) {
      throw new Error(`Role '${userRole}' cannot perform ${key}`);
    }

    await repo.updateOrderStatus(orderId, toStatus);

    const eventMap: Record<string, OrderEventType> = {
      confirmed: 'ORDER_CONFIRMED',
      preparing: 'COOKING_STARTED',
      ready: 'ORDER_READY',
      served: 'ORDER_SERVED',
      completed: 'ORDER_COMPLETED',
      paid: 'ORDER_PAID',
      cancelled: 'ORDER_CANCELLED',
      voided: 'ORDER_VOIDED',
      refunded: 'ORDER_REFUNDED',
    };

    const eventType = eventMap[toStatus] || 'ORDER_CREATED';
    await repo.recordOrderEvent(
      orderId,
      eventType,
      order.status,
      toStatus,
      reason ? JSON.stringify({ reason, userId, userRole }) : null,
      userId,
    );

    if (toStatus === 'confirmed') {
      await repo.recordOrderEvent(
        orderId,
        'KOT_GENERATED',
        order.status,
        toStatus,
        null,
        userId,
      );
    }

    if (toStatus === 'completed') {
      await InventoryConsumptionService.consumeForOrder(orderId);
    }

    const updated = await repo.findOrderById(orderId);
    return updated!;
  },

  async getAvailableTransitions(
    orderId: string,
  ): Promise<{ from: OrderStatus; to: OrderStatus[] }> {
    const order = await repo.findOrderById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    return { from: order.status, to: ORDER_TRANSITIONS[order.status] || [] };
  },
};

// ── Kitchen Engine Service ───────────────────────────────────────────

export const KitchenEngineService = {
  async generateKOT(dto: CreateKotDto, createdBy: string): Promise<Kot> {
    const order = await repo.findOrderById(dto.orderId);
    if (!order) throw new Error(`Order not found: ${dto.orderId}`);

    const kot = await repo.createKot(dto, createdBy);

    for (const lineId of dto.itemIds) {
      const line = order.lines.find((l) => l.id === lineId);
      if (line) {
        await repo.updateOrderLineStatus(lineId, 'preparing');
      }
    }

    await repo.recordOrderEvent(
      dto.orderId,
      'KOT_GENERATED',
      order.status,
      order.status,
      JSON.stringify({ kotId: kot.id, itemCount: dto.itemIds.length }),
      createdBy,
    );

    if (['draft', 'open'].includes(order.status)) {
      await repo.updateOrderStatus(dto.orderId, 'confirmed');
    }

    return kot;
  },

  async getKitchenQueue(stationId?: string): Promise<Kot[]> {
    return repo.getKotQueue(stationId);
  },

  async acknowledgeKot(kotId: string, userId: string): Promise<Kot> {
    await repo.updateKotStatus(kotId, 'acknowledged');
    return repo.findKotById(kotId) as Promise<Kot>;
  },

  async startPreparation(kotId: string, userId: string): Promise<Kot> {
    await repo.updateKotStatus(kotId, 'preparing');
    const kot = await repo.findKotById(kotId);
    if (kot) {
      await repo.recordOrderEvent(
        kot.orderId,
        'COOKING_STARTED',
        null,
        null,
        JSON.stringify({ kotId, userId }),
        userId,
      );
    }
    return kot!;
  },

  async markReady(kotId: string, userId: string): Promise<Kot> {
    await repo.updateKotStatus(kotId, 'ready');
    const kot = await repo.findKotById(kotId);
    if (kot) {
      await repo.recordOrderEvent(
        kot.orderId,
        'ORDER_READY',
        null,
        null,
        JSON.stringify({ kotId, userId }),
        userId,
      );
    }
    return kot!;
  },

  async markServed(kotId: string, userId: string): Promise<Kot> {
    await repo.updateKotStatus(kotId, 'served');
    const kot = await repo.findKotById(kotId);
    if (kot) {
      const allServed = (await repo.findKotByOrderId(kot.orderId)).every(
        (k) => k.status === 'served' || k.status === 'cancelled',
      );
      if (allServed) {
        await repo.updateOrderStatus(kot.orderId, 'served');
      }
    }
    return kot!;
  },

  async cancelKot(
    kotId: string,
    userId: string,
    reason?: string,
  ): Promise<Kot> {
    await repo.updateKotStatus(kotId, 'cancelled');
    const kot = await repo.findKotById(kotId);
    if (kot) {
      for (const item of kot.items) {
        await repo.updateOrderLineStatus(item.orderLineId, 'cancelled');
      }
      await repo.recordOrderEvent(
        kot.orderId,
        'ORDER_CANCELLED',
        null,
        null,
        JSON.stringify({ kotId, reason, userId }),
        userId,
      );
    }
    return kot!;
  },

  async recallKot(
    kotId: string,
    userId: string,
    reason?: string,
  ): Promise<Kot> {
    const kot = await repo.findKotById(kotId);
    if (!kot) throw new Error('KOT not found');
    await repo.updateKotStatus(kotId, 'pending');
    await repo.recordOrderEvent(
      kot.orderId,
      'ORDER_MODIFIED',
      null,
      null,
      JSON.stringify({ kotId, action: 'recall', reason, userId }),
      userId,
    );
    return repo.findKotById(kotId) as Promise<Kot>;
  },

  async refireKot(
    kotId: string,
    userId: string,
    reason?: string,
  ): Promise<Kot> {
    const kot = await repo.findKotById(kotId);
    if (!kot) throw new Error('KOT not found');
    for (const item of kot.items) {
      await repo.updateKotItemStatus(item.id, 'pending');
    }
    await repo.updateKotStatus(kotId, 'pending');
    await repo.recordOrderEvent(
      kot.orderId,
      'ORDER_MODIFIED',
      null,
      null,
      JSON.stringify({ kotId, action: 'refire', reason, userId }),
      userId,
    );
    return repo.findKotById(kotId) as Promise<Kot>;
  },
};

// ── Recipe Service ────────────────────────────────────────────────────

export const RecipeService = {
  async getRecipeWithIngredients(menuItemId: string): Promise<Recipe | null> {
    return repo.findRecipeByMenuItemId(menuItemId);
  },

  async calculateIngredientRequirements(
    menuItemId: string,
    quantity: number,
  ): Promise<{
    ingredients: {
      inventoryItemId: string | null;
      name: string;
      qty: number;
      unit: string;
    }[];
    canFulfill: boolean;
    shortages: string[];
  }> {
    const recipe = await repo.findRecipeByMenuItemId(menuItemId);
    if (!recipe) return { ingredients: [], canFulfill: true, shortages: [] };

    const ingredients: {
      inventoryItemId: string | null;
      name: string;
      qty: number;
      unit: string;
    }[] = [];
    const shortages: string[] = [];
    let canFulfill = true;

    for (const ing of recipe.ingredients) {
      if (ing.isAlternative) continue;
      const totalQty =
        ing.quantity *
        quantity *
        (1 + (ing.wasteFactor || recipe.wasteFactor || 0) / 100);

      if (ing.inventoryItemId) {
        const item = await invRepo.findById(ing.inventoryItemId);
        if (item) {
          if (item.stock < totalQty) {
            shortages.push(
              `${ing.inventoryItemName}: need ${totalQty} ${ing.unit}, have ${item.stock}`,
            );
            canFulfill = false;
          }
        } else {
          shortages.push(`${ing.inventoryItemName}: item not found`);
          canFulfill = false;
        }
      }

      ingredients.push({
        inventoryItemId: ing.inventoryItemId,
        name: ing.inventoryItemName,
        qty: totalQty,
        unit: ing.unit,
      });
    }

    return { ingredients, canFulfill, shortages };
  },

  async findAlternatives(
    menuItemId: string,
    unavailableItems: string[],
  ): Promise<RecipeIngredient[]> {
    const recipe = await repo.findRecipeByMenuItemId(menuItemId);
    if (!recipe) return [];
    return recipe.ingredients.filter(
      (i) =>
        i.isAlternative &&
        i.alternativeGroup &&
        unavailableItems.some((u) => i.alternativeGroup === u),
    );
  },
};

// ── Pricing Service ───────────────────────────────────────────────────

export const PricingService = {
  calculateLineTotal(
    price: number,
    quantity: number,
    discountPercent?: number,
  ): {
    lineTotal: number;
    discountAmount: number;
    netTotal: number;
  } {
    const lineTotal = price * quantity;
    const discountAmount = discountPercent
      ? Math.round(((lineTotal * discountPercent) / 100) * 100) / 100
      : 0;
    return { lineTotal, discountAmount, netTotal: lineTotal - discountAmount };
  },

  calculateBillTotal(
    subtotal: number,
    discountPercent: number,
    discountAmount: number,
    serviceChargePercent: number,
    taxPercent: number,
  ): {
    discountAmount: number;
    serviceCharge: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const calcDiscount =
      discountPercent > 0
        ? Math.round(((subtotal * discountPercent) / 100) * 100) / 100
        : discountAmount;
    const afterDiscount = subtotal - calcDiscount;
    const serviceCharge =
      serviceChargePercent > 0
        ? Math.round(((afterDiscount * serviceChargePercent) / 100) * 100) / 100
        : 0;
    const taxable = afterDiscount + serviceCharge;
    const taxAmount =
      taxPercent > 0
        ? Math.round(((taxable * taxPercent) / 100) * 100) / 100
        : 0;
    const totalAmount = taxable + taxAmount;
    return {
      discountAmount: calcDiscount,
      serviceCharge,
      taxAmount,
      totalAmount,
    };
  },

  roundAmount(amount: number): number {
    return Math.round(amount);
  },

  applyDiscount(
    order: RestaurantOrder,
    discountPercent: number,
    discountAmount: number,
    reason?: string,
  ): RestaurantOrder {
    const result = this.calculateBillTotal(
      order.subtotal,
      discountPercent,
      discountAmount,
      0,
      0,
    );
    return {
      ...order,
      discountAmount: result.discountAmount,
      discountPercent,
      discountReason: reason || null,
    };
  },
};

// ── Table Service ─────────────────────────────────────────────────────

export const TableService = {
  async assignTable(
    tableId: string,
    orderId: string,
  ): Promise<{ table: DiningTable; session: DiningSession }> {
    const table = await repo.findTableById(tableId);
    if (!table) throw new Error(`Table not found: ${tableId}`);
    if (table.status !== 'available')
      throw new Error(`Table ${table.tableNo} is ${table.status}`);

    const existing = await repo.findActiveSessionByTableId(tableId);
    if (existing) throw new Error(`Table ${table.tableNo} has active session`);

    const order = await repo.findOrderById(orderId);
    const session = await repo.createSession({
      tableId,
      guestCount: order?.guestCount || 1,
      type: order?.type || 'dine-in',
    });

    await repo.updateTable(tableId, { status: 'occupied' } as any);
    await repo.recordOrderEvent(
      orderId,
      'TABLE_ASSIGNED',
      null,
      null,
      JSON.stringify({
        tableId,
        tableNo: table.tableNo,
        sessionId: session.id,
      }),
      'system',
    );

    const updatedTable = await repo.findTableById(tableId);
    return { table: updatedTable!, session };
  },

  async transferTable(
    orderId: string,
    toTableId: string,
    userId: string,
  ): Promise<{ order: RestaurantOrder; toTable: DiningTable }> {
    const order = await repo.findOrderById(orderId);
    if (!order) throw new Error('Order not found');
    const fromTableId = order.tableId;
    if (!fromTableId) throw new Error('Order has no table');

    const toTable = await repo.findTableById(toTableId);
    if (!toTable) throw new Error('Target table not found');
    if (toTable.status !== 'available')
      throw new Error(`Table ${toTable.tableNo} is ${toTable.status}`);

    const session = await repo.findActiveSessionByTableId(fromTableId);
    if (session) {
      await repo.endSession(session.id);
    }

    await repo.updateTable(fromTableId, { status: 'available' } as any);
    await repo.updateTable(toTableId, { status: 'occupied' } as any);

    await repo.recordOrderEvent(
      orderId,
      'TABLE_TRANSFERRED',
      null,
      null,
      JSON.stringify({ fromTableId, toTableId, userId }),
      userId,
    );

    const newSession = await repo.createSession({
      tableId: toTableId,
      guestCount: order.guestCount,
      type: order.type,
    });
    const updatedOrder = await repo.findOrderById(orderId);
    return { order: updatedOrder!, toTable };
  },

  async releaseTable(tableId: string): Promise<DiningTable> {
    const session = await repo.findActiveSessionByTableId(tableId);
    if (session) {
      await repo.endSession(session.id);
    }
    await repo.updateTable(tableId, { status: 'available' } as any);
    return (await repo.findTableById(tableId))!;
  },

  async getTableOccupancy(): Promise<{
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    cleaning: number;
  }> {
    const tables = await repo.listTables({ limit: 1000 });
    let occupied = 0,
      available = 0,
      reserved = 0,
      cleaning = 0;
    for (const t of tables.data) {
      if (t.status === 'occupied') occupied++;
      else if (t.status === 'available') available++;
      else if (t.status === 'reserved') reserved++;
      else if (t.status === 'cleaning') cleaning++;
    }
    return { total: tables.total, occupied, available, reserved, cleaning };
  },
};

// ── Billing Service ───────────────────────────────────────────────────

export const BillingService = {
  async generateBill(dto: CreateBillDto, createdBy: string): Promise<Bill> {
    const order = await repo.findOrderById(dto.orderId);
    if (!order) throw new Error(`Order not found: ${dto.orderId}`);

    const settingsRows = await query(
      'SELECT tax_rate_food FROM settings LIMIT 1',
    );
    const taxPercent = Number(settingsRows[0]?.tax_rate_food || 5);
    const serviceChargePercent = 0;

    const pricing = PricingService.calculateBillTotal(
      order.subtotal,
      dto.discountPercent || 0,
      dto.discountAmount || 0,
      serviceChargePercent,
      taxPercent,
    );

    await repo.recordOrderEvent(
      dto.orderId,
      'BILL_CLOSED',
      order.status,
      'completed',
      JSON.stringify({ subtotal: order.subtotal, ...pricing }),
      createdBy,
    );

    return repo.createBill(
      {
        orderId: dto.orderId,
        serviceCharge: pricing.serviceCharge,
        discountAmount: pricing.discountAmount,
        taxAmount: pricing.taxAmount,
        totalAmount: pricing.totalAmount,
        notes: dto.notes,
      },
      createdBy,
    );
  },

  async recordPayment(
    dto: CreatePaymentDto,
    processedBy: string,
  ): Promise<{ payment: Payment; bill: Bill; change?: number }> {
    const payment = await repo.createPayment(dto, processedBy);
    const bill = await repo.findBillById(dto.billId);
    if (!bill) throw new Error('Bill not found');

    const totalPaid =
      bill.payments.reduce((s, p) => s + p.amount, 0) + dto.amount;
    let change: number | undefined;
    if (totalPaid >= bill.totalAmount) {
      change = Math.round((totalPaid - bill.totalAmount) * 100) / 100;
      await repo.updateBillStatus(dto.billId, 'paid');
      await repo.closeBill(dto.billId, new Date().toISOString());
      const order = await repo.findOrderByBillId(dto.billId);
      if (order) {
        await repo.updateOrderStatus(order.id, 'paid');
        await repo.recordOrderEvent(
          order.id,
          'PAYMENT_RECEIVED',
          'completed',
          'paid',
          JSON.stringify({
            amount: dto.amount,
            mode: dto.mode,
            billId: dto.billId,
            change,
          }),
          processedBy,
        );
        if (order.tableId) {
          await TableService.releaseTable(order.tableId);
        }
        // M0-1: every settled sale becomes an immutable accounting entry.
        const tax = Math.round((bill.taxAmount || 0) * 100) / 100;
        const taxable = Math.round((bill.totalAmount - tax) * 100) / 100;
        await postOperationalToLedger('restaurant_sale', {
          referenceId: bill.id,
          referenceNo: order.orderNo || bill.id,
          amount: taxable,
          gstAmount: tax,
          entryDate: new Date().toISOString().slice(0, 10),
          description: `Restaurant sale ${order.orderNo || bill.id}`,
        });
      }
    } else {
      await repo.updateBillStatus(
        dto.billId,
        totalPaid > 0 ? 'partially_paid' : 'open',
      );
    }

    const updatedBill = await repo.findBillById(dto.billId);
    return { payment, bill: updatedBill!, change };
  },

  async splitBill(
    billId: string,
    splits: { amount: number; mode: string }[],
  ): Promise<Bill[]> {
    const bill = await repo.findBillById(billId);
    if (!bill) throw new Error('Bill not found');
    const splitTotal = splits.reduce((s, sp) => s + sp.amount, 0);
    if (Math.abs(splitTotal - bill.totalAmount) > 0.01) {
      throw new Error(
        `Split total ${splitTotal} does not match bill total ${bill.totalAmount}`,
      );
    }
    const payments: Payment[] = [];
    for (const split of splits) {
      const payment = await repo.createPayment(
        {
          billId,
          mode: split.mode as any,
          amount: split.amount,
        },
        'system',
      );
      payments.push(payment);
    }
    await repo.updateBillStatus(billId, 'paid');
    return [await repo.findBillById(billId)!] as Bill[];
  },
};

// ── Inventory Consumption Service ─────────────────────────────────────

export const InventoryConsumptionService = {
  async consumeForOrder(orderId: string): Promise<any[]> {
    const order = await repo.findOrderById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);

    const movements: any[] = [];
    const consumed: { itemId: string; qty: number; cost: number }[] = [];

    for (const line of order.lines) {
      if (line.status === 'cancelled' || line.isComplimentary) continue;

      const recipe = await repo.findRecipeByMenuItemId(line.menuItemId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        if (ing.isAlternative || !ing.inventoryItemId) continue;
        const totalQty =
          ing.quantity *
          line.quantity *
          (1 + (ing.wasteFactor || recipe.wasteFactor || 0) / 100);

        try {
          const item = await invRepo.findById(ing.inventoryItemId);
          if (!item) continue;

          const qtyBefore = item.stock;
          const updated = await invRepo.adjustStock(
            ing.inventoryItemId,
            -totalQty,
          );
          const movement = await invRepo.recordMovement(
            ing.inventoryItemId,
            item.name,
            'consumption',
            totalQty,
            qtyBefore,
            updated.stock,
            `order:${order.orderNo}`,
            {
              unitCost: item.cost,
              reference: order.orderNo,
              reason: `Consumed for order ${order.orderNo} - ${line.menuItemName}`,
            },
          );
          movements.push(movement);
          consumed.push({
            itemId: ing.inventoryItemId,
            qty: totalQty,
            cost: item.cost,
          });
        } catch (err: any) {
          if (err.message?.includes('underflow')) {
            console.warn(
              `[restaurant] Stock underflow for ${ing.inventoryItemName} in order ${order.orderNo}`,
            );
          }
        }
      }
    }

    if (consumed.length > 0) {
      await repo.recordOrderEvent(
        orderId,
        'INVENTORY_CONSUMED',
        null,
        null,
        JSON.stringify({ items: consumed, count: consumed.length }),
        'system',
      );
    }

    return movements;
  },
};

function query(sql: string, params: any[] = []): Promise<any[]> {
  const { query: dbQuery } = require('../../db');
  return dbQuery(sql, params);
}
