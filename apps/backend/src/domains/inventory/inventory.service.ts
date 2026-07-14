import type {
  InventoryItem,
  StockMovement,
  MovementKind,
  CreateMovementDto,
  CreateInventoryItemDto,
} from './inventory.types';
import { MOVEMENT_SIGN } from './inventory.types';
import { InventoryRepository as repo } from './inventory.repository';

// ── StockService ─────────────────────────────────────────────────────

export const StockService = {
  async recordMovement(
    dto: CreateMovementDto,
  ): Promise<{ item: InventoryItem; movement: StockMovement }> {
    const item = await repo.findById(dto.itemId);
    if (!item) throw new Error(`Item not found: ${dto.itemId}`);

    if (dto.quantity <= 0) throw new Error('Quantity must be positive');

    const sign = MOVEMENT_SIGN[dto.kind];
    const delta = sign * dto.quantity;
    const qtyBefore = item.stock;

    if (qtyBefore + delta < 0) {
      throw new Error(
        `Stock underflow: ${item.name} has ${qtyBefore} ${item.unit}, cannot ${dto.kind} ${dto.quantity}`,
      );
    }

    const cost = dto.unitCost ?? item.cost;
    const updated = await repo.adjustStock(dto.itemId, delta, cost);

    const movement = await repo.recordMovement(
      dto.itemId,
      item.name,
      dto.kind,
      dto.quantity,
      qtyBefore,
      updated.stock,
      dto.operator,
      {
        unitCost: cost,
        reference: dto.reference,
        reason: dto.reason,
        note: dto.note,
        batchId: dto.batchId,
      },
    );

    return { item: updated, movement };
  },

  async createItemWithOpeningStock(
    dto: CreateInventoryItemDto,
  ): Promise<{ item: InventoryItem; movement?: StockMovement }> {
    const item = await repo.create(dto);

    if (dto.initialStock && dto.initialStock > 0) {
      const movement = await repo.recordMovement(
        item.id,
        item.name,
        'opening_balance',
        dto.initialStock,
        0,
        dto.initialStock,
        'system',
        { unitCost: dto.cost, reason: 'Initial stock on creation' },
      );
      return { item, movement };
    }

    return { item };
  },

  async transfer(
    itemId: string,
    quantity: number,
    operator: string,
    note?: string,
  ): Promise<{
    outMovement: StockMovement;
    inMovement: StockMovement;
  }> {
    const batchId = `transfer-${Date.now().toString(36)}`;

    const outResult = await this.recordMovement({
      itemId,
      kind: 'transfer_out',
      quantity,
      operator,
      note: note || 'Transfer out',
      batchId,
    });

    const inResult = await this.recordMovement({
      itemId,
      kind: 'transfer_in',
      quantity,
      operator,
      note: note || 'Transfer in',
      batchId,
    });

    return { outMovement: outResult.movement, inMovement: inResult.movement };
  },

  async physicalCount(
    itemId: string,
    actualQuantity: number,
    operator: string,
    note?: string,
  ): Promise<{
    item: InventoryItem;
    movement: StockMovement;
  }> {
    const item = await repo.findById(itemId);
    if (!item) throw new Error(`Item not found: ${itemId}`);

    const diff = actualQuantity - item.stock;
    const kind: MovementKind = diff >= 0 ? 'physical_count' : 'adjustment';
    const absDiff = Math.abs(diff);

    if (absDiff === 0) {
      return { item, movement: null as any };
    }

    return this.recordMovement({
      itemId,
      kind,
      quantity: absDiff,
      operator,
      reason: `Physical count: expected ${item.stock}, actual ${actualQuantity}`,
      note: note || undefined,
    });
  },
};

// ── CostService ──────────────────────────────────────────────────────

export const CostService = {
  calculateTotalCost(quantity: number, unitCost: number): number {
    return quantity * unitCost;
  },

  async getValuation() {
    return repo.getValuation();
  },

  async getFifoLayers(
    itemId: string,
  ): Promise<{ quantity: number; unitCost: number; receivedAt: string }[]> {
    const movements = await repo.getMovements({
      itemId,
      kind: 'purchase',
      limit: 1000,
    });
    return movements.data
      .filter((m) => m.kind === 'purchase')
      .map((m) => ({
        quantity: m.quantity,
        unitCost: m.unitCost,
        receivedAt: m.timestamp,
      }))
      .sort(
        (a, b) =>
          new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
      );
  },
};

// ── ReorderService ──────────────────────────────────────────────────

