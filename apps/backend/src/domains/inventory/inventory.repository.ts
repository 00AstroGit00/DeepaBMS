import { query, run, db } from '../../db';
import type {
  InventoryItem,
  StockMovement,
  InventorySummary,
  LowStockItem,
  InventoryValuation,
  PaginatedResult,
  InventoryFilter,
  MovementFilter,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './inventory.types';

function rowToItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    stock: Number(row.stock),
    reservedStock: Number(row.reserved_stock || 0),
    availableStock: Number(row.stock) - Number(row.reserved_stock || 0),
    minStock: Number(row.min_stock || 0),
    maxStock: Number(row.max_stock || 0),
    reorder: Number(row.reorder || 0),
    reorderQty: Number(row.reorder_qty || 0),
    cost: Number(row.cost || 0),
    costMethod: (row.cost_method || 'fifo') as any,
    isActive: Boolean(row.is_active ?? true),
    version: Number(row.version || 1),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToMovement(row: any): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    kind: row.kind,
    quantity: Number(row.quantity),
    quantityBefore: Number(row.quantity_before),
    quantityAfter: Number(row.quantity_after),
    unitCost: Number(row.unit_cost || 0),
    totalCost: Number(row.total_cost || 0),
    operator: row.operator,
    reference: row.reference || null,
    reason: row.reason || null,
    note: row.note || null,
    batchId: row.batch_id || null,
    timestamp: row.timestamp || '',
  };
}

