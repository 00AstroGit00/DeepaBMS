import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { keyOf, todayKey, uid } from '../utils/helpers';
import { User } from './AuthContext';

export interface Sale {
  id: string;
  date: string;
  dept: 'restaurant' | 'bar' | 'takeaway' | 'online' | 'rooms';
  description: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  mode: 'cash' | 'upi' | 'card' | 'bank';
  billNo?: string;
}

export interface Txn {
  id: string;
  date: string;
  kind: 'expense' | 'income';
  category: string;
  description: string;
  amount: number;
  mode: 'cash' | 'bank';
  bankId?: string;
  hasBill?: boolean;
}

export interface BankMove {
  id: string;
  date: string;
  kind: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  bankId: string;
  toBankId?: string;
  note: string;
}

export interface Guest {
  name: string;
  phone: string;
  idProof: string;
  adults: number;
  checkIn: string;
  advance: number;
}

export interface Room {
  id: string;
  no: string;
  category: string;
  rate: number;
  status: 'occupied' | 'vacant' | 'cleaning';
  guest?: Guest;
}

export interface Stay {
  id: string;
  roomNo: string;
  category: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amount: number;
  mode: string;
}

export interface InvItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  reorder: number;
  cost: number;
}

export interface StockMove {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  kind: 'in' | 'out' | 'wastage';
  qty: number;
  note: string;
}

export interface LiquorItem {
  id: string;
  brand: string;
  type: string;
  sizeML: number;
  fullBottles: number;
  looseML: number;
  costPerBottle: number;
  pricePerPeg: number;
  pricePerBottle: number;
}

export interface LiquorAudit {
  id: string;
  date: string;
  brand: string;
  sizeML: number;
  expectedBottles: number;
  expectedLooseML: number;
  actualBottles: number;
  actualLooseML: number;
  differenceML: number;
  auditor: string;
}

export interface CreditHistoryItem {
  id: string;
  date: string;
  kind: 'credit' | 'payment';
  amount: number;
  note: string;
}

export interface CreditAccount {
  id: string;
  name: string;
  phone: string;
  gstin?: string;
  type: 'customer' | 'vendor';
  balance: number;
  history: CreditHistoryItem[];
}

export interface EmployeeReview {
  id: string;
  date: string;
  rating: number;
  strengths: string;
  improvements: string;
  reviewer: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  kind: string;
  uri: string;
  category: string;
  addedOn: string;
}

export interface EmployeeAdvance {
  id: string;
  date: string;
  amount: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  salary: number;
  attendance: Record<string, 'P' | 'H' | 'A' | 'L'>;
  advances: EmployeeAdvance[];
  status: 'active' | 'inactive';
  joinDate: string;
  access: 'staff' | 'manager' | 'owner';
  leaveBalance: {
    casual: number;
    sick: number;
  };
  reviews: EmployeeReview[];
  documents: EmployeeDocument[];
}

export interface LeaveRequest {
  id: string;
  empId: string;
  from: string;
  to: string;
  days: number;
  type: 'casual' | 'sick' | 'paid' | 'unpaid';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedOn: string;
}

export interface Announcement {
  id: string;
  date: string;
  title: string;
  body: string;
  priority: 'normal' | 'important';
  author: string;
}

export interface BankAccount {
  id: string;
  name: string;
  accountNo: string;
  baseBalance: number;
}

export interface GeneralSettings {
  businessName: string;
  place: string;
  gstin: string;
  openingCash: number;
  pin: string;
  defaultBankId: string;
}

export interface AuditEvent {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string;
}

export interface GlobalState {
  ready: boolean;
  users: User[];
  auditLog: AuditEvent[];
  sales: Sale[];
  txns: Txn[];
  bankMoves: BankMove[];
  rooms: Room[];
  stays: Stay[];
  inventory: InvItem[];
  stockMoves: StockMove[];
  liquor: LiquorItem[];
  liquorAudits: LiquorAudit[];
  credits: CreditAccount[];
  employees: Employee[];
  leaves: LeaveRequest[];
  announcements: Announcement[];
  banks: BankAccount[];
  settings: GeneralSettings;
}

