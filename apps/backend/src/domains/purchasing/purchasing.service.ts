import { PurchasingRepository as repo } from './purchasing.repository';
import { InventoryRepository as invRepo } from '../inventory/inventory.repository';
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  GoodsReceipt,
  GoodsReceiptLine,
  Supplier,
  PurchaseReturn,
  ApprovalAction,
  PoStatus,
  CreatePurchaseOrderDto,
  CreateGoodsReceiptDto,
  CreateSupplierInvoiceDto,
  CreatePurchaseReturnDto,
  SupplierPerformance,
} from './purchasing.types';
import { PO_STATUS_TRANSITIONS } from './purchasing.types';

// ── Permission mappings for each transition ─────────────────────────

const TRANSITION_PERMISSIONS: Record<string, string[]> = {
  'draft->submitted': ['manager', 'owner', 'fnb'],
  'draft->cancelled': ['manager', 'owner'],
  'submitted->approved': ['owner', 'manager'],
  'submitted->rejected': ['owner', 'manager'],
  'submitted->cancelled': ['owner', 'manager'],
  'approved->ordered': ['owner', 'manager'],
  'approved->cancelled': ['owner'],
  'ordered->partially_received': ['fnb', 'manager', 'owner'],
  'ordered->received': ['fnb', 'manager', 'owner'],
  'ordered->cancelled': ['owner'],
  'partially_received->received': ['fnb', 'manager', 'owner'],
  'partially_received->cancelled': ['owner'],
  'received->invoiced': ['accountant', 'manager', 'owner'],
  'received->returned': ['fnb', 'manager', 'owner'],
  'received->closed': ['owner', 'manager'],
  'invoiced->closed': ['owner', 'manager'],
};

// ── Purchase Workflow Service ────────────────────────────────────────

