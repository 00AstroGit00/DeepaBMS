import { query, run } from '../../db';
import * as R from './liquor.repository';
import * as T from './liquor.types';
import { postOperationalToLedger } from '../accounting/ledger-integration';

const uid = (): string =>
  `lqr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

function rowToBottle(row: any): T.LiquorBottle {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name || '',
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    sizeMl: Number(row.size_ml),
    batchNo: row.batch_no || '',
    purchaseCost: Number(row.purchase_cost),
    sellingPrice: Number(row.selling_price),
    mrp: Number(row.mrp),
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

function rowToBrand(row: any): T.LiquorBrand {
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

function rowToBarSale(row: any): T.BarSale {
  return {
    id: row.id,
    saleNo: row.sale_no,
    status: row.status,
    counter: row.counter || 'main',
    bartenderId: row.bartender_id || null,
    bartenderName: row.bartender_name || null,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    discountPercent: Number(row.discount_percent),
    discountReason: row.discount_reason || null,
    serviceCharge: Number(row.service_charge),
    gstAmount: Number(row.gst_amount),
    totAmount: Number(row.tot_amount),
    totalAmount: Number(row.total_amount),
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
    brandName: row.brand_name,
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

function rowToMovement(row: any): T.LiquorMovement {
  return {
    id: row.id,
    bottleId: row.bottle_id || '',
    brandId: row.brand_id,
    brandName: row.brand_name,
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

function rowToExciseRegister(row: any): T.ExciseRegister {
  return {
    id: row.id,
    date: row.date,
    counter: row.counter || 'main',
    brandId: row.brand_id,
    brandName: row.brand_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    openingStockBottles: Number(row.opening_stock_bottles),
    openingStockMl: Number(row.opening_stock_ml),
    receivedBottles: Number(row.received_bottles),
    receivedMl: Number(row.received_ml),
    soldMl: Number(row.sold_ml),
    soldAmount: Number(row.sold_amount),
    complimentaryMl: Number(row.complimentary_ml),
    breakageMl: Number(row.breakage_ml),
    wastageMl: Number(row.wastage_ml),
    staffMl: Number(row.staff_ml),
    closingStockBottles: Number(row.closing_stock_bottles),
    closingStockMl: Number(row.closing_stock_ml),
    varianceMl: Number(row.variance_ml),
    remarks: row.remarks || null,
    preparedBy: row.prepared_by,
    verifiedBy: row.verified_by || null,
    status: row.status || 'prepared',
    createdAt: row.created_at || '',
  };
}

function rowToPegPrice(row: any): T.PegPrice {
  return {
    id: row.id,
    brandId: row.brand_id,
    pegSizeId: row.peg_size_id,
    pegSizeMl: Number(row.peg_size_ml || 0),
    tier: row.tier,
    price: Number(row.price),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToEvent(row: any): T.BarEvent {
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

// ── Helpers ────────────────────────────────────────────────────────────

async function getBrandBrandName(
  brandId: string,
): Promise<{ name: string; categoryId: string; categoryName: string }> {
  const rows = await query(
    `SELECT b.id, b.name, b.category_id, c.name AS category_name
     FROM liquor_brands b
     LEFT JOIN liquor_categories c ON c.id = b.category_id
     WHERE b.id = ?`,
    [brandId],
  );
  if (!rows.length) throw new Error(`Brand not found: ${brandId}`);
  return {
    name: rows[0].name,
    categoryId: rows[0].category_id,
    categoryName: rows[0].category_name || '',
  };
}

async function getBottleById(bottleId: string): Promise<T.LiquorBottle | null> {
  const rows = await query(
    `SELECT b.*, br.name AS brand_name, br.category_id, c.name AS category_name
     FROM liquor_bottles b
     LEFT JOIN liquor_brands br ON br.id = b.brand_id
     LEFT JOIN liquor_categories c ON c.id = br.category_id
     WHERE b.id = ?`,
    [bottleId],
  );
  return rows.length ? rowToBottle(rows[0]) : null;
}

async function requireBottle(bottleId: string): Promise<T.LiquorBottle> {
  const bottle = await getBottleById(bottleId);
  if (!bottle) throw new Error(`Bottle not found: ${bottleId}`);
  return bottle;
}

async function recordEvent(
  eventType: T.BarEventType,
  aggregateType: string,
  aggregateId: string,
  data: Record<string, unknown> | null,
  createdBy: string | null,
): Promise<T.BarEvent> {
  const id = uid();
  const dataStr = data ? JSON.stringify(data) : null;
  await run(
    `INSERT INTO bar_events (id, event_type, aggregate_type, aggregate_id, data, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, eventType, aggregateType, aggregateId, dataStr, createdBy],
  );
  const rows = await query('SELECT * FROM bar_events WHERE id = ?', [id]);
  return rowToEvent(rows[0]);
}