export type Action =
  | { type: 'HYDRATE'; state: Partial<GlobalState> }
  | { type: 'ADD_SALE'; sale: Sale }
  | { type: 'ADD_TXN'; txn: Txn }
  | { type: 'PAY_SALARIES'; txn: Txn }
  | { type: 'ADD_BANK_MOVE'; move: BankMove }
  | { type: 'CHECK_IN'; roomId: string; guest: Guest }
  | { type: 'CHECK_OUT'; roomId: string; stay: Stay; sale: Sale }
  | { type: 'SET_ROOM_STATUS'; roomId: string; status: 'occupied' | 'vacant' | 'cleaning' }
  | { type: 'ADD_INV_ITEM'; item: InvItem }
  | { type: 'STOCK_MOVE'; move: StockMove }
  | { type: 'SELL_LIQUOR'; itemId: string; ml: number; sale: Sale }
  | { type: 'LIQUOR_PURCHASE'; itemId: string; bottles: number; txn?: Txn }
  | { type: 'LIQUOR_AUDIT'; audit: LiquorAudit }
  | { type: 'ADD_LIQUOR_ITEM'; item: LiquorItem }
  | { type: 'UPDATE_LIQUOR_ITEM'; item: LiquorItem }
  | { type: 'REMOVE_LIQUOR_ITEM'; itemId: string }
  | { type: 'ADD_CREDIT_ACCOUNT'; account: CreditAccount }
  | { type: 'CREDIT_ENTRY'; accountId: string; entry: CreditHistoryItem; cashEffect?: Txn }
  | { type: 'ADD_EMPLOYEE'; emp: Employee }
  | { type: 'UPDATE_EMPLOYEE'; emp: Employee }
  | { type: 'MARK_ATTENDANCE'; empId: string; day: string; status: 'P' | 'H' | 'A' | 'L' }
  | { type: 'BULK_ATTENDANCE'; empIds: string[]; day: string; status: 'P' | 'H' | 'A' | 'L' }
  | { type: 'ADD_ADVANCE'; empId: string; amount: number; txn: Txn }
  | { type: 'REQUEST_LEAVE'; leave: LeaveRequest }
  | { type: 'DECIDE_LEAVE'; leaveId: string; status: 'approved' | 'rejected' }
  | { type: 'ADD_REVIEW'; empId: string; review: EmployeeReview }
  | { type: 'ADD_EMP_DOC'; empId: string; doc: EmployeeDocument }
  | { type: 'REMOVE_EMP_DOC'; empId: string; docId: string }
  | { type: 'ADD_ANNOUNCEMENT'; announcement: Announcement }
  | { type: 'REMOVE_ANNOUNCEMENT'; id: string }
  | { type: 'SET_PIN'; pin: string }
  | { type: 'ADD_USER'; user: User }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'REMOVE_USER'; userId: string }
  | { type: 'AUDIT'; event: AuditEvent }
  | { type: 'RESET_DEMO' };

const STORAGE_KEY = 'deepa-bms-v4';