export const PurchaseWorkflowService = {
  async transition(
    poId: string,
    toStatus: PoStatus,
    userId: string,
    userRole: string,
    comment?: string,
  ): Promise<PurchaseOrder> {
    const po = await repo.findPOById(poId);
    if (!po) throw new Error(`Purchase order not found: ${poId}`);

    const fromStatus = po.status;
    if (fromStatus === toStatus)
      throw new Error(`PO is already in status: ${toStatus}`);

    const allowed = PO_STATUS_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new Error(
        `Cannot transition from ${fromStatus} to ${toStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const key = `${fromStatus}->${toStatus}`;
    const permittedRoles = TRANSITION_PERMISSIONS[key];
    if (permittedRoles && !permittedRoles.includes(userRole)) {
      throw new Error(
        `Role '${userRole}' cannot perform ${fromStatus}->${toStatus}. Required: ${permittedRoles.join(', ')}`,
      );
    }

    const eventMap: Record<string, string> = {
      submitted: 'PURCHASE_SUBMITTED',
      approved: 'PURCHASE_APPROVED',
      rejected: 'PURCHASE_REJECTED',
      ordered: 'PURCHASE_ORDERED',
      received: 'GOODS_RECEIVED',
      cancelled: 'PURCHASE_CANCELLED',
      closed: 'PURCHASE_CLOSED',
      returned: 'PURCHASE_RETURNED',
    };

    await repo.updatePOStatus(poId, toStatus);
    await repo.recordApproval(
      poId,
      toStatus as ApprovalAction,
      userId,
      userRole,
      comment,
    );

    const eventType = eventMap[toStatus] || 'PURCHASE_CREATED';
    await repo.recordEvent(
      'PurchaseOrder',
      poId,
      eventType as any,
      JSON.stringify({ fromStatus, toStatus, userId, userRole, comment }),
      userId,
    );

    const updated = await repo.findPOById(poId);
    return updated!;
  },

  async getAvailableTransitions(
    poId: string,
  ): Promise<{ from: PoStatus; to: PoStatus[] }> {
    const po = await repo.findPOById(poId);
    if (!po) throw new Error(`Purchase order not found: ${poId}`);
    return { from: po.status, to: PO_STATUS_TRANSITIONS[po.status] || [] };
  },
};

// ── Goods Receipt Service ─────────────────────────────────────────────

export const GoodsReceiptService = {
  async receive(
    dto: CreateGoodsReceiptDto,
    receivedBy: string,
    userRole: string,
  ): Promise<{
    receipt: GoodsReceipt;
    movements: any[];
  }> {
    const po = await repo.findPOById(dto.poId);
    if (!po) throw new Error(`Purchase order not found: ${dto.poId}`);
    if (!['ordered', 'partially_received'].includes(po.status)) {
      throw new Error(
        `Cannot receive: PO is in status '${po.status}'. Must be 'ordered' or 'partially_received'`,
      );
    }

    const receipt = await repo.createReceipt(dto, receivedBy);

    const movements: any[] = [];
    for (const line of dto.lines) {
      if (!line.receivedQty || line.receivedQty <= 0) continue;
      const pol = po.lines.find((l) => l.id === line.lineId);
      if (!pol) throw new Error(`PO line not found: ${line.lineId}`);

      const goodQty =
        line.receivedQty - (line.damagedQty || 0) - (line.rejectedQty || 0);
      if (goodQty <= 0) continue;

      try {
        const item = await invRepo.findByName(pol.itemName);
        if (item) {
          const result = await invRepo.adjustStock(
            item.id,
            goodQty,
            pol.unitCost,
          );
          const movement = await invRepo.recordMovement(
            item.id,
            item.name,
            'purchase',
            goodQty,
            result.stock - goodQty,
            result.stock,
            receivedBy,
            {
              unitCost: pol.unitCost,
              reference: receipt.receiptNumber,
              reason: `Goods receipt for ${po.poNumber}`,
              note: dto.notes || undefined,
            },
          );
          movements.push(movement);

          await repo.recordEvent(
            'Inventory',
            item.id,
            'INVENTORY_INCREASED' as any,
            JSON.stringify({
              itemId: item.id,
              itemName: item.name,
              quantity: goodQty,
              unitCost: pol.unitCost,
              poNumber: po.poNumber,
              receiptNumber: receipt.receiptNumber,
            }),
            receivedBy,
          );
        }
      } catch (err: any) {
        console.error(
          `[purchasing] Failed to update inventory for ${pol.itemName}:`,
          err.message,
        );
      }
    }

    return { receipt, movements };
  },
};

// ── Purchase Return Service ───────────────────────────────────────────

export const PurchaseReturnService = {
  async processReturn(
    dto: CreatePurchaseReturnDto,
    createdBy: string,
    userRole: string,
  ): Promise<{
    return_: PurchaseReturn;
    movements: any[];
  }> {
    const po = await repo.findPOById(dto.poId);
    if (!po) throw new Error(`Purchase order not found: ${dto.poId}`);
    if (po.status !== 'received') {
      throw new Error(
        `Cannot return: PO is in status '${po.status}'. Must be 'received'`,
      );
    }
    if (!['fnb', 'manager', 'owner'].includes(userRole)) {
      throw new Error(
        `Role '${userRole}' cannot process returns. Required: fnb, manager, or owner`,
      );
    }

    const return_ = await repo.createReturn(dto, createdBy);

    const movements: any[] = [];
    for (const line of dto.lines) {
      if (!line.itemId) continue;
      try {
        const item = await invRepo.findById(line.itemId);
        if (item) {
          await repo.recordEvent(
            'Inventory',
            line.itemId,
            'PURCHASE_RETURNED' as any,
            JSON.stringify({
              itemId: line.itemId,
              itemName: item.name,
              quantity: line.quantity,
              unitCost: line.unitCost,
              returnNumber: return_.returnNumber,
              reason: dto.reason,
            }),
            createdBy,
          );
        }
      } catch (err: any) {
        console.error(
          `[purchasing] Failed to record return event for item ${line.itemId}:`,
          err.message,
        );
      }
    }

    return { return_, movements };
  },
};

// ── Supplier Performance Service ──────────────────────────────────────

export const SupplierPerformanceService = {
  async getPerformance(
    supplierId: string,
  ): Promise<SupplierPerformance | null> {
    return repo.getSupplierPerformance(supplierId);
  },

  async getAllSupplierPerformances(): Promise<SupplierPerformance[]> {
    const suppliers = await repo.listSuppliers({ limit: 1000 });
    const performances: SupplierPerformance[] = [];
    for (const s of suppliers.data) {
      const perf = await this.getPerformance(s.id);
      if (perf) performances.push(perf);
    }
    return performances.sort((a, b) => b.totalSpend - a.totalSpend);
  },
};

// ── Purchase Cost Service ─────────────────────────────────────────────

export const PurchaseCostService = {
  calculateLandedCost(
    unitCost: number,
    quantity: number,
    freight: number,
    tax: number,
    discount: number,
    otherCharges: number,
  ): { lineTotal: number; landedUnitCost: number; totalLandedCost: number } {
    const lineTotal = unitCost * quantity;
    const totalLandedCost = lineTotal + freight + tax + otherCharges - discount;
    const landedUnitCost = quantity > 0 ? totalLandedCost / quantity : 0;
    return { lineTotal, landedUnitCost, totalLandedCost };
  },

  calculateLineTotal(quantity: number, unitCost: number): number {
    return quantity * unitCost;
  },

  distributeCharges(
    lines: { quantity: number; unitCost: number }[],
    freight: number,
    tax: number,
    discount: number,
    otherCharges: number,
  ): {
    lineId: number;
    lineTotal: number;
    landedUnitCost: number;
    landedTotal: number;
  }[] {
    const totalLineValue = lines.reduce(
      (s, l) => s + l.quantity * l.unitCost,
      0,
    );
    if (totalLineValue === 0)
      return lines.map((l, i) => ({
        lineId: i,
        lineTotal: 0,
        landedUnitCost: l.unitCost,
        landedTotal: 0,
      }));

    return lines.map((l, i) => {
      const ratio = (l.quantity * l.unitCost) / totalLineValue;
      const lineTotal = l.quantity * l.unitCost;
      const allocatedCharges =
        freight * ratio + tax * ratio + otherCharges * ratio - discount * ratio;
      const landedTotal = lineTotal + allocatedCharges;
      const landedUnitCost = l.quantity > 0 ? landedTotal / l.quantity : 0;
      return { lineId: i, lineTotal, landedUnitCost, landedTotal };
    });
  },
};

// ── Validation Service ────────────────────────────────────────────────

export const PurchasingValidationService = {
  validatePOCreation(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.supplierId) errors.push('Supplier ID is required');
    if (!dto.orderDate) errors.push('Order date is required');
    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      errors.push('At least one line item is required');
    }
    if (Array.isArray(dto.lines)) {
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        if (!line.itemName) errors.push(`Line ${i + 1}: Item name is required`);
        if (!line.unit) errors.push(`Line ${i + 1}: Unit is required`);
        if (!line.quantity || line.quantity <= 0)
          errors.push(`Line ${i + 1}: Quantity must be positive`);
        if (line.unitCost === undefined || line.unitCost < 0)
          errors.push(`Line ${i + 1}: Unit cost must be >= 0`);
      }
    }
    return errors;
  },

  validateReceiptCreation(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.poId) errors.push('PO ID is required');
    if (!dto.receivedDate) errors.push('Received date is required');
    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      errors.push('At least one receipt line is required');
    }
    if (Array.isArray(dto.lines)) {
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        if (!line.lineId) errors.push(`Line ${i + 1}: Line ID is required`);
        if (line.receivedQty === undefined || line.receivedQty < 0) {
          errors.push(`Line ${i + 1}: Received quantity must be >= 0`);
        }
      }
    }
    return errors;
  },

  validateInvoiceCreation(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.poId) errors.push('PO ID is required');
    if (!dto.invoiceNumber) errors.push('Invoice number is required');
    if (!dto.invoiceDate) errors.push('Invoice date is required');
    if (dto.amount === undefined || dto.amount <= 0)
      errors.push('Invoice amount must be positive');
    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      errors.push('At least one invoice line is required');
    }
    return errors;
  },

  validateReturnCreation(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.poId) errors.push('PO ID is required');
    if (!dto.returnDate) errors.push('Return date is required');
    if (!dto.reason) errors.push('Return reason is required');
    if (!Array.isArray(dto.lines) || dto.lines.length === 0) {
      errors.push('At least one return line is required');
    }
    if (Array.isArray(dto.lines)) {
      for (let i = 0; i < dto.lines.length; i++) {
        const line = dto.lines[i];
        if (line.quantity === undefined || line.quantity <= 0) {
          errors.push(`Line ${i + 1}: Quantity must be positive`);
        }
        if (line.unitCost === undefined || line.unitCost < 0) {
          errors.push(`Line ${i + 1}: Unit cost must be >= 0`);
        }
        if (!line.reason) errors.push(`Line ${i + 1}: Reason is required`);
      }
    }
    return errors;
  },

  validateSupplier(dto: any): string[] {
    const errors: string[] = [];
    if (!dto.name || dto.name.trim().length === 0)
      errors.push('Supplier name is required');
    if (dto.name && dto.name.length > 200)
      errors.push('Supplier name must be 200 characters or less');
    if (
      dto.gstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        dto.gstin.toUpperCase(),
      )
    ) {
      errors.push('Invalid GSTIN format');
    }
    if (dto.creditLimit && dto.creditLimit < 0)
      errors.push('Credit limit cannot be negative');
    if (dto.leadTimeDays && dto.leadTimeDays < 0)
      errors.push('Lead time cannot be negative');
    if (dto.rating && (dto.rating < 0 || dto.rating > 5))
      errors.push('Rating must be between 0 and 5');
    return errors;
  },
};

// ── GST/Excise Extension Hooks (Phase 7) ────────────────────────────

export const GstExciseHooks = {
  calculateGstInputCredit(amount: number, gstRate: number): number {
    return Math.round(((amount * gstRate) / 100) * 100) / 100;
  },

  validateGstin(gstin: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
      gstin.toUpperCase(),
    );
  },

  getGstSlab(category: string): number {
    const slabs: Record<string, number> = {
      food: 5,
      softdrink: 5,
      kitchen: 5,
      consumables: 18,
      packaging: 12,
      amenities: 18,
      liquor: 0,
      housekeeping: 18,
    };
    return slabs[category] || 18;
  },

  async getGstComplianceReport(
    fromDate: string,
    toDate: string,
  ): Promise<{
    invoices: number;
    totalInputCredit: number;
    taxableValue: number;
    gstAmount: number;
  }> {
    const pos = await repo.listPOs({ fromDate, toDate, limit: 1000 });
    let totalInputCredit = 0;
    let taxableValue = 0;
    let gstAmount = 0;
    let invoices = 0;

    for (const po of pos.data) {
      if (['received', 'invoiced', 'closed'].includes(po.status)) {
        const gstRate =
          po.lines.length > 0
            ? GstExciseHooks.getGstSlab(po.lines[0].category || 'food')
            : 5;
        const inputCredit = GstExciseHooks.calculateGstInputCredit(
          po.totalCost,
          gstRate,
        );
        totalInputCredit += inputCredit;
        taxableValue += po.totalCost;
        gstAmount += inputCredit;
        invoices++;
      }
    }

    return {
      invoices,
      totalInputCredit: Math.round(totalInputCredit * 100) / 100,
      taxableValue,
      gstAmount,
    };
  },

  async getExciseComplianceReport(
    fromDate: string,
    toDate: string,
  ): Promise<{
    liquorPOs: number;
    totalQuantity: number;
    totalValue: number;
    exciseTaxAmount: number;
  }> {
    const pos = await repo.listPOs({ fromDate, toDate, limit: 1000 });
    let liquorPOs = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    let exciseTaxAmount = 0;

    for (const po of pos.data) {
      const liquorLines = po.lines.filter((l) => l.category === 'liquor');
      if (liquorLines.length > 0) {
        liquorPOs++;
        for (const line of liquorLines) {
          totalQuantity += line.quantity;
          totalValue += line.totalCost;
        }
      }
    }

    exciseTaxAmount = Math.round(totalValue * 0.1 * 100) / 100;
    return { liquorPOs, totalQuantity, totalValue, exciseTaxAmount };
  },

  async validateExcisePermit(
    permitNumber: string,
  ): Promise<{ valid: boolean; message: string }> {
    if (!permitNumber || permitNumber.length < 10) {
      return { valid: false, message: 'Invalid excise permit format' };
    }
    return { valid: true, message: 'Excise permit validated (mock)' };
  },
};