async function recordMovement(
  bottleId: string,
  brandId: string,
  brandName: string,
  kind: string,
  quantityMl: number,
  mlBefore: number,
  mlAfter: number,
  operator: string,
  opts?: {
    pourType?: T.PourType;
    saleId?: string;
    saleLineId?: string;
    unitPrice?: number;
    totalValue?: number;
    reference?: string;
    reason?: string;
    note?: string;
  },
): Promise<T.LiquorMovement> {
  const id = uid();
  await run(
    `INSERT INTO liquor_movements
     (id, bottle_id, brand_id, brand_name, kind, quantity_ml, ml_before, ml_after,
      pour_type, sale_id, sale_line_id, unit_price, total_value, operator, reference, reason, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bottleId || null,
      brandId,
      brandName,
      kind,
      quantityMl,
      mlBefore,
      mlAfter,
      opts?.pourType || null,
      opts?.saleId || null,
      opts?.saleLineId || null,
      opts?.unitPrice || 0,
      opts?.totalValue || 0,
      operator,
      opts?.reference || null,
      opts?.reason || null,
      opts?.note || null,
    ],
  );
  const rows = await query('SELECT * FROM liquor_movements WHERE id = ?', [id]);
  return rowToMovement(rows[0]);
}

async function updateBottleStatus(
  bottleId: string,
  status: T.BottleStatus,
  changes: Record<string, unknown> = {},
): Promise<T.LiquorBottle> {
  const sets: string[] = [
    'status = ?',
    'updated_at = ?',
    'version = version + 1',
  ];
  const params: any[] = [status, now()];
  const allowedFields: Record<string, string> = {
    currentMl: 'current_ml',
    location: 'location',
    openedAt: 'opened_at',
    openedBy: 'opened_by',
    closedAt: 'closed_at',
    closedBy: 'closed_by',
    isActive: 'is_active',
  };
  for (const [key, col] of Object.entries(allowedFields)) {
    if (changes[key] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(changes[key]);
    }
  }
  params.push(bottleId);
  await run(
    `UPDATE liquor_bottles SET ${sets.join(', ')} WHERE id = ?`,
    params,
  );
  const updated = await getBottleById(bottleId);
  if (!updated) throw new Error(`Bottle not found after update: ${bottleId}`);
  return updated;
}

async function findInventoryItemForBrand(
  brandId: string,
): Promise<{ id: string; name: string; stock: number } | null> {
  const rows = await query(
    'SELECT id, name, stock FROM inventory WHERE name IN (SELECT name FROM liquor_brands WHERE id = ?) LIMIT 1',
    [brandId],
  );
  return rows.length
    ? { id: rows[0].id, name: rows[0].name, stock: Number(rows[0].stock) }
    : null;
}

async function getSaleWithLines(saleId: string): Promise<T.BarSale> {
  const saleRows = await query('SELECT * FROM bar_sales WHERE id = ?', [
    saleId,
  ]);
  if (!saleRows.length) throw new Error(`Sale not found: ${saleId}`);
  const sale = rowToBarSale(saleRows[0]);
  const lineRows = await query(
    'SELECT * FROM bar_sale_lines WHERE sale_id = ? ORDER BY created_at',
    [saleId],
  );
  sale.lines = lineRows.map(rowToBarSaleLine);
  return sale;
}

async function recalcSaleTotals(saleId: string): Promise<void> {
  const lines = await query(
    'SELECT * FROM bar_sale_lines WHERE sale_id = ? AND status != ?',
    [saleId, 'cancelled'],
  );
  const subtotal = lines.reduce(
    (sum: number, l: any) => sum + Number(l.line_total),
    0,
  );

  // M0-2: Liquor Tax Engine (Kerala TOT on liquor, tax-inclusive pricing).
  const settings = await query('SELECT tot_rate_liquor FROM settings LIMIT 1');
  const totRate = Number(settings[0]?.tot_rate_liquor || 10);
  const tax = Math.round(((subtotal * totRate) / (100 + totRate)) * 100) / 100;
  const totalAmount = Math.round(subtotal * 100) / 100; // inclusive of TOT
  await run(
    `UPDATE bar_sales SET subtotal = ?, total_amount = ?, gst_amount = ?, tot_amount = ?, updated_at = ? WHERE id = ?`,
    [subtotal, totalAmount, tax, tax, now(), saleId],
  );
}

// ── 1. PegEngineService ────────────────────────────────────────────────

export const PegEngineService = {
  calculatePegConsumption(
    brandId: string,
    pegSizeMl: number,
    quantity: number,
  ): number {
    if (pegSizeMl <= 0) throw new Error('Peg size must be positive');
    if (quantity <= 0) throw new Error('Quantity must be positive');
    return pegSizeMl * quantity;
  },

  async validatePegPour(
    bottleId: string,
    pegSizeMl: number,
    quantity: number,
  ): Promise<{
    valid: boolean;
    error?: string;
    availableMl: number;
    requestedMl: number;
  }> {
    const bottle = await requireBottle(bottleId);
    const requestedMl = pegSizeMl * quantity;
    const availableMl = bottle.currentMl;
    if (requestedMl > availableMl) {
      return {
        valid: false,
        error: `Insufficient ml: bottle has ${availableMl}ml, requested ${requestedMl}ml`,
        availableMl,
        requestedMl,
      };
    }
    return { valid: true, availableMl, requestedMl };
  },

  async calculatePegPrice(
    brandId: string,
    pegSizeMl: number,
    tier: T.PricingTier,
    quantity: number,
  ): Promise<number> {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    const pegDefs = await query(
      'SELECT id FROM peg_definitions WHERE size_ml = ? AND is_active = 1 LIMIT 1',
      [pegSizeMl],
    );
    if (pegDefs.length) {
      const prices = await query(
        'SELECT price FROM peg_prices WHERE brand_id = ? AND peg_size_id = ? AND tier = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1',
        [brandId, pegDefs[0].id, tier],
      );
      if (prices.length) {
        return Number(prices[0].price) * quantity;
      }
    }
    const bottle = await query(
      'SELECT selling_price, size_ml FROM liquor_bottles WHERE brand_id = ? AND is_active = 1 LIMIT 1',
      [brandId],
    );
    if (!bottle.length) throw new Error(`No bottle found for brand ${brandId}`);
    const unitPrice =
      Number(bottle[0].selling_price) * (pegSizeMl / Number(bottle[0].size_ml));
    return (Math.round(unitPrice * 100) / 100) * quantity;
  },

  getStandardPegSizes(): number[] {
    return [...T.DEFAULT_PEG_SIZES];
  },

  convertBottleToPegs(
    bottleSizeMl: number,
    pegSizeMl: number,
  ): { fullPegs: number; remainderMl: number } {
    if (bottleSizeMl <= 0) throw new Error('Bottle size must be positive');
    if (pegSizeMl <= 0) throw new Error('Peg size must be positive');
    const fullPegs = Math.floor(bottleSizeMl / pegSizeMl);
    const remainderMl = bottleSizeMl - fullPegs * pegSizeMl;
    return { fullPegs, remainderMl };
  },

  calculatePourCost(
    bottlePurchaseCost: number,
    bottleSizeMl: number,
    pegSizeMl: number,
  ): number {
    if (bottleSizeMl <= 0) throw new Error('Bottle size must be positive');
    if (pegSizeMl <= 0) throw new Error('Peg size must be positive');
    return bottlePurchaseCost * (pegSizeMl / bottleSizeMl);
  },
};

// ── 2. BottleLifecycleService ──────────────────────────────────────────

export const BottleLifecycleService = {
  async transitionBottle(
    bottleId: string,
    newStatus: T.BottleStatus,
    operator: string,
    metadata?: { location?: string; reason?: string },
  ): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(bottleId);
    const transitionKey = `${bottle.status}->${newStatus}`;
    const allowed = T.BOTTLE_TRANSITIONS[bottle.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${bottle.status} -> ${newStatus}`);
    }
    const permissions = T.BOTTLE_TRANSITION_PERMISSIONS[transitionKey];
    if (!permissions) {
      throw new Error(`No permission mapping for transition: ${transitionKey}`);
    }
    const changes: Record<string, unknown> = {};
    if (metadata?.location) changes.location = metadata.location;
    const updated = await updateBottleStatus(bottleId, newStatus, changes);
    await recordEvent(
      `BOTTLE_${newStatus.toUpperCase().replace(/ /g, '_')}` as T.BarEventType,
      'liquor_bottle',
      bottleId,
      { from: bottle.status, to: newStatus, reason: metadata?.reason || null },
      operator,
    );
    return updated;
  },

  async openBottle(dto: T.OpenBottleDto): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(dto.bottleId);
    if (bottle.status !== 'stored' && bottle.status !== 'transferred') {
      throw new Error(
        `Cannot open bottle with status: ${bottle.status}. Must be 'stored' or 'transferred'`,
      );
    }
    if (bottle.currentMl <= 0) throw new Error('Cannot open an empty bottle');
    const updated = await updateBottleStatus(dto.bottleId, 'opened', {
      openedAt: now(),
      openedBy: dto.openedBy,
      location: dto.location || bottle.location,
    });
    const openingId = uid();
    await run(
      `INSERT INTO bottle_openings (id, bottle_id, brand_id, opened_at, opened_by, initial_ml, location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        openingId,
        dto.bottleId,
        bottle.brandId,
        now(),
        dto.openedBy,
        bottle.currentMl,
        dto.location || bottle.location,
        dto.notes || null,
      ],
    );
    await recordEvent(
      'BOTTLE_OPENED',
      'liquor_bottle',
      dto.bottleId,
      {
        initialMl: bottle.currentMl,
        location: dto.location || bottle.location,
      },
      dto.openedBy,
    );
    return updated;
  },

  async closeBottle(dto: T.CloseBottleDto): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(dto.bottleId);
    const validReasons: Record<string, T.BottleStatus> = {
      empty: 'empty',
      broken: 'broken',
      returned: 'returned',
      written_off: 'written_off',
      archived: 'archived',
      transfer: 'transferred',
    };
    const targetStatus = validReasons[dto.reason];
    if (!targetStatus) throw new Error(`Invalid close reason: ${dto.reason}`);
    if (dto.remainingMl < 0) throw new Error('Remaining ml cannot be negative');
    if (dto.remainingMl > bottle.currentMl)
      throw new Error('Remaining ml exceeds current ml');
    const closingId = uid();
    await run(
      `INSERT INTO bottle_closings (id, bottle_id, brand_id, closed_at, closed_by, remaining_ml, reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        closingId,
        dto.bottleId,
        bottle.brandId,
        now(),
        dto.closedBy,
        dto.remainingMl,
        dto.reason,
        dto.notes || null,
      ],
    );
    const updated = await updateBottleStatus(dto.bottleId, targetStatus, {
      closedAt: now(),
      closedBy: dto.closedBy,
      currentMl: dto.remainingMl,
    });
    await recordEvent(
      'BOTTLE_CLOSED' as T.BarEventType,
      'liquor_bottle',
      dto.bottleId,
      { reason: dto.reason, remainingMl: dto.remainingMl, targetStatus },
      dto.closedBy,
    );
    return updated;
  },

  async transferBottle(dto: T.TransferBottleDto): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(dto.bottleId);
    if (bottle.location === dto.toLocation) {
      throw new Error(`Bottle already at location: ${dto.toLocation}`);
    }
    const transferId = uid();
    await run(
      `INSERT INTO bottle_transfers (id, bottle_id, brand_id, from_location, to_location, transferred_at, transferred_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transferId,
        dto.bottleId,
        bottle.brandId,
        bottle.location,
        dto.toLocation,
        now(),
        dto.transferredBy,
        dto.notes || null,
      ],
    );
    const updated = await updateBottleStatus(dto.bottleId, 'transferred', {
      location: dto.toLocation,
    });
    await recordEvent(
      'BOTTLE_TRANSFERRED',
      'liquor_bottle',
      dto.bottleId,
      { from: bottle.location, to: dto.toLocation },
      dto.transferredBy,
    );
    return updated;
  },

  async consumeFromBottle(
    bottleId: string,
    mlToConsume: number,
    operator: string,
    saleLineId?: string,
  ): Promise<{ bottle: T.LiquorBottle; movement: T.LiquorMovement }> {
    const bottle = await requireBottle(bottleId);
    if (mlToConsume <= 0) throw new Error('Consumption must be positive');
    if (bottle.currentMl < mlToConsume) {
      throw new Error(
        `Insufficient ml in bottle ${bottleId}: has ${bottle.currentMl}ml, needs ${mlToConsume}ml`,
      );
    }
    const mlBefore = bottle.currentMl;
    const mlAfter = mlBefore - mlToConsume;
    let newStatus: T.BottleStatus = bottle.status;
    if (mlAfter <= 0) {
      newStatus = 'empty';
    } else if (bottle.status === 'opened' || bottle.status === 'active') {
      newStatus = 'partially_consumed';
    }
    const changes: Record<string, unknown> = { currentMl: mlAfter };
    if (newStatus !== bottle.status) changes.status = newStatus;
    const updated = await updateBottleStatus(bottleId, newStatus, {
      currentMl: mlAfter,
    });
    const movement = await recordMovement(
      bottleId,
      bottle.brandId,
      bottle.brandName,
      'sale',
      mlToConsume,
      mlBefore,
      mlAfter,
      operator,
      { saleLineId, reference: `consume-${bottleId}` },
    );
    await recordEvent(
      'BOTTLE_CONSUMED',
      'liquor_bottle',
      bottleId,
      { mlConsumed: mlToConsume, mlBefore, mlAfter, newStatus },
      operator,
    );
    if (newStatus === 'empty') {
      await recordEvent(
        'BOTTLE_EMPTIED',
        'liquor_bottle',
        bottleId,
        { mlBefore, mlAfter: 0 },
        operator,
      );
    }
    return { bottle: updated, movement };
  },

  async reportBroken(
    bottleId: string,
    operator: string,
    notes?: string,
  ): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(bottleId);
    if (
      bottle.status === 'broken' ||
      bottle.status === 'empty' ||
      bottle.status === 'archived'
    ) {
      throw new Error(`Cannot report broken on status: ${bottle.status}`);
    }
    const updated = await updateBottleStatus(bottleId, 'broken', {
      currentMl: 0,
    });
    await recordEvent(
      'BOTTLE_BROKEN',
      'liquor_bottle',
      bottleId,
      { previousMl: bottle.currentMl, notes: notes || null },
      operator,
    );
    return updated;
  },

  async writeOffBottle(
    bottleId: string,
    operator: string,
    notes?: string,
  ): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(bottleId);
    const allowed = T.BOTTLE_TRANSITIONS[bottle.status];
    if (!allowed || !allowed.includes('written_off')) {
      throw new Error(`Cannot write off bottle with status: ${bottle.status}`);
    }
    const updated = await updateBottleStatus(bottleId, 'written_off', {
      currentMl: 0,
    });
    await recordEvent(
      'BOTTLE_WRITTEN_OFF',
      'liquor_bottle',
      bottleId,
      { previousMl: bottle.currentMl, notes: notes || null },
      operator,
    );
    return updated;
  },

  async returnBottle(
    bottleId: string,
    operator: string,
    notes?: string,
  ): Promise<T.LiquorBottle> {
    const bottle = await requireBottle(bottleId);
    const allowed = T.BOTTLE_TRANSITIONS[bottle.status];
    if (!allowed || !allowed.includes('returned')) {
      throw new Error(`Cannot return bottle with status: ${bottle.status}`);
    }
    const updated = await updateBottleStatus(bottleId, 'returned');
    await recordEvent(
      'BOTTLE_RETURNED',
      'liquor_bottle',
      bottleId,
      { previousMl: bottle.currentMl, notes: notes || null },
      operator,
    );
    return updated;
  },
};

// ── 3. BarSaleService ─────────────────────────────────────────────────

export const BarSaleService = {
  async createSale(
    dto: T.CreateBarSaleDto,
    operator: string,
  ): Promise<T.BarSale> {
    if (!dto.lines || dto.lines.length === 0)
      throw new Error('Sale must have at least one line');
    const errors = ValidationService.validateCreateBarSale(dto);
    if (errors.length)
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    const id = uid();
    const saleNo = `SALE-${Date.now().toString(36).toUpperCase()}`;
    await run(
      `INSERT INTO bar_sales (id, sale_no, status, counter, bartender_id, bartender_name, subtotal, total_amount, notes)
       VALUES (?, ?, 'open', ?, ?, ?, 0, 0, ?)`,
      [
        id,
        saleNo,
        dto.counter,
        dto.bartenderId || null,
        dto.bartenderName || null,
        dto.notes || null,
      ],
    );
    for (const line of dto.lines) {
      const brandInfo = await getBrandBrandName(line.brandId);
      const lineId = uid();
      const unitPrice = line.unitPrice;
      const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;
      await run(
        `INSERT INTO bar_sale_lines (id, sale_id, brand_id, brand_name, peg_size_ml, peg_definition_id, quantity, unit_price, line_total, pour_type, bottle_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lineId,
          id,
          line.brandId,
          brandInfo.name,
          line.pegSizeMl,
          line.pegDefinitionId,
          line.quantity,
          unitPrice,
          lineTotal,
          line.pourType || 'regular',
          line.bottleId || null,
          line.notes || null,
        ],
      );
    }
    await recalcSaleTotals(id);
    await recordEvent(
      'BAR_SALE_CREATED',
      'bar_sale',
      id,
      { lines: dto.lines.length, counter: dto.counter },
      operator,
    );
    return getSaleWithLines(id);
  },

  async completeSale(saleId: string, operator: string): Promise<T.BarSale> {
    const sale = await getSaleWithLines(saleId);
    if (sale.status !== 'open' && sale.status !== 'draft') {
      throw new Error(`Cannot complete sale with status: ${sale.status}`);
    }
    for (const line of sale.lines) {
      if (line.status !== 'open') continue;
      const mlToConsume = line.pegSizeMl * line.quantity;
      let targetBottleId = line.bottleId;
      if (!targetBottleId) {
        const bottles = await query(
          `SELECT * FROM liquor_bottles WHERE brand_id = ? AND status IN ('opened','active','partially_consumed') AND current_ml > 0 AND is_active = 1 ORDER BY current_ml DESC LIMIT 1`,
          [line.brandId],
        );
        if (!bottles.length) {
          const storedBottles = await query(
            `SELECT * FROM liquor_bottles WHERE brand_id = ? AND status = 'stored' AND current_ml > 0 AND is_active = 1 ORDER BY created_at ASC LIMIT 1`,
            [line.brandId],
          );
          if (!storedBottles.length) {
            throw new Error(`No available bottle for brand: ${line.brandName}`);
          }
          const storedBottle = rowToBottle(storedBottles[0]);
          await BottleLifecycleService.openBottle({
            bottleId: storedBottle.id,
            openedBy: operator,
            location: storedBottle.location,
          });
          targetBottleId = storedBottle.id;
        } else {
          targetBottleId = bottles[0].id;
        }
      }
      const { bottle, movement } =
        await BottleLifecycleService.consumeFromBottle(
          targetBottleId!,
          mlToConsume,
          operator,
          line.id,
        );
      const pourLogId = uid();
      await run(
        `INSERT INTO pour_log (id, sale_line_id, bottle_id, brand_id, peg_size_ml, pour_type, quantity_ml, bartender_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pourLogId,
          line.id,
          targetBottleId,
          line.brandId,
          line.pegSizeMl,
          line.pourType,
          mlToConsume,
          sale.bartenderId,
        ],
      );
      await run(
        'UPDATE bar_sale_lines SET status = ?, bottle_id = ? WHERE id = ?',
        ['served', targetBottleId, line.id],
      );
      await recordEvent(
        'PEG_SOLD',
        'bar_sale_line',
        line.id,
        {
          pegSizeMl: line.pegSizeMl,
          quantity: line.quantity,
          mlToConsume,
          bottleId: targetBottleId,
        },
        operator,
      );
      const brandInfo = await getBrandBrandName(line.brandId);
      await recordMovement(
        targetBottleId!,
        line.brandId,
        brandInfo.name,
        'sale',
        mlToConsume,
        movement.mlBefore,
        movement.mlAfter,
        operator,
        {
          pourType: line.pourType,
          saleId,
          saleLineId: line.id,
          unitPrice: line.unitPrice,
          totalValue: line.lineTotal,
        },
      );
    }
    await run(
      `UPDATE bar_sales SET status = 'completed', updated_at = ? WHERE id = ?`,
      [now(), saleId],
    );
    await recordEvent('BAR_SALE_COMPLETED', 'bar_sale', saleId, {}, operator);

    // M0-1 + M0-2: completed bar sale posts to GL with TOT.
    const finalized = await getSaleWithLines(saleId);
    await postOperationalToLedger('bar_sale', {
      referenceId: saleId,
      referenceNo: finalized.saleNo,
      amount: Math.round((finalized.subtotal || 0) * 100) / 100,
      gstAmount:
        Math.round((finalized.totAmount || finalized.gstAmount || 0) * 100) /
        100,
      entryDate: now().slice(0, 10),
      description: `Bar sale ${finalized.saleNo}`,
    });

    return getSaleWithLines(saleId);
  },

  async cancelSale(
    saleId: string,
    operator: string,
    reason?: string,
  ): Promise<T.BarSale> {
    const sale = await getSaleWithLines(saleId);
    if (sale.status !== 'open' && sale.status !== 'draft') {
      throw new Error(`Cannot cancel sale with status: ${sale.status}`);
    }
    await run('UPDATE bar_sale_lines SET status = ? WHERE sale_id = ?', [
      'cancelled',
      saleId,
    ]);
    await run(
      `UPDATE bar_sales SET status = 'cancelled', notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END, updated_at = ? WHERE id = ?`,
      [reason, reason, now(), saleId],
    );
    await recordEvent(
      'BAR_SALE_CANCELLED',
      'bar_sale',
      saleId,
      { reason: reason || null },
      operator,
    );
    return getSaleWithLines(saleId);
  },

  async refundSale(
    saleId: string,
    operator: string,
    reason?: string,
  ): Promise<T.BarSale> {
    const sale = await getSaleWithLines(saleId);
    if (sale.status !== 'completed') {
      throw new Error(
        `Cannot refund sale with status: ${sale.status}. Only completed sales can be refunded`,
      );
    }
    for (const line of sale.lines) {
      if (line.status !== 'served') continue;
      if (line.bottleId) {
        const bottle = await getBottleById(line.bottleId);
        if (
          bottle &&
          bottle.status !== 'archived' &&
          bottle.status !== 'returned' &&
          bottle.status !== 'written_off'
        ) {
          const mlToRestore = line.pegSizeMl * line.quantity;
          const mlBefore = bottle.currentMl;
          const mlAfter = mlBefore + mlToRestore;
          await updateBottleStatus(line.bottleId, bottle.status, {
            currentMl: mlAfter,
          });
          await recordMovement(
            line.bottleId,
            line.brandId,
            line.brandName,
            'adjustment',
            mlToRestore,
            mlBefore,
            mlAfter,
            operator,
            {
              saleId,
              saleLineId: line.id,
              reason: `Refund: ${reason || 'Sale refunded'}`,
              pourType: line.pourType,
            },
          );
        }
      }
      await run('UPDATE bar_sale_lines SET status = ? WHERE id = ?', [
        'refunded',
        line.id,
      ]);
    }
    await run(
      `UPDATE bar_sales SET status = 'refunded', notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END, updated_at = ? WHERE id = ?`,
      [reason, reason, now(), saleId],
    );
    await recordEvent(
      'BAR_SALE_REFUNDED',
      'bar_sale',
      saleId,
      { reason: reason || null },
      operator,
    );
    return getSaleWithLines(saleId);
  },

  async addLineToSale(
    saleId: string,
    dto: T.CreateBarSaleLineDto,
  ): Promise<T.BarSale> {
    const sale = await getSaleWithLines(saleId);
    if (sale.status !== 'open' && sale.status !== 'draft') {
      throw new Error(`Cannot add line to sale with status: ${sale.status}`);
    }
    const brandInfo = await getBrandBrandName(dto.brandId);
    const lineId = uid();
    const unitPrice = dto.unitPrice;
    const lineTotal = Math.round(unitPrice * dto.quantity * 100) / 100;
    await run(
      `INSERT INTO bar_sale_lines (id, sale_id, brand_id, brand_name, peg_size_ml, peg_definition_id, quantity, unit_price, line_total, pour_type, bottle_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lineId,
        saleId,
        dto.brandId,
        brandInfo.name,
        dto.pegSizeMl,
        dto.pegDefinitionId,
        dto.quantity,
        unitPrice,
        lineTotal,
        dto.pourType || 'regular',
        dto.bottleId || null,
        dto.notes || null,
      ],
    );
    await recalcSaleTotals(saleId);
    return getSaleWithLines(saleId);
  },

  async removeLineFromSale(saleId: string, lineId: string): Promise<T.BarSale> {
    const sale = await getSaleWithLines(saleId);
    if (sale.status !== 'open' && sale.status !== 'draft') {
      throw new Error(
        `Cannot remove line from sale with status: ${sale.status}`,
      );
    }
    const line = sale.lines.find((l) => l.id === lineId);
    if (!line) throw new Error(`Line not found: ${lineId}`);
    if (line.status !== 'open') {
      throw new Error(`Cannot remove line with status: ${line.status}`);
    }
    await run('DELETE FROM bar_sale_lines WHERE id = ? AND sale_id = ?', [
      lineId,
      saleId,
    ]);
    await recalcSaleTotals(saleId);
    return getSaleWithLines(saleId);
  },

  async getSaleWithDetails(saleId: string): Promise<T.BarSale> {
    return getSaleWithLines(saleId);
  },
};

