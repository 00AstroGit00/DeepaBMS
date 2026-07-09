import { uid, dateKey } from '../../utils/helpers';
import { GlobalState, Sale, Txn } from './types';

export const buildSeed = (): GlobalState => {
  let lcgSeed = 42;
  const nextRandom = (): number => {
    lcgSeed = (16807 * lcgSeed) % 2147483647;
    return lcgSeed / 2147483647;
  };
  const selectRandom = <T>(arr: T[]): T =>
    arr[Math.floor(nextRandom() * arr.length)];
  const randomRange = (min: number, max: number): number =>
    Math.round(min + nextRandom() * (max - min));
  const makeIsoDate = (
    daysAgo: number,
    hour: number,
    minute: number = 0,
  ): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const defaultBankId = 'bank-hdfc';
  const salesList: Sale[] = [];
  const txnsList: Txn[] = [];

  const restaurantDesc = [
    'Lunch meals x12',
    'Biriyani orders',
    'Dinner service',
    'Breakfast + tea',
    'Family lunch party',
    'Evening snacks & tea',
  ];
  const barDesc = [
    'Bar counter sales',
    'Peg sales - evening',
    'Beer & pegs',
    'Bar table service',
  ];
  const takeawayDesc = ['Parcel biriyani', 'Takeaway meals', 'Parcel counter'];
  const onlineDesc = ['Swiggy orders', 'Zomato orders'];
  const paymentModes = ['cash', 'cash', 'cash', 'upi', 'upi', 'card'];

  for (let i = 34; i >= 0; i--) {
    const weekendMultiplier =
      new Date(Date.now() - 86400000 * i).getDay() % 6 === 0 ? 1.35 : 1;
    const isToday = i === 0;
    const resBillCount = isToday ? 2 : randomRange(2, 3);

    for (let j = 0; j < resBillCount; j++) {
      const amt = Math.round(randomRange(2200, 5200) * weekendMultiplier);
      const gst = Math.round(0.05 * amt);
      salesList.push({
        id: uid(),
        date: makeIsoDate(i, 9 + 4 * j, randomRange(0, 55)),
        dept: 'restaurant',
        description: selectRandom(restaurantDesc),
        amount: amt,
        gstRate: 5,
        gstAmount: gst,
        total: amt + gst,
        mode: selectRandom(paymentModes) as any,
        billNo: `R${3400 + 7 * i + j}`,
      });
    }

    const barBillCount = isToday ? 1 : 2;
    for (let j = 0; j < barBillCount; j++) {
      const amt = Math.round(randomRange(3000, 7200) * weekendMultiplier);
      salesList.push({
        id: uid(),
        date: makeIsoDate(i, 17 + 3 * j, randomRange(0, 55)),
        dept: 'bar',
        description: selectRandom(barDesc),
        amount: amt,
        gstRate: 0,
        gstAmount: 0,
        total: amt,
        mode: selectRandom(['cash', 'cash', 'upi']) as any,
        billNo: `B${2100 + 4 * i + j}`,
      });
    }

    if (nextRandom() > 0.25) {
      const amt = randomRange(700, 2100);
      const gst = Math.round(0.05 * amt);
      salesList.push({
        id: uid(),
        date: makeIsoDate(i, 13, randomRange(0, 55)),
        dept: 'takeaway',
        description: selectRandom(takeawayDesc),
        amount: amt,
        gstRate: 5,
        gstAmount: gst,
        total: amt + gst,
        mode: selectRandom(paymentModes) as any,
      });
    }

    if (nextRandom() > 0.35) {
      const amt = randomRange(600, 1900);
      const gst = Math.round(0.05 * amt);
      salesList.push({
        id: uid(),
        date: makeIsoDate(i, 20, randomRange(0, 55)),
        dept: 'online',
        description: selectRandom(onlineDesc),
        amount: amt,
        gstRate: 5,
        gstAmount: gst,
        total: amt + gst,
        mode: 'bank',
      });
    }

    if (nextRandom() > 0.3 && i > 0) {
      const roomsCount = randomRange(1, 3);
      const rate = selectRandom([1200, 1800, 2800]);
      const amt = rate * roomsCount;
      const gst = Math.round(0.05 * amt);
      salesList.push({
        id: uid(),
        date: makeIsoDate(i, 11, randomRange(0, 40)),
        dept: 'rooms',
        description: `Room checkout · ${roomsCount}N`,
        amount: amt,
        gstRate: 5,
        gstAmount: gst,
        total: amt + gst,
        mode: selectRandom(['cash', 'upi', 'card']) as any,
      });
    }

    const categories = [
      ['Provisions', 'Vegetables & provisions - market', 800, 2600],
      ['Meat & Fish', 'Chicken / fish purchase', 1200, 3500],
      ['LPG & Fuel', 'Commercial LPG cylinder', 0, 0],
      ['Electricity', 'KSEB bill', 0, 0],
      ['Maintenance', 'Plumbing / repairs', 300, 1500],
      ['Staff Welfare', 'Staff tea & food', 150, 450],
    ];

    const todayExpenses = [categories[0], categories[1]];
    if (nextRandom() > 0.6) todayExpenses.push(categories[4]);
    if (nextRandom() > 0.7) todayExpenses.push(categories[5]);

    todayExpenses.forEach((cat, index) => {
      if (cat[3] !== 0) {
        txnsList.push({
          id: uid(),
          date: makeIsoDate(i, 8 + 2 * index, randomRange(0, 50)),
          kind: 'expense',
          category: cat[0] as string,
          description: cat[1] as string,
          amount: randomRange(cat[2] as number, cat[3] as number),
          mode: nextRandom() > 0.75 ? 'bank' : 'cash',
          bankId: defaultBankId,
          hasBill: nextRandom() > 0.4,
        });
      }
    });

    if (i % 12 === 3) {
      txnsList.push({
        id: uid(),
        date: makeIsoDate(i, 10),
        kind: 'expense',
        category: 'LPG & Fuel',
        description: 'Commercial LPG cylinder x2',
        amount: 3800,
        mode: 'cash',
        hasBill: true,
      });
    }

    if (i === 20) {
      txnsList.push({
        id: uid(),
        date: makeIsoDate(i, 10),
        kind: 'expense',
        category: 'Electricity',
        description: 'KSEB bi-monthly bill',
        amount: 18450,
        mode: 'bank',
        bankId: defaultBankId,
        hasBill: true,
      });
    }

    if (i === 15) {
      txnsList.push({
        id: uid(),
        date: makeIsoDate(i, 11),
        kind: 'expense',
        category: 'Liquor Purchase',
        description: 'BEVCO invoice #KL8821 · 24 bottles',
        amount: 28600,
        mode: 'bank',
        bankId: defaultBankId,
        hasBill: true,
      });
    }

    if (i === 28) {
      txnsList.push({
        id: uid(),
        date: makeIsoDate(i, 11),
        kind: 'expense',
        category: 'Salaries',
        description: 'Staff salaries - monthly',
        amount: 96500,
        mode: 'bank',
        bankId: defaultBankId,
      });
    }

    if (i === 6) {
      txnsList.push({
        id: uid(),
        date: makeIsoDate(i, 12),
        kind: 'income',
        category: 'Other Income',
        description: 'Function hall advance - Nair family',
        amount: 5000,
        mode: 'cash',
      });
    }
  }

  const generateAttendance = (type: 'good' | 'avg' | 'poor') => {
    const record: Record<string, 'P' | 'H' | 'A' | 'L'> = {};
    for (let offset = 20; offset >= 0; offset--) {
      const key = dateKey(new Date(Date.now() - 86400000 * offset));
      const randVal = nextRandom();
      if (type === 'good') {
        record[key] = randVal > 0.94 ? 'H' : 'P';
      } else if (type === 'avg') {
        record[key] = randVal > 0.9 ? 'A' : randVal > 0.82 ? 'H' : 'P';
      } else {
        record[key] = randVal > 0.82 ? 'A' : randVal > 0.72 ? 'H' : 'P';
      }
    }
    return record;
  };

  const defaultEmpFields = {
    status: 'active' as const,
    leaveBalance: { casual: 6, sick: 6 },
    reviews: [],
    documents: [],
  };

  return {
    ready: true,
    users: [
      {
        id: 'u-owner',
        name: 'Deepa (Owner)',
        role: 'owner',
        pin: '1234',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-manager',
        name: 'Rajan (Manager)',
        role: 'manager',
        pin: '2345',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-cashier',
        name: 'Sreeja (Cashier)',
        role: 'cashier',
        pin: '3456',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-reception',
        name: 'Anitha (Reception)',
        role: 'reception',
        pin: '4567',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-fnb',
        name: 'Vinod (F&B Manager)',
        role: 'fnb',
        pin: '5678',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'u-bar',
        name: 'Manoj (Bar Counter)',
        role: 'barstaff',
        pin: '6789',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    auditLog: [],
    sales: salesList,
    txns: txnsList,
    bankMoves: [
      {
        id: uid(),
        date: makeIsoDate(8, 16),
        kind: 'deposit',
        amount: 25000,
        bankId: defaultBankId,
        note: 'Weekly cash deposit',
      },
      {
        id: uid(),
        date: makeIsoDate(3, 16),
        kind: 'deposit',
        amount: 30000,
        bankId: defaultBankId,
        note: 'Cash deposit',
      },
      {
        id: uid(),
        date: makeIsoDate(12, 11),
        kind: 'withdraw',
        bankId: 'bank-sbi',
        amount: 10000,
        note: 'Petty cash withdrawal',
      },
    ],
    bankStatements: [],
    rooms: [
      {
        id: 'r101',
        no: '101',
        category: 'Standard Non-AC',
        rate: 1200,
        status: 'occupied',
        guest: {
          name: 'Suresh Menon',
          phone: '9847012345',
          idProof: 'Aadhaar 4432',
          adults: 2,
          checkIn: makeIsoDate(1, 14),
          advance: 1000,
        },
      },
      {
        id: 'r102',
        no: '102',
        category: 'Standard Non-AC',
        rate: 1200,
        status: 'vacant',
      },
      {
        id: 'r103',
        no: '103',
        category: 'Standard Non-AC',
        rate: 1200,
        status: 'cleaning',
      },
      {
        id: 'r104',
        no: '104',
        category: 'Standard Non-AC',
        rate: 1200,
        status: 'vacant',
      },
      {
        id: 'r201',
        no: '201',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'occupied',
        guest: {
          name: 'Anand Krishnan',
          phone: '9995512340',
          idProof: 'DL KL-09',
          adults: 1,
          checkIn: makeIsoDate(0, 10),
          advance: 1800,
        },
      },
      {
        id: 'r202',
        no: '202',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'vacant',
      },
      {
        id: 'r203',
        no: '203',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'occupied',
        guest: {
          name: 'Fathima Rasheed',
          phone: '9744887766',
          idProof: 'Aadhaar 8811',
          adults: 3,
          checkIn: makeIsoDate(2, 12),
          advance: 2000,
        },
      },
      {
        id: 'r204',
        no: '204',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'vacant',
      },
      {
        id: 'r301',
        no: '301',
        category: 'Suite AC',
        rate: 2800,
        status: 'vacant',
      },
      {
        id: 'r302',
        no: '302',
        category: 'Suite AC',
        rate: 2800,
        status: 'occupied',
        guest: {
          name: 'Rajesh & family',
          phone: '9633445566',
          idProof: 'Aadhaar 2210',
          adults: 4,
          checkIn: makeIsoDate(1, 13),
          advance: 3000,
        },
      },
    ],
    stays: [
      {
        id: uid(),
        roomNo: '201',
        category: 'Deluxe AC',
        guestName: 'Vipin Das',
        phone: '9856012233',
        checkIn: makeIsoDate(5, 13),
        checkOut: makeIsoDate(3, 11),
        nights: 2,
        amount: 4032,
        mode: 'upi',
      },
      {
        id: uid(),
        roomNo: '104',
        category: 'Standard Non-AC',
        guestName: 'Mary Joseph',
        phone: '9447110022',
        checkIn: makeIsoDate(4, 15),
        checkOut: makeIsoDate(2, 10),
        nights: 2,
        amount: 2688,
        mode: 'cash',
      },
      {
        id: uid(),
        roomNo: '301',
        category: 'Suite AC',
        guestName: 'Dr. Hameed',
        phone: '9895667788',
        checkIn: makeIsoDate(3, 12),
        checkOut: makeIsoDate(1, 11),
        nights: 2,
        amount: 6272,
        mode: 'card',
      },
    ],
    inventory: [
      {
        id: uid(),
        name: 'Rice (Matta)',
        category: 'food',
        unit: 'kg',
        stock: 85,
        reorder: 50,
        cost: 55,
      },
      {
        id: uid(),
        name: 'Chicken',
        category: 'food',
        unit: 'kg',
        stock: 12,
        reorder: 15,
        cost: 210,
      },
      {
        id: uid(),
        name: 'Cooking Oil',
        category: 'food',
        unit: 'L',
        stock: 28,
        reorder: 20,
        cost: 140,
      },
      {
        id: uid(),
        name: 'Onion',
        category: 'food',
        unit: 'kg',
        stock: 22,
        reorder: 25,
        cost: 38,
      },
      {
        id: uid(),
        name: 'Coconut',
        category: 'food',
        unit: 'pc',
        stock: 60,
        reorder: 40,
        cost: 32,
      },
      {
        id: uid(),
        name: 'Pepsi 750ml',
        category: 'softdrink',
        unit: 'btl',
        stock: 48,
        reorder: 24,
        cost: 35,
      },
      {
        id: uid(),
        name: 'Soda 300ml',
        category: 'softdrink',
        unit: 'btl',
        stock: 96,
        reorder: 48,
        cost: 12,
      },
      {
        id: uid(),
        name: 'Mineral Water 1L',
        category: 'softdrink',
        unit: 'btl',
        stock: 18,
        reorder: 36,
        cost: 15,
      },
      {
        id: uid(),
        name: 'LPG Cylinder 19kg',
        category: 'kitchen',
        unit: 'cyl',
        stock: 3,
        reorder: 2,
        cost: 1900,
      },
      {
        id: uid(),
        name: 'Bath Towels',
        category: 'housekeeping',
        unit: 'pc',
        stock: 34,
        reorder: 20,
        cost: 180,
      },
      {
        id: uid(),
        name: 'Bedsheets',
        category: 'housekeeping',
        unit: 'set',
        stock: 26,
        reorder: 15,
        cost: 420,
      },
      {
        id: uid(),
        name: 'Toilet Soap',
        category: 'housekeeping',
        unit: 'pc',
        stock: 14,
        reorder: 30,
        cost: 8,
      },
      {
        id: uid(),
        name: 'Phenyl 5L',
        category: 'consumable',
        unit: 'can',
        stock: 6,
        reorder: 4,
        cost: 260,
      },
      {
        id: uid(),
        name: 'Tissue Rolls',
        category: 'consumable',
        unit: 'pc',
        stock: 40,
        reorder: 24,
        cost: 22,
      },
    ],
    stockMoves: [
      {
        id: uid(),
        date: makeIsoDate(1, 9),
        itemId: '',
        itemName: 'Chicken',
        kind: 'in',
        qty: 20,
        note: 'Market purchase',
      },
      {
        id: uid(),
        date: makeIsoDate(0, 9),
        itemId: '',
        itemName: 'Chicken',
        kind: 'out',
        qty: 8,
        note: 'Kitchen issue',
      },
      {
        id: uid(),
        date: makeIsoDate(0, 10),
        itemId: '',
        itemName: 'Onion',
        kind: 'wastage',
        qty: 2,
        note: 'Spoiled stock',
      },
    ],
    liquor: [
      {
        id: uid(),
        brand: "McDowell's No.1",
        type: 'Whisky',
        sizeML: 750,
        fullBottles: 14,
        looseML: 480,
        costPerBottle: 780,
        pricePerPeg: 140,
        pricePerBottle: 1450,
      },
      {
        id: uid(),
        brand: 'Old Monk',
        type: 'Rum',
        sizeML: 750,
        fullBottles: 18,
        looseML: 300,
        costPerBottle: 520,
        pricePerPeg: 100,
        pricePerBottle: 980,
      },
      {
        id: uid(),
        brand: 'Honey Bee',
        type: 'Brandy',
        sizeML: 750,
        fullBottles: 11,
        looseML: 620,
        costPerBottle: 560,
        pricePerPeg: 110,
        pricePerBottle: 1050,
      },
      {
        id: uid(),
        brand: 'Magic Moments',
        type: 'Vodka',
        sizeML: 750,
        fullBottles: 6,
        looseML: 150,
        costPerBottle: 650,
        pricePerPeg: 120,
        pricePerBottle: 1200,
      },
      {
        id: uid(),
        brand: 'Kingfisher Premium',
        type: 'Beer',
        sizeML: 650,
        fullBottles: 52,
        looseML: 0,
        costPerBottle: 130,
        pricePerPeg: 0,
        pricePerBottle: 220,
      },
      {
        id: uid(),
        brand: 'Tuborg Strong',
        type: 'Beer',
        sizeML: 650,
        fullBottles: 8,
        looseML: 0,
        costPerBottle: 125,
        pricePerPeg: 0,
        pricePerBottle: 210,
      },
    ],
    liquorAudits: [],
    credits: [
      {
        id: 'c1',
        name: 'Basheer (Auto Stand)',
        phone: '9847556677',
        type: 'customer',
        balance: 3450,
        history: [
          {
            id: uid(),
            date: makeIsoDate(9, 13),
            kind: 'credit',
            amount: 1850,
            note: 'Lunch parcels - stand',
          },
          {
            id: uid(),
            date: makeIsoDate(4, 13),
            kind: 'credit',
            amount: 2600,
            note: 'Meals credit',
          },
          {
            id: uid(),
            date: makeIsoDate(2, 18),
            kind: 'payment',
            amount: 1000,
            note: 'Part payment - cash',
          },
        ],
      },
      {
        id: 'c2',
        name: 'PWD Site Contractor',
        phone: '9995001122',
        type: 'customer',
        balance: 8200,
        history: [
          {
            id: uid(),
            date: makeIsoDate(12, 13),
            kind: 'credit',
            amount: 5200,
            note: 'Workers lunch - 15 days',
          },
          {
            id: uid(),
            date: makeIsoDate(5, 13),
            kind: 'credit',
            amount: 3000,
            note: 'Meals credit',
          },
        ],
      },
      {
        id: 'v1',
        name: 'Kerala Beverages Co (BEVCO)',
        phone: '04662280000',
        type: 'vendor',
        gstin: '32AABCK1234F1Z5',
        balance: 0,
        history: [
          {
            id: uid(),
            date: makeIsoDate(15, 11),
            kind: 'credit',
            amount: 28600,
            note: 'Invoice #KL8821',
          },
          {
            id: uid(),
            date: makeIsoDate(15, 11),
            kind: 'payment',
            amount: 28600,
            note: 'Paid via bank',
          },
        ],
      },
      {
        id: 'v2',
        name: 'Palakkad Poultry Farm',
        phone: '9447889900',
        type: 'vendor',
        balance: 12400,
        history: [
          {
            id: uid(),
            date: makeIsoDate(10, 9),
            kind: 'credit',
            amount: 8400,
            note: 'Chicken supply - weekly',
          },
          {
            id: uid(),
            date: makeIsoDate(3, 9),
            kind: 'credit',
            amount: 6000,
            note: 'Chicken supply',
          },
          {
            id: uid(),
            date: makeIsoDate(1, 17),
            kind: 'payment',
            amount: 2000,
            note: 'Part payment',
          },
        ],
      },
      {
        id: 'v3',
        name: 'Cherpulassery Provision Store',
        phone: '9605334455',
        type: 'vendor',
        gstin: '32AAGFC9988B1ZQ',
        balance: 5750,
        history: [
          {
            id: uid(),
            date: makeIsoDate(7, 10),
            kind: 'credit',
            amount: 5750,
            note: 'Monthly provisions bill',
          },
        ],
      },
    ],
    employees: [
      {
        id: 'e-ravi',
        name: 'Ravi Kumar',
        role: 'Head Cook',
        phone: '9847223344',
        salary: 22000,
        attendance: generateAttendance('good'),
        advances: [{ id: uid(), date: makeIsoDate(6, 12), amount: 3000 }],
        ...defaultEmpFields,
        joinDate: '2019-04-01',
        access: 'staff',
        reviews: [
          {
            id: uid(),
            date: makeIsoDate(30, 10),
            rating: 5,
            strengths:
              'Consistent food quality; leads the kitchen well during rush hours',
            improvements: 'Delegate prep work more to reduce overtime',
            reviewer: 'Rajan (Manager)',
          },
        ],
      },
      {
        id: 'e-shaji',
        name: 'Shaji P',
        role: 'Cook',
        phone: '9946112233',
        salary: 16000,
        attendance: generateAttendance('good'),
        advances: [],
        ...defaultEmpFields,
        joinDate: '2021-08-15',
        access: 'staff',
      },
      {
        id: 'e-manoj',
        name: 'Manoj V',
        role: 'Bar Man',
        phone: '9605998877',
        salary: 15000,
        attendance: generateAttendance('avg'),
        advances: [{ id: uid(), date: makeIsoDate(12, 12), amount: 2000 }],
        ...defaultEmpFields,
        joinDate: '2020-11-01',
        access: 'staff',
        reviews: [
          {
            id: uid(),
            date: makeIsoDate(45, 10),
            rating: 4,
            strengths: 'Accurate stock handling, good with regulars',
            improvements: 'Evening billing speed',
            reviewer: 'Deepa (Owner)',
          },
        ],
      },
      {
        id: 'e-bindhu',
        name: 'Bindhu K',
        role: 'Housekeeping',
        phone: '9744001122',
        salary: 11000,
        attendance: generateAttendance('avg'),
        advances: [],
        ...defaultEmpFields,
        joinDate: '2022-02-10',
        access: 'staff',
        leaveBalance: { casual: 4, sick: 5 },
      },
      {
        id: 'e-ajith',
        name: 'Ajith Kumar',
        role: 'Waiter',
        phone: '9895443322',
        salary: 12000,
        attendance: generateAttendance('poor'),
        advances: [],
        ...defaultEmpFields,
        joinDate: '2023-06-01',
        access: 'staff',
        reviews: [
          {
            id: uid(),
            date: makeIsoDate(20, 10),
            rating: 3,
            strengths: 'Friendly with customers',
            improvements: 'Punctuality - repeated late arrivals this quarter',
            reviewer: 'Rajan (Manager)',
          },
        ],
      },
      {
        id: 'e-sreeja',
        name: 'Sreeja M',
        role: 'Reception',
        phone: '9633778899',
        salary: 14000,
        attendance: generateAttendance('good'),
        advances: [],
        ...defaultEmpFields,
        joinDate: '2020-01-20',
        access: 'manager',
      },
      {
        id: 'e-kannan',
        name: 'Kannan T',
        role: 'Cleaner',
        phone: '9447665544',
        salary: 10000,
        attendance: generateAttendance('avg'),
        advances: [{ id: uid(), date: makeIsoDate(2, 12), amount: 1500 }],
        ...defaultEmpFields,
        joinDate: '2023-01-05',
        access: 'staff',
      },
    ],
    leaves: [
      {
        id: 'lv1',
        empId: 'e-bindhu',
        from: dateKey(new Date(Date.now() + 172800000)),
        to: dateKey(new Date(Date.now() + 259200000)),
        days: 2,
        type: 'casual',
        reason: 'Daughter school admission',
        status: 'pending',
        requestedOn: makeIsoDate(0, 9),
      },
      {
        id: 'lv2',
        empId: 'e-ajith',
        from: dateKey(new Date(Date.now() + 432000000)),
        to: dateKey(new Date(Date.now() + 432000000)),
        days: 1,
        type: 'sick',
        reason: 'Dentist appointment',
        status: 'pending',
        requestedOn: makeIsoDate(1, 15),
      },
      {
        id: 'lv3',
        empId: 'e-shaji',
        from: dateKey(new Date(Date.now() - 691200000)),
        to: dateKey(new Date(Date.now() - 604800000)),
        days: 2,
        type: 'casual',
        reason: 'Family function at native place',
        status: 'approved',
        requestedOn: makeIsoDate(12, 10),
      },
    ],
    announcements: [
      {
        id: uid(),
        date: makeIsoDate(1, 9),
        title: 'Sabarimala season prep',
        body: 'Expect higher weekend occupancy from next week. Housekeeping to deep-clean all rooms by Friday; kitchen to stock extra provisions.',
        priority: 'important',
        author: 'Deepa (Owner)',
      },
      {
        id: uid(),
        date: makeIsoDate(3, 17),
        title: 'Staff meal timing change',
        body: 'Staff dinner moved to 6:30 PM so counters stay covered during evening rush.',
        priority: 'normal',
        author: 'Rajan (Manager)',
      },
    ],
    banks: [
      {
        id: 'bank-hdfc',
        name: 'HDFC Bank · Current A/c',
        accountNo: 'XXXX 4521',
        baseBalance: 185000,
      },
      {
        id: 'bank-sbi',
        name: 'SBI · Savings A/c',
        accountNo: 'XXXX 8890',
        baseBalance: 92000,
      },
    ],
    settings: {
      businessName: 'Deepa Restaurant & Tourist Home',
      place: 'Cherpulassery, Palakkad',
      gstin: '32AAXPD1234K1ZR',
      openingCash: 42000,
      pin: '1234',
      defaultBankId: defaultBankId,
      serverUrl: '',
      lastSyncedAt: '',
    },
  };
};