// Deterministic seed builder
export const buildSeed = (): GlobalState => {
  let lcgSeed = 42;
  const nextRandom = (): number => {
    lcgSeed = (16807 * lcgSeed) % 2147483647;
    return lcgSeed / 2147483647;
  };
  const selectRandom = <T,>(arr: T[]): T => arr[Math.floor(nextRandom() * arr.length)];
  const randomRange = (min: number, max: number): number => Math.round(min + nextRandom() * (max - min));
  const makeIsoDate = (daysAgo: number, hour: number, minute: number = 0): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const defaultBankId = 'bank-hdfc';
  const salesList: Sale[] = [];
  const txnsList: Txn[] = [];

  const restaurantDesc = ['Lunch meals x12', 'Biriyani orders', 'Dinner service', 'Breakfast + tea', 'Family lunch party', 'Evening snacks & tea'];
  const barDesc = ['Bar counter sales', 'Peg sales - evening', 'Beer & pegs', 'Bar table service'];
  const takeawayDesc = ['Parcel biriyani', 'Takeaway meals', 'Parcel counter'];
  const onlineDesc = ['Swiggy orders', 'Zomato orders'];
  const paymentModes = ['cash', 'cash', 'cash', 'upi', 'upi', 'card'];

  for (let i = 34; i >= 0; i--) {
    const weekendMultiplier = new Date(Date.now() - 86400000 * i).getDay() % 6 === 0 ? 1.35 : 1;
    const isToday = i === 0;
    const resBillCount = isToday ? 2 : randomRange(2, 3);

    // 1. Restaurant Sales
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
        billNo: `R${3400 + 7 * i + j}`
      });
    }

    // 2. Bar Sales (Kerala 10% TOT applies on bar sales; wait, GST rate is 0% on alcohol, tax is calculated separately in registers)
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
        billNo: `B${2100 + 4 * i + j}`
      });
    }

    // 3. Takeaway Sales
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
        mode: selectRandom(paymentModes) as any
      });
    }

    // 4. Online Delivery
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
        mode: 'bank'
      });
    }

    // 5. Rooms sales
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
        mode: selectRandom(['cash', 'upi', 'card']) as any
      });
    }

    // Expenses
    const categories = [
      ['Provisions', 'Vegetables & provisions - market', 800, 2600],
      ['Meat & Fish', 'Chicken / fish purchase', 1200, 3500],
      ['LPG & Fuel', 'Commercial LPG cylinder', 0, 0],
      ['Electricity', 'KSEB bill', 0, 0],
      ['Maintenance', 'Plumbing / repairs', 300, 1500],
      ['Staff Welfare', 'Staff tea & food', 150, 450]
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
          hasBill: nextRandom() > 0.4
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
        hasBill: true
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
        hasBill: true
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
        hasBill: true
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
        bankId: defaultBankId
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
        mode: 'cash'
      });
    }
  }

  // Attendance builder for employees
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
    documents: []
  };

  return {
    ready: true,
    users: [
      { id: 'u-owner', name: 'Deepa (Owner)', role: 'owner', pin: '1234', active: true, createdAt: new Date().toISOString() },
      { id: 'u-manager', name: 'Rajan (Manager)', role: 'manager', pin: '2345', active: true, createdAt: new Date().toISOString() },
      { id: 'u-cashier', name: 'Sreeja (Cashier)', role: 'cashier', pin: '3456', active: true, createdAt: new Date().toISOString() },
      { id: 'u-reception', name: 'Anitha (Reception)', role: 'reception', pin: '4567', active: true, createdAt: new Date().toISOString() },
      { id: 'u-fnb', name: 'Vinod (F&B Manager)', role: 'fnb', pin: '5678', active: true, createdAt: new Date().toISOString() },
      { id: 'u-bar', name: 'Manoj (Bar Counter)', role: 'barstaff', pin: '6789', active: true, createdAt: new Date().toISOString() }
    ],
    auditLog: [],
    sales: salesList,
    txns: txnsList,
    bankMoves: [
      { id: uid(), date: makeIsoDate(8, 16), kind: 'deposit', amount: 25000, bankId: defaultBankId, note: 'Weekly cash deposit' },
      { id: uid(), date: makeIsoDate(3, 16), kind: 'deposit', amount: 30000, bankId: defaultBankId, note: 'Cash deposit' },
      { id: uid(), date: makeIsoDate(12, 11), kind: 'withdraw', bankId: 'bank-sbi', amount: 10000, note: 'Petty cash withdrawal' }
    ],
    rooms: [
      {
        id: 'r101',
        no: '101',
        category: 'Standard Non-AC',
        rate: 1200,
        status: 'occupied',
        guest: { name: 'Suresh Menon', phone: '9847012345', idProof: 'Aadhaar 4432', adults: 2, checkIn: makeIsoDate(1, 14), advance: 1000 }
      },
      { id: 'r102', no: '102', category: 'Standard Non-AC', rate: 1200, status: 'vacant' },
      { id: 'r103', no: '103', category: 'Standard Non-AC', rate: 1200, status: 'cleaning' },
      { id: 'r104', no: '104', category: 'Standard Non-AC', rate: 1200, status: 'vacant' },
      {
        id: 'r201',
        no: '201',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'occupied',
        guest: { name: 'Anand Krishnan', phone: '9995512340', idProof: 'DL KL-09', adults: 1, checkIn: makeIsoDate(0, 10), advance: 1800 }
      },
      { id: 'r202', no: '202', category: 'Deluxe AC', rate: 1800, status: 'vacant' },
      {
        id: 'r203',
        no: '203',
        category: 'Deluxe AC',
        rate: 1800,
        status: 'occupied',
        guest: { name: 'Fathima Rasheed', phone: '9744887766', idProof: 'Aadhaar 8811', adults: 3, checkIn: makeIsoDate(2, 12), advance: 2000 }
      },
      { id: 'r204', no: '204', category: 'Deluxe AC', rate: 1800, status: 'vacant' },
      { id: 'r301', no: '301', category: 'Suite AC', rate: 2800, status: 'vacant' },
      {
        id: 'r302',
        no: '302',
        category: 'Suite AC',
        rate: 2800,
        status: 'occupied',
        guest: { name: 'Rajesh & family', phone: '9633445566', idProof: 'Aadhaar 2210', adults: 4, checkIn: makeIsoDate(1, 13), advance: 3000 }
      }
    ],
    stays: [
      { id: uid(), roomNo: '201', category: 'Deluxe AC', guestName: 'Vipin Das', phone: '9856012233', checkIn: makeIsoDate(5, 13), checkOut: makeIsoDate(3, 11), nights: 2, amount: 4032, mode: 'upi' },
      { id: uid(), roomNo: '104', category: 'Standard Non-AC', guestName: 'Mary Joseph', phone: '9447110022', checkIn: makeIsoDate(4, 15), checkOut: makeIsoDate(2, 10), nights: 2, amount: 2688, mode: 'cash' },
      { id: uid(), roomNo: '301', category: 'Suite AC', guestName: 'Dr. Hameed', phone: '9895667788', checkIn: makeIsoDate(3, 12), checkOut: makeIsoDate(1, 11), nights: 2, amount: 6272, mode: 'card' }
    ],
    inventory: [
      { id: uid(), name: 'Rice (Matta)', category: 'food', unit: 'kg', stock: 85, reorder: 50, cost: 55 },
      { id: uid(), name: 'Chicken', category: 'food', unit: 'kg', stock: 12, reorder: 15, cost: 210 },
      { id: uid(), name: 'Cooking Oil', category: 'food', unit: 'L', stock: 28, reorder: 20, cost: 140 },
      { id: uid(), name: 'Onion', category: 'food', unit: 'kg', stock: 22, reorder: 25, cost: 38 },
      { id: uid(), name: 'Coconut', category: 'food', unit: 'pc', stock: 60, reorder: 40, cost: 32 },
      { id: uid(), name: 'Pepsi 750ml', category: 'softdrink', unit: 'btl', stock: 48, reorder: 24, cost: 35 },
      { id: uid(), name: 'Soda 300ml', category: 'softdrink', unit: 'btl', stock: 96, reorder: 48, cost: 12 },
      { id: uid(), name: 'Mineral Water 1L', category: 'softdrink', unit: 'btl', stock: 18, reorder: 36, cost: 15 },
      { id: uid(), name: 'LPG Cylinder 19kg', category: 'kitchen', unit: 'cyl', stock: 3, reorder: 2, cost: 1900 },
      { id: uid(), name: 'Bath Towels', category: 'housekeeping', unit: 'pc', stock: 34, reorder: 20, cost: 180 },
      { id: uid(), name: 'Bedsheets', category: 'housekeeping', unit: 'set', stock: 26, reorder: 15, cost: 420 },
      { id: uid(), name: 'Toilet Soap', category: 'housekeeping', unit: 'pc', stock: 14, reorder: 30, cost: 8 },
      { id: uid(), name: 'Phenyl 5L', category: 'consumable', unit: 'can', stock: 6, reorder: 4, cost: 260 },
      { id: uid(), name: 'Tissue Rolls', category: 'consumable', unit: 'pc', stock: 40, reorder: 24, cost: 22 }
    ],
    stockMoves: [
      { id: uid(), date: makeIsoDate(1, 9), itemId: '', itemName: 'Chicken', kind: 'in', qty: 20, note: 'Market purchase' },
      { id: uid(), date: makeIsoDate(0, 9), itemId: '', itemName: 'Chicken', kind: 'out', qty: 8, note: 'Kitchen issue' },
      { id: uid(), date: makeIsoDate(0, 10), itemId: '', itemName: 'Onion', kind: 'wastage', qty: 2, note: 'Spoiled stock' }
    ],
    liquor: [
      { id: uid(), brand: "McDowell's No.1", type: 'Whisky', sizeML: 750, fullBottles: 14, looseML: 480, costPerBottle: 780, pricePerPeg: 140, pricePerBottle: 1450 },
      { id: uid(), brand: 'Old Monk', type: 'Rum', sizeML: 750, fullBottles: 18, looseML: 300, costPerBottle: 520, pricePerPeg: 100, pricePerBottle: 980 },
      { id: uid(), brand: 'Honey Bee', type: 'Brandy', sizeML: 750, fullBottles: 11, looseML: 620, costPerBottle: 560, pricePerPeg: 110, pricePerBottle: 1050 },
      { id: uid(), brand: 'Magic Moments', type: 'Vodka', sizeML: 750, fullBottles: 6, looseML: 150, costPerBottle: 650, pricePerPeg: 120, pricePerBottle: 1200 },
      { id: uid(), brand: 'Kingfisher Premium', type: 'Beer', sizeML: 650, fullBottles: 52, looseML: 0, costPerBottle: 130, pricePerPeg: 0, pricePerBottle: 220 },
      { id: uid(), brand: 'Tuborg Strong', type: 'Beer', sizeML: 650, fullBottles: 8, looseML: 0, costPerBottle: 125, pricePerPeg: 0, pricePerBottle: 210 }
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
          { id: uid(), date: makeIsoDate(9, 13), kind: 'credit', amount: 1850, note: 'Lunch parcels - stand' },
          { id: uid(), date: makeIsoDate(4, 13), kind: 'credit', amount: 2600, note: 'Meals credit' },
          { id: uid(), date: makeIsoDate(2, 18), kind: 'payment', amount: 1000, note: 'Part payment - cash' }
        ]
      },
      {
        id: 'c2',
        name: 'PWD Site Contractor',
        phone: '9995001122',
        type: 'customer',
        balance: 8200,
        history: [
          { id: uid(), date: makeIsoDate(12, 13), kind: 'credit', amount: 5200, note: 'Workers lunch - 15 days' },
          { id: uid(), date: makeIsoDate(5, 13), kind: 'credit', amount: 3000, note: 'Meals credit' }
        ]
      },
      {
        id: 'v1',
        name: 'Kerala Beverages Co (BEVCO)',
        phone: '04662280000',
        type: 'vendor',
        gstin: '32AABCK1234F1Z5',
        balance: 0,
        history: [
          { id: uid(), date: makeIsoDate(15, 11), kind: 'credit', amount: 28600, note: 'Invoice #KL8821' },
          { id: uid(), date: makeIsoDate(15, 11), kind: 'payment', amount: 28600, note: 'Paid via bank' }
        ]
      },
      {
        id: 'v2',
        name: 'Palakkad Poultry Farm',
        phone: '9447889900',
        type: 'vendor',
        balance: 12400,
        history: [
          { id: uid(), date: makeIsoDate(10, 9), kind: 'credit', amount: 8400, note: 'Chicken supply - weekly' },
          { id: uid(), date: makeIsoDate(3, 9), kind: 'credit', amount: 6000, note: 'Chicken supply' },
          { id: uid(), date: makeIsoDate(1, 17), kind: 'payment', amount: 2000, note: 'Part payment' }
        ]
      },
      {
        id: 'v3',
        name: 'Cherpulassery Provision Store',
        phone: '9605334455',
        type: 'vendor',
        gstin: '32AAGFC9988B1ZQ',
        balance: 5750,
        history: [
          { id: uid(), date: makeIsoDate(7, 10), kind: 'credit', amount: 5750, note: 'Monthly provisions bill' }
        ]
      }
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
            strengths: 'Consistent food quality; leads the kitchen well during rush hours',
            improvements: 'Delegate prep work more to reduce overtime',
            reviewer: 'Rajan (Manager)'
          }
        ]
      },
      { id: 'e-shaji', name: 'Shaji P', role: 'Cook', phone: '9946112233', salary: 16000, attendance: generateAttendance('good'), advances: [], ...defaultEmpFields, joinDate: '2021-08-15', access: 'staff' },
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
            reviewer: 'Deepa (Owner)'
          }
        ]
      },
      { id: 'e-bindhu', name: 'Bindhu K', role: 'Housekeeping', phone: '9744001122', salary: 11000, attendance: generateAttendance('avg'), advances: [], ...defaultEmpFields, joinDate: '2022-02-10', access: 'staff', leaveBalance: { casual: 4, sick: 5 } },
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
            reviewer: 'Rajan (Manager)'
          }
        ]
      },
      { id: 'e-sreeja', name: 'Sreeja M', role: 'Reception', phone: '9633778899', salary: 14000, attendance: generateAttendance('good'), advances: [], ...defaultEmpFields, joinDate: '2020-01-20', access: 'manager' },
      { id: 'e-kannan', name: 'Kannan T', role: 'Cleaner', phone: '9447665544', salary: 10000, attendance: generateAttendance('avg'), advances: [{ id: uid(), date: makeIsoDate(2, 12), amount: 1500 }], ...defaultEmpFields, joinDate: '2023-01-05', access: 'staff' }
    ],
    leaves: [
      { id: 'lv1', empId: 'e-bindhu', from: dateKey(new Date(Date.now() + 172800000)), to: dateKey(new Date(Date.now() + 259200000)), days: 2, type: 'casual', reason: 'Daughter school admission', status: 'pending', requestedOn: makeIsoDate(0, 9) },
      { id: 'lv2', empId: 'e-ajith', from: dateKey(new Date(Date.now() + 432000000)), to: dateKey(new Date(Date.now() + 432000000)), days: 1, type: 'sick', reason: 'Dentist appointment', status: 'pending', requestedOn: makeIsoDate(1, 15) },
      { id: 'lv3', empId: 'e-shaji', from: dateKey(new Date(Date.now() - 691200000)), to: dateKey(new Date(Date.now() - 604800000)), days: 2, type: 'casual', reason: 'Family function at native place', status: 'approved', requestedOn: makeIsoDate(12, 10) }
    ],
    announcements: [
      { id: uid(), date: makeIsoDate(1, 9), title: 'Sabarimala season prep', body: 'Expect higher weekend occupancy from next week. Housekeeping to deep-clean all rooms by Friday; kitchen to stock extra provisions.', priority: 'important', author: 'Deepa (Owner)' },
      { id: uid(), date: makeIsoDate(3, 17), title: 'Staff meal timing change', body: 'Staff dinner moved to 6:30 PM so counters stay covered during evening rush.', priority: 'normal', author: 'Rajan (Manager)' }
    ],
    banks: [
      { id: 'bank-hdfc', name: 'HDFC Bank · Current A/c', accountNo: 'XXXX 4521', baseBalance: 185000 },
      { id: 'bank-sbi', name: 'SBI · Savings A/c', accountNo: 'XXXX 8890', baseBalance: 92000 }
    ],
    settings: {
      businessName: 'Deepa Restaurant & Tourist Home',
      place: 'Cherpulassery, Palakkad',
      gstin: '32AAXPD1234K1ZR',
      openingCash: 42000,
      pin: '1234',
      defaultBankId: defaultBankId
    }
  };
};

