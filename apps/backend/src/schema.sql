-- Deepa BMS normalized relational database schema (SQLite / PostgreSQL compatible)

-- 1. Configuration & Settings
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(30) PRIMARY KEY,
  business_name VARCHAR(100) NOT NULL,
  gstin VARCHAR(15) NOT NULL,
  state_code VARCHAR(2) DEFAULT '32', -- 32 for Kerala
  tax_rate_rooms DECIMAL(5, 2) DEFAULT 5.0,
  tax_rate_food DECIMAL(5, 2) DEFAULT 5.0,
  tot_rate_liquor DECIMAL(5, 2) DEFAULT 10.0 -- Kerala Turnover Tax rate KGST
);

-- 2. Security & User Roster
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK(role IN ('owner', 'manager', 'cashier', 'reception', 'fnb', 'barstaff', 'accountant', 'employee')),
  pin_hash VARCHAR(100) NOT NULL, -- Scrypt/Bcrypt hashes
  employee_id VARCHAR(50) NULL,
  active BOOLEAN DEFAULT TRUE,
  force_password_change BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_audit_log (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Banking Contra Ledgers
CREATE TABLE IF NOT EXISTS bank_accounts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  balance DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS bank_moves (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  kind VARCHAR(10) NOT NULL CHECK(kind IN ('deposit', 'withdraw', 'transfer')),
  bank_id VARCHAR(50) NOT NULL,
  to_bank_id VARCHAR(50) NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK(amount > 0),
  note VARCHAR(255) NULL,
  FOREIGN KEY (bank_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (to_bank_id) REFERENCES bank_accounts(id)
);

-- 4. Sales Register
CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dept VARCHAR(15) NOT NULL CHECK(dept IN ('restaurant', 'bar', 'takeaway', 'online', 'rooms')),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) DEFAULT 0.00,
  gst_amount DECIMAL(12, 2) DEFAULT 0.00,
  total DECIMAL(12, 2) NOT NULL CHECK(total >= 0),
  mode VARCHAR(10) NOT NULL CHECK(mode IN ('cash', 'upi', 'card', 'bank')),
  bill_no VARCHAR(50) NULL,
  operator_id VARCHAR(50) NULL,
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 5. DayBook Transactions (Non-sales flows e.g., purchases/expenses)
CREATE TABLE IF NOT EXISTS txns (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  kind VARCHAR(10) NOT NULL CHECK(kind IN ('income', 'expense', 'purchase')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK(amount > 0),
  description VARCHAR(255) NOT NULL,
  bank_id VARCHAR(50) NULL,
  mode VARCHAR(10) NOT NULL CHECK(mode IN ('cash', 'upi', 'card', 'bank')),
  has_bill BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (bank_id) REFERENCES bank_accounts(id)
);

-- 6. Hotel Room Management
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(50) PRIMARY KEY,
  no VARCHAR(10) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL CHECK(rate >= 0),
  status VARCHAR(10) NOT NULL CHECK(status IN ('vacant', 'occupied', 'cleaning')),
  guest_name VARCHAR(100) NULL,
  guest_phone VARCHAR(20) NULL,
  guest_id_proof VARCHAR(100) NULL,
  guest_adults INT DEFAULT 1,
  guest_check_in TIMESTAMP NULL,
  guest_advance DECIMAL(10, 2) DEFAULT 0.00,
  guest_advance_mode VARCHAR(10) NULL
);

CREATE TABLE IF NOT EXISTS stays_archive (
  id VARCHAR(50) PRIMARY KEY,
  room_no VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  guest_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP NOT NULL,
  nights INT NOT NULL CHECK(nights >= 0),
  amount DECIMAL(12, 2) NOT NULL,
  mode VARCHAR(10) NOT NULL
);

-- 7. F&B Kitchen Inventory
-- Core inventory table (current state)
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL CHECK(category IN ('food', 'softdrink', 'kitchen', 'housekeeping', 'consumables', 'liquor', 'packaging', 'amenities')),
  unit VARCHAR(10) NOT NULL,
  stock DECIMAL(10, 2) DEFAULT 0.00,
  reserved_stock DECIMAL(10, 2) DEFAULT 0.00,
  min_stock DECIMAL(10, 2) DEFAULT 0.00,
  max_stock DECIMAL(10, 2) DEFAULT 0.00,
  reorder DECIMAL(10, 2) DEFAULT 0.00,
  reorder_qty DECIMAL(10, 2) DEFAULT 0.00,
  cost DECIMAL(10, 2) DEFAULT 0.00,
  cost_method VARCHAR(20) DEFAULT 'fifo',
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory movement ledger (append-only audit trail)
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id VARCHAR(50) PRIMARY KEY,
  item_id VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  kind VARCHAR(30) NOT NULL CHECK(kind IN (
    'purchase', 'sale', 'consumption', 'transfer_in', 'transfer_out',
    'adjustment', 'physical_count', 'damage', 'expiry', 'supplier_return',
    'customer_return', 'complimentary', 'opening_balance', 'closing_adjustment'
  )),
  quantity DECIMAL(10, 2) NOT NULL,
  quantity_before DECIMAL(10, 2) NOT NULL,
  quantity_after DECIMAL(10, 2) NOT NULL,
  unit_cost DECIMAL(12, 2) DEFAULT 0.00,
  total_cost DECIMAL(12, 2) DEFAULT 0.00,
  operator VARCHAR(100) NOT NULL,
  reference VARCHAR(100) NULL,
  reason VARCHAR(255) NULL,
  note VARCHAR(500) NULL,
  batch_id VARCHAR(50) NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ledger_item ON inventory_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_ledger_kind ON inventory_ledger(kind);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON inventory_ledger(timestamp);
CREATE INDEX IF NOT EXISTS idx_ledger_batch ON inventory_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active);

-- 8. Bar Liquor Management
CREATE TABLE IF NOT EXISTS liquor (
  id VARCHAR(50) PRIMARY KEY,
  brand VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK(category IN ('IMFL', 'Beer', 'Wine', 'Foreign')),
  size_ml INT NOT NULL CHECK(size_ml > 0),
  price_peg DECIMAL(10, 2) DEFAULT 0.00,
  price_bottle DECIMAL(10, 2) DEFAULT 0.00,
  cost_bottle DECIMAL(10, 2) DEFAULT 0.00,
  full_bottles INT DEFAULT 0,
  loose_ml INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS liquor_audits (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  brand VARCHAR(100) NOT NULL,
  size_ml INT NOT NULL,
  expected_bottles INT NOT NULL,
  expected_loose_ml INT NOT NULL,
  actual_bottles INT NOT NULL,
  actual_loose_ml INT NOT NULL,
  difference_ml INT NOT NULL,
  auditor VARCHAR(100) NOT NULL
);

-- 9. Credits & Payables Ledgers
CREATE TABLE IF NOT EXISTS credit_accounts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(10) NOT NULL CHECK(type IN ('customer', 'vendor')),
  balance DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id VARCHAR(50) PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL, -- positive for credit given, negative for settlement
  FOREIGN KEY (account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE
);

-- 10. Staff & Dynamic Payroll
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  salary DECIMAL(12, 2) NOT NULL CHECK(salary >= 0),
  status VARCHAR(10) DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  join_date DATE NOT NULL,
  access VARCHAR(10) DEFAULT 'staff' CHECK(access IN ('staff', 'manager', 'owner'))
);

CREATE TABLE IF NOT EXISTS employee_attendance (
  emp_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(1) NOT NULL CHECK(status IN ('P', 'H', 'A', 'L')),
  PRIMARY KEY (emp_id, date),
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_leaves (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK(type IN ('casual', 'sick', 'paid', 'unpaid')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INT NOT NULL CHECK(days > 0),
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(10) DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  requested_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_advances (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(10, 2) NOT NULL CHECK(amount > 0),
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_reviews (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rating INT NOT NULL CHECK(rating >= 1 AND rating <= 5),
  strengths VARCHAR(500) NOT NULL,
  improvements VARCHAR(500) DEFAULT '',
  reviewer VARCHAR(100) NOT NULL,
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id VARCHAR(50) PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  uri VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  added_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- 11. Indexes for Rapid Search Queries
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_dept ON sales(dept);
CREATE INDEX IF NOT EXISTS idx_txns_date ON txns(date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(date);
CREATE INDEX IF NOT EXISTS idx_leaves_emp ON employee_leaves(emp_id);
-- NOTE: inventory_moves table was superseded by inventory_ledger in P3-1
-- Legacy data migration: run INSERT INTO inventory_ledger SELECT * FROM inventory_moves if exists
CREATE INDEX IF NOT EXISTS idx_ledger_account ON credit_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON security_audit_log(date);

-- 12. Purchasing & Procurement (P3-2)
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  gstin VARCHAR(15),
  address TEXT,
  payment_terms VARCHAR(50) DEFAULT 'net30',
  credit_limit DECIMAL(12, 2) DEFAULT 0.00,
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  lead_time_days INT DEFAULT 7,
  rating DECIMAL(2, 1) DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY,
  po_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'submitted', 'approved', 'rejected', 'ordered', 'partially_received', 'received', 'invoiced', 'closed', 'cancelled', 'returned'
  )),
  order_date DATE NOT NULL,
  expected_date DATE,
  subtotal DECIMAL(12, 2) DEFAULT 0.00,
  freight DECIMAL(10, 2) DEFAULT 0.00,
  tax DECIMAL(10, 2) DEFAULT 0.00,
  discount DECIMAL(10, 2) DEFAULT 0.00,
  other_charges DECIMAL(10, 2) DEFAULT 0.00,
  total_cost DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(50),
  item_name VARCHAR(200) NOT NULL,
  category VARCHAR(30),
  unit VARCHAR(10) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK(quantity > 0),
  unit_cost DECIMAL(10, 2) NOT NULL CHECK(unit_cost >= 0),
  total_cost DECIMAL(12, 2) DEFAULT 0.00,
  received_qty DECIMAL(10, 2) DEFAULT 0.00,
  damaged_qty DECIMAL(10, 2) DEFAULT 0.00,
  rejected_qty DECIMAL(10, 2) DEFAULT 0.00,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK(action IN ('submitted', 'approved', 'rejected', 'ordered', 'cancelled', 'closed', 'returned')),
  approved_by VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL,
  comment TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) NOT NULL,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  received_date DATE NOT NULL,
  notes TEXT,
  received_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id)
);

CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id VARCHAR(50) PRIMARY KEY,
  receipt_id VARCHAR(50) NOT NULL,
  line_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(50),
  expected_qty DECIMAL(10, 2) NOT NULL,
  received_qty DECIMAL(10, 2) NOT NULL,
  damaged_qty DECIMAL(10, 2) DEFAULT 0.00,
  rejected_qty DECIMAL(10, 2) DEFAULT 0.00,
  unit_cost DECIMAL(10, 2) DEFAULT 0.00,
  landed_cost DECIMAL(12, 2) DEFAULT 0.00,
  FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (line_id) REFERENCES purchase_order_lines(id)
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) NOT NULL,
  receipt_id VARCHAR(50),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id)
);

CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id VARCHAR(50) PRIMARY KEY,
  invoice_id VARCHAR(50) NOT NULL,
  line_id VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (line_id) REFERENCES purchase_order_lines(id)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id VARCHAR(50) PRIMARY KEY,
  po_id VARCHAR(50) NOT NULL,
  receipt_id VARCHAR(50),
  return_number VARCHAR(50) NOT NULL UNIQUE,
  return_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  notes TEXT,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id)
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
  id VARCHAR(50) PRIMARY KEY,
  return_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(50),
  quantity DECIMAL(10, 2) NOT NULL CHECK(quantity > 0),
  unit_cost DECIMAL(10, 2) NOT NULL CHECK(unit_cost >= 0),
  total_cost DECIMAL(12, 2) DEFAULT 0.00,
  reason VARCHAR(255) NOT NULL,
  FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receiving_discrepancies (
  id VARCHAR(50) PRIMARY KEY,
  receipt_id VARCHAR(50) NOT NULL,
  line_id VARCHAR(50) NOT NULL,
  item_id VARCHAR(50),
  issue_type VARCHAR(20) NOT NULL CHECK(issue_type IN ('short', 'over', 'damaged', 'rejected', 'wrong_item')),
  expected_qty DECIMAL(10, 2) NOT NULL,
  actual_qty DECIMAL(10, 2) NOT NULL,
  difference DECIMAL(10, 2) NOT NULL,
  resolution VARCHAR(50) DEFAULT 'pending' CHECK(resolution IN ('pending', 'accepted', 'returned', 'credited', 'replaced')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (line_id) REFERENCES purchase_order_lines(id)
);

CREATE TABLE IF NOT EXISTS purchase_events (
  id VARCHAR(50) PRIMARY KEY,
  aggregate_type VARCHAR(30) NOT NULL,
  aggregate_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  data TEXT,
  created_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_pol_po ON purchase_order_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_grl_receipt ON goods_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_si_po ON supplier_invoices(po_id);
CREATE INDEX IF NOT EXISTS idx_si_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_pr_po ON purchase_returns(po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_supplier_preferred ON suppliers(is_preferred);
CREATE INDEX IF NOT EXISTS idx_pe_aggregate ON purchase_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_pe_event ON purchase_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pe_timestamp ON purchase_events(timestamp);

-- 13. Restaurant Order Management & Kitchen (KOT) Engine (P3-3)
CREATE TABLE IF NOT EXISTS dining_tables (
  id VARCHAR(50) PRIMARY KEY,
  table_no VARCHAR(10) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK(capacity > 0),
  area VARCHAR(30) DEFAULT 'main' CHECK(area IN ('main', 'terrace', 'vip', 'outdoor', 'private')),
  status VARCHAR(20) DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance')),
  pos_x DECIMAL(6, 2),
  pos_y DECIMAL(6, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK(price >= 0),
  unit VARCHAR(10) DEFAULT 'pc',
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500),
  preparation_time INT DEFAULT 10,
  course VARCHAR(20) DEFAULT 'main' CHECK(course IN ('starter', 'soup', 'salad', 'main', 'bread', 'rice', 'side', 'dessert', 'beverage')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(50) PRIMARY KEY,
  menu_item_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  yield_qty DECIMAL(10, 2) DEFAULT 1,
  yield_unit VARCHAR(10) DEFAULT 'pc',
  instructions TEXT,
  prep_time INT DEFAULT 0,
  cook_time INT DEFAULT 0,
  waste_factor DECIMAL(5, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id VARCHAR(50) PRIMARY KEY,
  recipe_id VARCHAR(50) NOT NULL,
  inventory_item_id VARCHAR(50),
  inventory_item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK(quantity > 0),
  unit VARCHAR(10) NOT NULL,
  waste_factor DECIMAL(5, 2) DEFAULT 0.00,
  is_alternative BOOLEAN DEFAULT FALSE,
  alternative_group VARCHAR(50),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory(id)
);

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dining_sessions (
  id VARCHAR(50) PRIMARY KEY,
  table_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50),
  guest_count INT DEFAULT 1,
  guest_name VARCHAR(100),
  phone VARCHAR(20),
  type VARCHAR(20) DEFAULT 'dine-in' CHECK(type IN ('dine-in', 'takeaway', 'delivery', 'room-service')),
  room_no VARCHAR(10),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (table_id) REFERENCES dining_tables(id)
);

CREATE TABLE IF NOT EXISTS restaurant_orders (
  id VARCHAR(50) PRIMARY KEY,
  order_no VARCHAR(30) NOT NULL UNIQUE,
  session_id VARCHAR(50),
  table_id VARCHAR(50),
  type VARCHAR(20) NOT NULL DEFAULT 'dine-in' CHECK(type IN ('dine-in', 'takeaway', 'delivery', 'room-service')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'open', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'paid', 'cancelled', 'voided', 'refunded'
  )),
  subtotal DECIMAL(12, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_reason VARCHAR(255),
  service_charge DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  guest_count INT DEFAULT 1,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES dining_sessions(id),
  FOREIGN KEY (table_id) REFERENCES dining_tables(id)
);

CREATE TABLE IF NOT EXISTS order_lines (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  menu_item_id VARCHAR(50) NOT NULL,
  menu_item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK(quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_reason VARCHAR(255),
  is_complimentary BOOLEAN DEFAULT FALSE,
  complimentary_reason VARCHAR(255),
  notes VARCHAR(500),
  course VARCHAR(20) DEFAULT 'main',
  status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'preparing', 'ready', 'served', 'cancelled', 'refunded')),
  kot_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE IF NOT EXISTS kot (
  id VARCHAR(50) PRIMARY KEY,
  kot_number VARCHAR(30) NOT NULL UNIQUE,
  order_id VARCHAR(50) NOT NULL,
  station_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'acknowledged', 'preparing', 'ready', 'served', 'cancelled')),
  priority INT DEFAULT 0,
  course VARCHAR(20) DEFAULT 'main',
  notes TEXT,
  created_by VARCHAR(100),
  printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id),
  FOREIGN KEY (station_id) REFERENCES kitchen_stations(id)
);

CREATE TABLE IF NOT EXISTS kot_items (
  id VARCHAR(50) PRIMARY KEY,
  kot_id VARCHAR(50) NOT NULL,
  order_line_id VARCHAR(50) NOT NULL,
  menu_item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  notes VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  FOREIGN KEY (kot_id) REFERENCES kot(id) ON DELETE CASCADE,
  FOREIGN KEY (order_line_id) REFERENCES order_lines(id)
);

CREATE TABLE IF NOT EXISTS bills (
  id VARCHAR(50) PRIMARY KEY,
  bill_number VARCHAR(30) NOT NULL UNIQUE,
  order_id VARCHAR(50) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  service_charge DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  rounding_adjustment DECIMAL(5, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'paid', 'partially_paid', 'cancelled', 'refunded')),
  notes TEXT,
  created_by VARCHAR(100),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(50) PRIMARY KEY,
  bill_id VARCHAR(50) NOT NULL,
  mode VARCHAR(15) NOT NULL CHECK(mode IN ('cash', 'upi', 'card', 'bank', 'credit', 'online', 'room_charge')),
  amount DECIMAL(12, 2) NOT NULL CHECK(amount > 0),
  reference VARCHAR(100),
  tip_amount DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  processed_by VARCHAR(100),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

CREATE TABLE IF NOT EXISTS order_events (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  data TEXT,
  created_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES restaurant_orders(id)
);

CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_recipe_menu ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_order_table ON restaurant_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_session ON restaurant_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON restaurant_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_date ON restaurant_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_no ON restaurant_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_ol_order ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_kot_order ON kot(order_id);
CREATE INDEX IF NOT EXISTS idx_kot_station ON kot(station_id);
CREATE INDEX IF NOT EXISTS idx_kot_status ON kot(status);
CREATE INDEX IF NOT EXISTS idx_ki_kot ON kot_items(kot_id);
CREATE INDEX IF NOT EXISTS idx_bill_order ON bills(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_session_table ON dining_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_session_active ON dining_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_oe_order ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_oe_event ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_table_status ON dining_tables(status);
CREATE INDEX IF NOT EXISTS idx_table_area ON dining_tables(area);

-- 14. Bar & Peg Management Engine (P3-4)
CREATE TABLE IF NOT EXISTS liquor_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE CHECK(name IN ('IMFL', 'Beer', 'Wine', 'Foreign', 'Country', 'Liqueur')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS liquor_brands (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(200) DEFAULT '',
  proof DECIMAL(5, 1) DEFAULT 0.0,
  country VARCHAR(100) DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES liquor_categories(id)
);

CREATE TABLE IF NOT EXISTS liquor_bottles (
  id VARCHAR(50) PRIMARY KEY,
  brand_id VARCHAR(50) NOT NULL,
  size_ml INT NOT NULL CHECK(size_ml > 0),
  batch_no VARCHAR(100) DEFAULT '',
  purchase_cost DECIMAL(10, 2) DEFAULT 0.00,
  selling_price DECIMAL(10, 2) DEFAULT 0.00,
  mrp DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'purchased' CHECK(status IN (
    'purchased', 'received', 'stored', 'transferred',
    'opened', 'active', 'partially_consumed',
    'empty', 'broken', 'returned', 'written_off', 'archived'
  )),
  current_ml INT NOT NULL,
  initial_ml INT NOT NULL,
  opened_at TIMESTAMP,
  opened_by VARCHAR(100),
  closed_at TIMESTAMP,
  closed_by VARCHAR(100),
  location VARCHAR(100) DEFAULT 'main',
  supplier_id VARCHAR(50),
  supplier_name VARCHAR(200),
  po_reference VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id)
);

CREATE TABLE IF NOT EXISTS peg_definitions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  size_ml INT NOT NULL CHECK(size_ml > 0),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS peg_prices (
  id VARCHAR(50) PRIMARY KEY,
  brand_id VARCHAR(50) NOT NULL,
  peg_size_id VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK(tier IN ('mrp', 'bar_price', 'happy_hour', 'promotional', 'member')),
  price DECIMAL(10, 2) NOT NULL CHECK(price >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id),
  FOREIGN KEY (peg_size_id) REFERENCES peg_definitions(id)
);

CREATE TABLE IF NOT EXISTS bar_sales (
  id VARCHAR(50) PRIMARY KEY,
  sale_no VARCHAR(30) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('draft', 'open', 'completed', 'cancelled', 'refunded')),
  counter VARCHAR(50) DEFAULT 'main',
  bartender_id VARCHAR(50),
  bartender_name VARCHAR(100),
  subtotal DECIMAL(12, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_reason VARCHAR(255),
  service_charge DECIMAL(10, 2) DEFAULT 0.00,
  gst_amount DECIMAL(10, 2) DEFAULT 0.00,
  tot_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bar_sale_lines (
  id VARCHAR(50) PRIMARY KEY,
  sale_id VARCHAR(50) NOT NULL,
  brand_id VARCHAR(50) NOT NULL,
  brand_name VARCHAR(200) NOT NULL,
  peg_size_ml INT NOT NULL,
  peg_definition_id VARCHAR(50),
  quantity DECIMAL(10, 2) NOT NULL CHECK(quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  pour_type VARCHAR(20) NOT NULL DEFAULT 'regular' CHECK(pour_type IN (
    'regular', 'short_pour', 'over_pour', 'complimentary',
    'promotion', 'staff_issue', 'internal', 'waste', 'spillage'
  )),
  bottle_id VARCHAR(50),
  bottle_switch_from VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'served', 'cancelled', 'refunded')),
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES bar_sales(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id),
  FOREIGN KEY (bottle_id) REFERENCES liquor_bottles(id)
);

CREATE TABLE IF NOT EXISTS bottle_openings (
  id VARCHAR(50) PRIMARY KEY,
  bottle_id VARCHAR(50) NOT NULL,
  brand_id VARCHAR(50) NOT NULL,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_by VARCHAR(100) NOT NULL,
  initial_ml INT NOT NULL,
  location VARCHAR(100) DEFAULT 'main',
  notes VARCHAR(500),
  FOREIGN KEY (bottle_id) REFERENCES liquor_bottles(id),
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id)
);

CREATE TABLE IF NOT EXISTS bottle_closings (
  id VARCHAR(50) PRIMARY KEY,
  bottle_id VARCHAR(50) NOT NULL,
  brand_id VARCHAR(50) NOT NULL,
  closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_by VARCHAR(100) NOT NULL,
  remaining_ml INT NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK(reason IN (
    'empty', 'broken', 'returned', 'written_off', 'archived', 'transfer'
  )),
  notes VARCHAR(500),
  FOREIGN KEY (bottle_id) REFERENCES liquor_bottles(id),
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id)
);

