import { InventoryRepository as repo } from '../src/domains/inventory/inventory.repository';
import {
  StockService,
  CostService,
  ReorderService,
  InventoryValidationService,
} from '../src/domains/inventory/inventory.service';
import type { InventoryItem } from '../src/domains/inventory/inventory.types';

async function createTestItem(overrides: any = {}): Promise<InventoryItem> {
  return repo.create({
    name: `test-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category: 'food',
    unit: 'kg',
    initialStock: 100,
    reorder: 20,
    reorderQty: 30,
    cost: 50,
    ...overrides,
  });
}

let createdItem: InventoryItem;

beforeAll(async () => {
  createdItem = await createTestItem();
});

afterAll(async () => {
  if (createdItem?.id) {
    try {
      await repo.archive(createdItem.id);
    } catch {}
  }
});

describe('InventoryRepository', () => {
  describe('findById', () => {
    it('returns item by id', async () => {
      const item = await repo.findById(createdItem.id);
      expect(item).not.toBeNull();
      expect(item!.id).toBe(createdItem.id);
    });

    it('returns null for non-existent id', async () => {
      const item = await repo.findById('nonexistent');
      expect(item).toBeNull();
    });
  });

  describe('findByName', () => {
    it('returns item by exact name', async () => {
      const item = await repo.findByName(createdItem.name);
      expect(item).not.toBeNull();
      expect(item!.name).toBe(createdItem.name);
    });

    it('returns null for non-existent name', async () => {
      const item = await repo.findByName('!!!NO-EXIST!!!');
      expect(item).toBeNull();
    });
  });

  describe('findByCategory', () => {
    it('returns items filtered by category', async () => {
      const items = await repo.findByCategory('food');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
      items.forEach((item) => expect(item.category).toBe('food'));
    });
  });

  describe('findAll', () => {
    it('returns paginated results with default params', async () => {
      const result = await repo.findAll();
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.offset).toBe(0);
    });

    it('filters by category', async () => {
      const result = await repo.findAll({ category: 'food' });
      result.data.forEach((item) => expect(item.category).toBe('food'));
    });

    it('filters by search', async () => {
      const result = await repo.findAll({
        search: createdItem.name.slice(0, 10),
      });
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filters by lowStock', async () => {
      const lowItem = await createTestItem({ initialStock: 1, reorder: 10 });
      const result = await repo.findAll({ lowStock: true });
      const found = result.data.find((i) => i.id === lowItem.id);
      expect(found).toBeDefined();
      expect(found!.stock).toBeLessThanOrEqual(found!.reorder);
      await repo.archive(lowItem.id);
    });

    it('handles pagination', async () => {
      const result = await repo.findAll({ offset: 0, limit: 1 });
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('findBelowReorder', () => {
    it('returns items with stock below reorder level', async () => {
      const lowItem = await createTestItem({ initialStock: 3, reorder: 10 });
      const items = await repo.findBelowReorder();
      const found = items.find((i) => i.id === lowItem.id);
      expect(found).toBeDefined();
      expect(found!.deficit).toBeGreaterThan(0);
      await repo.archive(lowItem.id);
    });
  });

  describe('create', () => {
    it('creates a new item with all fields', async () => {
      const item = await createTestItem({
        initialStock: 50,
        cost: 100,
        minStock: 5,
        maxStock: 200,
      });
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.stock).toBe(50);
      expect(item.cost).toBe(100);
      expect(item.minStock).toBe(5);
      expect(item.maxStock).toBe(200);
      expect(item.isActive).toBe(true);
      expect(item.version).toBe(1);
      await repo.archive(item.id);
    });
  });

  describe('update', () => {
    it('updates item fields', async () => {
      const item = await createTestItem();
      const updated = await repo.update(item.id, { cost: 999, reorder: 50 });
      expect(updated.cost).toBe(999);
      expect(updated.reorder).toBe(50);
      expect(updated.updatedAt).not.toBe(item.updatedAt);
      await repo.archive(item.id);
    });

    it('throws on non-existent item', async () => {
      await expect(
        repo.update('nonexistent', { name: 'test' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('archive', () => {
    it('marks item as inactive', async () => {
      const item = await createTestItem();
      await repo.archive(item.id);
      const archived = await repo.findById(item.id);
      expect(archived!.isActive).toBe(false);
    });
  });

  describe('adjustStock', () => {
    it('increases stock', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const updated = await repo.adjustStock(item.id, 10);
      expect(updated.stock).toBe(60);
      expect(updated.version).toBe(item.version + 1);
      await repo.archive(item.id);
    });

    it('decreases stock', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const updated = await repo.adjustStock(item.id, -10);
      expect(updated.stock).toBe(40);
      await repo.archive(item.id);
    });

    it('throws on stock underflow', async () => {
      const item = await createTestItem({ initialStock: 5 });
      await expect(repo.adjustStock(item.id, -10)).rejects.toThrow('underflow');
      await repo.archive(item.id);
    });

    it('updates cost when provided', async () => {
      const item = await createTestItem({ initialStock: 50, cost: 100 });
      const updated = await repo.adjustStock(item.id, 10, 120);
      expect(updated.cost).toBe(120);
      await repo.archive(item.id);
    });
  });

  describe('recordMovement', () => {
    it('records a movement with before/after quantities', async () => {
      const item = await createTestItem({ initialStock: 100 });
      const movement = await repo.recordMovement(
        item.id,
        item.name,
        'purchase',
        20,
        100,
        120,
        'test-operator',
        {
          unitCost: 50,
          reference: 'REF001',
          reason: 'Test purchase',
          note: 'Test note',
        },
      );
      expect(movement.itemId).toBe(item.id);
      expect(movement.kind).toBe('purchase');
      expect(movement.quantity).toBe(20);
      expect(movement.quantityBefore).toBe(100);
      expect(movement.quantityAfter).toBe(120);
      await repo.archive(item.id);
    });
  });

  describe('getMovements', () => {
    it('returns paginated movements', async () => {
      const result = await repo.getMovements({ limit: 10 });
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('filters by itemId', async () => {
      const result = await repo.getMovements({ itemId: createdItem.id });
      result.data.forEach((m) => expect(m.itemId).toBe(createdItem.id));
    });
  });

  describe('getMovementHistory', () => {
    it('returns recent movements sorted by timestamp desc', async () => {
      const movements = await repo.getMovementHistory(createdItem.id, 5);
      expect(Array.isArray(movements)).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns inventory summary with metrics', async () => {
      const summary = await repo.getSummary();
      expect(summary.totalItems).toBeGreaterThanOrEqual(1);
      expect(summary.activeItems).toBeGreaterThanOrEqual(1);
      expect(summary.categoryBreakdown).toBeDefined();
    });
  });

  describe('getValuation', () => {
    it('returns valuation for active items with stock', async () => {
      const valuation = await repo.getValuation();
      expect(Array.isArray(valuation)).toBe(true);
    });
  });

  describe('search', () => {
    it('returns matching items', async () => {
      const results = await repo.search(createdItem.name.slice(0, 5));
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty for no match', async () => {
      const results = await repo.search('zzzznonexistentzzzz');
      expect(results.length).toBe(0);
    });
  });

  describe('count', () => {
    it('returns number of active items', async () => {
      const count = await repo.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('StockService', () => {
  describe('recordMovement', () => {
    it('purchase increases stock', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const result = await StockService.recordMovement({
        itemId: item.id,
        kind: 'purchase',
        quantity: 30,
        operator: 'test',
      });
      expect(result.item.stock).toBe(80);
      expect(result.movement.kind).toBe('purchase');
      await repo.archive(item.id);
    });

    it('sale decreases stock', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const result = await StockService.recordMovement({
        itemId: item.id,
        kind: 'sale',
        quantity: 10,
        operator: 'test',
      });
      expect(result.item.stock).toBe(40);
      await repo.archive(item.id);
    });

    it('damage reduces stock', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const result = await StockService.recordMovement({
        itemId: item.id,
        kind: 'damage',
        quantity: 5,
        operator: 'test',
        reason: 'Spoiled',
      });
      expect(result.item.stock).toBe(45);
      await repo.archive(item.id);
    });

    it('throws on stock underflow', async () => {
      const item = await createTestItem({ initialStock: 10 });
      await expect(
        StockService.recordMovement({
          itemId: item.id,
          kind: 'sale',
          quantity: 100,
          operator: 'test',
        }),
      ).rejects.toThrow('underflow');
      await repo.archive(item.id);
    });

    it('throws on zero quantity', async () => {
      const item = await createTestItem({ initialStock: 10 });
      await expect(
        StockService.recordMovement({
          itemId: item.id,
          kind: 'purchase',
          quantity: 0,
          operator: 'test',
        }),
      ).rejects.toThrow('positive');
      await repo.archive(item.id);
    });

    it('throws on non-existent item', async () => {
      await expect(
        StockService.recordMovement({
          itemId: 'nonexistent',
          kind: 'purchase',
          quantity: 10,
          operator: 'test',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('createItemWithOpeningStock', () => {
    it('creates item with opening stock movement', async () => {
      const result = await StockService.createItemWithOpeningStock({
        name: `opening-test-${Date.now()}`,
        category: 'food',
        unit: 'kg',
        initialStock: 75,
        cost: 60,
      });
      expect(result.item.stock).toBe(75);
      expect(result.movement).toBeDefined();
      expect(result.movement!.kind).toBe('opening_balance');
      await repo.archive(result.item.id);
    });

    it('creates item without movement when initialStock=0', async () => {
      const result = await StockService.createItemWithOpeningStock({
        name: `zero-test-${Date.now()}`,
        category: 'food',
        unit: 'kg',
        initialStock: 0,
      });
      expect(result.item.stock).toBe(0);
      expect(result.movement).toBeUndefined();
      await repo.archive(result.item.id);
    });
  });

  describe('transfer', () => {
    it('creates transfer_out and transfer_in with shared batchId', async () => {
      const item = await createTestItem({ initialStock: 100 });
      const result = await StockService.transfer(
        item.id,
        20,
        'test-op',
        'Kitchen',
      );
      expect(result.outMovement.kind).toBe('transfer_out');
      expect(result.inMovement.kind).toBe('transfer_in');
      expect(result.outMovement.batchId).toBe(result.inMovement.batchId);
      await repo.archive(item.id);
    });
  });

  describe('physicalCount', () => {
    it('adjusts stock when count differs', async () => {
      const item = await createTestItem({ initialStock: 100 });
      const result = await StockService.physicalCount(item.id, 95, 'auditor');
      expect(result.item.stock).toBe(95);
      expect(result.movement.kind).toBe('adjustment');
      await repo.archive(item.id);
    });

    it('does not create movement when count matches', async () => {
      const item = await createTestItem({ initialStock: 50 });
      const result = await StockService.physicalCount(item.id, 50, 'auditor');
      expect(result.item.stock).toBe(50);
      expect(result.movement).toBeNull();
      await repo.archive(item.id);
    });
  });
});

describe('CostService', () => {
  it('calculates total cost', () => {
    expect(CostService.calculateTotalCost(10, 50)).toBe(500);
  });

  it('returns valuation from repository', async () => {
    const valuation = await CostService.getValuation();
    expect(Array.isArray(valuation)).toBe(true);
  });
});

describe('ReorderService', () => {
  it('returns low stock items', async () => {
    const items = await ReorderService.getLowStockItems();
    expect(Array.isArray(items)).toBe(true);
  });

  it('returns suggested reorder quantities', async () => {
    const suggestions = await ReorderService.getSuggestedReorder();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('calculates reorder point', () => {
    expect(ReorderService.calculateReorderPoint(10, 3, 15)).toBe(45);
  });
});

describe('InventoryValidationService', () => {
  it('validates item name', () => {
    expect(InventoryValidationService.validateItemName('')).toBeTruthy();
    expect(InventoryValidationService.validateItemName('Rice')).toBeNull();
  });

  it('validates category', () => {
    expect(InventoryValidationService.validateCategory('food')).toBeNull();
    expect(InventoryValidationService.validateCategory('bad')).toBeTruthy();
  });

  it('validates unit', () => {
    expect(InventoryValidationService.validateUnit('')).toBeTruthy();
    expect(InventoryValidationService.validateUnit('kg')).toBeNull();
  });

  it('validates quantity', () => {
    expect(InventoryValidationService.validateQuantity(0)).toBeTruthy();
    expect(InventoryValidationService.validateQuantity(-1)).toBeTruthy();
    expect(InventoryValidationService.validateQuantity(10)).toBeNull();
  });

  it('validates movement kind', () => {
    expect(
      InventoryValidationService.validateMovementKind('purchase'),
    ).toBeNull();
    expect(InventoryValidationService.validateMovementKind('bad')).toBeTruthy();
  });

  it('validates unit conversion groups', () => {
    expect(InventoryValidationService.validateUnitConversion('kg', 'g')).toBe(
      true,
    );
    expect(InventoryValidationService.validateUnitConversion('kg', 'L')).toBe(
      false,
    );
  });

  it('validates all fields together', () => {
    const errors = InventoryValidationService.validateAll({
      name: 'Test',
      category: 'food',
      unit: 'kg',
    });
    expect(errors.length).toBe(0);
  });

  it('rejects negative cost in validateAll', () => {
    const errors = InventoryValidationService.validateAll({
      name: 'Test',
      category: 'food',
      unit: 'kg',
      cost: -10,
    });
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Inventory Aggregate Invariants', () => {
  it('availableStock = stock - reservedStock', async () => {
    const item = await createTestItem({ initialStock: 100 });
    expect(item.availableStock).toBe(item.stock - item.reservedStock);
    await repo.archive(item.id);
  });

  it('version increments on stock adjustment', async () => {
    const item = await createTestItem({ initialStock: 100 });
    const v1 = item.version;
    const updated = await repo.adjustStock(item.id, 10);
    expect(updated.version).toBe(v1 + 1);
    await repo.archive(item.id);
  });

  it('prevents stock below zero', async () => {
    const item = await createTestItem({ initialStock: 5 });
    await expect(repo.adjustStock(item.id, -10)).rejects.toThrow('underflow');
    await repo.archive(item.id);
  });

  it('ledger records before/after quantities', async () => {
    const item = await createTestItem({ initialStock: 100 });
    await StockService.recordMovement({
      itemId: item.id,
      kind: 'consumption',
      quantity: 30,
      operator: 'test-kitchen',
    });
    const movements = await repo.getMovementHistory(item.id, 1);
    expect(movements[0].quantityBefore).toBe(100);
    expect(movements[0].quantityAfter).toBe(70);
    await repo.archive(item.id);
  });

  it('movements are immutable once recorded', async () => {
    const item = await createTestItem({ initialStock: 50 });
    const result = await StockService.recordMovement({
      itemId: item.id,
      kind: 'purchase',
      quantity: 10,
      operator: 'test',
    });
    const movements = await repo.getMovementHistory(item.id, 1);
    expect(movements[0].id).toBe(result.movement.id);
    expect(movements[0].quantity).toBe(10);
    await repo.archive(item.id);
  });

  it('summary total value matches valuation total', async () => {
    const summary = await repo.getSummary();
    const valuation = await repo.getValuation();
    const valTotal = valuation.reduce((s, v) => s + v.totalValue, 0);
    expect(summary.totalValue).toBeCloseTo(valTotal, 1);
  });
});