const initialState: GlobalState = {
  ...buildSeed(),
  ready: false
};

export function reducer(state: GlobalState, action: Action): GlobalState {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        ...action.state,
        ready: true
      };

    case 'ADD_SALE':
      return {
        ...state,
        sales: [action.sale, ...state.sales]
      };

    case 'ADD_TXN':
    case 'PAY_SALARIES':
      return {
        ...state,
        txns: [action.txn, ...state.txns]
      };

    case 'ADD_BANK_MOVE':
      return {
        ...state,
        bankMoves: [action.move, ...state.bankMoves]
      };

    case 'CHECK_IN':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'occupied', guest: action.guest }
            : r
        )
      };

    case 'CHECK_OUT':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'cleaning', guest: undefined }
            : r
        ),
        stays: [action.stay, ...state.stays],
        sales: [action.sale, ...state.sales]
      };

    case 'SET_ROOM_STATUS':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: action.status }
            : r
        )
      };

    case 'ADD_INV_ITEM':
      return {
        ...state,
        inventory: [action.item, ...state.inventory]
      };

    case 'STOCK_MOVE': {
      const diff = action.move.kind === 'in' ? action.move.qty : -action.move.qty;
      return {
        ...state,
        inventory: state.inventory.map((item) =>
          item.id === action.move.itemId
            ? { ...item, stock: Math.max(0, item.stock + diff) }
            : item
        ),
        stockMoves: [action.move, ...state.stockMoves]
      };
    }

    case 'SELL_LIQUOR': {
      const updatedLiquor = state.liquor.map((item) => {
        if (item.id !== action.itemId) return item;
        let currentML = item.fullBottles * item.sizeML + item.looseML - action.ml;
        if (currentML < 0) currentML = 0;
        return {
          ...item,
          fullBottles: Math.floor(currentML / item.sizeML),
          looseML: currentML % item.sizeML
        };
      });
      return {
        ...state,
        liquor: updatedLiquor,
        sales: [action.sale, ...state.sales]
      };
    }

    case 'LIQUOR_PURCHASE': {
      return {
        ...state,
        liquor: state.liquor.map((item) =>
          item.id === action.itemId
            ? { ...item, fullBottles: item.fullBottles + action.bottles }
            : item
        ),
        txns: action.txn ? [action.txn, ...state.txns] : state.txns
      };
    }

    case 'LIQUOR_AUDIT':
      return {
        ...state,
        liquorAudits: [action.audit, ...state.liquorAudits]
      };

    case 'ADD_LIQUOR_ITEM':
      return {
        ...state,
        liquor: [action.item, ...state.liquor]
      };

    case 'UPDATE_LIQUOR_ITEM':
      return {
        ...state,
        liquor: state.liquor.map((l) => (l.id === action.item.id ? action.item : l))
      };

    case 'REMOVE_LIQUOR_ITEM':
      return {
        ...state,
        liquor: state.liquor.filter((l) => l.id !== action.itemId)
      };

    case 'ADD_CREDIT_ACCOUNT':
      return {
        ...state,
        credits: [action.account, ...state.credits]
      };

    case 'CREDIT_ENTRY': {
      const diff = action.entry.kind === 'credit' ? action.entry.amount : -action.entry.amount;
      return {
        ...state,
        credits: state.credits.map((c) =>
          c.id === action.accountId
            ? { ...c, balance: Math.max(0, c.balance + diff), history: [action.entry, ...c.history] }
            : c
        ),
        txns: action.cashEffect ? [action.cashEffect, ...state.txns] : state.txns
      };
    }

    case 'ADD_EMPLOYEE':
      return {
        ...state,
        employees: [action.emp, ...state.employees]
      };

    case 'UPDATE_EMPLOYEE':
      return {
        ...state,
        employees: state.employees.map((e) => (e.id === action.emp.id ? action.emp : e))
      };

    case 'MARK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, attendance: { ...e.attendance, [action.day]: action.status } }
            : e
        )
      };

    case 'BULK_ATTENDANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          action.empIds.includes(e.id)
            ? { ...e, attendance: { ...e.attendance, [action.day]: action.status } }
            : e
        )
      };

    case 'ADD_ADVANCE':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? {
                ...e,
                advances: [{ id: uid(), date: action.txn.date, amount: action.amount }, ...e.advances]
              }
            : e
        ),
        txns: [action.txn, ...state.txns]
      };

    case 'REQUEST_LEAVE':
      return {
        ...state,
        leaves: [action.leave, ...state.leaves]
      };

    case 'DECIDE_LEAVE': {
      const leave = state.leaves.find((l) => l.id === action.leaveId);
      if (!leave) return state;

      let updatedEmployees = state.employees;
      if (action.status === 'approved') {
        updatedEmployees = state.employees.map((emp) => {
          if (emp.id !== leave.empId) return emp;

          const updatedAttendance = { ...emp.attendance };
          const fromDate = new Date(leave.from + 'T12:00:00');
          const toDate = new Date(leave.to + 'T12:00:00');
          let safety = 0;

          while (fromDate <= toDate && safety < 62) {
            const dateStr = dateKey(fromDate);
            updatedAttendance[dateStr] = 'L';
            fromDate.setDate(fromDate.getDate() + 1);
            safety++;
          }

          const updatedBalance = { ...emp.leaveBalance };
          if (leave.type === 'casual') {
            updatedBalance.casual = Math.max(0, updatedBalance.casual - leave.days);
          } else if (leave.type === 'sick') {
            updatedBalance.sick = Math.max(0, updatedBalance.sick - leave.days);
          }

          return {
            ...emp,
            attendance: updatedAttendance,
            leaveBalance: updatedBalance
          };
        });
      }

      return {
        ...state,
        employees: updatedEmployees,
        leaves: state.leaves.map((l) =>
          l.id === action.leaveId ? { ...l, status: action.status } : l
        )
      };
    }

    case 'ADD_REVIEW':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, reviews: [action.review, ...e.reviews] }
            : e
        )
      };

    case 'ADD_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, documents: [action.doc, ...e.documents] }
            : e
        )
      };

    case 'REMOVE_EMP_DOC':
      return {
        ...state,
        employees: state.employees.map((e) =>
          e.id === action.empId
            ? { ...e, documents: e.documents.filter((d) => d.id !== action.docId) }
            : e
        )
      };

    case 'ADD_ANNOUNCEMENT':
      return {
        ...state,
        announcements: [action.announcement, ...state.announcements]
      };

    case 'REMOVE_ANNOUNCEMENT':
      return {
        ...state,
        announcements: state.announcements.filter((a) => a.id !== action.id)
      };

    case 'SET_PIN':
      return {
        ...state,
        settings: { ...state.settings, pin: action.pin }
      };

    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.user]
      };

    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.user.id ? action.user : u))
      };

    case 'REMOVE_USER':
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.userId)
      };

    case 'AUDIT':
      return {
        ...state,
        auditLog: [action.event, ...state.auditLog].slice(0, 500)
      };

    case 'RESET_DEMO':
      return buildSeed();

    default:
      return state;
  }
}

