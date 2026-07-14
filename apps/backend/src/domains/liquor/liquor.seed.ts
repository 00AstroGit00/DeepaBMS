import type { SeedModule } from '../../seed/types';
import * as R from './liquor.repository';
import { run, query } from '../../db';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const CATEGORIES: { id: string; name: string; displayOrder: number }[] = [
  { id: 'cat-imfl', name: 'IMFL', displayOrder: 1 },
  { id: 'cat-beer', name: 'Beer', displayOrder: 2 },
  { id: 'cat-wine', name: 'Wine', displayOrder: 3 },
  { id: 'cat-foreign', name: 'Foreign', displayOrder: 4 },
  { id: 'cat-country', name: 'Country', displayOrder: 5 },
  { id: 'cat-liqueur', name: 'Liqueur', displayOrder: 6 },
];

const CATEGORY_NAME_MAP: Record<string, string> = {};
for (const c of CATEGORIES) CATEGORY_NAME_MAP[c.id] = c.name;

const BRANDS: {
  id: string;
  name: string;
  categoryId: string;
  manufacturer: string;
  proof: number;
  country: string;
}[] = [
  {
    id: 'brd-001',
    name: 'Royal Stag',
    categoryId: 'cat-imfl',
    manufacturer: 'Pernod Ricard India',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-002',
    name: "McDowell's No.1",
    categoryId: 'cat-imfl',
    manufacturer: 'United Spirits Ltd',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-003',
    name: 'Old Monk',
    categoryId: 'cat-imfl',
    manufacturer: 'Mohan Meakin Ltd',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-004',
    name: 'Blenders Pride',
    categoryId: 'cat-imfl',
    manufacturer: 'Pernod Ricard India',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-005',
    name: 'Kingfisher',
    categoryId: 'cat-beer',
    manufacturer: 'United Breweries Ltd',
    proof: 5,
    country: 'India',
  },
  {
    id: 'brd-006',
    name: 'Budweiser',
    categoryId: 'cat-beer',
    manufacturer: 'Anheuser-Busch InBev',
    proof: 5,
    country: 'USA',
  },
  {
    id: 'brd-007',
    name: 'Heineken',
    categoryId: 'cat-beer',
    manufacturer: 'Heineken N.V.',
    proof: 5,
    country: 'Netherlands',
  },
  {
    id: 'brd-008',
    name: 'Sula Cabernet Shiraz',
    categoryId: 'cat-wine',
    manufacturer: 'Sula Vineyards',
    proof: 13.5,
    country: 'India',
  },
  {
    id: 'brd-009',
    name: 'Sula Sauvignon Blanc',
    categoryId: 'cat-wine',
    manufacturer: 'Sula Vineyards',
    proof: 12.5,
    country: 'India',
  },
  {
    id: 'brd-010',
    name: "Jack Daniel's",
    categoryId: 'cat-foreign',
    manufacturer: 'Jack Daniel Distillery',
    proof: 40,
    country: 'USA',
  },
  {
    id: 'brd-011',
    name: 'Johnnie Walker Black Label',
    categoryId: 'cat-foreign',
    manufacturer: 'Diageo',
    proof: 40,
    country: 'Scotland',
  },
  {
    id: 'brd-012',
    name: 'Jameson',
    categoryId: 'cat-foreign',
    manufacturer: 'Irish Distillers',
    proof: 40,
    country: 'Ireland',
  },
  {
    id: 'brd-013',
    name: 'Mysore XXX Rum',
    categoryId: 'cat-country',
    manufacturer: 'Mysore Distilleries',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-014',
    name: 'Captain XXX',
    categoryId: 'cat-country',
    manufacturer: 'Kerala Distilleries & Breweries',
    proof: 42.8,
    country: 'India',
  },
  {
    id: 'brd-015',
    name: "Bailey's Irish Cream",
    categoryId: 'cat-liqueur',
    manufacturer: 'Diageo',
    proof: 17,
    country: 'Ireland',
  },
];

const BRAND_NAME_MAP: Record<string, string> = {};
for (const b of BRANDS) BRAND_NAME_MAP[b.id] = b.name;