const uid = (): string =>
  `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const InventoryRepository = {
  async findById(id: string): Promise<InventoryItem | null> {
    const rows = await query('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows.length ? rowToItem(rows[0]) : null;
  },

  async findByName(name: string): Promise<InventoryItem | null> {
    const rows = await query('SELECT * FROM inventory WHERE name = ?', [name]);
    return rows.length ? rowToItem(rows[0]) : null;
  },

  async findByCategory(category: string): Promise<InventoryItem[]> {
    const rows = await query(
      'SELECT * FROM inventory WHERE category = ? ORDER BY name',
      [category],
    );
    return rows.map(rowToItem);
  },

  async findAll(
    filter: InventoryFilter = {},
  ): Promise<PaginatedResult<InventoryItem>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const orderBy = filter.orderBy || 'name';
    const orderDir = filter.orderDir || 'asc';
    const allowedOrders = ['name', 'category', 'stock', 'cost', 'created_at'];
    const safeOrderBy = allowedOrders.includes(orderBy) ? orderBy : 'name';
    const safeOrderDir = orderDir === 'desc' ? 'DESC' : 'ASC';

    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter.search) {
      conditions.push('name LIKE ?');
      params.push(`%${filter.search}%`);
    }
    if (filter.lowStock) {
      conditions.push('stock <= reorder AND reorder > 0');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*) as total FROM inventory ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM inventory ${where} ORDER BY ${safeOrderBy} ${safeOrderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToItem), total, offset, limit };
  },

  async findBelowReorder(): Promise<LowStockItem[]> {
    const rows = await query(
      'SELECT * FROM inventory WHERE is_active = 1 AND reorder > 0 AND stock <= reorder ORDER BY (reorder - stock) DESC',
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      unit: r.unit,
      stock: Number(r.stock),
      reorder: Number(r.reorder),
      deficit: Number(r.reorder) - Number(r.stock),
    }));
  },

  async create(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const id = uid();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO inventory (id, name, category, unit, stock, min_stock, max_stock, reorder, reorder_qty, cost, cost_method, is_active, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      [
        id,
        dto.name,
        dto.category,
        dto.unit,
        dto.initialStock ?? 0,
        dto.minStock ?? 0,
        dto.maxStock ?? 0,
        dto.reorder ?? 0,
        dto.reorderQty ?? 0,
        dto.cost ?? 0,
        dto.costMethod || 'fifo',
        now,
        now,
      ],
    );
    const item = await this.findById(id);
    if (!item) throw new Error('Failed to create inventory item');
    return item;
  },

  async update(
    id: string,
    changes: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Inventory item not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.category !== undefined) {
      sets.push('category = ?');
      params.push(changes.category);
    }
    if (changes.unit !== undefined) {
      sets.push('unit = ?');
      params.push(changes.unit);
    }
    if (changes.minStock !== undefined) {
      sets.push('min_stock = ?');
      params.push(changes.minStock);
    }
    if (changes.maxStock !== undefined) {
      sets.push('max_stock = ?');
      params.push(changes.maxStock);
    }
    if (changes.reorder !== undefined) {
      sets.push('reorder = ?');
      params.push(changes.reorder);
    }
    if (changes.reorderQty !== undefined) {
      sets.push('reorder_qty = ?');
      params.push(changes.reorderQty);
    }
    if (changes.cost !== undefined) {
      sets.push('cost = ?');
      params.push(changes.cost);
    }
    if (changes.costMethod !== undefined) {
      sets.push('cost_method = ?');
      params.push(changes.costMethod);
    }

    if (params.length === 1) return existing;

    await run(`UPDATE inventory SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const item = await this.findById(id);
    if (!item) throw new Error(`Inventory item not found after update: ${id}`);
    return item;
  },

  async archive(id: string): Promise<void> {
    await run(
      'UPDATE inventory SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  async adjustStock(
    id: string,
    delta: number,
    newCost?: number,
  ): Promise<InventoryItem> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Inventory item not found: ${id}`);

    const newStock = existing.stock + delta;
    if (newStock < 0)
      throw new Error(
        `Stock underflow: ${existing.name} has ${existing.stock}, cannot remove ${Math.abs(delta)}`,
      );

    const sets: string[] = ['stock = ?', 'updated_at = ?'];
    const params: any[] = [newStock, new Date().toISOString()];
    if (newCost !== undefined) {
      sets.push('cost = ?');
      params.push(newCost);
    }
    sets.push('version = version + 1');

    await run(
      `UPDATE inventory SET ${sets.join(', ')} WHERE id = ? AND version = ?`,
      [...params, id, existing.version],
    );
    const item = await this.findById(id);
    if (!item)
      throw new Error('Stock adjustment failed (concurrent modification)');
    return item;
  },

  // ── Movement ledger ────────────────────────────────────────────────

  async recordMovement(
    itemId: string,
    itemName: string,
    kind: string,
    quantity: number,
    qtyBefore: number,
    qtyAfter: number,
    operator: string,
    opts?: {
      unitCost?: number;
      reference?: string;
      reason?: string;
      note?: string;
      batchId?: string;
    },
  ): Promise<StockMovement> {
    const id = uid();
    const unitCost = opts?.unitCost ?? 0;
    const totalCost = unitCost * quantity;
    await run(
      `INSERT INTO inventory_ledger (id, item_id, item_name, kind, quantity, quantity_before, quantity_after, unit_cost, total_cost, operator, reference, reason, note, batch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        itemId,
        itemName,
        kind,
        quantity,
        qtyBefore,
        qtyAfter,
        unitCost,
        totalCost,
        operator,
        opts?.reference || null,
        opts?.reason || null,
        opts?.note || null,
        opts?.batchId || null,
      ],
    );
    const rows = await query('SELECT * FROM inventory_ledger WHERE id = ?', [
      id,
    ]);
    return rowToMovement(rows[0]);
  },

  async getMovements(
    filter: MovementFilter = {},
  ): Promise<PaginatedResult<StockMovement>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    if (filter.itemId) {
      conditions.push('item_id = ?');
      params.push(filter.itemId);
    }
    if (filter.kind) {
      conditions.push('kind = ?');
      params.push(filter.kind);
    }
    if (filter.fromDate) {
      conditions.push('timestamp >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('timestamp <= ?');
      params.push(filter.toDate);
    }
    if (filter.operator) {
      conditions.push('operator = ?');
      params.push(filter.operator);
    }
    if (filter.batchId) {
      conditions.push('batch_id = ?');
      params.push(filter.batchId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*) as total FROM inventory_ledger ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM inventory_ledger ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToMovement), total, offset, limit };
  },

  async getMovementHistory(
    itemId: string,
    limit = 50,
  ): Promise<StockMovement[]> {
    const rows = await query(
      'SELECT * FROM inventory_ledger WHERE item_id = ? ORDER BY timestamp DESC LIMIT ?',
      [itemId, limit],
    );
    return rows.map(rowToMovement);
  },

  // ── Reporting ─────────────────────────────────────────────────────

  async getSummary(): Promise<InventorySummary> {
    const items = await query('SELECT * FROM inventory WHERE is_active = 1');
    const lowStock = await this.findBelowReorder();

    const categoryBreakdown: Record<string, { count: number; value: number }> =
      {};
    let totalValue = 0;
    let outOfStock = 0;

    for (const item of items) {
      const i = rowToItem(item);
      const val = i.stock * i.cost;
      totalValue += val;
      if (!categoryBreakdown[i.category]) {
        categoryBreakdown[i.category] = { count: 0, value: 0 };
      }
      categoryBreakdown[i.category].count++;
      categoryBreakdown[i.category].value += val;
      if (i.stock <= 0) outOfStock++;
    }

    return {
      totalItems: items.length,
      activeItems: items.length,
      totalValue,
      lowStockItems: lowStock.length,
      outOfStockItems: outOfStock,
      categoryBreakdown,
    };
  },

  async getValuation(): Promise<InventoryValuation[]> {
    const rows = await query(
      'SELECT * FROM inventory WHERE is_active = 1 AND stock > 0 ORDER BY name',
    );
    return rows.map((r: any) => ({
      itemId: r.id,
      itemName: r.name,
      stock: Number(r.stock),
      unitCost: Number(r.cost || 0),
      totalValue: Number(r.stock) * Number(r.cost || 0),
      costMethod: r.cost_method || 'fifo',
    }));
  },

  async search(query_str: string): Promise<InventoryItem[]> {
    const rows = await query(
      'SELECT * FROM inventory WHERE is_active = 1 AND (name LIKE ? OR category LIKE ?) ORDER BY name LIMIT 20',
      [`%${query_str}%`, `%${query_str}%`],
    );
    return rows.map(rowToItem);
  },

  async count(): Promise<number> {
    const rows = await query(
      'SELECT COUNT(*) as count FROM inventory WHERE is_active = 1',
    );
    return rows[0]?.count || 0;
  },

  async bulkCreate(items: CreateInventoryItemDto[]): Promise<InventoryItem[]> {
    const results: InventoryItem[] = [];
    for (const item of items) {
      results.push(await this.create(item));
    }
    return results;
  },

  async getDb(): Promise<typeof db> {
    return db;
  },
};
