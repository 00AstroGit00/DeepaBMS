export type BottleStatus =
  | 'purchased'
  | 'received'
  | 'stored'
  | 'transferred'
  | 'opened'
  | 'active'
  | 'partially_consumed'
  | 'empty'
  | 'broken'
  | 'returned'
  | 'written_off'
  | 'archived';

export type BarSaleStatus =
  'draft' | 'open' | 'completed' | 'cancelled' | 'refunded';

export type BarSaleLineStatus = 'open' | 'served' | 'cancelled' | 'refunded';

export type PegSize = 30 | 45 | 60 | 90 | 120 | 180 | number;

export type LiquorCategoryName =
  'IMFL' | 'Beer' | 'Wine' | 'Foreign' | 'Country' | 'Liqueur';

export type PourType =
  | 'regular'
  | 'short_pour'
  | 'over_pour'
  | 'complimentary'
  | 'promotion'
  | 'staff_issue'
  | 'internal'
  | 'waste'
  | 'spillage';

export type BarEventType =
  | 'BOTTLE_PURCHASED'
  | 'BOTTLE_RECEIVED'
  | 'BOTTLE_STORED'
  | 'BOTTLE_TRANSFERRED'
  | 'BOTTLE_OPENED'
  | 'BOTTLE_ACTIVATED'
  | 'BOTTLE_CONSUMED'
  | 'BOTTLE_EMPTIED'
  | 'BOTTLE_BROKEN'
  | 'BOTTLE_RETURNED'
  | 'BOTTLE_WRITTEN_OFF'
  | 'BOTTLE_ARCHIVED'
  | 'PEG_SOLD'
  | 'BAR_SALE_CREATED'
  | 'BAR_SALE_COMPLETED'
  | 'BAR_SALE_CANCELLED'
  | 'BAR_SALE_REFUNDED'
  | 'INVENTORY_CONSUMED'
  | 'VARIANCE_DETECTED'
  | 'EXCISE_REPORT_GENERATED'
  | 'AUDIT_COMPLETED'
  | 'BAR_CLOSED'
  | 'STOCK_ADJUSTMENT'
  | 'PRICE_UPDATED'
  | 'BOTTLE_SWITCHED';

export type PricingTier =
  'mrp' | 'bar_price' | 'happy_hour' | 'promotional' | 'member';

export type ExciseReportType =
  | 'daily_register'
  | 'brand_register'
  | 'bottle_register'
  | 'breakage_register'
  | 'wastage_register'
  | 'transfer_register'
  | 'inspection_report'
  | 'closing_stock'
  | 'monthly_return';

export interface LiquorCategory {
  id: string;
  name: LiquorCategoryName;
  displayOrder: number;
  isActive: boolean;
}