const PEG_DEFS: { id: string; name: string; sizeMl: number }[] = [
  { id: 'peg-30', name: 'Small Peg', sizeMl: 30 },
  { id: 'peg-45', name: 'Medium Peg', sizeMl: 45 },
  { id: 'peg-60', name: 'Large Peg', sizeMl: 60 },
  { id: 'peg-90', name: 'Double Large', sizeMl: 90 },
  { id: 'peg-120', name: 'Double Peg', sizeMl: 120 },
  { id: 'peg-180', name: 'Triple Peg', sizeMl: 180 },
];

const PEG_PRICES: {
  id: string;
  brandId: string;
  pegSizeId: string;
  tier: string;
  price: number;
}[] = [
  {
    id: 'ppr-001',
    brandId: 'brd-001',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 80,
  },
  {
    id: 'ppr-002',
    brandId: 'brd-001',
    pegSizeId: 'peg-30',
    tier: 'member',
    price: 72,
  },
  {
    id: 'ppr-003',
    brandId: 'brd-001',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 160,
  },
  {
    id: 'ppr-004',
    brandId: 'brd-002',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 70,
  },
  {
    id: 'ppr-005',
    brandId: 'brd-002',
    pegSizeId: 'peg-30',
    tier: 'member',
    price: 63,
  },
  {
    id: 'ppr-006',
    brandId: 'brd-002',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 140,
  },
  {
    id: 'ppr-007',
    brandId: 'brd-003',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 65,
  },
  {
    id: 'ppr-008',
    brandId: 'brd-003',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 130,
  },
  {
    id: 'ppr-009',
    brandId: 'brd-003',
    pegSizeId: 'peg-30',
    tier: 'happy_hour',
    price: 55,
  },
  {
    id: 'ppr-010',
    brandId: 'brd-004',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 90,
  },
  {
    id: 'ppr-011',
    brandId: 'brd-004',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 180,
  },
  {
    id: 'ppr-012',
    brandId: 'brd-010',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 350,
  },
  {
    id: 'ppr-013',
    brandId: 'brd-010',
    pegSizeId: 'peg-30',
    tier: 'happy_hour',
    price: 298,
  },
  {
    id: 'ppr-014',
    brandId: 'brd-010',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 700,
  },
  {
    id: 'ppr-015',
    brandId: 'brd-011',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 400,
  },
  {
    id: 'ppr-016',
    brandId: 'brd-011',
    pegSizeId: 'peg-60',
    tier: 'bar_price',
    price: 800,
  },
  {
    id: 'ppr-017',
    brandId: 'brd-012',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 300,
  },
  {
    id: 'ppr-018',
    brandId: 'brd-008',
    pegSizeId: 'peg-120',
    tier: 'bar_price',
    price: 200,
  },
  {
    id: 'ppr-019',
    brandId: 'brd-009',
    pegSizeId: 'peg-120',
    tier: 'bar_price',
    price: 220,
  },
  {
    id: 'ppr-020',
    brandId: 'brd-015',
    pegSizeId: 'peg-30',
    tier: 'bar_price',
    price: 250,
  },
];