// ── 4. BarInventoryService ─────────────────────────────────────────────

export const BarInventoryService = {
  async recordConsumption(
    brandId: string,
    brandName: string,
    mlConsumed: number,
    pourType: T.PourType,
    saleId: string,
    saleLineId: string,
    operator: string,
    bottleId?: string,
  ): Promise<T.LiquorMovement> {
    if (mlConsumed <= 0) throw new Error('Consumption must be positive');
    const movement = await recordMovement(
      bottleId || '',
      brandId,
      brandName,
      'sale',
      mlConsumed,
      0,
      0,
      operator,
      { pourType, saleId, saleLineId, reference: `sale-${saleId}` },
    );
    const invItem = await findInventoryItemForBrand(brandId);
    if (invItem) {
      const kind = pourType === 'complimentary' ? 'complimentary' : 'sale';
      const sign = -1;
      const newStock = invItem.stock + sign * mlConsumed;
      if (newStock >= 0) {
        await run(
          'UPDATE inventory SET stock = ?, updated_at = ? WHERE id = ?',
          [newStock, now(), invItem.id],
        );
      }
    }
    await recordEvent(
      'INVENTORY_CONSUMED',
      'liquor_movement',
      movement.id,
      { brandId, mlConsumed, pourType, saleId, saleLineId },
      operator,
    );
    return movement;
  },

  async recordStockAdjustment(
    brandId: string,
    brandName: string,
    mlDelta: number,
    reason: string,
    operator: string,
    bottleId?: string,
  ): Promise<T.LiquorMovement> {
    if (mlDelta === 0) throw new Error('Adjustment delta cannot be zero');
    const kind = mlDelta > 0 ? 'adjustment' : 'adjustment';
    const absMl = Math.abs(mlDelta);
    const movement = await recordMovement(
      bottleId || '',
      brandId,
      brandName,
      kind,
      absMl,
      0,
      0,
      operator,
      { reason, reference: `adj-${Date.now().toString(36)}` },
    );
    await recordEvent(
      'STOCK_ADJUSTMENT',
      'liquor_movement',
      movement.id,
      { brandId, mlDelta, reason },
      operator,
    );
    return movement;
  },

  async recordDamage(
    brandId: string,
    brandName: string,
    mlLost: number,
    operator: string,
    bottleId: string,
    notes?: string,
  ): Promise<T.LiquorMovement> {
    if (mlLost <= 0) throw new Error('Lost ml must be positive');
    const bottle = await requireBottle(bottleId);
    const mlBefore = bottle.currentMl;
    const mlAfter = Math.max(0, mlBefore - mlLost);
    await updateBottleStatus(
      bottleId,
      bottle.currentMl > mlLost ? bottle.status : 'broken',
      { currentMl: mlAfter },
    );
    const movement = await recordMovement(
      bottleId,
      brandId,
      brandName,
      'damage',
      mlLost,
      mlBefore,
      mlAfter,
      operator,
      { note: notes ?? undefined, reference: `damage-${bottleId}` },
    );
    await recordEvent(
      'BOTTLE_BROKEN',
      'liquor_bottle',
      bottleId,
      { mlLost, notes: notes || null, kind: 'damage' },
      operator,
    );
    return movement;
  },

  async reconcileBottle(
    bottleId: string,
    expectedMl: number,
    actualMl: number,
    operator: string,
  ): Promise<{ variance: number; movement: T.LiquorMovement }> {
    const bottle = await requireBottle(bottleId);
    const variance = actualMl - expectedMl;
    if (variance === 0) {
      const dummyMovement = await recordMovement(
        bottleId,
        bottle.brandId,
        bottle.brandName,
        'physical_count',
        0,
        bottle.currentMl,
        bottle.currentMl,
        operator,
        {
          reason: 'Reconciliation: no variance',
          reference: `reconcile-${bottleId}`,
        },
      );
      return { variance: 0, movement: dummyMovement };
    }
    const absVariance = Math.abs(variance);
    const kind = variance > 0 ? 'adjustment' : 'adjustment';
    const mlBefore = bottle.currentMl;
    const mlAfter = actualMl;
    await updateBottleStatus(bottleId, bottle.status, { currentMl: actualMl });
    const movement = await recordMovement(
      bottleId,
      bottle.brandId,
      bottle.brandName,
      kind,
      absVariance,
      mlBefore,
      mlAfter,
      operator,
      {
        reason: `Reconciliation variance: ${variance > 0 ? '+' : ''}${variance}ml`,
        reference: `reconcile-${bottleId}`,
      },
    );
    await recordEvent(
      'VARIANCE_DETECTED',
      'liquor_bottle',
      bottleId,
      {
        expected: expectedMl,
        actual: actualMl,
        variance,
        previousMl: bottle.currentMl,
      },
      operator,
    );
    return { variance, movement };
  },
};

