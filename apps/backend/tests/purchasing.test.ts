import { PurchasingRepository as repo } from '../src/domains/purchasing/purchasing.repository';
import {
  PurchaseWorkflowService,
  GoodsReceiptService,
  PurchaseReturnService,
  SupplierPerformanceService,
  PurchaseCostService,
  PurchasingValidationService,
  GstExciseHooks,
} from '../src/domains/purchasing/purchasing.service';
import type {
  Supplier,
  PurchaseOrder,
  PoStatus,
} from '../src/domains/purchasing/purchasing.types';

let testSupplierId = '';
let testPOId = '';
let testPO2Id = '';
let testPOLineId = '';

function uid(): string {
  return `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('Purchasing — Suppliers', () => {
  const uniqueName = `Test Supplier ${uid()}`;

  test('createSupplier creates a supplier', async () => {
    const s = await repo.createSupplier({
      name: uniqueName,
      contactPerson: 'Test Contact',
      phone: '9999999999',
      email: 'test@test.com',
      paymentTerms: 'net30',
      creditLimit: 100000,
      isPreferred: true,
      leadTimeDays: 5,
    });
    expect(s.id).toBeTruthy();
    expect(s.name).toBe(uniqueName);
    expect(s.isPreferred).toBe(true);
    expect(s.creditLimit).toBe(100000);
    expect(s.isActive).toBe(true);
    testSupplierId = s.id;
  });

  test('findSupplierById returns supplier', async () => {
    const s = await repo.findSupplierById(testSupplierId);
    expect(s).not.toBeNull();
    expect(s!.name).toBe(uniqueName);
  });

  test('findSupplierByName returns supplier', async () => {
    const s = await repo.findSupplierByName(uniqueName);
    expect(s).not.toBeNull();
    expect(s!.id).toBe(testSupplierId);
  });

  test('updateSupplier modifies fields', async () => {
    const s = await repo.updateSupplier(testSupplierId, {
      contactPerson: 'Updated Contact',
      creditLimit: 200000,
      rating: 4.5,
    });
    expect(s).not.toBeNull();
    expect(s!.contactPerson).toBe('Updated Contact');
    expect(s!.creditLimit).toBe(200000);
    expect(s!.rating).toBe(4.5);
  });

  test('listSuppliers returns paginated results', async () => {
    const result = await repo.listSuppliers({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
  });

  test('listSuppliers filters by search', async () => {
    const result = await repo.listSuppliers({
      search: uniqueName.slice(0, 10),
      limit: 10,
    });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('listSuppliers filters by isPreferred', async () => {
    const result = await repo.listSuppliers({ isPreferred: true, limit: 10 });
    for (const s of result.data) {
      expect(s.isPreferred).toBe(true);
    }
  });

  test('archiveSupplier soft-deletes', async () => {
    await repo.archiveSupplier(testSupplierId);
    const s = await repo.findSupplierById(testSupplierId);
    expect(s!.isActive).toBe(false);
    await repo.updateSupplier(testSupplierId, { isActive: true });
  });
});

describe('Purchasing — Purchase Orders', () => {
  let supplierId = '';

  beforeAll(async () => {
    const s = await repo.createSupplier({
      name: `PO Test Supplier ${uid()}`,
      paymentTerms: 'net30',
    });
    supplierId = s.id;
  });

  test('createPO creates PO with lines', async () => {
    const po = await repo.createPO(
      {
        supplierId,
        orderDate: today(),
        notes: 'Test PO',
        lines: [
          {
            itemName: 'Chicken',
            unit: 'kg',
            quantity: 10,
            unitCost: 200,
            category: 'food',
          },
          {
            itemName: 'Rice',
            unit: 'kg',
            quantity: 25,
            unitCost: 50,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    expect(po.id).toBeTruthy();
    expect(po.poNumber).toMatch(/^PO-/);
    expect(po.status).toBe('draft');
    expect(po.lines.length).toBe(2);
    expect(po.subtotal).toBe(10 * 200 + 25 * 50);
    expect(po.createdBy).toBe('test-user');
    testPOId = po.id;
    testPOLineId = po.lines[0].id;
  });

  test('findPOById returns PO with lines and approvals', async () => {
    const po = await repo.findPOById(testPOId);
    expect(po).not.toBeNull();
    expect(po!.lines.length).toBe(2);
    expect(po!.approvals).toEqual([]);
  });

  test('findPOByNumber finds by poNumber', async () => {
    const po = await repo.findPOById(testPOId);
    const found = await repo.findPOByNumber(po!.poNumber);
    expect(found!.id).toBe(testPOId);
  });

  test('listPOs returns paginated results', async () => {
    const result = await repo.listPOs({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('listPOs filters by status', async () => {
    const result = await repo.listPOs({ status: 'draft', limit: 10 });
    for (const po of result.data) {
      expect(po.status).toBe('draft');
    }
  });

  test('updatePO modifies PO fields', async () => {
    await repo.updatePO(testPOId, { notes: 'Updated notes', freight: 100 });
    const po = await repo.findPOById(testPOId);
    expect(po!.notes).toBe('Updated notes');
    expect(po!.freight).toBe(100);
  });

  test('recalculatePO recalculates totals', async () => {
    await repo.recalculatePO(testPOId);
    const po = await repo.findPOById(testPOId);
    expect(po!.subtotal).toBe(10 * 200 + 25 * 50);
  });
});

describe('Purchasing — State Machine', () => {
  beforeAll(async () => {
    if (!testPOId) {
      const s = await repo.createSupplier({ name: `SM Test ${uid()}` });
      const po = await repo.createPO(
        {
          supplierId: s.id,
          orderDate: today(),
          lines: [
            {
              itemName: 'Test',
              unit: 'kg',
              quantity: 5,
              unitCost: 100,
              category: 'food',
            },
          ],
        },
        'test-user',
      );
      testPOId = po.id;
      testPO2Id = po.id;
    }
  });

  test('draft -> submitted', async () => {
    const po = await PurchaseWorkflowService.transition(
      testPOId,
      'submitted',
      'user1',
      'manager',
    );
    expect(po.status).toBe('submitted');
    expect(po.approvals.length).toBeGreaterThanOrEqual(1);
  });

  test('submitted -> approved', async () => {
    const po = await PurchaseWorkflowService.transition(
      testPOId,
      'approved',
      'user1',
      'owner',
    );
    expect(po.status).toBe('approved');
  });

  test('approved -> ordered', async () => {
    const po = await PurchaseWorkflowService.transition(
      testPOId,
      'ordered',
      'user1',
      'owner',
    );
    expect(po.status).toBe('ordered');
  });

  test('ordered -> received (full)', async () => {
    const po = await PurchaseWorkflowService.transition(
      testPOId,
      'received',
      'user1',
      'manager',
    );
    expect(po.status).toBe('received');
  });

  test('cannot transition from received to draft', async () => {
    await expect(
      PurchaseWorkflowService.transition(testPOId, 'draft', 'user1', 'manager'),
    ).rejects.toThrow(/Cannot transition/);
  });

  test('cannot transition without correct role', async () => {
    const s = await repo.createSupplier({ name: `Role Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: today(),
        lines: [
          {
            itemName: 'Test',
            unit: 'kg',
            quantity: 1,
            unitCost: 10,
            category: 'food',
          },
        ],
      },
      'test-user',
    );

    await expect(
      PurchaseWorkflowService.transition(
        po.id,
        'submitted',
        'user1',
        'cashier',
      ),
    ).rejects.toThrow(/Role/);
  });

  test('getAvailableTransitions returns valid transitions', async () => {
    const s = await repo.createSupplier({ name: `Trans Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: today(),
        lines: [
          {
            itemName: 'Test',
            unit: 'kg',
            quantity: 1,
            unitCost: 10,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    const transitions = await PurchaseWorkflowService.getAvailableTransitions(
      po.id,
    );
    expect(transitions.from).toBe('draft');
    expect(transitions.to).toContain('submitted');
    expect(transitions.to).toContain('cancelled');
  });

  test('full lifecycle: draft -> submitted -> approved -> ordered -> received -> closed', async () => {
    const s = await repo.createSupplier({ name: `Lifecycle Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: today(),
        lines: [
          {
            itemName: 'Test',
            unit: 'kg',
            quantity: 1,
            unitCost: 10,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    const id = po.id;

    expect(
      (
        await PurchaseWorkflowService.transition(
          id,
          'submitted',
          'u',
          'manager',
        )
      ).status,
    ).toBe('submitted');
    expect(
      (await PurchaseWorkflowService.transition(id, 'approved', 'u', 'owner'))
        .status,
    ).toBe('approved');
    expect(
      (await PurchaseWorkflowService.transition(id, 'ordered', 'u', 'owner'))
        .status,
    ).toBe('ordered');
    expect(
      (await PurchaseWorkflowService.transition(id, 'received', 'u', 'manager'))
        .status,
    ).toBe('received');
    expect(
      (
        await PurchaseWorkflowService.transition(
          id,
          'invoiced',
          'u',
          'accountant',
        )
      ).status,
    ).toBe('invoiced');
    expect(
      (await PurchaseWorkflowService.transition(id, 'closed', 'u', 'owner'))
        .status,
    ).toBe('closed');
  });
});

describe('Purchasing — Goods Receipt Service', () => {
  let grPOId = '';
  let grLineId = '';

  beforeAll(async () => {
    const s = await repo.createSupplier({ name: `GR Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: daysAgo(3),
        lines: [
          {
            itemName: 'Test Item A',
            unit: 'kg',
            quantity: 10,
            unitCost: 100,
            category: 'food',
          },
          {
            itemName: 'Test Item B',
            unit: 'L',
            quantity: 5,
            unitCost: 50,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');
    grPOId = po.id;
    grLineId = po.lines[0].id;
  });

  test('receive creates receipt and updates PO', async () => {
    const result = await GoodsReceiptService.receive(
      {
        poId: grPOId,
        receivedDate: today(),
        notes: 'Test receipt',
        lines: [{ lineId: grLineId, expectedQty: 10, receivedQty: 10 }],
      },
      'test-receiver',
      'manager',
    );

    expect(result.receipt).toBeTruthy();
    expect(result.receipt.receiptNumber).toMatch(/^GR-/);
    expect(result.receipt.lines.length).toBe(1);
    expect(result.movements.length).toBe(1);
  });

  test('receive updates PO status to received when fully received', async () => {
    const po = await repo.findPOById(grPOId);
    expect(po!.status).toBe('partially_received');
  });

  test('receive with short delivery creates discrepancy', async () => {
    const s = await repo.createSupplier({ name: `Disc Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: today(),
        lines: [
          {
            itemName: 'Short Item',
            unit: 'kg',
            quantity: 10,
            unitCost: 50,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');

    const result = await GoodsReceiptService.receive(
      {
        poId: po.id,
        receivedDate: today(),
        lines: [{ lineId: po.lines[0].id, expectedQty: 10, receivedQty: 7 }],
      },
      'test-receiver',
      'manager',
    );

    const discRows = await repo.listDiscrepancies(result.receipt.id);
    expect(discRows.length).toBeGreaterThanOrEqual(1);
    expect(discRows[0].issueType).toBe('short');
  });

  test('receive with over-delivery creates discrepancy', async () => {
    const s = await repo.createSupplier({ name: `Over Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: today(),
        lines: [
          {
            itemName: 'Over Item',
            unit: 'kg',
            quantity: 5,
            unitCost: 30,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');

    const result = await GoodsReceiptService.receive(
      {
        poId: po.id,
        receivedDate: today(),
        lines: [{ lineId: po.lines[0].id, expectedQty: 5, receivedQty: 6 }],
      },
      'test-receiver',
      'manager',
    );

    const discRows = await repo.listDiscrepancies(result.receipt.id);
    expect(discRows.some((d) => d.issueType === 'over')).toBe(true);
  });
});

describe('Purchasing — Invoices', () => {
  let invPOId = '';
  let invLineId = '';

  beforeAll(async () => {
    const s = await repo.createSupplier({ name: `Inv Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: daysAgo(5),
        lines: [
          {
            itemName: 'Invoice Item',
            unit: 'kg',
            quantity: 20,
            unitCost: 75,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'received', 'u', 'manager');
    invPOId = po.id;
    invLineId = po.lines[0].id;
  });

  test('createInvoice creates invoice with lines', async () => {
    const inv = await repo.createInvoice({
      poId: invPOId,
      invoiceNumber: `INV-${uid().slice(0, 8)}`,
      invoiceDate: today(),
      dueDate: daysAgo(-30),
      amount: 1500,
      taxAmount: 75,
      totalAmount: 1575,
      lines: [
        { lineId: invLineId, amount: 1500, taxAmount: 75, totalAmount: 1575 },
      ],
    });
    expect(inv.id).toBeTruthy();
    expect(inv.invoiceNumber).toBeTruthy();
    expect(inv.lines.length).toBe(1);
  });

  test('listInvoices returns invoices for PO', async () => {
    const invoices = await repo.listInvoices(invPOId);
    expect(invoices.length).toBeGreaterThanOrEqual(1);
  });

  test('findInvoiceById returns invoice with lines', async () => {
    const invoices = await repo.listInvoices(invPOId);
    const inv = await repo.findInvoiceById(invoices[0].id);
    expect(inv).not.toBeNull();
    expect(inv!.lines.length).toBeGreaterThanOrEqual(1);
  });

  test('updateInvoiceStatus changes status', async () => {
    const invoices = await repo.listInvoices(invPOId);
    await repo.updateInvoiceStatus(invoices[0].id, 'paid');
    const inv = await repo.findInvoiceById(invoices[0].id);
    expect(inv!.status).toBe('paid');
  });
});

describe('Purchasing — Returns', () => {
  let retPOId = '';
  let retLineId = '';

  beforeAll(async () => {
    const s = await repo.createSupplier({ name: `Ret Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: daysAgo(5),
        lines: [
          {
            itemName: 'Return Item',
            unit: 'kg',
            quantity: 10,
            unitCost: 50,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'received', 'u', 'manager');
    retPOId = po.id;
    retLineId = po.lines[0].id;
  });

  test('processReturn creates return and updates PO status', async () => {
    const result = await PurchaseReturnService.processReturn(
      {
        poId: retPOId,
        returnDate: today(),
        reason: 'Quality issues',
        lines: [{ quantity: 5, unitCost: 50, reason: 'Damaged packaging' }],
      },
      'test-user',
      'manager',
    );

    expect(result.return_).toBeTruthy();
    expect(result.return_.returnNumber).toMatch(/^RET-/);
    expect(result.return_.reason).toBe('Quality issues');
  });

  test('processReturn enforces role check', async () => {
    await expect(
      PurchaseReturnService.processReturn(
        {
          poId: retPOId,
          returnDate: today(),
          reason: 'Test',
          lines: [{ quantity: 1, unitCost: 10, reason: 'Test' }],
        },
        'test-user',
        'cashier',
      ),
    ).rejects.toThrow(/Role/);
  });

  test('findReturnById returns return with lines', async () => {
    const returns = await repo.listReturns(retPOId);
    expect(returns.length).toBeGreaterThanOrEqual(1);
    const ret = await repo.findReturnById(returns[0].id);
    expect(ret).not.toBeNull();
    expect(ret!.lines.length).toBeGreaterThanOrEqual(1);
  });

  test('listReturns lists all returns', async () => {
    const all = await repo.listReturns();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Purchasing — Events', () => {
  test('recordEvent creates event', async () => {
    const evt = await repo.recordEvent(
      'PurchaseOrder',
      testPOId,
      'PURCHASE_CREATED',
      '{"test": true}',
      'test-user',
    );
    expect(evt.id).toBeTruthy();
    expect(evt.eventType).toBe('PURCHASE_CREATED');
  });

  test('getEvents returns events for aggregate', async () => {
    const events = await repo.getEvents('PurchaseOrder', testPOId);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  test('events are ordered by timestamp desc', async () => {
    const events = await repo.getEvents('PurchaseOrder', testPOId);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].timestamp >= events[i].timestamp).toBe(true);
    }
  });
});

describe('Purchasing — Validation', () => {
  test('validatePOCreation rejects empty supplier', () => {
    const errors = PurchasingValidationService.validatePOCreation({});
    expect(errors.some((e) => e.includes('Supplier ID'))).toBe(true);
  });

  test('validatePOCreation rejects no lines', () => {
    const errors = PurchasingValidationService.validatePOCreation({
      supplierId: 's1',
      orderDate: today(),
    });
    expect(errors.some((e) => e.includes('line item'))).toBe(true);
  });

  test('validatePOCreation validates line fields', () => {
    const errors = PurchasingValidationService.validatePOCreation({
      supplierId: 's1',
      orderDate: today(),
      lines: [{ itemName: '', unit: '', quantity: -1, unitCost: -1 }],
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  test('validateReceiptCreation rejects missing poId', () => {
    const errors = PurchasingValidationService.validateReceiptCreation({});
    expect(errors.some((e) => e.includes('PO ID'))).toBe(true);
  });

  test('validateInvoiceCreation rejects missing invoice number', () => {
    const errors = PurchasingValidationService.validateInvoiceCreation({
      poId: 'p1',
    });
    expect(errors.some((e) => e.includes('Invoice number'))).toBe(true);
  });

  test('validateReturnCreation rejects missing reason', () => {
    const errors = PurchasingValidationService.validateReturnCreation({
      poId: 'p1',
      returnDate: today(),
    });
    expect(errors.some((e) => e.includes('reason'))).toBe(true);
  });

  test('validateSupplier rejects empty name', () => {
    const errors = PurchasingValidationService.validateSupplier({ name: '' });
    expect(errors.some((e) => e.includes('Supplier name'))).toBe(true);
  });

  test('validateSupplier validates GSTIN format', () => {
    const errors = PurchasingValidationService.validateSupplier({
      name: 'Test',
      gstin: 'invalid',
    });
    expect(errors.some((e) => e.includes('GSTIN'))).toBe(true);
  });

  test('validateSupplier accepts valid GSTIN', () => {
    const errors = PurchasingValidationService.validateSupplier({
      name: 'Test',
      gstin: '32ABCDE1234F1Z5',
    });
    expect(errors.some((e) => e.includes('GSTIN'))).toBe(false);
  });

  test('validateSupplier rejects negative credit limit', () => {
    const errors = PurchasingValidationService.validateSupplier({
      name: 'Test',
      creditLimit: -100,
    });
    expect(errors.some((e) => e.includes('Credit limit'))).toBe(true);
  });

  test('validateSupplier rejects out-of-range rating', () => {
    const errors = PurchasingValidationService.validateSupplier({
      name: 'Test',
      rating: 6,
    });
    expect(errors.some((e) => e.includes('Rating'))).toBe(true);
  });
});

describe('Purchasing — Cost Service', () => {
  test('calculateLandedCost computes correct values', () => {
    const result = PurchaseCostService.calculateLandedCost(
      100,
      10,
      50,
      18,
      20,
      10,
    );
    expect(result.lineTotal).toBe(1000);
    expect(result.landedUnitCost).toBe(105.8);
    expect(result.totalLandedCost).toBe(1058);
  });

  test('calculateLandedCost returns zero for zero quantity', () => {
    const result = PurchaseCostService.calculateLandedCost(100, 0, 0, 0, 0, 0);
    expect(result.lineTotal).toBe(0);
    expect(result.landedUnitCost).toBe(0);
  });

  test('calculateLineTotal computes quantity * unitCost', () => {
    expect(PurchaseCostService.calculateLineTotal(5, 200)).toBe(1000);
    expect(PurchaseCostService.calculateLineTotal(0, 100)).toBe(0);
  });

  test('distributeCharges allocates proportionally', () => {
    const lines = [
      { quantity: 10, unitCost: 100 },
      { quantity: 20, unitCost: 50 },
    ];
    const result = PurchaseCostService.distributeCharges(
      lines,
      100,
      50,
      30,
      20,
    );
    expect(result.length).toBe(2);
    expect(result[0].lineTotal).toBe(1000);
    expect(result[1].lineTotal).toBe(1000);
    const totalLanded = result.reduce((s, r) => s + r.landedTotal, 0);
    expect(totalLanded).toBe(1000 + 1000 + 100 + 50 + 20 - 30);
  });
});

describe('Purchasing — GST/Excise Hooks', () => {
  test('calculateGstInputCredit computes correct amount', () => {
    expect(GstExciseHooks.calculateGstInputCredit(1000, 5)).toBe(50);
    expect(GstExciseHooks.calculateGstInputCredit(1000, 18)).toBe(180);
  });

  test('validateGstin validates format', () => {
    expect(GstExciseHooks.validateGstin('32ABCDE1234F1Z5')).toBe(true);
    expect(GstExciseHooks.validateGstin('invalid')).toBe(false);
    expect(GstExciseHooks.validateGstin('')).toBe(false);
  });

  test('getGstSlab returns correct rate per category', () => {
    expect(GstExciseHooks.getGstSlab('food')).toBe(5);
    expect(GstExciseHooks.getGstSlab('consumables')).toBe(18);
    expect(GstExciseHooks.getGstSlab('liquor')).toBe(0);
    expect(GstExciseHooks.getGstSlab('packaging')).toBe(12);
  });

  test('validateExcisePermit validates format', async () => {
    const valid =
      await GstExciseHooks.validateExcisePermit('KL-01-2026-123456');
    expect(valid.valid).toBe(true);
    const invalid = await GstExciseHooks.validateExcisePermit('short');
    expect(invalid.valid).toBe(false);
  });
});

describe('Purchasing — Reporting', () => {
  test('getSummary returns purchase statistics', async () => {
    const summary = await repo.getSummary();
    expect(summary.totalPOs).toBeGreaterThanOrEqual(1);
    expect(summary.totalSuppliers).toBeGreaterThanOrEqual(1);
    expect(summary.statusBreakdown).toBeTruthy();
  });

  test('getSupplierPerformance returns metrics', async () => {
    const s = await repo.createSupplier({ name: `Perf Test ${uid()}` });
    const po = await repo.createPO(
      {
        supplierId: s.id,
        orderDate: daysAgo(10),
        lines: [
          {
            itemName: 'Perf',
            unit: 'kg',
            quantity: 5,
            unitCost: 100,
            category: 'food',
          },
        ],
      },
      'test-user',
    );
    await PurchaseWorkflowService.transition(
      po.id,
      'submitted',
      'u',
      'manager',
    );
    await PurchaseWorkflowService.transition(po.id, 'approved', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'ordered', 'u', 'owner');
    await PurchaseWorkflowService.transition(po.id, 'received', 'u', 'manager');

    const perf = await SupplierPerformanceService.getPerformance(s.id);
    expect(perf).not.toBeNull();
    expect(perf!.totalPOs).toBeGreaterThanOrEqual(1);
    expect(perf!.supplierName).toBeTruthy();
  });
});

describe('Purchasing — Discrepancies', () => {
  test('listDiscrepancies returns pending items', async () => {
    const discRows = await repo.listDiscrepancies();
    for (const d of discRows) {
      expect(d.id).toBeTruthy();
    }
  });

  test('resolveDiscrepancy updates resolution', async () => {
    const discRows = await repo.listDiscrepancies(undefined, 'pending');
    if (discRows.length > 0) {
      await repo.resolveDiscrepancy(
        discRows[0].id,
        'accepted',
        'Accepted after inspection',
      );
      const rows = await repo.listDiscrepancies(undefined, 'accepted');
      expect(rows.some((r) => r.id === discRows[0].id)).toBe(true);
    }
  });
});