const BOTTLES: {
  id: string;
  brandId: string;
  sizeMl: number;
  batchNo: string;
  purchaseCost: number;
  sellingPrice: number;
  mrp: number;
  status: string;
  currentMl: number;
  initialMl: number;
  location: string;
}[] = [
  {
    id: 'bot-001',
    brandId: 'brd-001',
    sizeMl: 750,
    batchNo: 'RS-750-B1',
    purchaseCost: 450,
    sellingPrice: 850,
    mrp: 950,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-002',
    brandId: 'brd-001',
    sizeMl: 1000,
    batchNo: 'RS-1L-B2',
    purchaseCost: 650,
    sellingPrice: 1200,
    mrp: 1350,
    status: 'stored',
    currentMl: 1000,
    initialMl: 1000,
    location: 'counter-main',
  },
  {
    id: 'bot-003',
    brandId: 'brd-001',
    sizeMl: 750,
    batchNo: 'RS-750-B3',
    purchaseCost: 450,
    sellingPrice: 850,
    mrp: 950,
    status: 'active',
    currentMl: 300,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-004',
    brandId: 'brd-002',
    sizeMl: 750,
    batchNo: 'MC-750-B1',
    purchaseCost: 380,
    sellingPrice: 700,
    mrp: 800,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-005',
    brandId: 'brd-002',
    sizeMl: 750,
    batchNo: 'MC-750-B2',
    purchaseCost: 380,
    sellingPrice: 700,
    mrp: 800,
    status: 'active',
    currentMl: 375,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-006',
    brandId: 'brd-002',
    sizeMl: 180,
    batchNo: 'MC-180-B1',
    purchaseCost: 120,
    sellingPrice: 250,
    mrp: 280,
    status: 'opened',
    currentMl: 162,
    initialMl: 180,
    location: 'counter-main',
  },
  {
    id: 'bot-007',
    brandId: 'brd-003',
    sizeMl: 750,
    batchNo: 'OM-750-B1',
    purchaseCost: 420,
    sellingPrice: 750,
    mrp: 850,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-008',
    brandId: 'brd-003',
    sizeMl: 750,
    batchNo: 'OM-750-B2',
    purchaseCost: 420,
    sellingPrice: 750,
    mrp: 850,
    status: 'active',
    currentMl: 263,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-009',
    brandId: 'brd-003',
    sizeMl: 750,
    batchNo: 'OM-750-B3',
    purchaseCost: 420,
    sellingPrice: 750,
    mrp: 850,
    status: 'partially_consumed',
    currentMl: 113,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-010',
    brandId: 'brd-004',
    sizeMl: 750,
    batchNo: 'BP-750-B1',
    purchaseCost: 480,
    sellingPrice: 900,
    mrp: 1000,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-rooftop',
  },
  {
    id: 'bot-011',
    brandId: 'brd-004',
    sizeMl: 750,
    batchNo: 'BP-750-B2',
    purchaseCost: 480,
    sellingPrice: 900,
    mrp: 1000,
    status: 'active',
    currentMl: 450,
    initialMl: 750,
    location: 'counter-rooftop',
  },
  {
    id: 'bot-012',
    brandId: 'brd-004',
    sizeMl: 750,
    batchNo: 'BP-750-B3',
    purchaseCost: 480,
    sellingPrice: 900,
    mrp: 1000,
    status: 'opened',
    currentMl: 713,
    initialMl: 750,
    location: 'counter-rooftop',
  },
  {
    id: 'bot-013',
    brandId: 'brd-005',
    sizeMl: 650,
    batchNo: 'KF-650-B1',
    purchaseCost: 100,
    sellingPrice: 250,
    mrp: 280,
    status: 'stored',
    currentMl: 650,
    initialMl: 650,
    location: 'counter-rooftop',
  },
  {
    id: 'bot-014',
    brandId: 'brd-005',
    sizeMl: 650,
    batchNo: 'KF-650-B2',
    purchaseCost: 100,
    sellingPrice: 250,
    mrp: 280,
    status: 'empty',
    currentMl: 0,
    initialMl: 650,
    location: 'counter-main',
  },
  {
    id: 'bot-015',
    brandId: 'brd-005',
    sizeMl: 330,
    batchNo: 'KF-330-B1',
    purchaseCost: 60,
    sellingPrice: 150,
    mrp: 170,
    status: 'stored',
    currentMl: 330,
    initialMl: 330,
    location: 'counter-main',
  },
  {
    id: 'bot-016',
    brandId: 'brd-006',
    sizeMl: 330,
    batchNo: 'BW-330-B1',
    purchaseCost: 80,
    sellingPrice: 180,
    mrp: 200,
    status: 'stored',
    currentMl: 330,
    initialMl: 330,
    location: 'counter-main',
  },
  {
    id: 'bot-017',
    brandId: 'brd-007',
    sizeMl: 330,
    batchNo: 'HK-330-B1',
    purchaseCost: 90,
    sellingPrice: 200,
    mrp: 220,
    status: 'active',
    currentMl: 149,
    initialMl: 330,
    location: 'counter-main',
  },
  {
    id: 'bot-018',
    brandId: 'brd-008',
    sizeMl: 750,
    batchNo: 'SC-750-B1',
    purchaseCost: 350,
    sellingPrice: 600,
    mrp: 700,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-lounge',
  },
  {
    id: 'bot-019',
    brandId: 'brd-009',
    sizeMl: 750,
    batchNo: 'SS-750-B1',
    purchaseCost: 380,
    sellingPrice: 650,
    mrp: 750,
    status: 'opened',
    currentMl: 638,
    initialMl: 750,
    location: 'counter-lounge',
  },
  {
    id: 'bot-020',
    brandId: 'brd-010',
    sizeMl: 750,
    batchNo: 'JD-750-B1',
    purchaseCost: 1200,
    sellingPrice: 2500,
    mrp: 2800,
    status: 'stored',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-021',
    brandId: 'brd-010',
    sizeMl: 750,
    batchNo: 'JD-750-B2',
    purchaseCost: 1200,
    sellingPrice: 2500,
    mrp: 2800,
    status: 'active',
    currentMl: 225,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-022',
    brandId: 'brd-011',
    sizeMl: 750,
    batchNo: 'JW-750-B1',
    purchaseCost: 1500,
    sellingPrice: 3000,
    mrp: 3500,
    status: 'opened',
    currentMl: 690,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-023',
    brandId: 'brd-012',
    sizeMl: 750,
    batchNo: 'JM-750-B1',
    purchaseCost: 1100,
    sellingPrice: 2200,
    mrp: 2500,
    status: 'opened',
    currentMl: 660,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-024',
    brandId: 'brd-012',
    sizeMl: 750,
    batchNo: 'JM-750-B2',
    purchaseCost: 1100,
    sellingPrice: 2200,
    mrp: 2500,
    status: 'broken',
    currentMl: 0,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-025',
    brandId: 'brd-013',
    sizeMl: 750,
    batchNo: 'MY-750-B1',
    purchaseCost: 250,
    sellingPrice: 450,
    mrp: 500,
    status: 'active',
    currentMl: 413,
    initialMl: 750,
    location: 'counter-main',
  },
  {
    id: 'bot-026',
    brandId: 'brd-013',
    sizeMl: 500,
    batchNo: 'MY-500-B1',
    purchaseCost: 180,
    sellingPrice: 350,
    mrp: 400,
    status: 'partially_consumed',
    currentMl: 90,
    initialMl: 500,
    location: 'counter-main',
  },
  {
    id: 'bot-027',
    brandId: 'brd-014',
    sizeMl: 500,
    batchNo: 'CP-500-B1',
    purchaseCost: 160,
    sellingPrice: 320,
    mrp: 380,
    status: 'active',
    currentMl: 325,
    initialMl: 500,
    location: 'counter-main',
  },
  {
    id: 'bot-028',
    brandId: 'brd-014',
    sizeMl: 500,
    batchNo: 'CP-500-B2',
    purchaseCost: 160,
    sellingPrice: 320,
    mrp: 380,
    status: 'empty',
    currentMl: 0,
    initialMl: 500,
    location: 'counter-main',
  },
  {
    id: 'bot-029',
    brandId: 'brd-015',
    sizeMl: 750,
    batchNo: 'BL-750-B1',
    purchaseCost: 800,
    sellingPrice: 1600,
    mrp: 1800,
    status: 'archived',
    currentMl: 750,
    initialMl: 750,
    location: 'counter-lounge',
  },
  {
    id: 'bot-030',
    brandId: 'brd-015',
    sizeMl: 750,
    batchNo: 'BL-750-B2',
    purchaseCost: 800,
    sellingPrice: 1600,
    mrp: 1800,
    status: 'partially_consumed',
    currentMl: 150,
    initialMl: 750,
    location: 'counter-lounge',
  },
];

