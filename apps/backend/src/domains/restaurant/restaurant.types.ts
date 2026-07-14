export type OrderStatus =
  | 'draft'
  | 'open'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'paid'
  | 'cancelled'
  | 'voided'
  | 'refunded';

export type OrderLineStatus =
  'open' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'refunded';

export type KotStatus =
  'pending' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type KotItemStatus =
  'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type BillStatus =
  'open' | 'paid' | 'partially_paid' | 'cancelled' | 'refunded';

export type PaymentMode =
  'cash' | 'upi' | 'card' | 'bank' | 'credit' | 'online' | 'room_charge';

export type OrderType = 'dine-in' | 'takeaway' | 'delivery' | 'room-service';

export type DiningArea = 'main' | 'terrace' | 'vip' | 'outdoor' | 'private';

export type TableStatus =
  'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export type Course =
  | 'starter'
  | 'soup'
  | 'salad'
  | 'main'
  | 'bread'
  | 'rice'
  | 'side'
  | 'dessert'
  | 'beverage';

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_OPENED'
  | 'KOT_GENERATED'
  | 'COOKING_STARTED'
  | 'ORDER_READY'
  | 'ORDER_SERVED'
  | 'ORDER_COMPLETED'
  | 'ORDER_PAID'
  | 'INVENTORY_CONSUMED'
  | 'BILL_CLOSED'
  | 'PAYMENT_RECEIVED'
  | 'ORDER_CANCELLED'
  | 'ORDER_VOIDED'
  | 'ORDER_REFUNDED'
  | 'TABLE_ASSIGNED'
  | 'TABLE_TRANSFERRED'
  | 'ITEM_ADDED'
  | 'ITEM_REMOVED'
  | 'ITEM_CANCELLED'
  | 'ORDER_MODIFIED'
  | 'KOT_STATUS_CHANGED'
  | 'BILL_SPLIT'
  | 'DISCOUNT_APPLIED';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['confirmed', 'cancelled', 'voided'],
  confirmed: ['preparing', 'cancelled', 'voided'],
  preparing: ['ready', 'cancelled', 'voided'],
  ready: ['served', 'cancelled'],
  served: ['completed', 'refunded'],
  completed: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
  voided: [],
  refunded: [],
};

export const TRANSITION_PERMISSIONS: Record<string, string[]> = {
  'draft->open': ['cashier', 'manager', 'owner', 'fnb', 'reception'],
  'open->confirmed': ['cashier', 'manager', 'owner', 'fnb'],
  'confirmed->preparing': ['fnb', 'manager', 'owner', 'kitchen'],
  'preparing->ready': ['fnb', 'kitchen', 'manager'],
  'ready->served': ['fnb', 'manager', 'owner'],
  'served->completed': ['cashier', 'manager', 'owner', 'fnb'],
  'completed->paid': ['cashier', 'manager', 'owner'],
  'draft->cancelled': ['manager', 'owner'],
  'open->cancelled': ['manager', 'owner'],
  'confirmed->cancelled': ['manager', 'owner'],
  'preparing->cancelled': ['manager', 'owner'],
  'served->refunded': ['manager', 'owner'],
  'completed->cancelled': ['manager', 'owner'],
  'open->voided': ['manager', 'owner'],
  'confirmed->voided': ['manager', 'owner'],
  'preparing->voided': ['manager', 'owner'],
};

export interface DiningTable {
  id: string;
  tableNo: string;
  capacity: number;
  area: DiningArea;
  status: TableStatus;
  posX: number | null;
  posY: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isActive: boolean;
  imageUrl: string | null;
  preparationTime: number;
  course: Course;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  instructions: string | null;
  prepTime: number;
  cookTime: number;
  wasteFactor: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  inventoryItemId: string | null;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  isAlternative: boolean;
  alternativeGroup: string | null;
}

export interface KitchenStation {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
}

export interface DiningSession {
  id: string;
  tableId: string;
  tableNo: string;
  orderId: string | null;
  orderNo: string | null;
  guestCount: number;
  guestName: string | null;
  phone: string | null;
  type: OrderType;
  roomNo: string | null;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
}

export interface RestaurantOrder {
  id: string;
  orderNo: string;
  sessionId: string | null;
  tableId: string | null;
  tableNo: string | null;
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountReason: string | null;
  serviceCharge: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  guestCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
  events: OrderEvent[];
}

