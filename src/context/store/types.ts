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
  attachments?: AttachmentMeta[];
  userId?: string;
  userName?: string;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  uri: string;
  size?: number;
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

export interface BankStatementRow {
  id: string;
  date: string;
  description: string;
  refNo: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface BankStatement {
  id: string;
  importedAt: string;
  bankId: string;
  bankGuess: string;
  fileName: string;
  fromDate: string;
  toDate: string;
  totalCredit: number;
  totalDebit: number;
  openingBalance: number;
  closingBalance: number;
  rows: BankStatementRow[];
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
  serverUrl?: string;
  lastSyncedAt?: string;
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
  sales: Sale[];
  txns: Txn[];
  bankMoves: BankMove[];
  bankStatements: BankStatement[];
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
  users: User[];
  auditLog: AuditEvent[];
  settings: GeneralSettings;
}

export interface User {
  id: string;
  name: string;
  role: string;
  pin: string;
  active: boolean;
  createdAt: string;
}

export type Action =
  | { type: 'HYDRATE'; state: Partial<GlobalState> }
  | { type: 'ADD_SALE'; sale: Sale }
  | { type: 'ADD_TXN'; txn: Txn }
  | { type: 'PAY_SALARIES'; txn: Txn }
  | { type: 'ADD_BANK_MOVE'; move: BankMove }
  | { type: 'ADD_BANK_STATEMENT'; statement: BankStatement }
  | { type: 'REMOVE_BANK_STATEMENT'; statementId: string }
  | { type: 'CHECK_IN'; roomId: string; guest: Guest }
  | { type: 'CHECK_OUT'; roomId: string; stay: Stay; sale: Sale }
  | {
      type: 'SET_ROOM_STATUS';
      roomId: string;
      status: 'occupied' | 'vacant' | 'cleaning';
    }
  | { type: 'ADD_INV_ITEM'; item: InvItem }
  | { type: 'STOCK_MOVE'; move: StockMove }
  | { type: 'SELL_LIQUOR'; itemId: string; ml: number; sale: Sale }
  | { type: 'LIQUOR_PURCHASE'; itemId: string; bottles: number; txn?: Txn }
  | { type: 'LIQUOR_AUDIT'; audit: LiquorAudit }
  | { type: 'ADD_LIQUOR_ITEM'; item: LiquorItem }
  | { type: 'UPDATE_LIQUOR_ITEM'; item: LiquorItem }
  | { type: 'REMOVE_LIQUOR_ITEM'; itemId: string }
  | { type: 'ADD_CREDIT_ACCOUNT'; account: CreditAccount }
  | {
      type: 'CREDIT_ENTRY';
      accountId: string;
      entry: CreditHistoryItem;
      cashEffect?: Txn;
    }
  | { type: 'ADD_EMPLOYEE'; emp: Employee }
  | { type: 'UPDATE_EMPLOYEE'; emp: Employee }
  | {
      type: 'MARK_ATTENDANCE';
      empId: string;
      day: string;
      status: 'P' | 'H' | 'A' | 'L';
    }
  | {
      type: 'BULK_ATTENDANCE';
      empIds: string[];
      day: string;
      status: 'P' | 'H' | 'A' | 'L';
    }
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