// Selectors
export interface DayFinance {
  revenue: number;
  restaurant: number;
  bar: number;
  rooms: number;
  takeaway: number;
  online: number;
  expenses: number;
  purchases: number;
  otherIncome: number;
  profit: number;
  gstCollected: number;
}

export const financeForDay = (state: GlobalState, day: string): DayFinance => {
  const data: DayFinance = {
    revenue: 0,
    restaurant: 0,
    bar: 0,
    rooms: 0,
    takeaway: 0,
    online: 0,
    expenses: 0,
    purchases: 0,
    otherIncome: 0,
    profit: 0,
    gstCollected: 0
  };

  state.sales.forEach((s) => {
    if (keyOf(s.date) === day) {
      data.revenue += s.total;
      data.gstCollected += s.gstAmount;
      if (s.dept in data) {
        (data as any)[s.dept] += s.total;
      }
    }
  });

  state.txns.forEach((t) => {
    if (keyOf(t.date) === day) {
      if (t.kind === 'expense') {
        data.expenses += t.amount;
        if (['Provisions', 'Meat & Fish', 'Liquor Purchase', 'Soft Drinks Purchase'].includes(t.category)) {
          data.purchases += t.amount;
        }
      } else {
        data.otherIncome += t.amount;
      }
    }
  });

  data.profit = data.revenue + data.otherIncome - data.expenses;
  return data;
};