CREATE TABLE IF NOT EXISTS bottle_transfers (
  id VARCHAR(50) PRIMARY KEY,
  bottle_id VARCHAR(50) NOT NULL,
  brand_id VARCHAR(50) NOT NULL,
  from_location VARCHAR(100) NOT NULL,
  to_location VARCHAR(100) NOT NULL,
  transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transferred_by VARCHAR(100) NOT NULL,
  notes VARCHAR(500),
  FOREIGN KEY (bottle_id) REFERENCES liquor_bottles(id),
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id)
);

CREATE TABLE IF NOT EXISTS liquor_movements (
  id VARCHAR(50) PRIMARY KEY,
  bottle_id VARCHAR(50),
  brand_id VARCHAR(50) NOT NULL,
  brand_name VARCHAR(200) NOT NULL,
  kind VARCHAR(30) NOT NULL CHECK(kind IN (
    'purchase', 'receipt', 'opening', 'sale', 'transfer_in', 'transfer_out',
    'adjustment', 'physical_count', 'damage', 'expiry', 'supplier_return',
    'complimentary', 'staff_issue', 'internal', 'waste', 'spillage', 'closing'
  )),
  quantity_ml INT NOT NULL,
  ml_before INT NOT NULL,
  ml_after INT NOT NULL,
  pour_type VARCHAR(20),
  sale_id VARCHAR(50),
  sale_line_id VARCHAR(50),
  unit_price DECIMAL(10, 2) DEFAULT 0.00,
  total_value DECIMAL(12, 2) DEFAULT 0.00,
  operator VARCHAR(100) NOT NULL,
  reference VARCHAR(100),
  reason VARCHAR(255),
  note VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS excise_register (
  id VARCHAR(50) PRIMARY KEY,
  date DATE NOT NULL,
  counter VARCHAR(50) DEFAULT 'main',
  brand_id VARCHAR(50) NOT NULL,
  brand_name VARCHAR(200) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  category_name VARCHAR(20) NOT NULL,
  opening_stock_bottles INT DEFAULT 0,
  opening_stock_ml INT DEFAULT 0,
  received_bottles INT DEFAULT 0,
  received_ml INT DEFAULT 0,
  sold_ml INT DEFAULT 0,
  sold_amount DECIMAL(12, 2) DEFAULT 0.00,
  complimentary_ml INT DEFAULT 0,
  breakage_ml INT DEFAULT 0,
  wastage_ml INT DEFAULT 0,
  staff_ml INT DEFAULT 0,
  closing_stock_bottles INT DEFAULT 0,
  closing_stock_ml INT DEFAULT 0,
  variance_ml INT DEFAULT 0,
  remarks TEXT,
  prepared_by VARCHAR(100) NOT NULL,
  verified_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'prepared' CHECK(status IN ('prepared', 'verified', 'approved', 'filed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id),
  FOREIGN KEY (category_id) REFERENCES liquor_categories(id)
);

CREATE TABLE IF NOT EXISTS pour_log (
  id VARCHAR(50) PRIMARY KEY,
  sale_line_id VARCHAR(50) NOT NULL,
  bottle_id VARCHAR(50) NOT NULL,
  brand_id VARCHAR(50) NOT NULL,
  peg_size_ml INT NOT NULL,
  pour_type VARCHAR(20) NOT NULL,
  quantity_ml INT NOT NULL,
  bartender_id VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_line_id) REFERENCES bar_sale_lines(id),
  FOREIGN KEY (bottle_id) REFERENCES liquor_bottles(id),
  FOREIGN KEY (brand_id) REFERENCES liquor_brands(id)
);

CREATE TABLE IF NOT EXISTS bar_events (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  aggregate_type VARCHAR(30) NOT NULL,
  aggregate_id VARCHAR(50) NOT NULL,
  data TEXT,
  created_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lb_category ON liquor_brands(category_id);
CREATE INDEX IF NOT EXISTS idx_lb_active ON liquor_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_lbt_brand ON liquor_bottles(brand_id);
CREATE INDEX IF NOT EXISTS idx_lbt_status ON liquor_bottles(status);
CREATE INDEX IF NOT EXISTS idx_lbt_location ON liquor_bottles(location);
CREATE INDEX IF NOT EXISTS idx_lbt_active ON liquor_bottles(is_active);
CREATE INDEX IF NOT EXISTS idx_pp_brand ON peg_prices(brand_id);
CREATE INDEX IF NOT EXISTS idx_pp_peg ON peg_prices(peg_size_id);
CREATE INDEX IF NOT EXISTS idx_pp_tier ON peg_prices(tier);
CREATE INDEX IF NOT EXISTS idx_bs_status ON bar_sales(status);
CREATE INDEX IF NOT EXISTS idx_bs_date ON bar_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_bs_counter ON bar_sales(counter);
CREATE INDEX IF NOT EXISTS idx_bsl_sale ON bar_sale_lines(sale_id);
CREATE INDEX IF NOT EXISTS idx_bsl_brand ON bar_sale_lines(brand_id);
CREATE INDEX IF NOT EXISTS idx_bsl_bottle ON bar_sale_lines(bottle_id);
CREATE INDEX IF NOT EXISTS idx_bo_bottle ON bottle_openings(bottle_id);
CREATE INDEX IF NOT EXISTS idx_bc_bottle ON bottle_closings(bottle_id);
CREATE INDEX IF NOT EXISTS idx_bt_bottle ON bottle_transfers(bottle_id);
CREATE INDEX IF NOT EXISTS idx_lm_bottle ON liquor_movements(bottle_id);
CREATE INDEX IF NOT EXISTS idx_lm_brand ON liquor_movements(brand_id);
CREATE INDEX IF NOT EXISTS idx_lm_kind ON liquor_movements(kind);
CREATE INDEX IF NOT EXISTS idx_lm_date ON liquor_movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_er_date ON excise_register(date);
CREATE INDEX IF NOT EXISTS idx_er_brand ON excise_register(brand_id);
CREATE INDEX IF NOT EXISTS idx_pl_sale_line ON pour_log(sale_line_id);
CREATE INDEX IF NOT EXISTS idx_pl_bottle ON pour_log(bottle_id);
CREATE INDEX IF NOT EXISTS idx_be_event ON bar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_be_aggregate ON bar_events(aggregate_type, aggregate_id);

-- 15. Hotel Property Management System (P4-1)
CREATE TABLE IF NOT EXISTS room_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  base_rate DECIMAL(10, 2) NOT NULL CHECK(base_rate >= 0),
  capacity INT DEFAULT 2,
  max_adults INT DEFAULT 2,
  max_children INT DEFAULT 1,
  size_sqft INT,
  bed_type VARCHAR(50) DEFAULT 'queen',
  amenities TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(50) PRIMARY KEY,
  room_no VARCHAR(10) NOT NULL UNIQUE,
  room_type_id VARCHAR(50) NOT NULL,
  floor INT DEFAULT 1,
  view VARCHAR(20) DEFAULT 'none' CHECK(view IN ('garden', 'pool', 'sea', 'city', 'mountain', 'courtyard', 'none')),
  status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK(status IN (
    'vacant', 'occupied', 'cleaning', 'maintenance', 'out_of_service', 'blocked', 'reserved'
  )),
  is_smoking BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  current_stay_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

CREATE TABLE IF NOT EXISTS guests (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  id_proof_type VARCHAR(30),
  id_proof_number VARCHAR(100),
  id_proof_image VARCHAR(500),
  nationality VARCHAR(50) DEFAULT 'Indian',
  is_corporate BOOLEAN DEFAULT FALSE,
  company_name VARCHAR(200),
  company_gst VARCHAR(15),
  is_blacklisted BOOLEAN DEFAULT FALSE,
  preferences TEXT,
  total_stays INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(50) PRIMARY KEY,
  reservation_no VARCHAR(30) NOT NULL UNIQUE,
  guest_id VARCHAR(50),
  guest_name VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(100),
  room_type_id VARCHAR(50),
  room_id VARCHAR(50),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL CHECK(nights > 0),
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  board_type VARCHAR(20) DEFAULT 'room_only' CHECK(board_type IN ('room_only', 'bed_breakfast', 'half_board', 'full_board', 'all_inclusive')),
  status VARCHAR(20) NOT NULL DEFAULT 'inquiry' CHECK(status IN (
    'inquiry', 'reserved', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'completed'
  )),
  source VARCHAR(20) DEFAULT 'direct' CHECK(source IN ('direct', 'walk_in', 'ota', 'corporate', 'agent')),
  source_ref VARCHAR(100),
  special_requests TEXT,
  corporate_name VARCHAR(200),
  corporate_gst VARCHAR(15),
  rate_override DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) DEFAULT 0.00,
  advance_amount DECIMAL(10, 2) DEFAULT 0.00,
  balance_amount DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (guest_id) REFERENCES guests(id),
  FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS stays (
  id VARCHAR(50) PRIMARY KEY,
  reservation_id VARCHAR(50),
  guest_id VARCHAR(50) NOT NULL,
  guest_name VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  room_id VARCHAR(50) NOT NULL,
  room_no VARCHAR(10) NOT NULL,
  room_type_id VARCHAR(50) NOT NULL,
  room_type_name VARCHAR(100) NOT NULL,
  check_in TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out TIMESTAMP,
  expected_check_out DATE NOT NULL,
  nights INT NOT NULL DEFAULT 1,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  board_type VARCHAR(20) DEFAULT 'room_only',
  rate DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  folio_id VARCHAR(50),
  folio_number VARCHAR(30),
  balance_amount DECIMAL(12, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  checked_in_by VARCHAR(100),
  checked_out_by VARCHAR(100),
  checked_out_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS room_assignments (
  id VARCHAR(50) PRIMARY KEY,
  stay_id VARCHAR(50) NOT NULL,
  room_id VARCHAR(50) NOT NULL,
  room_no VARCHAR(10) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(100),
  released_at TIMESTAMP,
  reason VARCHAR(255),
  FOREIGN KEY (stay_id) REFERENCES stays(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS folios (
  id VARCHAR(50) PRIMARY KEY,
  folio_number VARCHAR(30) NOT NULL UNIQUE,
  stay_id VARCHAR(50) NOT NULL,
  guest_id VARCHAR(50) NOT NULL,
  guest_name VARCHAR(200) NOT NULL,
  room_no VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'closed', 'partially_paid', 'paid', 'cancelled')),
  room_charges DECIMAL(12, 2) DEFAULT 0.00,
  restaurant_charges DECIMAL(12, 2) DEFAULT 0.00,
  bar_charges DECIMAL(12, 2) DEFAULT 0.00,
  room_service_charges DECIMAL(12, 2) DEFAULT 0.00,
  laundry_charges DECIMAL(12, 2) DEFAULT 0.00,
  extra_bed_charges DECIMAL(12, 2) DEFAULT 0.00,
  amenities_charges DECIMAL(12, 2) DEFAULT 0.00,
  service_charge DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  discounts DECIMAL(10, 2) DEFAULT 0.00,
  total_charges DECIMAL(12, 2) DEFAULT 0.00,
  total_payments DECIMAL(12, 2) DEFAULT 0.00,
  balance_amount DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stay_id) REFERENCES stays(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);

CREATE TABLE IF NOT EXISTS folio_charges (
  id VARCHAR(50) PRIMARY KEY,
  folio_id VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK(category IN (
    'room_tariff', 'restaurant', 'bar', 'room_service',
    'laundry', 'extra_bed', 'amenities', 'service_charge',
    'tax', 'deposit', 'other'
  )),
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  quantity INT DEFAULT 1,
  total_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  reference VARCHAR(100),
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  posted_by VARCHAR(100),
  notes VARCHAR(500),
  FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS folio_payments (
  id VARCHAR(50) PRIMARY KEY,
  folio_id VARCHAR(50) NOT NULL,
  mode VARCHAR(10) NOT NULL CHECK(mode IN ('cash', 'upi', 'card', 'bank', 'credit', 'online')),
  amount DECIMAL(12, 2) NOT NULL CHECK(amount > 0),
  reference VARCHAR(100),
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_by VARCHAR(100),
  notes VARCHAR(500),
  FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(50) NOT NULL,
  room_no VARCHAR(10) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'inspected', 'completed')),
  assigned_to VARCHAR(100),
  priority INT DEFAULT 0,
  scheduled_date DATE NOT NULL,
  completed_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(50) NOT NULL,
  room_no VARCHAR(10) NOT NULL,
  issue_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'reported' CHECK(status IN ('reported', 'assigned', 'in_progress', 'resolved', 'verified')),
  priority INT DEFAULT 0,
  assigned_to VARCHAR(100),
  reported_by VARCHAR(100) NOT NULL,
  resolved_at TIMESTAMP,
  resolution TEXT,
  verified_by VARCHAR(100),
  cost DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS night_audit (
  id VARCHAR(50) PRIMARY KEY,
  audit_date DATE NOT NULL,
  total_rooms INT NOT NULL,
  occupied_rooms INT NOT NULL,
  vacant_rooms INT NOT NULL,
  out_of_service_rooms INT DEFAULT 0,
  blocked_rooms INT DEFAULT 0,
  housekeeping_rooms INT DEFAULT 0,
  total_revenue DECIMAL(14, 2) DEFAULT 0.00,
  room_revenue DECIMAL(12, 2) DEFAULT 0.00,
  restaurant_revenue DECIMAL(12, 2) DEFAULT 0.00,
  bar_revenue DECIMAL(12, 2) DEFAULT 0.00,
  other_revenue DECIMAL(12, 2) DEFAULT 0.00,
  total_tax DECIMAL(10, 2) DEFAULT 0.00,
  total_discounts DECIMAL(10, 2) DEFAULT 0.00,
  total_payments DECIMAL(14, 2) DEFAULT 0.00,
  outstanding_balance DECIMAL(14, 2) DEFAULT 0.00,
  occupancy_percent DECIMAL(5, 2) DEFAULT 0.00,
  adr DECIMAL(10, 2) DEFAULT 0.00,
  revpar DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft', 'final', 'approved')),
  notes TEXT,
  performed_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_events (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  aggregate_type VARCHAR(30) NOT NULL,
  aggregate_id VARCHAR(50) NOT NULL,
  data TEXT,
  created_by VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rt_active ON room_types(is_active);
CREATE INDEX IF NOT EXISTS idx_r_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_r_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_r_floor ON rooms(floor);
CREATE INDEX IF NOT EXISTS idx_r_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_g_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_g_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_g_corporate ON guests(is_corporate);
CREATE INDEX IF NOT EXISTS idx_rsv_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_rsv_dates ON reservations(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_rsv_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsv_source ON reservations(source);
CREATE INDEX IF NOT EXISTS idx_rsv_no ON reservations(reservation_no);
CREATE INDEX IF NOT EXISTS idx_stay_guest ON stays(guest_id);
CREATE INDEX IF NOT EXISTS idx_stay_room ON stays(room_id);
CREATE INDEX IF NOT EXISTS idx_stay_status ON stays(status);
CREATE INDEX IF NOT EXISTS idx_ra_stay ON room_assignments(stay_id);
CREATE INDEX IF NOT EXISTS idx_ra_room ON room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_folio_stay ON folios(stay_id);
CREATE INDEX IF NOT EXISTS idx_folio_guest ON folios(guest_id);
CREATE INDEX IF NOT EXISTS idx_folio_status ON folios(status);
CREATE INDEX IF NOT EXISTS idx_fc_folio ON folio_charges(folio_id);
CREATE INDEX IF NOT EXISTS idx_fc_category ON folio_charges(category);
CREATE INDEX IF NOT EXISTS idx_fp_folio ON folio_payments(folio_id);
CREATE INDEX IF NOT EXISTS idx_hk_room ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_hk_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_hk_date ON housekeeping_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_mt_room ON maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_mt_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_na_date ON night_audit(audit_date);
CREATE INDEX IF NOT EXISTS idx_re_event ON room_events(event_type);
CREATE INDEX IF NOT EXISTS idx_re_aggregate ON room_events(aggregate_type, aggregate_id);

-- 16. Financial Core — Double-Entry Accounting (P4-2)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  account_type VARCHAR(15) NOT NULL CHECK(account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  account_sub_type VARCHAR(30) DEFAULT '',
  parent_id VARCHAR(50),
  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  tax_rate INT DEFAULT 0,
  description TEXT,
  balance DECIMAL(14, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
);

CREATE TABLE IF NOT EXISTS financial_periods (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK(period_type IN ('monthly', 'quarterly', 'yearly')),
  is_open BOOLEAN DEFAULT TRUE,
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMP,
  closed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id VARCHAR(50) PRIMARY KEY,
  voucher_no VARCHAR(30) NOT NULL UNIQUE,
  voucher_type VARCHAR(20) NOT NULL CHECK(voucher_type IN (
    'payment', 'receipt', 'contra', 'journal', 'purchase',
    'sales', 'credit_note', 'debit_note', 'opening',
    'closing', 'adjustment', 'accrual'
  )),
  entry_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  debit_total DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  credit_total DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'posted', 'reversed', 'cancelled')),
  reference_type VARCHAR(30),
  reference_id VARCHAR(50),
  period_id VARCHAR(50),
  posted_at TIMESTAMP,
  posted_by VARCHAR(100),
  reversed_at TIMESTAMP,
  reversed_by VARCHAR(100),
  reversal_of VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES financial_periods(id),
  FOREIGN KEY (reversal_of) REFERENCES journal_entries(id)
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id VARCHAR(50) PRIMARY KEY,
  journal_id VARCHAR(50) NOT NULL,
  account_id VARCHAR(50) NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  debit DECIMAL(14, 2) DEFAULT 0.00,
  credit DECIMAL(14, 2) DEFAULT 0.00,
  description VARCHAR(500),
  cost_center VARCHAR(50),
  reference_type VARCHAR(30),
  reference_id VARCHAR(50),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

CREATE TABLE IF NOT EXISTS account_balances (
  id VARCHAR(50) PRIMARY KEY,
  account_id VARCHAR(50) NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  period_id VARCHAR(50) NOT NULL,
  opening_debit DECIMAL(14, 2) DEFAULT 0.00,
  opening_credit DECIMAL(14, 2) DEFAULT 0.00,
  period_debit DECIMAL(14, 2) DEFAULT 0.00,
  period_credit DECIMAL(14, 2) DEFAULT 0.00,
  closing_debit DECIMAL(14, 2) DEFAULT 0.00,
  closing_credit DECIMAL(14, 2) DEFAULT 0.00,
  balance DECIMAL(14, 2) DEFAULT 0.00,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (period_id) REFERENCES financial_periods(id)
);

CREATE TABLE IF NOT EXISTS gst_registers (
  id VARCHAR(50) PRIMARY KEY,
  gst_type VARCHAR(10) NOT NULL CHECK(gst_type IN ('input', 'output')),
  gst_rate INT NOT NULL CHECK(gst_rate IN (0, 5, 12, 18, 28)),
  taxable_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  gst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  invoice_no VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  party_name VARCHAR(200) NOT NULL,
  party_gstin VARCHAR(15),
  journal_id VARCHAR(50),
  reference_type VARCHAR(30) NOT NULL,
  reference_id VARCHAR(50) NOT NULL,
  period VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
);

CREATE TABLE IF NOT EXISTS auto_posting_config (
  id VARCHAR(50) PRIMARY KEY,
  source VARCHAR(30) NOT NULL UNIQUE CHECK(source IN (
    'purchase_order', 'goods_receipt', 'supplier_invoice',
    'restaurant_sale', 'bar_sale',
    'hotel_check_in', 'hotel_check_out', 'hotel_folio_charge',
    'inventory_adjustment', 'stock_count'
  )),
  debit_account_id VARCHAR(50) NOT NULL,
  credit_account_id VARCHAR(50) NOT NULL,
  gst_account_id VARCHAR(50),
  description VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (debit_account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (credit_account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (gst_account_id) REFERENCES chart_of_accounts(id)
);

CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id VARCHAR(50) PRIMARY KEY,
  bank_account_id VARCHAR(50) NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(14, 2) NOT NULL,
  system_balance DECIMAL(14, 2) NOT NULL,
  difference DECIMAL(14, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'unreconciled' CHECK(status IN ('unreconciled', 'cleared', 'reconciled', 'discrepancy')),
  reconciled_at TIMESTAMP,
  reconciled_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_fp_dates ON financial_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fp_type ON financial_periods(period_type);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_voucher ON journal_entries(voucher_no);
CREATE INDEX IF NOT EXISTS idx_je_type ON journal_entries(voucher_type);
CREATE INDEX IF NOT EXISTS idx_je_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_je_period ON journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_jl_journal ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_ab_account ON account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_ab_period ON account_balances(period_id);
CREATE INDEX IF NOT EXISTS idx_gr_type ON gst_registers(gst_type);
CREATE INDEX IF NOT EXISTS idx_gr_rate ON gst_registers(gst_rate);
CREATE INDEX IF NOT EXISTS idx_gr_period ON gst_registers(period);
CREATE INDEX IF NOT EXISTS idx_gr_created_at ON gst_registers(created_at);
CREATE INDEX IF NOT EXISTS idx_br_bank ON bank_reconciliation(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_br_date ON bank_reconciliation(statement_date);
CREATE INDEX IF NOT EXISTS idx_br_status ON bank_reconciliation(status);

-- 17. Business Intelligence & Analytics
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id VARCHAR(50) PRIMARY KEY,
  key VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL CHECK(category IN (
    'revenue','occupancy','restaurant','bar','inventory','purchasing','finance','gst','excise','hotel','employee'
  )),
  formula TEXT NOT NULL,
  unit VARCHAR(30) NOT NULL,
  decimal_places INT DEFAULT 2,
  is_percentage BOOLEAN DEFAULT FALSE,
  higher_is_better BOOLEAN DEFAULT TRUE,
  min_refresh_interval INT DEFAULT 300,
  roles TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dashboard_configs (
  id VARCHAR(50) PRIMARY KEY,
  role VARCHAR(20) NOT NULL UNIQUE CHECK(role IN (
    'owner','manager','accountant','restaurant','bar','hotel','inventory','purchasing','finance'
  )),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  refresh_interval INT DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id VARCHAR(50) PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  room_revenue DECIMAL(14,2) DEFAULT 0,
  restaurant_revenue DECIMAL(14,2) DEFAULT 0,
  bar_revenue DECIMAL(14,2) DEFAULT 0,
  other_revenue DECIMAL(14,2) DEFAULT 0,
  total_expenses DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  restaurant_covers INT DEFAULT 0,
  average_bill DECIMAL(10,2) DEFAULT 0,
  bar_sales DECIMAL(14,2) DEFAULT 0,
  cash_balance DECIMAL(14,2) DEFAULT 0,
  bank_balance DECIMAL(14,2) DEFAULT 0,
  receivables DECIMAL(14,2) DEFAULT 0,
  payables DECIMAL(14,2) DEFAULT 0,
  gst_payable DECIMAL(14,2) DEFAULT 0,
  gst_input_credit DECIMAL(14,2) DEFAULT 0,
  inventory_value DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id VARCHAR(50) PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  room_revenue DECIMAL(14,2) DEFAULT 0,
  restaurant_revenue DECIMAL(14,2) DEFAULT 0,
  bar_revenue DECIMAL(14,2) DEFAULT 0,
  other_revenue DECIMAL(14,2) DEFAULT 0,
  total_expenses DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  restaurant_covers INT DEFAULT 0,
  average_bill DECIMAL(10,2) DEFAULT 0,
  bar_sales DECIMAL(14,2) DEFAULT 0,
  cash_balance DECIMAL(14,2) DEFAULT 0,
  bank_balance DECIMAL(14,2) DEFAULT 0,
  receivables DECIMAL(14,2) DEFAULT 0,
  payables DECIMAL(14,2) DEFAULT 0,
  gst_payable DECIMAL(14,2) DEFAULT 0,
  gst_input_credit DECIMAL(14,2) DEFAULT 0,
  inventory_value DECIMAL(14,2) DEFAULT 0,
  UNIQUE(week_start, week_end),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_summaries (
  id VARCHAR(50) PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  room_revenue DECIMAL(14,2) DEFAULT 0,
  restaurant_revenue DECIMAL(14,2) DEFAULT 0,
  bar_revenue DECIMAL(14,2) DEFAULT 0,
  other_revenue DECIMAL(14,2) DEFAULT 0,
  cost_of_goods_sold DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  gross_margin DECIMAL(5,2) DEFAULT 0,
  total_expenses DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  net_margin DECIMAL(5,2) DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  adr DECIMAL(10,2) DEFAULT 0,
  revpar DECIMAL(10,2) DEFAULT 0,
  restaurant_covers INT DEFAULT 0,
  average_bill DECIMAL(10,2) DEFAULT 0,
  bar_sales DECIMAL(14,2) DEFAULT 0,
  inventory_turnover DECIMAL(8,2) DEFAULT 0,
  gst_payable DECIMAL(14,2) DEFAULT 0,
  gst_input_credit DECIMAL(14,2) DEFAULT 0,
  cash_flow DECIMAL(14,2) DEFAULT 0,
  receivables DECIMAL(14,2) DEFAULT 0,
  payables DECIMAL(14,2) DEFAULT 0,
  cash_position DECIMAL(14,2) DEFAULT 0,
  bank_position DECIMAL(14,2) DEFAULT 0,
  waste_percent DECIMAL(5,2) DEFAULT 0,
  complimentary_percent DECIMAL(5,2) DEFAULT 0,
  cancellation_percent DECIMAL(5,2) DEFAULT 0,
  refund_percent DECIMAL(5,2) DEFAULT 0,
  department_profits TEXT DEFAULT '[]',
  UNIQUE(year, month),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS yearly_summaries (
  id VARCHAR(50) PRIMARY KEY,
  year INT NOT NULL UNIQUE,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  room_revenue DECIMAL(14,2) DEFAULT 0,
  restaurant_revenue DECIMAL(14,2) DEFAULT 0,
  bar_revenue DECIMAL(14,2) DEFAULT 0,
  other_revenue DECIMAL(14,2) DEFAULT 0,
  cost_of_goods_sold DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  gross_margin DECIMAL(5,2) DEFAULT 0,
  total_expenses DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  net_margin DECIMAL(5,2) DEFAULT 0,
  occupancy_rate DECIMAL(5,2) DEFAULT 0,
  adr DECIMAL(10,2) DEFAULT 0,
  revpar DECIMAL(10,2) DEFAULT 0,
  restaurant_covers INT DEFAULT 0,
  average_bill DECIMAL(10,2) DEFAULT 0,
  bar_sales DECIMAL(14,2) DEFAULT 0,
  inventory_turnover DECIMAL(8,2) DEFAULT 0,
  gst_payable DECIMAL(14,2) DEFAULT 0,
  gst_input_credit DECIMAL(14,2) DEFAULT 0,
  cash_flow DECIMAL(14,2) DEFAULT 0,
  receivables DECIMAL(14,2) DEFAULT 0,
  payables DECIMAL(14,2) DEFAULT 0,
  cash_position DECIMAL(14,2) DEFAULT 0,
  bank_position DECIMAL(14,2) DEFAULT 0,
  department_profits TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id VARCHAR(50) PRIMARY KEY,
  cache_key VARCHAR(100) NOT NULL UNIQUE,
  data TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(50) PRIMARY KEY,
  event_type VARCHAR(30) NOT NULL CHECK(event_type IN (
    'daily_snapshot','weekly_summary','monthly_summary','yearly_summary',
    'threshold_alert','trend_detection','anomaly_detection'
  )),
  period VARCHAR(10) NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  threshold_breaches TEXT DEFAULT '[]',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ds_date ON daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_ws_week ON weekly_summaries(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_ms_month ON monthly_summaries(year, month);
CREATE INDEX IF NOT EXISTS idx_ys_year ON yearly_summaries(year);
CREATE INDEX IF NOT EXISTS idx_ac_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ae_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ae_period ON analytics_events(period);

-- 18. Enterprise HRMS & Payroll Automation (P4-4)
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  head_id VARCHAR(50),
  parent_id VARCHAR(50),
  cost_center VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (head_id) REFERENCES employees(id),
  FOREIGN KEY (parent_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS designations (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_id VARCHAR(50) NOT NULL,
  grade VARCHAR(10),
  level INT DEFAULT 1,
  min_salary DECIMAL(12,2) DEFAULT 0,
  max_salary DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS employee_profiles (
  employee_id VARCHAR(50) PRIMARY KEY,
  employee_code VARCHAR(20) UNIQUE,
  last_name VARCHAR(100),
  alternate_phone VARCHAR(20),
  gender VARCHAR(10) CHECK(gender IN ('male','female','other')),
  date_of_birth DATE,
  marital_status VARCHAR(15) CHECK(marital_status IN ('single','married','divorced','widowed')),
  blood_group VARCHAR(5),
  nationality VARCHAR(50) DEFAULT 'Indian',
  department_id VARCHAR(50),
  designation_id VARCHAR(50),
  reporting_to_id VARCHAR(50),
  employment_type VARCHAR(20) CHECK(employment_type IN ('permanent','probation','contract','intern','trainee','daily_wage','hourly')),
  confirmation_date DATE,
  exit_date DATE,
  exit_type VARCHAR(20),
  exit_reason TEXT,
  permanent_address TEXT,
  current_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  bank_account_no VARCHAR(30),
  bank_name VARCHAR(100),
  bank_ifsc VARCHAR(20),
  bank_branch VARCHAR(100),
  salary_account_no VARCHAR(30),
  pf_number VARCHAR(20),
  esi_number VARCHAR(20),
  uan_number VARCHAR(20),
  pan_number VARCHAR(15),
  aadhaar_number VARCHAR(15),
  photo_url VARCHAR(500),
  signature_url VARCHAR(500),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  shift_type VARCHAR(20) NOT NULL CHECK(shift_type IN ('general','morning','afternoon','night','split','flexible')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_minutes INT DEFAULT 10,
  late_threshold INT DEFAULT 15,
  early_departure_threshold INT DEFAULT 15,
  half_day_hours DECIMAL(4,1) DEFAULT 4.5,
  full_day_hours DECIMAL(4,1) DEFAULT 9.0,
  is_night_shift BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  applicable_departments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_shifts (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  shift_id VARCHAR(50) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  shift_id VARCHAR(50),
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','half_day','late','early_departure','holiday','leave','week_off')),
  worked_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  late_minutes INT DEFAULT 0,
  early_departure_minutes INT DEFAULT 0,
  missing_punch BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  correction_reason TEXT,
  notes TEXT,
  source VARCHAR(20) DEFAULT 'manual' CHECK(source IN ('manual','biometric','qr','gps','correction')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (shift_id) REFERENCES shifts(id),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_corrections (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  original_clock_in TIMESTAMP,
  original_clock_out TIMESTAMP,
  corrected_clock_in TIMESTAMP,
  corrected_clock_out TIMESTAMP,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS holiday_calendar (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  date DATE NOT NULL,
  year INT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('public','restricted','optional')),
  is_optional BOOLEAN DEFAULT FALSE,
  applicable_departments TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, date)
);

CREATE TABLE IF NOT EXISTS leave_type_configs (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('casual','sick','earned','comp_off','maternity','paternity','loss_of_pay','bereavement','marriage','custom')),
  days_per_cycle INT NOT NULL,
  max_consecutive INT DEFAULT 0,
  requires_approval BOOLEAN DEFAULT TRUE,
  is_paid BOOLEAN DEFAULT TRUE,
  is_carry_forward BOOLEAN DEFAULT FALSE,
  carry_forward_limit INT DEFAULT 0,
  is_encashable BOOLEAN DEFAULT FALSE,
  min_service_days INT DEFAULT 0,
  gender_restriction VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  leave_type_id VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  total_days DECIMAL(6,1) NOT NULL,
  used_days DECIMAL(6,1) DEFAULT 0,
  pending_days DECIMAL(6,1) DEFAULT 0,
  carried_forward DECIMAL(6,1) DEFAULT 0,
  available_days DECIMAL(6,1) GENERATED ALWAYS AS (total_days + carried_forward - used_days - pending_days) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_type_configs(id),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  leave_type_id VARCHAR(50) NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  session VARCHAR(20) DEFAULT 'full_day' CHECK(session IN ('full_day','first_half','second_half')),
  days DECIMAL(5,1) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  applied_to VARCHAR(50),
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  is_urgent BOOLEAN DEFAULT FALSE,
  contact_during_leave VARCHAR(20),
  alternate_arrangements TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_type_configs(id)
);

CREATE TABLE IF NOT EXISTS payroll_frequency_config (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  frequency VARCHAR(10) NOT NULL CHECK(frequency IN ('monthly','weekly','daily','hourly')),
  cutoff_day INT NOT NULL,
  process_day INT NOT NULL,
  payment_day INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  gross_salary DECIMAL(12,2) NOT NULL,
  basic_pay DECIMAL(12,2) NOT NULL,
  hra DECIMAL(12,2) DEFAULT 0,
  conveyance_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  special_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowance DECIMAL(12,2) DEFAULT 0,
  employer_pf DECIMAL(12,2) DEFAULT 0,
  employer_esi DECIMAL(12,2) DEFAULT 0,
  total_ctc DECIMAL(12,2) GENERATED ALWAYS AS (gross_salary + employer_pf + employer_esi) STORED,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS salary_components (
  id VARCHAR(50) PRIMARY KEY,
  salary_structure_id VARCHAR(50) NOT NULL,
  component_type VARCHAR(10) NOT NULL CHECK(component_type IN ('earning','deduction')),
  name VARCHAR(100) NOT NULL,
  calculation_type VARCHAR(15) NOT NULL CHECK(calculation_type IN ('fixed','percentage','statutory')),
  calculation_value DECIMAL(12,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_statutory BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id)
);

CREATE TABLE IF NOT EXISTS salary_revisions (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  previous_gross DECIMAL(12,2) NOT NULL,
  new_gross DECIMAL(12,2) NOT NULL,
  revision_date DATE NOT NULL,
  effective_from DATE NOT NULL,
  reason TEXT NOT NULL,
  approved_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id VARCHAR(50) PRIMARY KEY,
  month INT NOT NULL CHECK(month BETWEEN 1 AND 12),
  year INT NOT NULL,
  frequency VARCHAR(10) DEFAULT 'monthly' CHECK(frequency IN ('monthly','weekly','daily','hourly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(15) DEFAULT 'draft' CHECK(status IN ('draft','computed','approved','paid','locked')),
  processed_by VARCHAR(50),
  processed_at TIMESTAMP,
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  locked_at TIMESTAMP,
  total_gross_pay DECIMAL(14,2) DEFAULT 0,
  total_deductions DECIMAL(14,2) DEFAULT 0,
  total_net_pay DECIMAL(14,2) DEFAULT 0,
  total_employer_contributions DECIMAL(14,2) DEFAULT 0,
  employee_count INT DEFAULT 0,
  journal_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id),
  UNIQUE(month, year, frequency)
);

CREATE TABLE IF NOT EXISTS employee_payrolls (
  id VARCHAR(50) PRIMARY KEY,
  payroll_run_id VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  gross_pay DECIMAL(12,2) NOT NULL,
  total_deductions DECIMAL(12,2) NOT NULL,
  net_pay DECIMAL(12,2) NOT NULL,
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  incentives DECIMAL(12,2) DEFAULT 0,
  commissions DECIMAL(12,2) DEFAULT 0,
  service_charge_share DECIMAL(12,2) DEFAULT 0,
  bonus DECIMAL(12,2) DEFAULT 0,
  loan_recovery DECIMAL(12,2) DEFAULT 0,
  advance_recovery DECIMAL(12,2) DEFAULT 0,
  reimbursement DECIMAL(12,2) DEFAULT 0,
  employer_pf DECIMAL(12,2) DEFAULT 0,
  employer_esi DECIMAL(12,2) DEFAULT 0,
  attendance_deductions DECIMAL(12,2) DEFAULT 0,
  leave_deductions DECIMAL(12,2) DEFAULT 0,
  payable_amount DECIMAL(12,2) NOT NULL,
  payment_mode VARCHAR(10) DEFAULT 'bank' CHECK(payment_mode IN ('cash','bank','cheque','upi')),
  paid_at TIMESTAMP,
  is_paid BOOLEAN DEFAULT FALSE,
  components TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS employee_loans (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  loan_type VARCHAR(50) NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL,
  emi_amount DECIMAL(12,2) NOT NULL,
  total_emis INT NOT NULL,
  paid_emis INT DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (principal_amount - (emi_amount * paid_emis)) STORED,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  sanction_date DATE NOT NULL,
  first_emi_date DATE NOT NULL,
  closure_date DATE,
  status VARCHAR(15) DEFAULT 'active' CHECK(status IN ('active','closed','defaulted')),
  purpose TEXT,
  approved_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS hr_advances (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  recovery_mode VARCHAR(15) DEFAULT 'installment' CHECK(recovery_mode IN ('one_time','installment')),
  installment_amount DECIMAL(12,2),
  installments INT,
  recovered_amount DECIMAL(12,2) DEFAULT 0,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (amount - recovered_amount) STORED,
  request_date DATE NOT NULL,
  recovery_start_month VARCHAR(7) NOT NULL,
  is_recovered BOOLEAN DEFAULT FALSE,
  purpose TEXT,
  approved_by VARCHAR(50),
  status VARCHAR(15) DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','recovered')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS employee_reimbursements (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  bill_date DATE NOT NULL,
  bill_number VARCHAR(50),
  bill_image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','paid')),
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  paid_in_payroll BOOLEAN DEFAULT FALSE,
  payroll_run_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id)
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  review_type VARCHAR(15) NOT NULL CHECK(review_type IN ('annual','quarterly','monthly','probation','promotion')),
  review_date DATE NOT NULL,
  reviewer_id VARCHAR(50) NOT NULL,
  rating INT NOT NULL CHECK(rating BETWEEN 1 AND 10),
  strengths TEXT,
  improvements TEXT,
  goals TEXT,
  reviewer_comments TEXT,
  employee_comments TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  next_review_date DATE,
  overall_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (reviewer_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS training_records (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  training_name VARCHAR(200) NOT NULL,
  provider VARCHAR(200),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','cancelled')),
  cost DECIMAL(12,2) DEFAULT 0,
  is_certification BOOLEAN DEFAULT FALSE,
  certificate_url VARCHAR(500),
  score DECIMAL(5,2),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS disciplinary_records (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK(action IN ('warning','written_warning','suspension','termination')),
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  issued_by VARCHAR(50) NOT NULL,
  duration INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS exit_processes (
  id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL UNIQUE,
  exit_type VARCHAR(20) NOT NULL CHECK(exit_type IN ('resignation','retirement','termination','mutual_separation','contract_end')),
  request_date DATE NOT NULL,
  expected_last_date DATE NOT NULL,
  actual_last_date DATE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'requested' CHECK(status IN ('requested','notice_period','clearance_pending','completed','cancelled')),
  notice_period_days INT DEFAULT 0,
  notice_period_waived BOOLEAN DEFAULT FALSE,
  clearance_items TEXT,
  is_eligible_for_rehire BOOLEAN DEFAULT TRUE,
  exit_interview_notes TEXT,
  approved_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_dept_parent ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_dept_head ON departments(head_id);
CREATE INDEX IF NOT EXISTS idx_desig_dept ON designations(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_prof_dept ON employee_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_prof_desig ON employee_profiles(designation_id);
CREATE INDEX IF NOT EXISTS idx_emp_prof_reporting ON employee_profiles(reporting_to_id);
CREATE INDEX IF NOT EXISTS idx_emp_prof_empl_type ON employee_profiles(employment_type);
CREATE INDEX IF NOT EXISTS idx_emp_shift_emp ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_emp ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_att_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_holiday_date ON holiday_calendar(date);
CREATE INDEX IF NOT EXISTS idx_holiday_year ON holiday_calendar(year);
CREATE INDEX IF NOT EXISTS idx_lb_emp ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_la_emp ON leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_la_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_ss_emp ON salary_structures(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_pr_month ON payroll_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_ep_payroll ON employee_payrolls(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_ep_emp ON employee_payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_emp ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_adv_emp ON hr_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimb_emp ON employee_reimbursements(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_emp ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_emp ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_discipline_emp ON disciplinary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_emp ON exit_processes(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_emp ON attendance_corrections(employee_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- P4-6: ENTERPRISE OFFLINE SYNCHRONIZATION
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. DEVICE REGISTRY
CREATE TABLE IF NOT EXISTS device_registry (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  device_type   VARCHAR(30) NOT NULL CHECK(device_type IN (
    'owner_laptop','restaurant_pos','bar_pos','kitchen_display',
    'reception','warehouse','manager_tablet','android_phone',
    'windows_desktop','web_client'
  )),
  public_key    TEXT NOT NULL,
  device_secret VARCHAR(100) NOT NULL,
  metadata      TEXT DEFAULT '{}',
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','active','disabled','revoked','blocked'
  )),
  last_seen_at  TIMESTAMP,
  last_ip       VARCHAR(45),
  firmware_ver  VARCHAR(20),
  app_version   VARCHAR(20),
  os_version    VARCHAR(50),
  capabilities  TEXT DEFAULT '[]',
  approved_by   VARCHAR(50),
  approved_at   TIMESTAMP,
  created_by    VARCHAR(50) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. EVENT STORE (immutable event sourcing)
CREATE TABLE IF NOT EXISTS event_store (
  id              VARCHAR(50) PRIMARY KEY,
  aggregate_type  VARCHAR(50) NOT NULL,
  aggregate_id    VARCHAR(50) NOT NULL,
  event_type      VARCHAR(50) NOT NULL,
  version         INTEGER NOT NULL,
  data            TEXT NOT NULL,
  metadata        TEXT DEFAULT '{}',
  device_id       VARCHAR(50),
  user_id         VARCHAR(50),
  server_version  INTEGER,
  signature       VARCHAR(256),
  is_synced       BOOLEAN DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SYNC CHECKPOINTS (per-device tracking)
CREATE TABLE IF NOT EXISTS sync_checkpoints (
  id              VARCHAR(50) PRIMARY KEY,
  device_id       VARCHAR(50) NOT NULL,
  last_event_id   VARCHAR(50),
  last_event_seq  INTEGER DEFAULT 0,
  last_sync_at    TIMESTAMP,
  events_pushed   INTEGER DEFAULT 0,
  events_pulled   INTEGER DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'idle' CHECK(status IN (
    'idle','syncing','error','recovering'
  )),
  error_message   TEXT,
  device_version  INTEGER DEFAULT 1,
  UNIQUE(device_id)
);

-- 4. SYNC QUEUE (pending operations for devices)
CREATE TABLE IF NOT EXISTS sync_queue (
  id              VARCHAR(50) PRIMARY KEY,
  device_id       VARCHAR(50) NOT NULL,
  event_id        VARCHAR(50),
  operation       VARCHAR(20) NOT NULL CHECK(operation IN (
    'push','pull','replay','conflict_resolve'
  )),
  payload         TEXT,
  status          VARCHAR(20) DEFAULT 'pending' CHECK(status IN (
    'pending','processing','completed','failed','cancelled'
  )),
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  error_message   TEXT,
  queued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP,
  UNIQUE(device_id, event_id, operation)
);

-- 5. CONFLICT LOG
CREATE TABLE IF NOT EXISTS conflict_log (
  id              VARCHAR(50) PRIMARY KEY,
  aggregate_type  VARCHAR(50) NOT NULL,
  aggregate_id    VARCHAR(50) NOT NULL,
  conflict_type   VARCHAR(30) NOT NULL CHECK(conflict_type IN (
    'lww','merge','manual','business_rule','priority','timestamp','version'
  )),
  local_version   INTEGER NOT NULL,
  remote_version  INTEGER NOT NULL,
  local_data      TEXT NOT NULL,
  remote_data     TEXT NOT NULL,
  resolved_data   TEXT,
  resolution      VARCHAR(20) DEFAULT 'unresolved' CHECK(resolution IN (
    'unresolved','local_wins','remote_wins','merge','manual','cancelled'
  )),
  device_id       VARCHAR(50),
  resolved_by     VARCHAR(50),
  resolved_at     TIMESTAMP,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. SYNC AUDIT LOG
CREATE TABLE IF NOT EXISTS sync_audit_log (
  id              VARCHAR(50) PRIMARY KEY,
  device_id       VARCHAR(50) NOT NULL,
  user_id         VARCHAR(50),
  sync_type       VARCHAR(20) NOT NULL CHECK(sync_type IN (
    'full','incremental','delta','replay','event_push','event_pull'
  )),
  direction       VARCHAR(10) NOT NULL CHECK(direction IN ('push','pull','bidirectional')),
  events_count    INTEGER DEFAULT 0,
  bytes_transferred INTEGER DEFAULT 0,
  duration_ms     INTEGER DEFAULT 0,
  status          VARCHAR(20) NOT NULL CHECK(status IN (
    'started','completed','failed','cancelled','timeout'
  )),
  error_message   TEXT,
  client_version  INTEGER,
  server_version  INTEGER,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sync tables
CREATE INDEX IF NOT EXISTS idx_event_agg ON event_store(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_device ON event_store(device_id);
CREATE INDEX IF NOT EXISTS idx_event_created ON event_store(created_at);
CREATE INDEX IF NOT EXISTS idx_event_version ON event_store(aggregate_type, aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_device_type ON device_registry(device_type);
CREATE INDEX IF NOT EXISTS idx_device_status ON device_registry(status);
CREATE INDEX IF NOT EXISTS idx_queue_device ON sync_queue(device_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_conflict_status ON conflict_log(resolution);
CREATE INDEX IF NOT EXISTS idx_audit_device ON sync_audit_log(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON sync_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_status ON sync_audit_log(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- P4-7: ENTERPRISE WORKFLOW, RULES, APPROVAL & NOTIFICATION ENGINE
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. WORKFLOW DEFINITIONS
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  category VARCHAR(50) DEFAULT 'general',
  tags TEXT DEFAULT '[]',
  icon VARCHAR(50),
  color VARCHAR(20),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. WORKFLOW STEPS
CREATE TABLE IF NOT EXISTS workflow_steps (
  id VARCHAR(50) PRIMARY KEY,
  workflow_id VARCHAR(50) NOT NULL,
  step_type VARCHAR(30) NOT NULL CHECK(step_type IN (
    'start','end','task','approval','condition','parallel','sequential',
    'timer','delay','wait','escalation','rollback','compensation',
    'notification','sub_workflow','script'
  )),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  config TEXT DEFAULT '{}',
  step_order INT NOT NULL,
  branch_condition TEXT,
  retry_policy TEXT,
  timeout_ms INT,
  assigned_role VARCHAR(50),
  escalation_step_id VARCHAR(50),
  compensation_step_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
);

-- 3. WORKFLOW INSTANCES
CREATE TABLE IF NOT EXISTS workflow_instances (
  id VARCHAR(50) PRIMARY KEY,
  workflow_id VARCHAR(50) NOT NULL,
  workflow_version INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','running','paused','completed','failed','cancelled','suspended','timed_out'
  )),
  context TEXT DEFAULT '{}',
  variables TEXT DEFAULT '{}',
  started_by VARCHAR(50),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  priority INT DEFAULT 0,
  correlation_id VARCHAR(100),
  parent_instance_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id)
);

-- 4. WORKFLOW INSTANCE STEPS
CREATE TABLE IF NOT EXISTS workflow_instance_steps (
  id VARCHAR(50) PRIMARY KEY,
  instance_id VARCHAR(50) NOT NULL,
  step_id VARCHAR(50) NOT NULL,
  step_name VARCHAR(200) NOT NULL,
  step_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','running','completed','failed','skipped','waiting','timed_out','retrying'
  )),
  input TEXT DEFAULT '{}',
  output TEXT DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  assigned_to VARCHAR(50),
  completed_by VARCHAR(50),
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES workflow_steps(id)
);

-- 5. WORKFLOW VARIABLES (per-instance)
CREATE TABLE IF NOT EXISTS workflow_variables (
  id VARCHAR(50) PRIMARY KEY,
  instance_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  scope VARCHAR(20) DEFAULT 'local' CHECK(scope IN ('local','global','input','output')),
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE,
  UNIQUE(instance_id, name)
);

-- 6. WORKFLOW TIMERS
CREATE TABLE IF NOT EXISTS workflow_timers (
  id VARCHAR(50) PRIMARY KEY,
  instance_id VARCHAR(50),
  step_id VARCHAR(50),
  trigger_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','triggered','cancelled','expired')),
  action TEXT DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
);

-- 7. BUSINESS RULES
CREATE TABLE IF NOT EXISTS business_rules (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK(category IN (
    'validation','calculation','scheduling','approval','alert','automation','compliance','policy'
  )),
  domain VARCHAR(50) DEFAULT 'general',
  priority INT DEFAULT 0,
  conditions TEXT NOT NULL,
  actions TEXT NOT NULL,
  else_actions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','draft','deprecated','archived')),
  version INT DEFAULT 1,
  effectivity_start DATE,
  effectivity_end DATE,
  tags TEXT DEFAULT '[]',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. APPROVAL CHAINS
CREATE TABLE IF NOT EXISTS approval_chains (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK(category IN (
    'purchase','sales','hr','finance','inventory','restaurant','hotel','bar','general','compliance'
  )),
  levels INT NOT NULL DEFAULT 1,
  timeout_hours INT DEFAULT 48,
  auto_approve BOOLEAN DEFAULT FALSE,
  auto_reject BOOLEAN DEFAULT FALSE,
  require_all BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. APPROVAL CHAIN LEVELS
CREATE TABLE IF NOT EXISTS approval_chain_levels (
  id VARCHAR(50) PRIMARY KEY,
  chain_id VARCHAR(50) NOT NULL,
  level INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  approver_type VARCHAR(30) NOT NULL CHECK(approver_type IN (
    'owner','manager','finance','hr','inventory','purchasing','restaurant','hotel','bar','compliance','custom'
  )),
  approval_type VARCHAR(20) DEFAULT 'any' CHECK(approval_type IN ('any','all','specific','escalation')),
  timeout_hours INT DEFAULT 24,
  escalation_to INT,
  can_delegate BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (chain_id) REFERENCES approval_chains(id) ON DELETE CASCADE
);

-- 10. APPROVAL REQUESTS
CREATE TABLE IF NOT EXISTS approval_requests (
  id VARCHAR(50) PRIMARY KEY,
  instance_id VARCHAR(50),
  step_id VARCHAR(50),
  chain_id VARCHAR(50) NOT NULL,
  chain_version INT DEFAULT 1,
  context TEXT DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','approved','rejected','escalated','expired','skipped','cancelled'
  )),
  requested_by VARCHAR(50) NOT NULL,
  requested_from VARCHAR(50),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  comments TEXT,
  priority INT DEFAULT 0,
  expires_at TIMESTAMP,
  FOREIGN KEY (chain_id) REFERENCES approval_chains(id)
);

-- 11. APPROVAL ASSIGNMENTS
CREATE TABLE IF NOT EXISTS approval_assignments (
  id VARCHAR(50) PRIMARY KEY,
  request_id VARCHAR(50) NOT NULL,
  level INT NOT NULL,
  assigned_to VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending','approved','rejected','delegated','escalated','expired','skipped'
  )),
  comments TEXT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  delegated_to VARCHAR(50),
  FOREIGN KEY (request_id) REFERENCES approval_requests(id) ON DELETE CASCADE
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  role VARCHAR(50),
  type VARCHAR(20) NOT NULL CHECK(type IN ('in_app','push','email','sms','whatsapp','desktop')),
  category VARCHAR(20) NOT NULL CHECK(category IN (
    'info','warning','critical','approval','reminder','escalation','system','audit'
  )),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data TEXT DEFAULT '{}',
  channel VARCHAR(30) DEFAULT 'in_app',
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  delivered_at TIMESTAMP,
  source VARCHAR(50),
  source_id VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. NOTIFICATION CHANNELS (user preferences)
CREATE TABLE IF NOT EXISTS notification_channels (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK(channel IN ('in_app','push','email','sms','whatsapp','desktop')),
  enabled BOOLEAN DEFAULT TRUE,
  config TEXT DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, channel)
);

-- 14. NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  template TEXT NOT NULL,
  variables TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. SCHEDULED JOBS
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  workflow_id VARCHAR(50),
  workflow_input TEXT DEFAULT '{}',
  cron_expr VARCHAR(100),
  interval_seconds INT,
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  business_calendar_only BOOLEAN DEFAULT FALSE,
  max_retries INT DEFAULT 3,
  max_instances INT DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived','completed')),
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. SCHEDULED JOB INSTANCES
CREATE TABLE IF NOT EXISTS scheduled_job_instances (
  id VARCHAR(50) PRIMARY KEY,
  job_id VARCHAR(50) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','cancelled','skipped')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  workflow_instance_id VARCHAR(50),
  output TEXT,
  FOREIGN KEY (job_id) REFERENCES scheduled_jobs(id) ON DELETE CASCADE
);

-- 17. WORKFLOW AUDIT LOG
CREATE TABLE IF NOT EXISTS workflow_audit_log (
  id VARCHAR(50) PRIMARY KEY,
  instance_id VARCHAR(50),
  workflow_id VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  details TEXT DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. BUSINESS CALENDAR
CREATE TABLE IF NOT EXISTS business_calendar (
  id VARCHAR(50) PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  is_holiday BOOLEAN DEFAULT FALSE,
  is_weekend BOOLEAN DEFAULT FALSE,
  holiday_name VARCHAR(200),
  year INT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  day_of_week INT NOT NULL,
  is_business_day BOOLEAN DEFAULT TRUE
);

-- Indexes for workflow tables
CREATE INDEX IF NOT EXISTS idx_wf_status ON workflow_definitions(status);
CREATE INDEX IF NOT EXISTS idx_wf_category ON workflow_definitions(category);
CREATE INDEX IF NOT EXISTS idx_wf_step_workflow ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_step_order ON workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_wfi_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_wfi_workflow ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wfi_correlation ON workflow_instances(correlation_id);
CREATE INDEX IF NOT EXISTS idx_wfi_priority ON workflow_instances(status, priority);
CREATE INDEX IF NOT EXISTS idx_wfis_instance ON workflow_instance_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_wfis_status ON workflow_instance_steps(instance_id, status);
CREATE INDEX IF NOT EXISTS idx_wfv_instance ON workflow_variables(instance_id);
CREATE INDEX IF NOT EXISTS idx_wft_status ON workflow_timers(status);
CREATE INDEX IF NOT EXISTS idx_wft_trigger ON workflow_timers(trigger_at, status);
CREATE INDEX IF NOT EXISTS idx_br_category ON business_rules(category);
CREATE INDEX IF NOT EXISTS idx_br_domain ON business_rules(domain);
CREATE INDEX IF NOT EXISTS idx_br_status ON business_rules(status);
CREATE INDEX IF NOT EXISTS idx_br_priority ON business_rules(priority);
CREATE INDEX IF NOT EXISTS idx_ac_category ON approval_chains(category);
CREATE INDEX IF NOT EXISTS idx_acl_chain ON approval_chain_levels(chain_id);
CREATE INDEX IF NOT EXISTS idx_acl_level ON approval_chain_levels(chain_id, level);
CREATE INDEX IF NOT EXISTS idx_ar_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_ar_instance ON approval_requests(instance_id);
CREATE INDEX IF NOT EXISTS idx_ar_expires ON approval_requests(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_aas_request ON approval_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_aas_assigned ON approval_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_role ON notifications(role);
CREATE INDEX IF NOT EXISTS idx_notif_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_sent ON notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_nc_user ON notification_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_sj_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sj_next ON scheduled_jobs(next_run_at, status);
CREATE INDEX IF NOT EXISTS idx_sji_job ON scheduled_job_instances(job_id);
CREATE INDEX IF NOT EXISTS idx_sji_status ON scheduled_job_instances(status);
CREATE INDEX IF NOT EXISTS idx_sji_scheduled ON scheduled_job_instances(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_wal_instance ON workflow_audit_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_wal_workflow ON workflow_audit_log(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wal_created ON workflow_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_bc_date ON business_calendar(date);
CREATE INDEX IF NOT EXISTS idx_bc_year ON business_calendar(year, month);
CREATE INDEX IF NOT EXISTS idx_bc_business ON business_calendar(is_business_day);

-- ═══════════════════════════════════════════════════════════════════════════
-- P4-8: ENTERPRISE PLATFORM OPERATIONS, OBSERVABILITY & DISASTER RECOVERY
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. BACKUP RECORDS
CREATE TABLE IF NOT EXISTS backup_records (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK(type IN ('full','incremental','snapshot','wal')),
  status VARCHAR(20) NOT NULL CHECK(status IN ('running','completed','failed','verified')),
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT DEFAULT 0,
  checksum VARCHAR(128),
  encrypted BOOLEAN DEFAULT FALSE,
  retention_days INT DEFAULT 30,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  verified_at TIMESTAMP,
  error_message TEXT,
  metadata TEXT DEFAULT '{}',
  created_by VARCHAR(50)
);

-- 2. HEALTH CHECK HISTORY
CREATE TABLE IF NOT EXISTS health_check_history (
  id VARCHAR(50) PRIMARY KEY,
  check_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK(status IN ('pass','fail','warn')),
  component VARCHAR(100) NOT NULL,
  duration_ms INT NOT NULL,
  message TEXT,
  details TEXT DEFAULT '{}',
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. MONITORING METRICS
CREATE TABLE IF NOT EXISTS monitoring_metrics (
  id VARCHAR(50) PRIMARY KEY,
  metric_name VARCHAR(200) NOT NULL,
  metric_value REAL NOT NULL,
  metric_unit VARCHAR(30),
  labels TEXT DEFAULT '{}',
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(50) PRIMARY KEY,
  severity VARCHAR(20) NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  source VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved','dismissed')),
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP,
  resolved_by VARCHAR(50),
  resolved_at TIMESTAMP,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. DEPLOYMENT RECORDS
CREATE TABLE IF NOT EXISTS deployment_records (
  id VARCHAR(50) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK(environment IN ('development','staging','production')),
  status VARCHAR(20) NOT NULL CHECK(status IN ('pending','running','completed','failed','rolled_back')),
  commit_hash VARCHAR(64),
  branch VARCHAR(100),
  artifacts TEXT DEFAULT '[]',
  deployed_by VARCHAR(100),
  rollback_version VARCHAR(50),
  error_message TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INT DEFAULT 0
);

-- 6. REQUEST METRICS (per-endpoint)
CREATE TABLE IF NOT EXISTS request_metrics (
  id VARCHAR(50) PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(200) NOT NULL,
  status_code INT NOT NULL,
  duration_ms INT NOT NULL,
  request_id VARCHAR(50),
  user_id VARCHAR(50),
  user_role VARCHAR(30),
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. SLOW QUERY LOG
CREATE TABLE IF NOT EXISTS slow_query_log (
  id VARCHAR(50) PRIMARY KEY,
  query_text TEXT NOT NULL,
  duration_ms INT NOT NULL,
  params TEXT,
  source VARCHAR(100),
  request_id VARCHAR(50),
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for platform tables
CREATE INDEX IF NOT EXISTS idx_bkp_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_bkp_type ON backup_records(type);
CREATE INDEX IF NOT EXISTS idx_bkp_started ON backup_records(started_at);
CREATE INDEX IF NOT EXISTS idx_hch_type ON health_check_history(check_type);
CREATE INDEX IF NOT EXISTS idx_hch_status ON health_check_history(status);
CREATE INDEX IF NOT EXISTS idx_hch_component ON health_check_history(component, status);
CREATE INDEX IF NOT EXISTS idx_hch_checked ON health_check_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_mm_name ON monitoring_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_mm_recorded ON monitoring_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_mm_name_time ON monitoring_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_alert_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alert_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alert_category ON alerts(category);
CREATE INDEX IF NOT EXISTS idx_alert_created ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_dep_env ON deployment_records(environment);
CREATE INDEX IF NOT EXISTS idx_dep_status ON deployment_records(status);
CREATE INDEX IF NOT EXISTS idx_dep_version ON deployment_records(version);
CREATE INDEX IF NOT EXISTS idx_req_metrics_path ON request_metrics(path);
CREATE INDEX IF NOT EXISTS idx_req_metrics_recorded ON request_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_slow_query_duration ON slow_query_log(duration_ms);
CREATE INDEX IF NOT EXISTS idx_slow_query_recorded ON slow_query_log(recorded_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. AI COPILOT TABLES (P4-9)
-- ═══════════════════════════════════════════════════════════════════════════

-- 8a. AI CONVERSATIONS
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'New Conversation',
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8b. AI MESSAGES
CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(50) PRIMARY KEY,
  conversation_id VARCHAR(50) NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK(role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  tool_calls TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8c. AI AUDIT LOG
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL DEFAULT 'rule-based',
  prompt TEXT NOT NULL,
  response TEXT,
  tokens_used INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  safety_checks TEXT DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8d. AI CONTEXT CACHE
CREATE TABLE IF NOT EXISTS ai_context_cache (
  id VARCHAR(50) PRIMARY KEY,
  cache_key VARCHAR(200) NOT NULL UNIQUE,
  data TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8e. AI PROMPT TEMPLATES
CREATE TABLE IF NOT EXISTS ai_prompts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  intent VARCHAR(30) NOT NULL,
  template TEXT NOT NULL,
  variables TEXT DEFAULT '[]',
  domain VARCHAR(30),
  roles TEXT DEFAULT '[]',
  version INT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for AI tables
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_updated ON ai_conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_msg_created ON ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_audit_user ON ai_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_action ON ai_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_context_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_intent ON ai_prompts(intent);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_domain ON ai_prompts(domain);

-- M0-1: durable queue for failed ledger auto-posts (audit + retry)
CREATE TABLE IF NOT EXISTS ledger_post_failures (
  id VARCHAR(50) PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  reference_id VARCHAR(50),
  payload TEXT NOT NULL,
  error TEXT,
  resolved BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- M2-1: business / application metric counters (scraped by Prometheus)
CREATE TABLE IF NOT EXISTS metric_counters (
  name VARCHAR(100) NOT NULL,
  labels VARCHAR(255) DEFAULT '',
  value REAL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (name, labels)
);