export const ReorderService = {
  async getLowStockItems() {
    return repo.findBelowReorder();
  },

  async getSuggestedReorder(): Promise<
    { item: InventoryItem; suggestedQty: number }[]
  > {
    const lowItems = await repo.findBelowReorder();
    const result: { item: InventoryItem; suggestedQty: number }[] = [];

    for (const ls of lowItems) {
      const item = await repo.findById(ls.id);
      if (!item) continue;
      const suggestedQty = Math.max(
        item.reorderQty,
        ls.deficit + Math.ceil(item.reorder * 0.2),
      );
      result.push({ item, suggestedQty });
    }

    return result;
  },

  calculateReorderPoint(
    avgDailyUsage: number,
    leadTimeDays: number,
    safetyStock: number,
  ): number {
    return avgDailyUsage * leadTimeDays + safetyStock;
  },

  calculateReorderQuantity(
    avgDailyUsage: number,
    leadTimeDays: number,
    maxStock: number,
    currentStock: number,
  ): number {
    const usageDuringLeadTime = avgDailyUsage * leadTimeDays;
    return Math.max(
      0,
      Math.min(maxStock - currentStock, usageDuringLeadTime * 2),
    );
  },
};

// ── ValidationService ────────────────────────────────────────────────

export const InventoryValidationService = {
  validateItemName(name: string): string | null {
    if (!name || name.trim().length === 0) return 'Item name is required';
    if (name.length > 100) return 'Item name must be 100 characters or less';
    return null;
  },

  validateCategory(category: string): string | null {
    const valid = [
      'food',
      'softdrink',
      'kitchen',
      'housekeeping',
      'consumables',
      'liquor',
      'packaging',
      'amenities',
    ];
    if (!valid.includes(category))
      return `Invalid category: ${category}. Must be one of: ${valid.join(', ')}`;
    return null;
  },

  validateUnit(unit: string): string | null {
    if (!unit || unit.trim().length === 0) return 'Unit is required';
    if (unit.length > 10) return 'Unit must be 10 characters or less';
    return null;
  },

  validateQuantity(quantity: number): string | null {
    if (typeof quantity !== 'number' || isNaN(quantity))
      return 'Quantity must be a number';
    if (quantity <= 0) return 'Quantity must be positive';
    return null;
  },

  validateMovementKind(kind: string): string | null {
    const valid = [
      'purchase',
      'sale',
      'consumption',
      'transfer_in',
      'transfer_out',
      'adjustment',
      'physical_count',
      'damage',
      'expiry',
      'supplier_return',
      'customer_return',
      'complimentary',
      'opening_balance',
      'closing_adjustment',
    ];
    if (!valid.includes(kind)) return `Invalid movement kind: ${kind}`;
    return null;
  },

  validateUnitConversion(fromUnit: string, toUnit: string): boolean {
    const conversionGroups: Record<string, string[]> = {
      weight: ['kg', 'g', 'mg'],
      volume: ['L', 'ml'],
      count: ['pc', 'btl', 'cyl', 'can', 'set', 'pack'],
    };

    const fromGroup = Object.entries(conversionGroups).find(([, units]) =>
      units.includes(fromUnit),
    )?.[0];
    const toGroup = Object.entries(conversionGroups).find(([, units]) =>
      units.includes(toUnit),
    )?.[0];
    return !!fromGroup && !!toGroup && fromGroup === toGroup;
  },

  validateAll(dto: any): string[] {
    const errors: string[] = [];
    if (dto.name) {
      const e = this.validateItemName(dto.name);
      if (e) errors.push(e);
    }
    if (dto.category) {
      const e = this.validateCategory(dto.category);
      if (e) errors.push(e);
    }
    if (dto.unit) {
      const e = this.validateUnit(dto.unit);
      if (e) errors.push(e);
    }
    if (dto.initialStock !== undefined && dto.initialStock < 0)
      errors.push('Initial stock cannot be negative');
    if (dto.cost !== undefined && dto.cost < 0)
      errors.push('Cost cannot be negative');
    if (dto.reorder !== undefined && dto.reorder < 0)
      errors.push('Reorder level cannot be negative');
    return errors;
  },
};

// ── MovementService ─────────────────────────────────────────────────

export const MovementService = {
  async getHistory(itemId: string, limit?: number) {
    return repo.getMovementHistory(itemId, limit);
  },

  async getMovements(filter: any) {
    return repo.getMovements(filter);
  },

  async getMovementsByDateRange(fromDate: string, toDate: string) {
    return repo.getMovements({ fromDate, toDate, limit: 5000 });
  },

  async getMovementsByKind(kind: string) {
    return repo.getMovements({ kind: kind as any, limit: 1000 });
  },

  async getMovementsByBatch(batchId: string) {
    return repo.getMovements({ batchId, limit: 100 });
  },
};