export const financeForMonth = (state: GlobalState): DayFinance => {
  const currentMonthPrefix = todayKey().slice(0, 7); // e.g. "2026-07"
  const data: DayFinance = {
    revenue: 0,
    restaurant: 0,
    bar: 0,
    rooms: 0,
    takeaway: 0,
    online: 0,
    expenses: 0,
    purchases: 0,
    otherIncome: 0,
    profit: 0,
    gstCollected: 0
  };

  state.sales.forEach((s) => {
    if (keyOf(s.date).startsWith(currentMonthPrefix)) {
      data.revenue += s.total;
      data.gstCollected += s.gstAmount;
      if (s.dept in data) {
        (data as any)[s.dept] += s.total;
      }
    }
  });

  state.txns.forEach((t) => {
    if (keyOf(t.date).startsWith(currentMonthPrefix)) {
      if (t.kind === 'expense') {
        data.expenses += t.amount;
        if (['Provisions', 'Meat & Fish', 'Liquor Purchase', 'Soft Drinks Purchase'].includes(t.category)) {
          data.purchases += t.amount;
        }
      } else {
        data.otherIncome += t.amount;
      }
    }
  });

  data.profit = data.revenue + data.otherIncome - data.expenses;
  return data;
};

export const cashInHand = (state: GlobalState): number => {
  let cash = state.settings.openingCash;
  state.sales.forEach((s) => {
    if (s.mode === 'cash') cash += s.total;
  });
  state.txns.forEach((t) => {
    if (t.mode === 'cash') {
      cash += t.kind === 'income' ? t.amount : -t.amount;
    }
  });
  state.bankMoves.forEach((bm) => {
    if (bm.kind === 'deposit') cash -= bm.amount;
    if (bm.kind === 'withdraw') cash += bm.amount;
  });
  return cash;
};

