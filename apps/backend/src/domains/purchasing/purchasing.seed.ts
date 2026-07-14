import { PurchasingRepository as repo } from './purchasing.repository';
import { PurchasingValidationService } from './purchasing.service';
import type { SeedModule } from '../../seed/types';

const SUPPLIERS = [
  {
    name: 'Kerala Food Distributors',
    contactPerson: 'Ravi Menon',
    phone: '9846012345',
    email: 'ravi@keralafood.in',
    gstin: '32ABCDE1234F1Z5',
    address: 'Calicut, Kerala',
    paymentTerms: 'net30',
    creditLimit: 200000,
    isPreferred: true,
    leadTimeDays: 3,
    notes: 'Primary food supplier',
  },
  {
    name: 'Malabar Meat Suppliers',
    contactPerson: 'Suresh Kumar',
    phone: '9846123456',
    email: 'suresh@malabarmeats.in',
    gstin: '32FGHIJ5678K2L6',
    address: 'Kozhikode, Kerala',
    paymentTerms: 'net15',
    creditLimit: 150000,
    isPreferred: true,
    leadTimeDays: 2,
    notes: 'Chicken, mutton, fish',
  },
  {
    name: 'High Range Beverages',
    contactPerson: 'Thomas George',
    phone: '9846234567',
    email: 'thomas@hrbeverages.in',
    gstin: '32KLMNO9012P3M7',
    address: 'Munnar, Kerala',
    paymentTerms: 'net30',
    creditLimit: 100000,
    isPreferred: true,
    leadTimeDays: 4,
    notes: 'Soft drinks and mineral water',
  },
  {
    name: 'Palakkad Rice Mills',
    contactPerson: 'Krishnan Nair',
    phone: '9846345678',
    email: 'krishnan@palakkadrice.in',
    gstin: '32PQRST3456R4N8',
    address: 'Palakkad, Kerala',
    paymentTerms: 'net30',
    creditLimit: 80000,
    isPreferred: false,
    leadTimeDays: 5,
    notes: 'Matta rice and grains',
  },
  {
    name: 'Spice Garden Traders',
    contactPerson: 'Govindan K',
    phone: '9846456789',
    email: 'govindan@spicegarden.in',
    gstin: '32UVWXY7890S5O9',
    address: 'Kochi, Kerala',
    paymentTerms: 'net15',
    creditLimit: 50000,
    isPreferred: true,
    leadTimeDays: 3,
    notes: 'Spices and masalas',
  },
  {
    name: 'Western Liquor Distributors',
    contactPerson: 'Paul Varghese',
    phone: '9846567890',
    email: 'paul@westernliquor.in',
    gstin: '32ZABCD1234T6P1',
    address: 'Kochi, Kerala',
    paymentTerms: 'net7',
    creditLimit: 500000,
    isPreferred: true,
    leadTimeDays: 2,
    notes: 'IMFL, beer, wine — requires excise permit',
  },
  {
    name: 'Vienna Packaging Solutions',
    contactPerson: 'Anand Raj',
    phone: '9846678901',
    email: 'anand@viennapack.in',
    gstin: '32EFGHI5678U7Q2',
    address: 'Thrissur, Kerala',
    paymentTerms: 'net45',
    creditLimit: 60000,
    isPreferred: false,
    leadTimeDays: 7,
    notes: 'Parcel boxes, bags, disposables',
  },
  {
    name: 'CleanCare Hygiene Supplies',
    contactPerson: 'Mariya Joseph',
    phone: '9846789012',
    email: 'mariya@cleancare.in',
    gstin: '32JKLMN9012V8R3',
    address: 'Kollam, Kerala',
    paymentTerms: 'net30',
    creditLimit: 40000,
    isPreferred: false,
    leadTimeDays: 5,
    notes: 'Cleaning chemicals and consumables',
  },
  {
    name: 'Hotel Amenities Kerala',
    contactPerson: 'Rahul Nair',
    phone: '9846890123',
    email: 'rahul@hotelamenities.in',
    gstin: '32OPQRS3456W9S4',
    address: 'Thiruvananthapuram, Kerala',
    paymentTerms: 'net30',
    creditLimit: 70000,
    isPreferred: true,
    leadTimeDays: 4,
    notes: 'Room amenities, toiletries, linens',
  },
  {
    name: 'Kochi Kitchen Equipment',
    contactPerson: 'Biju Mathew',
    phone: '9846901234',
    email: 'biju@kochikitchen.in',
    gstin: '32TUVWX7890X1T5',
    address: 'Ernakulam, Kerala',
    paymentTerms: 'net30',
    creditLimit: 100000,
    isPreferred: false,
    leadTimeDays: 6,
    notes: 'LPG cylinders, kitchen tools',
  },
  {
    name: 'Premium Bar Supplies',
    contactPerson: 'Sebastian D',
    phone: '9847012345',
    email: 'sebastian@premiumbar.in',
    gstin: '32YABCD1234Y2U6',
    address: 'Kozhikode, Kerala',
    paymentTerms: 'net7',
    creditLimit: 300000,
    isPreferred: true,
    leadTimeDays: 3,
    notes: 'Premium liquor and bar consumables',
  },
  {
    name: 'Green Valley Fresh Produce',
    contactPerson: 'Sunil P',
    phone: '9847123456',
    email: 'sunil@greenvalley.in',
    gstin: '32EFGHI5678Z3V7',
    address: 'Wayanad, Kerala',
    paymentTerms: 'cod',
    creditLimit: 30000,
    isPreferred: false,
    leadTimeDays: 1,
    notes: 'Vegetables and fresh produce — daily delivery',
  },
];

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export const purchasingSeed: SeedModule = {
  name: 'purchasing',
  dependsOn: ['inventory', 'auth'],

  async run(): Promise<void> {
    const countResult = await repo.listSuppliers({ limit: 0 });
    if (countResult.total > 0) {
      console.log('[seed] Purchasing already seeded, skipping.');
      return;
    }

    console.log(`[seed] Seeding ${SUPPLIERS.length} suppliers...`);
    const supplierIds: string[] = [];
    for (const s of SUPPLIERS) {
      const errors = PurchasingValidationService.validateSupplier(s);
      if (errors.length > 0) {
        console.warn(
          `[seed] Skipping supplier "${s.name}": ${errors.join(', ')}`,
        );
        continue;
      }
      const supplier = await repo.createSupplier(s);
      supplierIds.push(supplier.id);
      console.log(`[seed]   Created supplier: ${s.name}`);
    }

    if (supplierIds.length >= 2) {
      const samplePO = await repo.createPO(
        {
          supplierId: supplierIds[0],
          orderDate: daysAgo(5),
          expectedDate: today(),
          notes: 'Weekly restaurant supplies — sample PO',
          lines: [
            {
              itemName: 'Chicken',
              unit: 'kg',
              quantity: 25,
              unitCost: 200,
              category: 'food',
            },
            {
              itemName: 'Cooking Oil',
              unit: 'L',
              quantity: 15,
              unitCost: 135,
              category: 'food',
            },
            {
              itemName: 'Onion',
              unit: 'kg',
              quantity: 20,
              unitCost: 35,
              category: 'food',
            },
            {
              itemName: 'Rice (Matta)',
              unit: 'kg',
              quantity: 50,
              unitCost: 50,
              category: 'food',
            },
          ],
        },
        'seed',
      );
      await repo.updatePOStatus(samplePO.id, 'approved');
      console.log(`[seed]   Created sample PO: ${samplePO.poNumber}`);

      const samplePO2 = await repo.createPO(
        {
          supplierId: supplierIds[2],
          orderDate: daysAgo(3),
          expectedDate: daysAgo(1),
          notes: 'Beverages restock',
          lines: [
            {
              itemName: 'Pepsi 750ml',
              unit: 'btl',
              quantity: 48,
              unitCost: 32,
              category: 'softdrink',
            },
            {
              itemName: 'Mineral Water 1L',
              unit: 'btl',
              quantity: 36,
              unitCost: 12,
              category: 'softdrink',
            },
            {
              itemName: 'Soda 300ml',
              unit: 'btl',
              quantity: 48,
              unitCost: 10,
              category: 'softdrink',
            },
          ],
        },
        'seed',
      );
      await repo.updatePOStatus(samplePO2.id, 'ordered');
      console.log(`[seed]   Created sample PO: ${samplePO2.poNumber}`);

      const samplePO3 = await repo.createPO(
        {
          supplierId: supplierIds[1],
          orderDate: daysAgo(7),
          expectedDate: daysAgo(2),
          notes: 'Meat order — received',
          lines: [
            {
              itemName: 'Chicken',
              unit: 'kg',
              quantity: 30,
              unitCost: 195,
              category: 'food',
            },
            {
              itemName: 'Fish (Kingfish)',
              unit: 'kg',
              quantity: 10,
              unitCost: 320,
              category: 'food',
            },
          ],
        },
        'seed',
      );
      await repo.updatePOStatus(samplePO3.id, 'received');
      console.log(
        `[seed]   Created sample PO (received): ${samplePO3.poNumber}`,
      );

      const liquorSupplier = supplierIds.find((_, i) =>
        SUPPLIERS[i]?.name.includes('Liquor'),
      );
      if (liquorSupplier) {
        const liquorPO = await repo.createPO(
          {
            supplierId: liquorSupplier,
            orderDate: daysAgo(10),
            expectedDate: daysAgo(3),
            notes: 'Bar stock — IMFL & beer',
            lines: [
              {
                itemName: 'Whisky (750ml)',
                unit: 'btl',
                quantity: 24,
                unitCost: 450,
                category: 'liquor',
              },
              {
                itemName: 'Beer (650ml)',
                unit: 'btl',
                quantity: 48,
                unitCost: 120,
                category: 'liquor',
              },
              {
                itemName: 'Wine (750ml)',
                unit: 'btl',
                quantity: 12,
                unitCost: 350,
                category: 'liquor',
              },
            ],
          },
          'seed',
        );
        await repo.updatePOStatus(liquorPO.id, 'received');
        console.log(`[seed]   Created liquor PO: ${liquorPO.poNumber}`);
      }

      const amenitiesSupplier = supplierIds.find((_, i) =>
        SUPPLIERS[i]?.name.includes('Amenities'),
      );
      if (amenitiesSupplier) {
        const amenitiesPO = await repo.createPO(
          {
            supplierId: amenitiesSupplier,
            orderDate: today(),
            notes: 'Room amenities restock',
            lines: [
              {
                itemName: 'Bath Towels',
                unit: 'pc',
                quantity: 20,
                unitCost: 165,
                category: 'amenities',
              },
              {
                itemName: 'Toilet Soap',
                unit: 'pc',
                quantity: 60,
                unitCost: 7,
                category: 'amenities',
              },
              {
                itemName: 'Shampoo Sachets',
                unit: 'pc',
                quantity: 100,
                unitCost: 3,
                category: 'amenities',
              },
            ],
          },
          'seed',
        );
        console.log(
          `[seed]   Created amenities PO (draft): ${amenitiesPO.poNumber}`,
        );
      }
    }

    console.log(
      `[seed] Seeded ${supplierIds.length} suppliers with sample purchase orders.`,
    );
  },

  async verify(): Promise<boolean> {
    const result = await repo.listSuppliers({ limit: 0 });
    return result.total >= SUPPLIERS.length;
  },
};
