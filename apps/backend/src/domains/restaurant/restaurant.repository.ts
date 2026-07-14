import { query, run, db } from '../../db';
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Recipe,
  RecipeIngredient,
  KitchenStation,
  DiningSession,
  RestaurantOrder,
  OrderLine,
  Kot,
  KotItem,
  Bill,
  Payment,
  OrderEvent,
  PaginatedResult,
  TableFilter,
  MenuFilter,
  OrderFilter,
  CreateTableDto,
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  CreateRecipeDto,
  CreateKitchenStationDto,
  CreateOrderDto,
  CreateOrderLineDto,
  CreateKotDto,
  CreateBillDto,
  CreatePaymentDto,
  OrderStatus,
  OrderLineStatus,
  KotStatus,
  KotItemStatus,
  BillStatus,
  OrderType,
} from './restaurant.types';
import { ORDER_TRANSITIONS } from './restaurant.types';

function rowToTable(row: any): DiningTable {
  return {
    id: row.id,
    tableNo: row.table_no,
    capacity: Number(row.capacity),
    area: row.area,
    status: row.status,
    posX: row.pos_x != null ? Number(row.pos_x) : null,
    posY: row.pos_y != null ? Number(row.pos_y) : null,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToMenuCategory(row: any): MenuCategory {
  return {
    id: row.id,
    name: row.name,
    displayOrder: Number(row.display_order),
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name || '',
    name: row.name,
    description: row.description || null,
    price: Number(row.price),
    unit: row.unit || 'unit',
    isVegetarian: Boolean(row.is_vegetarian ?? false),
    isVegan: Boolean(row.is_vegan ?? false),
    isGlutenFree: Boolean(row.is_gluten_free ?? false),
    isActive: Boolean(row.is_active ?? true),
    imageUrl: row.image_url || null,
    preparationTime: Number(row.preparation_time || 0),
    course: row.course || 'main',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    name: row.name,
    yieldQty: Number(row.yield_qty || 1),
    yieldUnit: row.yield_unit || 'unit',
    instructions: row.instructions || null,
    prepTime: Number(row.prep_time || 0),
    cookTime: Number(row.cook_time || 0),
    wasteFactor: Number(row.waste_factor || 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    ingredients: [],
  };
}

function rowToRecipeIngredient(row: any): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    inventoryItemId: row.inventory_item_id || null,
    inventoryItemName: row.inventory_item_name || '',
    quantity: Number(row.quantity),
    unit: row.unit,
    wasteFactor: Number(row.waste_factor || 0),
    isAlternative: Boolean(row.is_alternative ?? false),
    alternativeGroup: row.alternative_group || null,
  };
}

function rowToStation(row: any): KitchenStation {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || null,
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToOrder(row: any): RestaurantOrder {
  return {
    id: row.id,
    orderNo: row.order_no,
    sessionId: row.session_id || null,
    tableId: row.table_id || null,
    tableNo: row.table_no || null,
    type: row.type || 'dine-in',
    status: row.status || 'draft',
    subtotal: Number(row.subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    discountPercent: Number(row.discount_percent || 0),
    discountReason: row.discount_reason || null,
    serviceCharge: Number(row.service_charge || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    notes: row.notes || null,
    guestCount: Number(row.guest_count || 1),
    createdBy: row.created_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lines: [],
    events: [],
  };
}

function rowToOrderLine(row: any): OrderLine {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name || '',
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price || 0),
    lineTotal: Number(row.line_total || 0),
    discountAmount: Number(row.discount_amount || 0),
    discountPercent: Number(row.discount_percent || 0),
    discountReason: row.discount_reason || null,
    isComplimentary: Boolean(row.is_complimentary ?? false),
    complimentaryReason: row.complimentary_reason || null,
    notes: row.notes || null,
    course: row.course || 'main',
    status: row.status || 'open',
    kotId: row.kot_id || null,
    createdAt: row.created_at || '',
  };
}

function rowToKot(row: any): Kot {
  return {
    id: row.id,
    kotNumber: row.kot_number,
    orderId: row.order_id,
    orderNo: row.order_no || '',
    stationId: row.station_id || null,
    stationName: row.station_name || null,
    status: row.status || 'pending',
    priority: Number(row.priority || 0),
    course: row.course || 'main',
    notes: row.notes || null,
    createdBy: row.created_by || null,
    printedAt: row.printed_at || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    items: [],
  };
}

function rowToKotItem(row: any): KotItem {
  return {
    id: row.id,
    kotId: row.kot_id,
    orderLineId: row.order_line_id,
    menuItemName: row.menu_item_name || '',
    quantity: Number(row.quantity),
    notes: row.notes || null,
    status: row.status || 'pending',
  };
}

function rowToBill(row: any): Bill {
  return {
    id: row.id,
    billNumber: row.bill_number,
    orderId: row.order_id,
    subtotal: Number(row.subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    serviceCharge: Number(row.service_charge || 0),
    taxAmount: Number(row.tax_amount || 0),
    roundingAdjustment: Number(row.rounding_adjustment || 0),
    totalAmount: Number(row.total_amount || 0),
    status: row.status || 'open',
    notes: row.notes || null,
    createdBy: row.created_by || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at || '',
    payments: [],
  };
}

function rowToPayment(row: any): Payment {
  return {
    id: row.id,
    billId: row.bill_id,
    mode: row.mode,
    amount: Number(row.amount),
    reference: row.reference || null,
    tipAmount: Number(row.tip_amount || 0),
    notes: row.notes || null,
    processedBy: row.processed_by || null,
    processedAt: row.processed_at || '',
  };
}

function rowToSession(row: any): DiningSession {
  return {
    id: row.id,
    tableId: row.table_id,
    tableNo: row.table_no || '',
    orderId: row.order_id || null,
    orderNo: row.order_no || null,
    guestCount: Number(row.guest_count || 1),
    guestName: row.guest_name || null,
    phone: row.phone || null,
    type: row.type || 'dine-in',
    roomNo: row.room_no || null,
    startedAt: row.started_at || '',
    endedAt: row.ended_at || null,
    isActive: Boolean(row.is_active ?? true),
  };
}

function rowToEvent(row: any): OrderEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    eventType: row.event_type,
    fromStatus: row.from_status || null,
    toStatus: row.to_status || null,
    data: row.data || null,
    createdBy: row.created_by || null,
    timestamp: row.timestamp || '',
  };
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function orderNo(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${y}${m}-${seq}`;
}

function kotNo(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `KOT-${y}${m}-${seq}`;
}

function billNo(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 90000) + 10000;
  return `BIL-${y}${m}-${seq}`;
}

function buildWhere(conditions: string[], params: any[]): string {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export const RestaurantRepository = {
  // ── Tables ──────────────────────────────────────────────────────────

  async createTable(dto: CreateTableDto): Promise<DiningTable> {
    const id = uid('tbl');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO dining_tables (id, table_no, capacity, area, status, pos_x, pos_y, is_active, created_at)
       VALUES (?, ?, ?, ?, 'available', ?, ?, 1, ?)`,
      [
        id,
        dto.tableNo,
        dto.capacity,
        dto.area || 'main',
        dto.posX ?? null,
        dto.posY ?? null,
        now,
      ],
    );
    const rows = await query('SELECT * FROM dining_tables WHERE id = ?', [id]);
    return rowToTable(rows[0]);
  },

  async findTableById(id: string): Promise<DiningTable | null> {
    const rows = await query('SELECT * FROM dining_tables WHERE id = ?', [id]);
    return rows.length ? rowToTable(rows[0]) : null;
  },

  async findTableByNo(tableNo: string): Promise<DiningTable | null> {
    const rows = await query('SELECT * FROM dining_tables WHERE table_no = ?', [
      tableNo,
    ]);
    return rows.length ? rowToTable(rows[0]) : null;
  },

  async listTables(
    filter: TableFilter = {},
  ): Promise<PaginatedResult<DiningTable>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    if (filter.area) {
      conditions.push('area = ?');
      params.push(filter.area);
    }
    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter.search) {
      conditions.push('table_no LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM dining_tables ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM dining_tables ${where} ORDER BY table_no ASC LIMIT ? OFFSET ?`,
      [...params, filter.limit ?? 100, filter.offset ?? 0],
    );
    return {
      data: rows.map(rowToTable),
      total,
      offset: filter.offset ?? 0,
      limit: filter.limit ?? 100,
    };
  },

  async updateTable(
    id: string,
    dto: Partial<CreateTableDto>,
  ): Promise<DiningTable> {
    const existing = await this.findTableById(id);
    if (!existing) throw new Error(`Table not found: ${id}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (dto.tableNo !== undefined) {
      sets.push('table_no = ?');
      params.push(dto.tableNo);
    }
    if (dto.capacity !== undefined) {
      sets.push('capacity = ?');
      params.push(dto.capacity);
    }
    if (dto.area !== undefined) {
      sets.push('area = ?');
      params.push(dto.area);
    }
    if (dto.posX !== undefined) {
      sets.push('pos_x = ?');
      params.push(dto.posX);
    }
    if (dto.posY !== undefined) {
      sets.push('pos_y = ?');
      params.push(dto.posY);
    }

    if (params.length === 0) return existing;
    await run(`UPDATE dining_tables SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM dining_tables WHERE id = ?', [id]);
    return rowToTable(rows[0]);
  },

  async archiveTable(id: string): Promise<void> {
    await run('UPDATE dining_tables SET is_active = 0 WHERE id = ?', [id]);
  },

  // ── Menu Categories ─────────────────────────────────────────────────

  async createMenuCategory(dto: CreateMenuCategoryDto): Promise<MenuCategory> {
    const id = uid('cat');
    const displayOrder = dto.displayOrder ?? 0;
    await run(
      'INSERT INTO menu_categories (id, name, display_order, is_active) VALUES (?, ?, ?, 1)',
      [id, dto.name, displayOrder],
    );
    const rows = await query('SELECT * FROM menu_categories WHERE id = ?', [
      id,
    ]);
    return rowToMenuCategory(rows[0]);
  },

  async listMenuCategories(): Promise<MenuCategory[]> {
    const rows = await query(
      'SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY display_order ASC',
    );
    return rows.map(rowToMenuCategory);
  },

  // ── Menu Items ─────────────────────────────────────────────────────

  async createMenuItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    const id = uid('mnu');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO menu_items (id, category_id, name, description, price, unit, is_vegetarian, is_vegan, is_gluten_free, is_active, image_url, preparation_time, course, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.categoryId,
        dto.name,
        dto.description || null,
        dto.price,
        dto.unit || 'unit',
        dto.isVegetarian ?? false,
        dto.isVegan ?? false,
        dto.isGlutenFree ?? false,
        dto.imageUrl || null,
        dto.preparationTime || 0,
        dto.course || 'main',
        now,
        now,
      ],
    );
    const item = await this.findMenuItemById(id);
    if (!item) throw new Error('Failed to create menu item');
    return item;
  },

  async findMenuItemById(id: string): Promise<MenuItem | null> {
    const rows = await query(
      `SELECT mi.*, mc.name as category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mi.category_id = mc.id
       WHERE mi.id = ?`,
      [id],
    );
    return rows.length ? rowToMenuItem(rows[0]) : null;
  },

  async listMenuItems(
    filter: MenuFilter = {},
  ): Promise<PaginatedResult<MenuItem>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    if (filter.categoryId) {
      conditions.push('mi.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.isActive !== undefined) {
      conditions.push('mi.is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter.course) {
      conditions.push('mi.course = ?');
      params.push(filter.course);
    }
    if (filter.search) {
      conditions.push('mi.name LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM menu_items mi ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT mi.*, mc.name as category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mi.category_id = mc.id
       ${where}
       ORDER BY mi.name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToMenuItem), total, offset, limit };
  },

  async updateMenuItem(
    id: string,
    dto: Partial<CreateMenuItemDto>,
  ): Promise<MenuItem> {
    const existing = await this.findMenuItemById(id);
    if (!existing) throw new Error(`Menu item not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (dto.categoryId !== undefined) {
      sets.push('category_id = ?');
      params.push(dto.categoryId);
    }
    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      params.push(dto.description);
    }
    if (dto.price !== undefined) {
      sets.push('price = ?');
      params.push(dto.price);
    }
    if (dto.unit !== undefined) {
      sets.push('unit = ?');
      params.push(dto.unit);
    }
    if (dto.isVegetarian !== undefined) {
      sets.push('is_vegetarian = ?');
      params.push(dto.isVegetarian ? 1 : 0);
    }
    if (dto.isVegan !== undefined) {
      sets.push('is_vegan = ?');
      params.push(dto.isVegan ? 1 : 0);
    }
    if (dto.isGlutenFree !== undefined) {
      sets.push('is_gluten_free = ?');
      params.push(dto.isGlutenFree ? 1 : 0);
    }
    if (dto.preparationTime !== undefined) {
      sets.push('preparation_time = ?');
      params.push(dto.preparationTime);
    }
    if (dto.course !== undefined) {
      sets.push('course = ?');
      params.push(dto.course);
    }
    if (dto.imageUrl !== undefined) {
      sets.push('image_url = ?');
      params.push(dto.imageUrl);
    }
    if (dto.description !== undefined) {
      sets.push('description = ?');
      params.push(dto.description);
    }

    if (params.length === 0) return existing;
    await run(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const item = await this.findMenuItemById(id);
    if (!item) throw new Error(`Menu item not found after update: ${id}`);
    return item;
  },

  async archiveMenuItem(id: string): Promise<void> {
    await run(
      'UPDATE menu_items SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  // ── Recipes ──────────────────────────────────────────────────────────

  async createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
    const id = uid('rcp');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO recipes (id, menu_item_id, name, yield_qty, yield_unit, instructions, prep_time, cook_time, waste_factor, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        dto.menuItemId,
        dto.name,
        dto.yieldQty ?? 1,
        dto.yieldUnit || 'unit',
        dto.instructions || null,
        dto.prepTime || 0,
        dto.cookTime || 0,
        dto.wasteFactor || 0,
        now,
        now,
      ],
    );
    for (const ing of dto.ingredients) {
      const ingId = uid('ing');
      await run(
        `INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, inventory_item_name, quantity, unit, waste_factor, is_alternative, alternative_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ingId,
          id,
          ing.inventoryItemId || null,
          ing.inventoryItemName,
          ing.quantity,
          ing.unit,
          ing.wasteFactor || 0,
          ing.isAlternative ?? false,
          ing.alternativeGroup || null,
        ],
      );
    }
    return await this.findRecipeByMenuItemId(dto.menuItemId);
  },

  async findRecipeByMenuItemId(menuItemId: string): Promise<Recipe> {
    const rows = await query(
      'SELECT * FROM recipes WHERE menu_item_id = ? AND is_active = 1',
      [menuItemId],
    );
    if (!rows.length)
      throw new Error(`Recipe not found for menu item: ${menuItemId}`);
    const recipe = rowToRecipe(rows[0]);
    const ingRows = await query(
      'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
      [recipe.id],
    );
    recipe.ingredients = ingRows.map(rowToRecipeIngredient);
    return recipe;
  },

  async listRecipes(): Promise<Recipe[]> {
    const rows = await query(
      'SELECT * FROM recipes WHERE is_active = 1 ORDER BY name',
    );
    const recipes: Recipe[] = [];
    for (const row of rows) {
      const recipe = rowToRecipe(row);
      const ingRows = await query(
        'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
        [recipe.id],
      );
      recipe.ingredients = ingRows.map(rowToRecipeIngredient);
      recipes.push(recipe);
    }
    return recipes;
  },

  async updateRecipe(
    id: string,
    dto: Partial<CreateRecipeDto>,
  ): Promise<Recipe> {
    const existing = await query('SELECT * FROM recipes WHERE id = ?', [id]);
    if (!existing.length) throw new Error(`Recipe not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.yieldQty !== undefined) {
      sets.push('yield_qty = ?');
      params.push(dto.yieldQty);
    }
    if (dto.yieldUnit !== undefined) {
      sets.push('yield_unit = ?');
      params.push(dto.yieldUnit);
    }
    if (dto.instructions !== undefined) {
      sets.push('instructions = ?');
      params.push(dto.instructions);
    }
    if (dto.prepTime !== undefined) {
      sets.push('prep_time = ?');
      params.push(dto.prepTime);
    }
    if (dto.cookTime !== undefined) {
      sets.push('cook_time = ?');
      params.push(dto.cookTime);
    }
    if (dto.wasteFactor !== undefined) {
      sets.push('waste_factor = ?');
      params.push(dto.wasteFactor);
    }

    if (params.length > 1) {
      await run(`UPDATE recipes SET ${sets.join(', ')} WHERE id = ?`, [
        ...params,
        id,
      ]);
    }

    if (dto.ingredients) {
      await run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
      for (const ing of dto.ingredients) {
        const ingId = uid('ing');
        await run(
          `INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, inventory_item_name, quantity, unit, waste_factor, is_alternative, alternative_group)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ingId,
            id,
            ing.inventoryItemId || null,
            ing.inventoryItemName,
            ing.quantity,
            ing.unit,
            ing.wasteFactor || 0,
            ing.isAlternative ?? false,
            ing.alternativeGroup || null,
          ],
        );
      }
    }

    return await this.findRecipeByMenuItemId(existing[0].menu_item_id);
  },

  async deleteRecipe(id: string): Promise<void> {
    await run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
    await run('DELETE FROM recipes WHERE id = ?', [id]);
  },

  // ── Kitchen Stations ─────────────────────────────────────────────────

  async createKitchenStation(
    dto: CreateKitchenStationDto,
  ): Promise<KitchenStation> {
    const id = uid('sta');
    await run(
      'INSERT INTO kitchen_stations (id, name, code, description, is_active) VALUES (?, ?, ?, ?, 1)',
      [id, dto.name, dto.code, dto.description || null],
    );
    const rows = await query('SELECT * FROM kitchen_stations WHERE id = ?', [
      id,
    ]);
    return rowToStation(rows[0]);
  },

  async listKitchenStations(): Promise<KitchenStation[]> {
    const rows = await query(
      'SELECT * FROM kitchen_stations WHERE is_active = 1 ORDER BY name',
    );
    return rows.map(rowToStation);
  },

  async findKitchenStationByCode(code: string): Promise<KitchenStation | null> {
    const rows = await query('SELECT * FROM kitchen_stations WHERE code = ?', [
      code,
    ]);
    return rows.length ? rowToStation(rows[0]) : null;
  },

  // ── Orders ───────────────────────────────────────────────────────────

  async createOrder(
    dto: CreateOrderDto,
    createdBy?: string,
  ): Promise<RestaurantOrder> {
    const id = uid('ord');
    const now = new Date().toISOString();
    const no = orderNo();

    await run(
      `INSERT INTO restaurant_orders (id, order_no, session_id, table_id, type, status, subtotal, discount_amount, discount_percent, discount_reason, service_charge, tax_amount, total_amount, notes, guest_count, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', 0, 0, 0, NULL, 0, 0, 0, ?, ?, ?, ?, ?)`,
      [
        id,
        no,
        dto.sessionId || null,
        dto.tableId || null,
        dto.type || 'dine-in',
        dto.notes || null,
        dto.guestCount || 1,
        dto.guestName || null,
        dto.phone || null,
        dto.roomNo || null,
        createdBy || null,
        now,
        now,
      ],
    );

    for (const line of dto.lines) {
      const lineId = uid('lin');
      const menuItem = await query('SELECT * FROM menu_items WHERE id = ?', [
        line.menuItemId,
      ]);
      const itemName = menuItem.length ? menuItem[0].name : '';
      const unitPrice = menuItem.length ? Number(menuItem[0].price) : 0;
      const lineTotal = unitPrice * line.quantity;
      await run(
        `INSERT INTO order_lines (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, line_total, discount_amount, discount_percent, discount_reason, is_complimentary, complimentary_reason, notes, course, status, kot_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 0, NULL, ?, ?, 'open', NULL, ?)`,
        [
          lineId,
          id,
          line.menuItemId,
          itemName,
          line.quantity,
          unitPrice,
          lineTotal,
          line.notes || null,
          line.course || 'main',
          now,
        ],
      );
    }

    await this.recordOrderEvent(
      id,
      'ORDER_CREATED',
      null,
      'draft',
      null,
      createdBy,
    );
    return await this.findOrderById(id);
  },

  async findOrderById(id: string): Promise<RestaurantOrder> {
    const rows = await query(
      `SELECT o.*, dt.table_no
       FROM restaurant_orders o
       LEFT JOIN dining_tables dt ON o.table_id = dt.id
       WHERE o.id = ?`,
      [id],
    );
    if (!rows.length) throw new Error(`Order not found: ${id}`);
    const order = rowToOrder(rows[0]);
    order.lines = await this.getOrderLines(id);
    order.events = await this.getOrderEvents(id);
    return order;
  },

  async findOrderByBillId(billId: string): Promise<RestaurantOrder | null> {
    const rows = await query(
      `SELECT o.* FROM restaurant_orders o
       JOIN bills b ON b.order_id = o.id
       WHERE b.id = ?`,
      [billId],
    );
    if (!rows.length) return null;
    const order = rowToOrder(rows[0]);
    order.lines = await this.getOrderLines(order.id);
    return order;
  },

  async findOrderByNo(orderNo: string): Promise<RestaurantOrder> {
    const rows = await query(
      `SELECT o.*, dt.table_no
       FROM restaurant_orders o
       LEFT JOIN dining_tables dt ON o.table_id = dt.id
       WHERE o.order_no = ?`,
      [orderNo],
    );
    if (!rows.length) throw new Error(`Order not found: ${orderNo}`);
    const order = rowToOrder(rows[0]);
    order.lines = await this.getOrderLines(order.id);
    order.events = await this.getOrderEvents(order.id);
    return order;
  },

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
  ): Promise<RestaurantOrder> {
    const order = await this.findOrderById(id);
    const allowed = ORDER_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(status)) {
      throw new Error(
        `Invalid status transition: ${order.status} -> ${status}`,
      );
    }
    const now = new Date().toISOString();
    await run(
      'UPDATE restaurant_orders SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id],
    );
    await this.recordOrderEvent(
      id,
      `ORDER_${status.toUpperCase()}` as any,
      order.status,
      status,
      null,
      null,
    );
    return await this.findOrderById(id);
  },

  async listOrders(
    filter: OrderFilter = {},
  ): Promise<PaginatedResult<RestaurantOrder>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const orderBy = filter.orderBy || 'created_at';
    const orderDir = filter.orderDir || 'desc';
    const allowedOrders = [
      'created_at',
      'order_no',
      'status',
      'type',
      'total_amount',
      'updated_at',
    ];
    const safeOrderBy = allowedOrders.includes(orderBy)
      ? orderBy
      : 'created_at';
    const safeOrderDir = orderDir === 'asc' ? 'ASC' : 'DESC';

    if (filter.status) {
      conditions.push('o.status = ?');
      params.push(filter.status);
    }
    if (filter.type) {
      conditions.push('o.type = ?');
      params.push(filter.type);
    }
    if (filter.tableId) {
      conditions.push('o.table_id = ?');
      params.push(filter.tableId);
    }
    if (filter.fromDate) {
      conditions.push('o.created_at >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('o.created_at <= ?');
      params.push(filter.toDate);
    }
    if (filter.search) {
      conditions.push('o.order_no LIKE ?');
      params.push(`%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM restaurant_orders o ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT o.*, dt.table_no
       FROM restaurant_orders o
       LEFT JOIN dining_tables dt ON o.table_id = dt.id
       ${where}
       ORDER BY o.${safeOrderBy} ${safeOrderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToOrder), total, offset, limit };
  },

  async addOrderLine(
    orderId: string,
    dto: CreateOrderLineDto,
  ): Promise<OrderLine> {
    const id = uid('lin');
    const now = new Date().toISOString();
    const menuItem = await query('SELECT * FROM menu_items WHERE id = ?', [
      dto.menuItemId,
    ]);
    const itemName = menuItem.length ? menuItem[0].name : '';
    const unitPrice = menuItem.length ? Number(menuItem[0].price) : 0;
    const lineTotal = unitPrice * dto.quantity;
    await run(
      `INSERT INTO order_lines (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, line_total, discount_amount, discount_percent, discount_reason, is_complimentary, complimentary_reason, notes, course, status, kot_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 0, NULL, ?, ?, 'open', NULL, ?)`,
      [
        id,
        orderId,
        dto.menuItemId,
        menuItem.length ? menuItem[0].name : '',
        dto.quantity,
        unitPrice,
        lineTotal,
        dto.notes || null,
        dto.course || 'main',
        now,
      ],
    );
    await this.recalculateOrder(orderId);
    await this.recordOrderEvent(
      orderId,
      'ITEM_ADDED',
      null,
      null,
      JSON.stringify({ menuItemId: dto.menuItemId, quantity: dto.quantity }),
      null,
    );
    const rows = await query('SELECT * FROM order_lines WHERE id = ?', [id]);
    return rowToOrderLine(rows[0]);
  },

  async updateOrderLine(
    lineId: string,
    dto: Partial<CreateOrderLineDto>,
  ): Promise<OrderLine> {
    const existing = await query('SELECT * FROM order_lines WHERE id = ?', [
      lineId,
    ]);
    if (!existing.length) throw new Error(`Order line not found: ${lineId}`);

    const sets: string[] = [];
    const params: any[] = [];

    if (dto.quantity !== undefined) {
      sets.push('quantity = ?');
      params.push(dto.quantity);
      const unitPrice = Number(existing[0].unit_price);
      sets.push('line_total = ?');
      params.push(unitPrice * dto.quantity);
    }
    if (dto.notes !== undefined) {
      sets.push('notes = ?');
      params.push(dto.notes);
    }
    if (dto.course !== undefined) {
      sets.push('course = ?');
      params.push(dto.course);
    }

    if (params.length) {
      await run(`UPDATE order_lines SET ${sets.join(', ')} WHERE id = ?`, [
        ...params,
        lineId,
      ]);
      await this.recalculateOrder(existing[0].order_id);
    }
    const rows = await query('SELECT * FROM order_lines WHERE id = ?', [
      lineId,
    ]);
    return rowToOrderLine(rows[0]);
  },

  async removeOrderLine(lineId: string): Promise<void> {
    const existing = await query('SELECT * FROM order_lines WHERE id = ?', [
      lineId,
    ]);
    if (!existing.length) throw new Error(`Order line not found: ${lineId}`);
    const orderId = existing[0].order_id;
    await run('DELETE FROM order_lines WHERE id = ?', [lineId]);
    await this.recalculateOrder(orderId);
    await this.recordOrderEvent(
      orderId,
      'ITEM_REMOVED',
      null,
      null,
      JSON.stringify({ lineId }),
      null,
    );
  },

  async updateOrderLineStatus(
    lineId: string,
    status: OrderLineStatus,
  ): Promise<OrderLine> {
    await run('UPDATE order_lines SET status = ? WHERE id = ?', [
      status,
      lineId,
    ]);
    const rows = await query('SELECT * FROM order_lines WHERE id = ?', [
      lineId,
    ]);
    return rowToOrderLine(rows[0]);
  },

  async recalculateOrder(id: string): Promise<void> {
    const lines = await query(
      "SELECT * FROM order_lines WHERE order_id = ? AND status != 'cancelled'",
      [id],
    );
    const subtotal = lines.reduce(
      (sum: number, l: any) => sum + Number(l.line_total || 0),
      0,
    );
    const order = await query('SELECT * FROM restaurant_orders WHERE id = ?', [
      id,
    ]);
    if (!order.length) return;
    const o = order[0];
    const discountPercent = Number(o.discount_percent || 0);
    const discountAmount =
      discountPercent > 0
        ? subtotal * (discountPercent / 100)
        : Number(o.discount_amount || 0);
    const serviceCharge = subtotal * (Number(o.service_charge_rate || 0) / 100);
    const taxAmount = Number(o.tax_amount || 0);
    const totalAmount = subtotal - discountAmount + serviceCharge + taxAmount;

    await run(
      `UPDATE restaurant_orders SET subtotal = ?, discount_amount = ?, service_charge = ?, tax_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?`,
      [
        subtotal,
        discountAmount,
        serviceCharge,
        taxAmount,
        totalAmount,
        new Date().toISOString(),
        id,
      ],
    );
  },

  // ── KOT ──────────────────────────────────────────────────────────────

  async createKot(dto: CreateKotDto, createdBy?: string): Promise<Kot> {
    const id = uid('kot');
    const now = new Date().toISOString();
    const no = kotNo();

    await run(
      `INSERT INTO kots (id, kot_number, order_id, station_id, status, priority, course, notes, created_by, printed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, ?)`,
      [
        id,
        no,
        dto.orderId,
        dto.stationId || null,
        dto.priority || 0,
        dto.course || 'main',
        dto.notes || null,
        createdBy || null,
        now,
        now,
      ],
    );

    for (const lineId of dto.itemIds) {
      const itemId = uid('kli');
      const line = await query('SELECT * FROM order_lines WHERE id = ?', [
        lineId,
      ]);
      const itemName = line.length ? line[0].menu_item_name : '';
      const qty = line.length ? Number(line[0].quantity) : 0;
      const notes = line.length ? line[0].notes : null;
      await run(
        `INSERT INTO kot_items (id, kot_id, order_line_id, menu_item_name, quantity, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [itemId, id, lineId, itemName, qty, notes],
      );
      await run('UPDATE order_lines SET kot_id = ? WHERE id = ?', [id, lineId]);
    }

    await this.recordOrderEvent(
      dto.orderId,
      'KOT_GENERATED',
      null,
      null,
      JSON.stringify({ kotId: id, kotNumber: no }),
      createdBy,
    );
    const rows = await query(
      `SELECT k.*, ro.order_no, ks.name as station_name
       FROM kots k
       LEFT JOIN restaurant_orders ro ON k.order_id = ro.id
       LEFT JOIN kitchen_stations ks ON k.station_id = ks.id
       WHERE k.id = ?`,
      [id],
    );
    const kot = rowToKot(rows[0]);
    kot.items = await this.getKotItems(id);
    return kot;
  },

  async findKotById(id: string): Promise<Kot> {
    const rows = await query(
      `SELECT k.*, ro.order_no, ks.name as station_name
       FROM kots k
       LEFT JOIN restaurant_orders ro ON k.order_id = ro.id
       LEFT JOIN kitchen_stations ks ON k.station_id = ks.id
       WHERE k.id = ?`,
      [id],
    );
    if (!rows.length) throw new Error(`KOT not found: ${id}`);
    const kot = rowToKot(rows[0]);
    kot.items = await this.getKotItems(id);
    return kot;
  },

  async findKotByOrderId(orderId: string): Promise<Kot[]> {
    const rows = await query(
      `SELECT k.*, ro.order_no, ks.name as station_name
       FROM kots k
       LEFT JOIN restaurant_orders ro ON k.order_id = ro.id
       LEFT JOIN kitchen_stations ks ON k.station_id = ks.id
       WHERE k.order_id = ?
       ORDER BY k.created_at DESC`,
      [orderId],
    );
    const kots: Kot[] = [];
    for (const row of rows) {
      const kot = rowToKot(row);
      kot.items = await this.getKotItems(kot.id);
      kots.push(kot);
    }
    return kots;
  },

  async listKotsByStation(
    stationId: string,
    status?: KotStatus,
  ): Promise<Kot[]> {
    const conditions: string[] = ['k.station_id = ?'];
    const params: any[] = [stationId];
    if (status) {
      conditions.push('k.status = ?');
      params.push(status);
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT k.*, ro.order_no, ks.name as station_name
       FROM kots k
       LEFT JOIN restaurant_orders ro ON k.order_id = ro.id
       LEFT JOIN kitchen_stations ks ON k.station_id = ks.id
       ${where}
       ORDER BY k.priority DESC, k.created_at ASC`,
      params,
    );
    const kots: Kot[] = [];
    for (const row of rows) {
      const kot = rowToKot(row);
      kot.items = await this.getKotItems(kot.id);
      kots.push(kot);
    }
    return kots;
  },

  async updateKotStatus(id: string, status: KotStatus): Promise<Kot> {
    const now = new Date().toISOString();
    await run('UPDATE kots SET status = ?, updated_at = ? WHERE id = ?', [
      status,
      now,
      id,
    ]);
    return await this.findKotById(id);
  },

  async updateKotItemStatus(
    itemId: string,
    status: KotItemStatus,
  ): Promise<KotItem> {
    await run('UPDATE kot_items SET status = ? WHERE id = ?', [status, itemId]);
    const rows = await query('SELECT * FROM kot_items WHERE id = ?', [itemId]);
    return rowToKotItem(rows[0]);
  },

  async getKotQueue(stationId?: string): Promise<Kot[]> {
    const conditions: string[] = [
      "k.status IN ('pending', 'acknowledged', 'preparing')",
    ];
    const params: any[] = [];
    if (stationId) {
      conditions.push('k.station_id = ?');
      params.push(stationId);
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT k.*, ro.order_no, ks.name as station_name
       FROM kots k
       LEFT JOIN restaurant_orders ro ON k.order_id = ro.id
       LEFT JOIN kitchen_stations ks ON k.station_id = ks.id
       ${where}
       ORDER BY k.priority DESC, k.created_at ASC`,
      params,
    );
    const kots: Kot[] = [];
    for (const row of rows) {
      const kot = rowToKot(row);
      kot.items = await this.getKotItems(kot.id);
      kots.push(kot);
    }
    return kots;
  },

  // ── Bills ───────────────────────────────────────────────────────────

  async createBill(dto: CreateBillDto, createdBy?: string): Promise<Bill> {
    const id = uid('bil');
    const now = new Date().toISOString();
    const no = billNo();

    const order = await query('SELECT * FROM restaurant_orders WHERE id = ?', [
      dto.orderId,
    ]);
    if (!order.length) throw new Error(`Order not found: ${dto.orderId}`);
    const o = order[0];

    if (o.status !== 'completed') {
      await run(
        'UPDATE restaurant_orders SET status = ?, updated_at = ? WHERE id = ?',
        ['completed', now, dto.orderId],
      );
    }

    const subtotal = Number(o.subtotal || 0);
    const discountAmount = dto.discountAmount ?? Number(o.discount_amount || 0);
    const discountPercent =
      dto.discountPercent ?? Number(o.discount_percent || 0);
    const finalDiscount =
      discountPercent > 0 ? subtotal * (discountPercent / 100) : discountAmount;
    const serviceCharge = dto.serviceCharge ?? Number(o.service_charge || 0);
    const taxAmount = Number(o.tax_amount || 0);
    const totalAmount = subtotal - finalDiscount + serviceCharge + taxAmount;

    await run(
      `INSERT INTO bills (id, bill_number, order_id, subtotal, discount_amount, service_charge, tax_amount, rounding_adjustment, total_amount, status, notes, created_by, closed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'open', ?, ?, NULL, ?)`,
      [
        id,
        no,
        dto.orderId,
        subtotal,
        finalDiscount,
        serviceCharge,
        taxAmount,
        totalAmount,
        dto.notes || null,
        createdBy || null,
        now,
      ],
    );

    if (dto.discountReason) {
      await run(
        'UPDATE restaurant_orders SET discount_reason = ? WHERE id = ?',
        [dto.discountReason, dto.orderId],
      );
    }

    await this.recordOrderEvent(
      dto.orderId,
      'ORDER_COMPLETED',
      o.status,
      'completed',
      JSON.stringify({ billId: id, billNumber: no }),
      createdBy,
    );
    const rows = await query(`SELECT * FROM bills WHERE id = ?`, [id]);
    const bill = rowToBill(rows[0]);
    bill.payments = await this.listPayments(id);
    return bill;
  },

  async findBillById(id: string): Promise<Bill> {
    const rows = await query('SELECT * FROM bills WHERE id = ?', [id]);
    if (!rows.length) throw new Error(`Bill not found: ${id}`);
    const bill = rowToBill(rows[0]);
    bill.payments = await this.listPayments(id);
    return bill;
  },

  async findBillByOrderId(orderId: string): Promise<Bill | null> {
    const rows = await query(
      'SELECT * FROM bills WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId],
    );
    if (!rows.length) return null;
    const bill = rowToBill(rows[0]);
    bill.payments = await this.listPayments(bill.id);
    return bill;
  },

  async updateBillStatus(id: string, status: BillStatus): Promise<Bill> {
    await run('UPDATE bills SET status = ? WHERE id = ?', [status, id]);
    return await this.findBillById(id);
  },

  async closeBill(id: string, closedAt?: string): Promise<Bill> {
    const now = closedAt || new Date().toISOString();
    await run("UPDATE bills SET status = 'paid', closed_at = ? WHERE id = ?", [
      now,
      id,
    ]);
    const bill = await this.findBillById(id);
    await run(
      "UPDATE restaurant_orders SET status = 'paid', updated_at = ? WHERE id = ?",
      [now, bill.orderId],
    );
    await this.recordOrderEvent(
      bill.orderId,
      'BILL_CLOSED',
      null,
      'paid',
      JSON.stringify({ billId: id }),
      null,
    );
    return bill;
  },

  // ── Payments ────────────────────────────────────────────────────────

  async createPayment(
    dto: CreatePaymentDto,
    processedBy?: string,
  ): Promise<Payment> {
    const id = uid('pay');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO payments (id, bill_id, mode, amount, reference, tip_amount, notes, processed_by, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.billId,
        dto.mode,
        dto.amount,
        dto.reference || null,
        dto.tipAmount || 0,
        dto.notes || null,
        processedBy || null,
        now,
      ],
    );

    const bill = await query('SELECT * FROM bills WHERE id = ?', [dto.billId]);
    if (bill.length) {
      const payments = await query(
        'SELECT SUM(amount) as total_paid FROM payments WHERE bill_id = ?',
        [dto.billId],
      );
      const totalPaid = Number(payments[0]?.total_paid || 0);
      const totalAmount = Number(bill[0].total_amount || 0);
      if (totalPaid >= totalAmount) {
        await run("UPDATE bills SET status = 'paid' WHERE id = ?", [
          dto.billId,
        ]);
      } else if (totalPaid > 0) {
        await run("UPDATE bills SET status = 'partially_paid' WHERE id = ?", [
          dto.billId,
        ]);
      }
    }

    const rows = await query('SELECT * FROM payments WHERE id = ?', [id]);
    return rowToPayment(rows[0]);
  },

  async listPayments(billId: string): Promise<Payment[]> {
    const rows = await query(
      'SELECT * FROM payments WHERE bill_id = ? ORDER BY processed_at ASC',
      [billId],
    );
    return rows.map(rowToPayment);
  },

  // ── Events ──────────────────────────────────────────────────────────

  async recordOrderEvent(
    orderId: string,
    eventType: string,
    fromStatus?: string | null,
    toStatus?: string | null,
    data?: string | null,
    createdBy?: string | null,
  ): Promise<OrderEvent> {
    const id = uid('evt');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO order_events (id, order_id, event_type, from_status, to_status, data, created_by, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orderId,
        eventType,
        fromStatus || null,
        toStatus || null,
        data || null,
        createdBy || null,
        now,
      ],
    );
    const rows = await query('SELECT * FROM order_events WHERE id = ?', [id]);
    return rowToEvent(rows[0]);
  },

  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    const rows = await query(
      'SELECT * FROM order_events WHERE order_id = ? ORDER BY timestamp ASC',
      [orderId],
    );
    return rows.map(rowToEvent);
  },

  // ── Sessions ─────────────────────────────────────────────────────────

  async createSession(dto: {
    tableId: string;
    guestCount?: number;
    guestName?: string;
    phone?: string;
    type?: OrderType;
    roomNo?: string;
  }): Promise<DiningSession> {
    const id = uid('ses');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO dining_sessions (id, table_id, guest_count, guest_name, phone, type, room_no, started_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        dto.tableId,
        dto.guestCount || 1,
        dto.guestName || null,
        dto.phone || null,
        dto.type || 'dine-in',
        dto.roomNo || null,
        now,
      ],
    );
    await run("UPDATE dining_tables SET status = 'occupied' WHERE id = ?", [
      dto.tableId,
    ]);
    return await this.findSessionById(id);
  },

  async findSessionById(id: string): Promise<DiningSession> {
    const rows = await query(
      `SELECT ds.*, dt.table_no, ro.order_no
       FROM dining_sessions ds
       LEFT JOIN dining_tables dt ON ds.table_id = dt.id
       LEFT JOIN restaurant_orders ro ON ds.order_id = ro.id
       WHERE ds.id = ?`,
      [id],
    );
    if (!rows.length) throw new Error(`Session not found: ${id}`);
    return rowToSession(rows[0]);
  },

  async findActiveSessionByTableId(
    tableId: string,
  ): Promise<DiningSession | null> {
    const rows = await query(
      `SELECT ds.*, dt.table_no, ro.order_no
       FROM dining_sessions ds
       LEFT JOIN dining_tables dt ON ds.table_id = dt.id
       LEFT JOIN restaurant_orders ro ON ds.order_id = ro.id
       WHERE ds.table_id = ? AND ds.is_active = 1`,
      [tableId],
    );
    return rows.length ? rowToSession(rows[0]) : null;
  },

  async endSession(id: string): Promise<DiningSession> {
    const now = new Date().toISOString();
    await run(
      'UPDATE dining_sessions SET ended_at = ?, is_active = 0 WHERE id = ?',
      [now, id],
    );
    const session = await this.findSessionById(id);
    await run("UPDATE dining_tables SET status = 'available' WHERE id = ?", [
      session.tableId,
    ]);
    return session;
  },

  async getActiveSessions(): Promise<DiningSession[]> {
    const rows = await query(
      `SELECT ds.*, dt.table_no, ro.order_no
       FROM dining_sessions ds
       LEFT JOIN dining_tables dt ON ds.table_id = dt.id
       LEFT JOIN restaurant_orders ro ON ds.order_id = ro.id
       WHERE ds.is_active = 1
       ORDER BY ds.started_at ASC`,
    );
    return rows.map(rowToSession);
  },

  // ── Reporting ────────────────────────────────────────────────────────

  async getOrderSummary(fromDate?: string, toDate?: string): Promise<any> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (fromDate) {
      conditions.push('created_at >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('created_at <= ?');
      params.push(toDate);
    }
    const where = buildWhere(conditions, params);

    const totalResult = await query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue,
              COALESCE(AVG(total_amount), 0) as avg_order_value
       FROM restaurant_orders ${where}`,
      params,
    );
    const statusRows = await query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM restaurant_orders ${where}
       GROUP BY status`,
      params,
    );
    const statusBreakdown: Record<string, { count: number; revenue: number }> =
      {};
    for (const r of statusRows) {
      statusBreakdown[r.status] = {
        count: Number(r.count),
        revenue: Number(r.revenue),
      };
    }
    const row = totalResult[0];
    return {
      totalOrders: Number(row.total_orders),
      totalRevenue: Number(row.total_revenue),
      avgOrderValue:
        row.total_orders > 0
          ? Number(row.total_revenue) / Number(row.total_orders)
          : 0,
      statusBreakdown,
    };
  },

  async getTableTurnover(fromDate?: string, toDate?: string): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (fromDate) {
      conditions.push('ds.started_at >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('(ds.ended_at <= ? OR ds.ended_at IS NULL)');
      params.push(toDate);
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT dt.id as table_id, dt.table_no, dt.capacity, dt.area,
              COUNT(ds.id) as turnover_count,
              COALESCE(AVG(
                CASE WHEN ds.ended_at IS NOT NULL
                  THEN (julianday(ds.ended_at) - julianday(ds.started_at)) * 1440
                  ELSE NULL
                END
              ), 0) as avg_duration_minutes
       FROM dining_tables dt
       LEFT JOIN dining_sessions ds ON dt.id = ds.table_id ${conditions.length ? `AND ${conditions.join(' AND ')}` : ''}
       WHERE dt.is_active = 1
       GROUP BY dt.id
       ORDER BY turnover_count DESC`,
      params,
    );
    return rows.map((r: any) => ({
      tableId: r.id,
      tableNo: r.table_no,
      capacity: Number(r.capacity),
      area: r.area,
      turnoverCount: Number(r.turnover_count),
      avgDurationMinutes: Math.round(Number(r.avg_duration_minutes) || 0),
    }));
  },

  // ── Internal helpers ─────────────────────────────────────────────────

  async getOrderLines(orderId: string): Promise<OrderLine[]> {
    const rows = await query(
      'SELECT * FROM order_lines WHERE order_id = ? ORDER BY created_at ASC',
      [orderId],
    );
    return rows.map(rowToOrderLine);
  },

  async getKotItems(kotId: string): Promise<KotItem[]> {
    const rows = await query('SELECT * FROM kot_items WHERE kot_id = ?', [
      kotId,
    ]);
    return rows.map(rowToKotItem);
  },
};