export const bankBalance = (state: GlobalState, bankId?: string): number => {
  let bal = 0;
  state.banks.forEach((b) => {
    if (!bankId || b.id === bankId) bal += b.baseBalance;
  });

  const matchesBank = (id: string) => !bankId || id === bankId;

  state.sales.forEach((s) => {
    if (['upi', 'card', 'bank'].includes(s.mode) && matchesBank(state.settings.defaultBankId)) {
      bal += s.total;
    }
  });

  state.txns.forEach((t) => {
    const txnBankId = t.bankId || state.settings.defaultBankId;
    if (t.mode === 'bank' && matchesBank(txnBankId)) {
      bal += t.kind === 'income' ? t.amount : -t.amount;
    }
  });

  state.bankMoves.forEach((bm) => {
    if (bm.kind === 'deposit' && matchesBank(bm.bankId)) {
      bal += bm.amount;
    }
    if (bm.kind === 'withdraw' && matchesBank(bm.bankId)) {
      bal -= bm.amount;
    }
    if (bm.kind === 'transfer') {
      if (matchesBank(bm.bankId)) bal -= bm.amount;
      if (bm.toBankId && matchesBank(bm.toBankId)) bal += bm.amount;
    }
  });

  return bal;
};

export const customerOutstanding = (state: GlobalState): number => {
  return state.credits
    .filter((c) => c.type === 'customer')
    .reduce((sum, current) => sum + current.balance, 0);
};

