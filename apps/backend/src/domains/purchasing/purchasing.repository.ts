import { query, run, db } from '../../db';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderApproval,
  GoodsReceipt,
  GoodsReceiptLine,
  SupplierInvoice,
  SupplierInvoiceLine,
  PurchaseReturn,
  PurchaseReturnLine,
  ReceivingDiscrepancy,
  PurchaseEvent,
  PaginatedResult,
  PoFilter,
  SupplierFilter,
  ReceiptFilter,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  CreatePurchaseOrderLineDto,
  CreateGoodsReceiptDto,
  CreateGoodsReceiptLineDto,
  CreateSupplierInvoiceDto,
  CreateInvoiceLineDto,
  CreatePurchaseReturnDto,
  CreateReturnLineDto,
  PurchaseSummary,
  SupplierPerformance,
  ApprovalAction,
  PurchaseEventType,
  PoStatus,
} from './purchasing.types';
import { PO_STATUS_TRANSITIONS, STATUS_DISPLAY } from './purchasing.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function poNumber(): string {
  const y = new Date().getFullYear().toString().slice(-2);
  const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${y}${m}-${seq}`;
}

function receiptNumber(): string {
  const y = new Date().getFullYear().toString().slice(-2);
  const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `GR-${y}${m}-${seq}`;
}

function returnNumber(): string {
  const y = new Date().getFullYear().toString().slice(-2);
  const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `RET-${y}${m}-${seq}`;
}

// ── Mappers ──────────────────────────────────────────────────────────

function rowToSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || null,
    phone: row.phone || null,
    email: row.email || null,
    gstin: row.gstin || null,
    address: row.address || null,
    paymentTerms: row.payment_terms || 'net30',
    creditLimit: Number(row.credit_limit || 0),
    isPreferred: Boolean(row.is_preferred),
    isActive: Boolean(row.is_active ?? true),
    leadTimeDays: Number(row.lead_time_days || 7),
    rating: Number(row.rating || 0),
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToPOLine(row: any): PurchaseOrderLine {
  return {
    id: row.id,
    poId: row.po_id,
    itemId: row.item_id || null,
    itemName: row.item_name,
    category: row.category || null,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost || 0),
    receivedQty: Number(row.received_qty || 0),
    damagedQty: Number(row.damaged_qty || 0),
    rejectedQty: Number(row.rejected_qty || 0),
  };
}

function rowToPO(row: any): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || '',
    status: row.status,
    orderDate: row.order_date || '',
    expectedDate: row.expected_date || null,
    subtotal: Number(row.subtotal || 0),
    freight: Number(row.freight || 0),
    tax: Number(row.tax || 0),
    discount: Number(row.discount || 0),
    otherCharges: Number(row.other_charges || 0),
    totalCost: Number(row.total_cost || 0),
    notes: row.notes || null,
    createdBy: row.created_by || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lines: [],
    approvals: [],
  };
}

function rowToApproval(row: any): PurchaseOrderApproval {
  return {
    id: row.id,
    poId: row.po_id,
    action: row.action,
    approvedBy: row.approved_by,
    role: row.role,
    comment: row.comment || null,
    timestamp: row.timestamp || '',
  };
}

function rowToReceipt(row: any): GoodsReceipt {
  return {
    id: row.id,
    poId: row.po_id,
    poNumber: row.po_number || '',
    receiptNumber: row.receipt_number,
    receivedDate: row.received_date || '',
    notes: row.notes || null,
    receivedBy: row.received_by,
    createdAt: row.created_at || '',
    lines: [],
  };
}

function rowToReceiptLine(row: any): GoodsReceiptLine {
  return {
    id: row.id,
    receiptId: row.receipt_id,
    lineId: row.line_id,
    itemId: row.item_id || null,
    expectedQty: Number(row.expected_qty),
    receivedQty: Number(row.received_qty),
    damagedQty: Number(row.damaged_qty || 0),
    rejectedQty: Number(row.rejected_qty || 0),
    unitCost: Number(row.unit_cost || 0),
    landedCost: Number(row.landed_cost || 0),
  };
}

function rowToInvoice(row: any): SupplierInvoice {
  return {
    id: row.id,
    poId: row.po_id,
    receiptId: row.receipt_id || null,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date || '',
    dueDate: row.due_date || null,
    amount: Number(row.amount),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount),
    status: row.status,
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    lines: [],
  };
}

function rowToInvoiceLine(row: any): SupplierInvoiceLine {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    lineId: row.line_id,
    amount: Number(row.amount),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount),
  };
}

function rowToReturn(row: any): PurchaseReturn {
  return {
    id: row.id,
    poId: row.po_id,
    receiptId: row.receipt_id || null,
    returnNumber: row.return_number,
    returnDate: row.return_date || '',
    reason: row.reason,
    notes: row.notes || null,
    createdBy: row.created_by,
    createdAt: row.created_at || '',
    lines: [],
  };
}

function rowToReturnLine(row: any): PurchaseReturnLine {
  return {
    id: row.id,
    returnId: row.return_id,
    itemId: row.item_id || null,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost || 0),
    reason: row.reason,
  };
}

function rowToDiscrepancy(row: any): ReceivingDiscrepancy {
  return {
    id: row.id,
    receiptId: row.receipt_id,
    lineId: row.line_id,
    itemId: row.item_id || null,
    issueType: row.issue_type,
    expectedQty: Number(row.expected_qty),
    actualQty: Number(row.actual_qty),
    difference: Number(row.difference),
    resolution: row.resolution,
    notes: row.notes || null,
    createdAt: row.created_at || '',
  };
}

function rowToEvent(row: any): PurchaseEvent {
  return {
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    data: row.data || null,
    createdBy: row.created_by || null,
    timestamp: row.timestamp || '',
  };
}

// ── Build WHERE clause helpers ───────────────────────────────────────

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
    order_date: 'order_date',
    total_cost: 'total_cost',
    supplier_name: 'supplier_name',
    rating: 'rating',
    lead_time_days: 'lead_time_days',
  };
  const field = allowedOrders[orderBy || ''] || 'created_at';
  const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
  return { field, dir };
}

// ── Repository ───────────────────────────────────────────────────────

export const PurchasingRepository = {
  // ── Suppliers ────────────────────────────────────────────────────

  async createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    const id = uid('sup');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO suppliers (id, name, contact_person, phone, email, gstin, address, payment_terms, credit_limit, is_preferred, is_active, lead_time_days, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        id,
        dto.name,
        dto.contactPerson || null,
        dto.phone || null,
        dto.email || null,
        dto.gstin || null,
        dto.address || null,
        dto.paymentTerms || 'net30',
        dto.creditLimit || 0,
        dto.isPreferred ? 1 : 0,
        dto.leadTimeDays || 7,
        dto.notes || null,
        now,
        now,
      ],
    );
    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rowToSupplier(rows[0]);
  },

  async findSupplierById(id: string): Promise<Supplier | null> {
    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    return rows.length ? rowToSupplier(rows[0]) : null;
  },

  async findSupplierByName(name: string): Promise<Supplier | null> {
    const rows = await query('SELECT * FROM suppliers WHERE name = ?', [name]);
    return rows.length ? rowToSupplier(rows[0]) : null;
  },

  async updateSupplier(
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<Supplier | null> {
    const existing = await this.findSupplierById(id);
    if (!existing) return null;

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (dto.name !== undefined) {
      sets.push('name = ?');
      params.push(dto.name);
    }
    if (dto.contactPerson !== undefined) {
      sets.push('contact_person = ?');
      params.push(dto.contactPerson);
    }
    if (dto.phone !== undefined) {
      sets.push('phone = ?');
      params.push(dto.phone);
    }
    if (dto.email !== undefined) {
      sets.push('email = ?');
      params.push(dto.email);
    }
    if (dto.gstin !== undefined) {
      sets.push('gstin = ?');
      params.push(dto.gstin);
    }
    if (dto.address !== undefined) {
      sets.push('address = ?');
      params.push(dto.address);
    }
    if (dto.paymentTerms !== undefined) {
      sets.push('payment_terms = ?');
      params.push(dto.paymentTerms);
    }
    if (dto.creditLimit !== undefined) {
      sets.push('credit_limit = ?');
      params.push(dto.creditLimit);
    }
    if (dto.isPreferred !== undefined) {
      sets.push('is_preferred = ?');
      params.push(dto.isPreferred ? 1 : 0);
    }
    if (dto.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(dto.isActive ? 1 : 0);
    }
    if (dto.leadTimeDays !== undefined) {
      sets.push('lead_time_days = ?');
      params.push(dto.leadTimeDays);
    }
    if (dto.rating !== undefined) {
      sets.push('rating = ?');
      params.push(dto.rating);
    }
    if (dto.notes !== undefined) {
      sets.push('notes = ?');
      params.push(dto.notes);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return this.findSupplierById(id);
  },

  async listSuppliers(
    filter: SupplierFilter = {},
  ): Promise<PaginatedResult<Supplier>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const { field, dir } = safeOrder(filter.orderBy, filter.orderDir);

    if (filter.search) {
      conditions.push(
        '(name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR email LIKE ?)',
      );
      const s = `%${filter.search}%`;
      params.push(s, s, s, s);
    }
    if (filter.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter.isPreferred !== undefined) {
      conditions.push('is_preferred = ?');
      params.push(filter.isPreferred ? 1 : 0);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM suppliers ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM suppliers ${where} ORDER BY ${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToSupplier), total, offset, limit };
  },

  async archiveSupplier(id: string): Promise<void> {
    await run(
      'UPDATE suppliers SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  // ── Purchase Orders ─────────────────────────────────────────────

  async createPO(
    dto: CreatePurchaseOrderDto,
    createdBy: string,
  ): Promise<PurchaseOrder> {
    const id = uid('po');
    const number = poNumber();
    const now = new Date().toISOString();
    const subtotal = dto.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    const po: any = {
      id,
      po_number: number,
      supplier_id: dto.supplierId,
      status: 'draft',
      order_date: dto.orderDate,
      expected_date: dto.expectedDate || null,
      subtotal,
      freight: 0,
      tax: 0,
      discount: 0,
      other_charges: 0,
      total_cost: subtotal,
      notes: dto.notes || null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    };

    await run(
      `INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, expected_date, subtotal, freight, tax, discount, other_charges, total_cost, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po.id,
        po.po_number,
        po.supplier_id,
        po.status,
        po.order_date,
        po.expected_date,
        po.subtotal,
        po.freight,
        po.tax,
        po.discount,
        po.other_charges,
        po.total_cost,
        po.notes,
        po.created_by,
        po.created_at,
        po.updated_at,
      ],
    );

    const lineIds: string[] = [];
    for (const line of dto.lines) {
      const lid = uid('pol');
      await run(
        `INSERT INTO purchase_order_lines (id, po_id, item_id, item_name, category, unit, quantity, unit_cost, total_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lid,
          id,
          line.itemId || null,
          line.itemName,
          line.category || null,
          line.unit,
          line.quantity,
          line.unitCost,
          line.quantity * line.unitCost,
        ],
      );
      lineIds.push(lid);
    }

    await this.recordEvent(
      'PurchaseOrder',
      id,
      'PURCHASE_CREATED',
      JSON.stringify(dto),
      createdBy,
    );
    return this.findPOById(id) as Promise<PurchaseOrder>;
  },

  async findPOById(id: string): Promise<PurchaseOrder | null> {
    const rows = await query(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?`,
      [id],
    );
    if (!rows.length) return null;
    const po = rowToPO(rows[0]);
    po.lines = await this.findPOLines(id);
    po.approvals = await this.findPOApprovals(id);
    return po;
  },

  async findPOByNumber(poNumber: string): Promise<PurchaseOrder | null> {
    const rows = await query(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.po_number = ?`,
      [poNumber],
    );
    if (!rows.length) return null;
    const po = rowToPO(rows[0]);
    po.lines = await this.findPOLines(po.id);
    po.approvals = await this.findPOApprovals(po.id);
    return po;
  },

  async findPOLines(poId: string): Promise<PurchaseOrderLine[]> {
    const rows = await query(
      'SELECT * FROM purchase_order_lines WHERE po_id = ? ORDER BY id',
      [poId],
    );
    return rows.map(rowToPOLine);
  },

  async findPOApprovals(poId: string): Promise<PurchaseOrderApproval[]> {
    const rows = await query(
      'SELECT * FROM purchase_order_approvals WHERE po_id = ? ORDER BY timestamp',
      [poId],
    );
    return rows.map(rowToApproval);
  },

  async listPOs(
    filter: PoFilter = {},
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    const { field, dir } = safeOrder(filter.orderBy, filter.orderDir);

    if (filter.status) {
      conditions.push('po.status = ?');
      params.push(filter.status);
    }
    if (filter.supplierId) {
      conditions.push('po.supplier_id = ?');
      params.push(filter.supplierId);
    }
    if (filter.fromDate) {
      conditions.push('po.order_date >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('po.order_date <= ?');
      params.push(filter.toDate);
    }
    if (filter.search) {
      conditions.push('(po.po_number LIKE ? OR s.name LIKE ?)');
      const s = `%${filter.search}%`;
      params.push(s, s);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const join =
      'FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id';
    const countResult = await query(
      `SELECT COUNT(*) as total ${join} ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT po.*, s.name as supplier_name ${join} ${where} ORDER BY ${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const pos: PurchaseOrder[] = [];
    for (const row of rows) {
      const po = rowToPO(row);
      po.lines = await this.findPOLines(po.id);
      po.approvals = await this.findPOApprovals(po.id);
      pos.push(po);
    }
    return { data: pos, total, offset, limit };
  },

  async updatePOStatus(id: string, newStatus: PoStatus): Promise<void> {
    await run(
      'UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?',
      [newStatus, new Date().toISOString(), id],
    );
  },

  async updatePO(id: string, updates: Record<string, any>): Promise<void> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];
    const fieldMap: Record<string, string> = {
      notes: 'notes',
      expectedDate: 'expected_date',
      freight: 'freight',
      tax: 'tax',
      discount: 'discount',
      otherCharges: 'other_charges',
    };
    for (const [key, val] of Object.entries(updates)) {
      const col = fieldMap[key];
      if (col && val !== undefined) {
        sets.push(`${col} = ?`);
        params.push(val);
      }
    }
    if (params.length === 1) return;
    await run(`UPDATE purchase_orders SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
  },

  async recalculatePO(id: string): Promise<void> {
    const lines = await this.findPOLines(id);
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    const po = await this.findPOById(id);
    if (!po) return;
    const freight = po.freight;
    const tax = po.tax;
    const discount = po.discount;
    const other = po.otherCharges;
    const totalCost = subtotal + freight + tax + other - discount;
    await run(
      `UPDATE purchase_orders SET subtotal = ?, total_cost = ?, updated_at = ? WHERE id = ?`,
      [subtotal, totalCost, new Date().toISOString(), id],
    );
  },

  // ── Approvals ────────────────────────────────────────────────────

  async recordApproval(
    poId: string,
    action: ApprovalAction,
    approvedBy: string,
    role: string,
    comment?: string,
  ): Promise<PurchaseOrderApproval> {
    const id = uid('apv');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO purchase_order_approvals (id, po_id, action, approved_by, role, comment, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, poId, action, approvedBy, role, comment || null, now],
    );
    const rows = await query(
      'SELECT * FROM purchase_order_approvals WHERE id = ?',
      [id],
    );
    return rowToApproval(rows[0]);
  },

  // ── Goods Receipts ───────────────────────────────────────────────

  async createReceipt(
    dto: CreateGoodsReceiptDto,
    receivedBy: string,
  ): Promise<GoodsReceipt> {
    const id = uid('gr');
    const number = receiptNumber();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO goods_receipts (id, po_id, receipt_number, received_date, notes, received_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.poId,
        number,
        dto.receivedDate,
        dto.notes || null,
        receivedBy,
        now,
      ],
    );

    for (const line of dto.lines) {
      const lid = uid('grl');
      const lineRows = await query(
        'SELECT * FROM purchase_order_lines WHERE id = ?',
        [line.lineId],
      );
      const pol = lineRows.length ? rowToPOLine(lineRows[0]) : null;
      const unitCost = pol?.unitCost || 0;
      const receivedQty = line.receivedQty || 0;
      const damagedQty = line.damagedQty || 0;
      const rejectedQty = line.rejectedQty || 0;
      const expectedQty = pol?.quantity || 0;
      const landedCost = unitCost * receivedQty;

      await run(
        `INSERT INTO goods_receipt_lines (id, receipt_id, line_id, item_id, expected_qty, received_qty, damaged_qty, rejected_qty, unit_cost, landed_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lid,
          id,
          line.lineId,
          pol?.itemId || null,
          expectedQty,
          receivedQty,
          damagedQty,
          rejectedQty,
          unitCost,
          landedCost,
        ],
      );

      const newReceivedQty = (pol?.receivedQty || 0) + receivedQty;
      const newDamagedQty = (pol?.damagedQty || 0) + damagedQty;
      const newRejectedQty = (pol?.rejectedQty || 0) + rejectedQty;
      await run(
        `UPDATE purchase_order_lines SET received_qty = ?, damaged_qty = ?, rejected_qty = ? WHERE id = ?`,
        [newReceivedQty, newDamagedQty, newRejectedQty, line.lineId],
      );

      if (
        line.receivedQty !== line.expectedQty ||
        damagedQty > 0 ||
        rejectedQty > 0
      ) {
        const issueType =
          damagedQty > 0
            ? 'damaged'
            : rejectedQty > 0
              ? 'rejected'
              : line.receivedQty < line.expectedQty
                ? 'short'
                : line.receivedQty > line.expectedQty
                  ? 'over'
                  : 'short';
        const diff = line.receivedQty - line.expectedQty;
        await run(
          `INSERT INTO receiving_discrepancies (id, receipt_id, line_id, item_id, issue_type, expected_qty, actual_qty, difference, resolution, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            uid('disc'),
            id,
            line.lineId,
            pol?.itemId || null,
            issueType,
            line.expectedQty,
            receivedQty,
            diff,
            line.receivedQty < line.expectedQty
              ? `Short delivery: expected ${line.expectedQty}, got ${line.receivedQty}`
              : line.receivedQty > line.expectedQty
                ? `Over delivery: expected ${line.expectedQty}, got ${line.receivedQty}`
                : damagedQty > 0
                  ? `${damagedQty} units damaged`
                  : `${rejectedQty} units rejected`,
          ],
        );
      }
    }

    await this.recalculatePO(dto.poId);
    await this.updateStatusFromReceipts(dto.poId);

    const poRows = await query(
      'SELECT po_number FROM purchase_orders WHERE id = ?',
      [dto.poId],
    );
    const poNumber = poRows[0]?.po_number || '';

    const gr = rowToReceipt({
      ...(await query('SELECT * FROM goods_receipts WHERE id = ?', [id]))[0],
      po_number: poNumber,
    });
    gr.lines = await this.findReceiptLines(id);
    return gr;
  },

  async updateStatusFromReceipts(poId: string): Promise<void> {
    const lines = await this.findPOLines(poId);
    const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
    const totalReceived = lines.reduce((s, l) => s + l.receivedQty, 0);
    const totalRejected = lines.reduce((s, l) => s + l.rejectedQty, 0);
    const netReceived = totalReceived - totalRejected;

    const po: any = (
      await query('SELECT status FROM purchase_orders WHERE id = ?', [poId])
    )[0];
    if (!po) return;

    if (netReceived >= totalQty) {
      await this.updatePOStatus(poId, 'received');
    } else if (netReceived > 0) {
      await this.updatePOStatus(poId, 'partially_received');
    }
  },

  async findReceiptById(id: string): Promise<GoodsReceipt | null> {
    const rows = await query(
      `SELECT gr.*, po.po_number FROM goods_receipts gr
       LEFT JOIN purchase_orders po ON gr.po_id = po.id WHERE gr.id = ?`,
      [id],
    );
    if (!rows.length) return null;
    const gr = rowToReceipt(rows[0]);
    gr.lines = await this.findReceiptLines(id);
    return gr;
  },

  async findReceiptLines(receiptId: string): Promise<GoodsReceiptLine[]> {
    const rows = await query(
      'SELECT * FROM goods_receipt_lines WHERE receipt_id = ? ORDER BY id',
      [receiptId],
    );
    return rows.map(rowToReceiptLine);
  },

  async listReceipts(
    filter: ReceiptFilter = {},
  ): Promise<PaginatedResult<GoodsReceipt>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;

    if (filter.poId) {
      conditions.push('gr.po_id = ?');
      params.push(filter.poId);
    }
    if (filter.fromDate) {
      conditions.push('gr.received_date >= ?');
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push('gr.received_date <= ?');
      params.push(filter.toDate);
    }

    const where = buildWhere(conditions, params);
    const join =
      'FROM goods_receipts gr LEFT JOIN purchase_orders po ON gr.po_id = po.id';
    const countResult = await query(
      `SELECT COUNT(*) as total ${join} ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT gr.*, po.po_number ${join} ${where} ORDER BY gr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const receipts: GoodsReceipt[] = [];
    for (const row of rows) {
      const gr = rowToReceipt(row);
      gr.lines = await this.findReceiptLines(gr.id);
      receipts.push(gr);
    }
    return { data: receipts, total, offset, limit };
  },

  // ── Supplier Invoices ────────────────────────────────────────────

  async createInvoice(dto: CreateSupplierInvoiceDto): Promise<SupplierInvoice> {
    const id = uid('inv');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO supplier_invoices (id, po_id, receipt_id, invoice_number, invoice_date, due_date, amount, tax_amount, total_amount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.poId,
        dto.receiptId || null,
        dto.invoiceNumber,
        dto.invoiceDate,
        dto.dueDate || null,
        dto.amount,
        dto.taxAmount || 0,
        dto.totalAmount,
        dto.notes || null,
        now,
        now,
      ],
    );

    for (const line of dto.lines) {
      const lid = uid('invl');
      await run(
        `INSERT INTO supplier_invoice_lines (id, invoice_id, line_id, amount, tax_amount, total_amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          lid,
          id,
          line.lineId,
          line.amount,
          line.taxAmount || 0,
          line.totalAmount || line.amount,
        ],
      );
    }

    if (dto.receiptId) {
      await this.updatePOStatus(dto.poId, 'invoiced');
    }

    await this.recordEvent(
      'SupplierInvoice',
      id,
      'INVOICE_RECEIVED',
      JSON.stringify(dto),
      null,
    );
    return this.findInvoiceById(id) as Promise<SupplierInvoice>;
  },

  async findInvoiceById(id: string): Promise<SupplierInvoice | null> {
    const rows = await query('SELECT * FROM supplier_invoices WHERE id = ?', [
      id,
    ]);
    if (!rows.length) return null;
    const inv = rowToInvoice(rows[0]);
    const lineRows = await query(
      'SELECT * FROM supplier_invoice_lines WHERE invoice_id = ?',
      [id],
    );
    inv.lines = lineRows.map(rowToInvoiceLine);
    return inv;
  },

  async listInvoices(poId?: string): Promise<SupplierInvoice[]> {
    if (poId) {
      const rows = await query(
        'SELECT * FROM supplier_invoices WHERE po_id = ? ORDER BY created_at DESC',
        [poId],
      );
      const invoices: SupplierInvoice[] = [];
      for (const row of rows) {
        const inv = rowToInvoice(row);
        const lineRows = await query(
          'SELECT * FROM supplier_invoice_lines WHERE invoice_id = ?',
          [inv.id],
        );
        inv.lines = lineRows.map(rowToInvoiceLine);
        invoices.push(inv);
      }
      return invoices;
    }
    const rows = await query(
      'SELECT * FROM supplier_invoices ORDER BY created_at DESC',
    );
    const invoices: SupplierInvoice[] = [];
    for (const row of rows) {
      const inv = rowToInvoice(row);
      const lineRows = await query(
        'SELECT * FROM supplier_invoice_lines WHERE invoice_id = ?',
        [inv.id],
      );
      inv.lines = lineRows.map(rowToInvoiceLine);
      invoices.push(inv);
    }
    return invoices;
  },

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await run(
      'UPDATE supplier_invoices SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id],
    );
  },

  // ── Purchase Returns ─────────────────────────────────────────────

  async createReturn(
    dto: CreatePurchaseReturnDto,
    createdBy: string,
  ): Promise<PurchaseReturn> {
    const id = uid('ret');
    const number = returnNumber();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO purchase_returns (id, po_id, receipt_id, return_number, return_date, reason, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.poId,
        dto.receiptId || null,
        number,
        dto.returnDate,
        dto.reason,
        dto.notes || null,
        createdBy,
        now,
      ],
    );

    for (const line of dto.lines) {
      const lid = uid('retl');
      await run(
        `INSERT INTO purchase_return_lines (id, return_id, item_id, quantity, unit_cost, total_cost, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          lid,
          id,
          line.itemId || null,
          line.quantity,
          line.unitCost,
          line.quantity * line.unitCost,
          line.reason,
        ],
      );
    }

    await this.updatePOStatus(dto.poId, 'returned');
    await this.recordEvent(
      'PurchaseReturn',
      id,
      'PURCHASE_RETURNED',
      JSON.stringify(dto),
      createdBy,
    );
    return this.findReturnById(id) as Promise<PurchaseReturn>;
  },

  async findReturnById(id: string): Promise<PurchaseReturn | null> {
    const rows = await query(
      `SELECT pr.*, po.po_number FROM purchase_returns pr
       LEFT JOIN purchase_orders po ON pr.po_id = po.id WHERE pr.id = ?`,
      [id],
    );
    if (!rows.length) return null;
    const ret = rowToReturn(rows[0]);
    const lineRows = await query(
      'SELECT * FROM purchase_return_lines WHERE return_id = ?',
      [id],
    );
    ret.lines = lineRows.map(rowToReturnLine);
    return ret;
  },

  async listReturns(poId?: string): Promise<PurchaseReturn[]> {
    if (poId) {
      const rows = await query(
        `SELECT pr.*, po.po_number FROM purchase_returns pr
         LEFT JOIN purchase_orders po ON pr.po_id = po.id WHERE pr.po_id = ? ORDER BY pr.created_at DESC`,
        [poId],
      );
      return rows.map(rowToReturn);
    }
    const rows = await query(
      `SELECT pr.*, po.po_number FROM purchase_returns pr
       LEFT JOIN purchase_orders po ON pr.po_id = po.id ORDER BY pr.created_at DESC`,
    );
    return rows.map(rowToReturn);
  },

  // ── Discrepancies ────────────────────────────────────────────────

  async listDiscrepancies(
    receiptId?: string,
    resolution?: string,
  ): Promise<ReceivingDiscrepancy[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (receiptId) {
      conditions.push('receipt_id = ?');
      params.push(receiptId);
    }
    if (resolution) {
      conditions.push('resolution = ?');
      params.push(resolution);
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM receiving_discrepancies ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToDiscrepancy);
  },

  async resolveDiscrepancy(
    id: string,
    resolution: string,
    notes?: string,
  ): Promise<void> {
    await run(
      'UPDATE receiving_discrepancies SET resolution = ?, notes = ? WHERE id = ?',
      [resolution, notes || null, id],
    );
  },

  // ── Events ───────────────────────────────────────────────────────

  async recordEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: PurchaseEventType,
    data?: string,
    createdBy?: string | null,
  ): Promise<PurchaseEvent> {
    const id = uid('evt');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO purchase_events (id, aggregate_type, aggregate_id, event_type, data, created_by, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        aggregateType,
        aggregateId,
        eventType,
        data || null,
        createdBy || null,
        now,
      ],
    );
    const rows = await query('SELECT * FROM purchase_events WHERE id = ?', [
      id,
    ]);
    return rowToEvent(rows[0]);
  },

  async getEvents(
    aggregateType?: string,
    aggregateId?: string,
  ): Promise<PurchaseEvent[]> {
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
      `SELECT * FROM purchase_events ${where} ORDER BY timestamp DESC`,
      params,
    );
    return rows.map(rowToEvent);
  },

  // ── Reporting ────────────────────────────────────────────────────

  async getSummary(): Promise<PurchaseSummary> {
    const pos = await query(
      'SELECT status, COUNT(*) as cnt FROM purchase_orders GROUP BY status',
    );
    const openStatuses = [
      'draft',
      'submitted',
      'approved',
      'ordered',
      'partially_received',
    ];
    let openPOs = 0;
    let totalPOs = 0;
    let totalValue = 0;
    const statusBreakdown: Record<string, number> = {};
    for (const row of pos) {
      statusBreakdown[row.status] = Number(row.cnt);
      totalPOs += Number(row.cnt);
      if (openStatuses.includes(row.status)) openPOs += Number(row.cnt);
    }

    const valueResult = await query(
      "SELECT COALESCE(SUM(total_cost), 0) as tv FROM purchase_orders WHERE status NOT IN ('cancelled', 'draft')",
    );
    totalValue = Number(valueResult[0]?.tv || 0);

    const pendingReceipts = await query(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE status IN ('ordered', 'approved')",
    );
    const pendingInvoices = await query(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE status IN ('received', 'partially_received')",
    );
    const supplierCounts = await query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM suppliers',
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyResult = await query(
      "SELECT COALESCE(SUM(total_cost), 0) as monthly FROM purchase_orders WHERE status NOT IN ('cancelled', 'draft') AND created_at >= ?",
      [monthStart.toISOString()],
    );

    return {
      totalPOs,
      openPOs,
      totalValue,
      pendingReceipts: Number(pendingReceipts[0]?.cnt || 0),
      pendingInvoices: Number(pendingInvoices[0]?.cnt || 0),
      totalSuppliers: Number(supplierCounts[0]?.total || 0),
      activeSuppliers: Number(supplierCounts[0]?.active || 0),
      monthlySpend: Number(monthlyResult[0]?.monthly || 0),
      statusBreakdown,
    };
  },

  async getSupplierPerformance(
    supplierId: string,
  ): Promise<SupplierPerformance | null> {
    const supplier = await this.findSupplierById(supplierId);
    if (!supplier) return null;

    const poRows = await query(
      `SELECT COUNT(*) as total, COALESCE(SUM(total_cost), 0) as spend,
              AVG(CASE WHEN po.expected_date IS NOT NULL AND po.status = 'received' THEN 1 ELSE 0 END) as on_time
       FROM purchase_orders po WHERE po.supplier_id = ? AND po.status NOT IN ('draft', 'cancelled')`,
      [supplierId],
    );
    const completedRows = await query(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE supplier_id = ? AND status IN ('received', 'invoiced', 'closed')",
      [supplierId],
    );
    const returnRows = await query(
      'SELECT COUNT(*) as cnt FROM purchase_returns pr JOIN purchase_orders po ON pr.po_id = po.id WHERE po.supplier_id = ?',
      [supplierId],
    );
    const lastOrder = await query(
      "SELECT MAX(created_at) as last FROM purchase_orders WHERE supplier_id = ? AND status NOT IN ('draft', 'cancelled')",
      [supplierId],
    );

    const totalPOs = Number(poRows[0]?.total || 0);
    return {
      supplierId,
      supplierName: supplier.name,
      totalPOs,
      completedPOs: Number(completedRows[0]?.cnt || 0),
      totalSpend: Number(poRows[0]?.spend || 0),
      avgLeadTime: supplier.leadTimeDays,
      onTimeDelivery:
        totalPOs > 0
          ? Math.round((Number(poRows[0]?.on_time || 0) * 100) / totalPOs)
          : 0,
      qualityRating: supplier.rating,
      returnRate:
        totalPOs > 0
          ? Math.round((Number(returnRows[0]?.cnt || 0) * 100) / totalPOs)
          : 0,
      lastOrderDate: lastOrder[0]?.last || null,
    };
  },

  async getDb(): Promise<typeof db> {
    return db;
  },
};