// ── 5. ExciseService ───────────────────────────────────────────────────

export const ExciseService = {
  async generateDailyRegister(
    date: string,
    counter: string,
    operator: string,
  ): Promise<T.ExciseRegister[]> {
    const brands = await query(
      'SELECT * FROM liquor_brands WHERE is_active = 1',
    );
    const registers: T.ExciseRegister[] = [];
    for (const brand of brands) {
      const brandId = brand.id;
      const brandInfo = await getBrandBrandName(brandId);
      const dayStart = `${date} 00:00:00`;
      const dayEnd = `${date} 23:59:59`;
      const openingMovements = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total_ml
         FROM liquor_movements
         WHERE brand_id = ? AND timestamp < ?`,
        [brandId, dayStart],
      );
      const openingBottles = await query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(current_ml), 0) AS total_ml
         FROM liquor_bottles WHERE brand_id = ? AND is_active = 1`,
        [brandId],
      );
      const receivedMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND kind = 'purchase' AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const soldMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total,
                COALESCE(SUM(total_value), 0) AS amount
         FROM liquor_movements WHERE brand_id = ? AND kind = 'sale' AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const complimentaryMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND pour_type = 'complimentary' AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const breakageMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND kind = 'damage' AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const wastageMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND kind IN ('waste', 'spillage') AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const staffMl = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND kind = 'staff_issue' AND timestamp >= ? AND timestamp <= ?`,
        [brandId, dayStart, dayEnd],
      );
      const openingMl =
        Number(openingMovements[0]?.total_ml || 0) +
        Number(openingBottles[0]?.total_ml || 0);
      const openingCount = Number(openingBottles[0]?.count || 0);
      const receivedTotal = Number(receivedMl[0]?.total || 0);
      const soldTotal = Number(soldMl[0]?.total || 0);
      const soldAmount = Number(soldMl[0]?.amount || 0);
      const compTotal = Number(complimentaryMl[0]?.total || 0);
      const breakTotal = Number(breakageMl[0]?.total || 0);
      const wasteTotal = Number(wastageMl[0]?.total || 0);
      const staffTotal = Number(staffMl[0]?.total || 0);
      const closingMl =
        openingMl +
        receivedTotal -
        soldTotal -
        compTotal -
        breakTotal -
        wasteTotal -
        staffTotal;
      const closingBottles = Number(openingBottles[0]?.count || 0);
      const varianceMl = 0;
      const id = uid();
      await run(
        `INSERT INTO excise_register
         (id, date, counter, brand_id, brand_name, category_id, category_name,
          opening_stock_bottles, opening_stock_ml, received_bottles, received_ml,
          sold_ml, sold_amount, complimentary_ml, breakage_ml, wastage_ml, staff_ml,
          closing_stock_bottles, closing_stock_ml, variance_ml, prepared_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          date,
          counter,
          brandId,
          brandInfo.name,
          brandInfo.categoryId,
          brandInfo.categoryName,
          openingCount,
          openingMl,
          0,
          receivedTotal,
          soldTotal,
          soldAmount,
          compTotal,
          breakTotal,
          wasteTotal,
          staffTotal,
          closingBottles,
          closingMl,
          varianceMl,
          operator,
        ],
      );
      const rows = await query('SELECT * FROM excise_register WHERE id = ?', [
        id,
      ]);
      registers.push(rowToExciseRegister(rows[0]));
    }
    await recordEvent(
      'EXCISE_REPORT_GENERATED',
      'excise',
      `daily-${date}-${counter}`,
      { date, counter, brandsCount: brands.length },
      operator,
    );
    return registers;
  },

  async generateBrandRegister(
    brandId: string,
    fromDate: string,
    toDate: string,
    operator: string,
  ): Promise<T.ExciseRegister> {
    const brandInfo = await getBrandBrandName(brandId);
    const fromStart = `${fromDate} 00:00:00`;
    const toEnd = `${toDate} 23:59:59`;
    const soldMl = await query(
      `SELECT COALESCE(SUM(quantity_ml), 0) AS total, COALESCE(SUM(total_value), 0) AS amount
       FROM liquor_movements WHERE brand_id = ? AND kind = 'sale' AND timestamp >= ? AND timestamp <= ?`,
      [brandId, fromStart, toEnd],
    );
    const compMl = await query(
      `SELECT COALESCE(SUM(quantity_ml), 0) AS total
       FROM liquor_movements WHERE brand_id = ? AND pour_type = 'complimentary' AND timestamp >= ? AND timestamp <= ?`,
      [brandId, fromStart, toEnd],
    );
    const damageMl = await query(
      `SELECT COALESCE(SUM(quantity_ml), 0) AS total
       FROM liquor_movements WHERE brand_id = ? AND kind = 'damage' AND timestamp >= ? AND timestamp <= ?`,
      [brandId, fromStart, toEnd],
    );
    const wasteMl = await query(
      `SELECT COALESCE(SUM(quantity_ml), 0) AS total
       FROM liquor_movements WHERE brand_id = ? AND kind IN ('waste','spillage') AND timestamp >= ? AND timestamp <= ?`,
      [brandId, fromStart, toEnd],
    );
    const staffMl = await query(
      `SELECT COALESCE(SUM(quantity_ml), 0) AS total
       FROM liquor_movements WHERE brand_id = ? AND kind = 'staff_issue' AND timestamp >= ? AND timestamp <= ?`,
      [brandId, fromStart, toEnd],
    );
    const id = uid();
    await run(
      `INSERT INTO excise_register
       (id, date, counter, brand_id, brand_name, category_id, category_name,
        sold_ml, sold_amount, complimentary_ml, breakage_ml, wastage_ml, staff_ml, prepared_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        fromDate,
        'all',
        brandId,
        brandInfo.name,
        brandInfo.categoryId,
        brandInfo.categoryName,
        Number(soldMl[0]?.total || 0),
        Number(soldMl[0]?.amount || 0),
        Number(compMl[0]?.total || 0),
        Number(damageMl[0]?.total || 0),
        Number(wasteMl[0]?.total || 0),
        Number(staffMl[0]?.total || 0),
        operator,
      ],
    );
    const rows = await query('SELECT * FROM excise_register WHERE id = ?', [
      id,
    ]);
    return rowToExciseRegister(rows[0]);
  },

  async verifyDailyRegister(
    entryId: string,
    verifiedBy: string,
  ): Promise<T.ExciseRegister> {
    const rows = await query('SELECT * FROM excise_register WHERE id = ?', [
      entryId,
    ]);
    if (!rows.length)
      throw new Error(`Excise register entry not found: ${entryId}`);
    const entry = rowToExciseRegister(rows[0]);
    if (entry.status !== 'prepared')
      throw new Error(`Cannot verify entry with status: ${entry.status}`);
    await run(
      'UPDATE excise_register SET status = ?, verified_by = ? WHERE id = ?',
      ['verified', verifiedBy, entryId],
    );
    const updated = await query('SELECT * FROM excise_register WHERE id = ?', [
      entryId,
    ]);
    return rowToExciseRegister(updated[0]);
  },

  async approveExciseEntry(entryId: string): Promise<T.ExciseRegister> {
    const rows = await query('SELECT * FROM excise_register WHERE id = ?', [
      entryId,
    ]);
    if (!rows.length)
      throw new Error(`Excise register entry not found: ${entryId}`);
    const entry = rowToExciseRegister(rows[0]);
    if (entry.status !== 'verified')
      throw new Error(`Cannot approve entry with status: ${entry.status}`);
    await run('UPDATE excise_register SET status = ? WHERE id = ?', [
      'approved',
      entryId,
    ]);
    const updated = await query('SELECT * FROM excise_register WHERE id = ?', [
      entryId,
    ]);
    return rowToExciseRegister(updated[0]);
  },

  async getExciseSummary(
    date: string,
    counter?: string,
  ): Promise<T.ExciseSummary> {
    let where = 'date = ?';
    const params: any[] = [date];
    if (counter) {
      where += ' AND counter = ?';
      params.push(counter);
    }
    const rows = await query(
      `SELECT * FROM excise_register WHERE ${where}`,
      params,
    );
    let totalOpeningMl = 0;
    let totalReceivedMl = 0;
    let totalSoldMl = 0;
    let totalComplimentaryMl = 0;
    let totalBreakageMl = 0;
    let totalWastageMl = 0;
    let totalClosingMl = 0;
    let totalVarianceMl = 0;
    let totalRevenue = 0;
    for (const r of rows) {
      totalOpeningMl += Number(r.opening_stock_ml);
      totalReceivedMl += Number(r.received_ml);
      totalSoldMl += Number(r.sold_ml);
      totalComplimentaryMl += Number(r.complimentary_ml);
      totalBreakageMl += Number(r.breakage_ml);
      totalWastageMl += Number(r.wastage_ml);
      totalClosingMl += Number(r.closing_stock_ml);
      totalVarianceMl += Number(r.variance_ml);
      totalRevenue += Number(r.sold_amount);
    }
    return {
      date,
      totalOpeningMl,
      totalReceivedMl,
      totalSoldMl,
      totalComplimentaryMl,
      totalBreakageMl,
      totalWastageMl,
      totalClosingMl,
      totalVarianceMl,
      totalRevenue,
      totalTax: 0,
    };
  },
};

// ── 6. PricingService ──────────────────────────────────────────────────

export const PricingService = {
  async setPegPrice(
    brandId: string,
    pegSizeId: string,
    tier: T.PricingTier,
    price: number,
  ): Promise<T.PegPrice> {
    if (price < 0) throw new Error('Price cannot be negative');
    const brand = await query(
      'SELECT id FROM liquor_brands WHERE id = ? AND is_active = 1',
      [brandId],
    );
    if (!brand.length) throw new Error(`Brand not found: ${brandId}`);
    const pegDef = await query(
      'SELECT id, size_ml FROM peg_definitions WHERE id = ? AND is_active = 1',
      [pegSizeId],
    );
    if (!pegDef.length)
      throw new Error(`Peg definition not found: ${pegSizeId}`);
    if (!T.VALID_PRICING_TIERS.includes(tier))
      throw new Error(`Invalid pricing tier: ${tier}`);
    const existing = await query(
      'SELECT * FROM peg_prices WHERE brand_id = ? AND peg_size_id = ? AND tier = ?',
      [brandId, pegSizeId, tier],
    );
    if (existing.length) {
      await run(
        'UPDATE peg_prices SET price = ?, updated_at = ? WHERE id = ?',
        [price, now(), existing[0].id],
      );
      const rows = await query('SELECT * FROM peg_prices WHERE id = ?', [
        existing[0].id,
      ]);
      return rowToPegPrice(rows[0]);
    }
    const id = uid();
    await run(
      `INSERT INTO peg_prices (id, brand_id, peg_size_id, tier, price, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, brandId, pegSizeId, tier, price],
    );
    const rows = await query('SELECT * FROM peg_prices WHERE id = ?', [id]);
    await recordEvent(
      'PRICE_UPDATED',
      'peg_price',
      id,
      { brandId, pegSizeId, tier, price },
      'system',
    );
    return rowToPegPrice(rows[0]);
  },

  async getEffectivePrice(
    brandId: string,
    pegSizeMl: number,
    tier?: T.PricingTier,
  ): Promise<number> {
    const pegDefs = await query(
      'SELECT id FROM peg_definitions WHERE size_ml = ? AND is_active = 1 LIMIT 1',
      [pegSizeMl],
    );
    if (!pegDefs.length)
      throw new Error(`No peg definition for ${pegSizeMl}ml`);
    const pegSizeId = pegDefs[0].id;
    const tierOrder: T.PricingTier[] = [
      'member',
      'happy_hour',
      'promotional',
      'bar_price',
      'mrp',
    ];
    const startIdx = tier ? tierOrder.indexOf(tier) : 0;
    if (tier && startIdx === -1) throw new Error(`Invalid tier: ${tier}`);
    for (let i = startIdx; i < tierOrder.length; i++) {
      const prices = await query(
        `SELECT price FROM peg_prices WHERE brand_id = ? AND peg_size_id = ? AND tier = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1`,
        [brandId, pegSizeId, tierOrder[i]],
      );
      if (prices.length) return Number(prices[0].price);
    }
    const bottles = await query(
      'SELECT selling_price, mrp, size_ml FROM liquor_bottles WHERE brand_id = ? AND is_active = 1 LIMIT 1',
      [brandId],
    );
    if (!bottles.length)
      throw new Error(`No bottle found for brand ${brandId}`);
    const b = bottles[0];
    const mrpPrice = Number(b.mrp) * (pegSizeMl / Number(b.size_ml));
    const barPrice = Number(b.selling_price) * (pegSizeMl / Number(b.size_ml));
    return Math.round((barPrice || mrpPrice) * 100) / 100;
  },

  async applyHappyHour(
    brandId: string,
    pegSizeId: string,
    discountPercent: number,
  ): Promise<T.PegPrice> {
    if (discountPercent <= 0 || discountPercent > 100) {
      throw new Error('Discount percent must be between 1 and 100');
    }
    const barPrice = await query(
      'SELECT price FROM peg_prices WHERE brand_id = ? AND peg_size_id = ? AND tier = ? AND is_active = 1 LIMIT 1',
      [brandId, pegSizeId, 'bar_price'],
    );
    let basePrice: number;
    if (barPrice.length) {
      basePrice = Number(barPrice[0].price);
    } else {
      const effective = await this.getEffectivePrice(brandId, 0);
      const def = await query(
        'SELECT size_ml FROM peg_definitions WHERE id = ?',
        [pegSizeId],
      );
      const pegSizeMl = def.length ? Number(def[0].size_ml) : 30;
      const bottles = await query(
        'SELECT selling_price, size_ml FROM liquor_bottles WHERE brand_id = ? AND is_active = 1 LIMIT 1',
        [brandId],
      );
      if (!bottles.length)
        throw new Error(`No bottle found for brand ${brandId}`);
      basePrice =
        Number(bottles[0].selling_price) *
        (pegSizeMl / Number(bottles[0].size_ml));
    }
    const discountedPrice =
      Math.round(basePrice * (1 - discountPercent / 100) * 100) / 100;
    return this.setPegPrice(brandId, pegSizeId, 'happy_hour', discountedPrice);
  },

  async bulkUpdatePrices(
    brandId: string,
    tier: T.PricingTier,
    adjustmentPercent: number,
  ): Promise<number> {
    if (!T.VALID_PRICING_TIERS.includes(tier))
      throw new Error(`Invalid tier: ${tier}`);
    const prices = await query(
      'SELECT * FROM peg_prices WHERE brand_id = ? AND tier = ? AND is_active = 1',
      [brandId, tier],
    );
    let updatedCount = 0;
    for (const p of prices) {
      const newPrice =
        Math.round(Number(p.price) * (1 + adjustmentPercent / 100) * 100) / 100;
      if (newPrice >= 0) {
        await run(
          'UPDATE peg_prices SET price = ?, updated_at = ? WHERE id = ?',
          [newPrice, now(), p.id],
        );
        updatedCount++;
      }
    }
    return updatedCount;
  },
};