export const vendorPayables = (state: GlobalState): number => {
  return state.credits
    .filter((c) => c.type === 'vendor')
    .reduce((sum, current) => sum + current.balance, 0);
};

export const lowStockItems = (state: GlobalState): InvItem[] => {
  return state.inventory.filter((item) => item.stock <= item.reorder);
};

export interface OccupancyStats {
  occupied: number;
  total: number;
  pct: number;
}

export const occupancy = (state: GlobalState): OccupancyStats => {
  const occupiedCount = state.rooms.filter((r) => r.status === 'occupied').length;
  const totalCount = state.rooms.length;
  return {
    occupied: occupiedCount,
    total: totalCount,
    pct: totalCount ? Math.round((occupiedCount / totalCount) * 100) : 0
  };
};

export const liquorStockValue = (state: GlobalState): number => {
  return state.liquor.reduce((sum, item) => {
    const qty = item.fullBottles + item.looseML / item.sizeML;
    return sum + qty * item.costPerBottle;
  }, 0);
};

export const inventoryValue = (state: GlobalState): number => {
  return state.inventory.reduce((sum, item) => sum + item.stock * item.cost, 0);
};

// Store context
export interface StoreContextType {
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType>({
  state: initialState,
  dispatch: () => {}
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isLoaded = useRef(false);

  // 1. Hydrate state
  useEffect(() => {
    (async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        if (value) {
          const parsed = JSON.parse(value);
          const freshSeed = buildSeed();
          // Fallback missing keys
          if (!parsed.users || parsed.users.length === 0) parsed.users = freshSeed.users;
          parsed.auditLog = parsed.auditLog || [];
          parsed.leaves = parsed.leaves || freshSeed.leaves;
          parsed.announcements = parsed.announcements || freshSeed.announcements;

          // Merge safety for new schema fields
          parsed.employees = (parsed.employees || freshSeed.employees).map((emp: any) => ({
            status: 'active',
            joinDate: '2022-01-01',
            access: 'staff',
            leaveBalance: { casual: 6, sick: 6 },
            reviews: [],
            documents: [],
            ...emp
          }));

          dispatch({ type: 'HYDRATE', state: parsed });
        } else {
          dispatch({ type: 'HYDRATE', state: buildSeed() });
        }
      } catch {
        dispatch({ type: 'HYDRATE', state: buildSeed() });
      } finally {
        isLoaded.current = true;
      }
    })();
  }, []);

  // 2. Persist state
  useEffect(() => {
    if (isLoaded.current && state.ready) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

// Small helper date Key function (matches format: yyyy-mm-dd)
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