export interface OrderLine {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number;
  discountPercent: number;
  discountReason: string | null;
  isComplimentary: boolean;
  complimentaryReason: string | null;
  notes: string | null;
  course: Course;
  status: OrderLineStatus;
  kotId: string | null;
  createdAt: string;
}

export interface Kot {
  id: string;
  kotNumber: string;
  orderId: string;
  orderNo: string;
  stationId: string | null;
  stationName: string | null;
  status: KotStatus;
  priority: number;
  course: Course;
  notes: string | null;
  createdBy: string | null;
  printedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: KotItem[];
}

export interface KotItem {
  id: string;
  kotId: string;
  orderLineId: string;
  menuItemName: string;
  quantity: number;
  notes: string | null;
  status: KotItemStatus;
}

export interface Bill {
  id: string;
  billNumber: string;
  orderId: string;
  subtotal: number;
  discountAmount: number;
  serviceCharge: number;
  taxAmount: number;
  roundingAdjustment: number;
  totalAmount: number;
  status: BillStatus;
  notes: string | null;
  createdBy: string | null;
  closedAt: string | null;
  createdAt: string;
  payments: Payment[];
}

export interface Payment {
  id: string;
  billId: string;
  mode: PaymentMode;
  amount: number;
  reference: string | null;
  tipAmount: number;
  notes: string | null;
  processedBy: string | null;
  processedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  eventType: OrderEventType;
  fromStatus: string | null;
  toStatus: string | null;
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

export interface CreateTableDto {
  tableNo: string;
  capacity: number;
  area?: DiningArea;
  posX?: number;
  posY?: number;
}
export interface CreateMenuCategoryDto {
  name: string;
  displayOrder?: number;
}
export interface CreateMenuItemDto {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  preparationTime?: number;
  course?: string;
  imageUrl?: string;
}
export interface CreateRecipeDto {
  menuItemId: string;
  name: string;
  yieldQty?: number;
  yieldUnit?: string;
  instructions?: string;
  prepTime?: number;
  cookTime?: number;
  wasteFactor?: number;
  ingredients: CreateRecipeIngredientDto[];
}
export interface CreateRecipeIngredientDto {
  inventoryItemId?: string;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  wasteFactor?: number;
  isAlternative?: boolean;
  alternativeGroup?: string;
}
export interface CreateKitchenStationDto {
  name: string;
  code: string;
  description?: string;
}
export interface CreateOrderDto {
  type?: OrderType;
  tableId?: string;
  sessionId?: string;
  guestCount?: number;
  guestName?: string;
  phone?: string;
  roomNo?: string;
  notes?: string;
  lines: CreateOrderLineDto[];
}
export interface CreateOrderLineDto {
  menuItemId: string;
  quantity: number;
  notes?: string;
  course?: string;
}
export interface CreateKotDto {
  orderId: string;
  stationId?: string;
  priority?: number;
  course?: string;
  notes?: string;
  itemIds: string[];
}
export interface CreateBillDto {
  orderId: string;
  serviceCharge?: number;
  discountAmount?: number;
  discountPercent?: number;
  discountReason?: string;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
}
export interface CreatePaymentDto {
  billId: string;
  mode: PaymentMode;
  amount: number;
  reference?: string;
  tipAmount?: number;
  notes?: string;
}
export interface OrderFilter {
  status?: OrderStatus;
  type?: OrderType;
  tableId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}
export interface MenuFilter {
  categoryId?: string;
  isActive?: boolean;
  course?: string;
  search?: string;
  offset?: number;
  limit?: number;
}
export interface TableFilter {
  area?: DiningArea;
  status?: TableStatus;
  search?: string;
  offset?: number;
  limit?: number;
}

export const VALID_ORDER_STATUSES: OrderStatus[] = [
  'draft',
  'open',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'paid',
  'cancelled',
  'voided',
  'refunded',
];

export const VALID_PAYMENT_MODES: PaymentMode[] = [
  'cash',
  'upi',
  'card',
  'bank',
  'credit',
  'online',
  'room_charge',
];

export const VALID_COURSES: Course[] = [
  'starter',
  'soup',
  'salad',
  'main',
  'bread',
  'rice',
  'side',
  'dessert',
  'beverage',
];