interface SaleSeedLine {
  brandId: string;
  pegSizeMl: number;
  pegDefinitionId: string;
  quantity: number;
  unitPrice: number;
  bottleId: string;
}

interface SaleSeed {
  daysAgoVal: number;
  counter: string;
  bartenderName: string;
  lines: SaleSeedLine[];
}

const SALES_DATA: SaleSeed[] = [
  {
    daysAgoVal: 2,
    counter: 'counter-main',
    bartenderName: 'Rajesh',
    lines: [
      {
        brandId: 'brd-001',
        pegSizeMl: 60,
        pegDefinitionId: 'peg-60',
        quantity: 2,
        unitPrice: 160,
        bottleId: 'bot-003',
      },
      {
        brandId: 'brd-005',
        pegSizeMl: 650,
        pegDefinitionId: 'peg-180',
        quantity: 1,
        unitPrice: 250,
        bottleId: 'bot-013',
      },
    ],
  },
  {
    daysAgoVal: 3,
    counter: 'counter-main',
    bartenderName: 'Suresh',
    lines: [
      {
        brandId: 'brd-003',
        pegSizeMl: 30,
        pegDefinitionId: 'peg-30',
        quantity: 1,
        unitPrice: 65,
        bottleId: 'bot-008',
      },
    ],
  },
  {
    daysAgoVal: 4,
    counter: 'counter-rooftop',
    bartenderName: 'Rajesh',
    lines: [
      {
        brandId: 'brd-004',
        pegSizeMl: 60,
        pegDefinitionId: 'peg-60',
        quantity: 3,
        unitPrice: 180,
        bottleId: 'bot-011',
      },
    ],
  },
  {
    daysAgoVal: 5,
    counter: 'counter-main',
    bartenderName: 'Vijay',
    lines: [
      {
        brandId: 'brd-010',
        pegSizeMl: 30,
        pegDefinitionId: 'peg-30',
        quantity: 2,
        unitPrice: 350,
        bottleId: 'bot-021',
      },
    ],
  },
  {
    daysAgoVal: 1,
    counter: 'counter-lounge',
    bartenderName: 'Suresh',
    lines: [
      {
        brandId: 'brd-009',
        pegSizeMl: 120,
        pegDefinitionId: 'peg-120',
        quantity: 1,
        unitPrice: 200,
        bottleId: 'bot-019',
      },
    ],
  },
];

