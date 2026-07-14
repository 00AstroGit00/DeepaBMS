import { RestaurantRepository as repo } from './restaurant.repository';
import type { SeedModule } from '../../seed/types';

const TABLES = [
  { tableNo: 'T1', capacity: 2, area: 'main' as const, posX: 1, posY: 1 },
  { tableNo: 'T2', capacity: 2, area: 'main' as const, posX: 1, posY: 2 },
  { tableNo: 'T3', capacity: 4, area: 'main' as const, posX: 2, posY: 1 },
  { tableNo: 'T4', capacity: 4, area: 'main' as const, posX: 2, posY: 2 },
  { tableNo: 'T5', capacity: 6, area: 'main' as const, posX: 3, posY: 1 },
  { tableNo: 'T6', capacity: 6, area: 'main' as const, posX: 3, posY: 2 },
  { tableNo: 'V1', capacity: 8, area: 'vip' as const, posX: 4, posY: 1 },
  { tableNo: 'V2', capacity: 10, area: 'vip' as const, posX: 4, posY: 2 },
  { tableNo: 'O1', capacity: 4, area: 'outdoor' as const, posX: 5, posY: 1 },
  { tableNo: 'O2', capacity: 4, area: 'outdoor' as const, posX: 5, posY: 2 },
  { tableNo: 'TR1', capacity: 6, area: 'terrace' as const, posX: 6, posY: 1 },
  { tableNo: 'TR2', capacity: 8, area: 'terrace' as const, posX: 6, posY: 2 },
];

const CATEGORIES = [
  { name: 'Kerala Specials', displayOrder: 1 },
  { name: 'Starters', displayOrder: 2 },
  { name: 'Main Course - Veg', displayOrder: 3 },
  { name: 'Main Course - Non Veg', displayOrder: 4 },
  { name: 'Rice & Breads', displayOrder: 5 },
  { name: 'Beverages', displayOrder: 6 },
  { name: 'Desserts', displayOrder: 7 },
];

const MENU_ITEMS = [
  {
    name: 'Kerala Meals',
    description: 'Traditional Kerala sadya on banana leaf',
    price: 180,
    course: 'main',
    category: 0,
    isVeg: true,
    prepTime: 15,
  },
  {
    name: 'Chicken Curry',
    description: 'Kerala-style chicken curry with coconut',
    price: 220,
    course: 'main',
    category: 3,
    prepTime: 20,
  },
  {
    name: 'Beef Fry',
    description: 'Kerala-style crispy beef fry',
    price: 250,
    course: 'main',
    category: 3,
    prepTime: 20,
  },
  {
    name: 'Fish Moilee',
    description: 'Fish in coconut milk gravy',
    price: 280,
    course: 'main',
    category: 3,
    prepTime: 25,
  },
  {
    name: 'Prawns Masala',
    description: 'Spicy prawns masala',
    price: 320,
    course: 'main',
    category: 3,
    prepTime: 25,
  },
  {
    name: 'Mutton Biriyani',
    description: 'Malabar biriyani with tender mutton',
    price: 350,
    course: 'rice',
    category: 4,
    prepTime: 30,
  },
  {
    name: 'Chicken Biriyani',
    description: 'Malabar style chicken biriyani',
    price: 280,
    course: 'rice',
    category: 4,
    prepTime: 25,
  },
  {
    name: 'Veg Biriyani',
    description: 'Vegetable biriyani with fragrant rice',
    price: 220,
    course: 'rice',
    category: 4,
    isVeg: true,
    prepTime: 25,
  },
  {
    name: 'Steamed Rice',
    description: 'Plain steamed rice',
    price: 50,
    course: 'rice',
    category: 4,
    isVeg: true,
    prepTime: 5,
  },
  {
    name: 'Parotta',
    description: 'Kerala layered flatbread',
    price: 25,
    course: 'bread',
    category: 4,
    isVeg: true,
    prepTime: 10,
  },
  {
    name: 'Appam',
    description: 'Kerala rice pancakes',
    price: 30,
    course: 'bread',
    category: 4,
    isVeg: true,
    prepTime: 10,
  },
  {
    name: 'Chicken 65',
    description: 'Spicy deep-fried chicken',
    price: 200,
    course: 'starter',
    category: 1,
    prepTime: 15,
  },
  {
    name: 'Fish Fry',
    description: 'Crispy fried fish (Karimeen)',
    price: 240,
    course: 'starter',
    category: 1,
    prepTime: 15,
  },
  {
    name: 'Veg Cutlet',
    description: 'Crumb-fried vegetable cutlet',
    price: 120,
    course: 'starter',
    category: 1,
    isVeg: true,
    prepTime: 10,
  },
  {
    name: 'Chicken Soup',
    description: 'Clear chicken soup with vegetables',
    price: 150,
    course: 'soup',
    category: 1,
    prepTime: 10,
  },
  {
    name: 'Veg Soup',
    description: 'Mixed vegetable soup',
    price: 120,
    course: 'soup',
    category: 1,
    isVeg: true,
    prepTime: 10,
  },
  {
    name: 'Pepper Chicken',
    description: 'Dry pepper chicken starter',
    price: 220,
    course: 'starter',
    category: 1,
    prepTime: 15,
  },
  {
    name: 'Ghee Rice',
    description: 'Fragrant ghee rice',
    price: 100,
    course: 'rice',
    category: 4,
    isVeg: true,
    prepTime: 10,
  },
  {
    name: 'Pappadum',
    description: 'Crispy fried pappad',
    price: 15,
    course: 'side',
    category: 4,
    isVeg: true,
    prepTime: 2,
  },
  {
    name: 'Raita',
    description: 'Fresh cucumber raita',
    price: 40,
    course: 'side',
    category: 4,
    isVeg: true,
    prepTime: 5,
  },
  {
    name: 'Lime Soda',
    description: 'Fresh lime soda (sweet/salt)',
    price: 40,
    course: 'beverage',
    category: 5,
    isVeg: true,
    prepTime: 3,
  },
  {
    name: 'Buttermilk',
    description: 'Spiced buttermilk (chaas)',
    price: 30,
    course: 'beverage',
    category: 5,
    isVeg: true,
    prepTime: 2,
  },
  {
    name: 'Tea',
    description: 'Kerala-style chai',
    price: 20,
    course: 'beverage',
    category: 5,
    isVeg: true,
    prepTime: 3,
  },
  {
    name: 'Coffee',
    description: 'Filter coffee',
    price: 25,
    course: 'beverage',
    category: 5,
    isVeg: true,
    prepTime: 3,
  },
  {
    name: 'Palada Payasam',
    description: 'Traditional Kerala sweet pudding',
    price: 80,
    course: 'dessert',
    category: 6,
    isVeg: true,
    prepTime: 5,
  },
  {
    name: 'Gulab Jamun',
    description: 'Deep-fried milk dumplings in syrup',
    price: 60,
    course: 'dessert',
    category: 6,
    isVeg: true,
    prepTime: 3,
  },
];

