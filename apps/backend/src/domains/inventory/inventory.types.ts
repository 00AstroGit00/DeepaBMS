export type InvCategory =
  | 'food'
  | 'softdrink'
  | 'kitchen'
  | 'housekeeping'
  | 'consumables'
  | 'liquor'
  | 'packaging'
  | 'amenities';

export type MovementKind =
  | 'purchase'
  | 'sale'
  | 'consumption'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'physical_count'
  | 'damage'
  | 'expiry'
  | 'supplier_return'
  | 'customer_return'
  | 'complimentary'
  | 'opening_balance'
  | 'closing_adjustment';

export type CostMethod = 'fifo' | 'weighted_average';

export const MOVEMENT_SIGN: Record<MovementKind, 1 | -1> = {
  purchase: 1,
  sale: -1,
  consumption: -1,
  transfer_in: 1,
  transfer_out: -1,
  adjustment: 1,
  physical_count: 1,
  damage: -1,
  expiry: -1,
  supplier_return: -1,
  customer_return: 1,
  complimentary: -1,
  opening_balance: 1,
  closing_adjustment: 1,
};

export function movementDirection(kind: MovementKind): 'in' | 'out' {
  return MOVEMENT_SIGN[kind] === 1 ? 'in' : 'out';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: InvCategory;
  unit: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  maxStock: number;
  reorder: number;
  reorderQty: number;
  cost: number;
  costMethod: CostMethod;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  kind: MovementKind;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number;
  totalCost: number;
  operator: string;
  reference: string | null;
  reason: string | null;
  note: string | null;
  batchId: string | null;
  timestamp: string;
}

export interface InventorySummary {
  totalItems: number;
  activeItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  categoryBreakdown: Record<string, { count: number; value: number }>;
}

export interface LowStockItem {
  id: string;
  name: string;
  category: InvCategory;
  unit: string;
  stock: number;
  reorder: number;
  deficit: number;
}

export interface InventoryValuation {
  itemId: string;
  itemName: string;
  stock: number;
  unitCost: number;
  totalValue: number;
  costMethod: CostMethod;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateInventoryItemDto {
  name: string;
  category: InvCategory;
  unit: string;
  initialStock?: number;
  minStock?: number;
  maxStock?: number;
  reorder?: number;
  reorderQty?: number;
  cost?: number;
  costMethod?: CostMethod;
}

export interface UpdateInventoryItemDto {
  name?: string;
  category?: InvCategory;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  reorder?: number;
  reorderQty?: number;
  cost?: number;
  costMethod?: CostMethod;
}

export interface CreateMovementDto {
  itemId: string;
  kind: MovementKind;
  quantity: number;
  operator: string;
  reference?: string;
  reason?: string;
  note?: string;
  unitCost?: number;
  batchId?: string;
}

export interface InventoryFilter {
  category?: InvCategory;
  isActive?: boolean;
  search?: string;
  lowStock?: boolean;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface MovementFilter {
  itemId?: string;
  kind?: MovementKind;
  fromDate?: string;
  toDate?: string;
  operator?: string;
  batchId?: string;
  offset?: number;
  limit?: number;
}

export const CATEGORIES: InvCategory[] = [
  'food',
  'softdrink',
  'kitchen',
  'housekeeping',
  'consumables',
  'liquor',
  'packaging',
  'amenities',
];

export const VALID_MOVEMENT_KINDS: MovementKind[] = [
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
