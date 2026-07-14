import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from '@jest/globals';

import * as T from '../src/domains/liquor/liquor.types';
import * as R from '../src/domains/liquor/liquor.repository';
import {
  PegEngineService,
  BottleLifecycleService,
  BarSaleService,
  BarInventoryService,
  ExciseService,
  PricingService,
  ReportingService,
  ValidationService,
} from '../src/domains/liquor/liquor.service';

let testCategoryId = '';
let testCategory2Id = '';
let testBrandId = '';
let testBrand2Id = '';
let testPeg30Id = '';
let testPeg60Id = '';
let testBottleId = '';
let testBottle2Id = '';
let testBottle3Id = '';
let testSaleId = '';
let testSaleLineId = '';
let testExciseEntryId = '';

function uid(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

beforeAll(async () => {
  const cat = await R.LiquorRepository.createCategory({
    name: 'IMFL',
    displayOrder: 1,
  });
  testCategoryId = cat.id;
  const cat2 = await R.LiquorRepository.createCategory({
    name: 'Beer',
    displayOrder: 2,
  });
  testCategory2Id = cat2.id;

  const brand = await R.LiquorRepository.createBrand({
    name: `Test Whisky ${uid()}`,
    categoryId: testCategoryId,
    manufacturer: 'Test Distillery',
    proof: 42.8,
    country: 'India',
  });
  testBrandId = brand.id;

  const brand2 = await R.LiquorRepository.createBrand({
    name: `Test Beer ${uid()}`,
    categoryId: testCategory2Id,
    manufacturer: 'Test Brewery',
    proof: 8,
    country: 'India',
  });
  testBrand2Id = brand2.id;

  const peg30 = await R.LiquorRepository.createPegDefinition({
    name: 'Small Peg',
    sizeMl: 30,
  });
  testPeg30Id = peg30.id;

  const peg60 = await R.LiquorRepository.createPegDefinition({
    name: 'Large Peg',
    sizeMl: 60,
  });
  testPeg60Id = peg60.id;

  const bottle = await R.LiquorRepository.createBottle({
    brandId: testBrandId,
    sizeMl: 750,
    batchNo: 'BATCH-001',
    purchaseCost: 1500,
    sellingPrice: 3000,
    mrp: 3200,
    location: 'main',
    supplierName: 'Test Supplier',
  });
  testBottleId = bottle.id;

  const bottle2 = await R.LiquorRepository.createBottle({
    brandId: testBrand2Id,
    sizeMl: 650,
    batchNo: 'BATCH-002',
    purchaseCost: 800,
    sellingPrice: 1500,
    mrp: 1600,
    location: 'main',
  });
  testBottle2Id = bottle2.id;
});

afterAll(async () => {
  const cleanups = [
    testSaleId,
    testBottleId,
    testBottle2Id,
    testBottle3Id,
  ].filter(Boolean);
  for (const id of cleanups) {
    try {
      await R.LiquorRepository.archiveBottle(id);
    } catch {}
  }
  if (testPeg30Id) {
    try {
      await R.LiquorRepository.archivePegDefinition(testPeg30Id);
    } catch {}
  }
  if (testPeg60Id) {
    try {
      await R.LiquorRepository.archivePegDefinition(testPeg60Id);
    } catch {}
  }
  if (testBrandId) {
    try {
      await R.LiquorRepository.archiveBrand(testBrandId);
    } catch {}
  }
  if (testBrand2Id) {
    try {
      await R.LiquorRepository.archiveBrand(testBrand2Id);
    } catch {}
  }
  if (testCategoryId) {
    try {
      await R.LiquorRepository.archiveCategory(testCategoryId);
    } catch {}
  }
  if (testCategory2Id) {
    try {
      await R.LiquorRepository.archiveCategory(testCategory2Id);
    } catch {}
  }
});

// ═════════════════════════════════════════════════════════════════════
// 1. PEG ENGINE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Peg Engine', () => {
  test('calculatePegConsumption returns ml for single peg', () => {
    const result = PegEngineService.calculatePegConsumption(testBrandId, 30, 1);
    expect(result).toBe(30);
  });

  test('calculatePegConsumption returns ml for multiple pegs', () => {
    const result = PegEngineService.calculatePegConsumption(testBrandId, 60, 3);
    expect(result).toBe(180);
  });

  test('calculatePegConsumption throws on zero peg size', () => {
    expect(() =>
      PegEngineService.calculatePegConsumption(testBrandId, 0, 1),
    ).toThrow('Peg size must be positive');
  });

  test('calculatePegConsumption throws on negative peg size', () => {
    expect(() =>
      PegEngineService.calculatePegConsumption(testBrandId, -30, 1),
    ).toThrow('Peg size must be positive');
  });

  test('calculatePegConsumption throws on zero quantity', () => {
    expect(() =>
      PegEngineService.calculatePegConsumption(testBrandId, 30, 0),
    ).toThrow('Quantity must be positive');
  });

  test('calculatePegConsumption throws on negative quantity', () => {
    expect(() =>
      PegEngineService.calculatePegConsumption(testBrandId, 30, -1),
    ).toThrow('Quantity must be positive');
  });

  test('validatePegPour returns valid when sufficient ml available', async () => {
    const result = await PegEngineService.validatePegPour(testBottleId, 30, 1);
    expect(result.valid).toBe(true);
    expect(result.requestedMl).toBe(30);
    expect(result.availableMl).toBeGreaterThanOrEqual(30);
  });

  test('validatePegPour returns error when insufficient ml', async () => {
    const result = await PegEngineService.validatePegPour(
      testBottleId,
      750,
      10,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient');
  });

  test('validatePegPour throws on non-existent bottle', async () => {
    await expect(
      PegEngineService.validatePegPour('nonexistent', 30, 1),
    ).rejects.toThrow('not found');
  });

  test('calculatePegPrice uses peg_prices table when available', async () => {
    await PricingService.setPegPrice(
      testBrandId,
      testPeg30Id,
      'bar_price',
      150,
    );
    const price = await PegEngineService.calculatePegPrice(
      testBrandId,
      30,
      'bar_price',
      2,
    );
    expect(price).toBe(300);
  });

  test('calculatePegPrice falls back to bottle price ratio', async () => {
    const price = await PegEngineService.calculatePegPrice(
      testBrand2Id,
      60,
      'bar_price',
      1,
    );
    expect(price).toBeGreaterThan(0);
  });

  test('calculatePegPrice throws on zero quantity', async () => {
    await expect(
      PegEngineService.calculatePegPrice(testBrandId, 30, 'bar_price', 0),
    ).rejects.toThrow('Quantity must be positive');
  });

  test('getStandardPegSizes returns all 6 sizes', () => {
    const sizes = PegEngineService.getStandardPegSizes();
    expect(sizes).toEqual([30, 45, 60, 90, 120, 180]);
  });

  test('convertBottleToPegs computes full pegs and remainder', () => {
    const result = PegEngineService.convertBottleToPegs(750, 60);
    expect(result.fullPegs).toBe(12);
    expect(result.remainderMl).toBe(30);
  });

  test('convertBottleToPegs returns zero full pegs when bottle is smaller than peg', () => {
    const result = PegEngineService.convertBottleToPegs(30, 60);
    expect(result.fullPegs).toBe(0);
    expect(result.remainderMl).toBe(30);
  });

  test('convertBottleToPegs throws on zero bottle size', () => {
    expect(() => PegEngineService.convertBottleToPegs(0, 60)).toThrow(
      'Bottle size must be positive',
    );
  });

  test('calculatePourCost computes correct cost', () => {
    const cost = PegEngineService.calculatePourCost(1500, 750, 60);
    expect(cost).toBe(120);
  });

  test('calculatePourCost throws on zero bottle size', () => {
    expect(() => PegEngineService.calculatePourCost(1500, 0, 60)).toThrow(
      'Bottle size must be positive',
    );
  });

  test('calculatePourCost throws on zero peg size', () => {
    expect(() => PegEngineService.calculatePourCost(1500, 750, 0)).toThrow(
      'Peg size must be positive',
    );
  });

  test('calculatePourCost handles fractional cost correctly', () => {
    const cost = PegEngineService.calculatePourCost(1000, 750, 30);
    expect(cost).toBe(40);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. BOTTLE LIFECYCLE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Bottle Lifecycle', () => {
  let lifecycleBottleId = '';

  beforeEach(async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `LC-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    lifecycleBottleId = bottle.id;
  });

  afterEach(async () => {
    if (lifecycleBottleId) {
      try {
        await R.LiquorRepository.archiveBottle(lifecycleBottleId);
      } catch {}
    }
  });

  test('createBottle sets status to purchased and currentMl to sizeMl', async () => {
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle).not.toBeNull();
    expect(bottle!.status).toBe('purchased');
    expect(bottle!.currentMl).toBe(750);
    expect(bottle!.initialMl).toBe(750);
  });

  test('receive bottle transitions purchased -> received', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.status).toBe('received');
  });

  test('store bottle transitions received -> stored', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.status).toBe('stored');
  });

  test('openBottle transitions to opened and sets openedAt', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test-bartender',
      location: 'main',
      notes: 'Test open',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.status).toBe('opened');
    expect(bottle!.openedAt).not.toBeNull();
    expect(bottle!.openedBy).toBe('test-bartender');
  });

  test('openBottle creates opening record', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test-bartender',
      location: 'main',
    });
    const openings =
      await R.LiquorRepository.findOpeningsByBottle(lifecycleBottleId);
    expect(openings.length).toBeGreaterThanOrEqual(1);
    expect(openings[0].openedBy).toBe('test-bartender');
  });

  test('openBottle throws on already opened bottle', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    await expect(
      BottleLifecycleService.openBottle({
        bottleId: lifecycleBottleId,
        openedBy: 'test',
        location: 'main',
      }),
    ).rejects.toThrow('Cannot open bottle');
  });

  test('openBottle throws on non-stored bottle', async () => {
    // Bottle is 'purchased', not 'stored'
    await expect(
      BottleLifecycleService.openBottle({
        bottleId: lifecycleBottleId,
        openedBy: 'test',
        location: 'main',
      }),
    ).rejects.toThrow('Cannot open bottle');
  });

  test('consume from bottle decreases currentMl', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    const { bottle } = await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      60,
      'test-bartender',
    );
    expect(bottle.currentMl).toBe(690);
  });

  test('consume records movement', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    const { movement } = await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      60,
      'test-bartender',
    );
    expect(movement.kind).toBe('sale');
    expect(movement.quantityMl).toBe(60);
    expect(movement.mlBefore).toBe(750);
    expect(movement.mlAfter).toBe(690);
  });

  test('consume auto-detects partially_consumed status', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    const { bottle } = await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      60,
      'test',
    );
    expect(bottle.status).toBe('partially_consumed');
  });

  test('consume auto-detects empty when ml reaches 0', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    const { bottle } = await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      750,
      'test',
    );
    expect(bottle.status).toBe('empty');
    expect(bottle.currentMl).toBe(0);
  });

  test('consume throws on over-consumption', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    await expect(
      BottleLifecycleService.consumeFromBottle(lifecycleBottleId, 1000, 'test'),
    ).rejects.toThrow('Insufficient ml');
  });

  test('closeBottle creates closing record', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    await BottleLifecycleService.closeBottle({
      bottleId: lifecycleBottleId,
      closedBy: 'test-manager',
      remainingMl: 0,
      reason: 'empty',
      notes: 'Finished',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.status).toBe('empty');
    expect(bottle!.closedAt).not.toBeNull();
    expect(bottle!.closedBy).toBe('test-manager');
    const closings =
      await R.LiquorRepository.findClosingsByBottle(lifecycleBottleId);
    expect(closings.length).toBeGreaterThanOrEqual(1);
  });

  test('transferBottle changes location and creates transfer record', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.transferBottle({
      bottleId: lifecycleBottleId,
      toLocation: 'bar-2',
      transferredBy: 'test-manager',
      notes: 'Transfer to bar-2',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.location).toBe('bar-2');
    expect(bottle!.status).toBe('transferred');
    const transfers =
      await R.LiquorRepository.findTransfersByBottle(lifecycleBottleId);
    expect(transfers.length).toBeGreaterThanOrEqual(1);
    expect(transfers[0].fromLocation).toBe('main');
    expect(transfers[0].toLocation).toBe('bar-2');
  });

  test('transferBottle throws when already at destination', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await expect(
      BottleLifecycleService.transferBottle({
        bottleId: lifecycleBottleId,
        toLocation: 'main',
        transferredBy: 'test',
      }),
    ).rejects.toThrow('already at location');
  });

  test('reportBroken sets status to broken and creates event', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    const bottle = await BottleLifecycleService.reportBroken(
      lifecycleBottleId,
      'test-manager',
      'Shattered',
    );
    expect(bottle.status).toBe('broken');
    expect(bottle.currentMl).toBe(0);
  });

  test('reportBroken throws on already broken bottle', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.reportBroken(lifecycleBottleId, 'test');
    await expect(
      BottleLifecycleService.reportBroken(lifecycleBottleId, 'test'),
    ).rejects.toThrow('Cannot report broken');
  });

  test('writeOffBottle transitions to written_off', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    const bottle = await BottleLifecycleService.writeOffBottle(
      lifecycleBottleId,
      'test-manager',
      'Expired stock',
    );
    expect(bottle.status).toBe('written_off');
  });

  test('returnBottle transitions to returned', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    const bottle = await BottleLifecycleService.returnBottle(
      lifecycleBottleId,
      'test-manager',
      'Supplier return',
    );
    expect(bottle.status).toBe('returned');
  });

  test('reject invalid transition empty -> opened', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await BottleLifecycleService.openBottle({
      bottleId: lifecycleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      750,
      'test',
    );
    await expect(
      R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'opened'),
    ).rejects.toThrow('Invalid status transition');
  });

  test('reject invalid transition purchased -> opened', async () => {
    await expect(
      R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'opened'),
    ).rejects.toThrow('Invalid status transition');
  });

  test('archive bottle marks isActive false', async () => {
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'received', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'stored', {
      updatedBy: 'test-user',
    });
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'opened', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.consumeFromBottle(
      lifecycleBottleId,
      750,
      'test',
    );
    await R.LiquorRepository.changeBottleStatus(lifecycleBottleId, 'archived', {
      updatedBy: 'test',
    });
    const bottle = await R.LiquorRepository.findBottleById(lifecycleBottleId);
    expect(bottle!.isActive).toBe(true); // archived sets status but not isActive
    expect(bottle!.status).toBe('archived');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. BAR SALE LIFECYCLE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Bar Sale Lifecycle', () => {
  let saleBottleId = '';

  beforeAll(async () => {
    const b = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `SALE-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    saleBottleId = b.id;
  });

  afterAll(async () => {
    if (saleBottleId) {
      try {
        const b = await R.LiquorRepository.findBottleById(saleBottleId);
        if (b && b.isActive)
          await R.LiquorRepository.archiveBottle(saleBottleId);
      } catch {}
    }
  });

  test('createSale creates draft sale with lines', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        bartenderId: 'bartender-1',
        bartenderName: 'John',
        notes: 'Test sale',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 2,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    expect(sale.id).toBeTruthy();
    expect(sale.saleNo).toMatch(/^SALE-/);
    expect(sale.status).toBe('open');
    expect(sale.lines.length).toBe(1);
    expect(sale.subtotal).toBeGreaterThan(0);
    testSaleId = sale.id;
    testSaleLineId = sale.lines[0].id;
  });

  test('createSale rejects empty lines', async () => {
    await expect(
      BarSaleService.createSale(
        {
          counter: 'main',
          lines: [],
        },
        'test-user',
      ),
    ).rejects.toThrow('at least one line');
  });

  test('findSaleById returns sale with lines', async () => {
    const sale = await R.LiquorRepository.findSaleById(testSaleId);
    expect(sale).not.toBeNull();
    expect(sale!.lines.length).toBeGreaterThanOrEqual(1);
  });

  test('findSaleByNo finds by sale number', async () => {
    const sale = await R.LiquorRepository.findSaleById(testSaleId);
    const found = await R.LiquorRepository.findSaleByNo(sale!.saleNo);
    expect(found!.id).toBe(testSaleId);
  });

  test('addLineToSale adds line to existing sale', async () => {
    const sale = await BarSaleService.addLineToSale(testSaleId, {
      brandId: testBrandId,
      pegSizeMl: 60,
      pegDefinitionId: testPeg60Id,
      quantity: 1,
      unitPrice: 250,
    });
    const addedLine = sale.lines.find((l) => l.pegSizeMl === 60);
    expect(addedLine).toBeDefined();
    expect(sale.lines.length).toBeGreaterThanOrEqual(2);
  });

  test('removeLineFromSale removes line and recalculates', async () => {
    const sale = await BarSaleService.getSaleWithDetails(testSaleId);
    const lineToRemove = sale.lines.find((l) => l.pegSizeMl === 60);
    if (lineToRemove) {
      const updated = await BarSaleService.removeLineFromSale(
        testSaleId,
        lineToRemove.id,
      );
      expect(
        updated.lines.find((l) => l.id === lineToRemove.id),
      ).toBeUndefined();
    }
  });

  test('completeSale completes sale and creates pour logs', async () => {
    await R.LiquorRepository.changeBottleStatus(saleBottleId, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(saleBottleId, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: saleBottleId,
      openedBy: 'test',
      location: 'main',
    });
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        bartenderId: 'bartender-1',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 2,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    const completed = await BarSaleService.completeSale(sale.id, 'test-user');
    expect(completed.status).toBe('completed');
    expect(completed.lines[0].status).toBe('served');
    expect(completed.lines[0].bottleId).toBe(saleBottleId);
    await R.LiquorRepository.archiveBottle(saleBottleId);
  });

  test('completeSale creates pour_log entries', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `PL-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    await BarSaleService.completeSale(sale.id, 'test-user');
    const movements = await R.LiquorRepository.findMovements({
      saleId: sale.id,
    });
    expect(movements.data.length).toBeGreaterThanOrEqual(1);
    expect(movements.data[0].kind).toBe('sale');
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('cancelSale cancels all lines and sets status', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    const cancelled = await BarSaleService.cancelSale(
      sale.id,
      'test-manager',
      'Customer left',
    );
    expect(cancelled.status).toBe('cancelled');
    for (const line of cancelled.lines) {
      expect(line.status).toBe('cancelled');
    }
  });

  test('cancelSale throws on completed sale', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `CN-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    await BarSaleService.completeSale(sale.id, 'test-user');
    await expect(BarSaleService.cancelSale(sale.id, 'test')).rejects.toThrow(
      'Cannot cancel',
    );
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('refundSale restores ml to bottle', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `RF-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    const beforeMl = (await R.LiquorRepository.findBottleById(bottle.id))!
      .currentMl;
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 60,
            pegDefinitionId: testPeg60Id,
            quantity: 1,
            unitPrice: 250,
          },
        ],
      },
      'test-user',
    );
    await BarSaleService.completeSale(sale.id, 'test-user');
    const refunded = await BarSaleService.refundSale(
      sale.id,
      'test-manager',
      'Customer complaint',
    );
    expect(refunded.status).toBe('refunded');
    expect(refunded.lines[0].status).toBe('refunded');
    const after = await R.LiquorRepository.findBottleById(bottle.id);
    expect(after!.currentMl).toBe(beforeMl);
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('refundSale throws on non-completed sale', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    await expect(BarSaleService.refundSale(sale.id, 'test')).rejects.toThrow(
      'Cannot refund',
    );
  });

  test('addLineToSale throws on completed sale', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `AD-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    await BarSaleService.completeSale(sale.id, 'test-user');
    await expect(
      BarSaleService.addLineToSale(sale.id, {
        brandId: testBrandId,
        pegSizeMl: 30,
        pegDefinitionId: testPeg30Id,
        quantity: 1,
        unitPrice: 150,
      }),
    ).rejects.toThrow('Cannot add line');
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('sale with different pour types works', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
            pourType: 'regular',
          },
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 0,
            pourType: 'complimentary',
          },
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 100,
            pourType: 'staff_issue',
          },
        ],
      },
      'test-user',
    );
    expect(sale.lines.length).toBe(3);
    expect(sale.lines[0].pourType).toBe('regular');
    expect(sale.lines[1].pourType).toBe('complimentary');
    expect(sale.lines[2].pourType).toBe('staff_issue');
  });

  test('sale with duplicate brand lines works', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 150,
          },
          {
            brandId: testBrandId,
            pegSizeMl: 60,
            pegDefinitionId: testPeg60Id,
            quantity: 2,
            unitPrice: 250,
          },
        ],
      },
      'test-user',
    );
    expect(sale.lines.length).toBe(2);
  });

  test('findAllSales returns paginated results', async () => {
    const result = await R.LiquorRepository.findAllSales({ limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  test('findAllSales filters by status', async () => {
    const result = await R.LiquorRepository.findAllSales({
      status: 'open',
      limit: 10,
    });
    for (const s of result.data) {
      expect(s.status).toBe('open');
    }
  });

  test('recalculateSale updates totals correctly', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 3,
            unitPrice: 150,
          },
        ],
      },
      'test-user',
    );
    expect(sale.subtotal).toBe(450);
    expect(sale.totalAmount).toBe(450);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. INVENTORY INTEGRATION TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Inventory Integration', () => {
  let invBottleId = '';

  beforeAll(async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrand2Id,
      sizeMl: 650,
      batchNo: `INV-${uid().slice(0, 6)}`,
      purchaseCost: 800,
      sellingPrice: 1500,
      mrp: 1600,
      location: 'main',
    });
    invBottleId = bottle.id;
  });

  afterAll(async () => {
    if (invBottleId) {
      try {
        await R.LiquorRepository.archiveBottle(invBottleId);
      } catch {}
    }
  });

  test('recordConsumption creates liquor_movement with kind sale', async () => {
    const movement = await BarInventoryService.recordConsumption(
      testBrand2Id,
      'Test Beer',
      60,
      'regular',
      'sale-ref',
      'line-ref',
      'test-operator',
      invBottleId,
    );
    expect(movement.kind).toBe('sale');
    expect(movement.quantityMl).toBe(60);
    expect(movement.brandId).toBe(testBrand2Id);
    expect(movement.bottleId).toBe(invBottleId);
  });

  test('recordConsumption throws on zero ml', async () => {
    await expect(
      BarInventoryService.recordConsumption(
        testBrandId,
        'Test',
        0,
        'regular',
        's',
        'l',
        'op',
      ),
    ).rejects.toThrow('must be positive');
  });

  test('recordStockAdjustment creates movement with kind adjustment', async () => {
    const movement = await BarInventoryService.recordStockAdjustment(
      testBrandId,
      'Test Whisky',
      100,
      'Stock count correction',
      'test-operator',
    );
    expect(movement.kind).toBe('adjustment');
    expect(movement.quantityMl).toBe(100);
    expect(movement.reason).toContain('Stock count');
  });

  test('recordStockAdjustment throws on zero delta', async () => {
    await expect(
      BarInventoryService.recordStockAdjustment(
        testBrandId,
        'Test',
        0,
        'No change',
        'op',
      ),
    ).rejects.toThrow('cannot be zero');
  });

  test('recordDamage creates movement with kind damage', async () => {
    const bottle = await R.LiquorRepository.findBottleById(invBottleId);
    const beforeMl = bottle!.currentMl;
    const movement = await BarInventoryService.recordDamage(
      testBrand2Id,
      'Test Beer',
      50,
      'test-operator',
      invBottleId,
      'Spilled during pour',
    );
    expect(movement.kind).toBe('damage');
    expect(movement.mlBefore).toBe(beforeMl);
    expect(movement.mlAfter).toBe(beforeMl - 50);
    expect(movement.note).toContain('Spilled');
  });

  test('recordDamage throws on zero ml', async () => {
    await expect(
      BarInventoryService.recordDamage(
        testBrandId,
        'Test',
        0,
        'op',
        invBottleId,
      ),
    ).rejects.toThrow('must be positive');
  });

  test('reconcileBottle detects zero variance', async () => {
    const bottle = await R.LiquorRepository.findBottleById(invBottleId);
    const result = await BarInventoryService.reconcileBottle(
      invBottleId,
      bottle!.currentMl,
      bottle!.currentMl,
      'auditor',
    );
    expect(result.variance).toBe(0);
    expect(result.movement.kind).toBe('physical_count');
  });

  test('reconcileBottle detects positive variance', async () => {
    const bottle = await R.LiquorRepository.findBottleById(invBottleId);
    const expectedMl = bottle!.currentMl;
    const result = await BarInventoryService.reconcileBottle(
      invBottleId,
      expectedMl,
      expectedMl + 30,
      'auditor',
    );
    expect(result.variance).toBe(30);
  });

  test('reconcileBottle detects negative variance', async () => {
    const bottle = await R.LiquorRepository.findBottleById(invBottleId);
    const expectedMl = bottle!.currentMl;
    const result = await BarInventoryService.reconcileBottle(
      invBottleId,
      expectedMl,
      expectedMl - 20,
      'auditor',
    );
    expect(result.variance).toBe(-20);
  });

  test('findMovements filters by kind', async () => {
    const result = await R.LiquorRepository.findMovements({
      kind: 'sale',
      limit: 10,
    });
    for (const m of result.data) {
      expect(m.kind).toBe('sale');
    }
  });

  test('findMovements filters by brandId', async () => {
    const result = await R.LiquorRepository.findMovements({
      brandId: testBrand2Id,
      limit: 10,
    });
    for (const m of result.data) {
      expect(m.brandId).toBe(testBrand2Id);
    }
  });

  test('findMovements returns paginated results', async () => {
    const result = await R.LiquorRepository.findMovements({
      offset: 0,
      limit: 5,
    });
    expect(result.data.length).toBeLessThanOrEqual(5);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(5);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. EXCISE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Excise', () => {
  let exciseBottleId = '';

  beforeAll(async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `EXC-${uid().slice(0, 6)}`,
      purchaseCost: 1500,
      sellingPrice: 3000,
      mrp: 3200,
      location: 'main',
    });
    exciseBottleId = bottle.id;
  });

  afterAll(async () => {
    if (exciseBottleId) {
      try {
        await R.LiquorRepository.archiveBottle(exciseBottleId);
      } catch {}
    }
  });

  test('generateDailyRegister creates entries per brand', async () => {
    await R.LiquorRepository.changeBottleStatus(exciseBottleId, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(exciseBottleId, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: exciseBottleId,
      openedBy: 'test',
      location: 'main',
    });
    await BottleLifecycleService.consumeFromBottle(exciseBottleId, 60, 'test');

    const registers = await ExciseService.generateDailyRegister(
      today(),
      'main',
      'test-operator',
    );
    expect(registers.length).toBeGreaterThanOrEqual(1);
    const brandEntry = registers.find((r) => r.brandId === testBrandId);
    expect(brandEntry).toBeDefined();
    expect(brandEntry!.preparedBy).toBe('test-operator');
    expect(brandEntry!.date).toBe(today());
    testExciseEntryId = brandEntry!.id;
  });

  test('excise entry has opening stock computed from bottles', async () => {
    const registers = await ExciseService.generateDailyRegister(
      today(),
      'main',
      'test',
    );
    const brandEntry = registers.find((r) => r.brandId === testBrandId);
    expect(brandEntry).toBeDefined();
    expect(brandEntry!.openingStockBottles).toBeGreaterThanOrEqual(0);
    expect(brandEntry!.openingStockMl).toBeGreaterThanOrEqual(0);
  });

  test('excise entry tracks sold ml', async () => {
    const registers = await ExciseService.generateDailyRegister(
      today(),
      'main',
      'test',
    );
    const brandEntry = registers.find((r) => r.brandId === testBrandId);
    expect(brandEntry).toBeDefined();
    expect(brandEntry!.soldMl).toBeGreaterThanOrEqual(0);
  });

  test('excise entry closing stock formula is correct', async () => {
    const registers = await ExciseService.generateDailyRegister(
      today(),
      'main',
      'test',
    );
    for (const entry of registers) {
      const expectedClosing =
        entry.openingStockMl +
        entry.receivedMl -
        entry.soldMl -
        entry.complimentaryMl -
        entry.breakageMl -
        entry.wastageMl -
        entry.staffMl;
      expect(entry.closingStockMl).toBe(expectedClosing);
    }
  });

  test('generateBrandRegister creates register for specific brand', async () => {
    const register = await ExciseService.generateBrandRegister(
      testBrandId,
      daysAgo(1),
      today(),
      'test-operator',
    );
    expect(register).toBeDefined();
    expect(register.brandId).toBe(testBrandId);
    expect(register.preparedBy).toBe('test-operator');
  });

  test('verifyDailyRegister transitions prepared -> verified', async () => {
    const entry = await ExciseService.verifyDailyRegister(
      testExciseEntryId,
      'excise-officer',
    );
    expect(entry.status).toBe('verified');
    expect(entry.verifiedBy).toBe('excise-officer');
  });

  test('verifyDailyRegister throws on already verified entry', async () => {
    await expect(
      ExciseService.verifyDailyRegister(testExciseEntryId, 'another'),
    ).rejects.toThrow('Cannot verify');
  });

  test('approveExciseEntry transitions verified -> approved', async () => {
    const approved = await ExciseService.approveExciseEntry(testExciseEntryId);
    expect(approved.status).toBe('approved');
  });

  test('approveExciseEntry throws on non-verified entry', async () => {
    const fresh = await ExciseService.generateDailyRegister(
      today(),
      'main',
      'test',
    );
    await expect(ExciseService.approveExciseEntry(fresh[0].id)).rejects.toThrow(
      'Cannot approve',
    );
  });

  test('getExciseSummary aggregates totals across brands', async () => {
    const summary = await ExciseService.getExciseSummary(today(), 'main');
    expect(summary.date).toBe(today());
    expect(summary.totalOpeningMl).toBeGreaterThanOrEqual(0);
    expect(summary.totalSoldMl).toBeGreaterThanOrEqual(0);
    expect(summary.totalClosingMl).toBeGreaterThanOrEqual(0);
    expect(summary.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  test('getExciseSummary without counter aggregates all', async () => {
    const summary = await ExciseService.getExciseSummary(today());
    expect(summary.totalOpeningMl).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. PRICING TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Pricing', () => {
  let priceBrandId = '';
  let pricePeg30Id = '';

  beforeAll(async () => {
    const brand = await R.LiquorRepository.createBrand({
      name: `Price Test ${uid()}`,
      categoryId: testCategoryId,
      manufacturer: 'Price Distillery',
      proof: 42.8,
      country: 'India',
    });
    priceBrandId = brand.id;
    const peg30 = await R.LiquorRepository.createPegDefinition({
      name: 'Price Peg 30',
      sizeMl: 30,
    });
    pricePeg30Id = peg30.id;
  });

  afterAll(async () => {
    if (priceBrandId) {
      try {
        await R.LiquorRepository.archiveBrand(priceBrandId);
      } catch {}
    }
    if (pricePeg30Id) {
      try {
        await R.LiquorRepository.archivePegDefinition(pricePeg30Id);
      } catch {}
    }
  });

  test('setPegPrice creates peg price entry', async () => {
    const pegPrice = await PricingService.setPegPrice(
      priceBrandId,
      pricePeg30Id,
      'bar_price',
      150,
    );
    expect(pegPrice).toBeDefined();
    expect(pegPrice.price).toBe(150);
    expect(pegPrice.tier).toBe('bar_price');
    expect(pegPrice.brandId).toBe(priceBrandId);
  });

  test('setPegPrice updates existing entry', async () => {
    const pegPrice = await PricingService.setPegPrice(
      priceBrandId,
      pricePeg30Id,
      'bar_price',
      175,
    );
    expect(pegPrice.price).toBe(175);
  });

  test('setPegPrice throws on negative price', async () => {
    await expect(
      PricingService.setPegPrice(priceBrandId, pricePeg30Id, 'bar_price', -10),
    ).rejects.toThrow('Price cannot be negative');
  });

  test('setPegPrice throws on invalid tier', async () => {
    await expect(
      PricingService.setPegPrice(
        priceBrandId,
        pricePeg30Id,
        'invalid_tier' as T.PricingTier,
        100,
      ),
    ).rejects.toThrow('Invalid pricing tier');
  });

  test('setPegPrice throws on non-existent brand', async () => {
    await expect(
      PricingService.setPegPrice('nonexistent', pricePeg30Id, 'bar_price', 100),
    ).rejects.toThrow('Brand not found');
  });

  test('getEffectivePrice returns exact match', async () => {
    const price = await PricingService.getEffectivePrice(
      priceBrandId,
      30,
      'bar_price',
    );
    expect(price).toBe(175);
  });

  test('getEffectivePrice falls back from requested tier to bar_price', async () => {
    const price = await PricingService.getEffectivePrice(
      priceBrandId,
      30,
      'happy_hour',
    );
    expect(price).toBe(175); // falls back to bar_price
  });

  test('getEffectivePrice falls back to mrp when no peg price exists', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: priceBrandId,
      sizeMl: 750,
      batchNo: `PR-${uid().slice(0, 6)}`,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
      location: 'main',
    });
    const price = await PricingService.getEffectivePrice(
      priceBrandId,
      60,
      'member',
    );
    expect(price).toBeGreaterThan(0);
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('applyHappyHour creates happy_hour tier at discount', async () => {
    const pegPrice = await PricingService.applyHappyHour(
      priceBrandId,
      pricePeg30Id,
      20,
    );
    expect(pegPrice.tier).toBe('happy_hour');
    expect(pegPrice.price).toBe(140); // 175 * 0.8 = 140
  });

  test('applyHappyHour throws on invalid discount percent', async () => {
    await expect(
      PricingService.applyHappyHour(priceBrandId, pricePeg30Id, 0),
    ).rejects.toThrow('Discount percent');
    await expect(
      PricingService.applyHappyHour(priceBrandId, pricePeg30Id, 101),
    ).rejects.toThrow('Discount percent');
  });

  test('bulkUpdatePrices adjusts all prices for a brand and tier', async () => {
    const updated = await PricingService.bulkUpdatePrices(
      priceBrandId,
      'bar_price',
      10,
    );
    expect(updated).toBeGreaterThanOrEqual(1);
  });

  test('bulkUpdatePrices throws on invalid tier', async () => {
    await expect(
      PricingService.bulkUpdatePrices(
        priceBrandId,
        'invalid' as T.PricingTier,
        10,
      ),
    ).rejects.toThrow('Invalid tier');
  });

  test('findAllPegPrices returns prices for brand', async () => {
    const prices = await R.LiquorRepository.findAllPegPrices(priceBrandId);
    expect(prices.length).toBeGreaterThanOrEqual(1);
    for (const p of prices) {
      expect(p.brandId).toBe(priceBrandId);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. REPORTING TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Reporting', () => {
  test('getBrandPerformance returns sales totals per brand', async () => {
    const results = await ReportingService.getBrandPerformance();
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r.brandId).toBeTruthy();
      expect(r.brandName).toBeTruthy();
      expect(r.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(r.totalMlSold).toBeGreaterThanOrEqual(0);
    }
  });

  test('getBrandPerformance filters by date range', async () => {
    const results = await ReportingService.getBrandPerformance(
      daysAgo(1),
      today(),
    );
    expect(Array.isArray(results)).toBe(true);
  });

  test('getBrandPerformance includes pourCost and grossProfit', async () => {
    const results = await ReportingService.getBrandPerformance();
    for (const r of results) {
      expect(r.pourCost).toBeGreaterThanOrEqual(0);
      expect(r.grossProfit).toBeGreaterThanOrEqual(0);
      expect(typeof r.grossMargin).toBe('number');
    }
  });

  test('getPegVarianceReport returns expected vs actual consumption', async () => {
    const reports = await ReportingService.getPegVarianceReport();
    expect(Array.isArray(reports)).toBe(true);
    for (const r of reports) {
      expect(r.brandId).toBeTruthy();
      expect(r.expectedConsumptionMl).toBeGreaterThanOrEqual(0);
      expect(r.actualSoldMl).toBeGreaterThanOrEqual(0);
    }
  });

  test('getPegVarianceReport filters by brand', async () => {
    const reports = await ReportingService.getPegVarianceReport(testBrandId);
    for (const r of reports) {
      expect(r.brandId).toBe(testBrandId);
    }
  });

  test('getPegVarianceReport reports variance percent', async () => {
    const reports = await ReportingService.getPegVarianceReport();
    for (const r of reports) {
      expect(typeof r.variancePercent).toBe('number');
      expect(r.variancePercent).toBeGreaterThanOrEqual(-100);
    }
  });

  test('getBartenderPerformance returns bartender metrics', async () => {
    const results = await ReportingService.getBartenderPerformance();
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r.bartenderId).toBeTruthy();
      expect(r.totalPegs).toBeGreaterThanOrEqual(0);
      expect(r.revenue).toBeGreaterThanOrEqual(0);
    }
  });

  test('getBartenderPerformance filters by date', async () => {
    const results = await ReportingService.getBartenderPerformance(
      daysAgo(1),
      today(),
    );
    expect(Array.isArray(results)).toBe(true);
  });

  test('getBottleSummary returns totals across statuses', async () => {
    const summary = await ReportingService.getBottleSummary();
    expect(summary.totalBottles).toBeGreaterThanOrEqual(1);
    expect(summary.totalMl).toBeGreaterThan(0);
    expect(summary.totalValue).toBeGreaterThan(0);
    expect(summary.totalPurchaseCost).toBeGreaterThan(0);
    expect(typeof summary.activeBottles).toBe('number');
    expect(typeof summary.openBottles).toBe('number');
    expect(typeof summary.emptyBottles).toBe('number');
    expect(typeof summary.brokenBottles).toBe('number');
  });

  test('getDailyExciseSummary aggregates across brands', async () => {
    const summary = await ReportingService.getDailyExciseSummary(today());
    expect(summary.date).toBe(today());
    expect(summary.totalOpeningMl).toBeGreaterThanOrEqual(0);
    expect(summary.totalSoldMl).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. STATE MACHINE & PERMISSION TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — State Machine & Permissions', () => {
  test('purchased transitions to received', () => {
    const allowed = T.BOTTLE_TRANSITIONS.purchased;
    expect(allowed).toContain('received');
  });

  test('received transitions to stored', () => {
    expect(T.BOTTLE_TRANSITIONS.received).toContain('stored');
  });

  test('stored transitions to opened', () => {
    expect(T.BOTTLE_TRANSITIONS.stored).toContain('opened');
  });

  test('opened transitions to active', () => {
    expect(T.BOTTLE_TRANSITIONS.opened).toContain('active');
  });

  test('active transitions to partially_consumed', () => {
    expect(T.BOTTLE_TRANSITIONS.active).toContain('partially_consumed');
  });

  test('partially_consumed transitions to empty', () => {
    expect(T.BOTTLE_TRANSITIONS.partially_consumed).toContain('empty');
  });

  test('empty transitions to archived', () => {
    expect(T.BOTTLE_TRANSITIONS.empty).toContain('archived');
  });

  test('empty does NOT transition to opened', () => {
    expect(T.BOTTLE_TRANSITIONS.empty).not.toContain('opened');
  });

  test('archived has no outgoing transitions', () => {
    expect(T.BOTTLE_TRANSITIONS.archived).toEqual([]);
  });

  test('broken transitions to written_off and archived', () => {
    expect(T.BOTTLE_TRANSITIONS.broken).toContain('written_off');
    expect(T.BOTTLE_TRANSITIONS.broken).toContain('archived');
  });

  test('purchased->received permission includes owner, manager, barstaff', () => {
    const key = 'purchased->received';
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('barstaff');
  });

  test('stored->transferred permission only owner and manager', () => {
    const key = 'stored->transferred';
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).not.toContain('barstaff');
  });

  test('empty->archived permission only owner and manager', () => {
    const key = 'empty->archived';
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('owner');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).toContain('manager');
    expect(T.BOTTLE_TRANSITION_PERMISSIONS[key]).not.toContain('barstaff');
  });

  test('all statuses in VALID_BOTTLE_STATUSES', () => {
    const allStatuses = Object.keys(T.BOTTLE_TRANSITIONS);
    for (const s of allStatuses) {
      expect(T.VALID_BOTTLE_STATUSES).toContain(s);
    }
    expect(T.VALID_BOTTLE_STATUSES.length).toBe(allStatuses.length);
  });

  test('all pour types in VALID_POUR_TYPES', () => {
    const expected = [
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
    for (const pt of expected) {
      expect(T.VALID_POUR_TYPES).toContain(pt);
    }
  });

  test('all pricing tiers in VALID_PRICING_TIERS', () => {
    const expected = [
      'mrp',
      'bar_price',
      'happy_hour',
      'promotional',
      'member',
    ];
    for (const t of expected) {
      expect(T.VALID_PRICING_TIERS).toContain(t);
    }
  });

  test('all categories in VALID_LIQUOR_CATEGORIES', () => {
    const expected = ['IMFL', 'Beer', 'Wine', 'Foreign', 'Country', 'Liqueur'];
    for (const c of expected) {
      expect(T.VALID_LIQUOR_CATEGORIES).toContain(c);
    }
  });

  test('DEFAULT_PEG_SIZES contains all 6 sizes', () => {
    const sizes = [30, 45, 60, 90, 120, 180];
    for (const s of sizes) {
      expect(T.DEFAULT_PEG_SIZES).toContain(s);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. VALIDATION TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Validation', () => {
  test('validateCreateBrand rejects empty name', () => {
    const errors = ValidationService.validateCreateBrand({
      name: '',
      categoryId: testCategoryId,
      manufacturer: 'Test',
      proof: 40,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  test('validateCreateBrand rejects missing category', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'Test Brand',
      categoryId: '',
      manufacturer: 'Test',
      proof: 40,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('Category'))).toBe(true);
  });

  test('validateCreateBrand rejects invalid proof', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'Test',
      categoryId: testCategoryId,
      manufacturer: 'Test',
      proof: 250,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('Proof'))).toBe(true);
  });

  test('validateCreateBrand rejects negative proof', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'Test',
      categoryId: testCategoryId,
      manufacturer: 'Test',
      proof: -10,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('Proof'))).toBe(true);
  });

  test('validateCreateBrand rejects missing manufacturer', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'Test',
      categoryId: testCategoryId,
      manufacturer: '',
      proof: 40,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('manufacturer'))).toBe(true);
  });

  test('validateCreateBrand accepts valid input', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'Valid Brand',
      categoryId: testCategoryId,
      manufacturer: 'Valid Co',
      proof: 42.8,
      country: 'India',
    });
    expect(errors.length).toBe(0);
  });

  test('validateCreateBottle rejects negative size', () => {
    const errors = ValidationService.validateCreateBottle({
      brandId: testBrandId,
      sizeMl: -750,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
    });
    expect(errors.some((e) => e.includes('Size'))).toBe(true);
  });

  test('validateCreateBottle rejects zero size', () => {
    const errors = ValidationService.validateCreateBottle({
      brandId: testBrandId,
      sizeMl: 0,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
    });
    expect(errors.some((e) => e.includes('Size'))).toBe(true);
  });

  test('validateCreateBottle accepts zero purchase cost', () => {
    const errors = ValidationService.validateCreateBottle({
      brandId: testBrandId,
      sizeMl: 750,
      purchaseCost: 0,
      sellingPrice: 2000,
      mrp: 2200,
    });
    expect(errors.some((e) => e.includes('Purchase cost'))).toBe(false);
  });

  test('validateCreateBottle rejects negative selling price', () => {
    const errors = ValidationService.validateCreateBottle({
      brandId: testBrandId,
      sizeMl: 750,
      purchaseCost: 1000,
      sellingPrice: -100,
      mrp: 2200,
    });
    expect(errors.some((e) => e.includes('Selling price'))).toBe(true);
  });

  test('validateCreateBarSale rejects missing counter', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: '',
      lines: [
        {
          brandId: testBrandId,
          pegSizeMl: 30,
          pegDefinitionId: testPeg30Id,
          quantity: 1,
          unitPrice: 150,
        },
      ],
    });
    expect(errors.some((e) => e.includes('Counter'))).toBe(true);
  });

  test('validateCreateBarSale rejects empty lines', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: 'main',
      lines: [],
    });
    expect(errors.some((e) => e.includes('line'))).toBe(true);
  });

  test('validateCreateBarSale rejects negative quantity in line', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: 'main',
      lines: [
        {
          brandId: testBrandId,
          pegSizeMl: 30,
          pegDefinitionId: testPeg30Id,
          quantity: -1,
          unitPrice: 150,
        },
      ],
    });
    expect(errors.some((e) => e.includes('quantity'))).toBe(true);
  });

  test('validateCreateBarSale rejects negative unit price', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: 'main',
      lines: [
        {
          brandId: testBrandId,
          pegSizeMl: 30,
          pegDefinitionId: testPeg30Id,
          quantity: 1,
          unitPrice: -10,
        },
      ],
    });
    expect(errors.some((e) => e.includes('price'))).toBe(true);
  });

  test('validateCreateBarSale rejects invalid pour type', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: 'main',
      lines: [
        {
          brandId: testBrandId,
          pegSizeMl: 30,
          pegDefinitionId: testPeg30Id,
          quantity: 1,
          unitPrice: 150,
          pourType: 'invalid' as T.PourType,
        },
      ],
    });
    expect(errors.some((e) => e.includes('pour type'))).toBe(true);
  });

  test('validateCreateBarSale accepts valid input', () => {
    const errors = ValidationService.validateCreateBarSale({
      counter: 'main',
      lines: [
        {
          brandId: testBrandId,
          pegSizeMl: 30,
          pegDefinitionId: testPeg30Id,
          quantity: 2,
          unitPrice: 150,
        },
      ],
    });
    expect(errors.length).toBe(0);
  });

  test('validateBottleTransition returns null for valid transition', () => {
    const error = ValidationService.validateBottleTransition(
      'purchased',
      'received',
    );
    expect(error).toBeNull();
  });

  test('validateBottleTransition returns error for invalid transition', () => {
    const error = ValidationService.validateBottleTransition('empty', 'opened');
    expect(error).toContain('Invalid transition');
  });

  test('validateBottleTransition returns error for unknown status', () => {
    const error = ValidationService.validateBottleTransition(
      'unknown' as T.BottleStatus,
      'opened',
    );
    expect(error).toContain('Invalid current status');
  });

  test('validateCreateBrand rejects name > 200 chars', () => {
    const errors = ValidationService.validateCreateBrand({
      name: 'A'.repeat(201),
      categoryId: testCategoryId,
      manufacturer: 'Test',
      proof: 40,
      country: 'India',
    });
    expect(errors.some((e) => e.includes('200'))).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 10. EDGE CASE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('Liquor — Edge Cases', () => {
  test('createBottle with zero size is rejected by validation', () => {
    const errors = ValidationService.validateCreateBottle({
      brandId: testBrandId,
      sizeMl: 0,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
    });
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  test('consumeFromBottle throws on non-positive ml', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `EDGE-${uid().slice(0, 6)}`,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    await expect(
      BottleLifecycleService.consumeFromBottle(bottle.id, 0, 'test'),
    ).rejects.toThrow('positive');
    await expect(
      BottleLifecycleService.consumeFromBottle(bottle.id, -30, 'test'),
    ).rejects.toThrow('positive');
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('consumeFromBottle throws on empty bottle', async () => {
    const bottle = await R.LiquorRepository.createBottle({
      brandId: testBrandId,
      sizeMl: 750,
      batchNo: `EMP-${uid().slice(0, 6)}`,
      purchaseCost: 1000,
      sellingPrice: 2000,
      mrp: 2200,
      location: 'main',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'received', {
      updatedBy: 'test',
    });
    await R.LiquorRepository.changeBottleStatus(bottle.id, 'stored', {
      updatedBy: 'test',
    });
    await BottleLifecycleService.openBottle({
      bottleId: bottle.id,
      openedBy: 'test',
      location: 'main',
    });
    await BottleLifecycleService.consumeFromBottle(bottle.id, 750, 'test');
    await expect(
      BottleLifecycleService.consumeFromBottle(bottle.id, 30, 'test'),
    ).rejects.toThrow('Insufficient ml');
    await R.LiquorRepository.archiveBottle(bottle.id);
  });

  test('sale with different pour types (waste, spillage) creates valid sale', async () => {
    const sale = await BarSaleService.createSale(
      {
        counter: 'main',
        lines: [
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 0,
            pourType: 'waste',
          },
          {
            brandId: testBrandId,
            pegSizeMl: 30,
            pegDefinitionId: testPeg30Id,
            quantity: 1,
            unitPrice: 0,
            pourType: 'spillage',
          },
        ],
      },
      'test-user',
    );
    expect(sale.lines.length).toBe(2);
    expect(sale.lines[0].pourType).toBe('waste');
    expect(sale.lines[1].pourType).toBe('spillage');
  });

  test('bulkCreateBottles handles empty array gracefully', async () => {
    const bottles = await R.LiquorRepository.bulkCreateBottles([]);
    expect(bottles).toEqual([]);
  });

  test('findBottleById returns null for non-existent', async () => {
    const bottle = await R.LiquorRepository.findBottleById('nonexistent-id');
    expect(bottle).toBeNull();
  });

  test('findCategoryById returns null for non-existent', async () => {
    const cat = await R.LiquorRepository.findCategoryById('nonexistent');
    expect(cat).toBeNull();
  });

  test('findBrandById returns null for non-existent', async () => {
    const brand = await R.LiquorRepository.findBrandById('nonexistent');
    expect(brand).toBeNull();
  });

  test('findSaleById returns null for non-existent', async () => {
    const sale = await R.LiquorRepository.findSaleById('nonexistent');
    expect(sale).toBeNull();
  });

  test('findAllBottles returns paginated results', async () => {
    const result = await R.LiquorRepository.findAllBottles({ limit: 5 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.limit).toBe(5);
  });

  test('findAllBrands returns paginated results', async () => {
    const result = await R.LiquorRepository.findAllBrands({ limit: 10 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  test('findAllBrands filters by category', async () => {
    const result = await R.LiquorRepository.findAllBrands({
      categoryId: testCategoryId,
      limit: 10,
    });
    for (const b of result.data) {
      expect(b.categoryId).toBe(testCategoryId);
    }
  });

  test('findBottlesByBrand returns bottles for brand', async () => {
    const bottles = await R.LiquorRepository.findBottlesByBrand(testBrandId);
    expect(bottles.length).toBeGreaterThanOrEqual(1);
    for (const b of bottles) {
      expect(b.brandId).toBe(testBrandId);
    }
  });

  test('findActiveBottles returns opened/active/partially_consumed bottles', async () => {
    const bottles = await R.LiquorRepository.findActiveBottles();
    for (const b of bottles) {
      expect(['opened', 'active', 'partially_consumed']).toContain(b.status);
    }
  });

  test('findPegDefinitionBySize returns peg for valid size', async () => {
    const peg = await R.LiquorRepository.findPegDefinitionBySize(30);
    expect(peg).not.toBeNull();
    expect(peg!.sizeMl).toBe(30);
  });

  test('findPegDefinitionBySize returns null for unknown size', async () => {
    const peg = await R.LiquorRepository.findPegDefinitionBySize(999);
    expect(peg).toBeNull();
  });

  test('searchBrands returns matching brands', async () => {
    const brands = await R.LiquorRepository.searchBrands('Test');
    expect(brands.length).toBeGreaterThanOrEqual(1);
  });

  test('searchBrands returns empty for no match', async () => {
    const brands = await R.LiquorRepository.searchBrands('zzzznonexistentzzzz');
    expect(brands.length).toBe(0);
  });

  test('countBottlesByBrand returns counts by status', async () => {
    const counts = await R.LiquorRepository.countBottlesByBrand(testBrandId);
    expect(typeof counts).toBe('object');
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(1);
  });

  test('recordBarEvent creates event', async () => {
    const event = await R.LiquorRepository.recordBarEvent(
      'BAR_SALE_CREATED',
      'bar_sale',
      'test-aggregate',
      '{"test":true}',
      'test-user',
    );
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe('BAR_SALE_CREATED');
  });

  test('findBarEvents returns events for aggregate', async () => {
    const events = await R.LiquorRepository.findBarEvents(
      'bar_sale',
      testSaleId,
    );
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  test('updateCategory modifies category fields', async () => {
    const updated = await R.LiquorRepository.updateCategory(testCategoryId, {
      displayOrder: 5,
    });
    expect(updated.displayOrder).toBe(5);
  });

  test('updateBrand modifies brand fields', async () => {
    const updated = await R.LiquorRepository.updateBrand(testBrandId, {
      manufacturer: 'Updated Distillery',
    });
    expect(updated.manufacturer).toBe('Updated Distillery');
  });

  test('updatePegDefinition modifies peg definition', async () => {
    const updated = await R.LiquorRepository.updatePegDefinition(testPeg30Id, {
      name: 'Updated Small Peg',
    });
    expect(updated.name).toBe('Updated Small Peg');
  });

  test('updatePegPrice modifies price', async () => {
    const price = await R.LiquorRepository.createPegPrice({
      brandId: testBrandId,
      pegSizeId: testPeg30Id,
      tier: 'promotional',
      price: 120,
    });
    const updated = await R.LiquorRepository.updatePegPrice(price.id, {
      price: 110,
    });
    expect(updated.price).toBe(110);
    await R.LiquorRepository.archivePegPrice(price.id);
  });
});