export interface LiquorBrand {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  manufacturer: string;
  proof: number;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiquorBottle {
  id: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  sizeMl: number;
  batchNo: string;
  purchaseCost: number;
  sellingPrice: number;
  mrp: number;
  status: BottleStatus;
  currentMl: number;
  initialMl: number;
  openedAt: string | null;
  openedBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  location: string;
  supplierId: string | null;
  supplierName: string | null;
  poReference: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PegDefinition {
  id: string;
  name: string;
  sizeMl: number;
  isActive: boolean;
}

export interface PegPrice {
  id: string;
  brandId: string;
  pegSizeId: string;
  pegSizeMl: number;
  tier: PricingTier;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BarSale {
  id: string;
  saleNo: string;
  status: BarSaleStatus;
  counter: string;
  bartenderId: string | null;
  bartenderName: string | null;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountReason: string | null;
  serviceCharge: number;
  gstAmount: number;
  totAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: BarSaleLine[];
}

export interface BarSaleLine {
  id: string;
  saleId: string;
  brandId: string;
  brandName: string;
  pegSizeMl: number;
  pegDefinitionId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pourType: PourType;
  bottleId: string | null;
  bottleSwitchFrom: string | null;
  status: BarSaleLineStatus;
  notes: string | null;
  createdAt: string;
}

export interface BottleOpening {
  id: string;
  bottleId: string;
  brandId: string;
  brandName: string;
  openedAt: string;
  openedBy: string;
  initialMl: number;
  location: string;
  notes: string | null;
}

export interface BottleClosing {
  id: string;
  bottleId: string;
  brandId: string;
  brandName: string;
  closedAt: string;
  closedBy: string;
  remainingMl: number;
  reason: string;
  notes: string | null;
}

export interface BottleTransfer {
  id: string;
  bottleId: string;
  brandId: string;
  brandName: string;
  fromLocation: string;
  toLocation: string;
  transferredAt: string;
  transferredBy: string;
  notes: string | null;
}

export interface LiquorMovement {
  id: string;
  bottleId: string;
  brandId: string;
  brandName: string;
  kind: string;
  quantityMl: number;
  mlBefore: number;
  mlAfter: number;
  pourType: PourType | null;
  saleId: string | null;
  saleLineId: string | null;
  unitPrice: number;
  totalValue: number;
  operator: string;
  reference: string | null;
  reason: string | null;
  note: string | null;
  timestamp: string;
}

export interface ExciseRegister {
  id: string;
  date: string;
  counter: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  openingStockBottles: number;
  openingStockMl: number;
  receivedBottles: number;
  receivedMl: number;
  soldMl: number;
  soldAmount: number;
  complimentaryMl: number;
  breakageMl: number;
  wastageMl: number;
  staffMl: number;
  closingStockBottles: number;
  closingStockMl: number;
  varianceMl: number;
  remarks: string | null;
  preparedBy: string;
  verifiedBy: string | null;
  status: string;
  createdAt: string;
}

export interface PourLog {
  id: string;
  saleLineId: string;
  bottleId: string;
  brandId: string;
  pegSizeMl: number;
  pourType: PourType;
  quantityMl: number;
  bartenderId: string | null;
  timestamp: string;
}

export interface BarEvent {
  id: string;
  eventType: BarEventType;
  aggregateType: string;
  aggregateId: string;
  data: string | null;
  createdBy: string | null;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export const BOTTLE_TRANSITIONS: Record<BottleStatus, BottleStatus[]> = {
  purchased: ['received', 'written_off', 'archived'],
  received: ['stored', 'returned', 'written_off'],
  stored: ['opened', 'transferred', 'broken', 'returned', 'written_off'],
  transferred: ['stored', 'opened', 'broken', 'returned'],
  opened: ['active', 'broken', 'returned'],
  active: ['partially_consumed', 'empty', 'broken', 'written_off', 'returned'],
  partially_consumed: ['active', 'empty', 'broken', 'written_off', 'returned'],
  empty: ['archived', 'returned'],
  broken: ['written_off', 'archived'],
  returned: ['archived'],
  written_off: ['archived'],
  archived: [],
};

export const BOTTLE_TRANSITION_PERMISSIONS: Record<string, string[]> = {
  'purchased->received': ['owner', 'manager', 'barstaff'],
  'received->stored': ['owner', 'manager', 'barstaff'],
  'stored->opened': ['owner', 'manager', 'barstaff'],
  'stored->transferred': ['owner', 'manager'],
  'stored->broken': ['owner', 'manager', 'barstaff'],
  'opened->active': ['owner', 'manager', 'barstaff'],
  'active->partially_consumed': ['owner', 'manager', 'barstaff'],
  'partially_consumed->active': ['owner', 'manager', 'barstaff'],
  'active->empty': ['owner', 'manager', 'barstaff'],
  'partially_consumed->empty': ['owner', 'manager', 'barstaff'],
  'empty->archived': ['owner', 'manager'],
  'broken->written_off': ['owner', 'manager'],
  'broken->archived': ['owner', 'manager'],
  'returned->archived': ['owner', 'manager'],
  'written_off->archived': ['owner', 'manager'],
  'stored->returned': ['owner', 'manager'],
  'opened->returned': ['owner', 'manager'],
  'active->written_off': ['owner', 'manager'],
  'active->returned': ['owner', 'manager'],
  'partially_consumed->written_off': ['owner', 'manager'],
  'partially_consumed->returned': ['owner', 'manager'],
  'empty->returned': ['owner', 'manager'],
  'purchased->written_off': ['owner', 'manager'],
  'purchased->archived': ['owner', 'manager'],
  'received->returned': ['owner', 'manager'],
  'received->written_off': ['owner', 'manager'],
  'stored->written_off': ['owner', 'manager'],
  'transferred->stored': ['owner', 'manager', 'barstaff'],
  'transferred->opened': ['owner', 'manager', 'barstaff'],
  'transferred->broken': ['owner', 'manager', 'barstaff'],
  'transferred->returned': ['owner', 'manager'],
};

export const VALID_BOTTLE_STATUSES: BottleStatus[] = [
  'purchased',
  'received',
  'stored',
  'transferred',
  'opened',
  'active',
  'partially_consumed',
  'empty',
  'broken',
  'returned',
  'written_off',
  'archived',
];

export const VALID_LIQUOR_CATEGORIES: LiquorCategoryName[] = [
  'IMFL',
  'Beer',
  'Wine',
  'Foreign',
  'Country',
  'Liqueur',
];

export const VALID_POUR_TYPES: PourType[] = [
  'regular',
  'short_pour',
  'over_pour',
  'complimentary',
  'promotion',
  'staff_issue',
  'internal',
  'waste',
  'spillage',
];

export const VALID_PRICING_TIERS: PricingTier[] = [
  'mrp',
  'bar_price',
  'happy_hour',
  'promotional',
  'member',
];

export const DEFAULT_PEG_SIZES: number[] = [30, 45, 60, 90, 120, 180];

export const STANDARD_BOTTLE_SIZES_ML: number[] = [
  180, 375, 500, 650, 750, 1000, 1500, 2000, 4500,
];

export interface CreateCategoryDto {
  name: LiquorCategoryName;
  displayOrder?: number;
}

export interface CreateBrandDto {
  name: string;
  categoryId: string;
  manufacturer: string;
  proof: number;
  country: string;
}

export interface CreateBottleDto {
  brandId: string;
  sizeMl: number;
  batchNo?: string;
  purchaseCost: number;
  sellingPrice: number;
  mrp: number;
  location?: string;
  supplierId?: string;
  supplierName?: string;
  poReference?: string;
}

export interface CreatePegDefinitionDto {
  name: string;
  sizeMl: number;
}

export interface CreatePegPriceDto {
  brandId: string;
  pegSizeId: string;
  tier: PricingTier;
  price: number;
}

export interface CreateBarSaleDto {
  counter: string;
  bartenderId?: string;
  bartenderName?: string;
  notes?: string;
  lines: CreateBarSaleLineDto[];
}

export interface CreateBarSaleLineDto {
  brandId: string;
  pegSizeMl: number;
  pegDefinitionId: string;
  quantity: number;
  unitPrice: number;
  pourType?: PourType;
  bottleId?: string;
  notes?: string;
}

export interface OpenBottleDto {
  bottleId: string;
  openedBy: string;
  location?: string;
  notes?: string;
}

export interface CloseBottleDto {
  bottleId: string;
  closedBy: string;
  remainingMl: number;
  reason: string;
  notes?: string;
}

export interface TransferBottleDto {
  bottleId: string;
  toLocation: string;
  transferredBy: string;
  notes?: string;
}

export interface BottleFilter {
  brandId?: string;
  categoryId?: string;
  status?: BottleStatus;
  location?: string;
  supplierId?: string;
  isActive?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface BarSaleFilter {
  status?: BarSaleStatus;
  counter?: string;
  bartenderId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface BrandFilter {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface MovementFilter {
  bottleId?: string;
  brandId?: string;
  kind?: string;
  pourType?: PourType;
  saleId?: string;
  fromDate?: string;
  toDate?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface ExciseFilter {
  date?: string;
  fromDate?: string;
  toDate?: string;
  brandId?: string;
  categoryId?: string;
  counter?: string;
  offset?: number;
  limit?: number;
}

export interface BottleSummary {
  totalBottles: number;
  totalMl: number;
  activeBottles: number;
  openBottles: number;
  emptyBottles: number;
  brokenBottles: number;
  totalValue: number;
  totalPurchaseCost: number;
}

export interface BrandPerformance {
  brandId: string;
  brandName: string;
  categoryName: string;
  totalSales: number;
  totalMlSold: number;
  totalPegs: number;
  totalRevenue: number;
  pourCost: number;
  grossProfit: number;
  grossMargin: number;
  spillageMl: number;
  complimentaryMl: number;
}

export interface PegVarianceReport {
  brandId: string;
  brandName: string;
  expectedConsumptionMl: number;
  actualSoldMl: number;
  varianceMl: number;
  variancePercent: number;
  spillageMl: number;
  complimentaryMl: number;
  wastageMl: number;
  unaccountedMl: number;
}

export interface ExciseSummary {
  date: string;
  totalOpeningMl: number;
  totalReceivedMl: number;
  totalSoldMl: number;
  totalComplimentaryMl: number;
  totalBreakageMl: number;
  totalWastageMl: number;
  totalClosingMl: number;
  totalVarianceMl: number;
  totalRevenue: number;
  totalTax: number;
}

export interface BartenderPerformance {
  bartenderId: string;
  bartenderName: string;
  totalSales: number;
  totalPegs: number;
  totalMl: number;
  shortPours: number;
  overPours: number;
  spillageMl: number;
  avgPegSize: number;
  revenue: number;
}
