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
  role VARCHAR(20) NOT NULL CHECK(role IN ('owner', 'manager', 'cashier', 'reception', 'fnb', 'barstaff', 'accountant')),
  pin_hash VARCHAR(100) NOT NULL, -- Scrypt/Bcrypt hashes
  active BOOLEAN DEFAULT TRUE,
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
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL CHECK(category IN ('food', 'softdrink', 'kitchen', 'housekeeping', 'consumables')),
  unit VARCHAR(10) NOT NULL,
  stock DECIMAL(10, 2) DEFAULT 0.00,
  reorder DECIMAL(10, 2) DEFAULT 0.00,
  cost DECIMAL(10, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS inventory_moves (
  id VARCHAR(50) PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  item_id VARCHAR(50) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  kind VARCHAR(10) NOT NULL CHECK(kind IN ('in', 'out', 'wastage')),
  qty DECIMAL(10, 2) NOT NULL CHECK(qty > 0),
  operator VARCHAR(100) NOT NULL,
  note VARCHAR(255) NULL,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE CASCADE
);

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
CREATE INDEX IF NOT EXISTS idx_moves_item ON inventory_moves(item_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON credit_ledger(account_id);
