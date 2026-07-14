export type PoStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'invoiced'
  | 'closed'
  | 'cancelled'
  | 'returned';

export type InvoiceStatus =
  'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export type DiscrepancyType =
  'short' | 'over' | 'damaged' | 'rejected' | 'wrong_item';

export type DiscrepancyResolution =
  'pending' | 'accepted' | 'returned' | 'credited' | 'replaced';

export type ApprovalAction =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'cancelled'
  | 'closed'
  | 'returned';

export type PurchaseEventType =
  | 'PURCHASE_CREATED'
  | 'PURCHASE_SUBMITTED'
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_REJECTED'
  | 'PURCHASE_ORDERED'
  | 'GOODS_RECEIVED'
  | 'INVENTORY_INCREASED'
  | 'INVOICE_RECEIVED'
  | 'PURCHASE_RETURNED'
  | 'PURCHASE_CANCELLED'
  | 'PURCHASE_CLOSED'
  | 'PURCHASE_DISCREPANCY_REPORTED'
  | 'LOW_STOCK_PURCHASE_SUGGESTED';

export const PO_STATUS_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['ordered', 'cancelled'],
  rejected: ['draft'],
  ordered: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: ['invoiced', 'returned', 'closed'],
  invoiced: ['closed'],
  closed: [],
  cancelled: [],
  returned: [],
};

export const STATUS_DISPLAY: Record<PoStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  received: 'Received',
  invoiced: 'Invoiced',
  closed: 'Closed',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  paymentTerms: string;
  creditLimit: number;
  isPreferred: boolean;
  isActive: boolean;
  leadTimeDays: number;
  rating: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PoStatus;
  orderDate: string;
  expectedDate: string | null;
  subtotal: number;
  freight: number;
  tax: number;
  discount: number;
  otherCharges: number;
  totalCost: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: PurchaseOrderLine[];
  approvals: PurchaseOrderApproval[];
}

export interface PurchaseOrderLine {
  id: string;
  poId: string;
  itemId: string | null;
  itemName: string;
  category: string | null;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty: number;
  damagedQty: number;
  rejectedQty: number;
}

export interface PurchaseOrderApproval {
  id: string;
  poId: string;
  action: ApprovalAction;
  approvedBy: string;
  role: string;
  comment: string | null;
  timestamp: string;
}

export interface GoodsReceipt {
  id: string;
  poId: string;
  poNumber: string;
  receiptNumber: string;
  receivedDate: string;
  notes: string | null;
  receivedBy: string;
  createdAt: string;
  lines: GoodsReceiptLine[];
}

export interface GoodsReceiptLine {
  id: string;
  receiptId: string;
  lineId: string;
  itemId: string | null;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
  rejectedQty: number;
  unitCost: number;
  landedCost: number;
}

export interface SupplierInvoice {
  id: string;
  poId: string;
  receiptId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines: SupplierInvoiceLine[];
}

export interface SupplierInvoiceLine {
  id: string;
  invoiceId: string;
  lineId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface PurchaseReturn {
  id: string;
  poId: string;
  receiptId: string | null;
  returnNumber: string;
  returnDate: string;
  reason: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  lines: PurchaseReturnLine[];
}

export interface PurchaseReturnLine {
  id: string;
  returnId: string;
  itemId: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
}

export interface ReceivingDiscrepancy {
  id: string;
  receiptId: string;
  lineId: string;
  itemId: string | null;
  issueType: DiscrepancyType;
  expectedQty: number;
  actualQty: number;
  difference: number;
  resolution: DiscrepancyResolution;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: PurchaseEventType;
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

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isPreferred?: boolean;
  leadTimeDays?: number;
  notes?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isPreferred?: boolean;
  isActive?: boolean;
  leadTimeDays?: number;
  rating?: number;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  supplierId: string;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  lines: CreatePurchaseOrderLineDto[];
}

export interface CreatePurchaseOrderLineDto {
  itemId?: string;
  itemName: string;
  category?: string;
  unit: string;
  quantity: number;
  unitCost: number;
}

export interface CreateGoodsReceiptDto {
  poId: string;
  receivedDate: string;
  notes?: string;
  lines: CreateGoodsReceiptLineDto[];
}

export interface CreateGoodsReceiptLineDto {
  lineId: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty?: number;
  rejectedQty?: number;
}

export interface CreateSupplierInvoiceDto {
  poId: string;
  receiptId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  amount: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string;
  lines: CreateInvoiceLineDto[];
}

export interface CreateInvoiceLineDto {
  lineId: string;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface CreatePurchaseReturnDto {
  poId: string;
  receiptId?: string;
  returnDate: string;
  reason: string;
  notes?: string;
  lines: CreateReturnLineDto[];
}

export interface CreateReturnLineDto {
  itemId?: string;
  quantity: number;
  unitCost: number;
  reason: string;
}

export interface PoFilter {
  status?: PoStatus;
  supplierId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface SupplierFilter {
  search?: string;
  isActive?: boolean;
  isPreferred?: boolean;
  category?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface ReceiptFilter {
  poId?: string;
  fromDate?: string;
  toDate?: string;
  offset?: number;
  limit?: number;
}

export interface PurchaseSummary {
  totalPOs: number;
  openPOs: number;
  totalValue: number;
  pendingReceipts: number;
  pendingInvoices: number;
  totalSuppliers: number;
  activeSuppliers: number;
  monthlySpend: number;
  statusBreakdown: Record<string, number>;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalPOs: number;
  completedPOs: number;
  totalSpend: number;
  avgLeadTime: number;
  onTimeDelivery: number;
  qualityRating: number;
  returnRate: number;
  lastOrderDate: string | null;
}

export const VALID_PO_STATUSES: PoStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'ordered',
  'partially_received',
  'received',
  'invoiced',
  'closed',
  'cancelled',
  'returned',
];

export const VALID_INVOICE_STATUSES: InvoiceStatus[] = [
  'pending',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
];

export const VALID_DISCREPANCY_TYPES: DiscrepancyType[] = [
  'short',
  'over',
  'damaged',
  'rejected',
  'wrong_item',
];

export const VALID_DISCREPANCY_RESOLUTIONS: DiscrepancyResolution[] = [
  'pending',
  'accepted',
  'returned',
  'credited',
  'replaced',
];

export const VALID_APPROVAL_ACTIONS: ApprovalAction[] = [
  'submitted',
  'approved',
  'rejected',
  'ordered',
  'cancelled',
  'closed',
  'returned',
];

export const PURCHASE_EVENT_TYPES: PurchaseEventType[] = [
  'PURCHASE_CREATED',
  'PURCHASE_SUBMITTED',
  'PURCHASE_APPROVED',
  'PURCHASE_REJECTED',
  'PURCHASE_ORDERED',
  'GOODS_RECEIVED',
  'INVENTORY_INCREASED',
  'INVOICE_RECEIVED',
  'PURCHASE_RETURNED',
  'PURCHASE_CANCELLED',
  'PURCHASE_CLOSED',
  'PURCHASE_DISCREPANCY_REPORTED',
  'LOW_STOCK_PURCHASE_SUGGESTED',
];