// ── 7. ReportingService ────────────────────────────────────────────────

export const ReportingService = {
  async getBrandPerformance(
    fromDate?: string,
    toDate?: string,
  ): Promise<T.BrandPerformance[]> {
    const dateWhere: string[] = [];
    const dateParams: any[] = [];
    if (fromDate) {
      dateWhere.push('m.timestamp >= ?');
      dateParams.push(`${fromDate} 00:00:00`);
    }
    if (toDate) {
      dateWhere.push('m.timestamp <= ?');
      dateParams.push(`${toDate} 23:59:59`);
    }
    const dateClause = dateWhere.length ? `AND ${dateWhere.join(' AND ')}` : '';
    const brands = await query(
      'SELECT * FROM liquor_brands WHERE is_active = 1',
    );
    const results: T.BrandPerformance[] = [];
    for (const brand of brands) {
      const brandId = brand.id;
      const catRows = await query(
        'SELECT name FROM liquor_categories WHERE id = ?',
        [brand.category_id],
      );
      const categoryName = catRows.length ? catRows[0].name : '';
      const salesData = await query(
        `SELECT COALESCE(SUM(m.quantity_ml), 0) AS total_ml,
                COALESCE(SUM(m.total_value), 0) AS total_revenue
         FROM liquor_movements m
         WHERE m.brand_id = ? AND m.kind = 'sale' ${dateClause}`,
        [brandId, ...dateParams],
      );
      const totalMlSold = Number(salesData[0]?.total_ml || 0);
      const totalRevenue = Number(salesData[0]?.total_revenue || 0);
      const spillageData = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND kind IN ('waste','spillage') ${dateClause}`,
        [brandId, ...dateParams],
      );
      const compData = await query(
        `SELECT COALESCE(SUM(quantity_ml), 0) AS total
         FROM liquor_movements WHERE brand_id = ? AND pour_type = 'complimentary' ${dateClause}`,
        [brandId, ...dateParams],
      );
      const bottles = await query(
        'SELECT purchase_cost, size_ml FROM liquor_bottles WHERE brand_id = ? AND is_active = 1 LIMIT 1',
        [brandId],
      );
      const pourCost = bottles.length
        ? Number(bottles[0].purchase_cost) *
          (totalMlSold / Number(bottles[0].size_ml))
        : 0;
      const grossProfit = totalRevenue - pourCost;
      const grossMargin =
        totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const totalPegs = Math.round(totalMlSold / 30);
      results.push({
        brandId,
        brandName: brand.name,
        categoryName,
        totalSales: totalPegs,
        totalMlSold,
        totalPegs,
        totalRevenue,
        pourCost: Math.round(pourCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 100) / 100,
        spillageMl: Number(spillageData[0]?.total || 0),
        complimentaryMl: Number(compData[0]?.total || 0),
      });
    }
    return results;
  },

  async getPegVarianceReport(
    brandId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<T.PegVarianceReport[]> {
    let where = '1=1';
    const params: any[] = [];
    if (brandId) {
      where += ' AND brand_id = ?';
      params.push(brandId);
    }
    if (fromDate) {
      where += ' AND timestamp >= ?';
      params.push(`${fromDate} 00:00:00`);
    }
    if (toDate) {
      where += ' AND timestamp <= ?';
      params.push(`${toDate} 23:59:59`);
    }
    const movements = await query(
      `SELECT brand_id, brand_name, kind, pour_type, SUM(quantity_ml) AS total_ml
       FROM liquor_movements WHERE ${where}
       GROUP BY brand_id, kind, pour_type`,
      params,
    );
    const brandMap = new Map<string, T.PegVarianceReport>();
    for (const m of movements) {
      const bid = m.brand_id;
      if (!brandMap.has(bid)) {
        brandMap.set(bid, {
          brandId: bid,
          brandName: m.brand_name,
          expectedConsumptionMl: 0,
          actualSoldMl: 0,
          varianceMl: 0,
          variancePercent: 0,
          spillageMl: 0,
          complimentaryMl: 0,
          wastageMl: 0,
          unaccountedMl: 0,
        });
      }
      const report = brandMap.get(bid)!;
      const totalMl = Number(m.total_ml);
      if (m.kind === 'sale' && m.pour_type !== 'complimentary') {
        report.actualSoldMl += totalMl;
      }
      if (m.pour_type === 'complimentary') {
        report.complimentaryMl += totalMl;
      }
      if (m.kind === 'waste' || m.kind === 'spillage') {
        report.spillageMl += totalMl;
      }
      if (m.kind === 'waste') {
        report.wastageMl += totalMl;
      }
    }
    const results = Array.from(brandMap.values());
    for (const r of results) {
      const saleData = await query(
        `SELECT COALESCE(SUM(bl.quantity * bl.peg_size_ml), 0) AS expected
         FROM bar_sale_lines bl
         JOIN bar_sales bs ON bs.id = bl.sale_id
         WHERE bl.brand_id = ? AND bs.status = 'completed'`,
        [r.brandId],
      );
      r.expectedConsumptionMl = Number(saleData[0]?.expected || 0);
      r.varianceMl = r.expectedConsumptionMl - r.actualSoldMl;
      r.variancePercent =
        r.expectedConsumptionMl > 0
          ? Math.round((r.varianceMl / r.expectedConsumptionMl) * 10000) / 100
          : 0;
      r.unaccountedMl = Math.max(0, r.varianceMl - r.spillageMl - r.wastageMl);
    }
    return results;
  },

  async getBartenderPerformance(
    fromDate?: string,
    toDate?: string,
  ): Promise<T.BartenderPerformance[]> {
    let where = '1=1';
    const params: any[] = [];
    if (fromDate) {
      where += ' AND bs.created_at >= ?';
      params.push(`${fromDate} 00:00:00`);
    }
    if (toDate) {
      where += ' AND bs.created_at <= ?';
      params.push(`${toDate} 23:59:59`);
    }
    const rows = await query(
      `SELECT bs.bartender_id, bs.bartender_name,
              COUNT(DISTINCT bs.id) AS total_sales,
              COALESCE(SUM(bl.quantity), 0) AS total_pegs,
              COALESCE(SUM(bl.quantity * bl.peg_size_ml), 0) AS total_ml,
              COALESCE(SUM(CASE WHEN bl.pour_type = 'short_pour' THEN 1 ELSE 0 END), 0) AS short_pours,
              COALESCE(SUM(CASE WHEN bl.pour_type = 'over_pour' THEN 1 ELSE 0 END), 0) AS over_pours,
              COALESCE(SUM(bl.line_total), 0) AS revenue
       FROM bar_sales bs
       JOIN bar_sale_lines bl ON bl.sale_id = bs.id
       WHERE bs.status = 'completed' AND ${where}
       GROUP BY bs.bartender_id
       ORDER BY revenue DESC`,
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

  async getBottleSummary(): Promise<T.BottleSummary> {
    const counts = await query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(current_ml), 0) AS total_ml,
         COALESCE(SUM(CASE WHEN status IN ('opened','active','partially_consumed') THEN 1 ELSE 0 END), 0) AS active_bottles,
         COALESCE(SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END), 0) AS open_bottles,
         COALESCE(SUM(CASE WHEN status = 'empty' THEN 1 ELSE 0 END), 0) AS empty_bottles,
         COALESCE(SUM(CASE WHEN status = 'broken' THEN 1 ELSE 0 END), 0) AS broken_bottles,
         COALESCE(SUM(purchase_cost), 0) AS total_purchase_cost,
         COALESCE(SUM(selling_price), 0) AS total_value
       FROM liquor_bottles WHERE is_active = 1`,
    );
    const c = counts[0];
    return {
      totalBottles: Number(c.total),
      totalMl: Number(c.total_ml),
      activeBottles: Number(c.active_bottles),
      openBottles: Number(c.open_bottles),
      emptyBottles: Number(c.empty_bottles),
      brokenBottles: Number(c.broken_bottles),
      totalValue: Number(c.total_value),
      totalPurchaseCost: Number(c.total_purchase_cost),
    };
  },

  async getDailyExciseSummary(
    date: string,
    counter?: string,
  ): Promise<T.ExciseSummary> {
    return ExciseService.getExciseSummary(date, counter);
  },
};