const EXCISE_BRAND_IDS = ['brd-001', 'brd-003', 'brd-005', 'brd-010'];

export const liquorSeed: SeedModule = {
  name: 'liquor',
  dependsOn: ['auth', 'inventory'],

  async run(): Promise<void> {
    try {
      const existing = await R.LiquorRepository.findAllBrands({ limit: 0 });
      if (existing.total > 0) {
        console.log('[liquor.seed] Brands already exist, skipping...');
        return;
      }

      console.log('[liquor.seed] Seeding liquor domain...');

      // 1. Categories
      for (const cat of CATEGORIES) {
        await run(
          'INSERT OR IGNORE INTO liquor_categories (id, name, display_order, is_active) VALUES (?, ?, ?, 1)',
          [cat.id, cat.name, cat.displayOrder],
        );
      }
      console.log(`[liquor.seed]   Created ${CATEGORIES.length} categories`);

      // 2. Brands
      const now = new Date().toISOString();
      for (const b of BRANDS) {
        await run(
          `INSERT OR IGNORE INTO liquor_brands (id, name, category_id, manufacturer, proof, country, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            b.id,
            b.name,
            b.categoryId,
            b.manufacturer,
            b.proof,
            b.country,
            now,
            now,
          ],
        );
      }
      console.log(`[liquor.seed]   Created ${BRANDS.length} brands`);

      // 3. Peg Definitions
      for (const p of PEG_DEFS) {
        await run(
          'INSERT OR IGNORE INTO peg_definitions (id, name, size_ml, is_active) VALUES (?, ?, ?, 1)',
          [p.id, p.name, p.sizeMl],
        );
      }
      console.log(`[liquor.seed]   Created ${PEG_DEFS.length} peg definitions`);

      // 4. Peg Prices
      for (const pp of PEG_PRICES) {
        await run(
          `INSERT OR IGNORE INTO peg_prices (id, brand_id, peg_size_id, tier, price, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
          [pp.id, pp.brandId, pp.pegSizeId, pp.tier, pp.price, now, now],
        );
      }
      console.log(`[liquor.seed]   Created ${PEG_PRICES.length} peg prices`);

      // 5. Bottles
      for (const b of BOTTLES) {
        await run(
          `INSERT OR IGNORE INTO liquor_bottles (id, brand_id, size_ml, batch_no, purchase_cost, selling_price, mrp, status, current_ml, initial_ml, location, is_active, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
          [
            b.id,
            b.brandId,
            b.sizeMl,
            b.batchNo,
            b.purchaseCost,
            b.sellingPrice,
            b.mrp,
            b.status,
            b.currentMl,
            b.initialMl,
            b.location,
            now,
            now,
          ],
        );
      }
      console.log(`[liquor.seed]   Created ${BOTTLES.length} bottles`);

      // 6. Bottle movements (openings, breakage, etc.)
      for (const b of BOTTLES) {
        const brandName = BRAND_NAME_MAP[b.brandId];
        if (b.status === 'stored') continue;

        if (
          b.status === 'opened' ||
          b.status === 'active' ||
          b.status === 'partially_consumed'
        ) {
          await R.LiquorRepository.recordMovement({
            bottleId: b.id,
            brandId: b.brandId,
            brandName,
            kind: 'opening',
            quantityMl: b.initialMl,
            mlBefore: 0,
            mlAfter: b.initialMl,
            operator: 'seed',
            reference: 'Seed data initialization',
            note: `${b.status} bottle`,
          });
        }

        if (b.status === 'empty') {
          await R.LiquorRepository.recordMovement({
            bottleId: b.id,
            brandId: b.brandId,
            brandName,
            kind: 'consumed',
            quantityMl: b.initialMl,
            mlBefore: b.initialMl,
            mlAfter: 0,
            operator: 'seed',
            reference: 'Bottle emptied',
            note: 'Bottle fully consumed',
          });
        }
      }

      // Broken bottle movement
      const brokenBottle = BOTTLES.find((b) => b.status === 'broken');
      if (brokenBottle) {
        await R.LiquorRepository.recordMovement({
          bottleId: brokenBottle.id,
          brandId: brokenBottle.brandId,
          brandName: BRAND_NAME_MAP[brokenBottle.brandId],
          kind: 'breakage',
          quantityMl: brokenBottle.initialMl,
          mlBefore: brokenBottle.initialMl,
          mlAfter: 0,
          operator: 'seed',
          reference: 'Breakage recorded',
          note: 'Bottle broken',
        });
      }

      // Archived bottle movement
      const archivedBottle = BOTTLES.find((b) => b.status === 'archived');
      if (archivedBottle) {
        await R.LiquorRepository.recordMovement({
          bottleId: archivedBottle.id,
          brandId: archivedBottle.brandId,
          brandName: BRAND_NAME_MAP[archivedBottle.brandId],
          kind: 'archived',
          quantityMl: 0,
          mlBefore: archivedBottle.initialMl,
          mlAfter: archivedBottle.initialMl,
          operator: 'seed',
          reference: 'Bottle archived',
          note: 'Bottle moved to archive',
        });
      }
      console.log('[liquor.seed]   Recorded bottle movements');

      // 7. Sample sales
      for (let si = 0; si < SALES_DATA.length; si++) {
        const sd = SALES_DATA[si];
        const saleDate = daysAgo(sd.daysAgoVal);

        const sale = await R.LiquorRepository.createSale({
          counter: sd.counter,
          bartenderName: sd.bartenderName,
          notes: `Sample sale ${si + 1}`,
          lines: sd.lines.map((l) => ({
            brandId: l.brandId,
            pegSizeMl: l.pegSizeMl,
            pegDefinitionId: l.pegDefinitionId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            pourType: 'regular' as const,
          })),
        });

        await run(
          'UPDATE bar_sales SET created_at = ?, updated_at = ? WHERE id = ?',
          [saleDate, saleDate, sale.id],
        );
        for (const line of sale.lines) {
          await run('UPDATE bar_sale_lines SET created_at = ? WHERE id = ?', [
            saleDate,
            line.id,
          ]);
        }

        for (let li = 0; li < sale.lines.length; li++) {
          const line = sale.lines[li];
          const sdLine = sd.lines[li];
          const quantityMl = sdLine.pegSizeMl * sdLine.quantity;

          const bottleBefore = await R.LiquorRepository.findBottleById(
            sdLine.bottleId,
          );
          const mlBefore = bottleBefore?.currentMl ?? 0;

          await R.LiquorRepository.recordPour({
            saleLineId: line.id,
            bottleId: sdLine.bottleId,
            brandId: sdLine.brandId,
            pegSizeMl: sdLine.pegSizeMl,
            pourType: 'regular',
            quantityMl,
            bartenderId: 'seed',
          });

          const mlAfter = Math.max(0, mlBefore - quantityMl);
          await R.LiquorRepository.recordMovement({
            bottleId: sdLine.bottleId,
            brandId: sdLine.brandId,
            brandName: line.brandName || BRAND_NAME_MAP[sdLine.brandId],
            kind: 'sale',
            quantityMl,
            mlBefore,
            mlAfter,
            operator: 'seed',
            pourType: 'regular',
            saleId: sale.id,
            saleLineId: line.id,
            unitPrice: sdLine.unitPrice,
            reference: sale.saleNo,
            note: `Sale ${si + 1} line ${li + 1}`,
          });
        }

        await R.LiquorRepository.updateSaleStatus(sale.id, 'completed');
        console.log(`[liquor.seed]   Created sale: ${sale.saleNo}`);
      }

      // 8. Excise entries
      const yesterday = daysAgo(1).split('T')[0];
      for (const eb of EXCISE_BRAND_IDS) {
        const brand = BRANDS.find((b) => b.id === eb);
        if (!brand) continue;

        const openingBottles =
          eb === 'brd-001'
            ? 3
            : eb === 'brd-003'
              ? 2
              : eb === 'brd-005'
                ? 4
                : 2;
        const openingMl =
          eb === 'brd-001'
            ? 2250
            : eb === 'brd-003'
              ? 1500
              : eb === 'brd-005'
                ? 2600
                : 1500;
        const soldMl =
          eb === 'brd-001'
            ? 120
            : eb === 'brd-003'
              ? 30
              : eb === 'brd-005'
                ? 650
                : 60;
        const soldAmount =
          eb === 'brd-001'
            ? 320
            : eb === 'brd-003'
              ? 65
              : eb === 'brd-005'
                ? 250
                : 700;
        const closingMl =
          eb === 'brd-001'
            ? 2130
            : eb === 'brd-003'
              ? 1470
              : eb === 'brd-005'
                ? 1950
                : 1440;
        const closingBottles =
          eb === 'brd-001'
            ? 3
            : eb === 'brd-003'
              ? 2
              : eb === 'brd-005'
                ? 3
                : 2;

        const entry = await R.LiquorRepository.createExciseEntry({
          date: yesterday,
          counter: 'counter-main',
          brandId: brand.id,
          brandName: BRAND_NAME_MAP[brand.id],
          categoryId: brand.categoryId,
          categoryName: CATEGORY_NAME_MAP[brand.categoryId] || '',
          openingStockBottles: openingBottles,
          openingStockMl: openingMl,
          receivedBottles: 0,
          receivedMl: 0,
          preparedBy: 'seed',
        });

        await R.LiquorRepository.updateExciseEntry(entry.id, {
          soldMl,
          soldAmount,
          closingStockBottles: closingBottles,
          closingStockMl: closingMl,
          remarks: 'Auto-generated seed entry',
        });
      }
      console.log(
        `[liquor.seed]   Created ${EXCISE_BRAND_IDS.length} excise entries`,
      );

      console.log('[liquor.seed] Liquor seeding complete.');
    } catch (err) {
      console.error('[liquor.seed] Seeding failed:', err);
    }
  },

  async verify(): Promise<boolean> {
    const result = await R.LiquorRepository.findAllBrands({ limit: 0 });
    return result.total >= BRANDS.length;
  },
};