const STATIONS = [
  {
    name: 'Main Kitchen',
    code: 'KITCHEN',
    description: 'Primary cooking station for all main courses',
  },
  {
    name: 'Tandoor & Grill',
    code: 'TANDOOR',
    description: 'Tandoor items, grills, and kebabs',
  },
  {
    name: 'Beverage Station',
    code: 'BEVERAGE',
    description: 'Hot and cold beverages',
  },
  {
    name: 'Dessert Station',
    code: 'DESSERT',
    description: 'Desserts and sweets',
  },
  {
    name: 'Rice & Bread Station',
    code: 'RICE_BREAD',
    description: 'Rice dishes, biriyani, and breads',
  },
];

const RECIPES: Record<
  string,
  {
    ings: { name: string; qty: number; unit: string; waste?: number }[];
    wasteFactor?: number;
  }
> = {
  'Chicken Curry': {
    ings: [
      { name: 'Chicken', qty: 0.2, unit: 'kg', waste: 5 },
      { name: 'Cooking Oil', qty: 0.03, unit: 'L' },
      { name: 'Onion', qty: 0.1, unit: 'kg', waste: 10 },
      { name: 'Ginger-Garlic Paste', qty: 0.02, unit: 'kg' },
      { name: 'Turmeric Powder', qty: 0.005, unit: 'kg' },
      { name: 'Chilli Powder', qty: 0.01, unit: 'kg' },
      { name: 'Coriander Powder', qty: 0.01, unit: 'kg' },
      { name: 'Garam Masala', qty: 0.003, unit: 'kg' },
      { name: 'Salt', qty: 0.005, unit: 'kg' },
      { name: 'Coconut', qty: 0.1, unit: 'pc' },
      { name: 'Curry Leaves', qty: 1, unit: 'pc' },
      { name: 'Green Chillies', qty: 0.01, unit: 'kg' },
    ],
    wasteFactor: 5,
  },
  'Kerala Meals': {
    ings: [
      { name: 'Rice (Matta)', qty: 0.3, unit: 'kg' },
      { name: 'Cooking Oil', qty: 0.02, unit: 'L' },
      { name: 'Salt', qty: 0.003, unit: 'kg' },
      { name: 'Turmeric Powder', qty: 0.002, unit: 'kg' },
      { name: 'Coconut', qty: 0.1, unit: 'pc' },
      { name: 'Curry Leaves', qty: 1, unit: 'pc' },
    ],
    wasteFactor: 3,
  },
  'Chicken Biriyani': {
    ings: [
      { name: 'Rice (Matta)', qty: 0.2, unit: 'kg' },
      { name: 'Chicken', qty: 0.15, unit: 'kg', waste: 5 },
      { name: 'Cooking Oil', qty: 0.03, unit: 'L' },
      { name: 'Onion', qty: 0.1, unit: 'kg', waste: 10 },
      { name: 'Ginger-Garlic Paste', qty: 0.02, unit: 'kg' },
      { name: 'Turmeric Powder', qty: 0.003, unit: 'kg' },
      { name: 'Chilli Powder', qty: 0.005, unit: 'kg' },
      { name: 'Coriander Powder', qty: 0.005, unit: 'kg' },
      { name: 'Garam Masala', qty: 0.005, unit: 'kg' },
      { name: 'Salt', qty: 0.005, unit: 'kg' },
      { name: 'Curry Leaves', qty: 1, unit: 'pc' },
      { name: 'Green Chillies', qty: 0.005, unit: 'kg' },
    ],
    wasteFactor: 5,
  },
  'Chicken 65': {
    ings: [
      { name: 'Chicken', qty: 0.2, unit: 'kg', waste: 5 },
      { name: 'Cooking Oil', qty: 0.05, unit: 'L' },
      { name: 'Ginger-Garlic Paste', qty: 0.01, unit: 'kg' },
      { name: 'Chilli Powder', qty: 0.005, unit: 'kg' },
      { name: 'Turmeric Powder', qty: 0.002, unit: 'kg' },
      { name: 'Salt', qty: 0.003, unit: 'kg' },
      { name: 'Curry Leaves', qty: 2, unit: 'pc' },
    ],
    wasteFactor: 3,
  },
  'Lime Soda': {
    ings: [
      { name: 'Fresh Lime Juice', qty: 0.05, unit: 'L' },
      { name: 'Soda 300ml', qty: 1, unit: 'btl' },
      { name: 'Sugar', qty: 0.02, unit: 'kg' },
    ],
  },
  'Steamed Rice': {
    ings: [
      { name: 'Rice (Matta)', qty: 0.2, unit: 'kg' },
      { name: 'Salt', qty: 0.002, unit: 'kg' },
    ],
  },
};

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export const restaurantSeed: SeedModule = {
  name: 'restaurant',
  dependsOn: ['inventory', 'auth'],

  async run(): Promise<void> {
    const countResult = await repo.listTables({ limit: 0 });
    if (countResult.total > 0) {
      console.log('[seed] Restaurant already seeded, skipping.');
      return;
    }

    console.log('[seed] Seeding restaurant domain...');

    for (const t of TABLES) {
      await repo.createTable(t);
    }
    console.log(`[seed]   Created ${TABLES.length} dining tables`);

    const catIds: string[] = [];
    for (const c of CATEGORIES) {
      const cat = await repo.createMenuCategory(c);
      catIds.push(cat.id);
    }
    console.log(`[seed]   Created ${catIds.length} menu categories`);

    const menuItemIds: string[] = [];
    for (const m of MENU_ITEMS) {
      const item = await repo.createMenuItem({
        categoryId: catIds[m.category],
        name: m.name,
        description: m.description,
        price: m.price,
        course: m.course,
        isVegetarian: (m as any).isVeg || false,
        preparationTime: m.prepTime || 10,
      });
      menuItemIds.push(item.id);
    }
    console.log(`[seed]   Created ${menuItemIds.length} menu items`);

    for (const rcp of Object.entries(RECIPES)) {
      const [name, data] = rcp;
      const idx = MENU_ITEMS.findIndex((m) => m.name === name);
      if (idx === -1) continue;

      const { query } = require('../../db');
      const invRows = await query(
        'SELECT id, name FROM inventory WHERE is_active = 1',
      );
      const ingredients = data.ings.map((ing) => {
        const invItem = invRows.find((i: any) => i.name === ing.name);
        return {
          inventoryItemId: invItem?.id || null,
          inventoryItemName: ing.name,
          quantity: ing.qty,
          unit: ing.unit,
          wasteFactor: ing.waste || 0,
          isAlternative: false,
        };
      });

      try {
        await repo.createRecipe({
          menuItemId: menuItemIds[idx],
          name,
          yieldQty: 1,
          yieldUnit: 'pc',
          wasteFactor: data.wasteFactor || 0,
          ingredients,
        });
      } catch (err: any) {
        console.warn(
          `[seed]   Recipe creation skipped for "${name}": ${err.message}`,
        );
      }
    }
    console.log(`[seed]   Created ${Object.keys(RECIPES).length} recipes`);

    for (const s of STATIONS) {
      await repo.createKitchenStation(s);
    }
    console.log(`[seed]   Created ${STATIONS.length} kitchen stations`);

    console.log('[seed] Restaurant seeding complete.');
  },

  async verify(): Promise<boolean> {
    const result = await repo.listTables({ limit: 0 });
    return result.total >= TABLES.length;
  },
};