// ── 8. ValidationService ──────────────────────────────────────────────

export const ValidationService = {
  validateCreateBrand(dto: T.CreateBrandDto): string[] {
    const errors: string[] = [];
    if (!dto.name || dto.name.trim().length === 0)
      errors.push('Brand name is required');
    else if (dto.name.length > 200)
      errors.push('Brand name must be 200 characters or less');
    if (!dto.categoryId) errors.push('Category ID is required');
    if (!dto.manufacturer || dto.manufacturer.trim().length === 0)
      errors.push('Manufacturer is required');
    if (dto.proof === undefined || dto.proof === null)
      errors.push('Proof is required');
    else if (typeof dto.proof !== 'number' || isNaN(dto.proof))
      errors.push('Proof must be a number');
    else if (dto.proof < 0 || dto.proof > 200)
      errors.push('Proof must be between 0 and 200');
    if (!dto.country || dto.country.trim().length === 0)
      errors.push('Country is required');
    return errors;
  },

  validateCreateBottle(dto: T.CreateBottleDto): string[] {
    const errors: string[] = [];
    if (!dto.brandId) errors.push('Brand ID is required');
    if (!dto.sizeMl || dto.sizeMl <= 0) errors.push('Size must be positive');
    else if (!T.STANDARD_BOTTLE_SIZES_ML.includes(dto.sizeMl)) {
      errors.push(
        `Size ${dto.sizeMl}ml is not a standard bottle size. Standard sizes: ${T.STANDARD_BOTTLE_SIZES_ML.join(', ')}`,
      );
    }
    if (dto.purchaseCost === undefined || dto.purchaseCost < 0)
      errors.push('Purchase cost must be >= 0');
    if (dto.sellingPrice === undefined || dto.sellingPrice < 0)
      errors.push('Selling price must be >= 0');
    if (dto.mrp === undefined || dto.mrp < 0) errors.push('MRP must be >= 0');
    return errors;
  },

  validateCreateBarSale(dto: T.CreateBarSaleDto): string[] {
    const errors: string[] = [];
    if (!dto.counter || dto.counter.trim().length === 0)
      errors.push('Counter is required');
    if (!dto.lines || dto.lines.length === 0)
      errors.push('At least one line is required');
    if (dto.lines) {
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        if (!line.brandId) errors.push(`Line ${i + 1}: brand ID is required`);
        if (!line.pegSizeMl || line.pegSizeMl <= 0)
          errors.push(`Line ${i + 1}: peg size must be positive`);
        if (!line.quantity || line.quantity <= 0)
          errors.push(`Line ${i + 1}: quantity must be positive`);
        if (line.unitPrice < 0)
          errors.push(`Line ${i + 1}: unit price cannot be negative`);
        if (line.pourType && !T.VALID_POUR_TYPES.includes(line.pourType)) {
          errors.push(`Line ${i + 1}: invalid pour type: ${line.pourType}`);
        }
      }
    }
    return errors;
  },

  validateBottleTransition(
    current: T.BottleStatus,
    next: T.BottleStatus,
  ): string | null {
    const allowed = T.BOTTLE_TRANSITIONS[current];
    if (!allowed) return `Invalid current status: ${current}`;
    if (!allowed.includes(next))
      return `Invalid transition: ${current} -> ${next}`;
    const key = `${current}->${next}`;
    const perms = T.BOTTLE_TRANSITION_PERMISSIONS[key];
    if (!perms) return `No permission mapping for transition: ${key}`;
    return null;
  },
};

// ── Export ─────────────────────────────────────────────────────────────

export const liquorService = {
  pegEngine: PegEngineService,
  bottleLifecycle: BottleLifecycleService,
  barSale: BarSaleService,
  inventory: BarInventoryService,
  excise: ExciseService,
  pricing: PricingService,
  reporting: ReportingService,
  validation: ValidationService,
};
