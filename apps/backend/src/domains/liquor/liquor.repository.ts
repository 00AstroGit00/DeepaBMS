import { query, run, db } from '../../db';
import * as T from './liquor.types';
import { BOTTLE_TRANSITIONS } from './liquor.types';

function rowToCategory(row: any): T.LiquorCategory {
  return {
    id: row.id,
    name: row.name,
    displayOrder: Number(row.display_order || 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToLiquorBrand(row: any): T.LiquorBrand {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    manufacturer: row.manufacturer || '',
    proof: Number(row.proof || 0),
    country: row.country || '',
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToLiquorBottle(row: any): T.LiquorBottle {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    sizeMl: Number(row.size_ml),
    batchNo: row.batch_no || '',
    purchaseCost: Number(row.purchase_cost || 0),
    sellingPrice: Number(row.selling_price || 0),
    mrp: Number(row.mrp || 0),
    status: row.status,
    currentMl: Number(row.current_ml),
    initialMl: Number(row.initial_ml),
    openedAt: row.opened_at || null,
    openedBy: row.opened_by || null,
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    location: row.location || 'main',
    supplierId: row.supplier_id || null,
    supplierName: row.supplier_name || null,
    poReference: row.po_reference || null,
    isActive: Boolean(row.is_active ?? true),
    version: Number(row.version || 1),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToPegDefinition(row: any): T.PegDefinition {
  return {
    id: row.id,
    name: row.name,
    sizeMl: Number(row.size_ml),
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToPegPrice(row: any): T.PegPrice {
  return {
    id: row.id,
    brandId: row.brand_id,
    pegSizeId: row.peg_size_id,
    pegSizeMl: Number(row.peg_size_ml || row.size_ml || 0),
    tier: row.tier,
    price: Number(row.price),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToBarSale(row: any): T.BarSale {
  return {
    id: row.id,
    saleNo: row.sale_no,
    status: row.status,
    counter: row.counter || 'main',
    bartenderId: row.bartender_id || null,
    bartenderName: row.bartender_name || null,
    subtotal: Number(row.subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    discountPercent: Number(row.discount_percent || 0),
    discountReason: row.discount_reason || null,
    serviceCharge: Number(row.service_charge || 0),
    gstAmount: Number(row.gst_amount || 0),
    totAmount: Number(row.tot_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lines: [],
  };
}

function rowToBarSaleLine(row: any): T.BarSaleLine {
  return {
    id: row.id,
    saleId: row.sale_id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    pegSizeMl: Number(row.peg_size_ml),
    pegDefinitionId: row.peg_definition_id || '',
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    pourType: row.pour_type || 'regular',
    bottleId: row.bottle_id || null,
    bottleSwitchFrom: row.bottle_switch_from || null,
    status: row.status || 'open',
    notes: row.notes || null,
    createdAt: row.created_at || '',
  };
}

function rowToBottleOpening(row: any): T.BottleOpening {
  return {
    id: row.id,
    bottleId: row.bottle_id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    openedAt: row.opened_at || '',
    openedBy: row.opened_by,
    initialMl: Number(row.initial_ml),
    location: row.location || 'main',
    notes: row.notes || null,
  };
}

function rowToBottleClosing(row: any): T.BottleClosing {
  return {
    id: row.id,
    bottleId: row.bottle_id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    closedAt: row.closed_at || '',
    closedBy: row.closed_by,
    remainingMl: Number(row.remaining_ml),
    reason: row.reason,
    notes: row.notes || null,
  };
}

function rowToBottleTransfer(row: any): T.BottleTransfer {
  return {
    id: row.id,
    bottleId: row.bottle_id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    fromLocation: row.from_location,
    toLocation: row.to_location,
    transferredAt: row.transferred_at || '',
    transferredBy: row.transferred_by,
    notes: row.notes || null,
  };
}

function rowToLiquorMovement(row: any): T.LiquorMovement {
  return {
    id: row.id,
    bottleId: row.bottle_id || '',
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    kind: row.kind,
    quantityMl: Number(row.quantity_ml),
    mlBefore: Number(row.ml_before),
    mlAfter: Number(row.ml_after),
    pourType: row.pour_type || null,
    saleId: row.sale_id || null,
    saleLineId: row.sale_line_id || null,
    unitPrice: Number(row.unit_price || 0),
    totalValue: Number(row.total_value || 0),
    operator: row.operator,
    reference: row.reference || null,
    reason: row.reason || null,
    note: row.note || null,
    timestamp: row.timestamp || '',
  };
}

function rowToExciseEntry(row: any): T.ExciseRegister {
  return {
    id: row.id,
    date: row.date,
    counter: row.counter || 'main',
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    openingStockBottles: Number(row.opening_stock_bottles || 0),
    openingStockMl: Number(row.opening_stock_ml || 0),
    receivedBottles: Number(row.received_bottles || 0),
    receivedMl: Number(row.received_ml || 0),
    soldMl: Number(row.sold_ml || 0),
    soldAmount: Number(row.sold_amount || 0),
    complimentaryMl: Number(row.complimentary_ml || 0),
    breakageMl: Number(row.breakage_ml || 0),
    wastageMl: Number(row.wastage_ml || 0),
    staffMl: Number(row.staff_ml || 0),
    closingStockBottles: Number(row.closing_stock_bottles || 0),
    closingStockMl: Number(row.closing_stock_ml || 0),
    varianceMl: Number(row.variance_ml || 0),
    remarks: row.remarks || null,
    preparedBy: row.prepared_by,
    verifiedBy: row.verified_by || null,
    status: row.status || 'prepared',
    createdAt: row.created_at || '',
  };
}

function rowToPourLog(row: any): T.PourLog {
  return {
    id: row.id,
    saleLineId: row.sale_line_id,
    bottleId: row.bottle_id,
    brandId: row.brand_id,
    pegSizeMl: Number(row.peg_size_ml),
    pourType: row.pour_type,
    quantityMl: Number(row.quantity_ml),
    bartenderId: row.bartender_id || null,
    timestamp: row.timestamp || '',
  };
}

function rowToBarEvent(row: any): T.BarEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    data: row.data || null,
    createdBy: row.created_by || null,
    timestamp: row.timestamp || '',
  };
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function saleNo(): Promise<string> {
  const d = new Date();
  const yearStr = d.getFullYear().toString();
  const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `BSL-${yearStr}${monthStr}-`;
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM bar_sales WHERE sale_no LIKE ?',
    [`${prefix}%`],
  );
  const seq = (Number(rows[0]?.cnt || 0) + 1).toString().padStart(4, '0');
  return `${prefix}${seq}`;
}

function buildWhere(conditions: string[], params: any[]): string {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

function safeOrder(
  orderBy?: string,
  orderDir?: string,
): { field: string; dir: string } {
  const allowedOrders: Record<string, string> = {
    name: 'name',
    created_at: 'created_at',
    updated_at: 'updated_at',
    status: 'status',
    sale_no: 'sale_no',
    total_amount: 'total_amount',
    subtotal: 'subtotal',
    brand_name: 'brand_name',
    category_name: 'category_name',
    size_ml: 'size_ml',
    current_ml: 'current_ml',
    location: 'location',
    timestamp: 'timestamp',
    date: 'date',
    kind: 'kind',
    quantity_ml: 'quantity_ml',
  };
  const field = allowedOrders[orderBy || ''] || 'created_at';
  const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
  return { field, dir };
}

function validateTransition(from: T.BottleStatus, to: T.BottleStatus): boolean {
  const allowed = BOTTLE_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

export const LiquorRepository = {
  // ── Categories ────────────────────────────────────────────────────────

  async findAllCategories(
    filter?: T.BrandFilter,
  ): Promise<T.PaginatedResult<T.LiquorCategory>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter?.search) {
      conditions.push('name LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM liquor_categories ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM liquor_categories ${where} ORDER BY display_order ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToCategory), total, offset, limit };
  },

  async findCategoryById(id: string): Promise<T.LiquorCategory | null> {
    const rows = await query('SELECT * FROM liquor_categories WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToCategory(rows[0]) : null;
  },

  async createCategory(dto: T.CreateCategoryDto): Promise<T.LiquorCategory> {
    const id = uid('lcc');
    await run(
      'INSERT INTO liquor_categories (id, name, display_order, is_active) VALUES (?, ?, ?, 1)',
      [id, dto.name, dto.displayOrder ?? 0],
    );
    const rows = await query('SELECT * FROM liquor_categories WHERE id = ?', [
      id,
    ]);
    return rowToCategory(rows[0]);
  },

  async updateCategory(
    id: string,
    changes: Partial<T.CreateCategoryDto>,
  ): Promise<T.LiquorCategory> {
    const existing = await this.findCategoryById(id);
    if (!existing) throw new Error(`Category not found: ${id}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.displayOrder !== undefined) {
      sets.push('display_order = ?');
      params.push(changes.displayOrder);
    }

    if (params.length === 0) return existing;
    await run(`UPDATE liquor_categories SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM liquor_categories WHERE id = ?', [
      id,
    ]);
    return rowToCategory(rows[0]);
  },

  async archiveCategory(id: string): Promise<void> {
    await run('UPDATE liquor_categories SET is_active = 0 WHERE id = ?', [id]);
  },

  // ── Brands ───────────────────────────────────────────────────────────

  async findAllBrands(
    filter?: T.BrandFilter,
  ): Promise<T.PaginatedResult<T.LiquorBrand>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.categoryId) {
      conditions.push('lb.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter?.isActive !== undefined) {
      conditions.push('lb.is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter?.search) {
      conditions.push('lb.name LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM liquor_brands lb ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT lb.*, lc.name as category_name
       FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       ${where}
       ORDER BY lb.name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToLiquorBrand), total, offset, limit };
  },

  async findBrandById(id: string): Promise<T.LiquorBrand | null> {
    const rows = await query(
      `SELECT lb.*, lc.name as category_name
       FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       WHERE lb.id = ?`,
      [id],
    );
    return rows.length ? rowToLiquorBrand(rows[0]) : null;
  },

  async findBrandsByCategory(categoryId: string): Promise<T.LiquorBrand[]> {
    const rows = await query(
      `SELECT lb.*, lc.name as category_name
       FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       WHERE lb.category_id = ? AND lb.is_active = 1
       ORDER BY lb.name`,
      [categoryId],
    );
    return rows.map(rowToLiquorBrand);
  },

  async searchBrands(query_str: string): Promise<T.LiquorBrand[]> {
    const rows = await query(
      `SELECT lb.*, lc.name as category_name
       FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       WHERE lb.is_active = 1 AND lb.name LIKE ?
       ORDER BY lb.name LIMIT 20`,
      [`%${query_str}%`],
    );
    return rows.map(rowToLiquorBrand);
  },

  async createBrand(dto: T.CreateBrandDto): Promise<T.LiquorBrand> {
    const cat = await this.findCategoryById(dto.categoryId);
    if (!cat) throw new Error(`Category not found: ${dto.categoryId}`);

    const id = uid('lcb');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO liquor_brands (id, name, category_id, manufacturer, proof, country, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        dto.name,
        dto.categoryId,
        dto.manufacturer,
        dto.proof,
        dto.country,
        now,
        now,
      ],
    );
    const rows = await query(
      `SELECT lb.*, lc.name as category_name
       FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       WHERE lb.id = ?`,
      [id],
    );
    return rowToLiquorBrand(rows[0]);
  },

  async updateBrand(
    id: string,
    changes: Partial<T.CreateBrandDto>,
  ): Promise<T.LiquorBrand> {
    const existing = await this.findBrandById(id);
    if (!existing) throw new Error(`Brand not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.categoryId !== undefined) {
      sets.push('category_id = ?');
      params.push(changes.categoryId);
    }
    if (changes.manufacturer !== undefined) {
      sets.push('manufacturer = ?');
      params.push(changes.manufacturer);
    }
    if (changes.proof !== undefined) {
      sets.push('proof = ?');
      params.push(changes.proof);
    }
    if (changes.country !== undefined) {
      sets.push('country = ?');
      params.push(changes.country);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE liquor_brands SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findBrandById(id))!;
  },

  async archiveBrand(id: string): Promise<void> {
    await run(
      'UPDATE liquor_brands SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  // ── Bottles ────────────────────────────────────────────────────────

  async findAllBottles(
    filter: T.BottleFilter = {},
  ): Promise<T.PaginatedResult<T.LiquorBottle>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const { field, dir } = safeOrder(filter.orderBy, filter.orderDir);

    if (filter.brandId) {
      conditions.push('lb.brand_id = ?');
      params.push(filter.brandId);
    }
    if (filter.categoryId) {
      conditions.push('lbr.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.status) {
      conditions.push('lb.status = ?');
      params.push(filter.status);
    }
    if (filter.location) {
      conditions.push('lb.location = ?');
      params.push(filter.location);
    }
    if (filter.supplierId) {
      conditions.push('lb.supplier_id = ?');
      params.push(filter.supplierId);
    }
    if (filter.isActive !== undefined) {
      conditions.push('lb.is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter.search) {
      conditions.push('(lbr.name LIKE ? OR lb.batch_no LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const join = `FROM liquor_bottles lb
      LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
      LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id`;

    const countResult = await query(
      `SELECT COUNT(*) as total ${join} ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       ${join} ${where}
       ORDER BY ${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToLiquorBottle), total, offset, limit };
  },

  async findBottleById(id: string): Promise<T.LiquorBottle | null> {
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       FROM liquor_bottles lb
       LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       WHERE lb.id = ?`,
      [id],
    );
    return rows.length ? rowToLiquorBottle(rows[0]) : null;
  },

  async findBottlesByBrand(brandId: string): Promise<T.LiquorBottle[]> {
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       FROM liquor_bottles lb
       LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       WHERE lb.brand_id = ?
       ORDER BY lb.created_at DESC`,
      [brandId],
    );
    return rows.map(rowToLiquorBottle);
  },

  async findActiveBottles(location?: string): Promise<T.LiquorBottle[]> {
    const conditions: string[] = [
      "lb.status IN ('opened', 'active', 'partially_consumed')",
    ];
    const params: any[] = [];
    if (location) {
      conditions.push('lb.location = ?');
      params.push(location);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       FROM liquor_bottles lb
       LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       ${where}
       ORDER BY lb.current_ml DESC`,
      params,
    );
    return rows.map(rowToLiquorBottle);
  },

  async findBottlesByStatus(status: T.BottleStatus): Promise<T.LiquorBottle[]> {
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       FROM liquor_bottles lb
       LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       WHERE lb.status = ?
       ORDER BY lb.updated_at DESC`,
      [status],
    );
    return rows.map(rowToLiquorBottle);
  },

  async findBottlesByLocation(location: string): Promise<T.LiquorBottle[]> {
    const rows = await query(
      `SELECT lb.*, lbr.name as brand_name, lbr.category_id as category_id, lc.name as category_name
       FROM liquor_bottles lb
       LEFT JOIN liquor_brands lbr ON lb.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       WHERE lb.location = ?
       ORDER BY lb.status, lb.created_at`,
      [location],
    );
    return rows.map(rowToLiquorBottle);
  },

  async countBottlesByBrand(brandId: string): Promise<Record<string, number>> {
    const rows = await query(
      'SELECT status, COUNT(*) as cnt FROM liquor_bottles WHERE brand_id = ? GROUP BY status',
      [brandId],
    );
    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.status] = Number(r.cnt);
    }
    return result;
  },

  async getBottleSummary(): Promise<T.BottleSummary> {
    const rows = await query(
      'SELECT * FROM liquor_bottles WHERE is_active = 1',
    );
    let totalBottles = 0;
    let totalMl = 0;
    let activeBottles = 0;
    let openBottles = 0;
    let emptyBottles = 0;
    let brokenBottles = 0;
    let totalValue = 0;
    let totalPurchaseCost = 0;

    for (const r of rows) {
      totalBottles++;
      totalMl += Number(r.current_ml || 0);
      const status: string = r.status;
      if (
        status === 'opened' ||
        status === 'active' ||
        status === 'partially_consumed'
      )
        activeBottles++;
      if (status === 'opened') openBottles++;
      if (status === 'empty') emptyBottles++;
      if (status === 'broken') brokenBottles++;
      totalValue += Number(r.selling_price || 0);
      totalPurchaseCost += Number(r.purchase_cost || 0);
    }

    return {
      totalBottles,
      totalMl,
      activeBottles,
      openBottles,
      emptyBottles,
      brokenBottles,
      totalValue,
      totalPurchaseCost,
    };
  },

  async createBottle(dto: T.CreateBottleDto): Promise<T.LiquorBottle> {
    const brand = await this.findBrandById(dto.brandId);
    if (!brand) throw new Error(`Brand not found: ${dto.brandId}`);

    const id = uid('lbt');
    const now = new Date().toISOString();
    const sizeMl = dto.sizeMl;

    await run(
      `INSERT INTO liquor_bottles (id, brand_id, size_ml, batch_no, purchase_cost, selling_price, mrp, status, current_ml, initial_ml, location, supplier_id, supplier_name, po_reference, is_active, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'purchased', ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
      [
        id,
        dto.brandId,
        sizeMl,
        dto.batchNo || '',
        dto.purchaseCost,
        dto.sellingPrice,
        dto.mrp,
        sizeMl,
        sizeMl,
        dto.location || 'main',
        dto.supplierId || null,
        dto.supplierName || null,
        dto.poReference || null,
        now,
        now,
      ],
    );

    await this.recordBarEvent(
      'BOTTLE_PURCHASED',
      'liquor_bottle',
      id,
      JSON.stringify(dto),
      null,
    );
    return (await this.findBottleById(id))!;
  },

  async updateBottle(
    id: string,
    changes: Partial<T.CreateBottleDto & { status: T.BottleStatus }>,
  ): Promise<T.LiquorBottle> {
    const existing = await this.findBottleById(id);
    if (!existing) throw new Error(`Bottle not found: ${id}`);

    const sets: string[] = ['updated_at = ?', 'version = version + 1'];
    const params: any[] = [new Date().toISOString()];

    if (changes.brandId !== undefined) {
      sets.push('brand_id = ?');
      params.push(changes.brandId);
    }
    if (changes.sizeMl !== undefined) {
      sets.push('size_ml = ?');
      params.push(changes.sizeMl);
    }
    if (changes.batchNo !== undefined) {
      sets.push('batch_no = ?');
      params.push(changes.batchNo);
    }
    if (changes.purchaseCost !== undefined) {
      sets.push('purchase_cost = ?');
      params.push(changes.purchaseCost);
    }
    if (changes.sellingPrice !== undefined) {
      sets.push('selling_price = ?');
      params.push(changes.sellingPrice);
    }
    if (changes.mrp !== undefined) {
      sets.push('mrp = ?');
      params.push(changes.mrp);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }

    if (params.length === 1) return existing;

    const result = await run(
      `UPDATE liquor_bottles SET ${sets.join(', ')} WHERE id = ? AND version = ?`,
      [...params, id, existing.version],
    );
    if (result.changes === 0)
      throw new Error('Concurrent modification detected');

    return (await this.findBottleById(id))!;
  },

  async adjustBottleMl(id: string, deltaMl: number): Promise<T.LiquorBottle> {
    const existing = await this.findBottleById(id);
    if (!existing) throw new Error(`Bottle not found: ${id}`);

    const newMl = existing.currentMl + deltaMl;
    if (newMl < 0)
      throw new Error(
        `Bottle underflow: ${existing.brandName} has ${existing.currentMl}ml, cannot remove ${Math.abs(deltaMl)}ml`,
      );
    if (newMl > existing.initialMl)
      throw new Error(
        `Bottle overflow: ${existing.brandName} has max ${existing.initialMl}ml`,
      );

    const now = new Date().toISOString();
    const result = await run(
      'UPDATE liquor_bottles SET current_ml = ?, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?',
      [newMl, now, id, existing.version],
    );
    if (result.changes === 0)
      throw new Error('Concurrent modification detected');

    return (await this.findBottleById(id))!;
  },

  async changeBottleStatus(
    id: string,
    newStatus: T.BottleStatus,
    metadata?: { updatedBy?: string; notes?: string },
  ): Promise<T.LiquorBottle> {
    const existing = await this.findBottleById(id);
    if (!existing) throw new Error(`Bottle not found: ${id}`);

    if (!validateTransition(existing.status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${existing.status} -> ${newStatus}`,
      );
    }

    const sets: string[] = [
      'status = ?',
      'updated_at = ?',
      'version = version + 1',
    ];
    const params: any[] = [newStatus, new Date().toISOString()];

    if (newStatus === 'opened' || newStatus === 'active') {
      sets.push('opened_at = ?');
      params.push(new Date().toISOString());
      if (metadata?.updatedBy) {
        sets.push('opened_by = ?');
        params.push(metadata.updatedBy);
      }
    }
    if (
      newStatus === 'empty' ||
      newStatus === 'broken' ||
      newStatus === 'written_off' ||
      newStatus === 'archived'
    ) {
      sets.push('closed_at = ?');
      params.push(new Date().toISOString());
      if (metadata?.updatedBy) {
        sets.push('closed_by = ?');
        params.push(metadata.updatedBy);
      }
    }

    const result = await run(
      `UPDATE liquor_bottles SET ${sets.join(', ')} WHERE id = ? AND version = ?`,
      [...params, id, existing.version],
    );
    if (result.changes === 0)
      throw new Error('Concurrent modification detected');

    const eventMap: Record<string, T.BarEventType> = {
      purchased: 'BOTTLE_PURCHASED',
      received: 'BOTTLE_RECEIVED',
      stored: 'BOTTLE_STORED',
      transferred: 'BOTTLE_TRANSFERRED',
      opened: 'BOTTLE_OPENED',
      active: 'BOTTLE_ACTIVATED',
      partially_consumed: 'BOTTLE_CONSUMED',
      empty: 'BOTTLE_EMPTIED',
      broken: 'BOTTLE_BROKEN',
      returned: 'BOTTLE_RETURNED',
      written_off: 'BOTTLE_WRITTEN_OFF',
      archived: 'BOTTLE_ARCHIVED',
    };
    const eventType = eventMap[newStatus] || 'STOCK_ADJUSTMENT';
    await this.recordBarEvent(
      eventType,
      'liquor_bottle',
      id,
      JSON.stringify({ from: existing.status, to: newStatus }),
      metadata?.updatedBy || null,
    );

    return (await this.findBottleById(id))!;
  },

  async archiveBottle(id: string): Promise<void> {
    const existing = await this.findBottleById(id);
    if (!existing) throw new Error(`Bottle not found: ${id}`);
    await run(
      'UPDATE liquor_bottles SET is_active = 0, updated_at = ?, version = version + 1 WHERE id = ? AND version = ?',
      [new Date().toISOString(), id, existing.version],
    );
  },

  async bulkCreateBottles(
    items: T.CreateBottleDto[],
  ): Promise<T.LiquorBottle[]> {
    const results: T.LiquorBottle[] = [];
    for (const item of items) {
      results.push(await this.createBottle(item));
    }
    return results;
  },

  // ── Peg Definitions ─────────────────────────────────────────────────

  async findAllPegDefinitions(): Promise<T.PegDefinition[]> {
    const rows = await query(
      'SELECT * FROM peg_definitions WHERE is_active = 1 ORDER BY size_ml ASC',
    );
    return rows.map(rowToPegDefinition);
  },

  async findPegDefinitionById(id: string): Promise<T.PegDefinition | null> {
    const rows = await query('SELECT * FROM peg_definitions WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToPegDefinition(rows[0]) : null;
  },

  async findPegDefinitionBySize(ml: number): Promise<T.PegDefinition | null> {
    const rows = await query(
      'SELECT * FROM peg_definitions WHERE size_ml = ? AND is_active = 1',
      [ml],
    );
    return rows.length ? rowToPegDefinition(rows[0]) : null;
  },

  async createPegDefinition(
    dto: T.CreatePegDefinitionDto,
  ): Promise<T.PegDefinition> {
    const id = uid('peg');
    await run(
      'INSERT INTO peg_definitions (id, name, size_ml, is_active) VALUES (?, ?, ?, 1)',
      [id, dto.name, dto.sizeMl],
    );
    const rows = await query('SELECT * FROM peg_definitions WHERE id = ?', [
      id,
    ]);
    return rowToPegDefinition(rows[0]);
  },

  async updatePegDefinition(
    id: string,
    changes: Partial<T.CreatePegDefinitionDto>,
  ): Promise<T.PegDefinition> {
    const existing = await this.findPegDefinitionById(id);
    if (!existing) throw new Error(`Peg definition not found: ${id}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.sizeMl !== undefined) {
      sets.push('size_ml = ?');
      params.push(changes.sizeMl);
    }

    if (params.length === 0) return existing;
    await run(`UPDATE peg_definitions SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM peg_definitions WHERE id = ?', [
      id,
    ]);
    return rowToPegDefinition(rows[0]);
  },

  async archivePegDefinition(id: string): Promise<void> {
    await run('UPDATE peg_definitions SET is_active = 0 WHERE id = ?', [id]);
  },

  // ── Peg Prices ─────────────────────────────────────────────────────

  async findAllPegPrices(brandId?: string): Promise<T.PegPrice[]> {
    const conditions: string[] = ['pp.is_active = 1'];
    const params: any[] = [];
    if (brandId) {
      conditions.push('pp.brand_id = ?');
      params.push(brandId);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT pp.*, pd.size_ml as peg_size_ml
       FROM peg_prices pp
       LEFT JOIN peg_definitions pd ON pp.peg_size_id = pd.id
       ${where}
       ORDER BY pp.brand_id, pd.size_ml, pp.tier`,
      params,
    );
    return rows.map(rowToPegPrice);
  },

  async findPegPrice(
    brandId: string,
    pegSizeId: string,
    tier?: T.PricingTier,
  ): Promise<T.PegPrice | null> {
    const conditions: string[] = ['pp.brand_id = ?', 'pp.peg_size_id = ?'];
    const params: any[] = [brandId, pegSizeId];
    if (tier) {
      conditions.push('pp.tier = ?');
      params.push(tier);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT pp.*, pd.size_ml as peg_size_ml
       FROM peg_prices pp
       LEFT JOIN peg_definitions pd ON pp.peg_size_id = pd.id
       ${where}
       ORDER BY pp.is_active DESC LIMIT 1`,
      params,
    );
    return rows.length ? rowToPegPrice(rows[0]) : null;
  },

  async getPriceForPeg(
    brandId: string,
    pegSizeMl: number,
    tier?: T.PricingTier,
  ): Promise<number | null> {
    const rows = await query(
      `SELECT pp.price
       FROM peg_prices pp
       JOIN peg_definitions pd ON pp.peg_size_id = pd.id
       WHERE pp.brand_id = ? AND pd.size_ml = ? AND pp.is_active = 1
       ${tier ? 'AND pp.tier = ?' : "AND pp.tier = 'bar_price'"}
       ORDER BY pp.is_active DESC LIMIT 1`,
      tier ? [brandId, pegSizeMl, tier] : [brandId, pegSizeMl],
    );
    return rows.length ? Number(rows[0].price) : null;
  },

  async createPegPrice(dto: T.CreatePegPriceDto): Promise<T.PegPrice> {
    const id = uid('ppr');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO peg_prices (id, brand_id, peg_size_id, tier, price, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, dto.brandId, dto.pegSizeId, dto.tier, dto.price, now, now],
    );
    const rows = await query(
      `SELECT pp.*, pd.size_ml as peg_size_ml
       FROM peg_prices pp
       LEFT JOIN peg_definitions pd ON pp.peg_size_id = pd.id
       WHERE pp.id = ?`,
      [id],
    );
    return rowToPegPrice(rows[0]);
  },

  async updatePegPrice(
    id: string,
    changes: Partial<T.CreatePegPriceDto>,
  ): Promise<T.PegPrice> {
    const existing = await query('SELECT * FROM peg_prices WHERE id = ?', [id]);
    if (!existing.length) throw new Error(`Peg price not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.brandId !== undefined) {
      sets.push('brand_id = ?');
      params.push(changes.brandId);
    }
    if (changes.pegSizeId !== undefined) {
      sets.push('peg_size_id = ?');
      params.push(changes.pegSizeId);
    }
    if (changes.tier !== undefined) {
      sets.push('tier = ?');
      params.push(changes.tier);
    }
    if (changes.price !== undefined) {
      sets.push('price = ?');
      params.push(changes.price);
    }

    if (params.length === 1) return rowToPegPrice(existing[0]);
    await run(`UPDATE peg_prices SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query(
      `SELECT pp.*, pd.size_ml as peg_size_ml
       FROM peg_prices pp
       LEFT JOIN peg_definitions pd ON pp.peg_size_id = pd.id
       WHERE pp.id = ?`,
      [id],
    );
    return rowToPegPrice(rows[0]);
  },

  async archivePegPrice(id: string): Promise<void> {
    await run(
      'UPDATE peg_prices SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  // ── Bar Sales ────────────────────────────────────────────────────────

  async findAllSales(
    filter: T.BarSaleFilter = {},
  ): Promise<T.PaginatedResult<T.BarSale>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const { field, dir } = safeOrder(filter.orderBy, filter.orderDir);

    if (filter.status) {
      conditions.push('bs.status = ?');
      params.push(filter.status);
    }
    if (filter.counter) {
      conditions.push('bs.counter = ?');
      params.push(filter.counter);
    }
    if (filter.bartenderId) {
      conditions.push('bs.bartender_id = ?');
      params.push(filter.bartenderId);
    }
    if (filter.fromDate) {
      conditions.push('bs.created_at >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('bs.created_at <= ?');
      params.push(filter.toDate);
    }
    if (filter.search) {
      conditions.push('bs.sale_no LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM bar_sales bs ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM bar_sales bs ${where} ORDER BY ${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToBarSale), total, offset, limit };
  },

  async findSaleById(id: string): Promise<T.BarSale | null> {
    const rows = await query('SELECT * FROM bar_sales WHERE id = ?', [id]);
    if (!rows.length) return null;
    const sale = rowToBarSale(rows[0]);
    sale.lines = await query(
      'SELECT * FROM bar_sale_lines WHERE sale_id = ? ORDER BY created_at ASC',
      [id],
    ).then((r) => r.map(rowToBarSaleLine));
    return sale;
  },

  async findSaleByNo(saleNoStr: string): Promise<T.BarSale | null> {
    const rows = await query('SELECT * FROM bar_sales WHERE sale_no = ?', [
      saleNoStr,
    ]);
    if (!rows.length) return null;
    const sale = rowToBarSale(rows[0]);
    sale.lines = await query(
      'SELECT * FROM bar_sale_lines WHERE sale_id = ? ORDER BY created_at ASC',
      [sale.id],
    ).then((r) => r.map(rowToBarSaleLine));
    return sale;
  },

  async createSale(dto: T.CreateBarSaleDto): Promise<T.BarSale> {
    const id = uid('bsl');
    const now = new Date().toISOString();
    const no = await saleNo();

    await run(
      `INSERT INTO bar_sales (id, sale_no, status, counter, bartender_id, bartender_name, subtotal, discount_amount, discount_percent, discount_reason, service_charge, gst_amount, tot_amount, total_amount, notes, created_at, updated_at)
       VALUES (?, ?, 'draft', ?, ?, ?, 0, 0, 0, NULL, 0, 0, 0, 0, ?, ?, ?)`,
      [
        id,
        no,
        dto.counter,
        dto.bartenderId || null,
        dto.bartenderName || null,
        dto.notes || null,
        now,
        now,
      ],
    );

    for (const line of dto.lines) {
      const lineId = uid('bsl');
      const lineTotal = line.quantity * line.unitPrice;
      const brandRows = await query(
        'SELECT name FROM liquor_brands WHERE id = ?',
        [line.brandId],
      );
      const brandName = brandRows.length ? brandRows[0].name : '';

      await run(
        `INSERT INTO bar_sale_lines (id, sale_id, brand_id, brand_name, peg_size_ml, peg_definition_id, quantity, unit_price, line_total, pour_type, bottle_id, bottle_switch_from, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'open', ?, ?)`,
        [
          lineId,
          id,
          line.brandId,
          brandName,
          line.pegSizeMl,
          line.pegDefinitionId || null,
          line.quantity,
          line.unitPrice,
          lineTotal,
          line.pourType || 'regular',
          line.notes || null,
          now,
        ],
      );
    }

    await this.recalculateSale(id);
    await this.recordBarEvent(
      'BAR_SALE_CREATED',
      'bar_sale',
      id,
      JSON.stringify(dto),
      null,
    );
    return (await this.findSaleById(id))!;
  },

  async updateSaleStatus(
    id: string,
    status: T.BarSaleStatus,
  ): Promise<T.BarSale> {
    const existing = await this.findSaleById(id);
    if (!existing) throw new Error(`Sale not found: ${id}`);

    await run('UPDATE bar_sales SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      new Date().toISOString(),
      id,
    ]);

    const eventMap: Record<string, T.BarEventType> = {
      completed: 'BAR_SALE_COMPLETED',
      cancelled: 'BAR_SALE_CANCELLED',
      refunded: 'BAR_SALE_REFUNDED',
    };
    const eventType = eventMap[status];
    if (eventType) {
      await this.recordBarEvent(
        eventType,
        'bar_sale',
        id,
        JSON.stringify({ from: existing.status, to: status }),
        null,
      );
    }
    return (await this.findSaleById(id))!;
  },

  async addSaleLine(
    saleId: string,
    dto: T.CreateBarSaleLineDto,
  ): Promise<T.BarSaleLine> {
    const id = uid('bsl');
    const now = new Date().toISOString();
    const brandRows = await query(
      'SELECT name FROM liquor_brands WHERE id = ?',
      [dto.brandId],
    );
    const brandName = brandRows.length ? brandRows[0].name : '';
    const lineTotal = dto.quantity * dto.unitPrice;

    await run(
      `INSERT INTO bar_sale_lines (id, sale_id, brand_id, brand_name, peg_size_ml, peg_definition_id, quantity, unit_price, line_total, pour_type, bottle_id, bottle_switch_from, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'open', ?, ?)`,
      [
        id,
        saleId,
        dto.brandId,
        brandName,
        dto.pegSizeMl,
        dto.pegDefinitionId || null,
        dto.quantity,
        dto.unitPrice,
        lineTotal,
        dto.pourType || 'regular',
        dto.bottleId || null,
        dto.notes || null,
        now,
      ],
    );

    await this.recalculateSale(saleId);
    const rows = await query('SELECT * FROM bar_sale_lines WHERE id = ?', [id]);
    return rowToBarSaleLine(rows[0]);
  },

  async updateSaleLine(
    lineId: string,
    changes: Partial<T.CreateBarSaleLineDto & { status: T.BarSaleLineStatus }>,
  ): Promise<T.BarSaleLine> {
    const existing = await query('SELECT * FROM bar_sale_lines WHERE id = ?', [
      lineId,
    ]);
    if (!existing.length) throw new Error(`Sale line not found: ${lineId}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (changes.quantity !== undefined) {
      sets.push('quantity = ?');
      params.push(changes.quantity);
      const unitPrice = Number(existing[0].unit_price);
      sets.push('line_total = ?');
      params.push(unitPrice * changes.quantity);
    }
    if (changes.unitPrice !== undefined) {
      sets.push('unit_price = ?');
      params.push(changes.unitPrice);
      const quantity = Number(existing[0].quantity);
      sets.push('line_total = ?');
      params.push(changes.unitPrice * quantity);
    }
    if (changes.brandId !== undefined) {
      sets.push('brand_id = ?');
      params.push(changes.brandId);
    }
    if (changes.pegSizeMl !== undefined) {
      sets.push('peg_size_ml = ?');
      params.push(changes.pegSizeMl);
    }
    if (changes.pegDefinitionId !== undefined) {
      sets.push('peg_definition_id = ?');
      params.push(changes.pegDefinitionId);
    }
    if (changes.pourType !== undefined) {
      sets.push('pour_type = ?');
      params.push(changes.pourType);
    }
    if (changes.bottleId !== undefined) {
      sets.push('bottle_id = ?');
      params.push(changes.bottleId);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }

    if (params.length) {
      await run(`UPDATE bar_sale_lines SET ${sets.join(', ')} WHERE id = ?`, [
        ...params,
        lineId,
      ]);
      await this.recalculateSale(existing[0].sale_id);
    }

    const rows = await query('SELECT * FROM bar_sale_lines WHERE id = ?', [
      lineId,
    ]);
    return rowToBarSaleLine(rows[0]);
  },

  async removeSaleLine(lineId: string): Promise<void> {
    const existing = await query('SELECT * FROM bar_sale_lines WHERE id = ?', [
      lineId,
    ]);
    if (!existing.length) throw new Error(`Sale line not found: ${lineId}`);
    const saleId = existing[0].sale_id;
    await run('DELETE FROM bar_sale_lines WHERE id = ?', [lineId]);
    await this.recalculateSale(saleId);
  },

  async cancelSaleLinesBySaleId(saleId: string): Promise<void> {
    await run(
      "UPDATE bar_sale_lines SET status = 'cancelled' WHERE sale_id = ? AND status != 'cancelled'",
      [saleId],
    );
    await this.recalculateSale(saleId);
  },

  async recalculateSale(saleId: string): Promise<void> {
    const lines = await query(
      "SELECT * FROM bar_sale_lines WHERE sale_id = ? AND status != 'cancelled'",
      [saleId],
    );
    const subtotal = lines.reduce(
      (sum: number, l: any) => sum + Number(l.line_total || 0),
      0,
    );
    const sale = await query('SELECT * FROM bar_sales WHERE id = ?', [saleId]);
    if (!sale.length) return;

    const s = sale[0];
    const discountPercent = Number(s.discount_percent || 0);
    const discountAmount =
      discountPercent > 0
        ? subtotal * (discountPercent / 100)
        : Number(s.discount_amount || 0);
    const serviceCharge = Number(s.service_charge || 0);
    const gstAmount = Number(s.gst_amount || 0);
    const totAmount = subtotal - discountAmount + serviceCharge;
    const totalAmount = totAmount + gstAmount;

    await run(
      `UPDATE bar_sales SET subtotal = ?, discount_amount = ?, service_charge = ?, gst_amount = ?, tot_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?`,
      [
        subtotal,
        discountAmount,
        serviceCharge,
        gstAmount,
        totAmount,
        totalAmount,
        new Date().toISOString(),
        saleId,
      ],
    );
  },

  async searchSales(query_str: string): Promise<T.BarSale[]> {
    const rows = await query(
      'SELECT * FROM bar_sales WHERE sale_no LIKE ? OR notes LIKE ? ORDER BY created_at DESC LIMIT 20',
      [`%${query_str}%`, `%${query_str}%`],
    );
    return rows.map(rowToBarSale);
  },

  // ── Bottle Operations ──────────────────────────────────────────────

  async recordBottleOpening(dto: T.OpenBottleDto): Promise<T.BottleOpening> {
    const bottle = await this.findBottleById(dto.bottleId);
    if (!bottle) throw new Error(`Bottle not found: ${dto.bottleId}`);

    const id = uid('bop');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO bottle_openings (id, bottle_id, brand_id, opened_at, opened_by, initial_ml, location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.bottleId,
        bottle.brandId,
        now,
        dto.openedBy,
        bottle.initialMl,
        dto.location || 'main',
        dto.notes || null,
      ],
    );

    await this.changeBottleStatus(dto.bottleId, 'opened', {
      updatedBy: dto.openedBy,
      notes: dto.notes,
    });
    const rows = await query(
      `SELECT bo.*, lbr.name as brand_name
       FROM bottle_openings bo
       LEFT JOIN liquor_brands lbr ON bo.brand_id = lbr.id
       WHERE bo.id = ?`,
      [id],
    );
    return rowToBottleOpening(rows[0]);
  },

  async recordBottleClosing(dto: T.CloseBottleDto): Promise<T.BottleClosing> {
    const bottle = await this.findBottleById(dto.bottleId);
    if (!bottle) throw new Error(`Bottle not found: ${dto.bottleId}`);

    const id = uid('bcl');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO bottle_closings (id, bottle_id, brand_id, closed_at, closed_by, remaining_ml, reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.bottleId,
        bottle.brandId,
        now,
        dto.closedBy,
        dto.remainingMl,
        dto.reason,
        dto.notes || null,
      ],
    );

    const statusMap: Record<string, T.BottleStatus> = {
      empty: 'empty',
      broken: 'broken',
      returned: 'returned',
      written_off: 'written_off',
      archived: 'archived',
      transfer: 'transferred',
    };
    const newStatus = statusMap[dto.reason] || 'written_off';
    await this.changeBottleStatus(dto.bottleId, newStatus, {
      updatedBy: dto.closedBy,
      notes: dto.notes,
    });
    const rows = await query(
      `SELECT bc.*, lbr.name as brand_name
       FROM bottle_closings bc
       LEFT JOIN liquor_brands lbr ON bc.brand_id = lbr.id
       WHERE bc.id = ?`,
      [id],
    );
    return rowToBottleClosing(rows[0]);
  },

  async recordBottleTransfer(
    dto: T.TransferBottleDto,
  ): Promise<T.BottleTransfer> {
    const bottle = await this.findBottleById(dto.bottleId);
    if (!bottle) throw new Error(`Bottle not found: ${dto.bottleId}`);

    const id = uid('btr');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO bottle_transfers (id, bottle_id, brand_id, from_location, to_location, transferred_at, transferred_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.bottleId,
        bottle.brandId,
        bottle.location,
        dto.toLocation,
        now,
        dto.transferredBy,
        dto.notes || null,
      ],
    );

    await run(
      'UPDATE liquor_bottles SET location = ?, updated_at = ?, version = version + 1 WHERE id = ?',
      [dto.toLocation, now, dto.bottleId],
    );

    await this.recordBarEvent(
      'BOTTLE_TRANSFERRED',
      'liquor_bottle',
      dto.bottleId,
      JSON.stringify({ from: bottle.location, to: dto.toLocation }),
      dto.transferredBy,
    );

    const rows = await query(
      `SELECT bt.*, lbr.name as brand_name
       FROM bottle_transfers bt
       LEFT JOIN liquor_brands lbr ON bt.brand_id = lbr.id
       WHERE bt.id = ?`,
      [id],
    );
    return rowToBottleTransfer(rows[0]);
  },

  async findOpeningsByBottle(bottleId: string): Promise<T.BottleOpening[]> {
    const rows = await query(
      `SELECT bo.*, lbr.name as brand_name
       FROM bottle_openings bo
       LEFT JOIN liquor_brands lbr ON bo.brand_id = lbr.id
       WHERE bo.bottle_id = ?
       ORDER BY bo.opened_at DESC`,
      [bottleId],
    );
    return rows.map(rowToBottleOpening);
  },

  async findClosingsByBottle(bottleId: string): Promise<T.BottleClosing[]> {
    const rows = await query(
      `SELECT bc.*, lbr.name as brand_name
       FROM bottle_closings bc
       LEFT JOIN liquor_brands lbr ON bc.brand_id = lbr.id
       WHERE bc.bottle_id = ?
       ORDER BY bc.closed_at DESC`,
      [bottleId],
    );
    return rows.map(rowToBottleClosing);
  },

  async findTransfersByBottle(bottleId: string): Promise<T.BottleTransfer[]> {
    const rows = await query(
      `SELECT bt.*, lbr.name as brand_name
       FROM bottle_transfers bt
       LEFT JOIN liquor_brands lbr ON bt.brand_id = lbr.id
       WHERE bt.bottle_id = ?
       ORDER BY bt.transferred_at DESC`,
      [bottleId],
    );
    return rows.map(rowToBottleTransfer);
  },

  // ── Liquor Movements (Ledger) ──────────────────────────────────────

  async recordMovement(dto: {
    bottleId?: string;
    brandId: string;
    brandName: string;
    kind: string;
    quantityMl: number;
    mlBefore: number;
    mlAfter: number;
    operator: string;
    pourType?: T.PourType;
    saleId?: string;
    saleLineId?: string;
    unitPrice?: number;
    reference?: string;
    reason?: string;
    note?: string;
  }): Promise<T.LiquorMovement> {
    const id = uid('lmv');
    const unitPrice = dto.unitPrice ?? 0;
    const totalValue = unitPrice * dto.quantityMl;
    await run(
      `INSERT INTO liquor_movements (id, bottle_id, brand_id, brand_name, kind, quantity_ml, ml_before, ml_after, pour_type, sale_id, sale_line_id, unit_price, total_value, operator, reference, reason, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.bottleId || null,
        dto.brandId,
        dto.brandName,
        dto.kind,
        dto.quantityMl,
        dto.mlBefore,
        dto.mlAfter,
        dto.pourType || null,
        dto.saleId || null,
        dto.saleLineId || null,
        unitPrice,
        totalValue,
        dto.operator,
        dto.reference || null,
        dto.reason || null,
        dto.note || null,
      ],
    );
    const rows = await query('SELECT * FROM liquor_movements WHERE id = ?', [
      id,
    ]);
    return rowToLiquorMovement(rows[0]);
  },

  async findMovements(
    filter: T.MovementFilter = {},
  ): Promise<T.PaginatedResult<T.LiquorMovement>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const { field, dir } = safeOrder(filter.orderBy, filter.orderDir);

    if (filter.bottleId) {
      conditions.push('bottle_id = ?');
      params.push(filter.bottleId);
    }
    if (filter.brandId) {
      conditions.push('brand_id = ?');
      params.push(filter.brandId);
    }
    if (filter.kind) {
      conditions.push('kind = ?');
      params.push(filter.kind);
    }
    if (filter.pourType) {
      conditions.push('pour_type = ?');
      params.push(filter.pourType);
    }
    if (filter.saleId) {
      conditions.push('sale_id = ?');
      params.push(filter.saleId);
    }
    if (filter.fromDate) {
      conditions.push('timestamp >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('timestamp <= ?');
      params.push(filter.toDate);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM liquor_movements ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM liquor_movements ${where} ORDER BY ${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToLiquorMovement), total, offset, limit };
  },

  async findMovementsByBottle(bottleId: string): Promise<T.LiquorMovement[]> {
    const rows = await query(
      'SELECT * FROM liquor_movements WHERE bottle_id = ? ORDER BY timestamp ASC',
      [bottleId],
    );
    return rows.map(rowToLiquorMovement);
  },

  async findMovementsByBrand(brandId: string): Promise<T.LiquorMovement[]> {
    const rows = await query(
      'SELECT * FROM liquor_movements WHERE brand_id = ? ORDER BY timestamp DESC',
      [brandId],
    );
    return rows.map(rowToLiquorMovement);
  },

  async findMovementsByDateRange(
    from: string,
    to: string,
  ): Promise<T.LiquorMovement[]> {
    const rows = await query(
      'SELECT * FROM liquor_movements WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [from, to],
    );
    return rows.map(rowToLiquorMovement);
  },

  async getMovementsSummary(
    brandId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<Record<string, number>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (brandId) {
      conditions.push('brand_id = ?');
      params.push(brandId);
    }
    if (fromDate) {
      conditions.push('timestamp >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('timestamp <= ?');
      params.push(toDate);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT kind, COALESCE(SUM(quantity_ml), 0) as total_ml
       FROM liquor_movements ${where}
       GROUP BY kind`,
      params,
    );
    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.kind] = Number(r.total_ml);
    }
    return result;
  },

  // ── Excise Register ───────────────────────────────────────────────

  async findExciseEntries(
    filter: T.ExciseFilter = {},
  ): Promise<T.PaginatedResult<T.ExciseRegister>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    if (filter.date) {
      conditions.push('er.date = ?');
      params.push(filter.date);
    }
    if (filter.fromDate) {
      conditions.push('er.date >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('er.date <= ?');
      params.push(filter.toDate);
    }
    if (filter.brandId) {
      conditions.push('er.brand_id = ?');
      params.push(filter.brandId);
    }
    if (filter.categoryId) {
      conditions.push('er.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.counter) {
      conditions.push('er.counter = ?');
      params.push(filter.counter);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM excise_register er ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM excise_register er ${where} ORDER BY er.date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToExciseEntry), total, offset, limit };
  },

  async findExciseByDate(
    date: string,
    counter?: string,
  ): Promise<T.ExciseRegister[]> {
    const conditions: string[] = ['er.date = ?'];
    const params: any[] = [date];
    if (counter) {
      conditions.push('er.counter = ?');
      params.push(counter);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT er.*, lc.name as category_name, lbr.name as brand_name
       FROM excise_register er
       LEFT JOIN liquor_brands lbr ON er.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON er.category_id = lc.id
       ${where}
       ORDER BY er.brand_name`,
      params,
    );
    return rows.map(rowToExciseEntry);
  },

  async findExciseEntry(id: string): Promise<T.ExciseRegister | null> {
    const rows = await query(
      `SELECT er.*, lc.name as category_name, lbr.name as brand_name
       FROM excise_register er
       LEFT JOIN liquor_brands lbr ON er.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON er.category_id = lc.id
       WHERE er.id = ?`,
      [id],
    );
    return rows.length ? rowToExciseEntry(rows[0]) : null;
  },

  async createExciseEntry(dto: {
    date: string;
    counter?: string;
    brandId: string;
    brandName: string;
    categoryId: string;
    categoryName: string;
    openingStockBottles?: number;
    openingStockMl?: number;
    receivedBottles?: number;
    receivedMl?: number;
    preparedBy: string;
  }): Promise<T.ExciseRegister> {
    const id = uid('exc');
    await run(
      `INSERT INTO excise_register (id, date, counter, brand_id, brand_name, category_id, category_name, opening_stock_bottles, opening_stock_ml, received_bottles, received_ml, sold_ml, sold_amount, complimentary_ml, breakage_ml, wastage_ml, staff_ml, closing_stock_bottles, closing_stock_ml, variance_ml, prepared_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, 'prepared')`,
      [
        id,
        dto.date,
        dto.counter || 'main',
        dto.brandId,
        dto.brandName,
        dto.categoryId,
        dto.categoryName,
        dto.openingStockBottles || 0,
        dto.openingStockMl || 0,
        dto.receivedBottles || 0,
        dto.receivedMl || 0,
        dto.preparedBy,
      ],
    );
    return (await this.findExciseEntry(id))!;
  },

  async updateExciseEntry(
    id: string,
    changes: Partial<{
      soldMl: number;
      soldAmount: number;
      complimentaryMl: number;
      breakageMl: number;
      wastageMl: number;
      staffMl: number;
      closingStockBottles: number;
      closingStockMl: number;
      remarks: string;
    }>,
  ): Promise<T.ExciseRegister> {
    const existing = await this.findExciseEntry(id);
    if (!existing) throw new Error(`Excise entry not found: ${id}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (changes.soldMl !== undefined) {
      sets.push('sold_ml = ?');
      params.push(changes.soldMl);
    }
    if (changes.soldAmount !== undefined) {
      sets.push('sold_amount = ?');
      params.push(changes.soldAmount);
    }
    if (changes.complimentaryMl !== undefined) {
      sets.push('complimentary_ml = ?');
      params.push(changes.complimentaryMl);
    }
    if (changes.breakageMl !== undefined) {
      sets.push('breakage_ml = ?');
      params.push(changes.breakageMl);
    }
    if (changes.wastageMl !== undefined) {
      sets.push('wastage_ml = ?');
      params.push(changes.wastageMl);
    }
    if (changes.staffMl !== undefined) {
      sets.push('staff_ml = ?');
      params.push(changes.staffMl);
    }
    if (changes.closingStockBottles !== undefined) {
      sets.push('closing_stock_bottles = ?');
      params.push(changes.closingStockBottles);
    }
    if (changes.closingStockMl !== undefined) {
      sets.push('closing_stock_ml = ?');
      params.push(changes.closingStockMl);
    }
    if (changes.remarks !== undefined) {
      sets.push('remarks = ?');
      params.push(changes.remarks);
    }

    const soldMl = changes.soldMl ?? existing.soldMl;
    const complimentaryMl = changes.complimentaryMl ?? existing.complimentaryMl;
    const breakageMl = changes.breakageMl ?? existing.breakageMl;
    const wastageMl = changes.wastageMl ?? existing.wastageMl;
    const staffMl = changes.staffMl ?? existing.staffMl;
    const openingMl = existing.openingStockMl;
    const receivedMl = existing.receivedMl;
    const totalConsumed =
      soldMl + complimentaryMl + breakageMl + wastageMl + staffMl;
    const closingMl = changes.closingStockMl ?? existing.closingStockMl;
    const varianceMl = closingMl - (openingMl + receivedMl - totalConsumed);

    sets.push('variance_ml = ?');
    params.push(varianceMl);

    if (params.length === 1) return existing;
    await run(`UPDATE excise_register SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findExciseEntry(id))!;
  },

  async verifyExciseEntry(
    id: string,
    verifiedBy: string,
  ): Promise<T.ExciseRegister> {
    await run(
      "UPDATE excise_register SET verified_by = ?, status = 'verified' WHERE id = ?",
      [verifiedBy, id],
    );
    return (await this.findExciseEntry(id))!;
  },

  async approveExciseEntry(id: string): Promise<T.ExciseRegister> {
    await run("UPDATE excise_register SET status = 'approved' WHERE id = ?", [
      id,
    ]);
    return (await this.findExciseEntry(id))!;
  },

  // ── Pour Log ──────────────────────────────────────────────────────

  async recordPour(dto: {
    saleLineId: string;
    bottleId: string;
    brandId: string;
    pegSizeMl: number;
    pourType: T.PourType;
    quantityMl: number;
    bartenderId?: string;
  }): Promise<T.PourLog> {
    const id = uid('plg');
    await run(
      `INSERT INTO pour_log (id, sale_line_id, bottle_id, brand_id, peg_size_ml, pour_type, quantity_ml, bartender_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.saleLineId,
        dto.bottleId,
        dto.brandId,
        dto.pegSizeMl,
        dto.pourType,
        dto.quantityMl,
        dto.bartenderId || null,
      ],
    );

    await this.adjustBottleMl(dto.bottleId, -dto.quantityMl);

    const rows = await query('SELECT * FROM pour_log WHERE id = ?', [id]);
    return rowToPourLog(rows[0]);
  },

  async findPoursBySaleLine(saleLineId: string): Promise<T.PourLog[]> {
    const rows = await query(
      'SELECT * FROM pour_log WHERE sale_line_id = ? ORDER BY timestamp ASC',
      [saleLineId],
    );
    return rows.map(rowToPourLog);
  },

  async findPoursByBottle(bottleId: string): Promise<T.PourLog[]> {
    const rows = await query(
      'SELECT * FROM pour_log WHERE bottle_id = ? ORDER BY timestamp ASC',
      [bottleId],
    );
    return rows.map(rowToPourLog);
  },

  async findPoursByBartender(bartenderId: string): Promise<T.PourLog[]> {
    const rows = await query(
      'SELECT * FROM pour_log WHERE bartender_id = ? ORDER BY timestamp DESC LIMIT 100',
      [bartenderId],
    );
    return rows.map(rowToPourLog);
  },

  // ── Events ────────────────────────────────────────────────────────

  async recordBarEvent(
    eventType: T.BarEventType,
    aggregateType: string,
    aggregateId: string,
    data?: string,
    createdBy?: string | null,
  ): Promise<T.BarEvent> {
    const id = uid('bev');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO bar_events (id, event_type, aggregate_type, aggregate_id, data, created_by, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        eventType,
        aggregateType,
        aggregateId,
        data || null,
        createdBy || null,
        now,
      ],
    );
    const rows = await query('SELECT * FROM bar_events WHERE id = ?', [id]);
    return rowToBarEvent(rows[0]);
  },

  async findBarEvents(
    aggregateType?: string,
    aggregateId?: string,
  ): Promise<T.BarEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (aggregateType) {
      conditions.push('aggregate_type = ?');
      params.push(aggregateType);
    }
    if (aggregateId) {
      conditions.push('aggregate_id = ?');
      params.push(aggregateId);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM bar_events ${where} ORDER BY timestamp DESC`,
      params,
    );
    return rows.map(rowToBarEvent);
  },

  // ── Reporting ─────────────────────────────────────────────────────

  async getBrandPerformance(
    fromDate?: string,
    toDate?: string,
  ): Promise<T.BrandPerformance[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (fromDate) {
      conditions.push('lm.timestamp >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('lm.timestamp <= ?');
      params.push(toDate);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT lm.brand_id, lm.brand_name, lbr.category_id, lc.name as category_name,
              COALESCE(SUM(CASE WHEN lm.kind = 'sale' THEN lm.quantity_ml ELSE 0 END), 0) as total_ml_sold,
              COALESCE(SUM(CASE WHEN lm.kind = 'sale' THEN lm.total_value ELSE 0 END), 0) as total_revenue,
              COALESCE(SUM(CASE WHEN lm.kind = 'sale' THEN lm.unit_price ELSE 0 END), 0) as total_unit_price,
              COALESCE(SUM(CASE WHEN lm.pour_type = 'spillage' THEN lm.quantity_ml ELSE 0 END), 0) as spillage_ml,
              COALESCE(SUM(CASE WHEN lm.pour_type = 'complimentary' THEN lm.quantity_ml ELSE 0 END), 0) as complimentary_ml
       FROM liquor_movements lm
       LEFT JOIN liquor_brands lbr ON lm.brand_id = lbr.id
       LEFT JOIN liquor_categories lc ON lbr.category_id = lc.id
       ${where}
       GROUP BY lm.brand_id
       ORDER BY total_revenue DESC`,
      params,
    );

    return rows.map((r: any) => {
      const totalRevenue = Number(r.total_revenue);
      const totalMlSold = Number(r.total_ml_sold);
      const totalPegs = Math.round(totalMlSold / 30);
      const pourCost = 0;
      const grossProfit = totalRevenue - pourCost;
      const grossMargin =
        totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      return {
        brandId: r.brand_id,
        brandName: r.brand_name,
        categoryName: r.category_name || '',
        totalSales: totalPegs,
        totalMlSold,
        totalPegs,
        totalRevenue,
        pourCost,
        grossProfit,
        grossMargin,
        spillageMl: Number(r.spillage_ml),
        complimentaryMl: Number(r.complimentary_ml),
      };
    });
  },

  async getPegVariance(
    brandId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<T.PegVarianceReport[]> {
    const brandConditions: string[] = [];
    const brandParams: any[] = [];
    if (brandId) {
      brandConditions.push('lb.id = ?');
      brandParams.push(brandId);
    }

    const movementConditions: string[] = [];
    const movementParams: any[] = [];
    if (brandId) {
      movementConditions.push('brand_id = ?');
      movementParams.push(brandId);
    }
    if (fromDate) {
      movementConditions.push('timestamp >= ?');
      movementParams.push(fromDate);
    }
    if (toDate) {
      movementConditions.push('timestamp <= ?');
      movementParams.push(toDate);
    }

    const brandWhere = buildWhere(brandConditions, brandParams);
    const moveWhere = buildWhere(movementConditions, movementParams);

    const brands = await query(
      `SELECT lb.id, lb.name, lc.name as category_name FROM liquor_brands lb
       LEFT JOIN liquor_categories lc ON lb.category_id = lc.id
       ${brandWhere} WHERE lb.is_active = 1
       ORDER BY lb.name`,
      brandParams,
    );

    const results: T.PegVarianceReport[] = [];
    for (const brand of brands) {
      const movements = await query(
        `SELECT kind, pour_type, COALESCE(SUM(quantity_ml), 0) as total_ml
         FROM liquor_movements ${moveWhere} AND brand_id = ?
         GROUP BY kind, pour_type`,
        [
          ...movementParams.filter((_, i) =>
            i < movementConditions.length ? false : true,
          ),
          brand.id,
        ],
      );

      let soldMl = 0;
      let spillageMl = 0;
      let complimentaryMl = 0;
      let wastageMl = 0;

      for (const m of movements) {
        if (m.kind === 'sale') soldMl += Number(m.total_ml);
        if (m.pour_type === 'spillage') spillageMl += Number(m.total_ml);
        if (m.pour_type === 'complimentary')
          complimentaryMl += Number(m.total_ml);
        if (m.kind === 'waste') wastageMl += Number(m.total_ml);
      }

      const pegs = await query(
        'SELECT peg_size_ml, COUNT(*) as cnt FROM bar_sale_lines WHERE brand_id = ? GROUP BY peg_size_ml',
        [brand.id],
      );
      const expectedConsumptionMl = pegs.reduce(
        (sum: number, p: any) => sum + Number(p.peg_size_ml) * Number(p.cnt),
        0,
      );
      const varianceMl = expectedConsumptionMl - soldMl;
      const variancePercent =
        expectedConsumptionMl > 0
          ? (varianceMl / expectedConsumptionMl) * 100
          : 0;
      const unaccountedMl =
        expectedConsumptionMl -
        soldMl -
        spillageMl -
        complimentaryMl -
        wastageMl;

      results.push({
        brandId: brand.id,
        brandName: brand.name,
        expectedConsumptionMl,
        actualSoldMl: soldMl,
        varianceMl,
        variancePercent,
        spillageMl,
        complimentaryMl,
        wastageMl,
        unaccountedMl: Math.max(0, unaccountedMl),
      });
    }

    return results;
  },

  async getBartenderPerformance(
    fromDate?: string,
    toDate?: string,
  ): Promise<T.BartenderPerformance[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (fromDate) {
      conditions.push('bs.created_at >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('bs.created_at <= ?');
      params.push(toDate);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT bs.bartender_id, bs.bartender_name,
              COUNT(DISTINCT bs.id) as total_sales,
              COALESCE(SUM(bs.total_amount), 0) as revenue,
              COALESCE(SUM(bsl.quantity), 0) as total_pegs,
              COALESCE(SUM(bsl.peg_size_ml * bsl.quantity), 0) as total_ml,
              COALESCE(SUM(CASE WHEN bsl.pour_type = 'short_pour' THEN bsl.quantity ELSE 0 END), 0) as short_pours,
              COALESCE(SUM(CASE WHEN bsl.pour_type = 'over_pour' THEN bsl.quantity ELSE 0 END), 0) as over_pours
       FROM bar_sales bs
       LEFT JOIN bar_sale_lines bsl ON bs.id = bsl.sale_id
       ${where} AND bs.bartender_id IS NOT NULL
       GROUP BY bs.bartender_id
       ORDER BY total_sales DESC`,
      params,
    );

    return rows.map((r: any) => ({
      bartenderId: r.bartender_id,
      bartenderName: r.bartender_name || 'Unknown',
      totalSales: Number(r.total_sales),
      totalPegs: Number(r.total_pegs),
      totalMl: Number(r.total_ml),
      shortPours: Number(r.short_pours),
      overPours: Number(r.over_pours),
      spillageMl: 0,
      avgPegSize:
        Number(r.total_pegs) > 0
          ? Math.round(Number(r.total_ml) / Number(r.total_pegs))
          : 0,
      revenue: Number(r.revenue),
    }));
  },

  async getDailyExciseSummary(
    date: string,
    counter?: string,
  ): Promise<T.ExciseSummary> {
    const conditions: string[] = ['er.date = ?'];
    const params: any[] = [date];
    if (counter) {
      conditions.push('er.counter = ?');
      params.push(counter);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT
        COALESCE(SUM(er.opening_stock_ml), 0) as total_opening_ml,
        COALESCE(SUM(er.received_ml), 0) as total_received_ml,
        COALESCE(SUM(er.sold_ml), 0) as total_sold_ml,
        COALESCE(SUM(er.complimentary_ml), 0) as total_complimentary_ml,
        COALESCE(SUM(er.breakage_ml), 0) as total_breakage_ml,
        COALESCE(SUM(er.wastage_ml), 0) as total_wastage_ml,
        COALESCE(SUM(er.closing_stock_ml), 0) as total_closing_ml,
        COALESCE(SUM(er.variance_ml), 0) as total_variance_ml,
        COALESCE(SUM(er.sold_amount), 0) as total_revenue,
        0 as total_tax
       FROM excise_register er ${where}`,
      params,
    );

    const r = rows[0];
    return {
      date,
      totalOpeningMl: Number(r.total_opening_ml),
      totalReceivedMl: Number(r.total_received_ml),
      totalSoldMl: Number(r.total_sold_ml),
      totalComplimentaryMl: Number(r.total_complimentary_ml),
      totalBreakageMl: Number(r.total_breakage_ml),
      totalWastageMl: Number(r.total_wastage_ml),
      totalClosingMl: Number(r.total_closing_ml),
      totalVarianceMl: Number(r.total_variance_ml),
      totalRevenue: Number(r.total_revenue),
      totalTax: Number(r.total_tax),
    };
  },
};
