# Enterprise HRMS & Payroll Architecture

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                 HRMS & PAYROLL DOMAIN (P4-4)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Routes (84 endpoints)                                                       │
│  ├── /api/hr/departments/*       → Department CRUD + tree                   │
│  ├── /api/hr/designations/*      → Designation CRUD                         │
│  ├── /api/hr/employees/*         → Employee lifecycle                        │
│  ├── /api/hr/shifts/*            → Shift management + assignment            │
│  ├── /api/hr/attendance/*        → Attendance engine                        │
│  ├── /api/hr/holidays/*          → Holiday calendar                         │
│  ├── /api/hr/leaves/*            → Leave management                         │
│  ├── /api/hr/payroll/*           → Payroll engine                           │
│  ├── /api/hr/loans/*             → Loan management                          │
│  ├── /api/hr/advances/*          → Salary advances                          │
│  ├── /api/hr/reimbursements/*    → Expense reimbursements                   │
│  ├── /api/hr/performance/*       → Performance reviews                      │
│  ├── /api/hr/training/*          → Training records                         │
│  ├── /api/hr/disciplinary/*      → Disciplinary records                     │
│  ├── /api/hr/exit/*              → Exit process                             │
│  ├── /api/hr/reports/*           → HR reports                               │
│  └── /api/hr/integration/*       → Accounting + analytics hooks             │
│                                                                              │
│  Service Modules (55+ methods)                                               │
│  ├── EmployeeService             → CRUD, org chart, reports                 │
│  ├── AttendanceEngine            → Marking, summary, corrections            │
│  ├── LeaveEngine                 → Apply, approve, balance, carry-forward   │
│  ├── PayrollEngine               → Calculate, run, approve, pay, lock      │
│  ├── LoanAdvanceService          → Loans, advances, recovery               │
│  ├── PerformanceService          → Reviews, acknowledgements               │
│  ├── ExitService                 → Initiate, clear, complete               │
│  ├── ReportingService            → Headcount, attrition, labour cost       │
│  └── IntegrationService          → Accounting journals, analytics KPIs      │
│                                                                              │
│  Repository (130+ methods)                                                   │
│  ├── Department (6)             → CRUD + tree                               │
│  ├── Designation (6)            → CRUD + by-department                      │
│  ├── Employee (12)              → CRUD across 2 tables + search             │
│  ├── Shift (6)                  → CRUD + assignment                         │
│  ├── Attendance (12)            → CRUD + summary + corrections              │
│  ├── Holiday (6)                → CRUD + by-year/range                     │
│  ├── Leave Type (6)             → CRUD                                      │
│  ├── Leave Balance (5)          → CRUD + deduct                             │
│  ├── Leave App (8)              → CRUD + workflow                           │
│  ├── Payroll (19)               → Frequency, structure, run, payment       │
│  ├── Loan (6)                   → CRUD + EMI                                │
│  ├── Advance (6)                → CRUD + recovery                           │
│  ├── Reimbursement (6)          → CRUD + approval                           │
│  ├── Performance (5)            → CRUD + acknowledgement                   │
│  ├── Training (5)               → CRUD + status                             │
│  ├── Disciplinary (5)           → CRUD + deactivate                         │
│  ├── Exit (6)                   → CRUD + workflow                           │
│  └── Utility (5)                → Reports, headcount, org chart            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
departments (1:N) ── designations
departments (1:N) ── employees.employee_profiles.department_id

employees (1:1) ── employee_profiles
employees (1:N) ── employee_shifts ── shifts

employees (1:N) ── attendance
employees (1:N) ── attendance_corrections
employees (1:N) ── leave_applications ── leave_type_configs
employees (1:N) ── leave_balances ── leave_type_configs
employees (1:N) ── salary_structures ── salary_components
employees (1:N) ── salary_revisions
employees (1:N) ── employee_loans
employees (1:N) ── hr_advances
employees (1:N) ── employee_reimbursements
employees (1:N) ── performance_reviews
employees (1:N) ── training_records
employees (1:N) ── disciplinary_records
employees (1:1) ── exit_processes

salary_structures (1:N) ── salary_components
payroll_runs (1:N) ── employee_payrolls ── employees
payroll_runs (1:1) ── journal_entries (accounting)
```

## Payroll Calculation Flow

```
runPayroll(dto):
  │
  ├── 1. Create payroll_run (status=draft)
  │
  ├── 2. For each active employee:
  │     ├── Load salary_structure (active, effective)
  │     ├── Load attendance summary for period
  │     │     ├── present_count, absent_count
  │     │     ├── half_day_count, late_count
  │     │     └── overtime_hours
  │     ├── Load leave usage for period
  │     │     ├── paid_leave_days
  │     │     └── unpaid_leave_days
  │     ├── Load active loans (EMI amount)
  │     ├── Load unrecovered advances
  │     └── Load approved reimbursements
  │     │
  │     └── 3. CalculateEmployeePayroll(input):
  │           ├── Earnings:
  │           │   ├── basicPay (fixed)
  │           │   ├── HRA (fixed)
  │           │   ├── allowances (conveyance, medical, special)
  │           │   ├── overtimePay = ot_hours × 2 × (gross / 9 / 30)
  │           │   └── grossPay = sum of all earnings
  │           │
  │           ├── Deductions:
  │           │   ├── PF = min(basic × 12%, 1800)
  │           │   ├── ESI = gross ≤ 21000 ? gross × 0.75% : 0
  │           │   ├── PT = gross ≥ 15000 ? 200 : 0
  │           │   ├── attendanceDeductions = absent × perDayRate
  │           │   ├── leaveDeductions = unpaidLeaves × perDayRate
  │           │   └── totalDeductions = sum
  │           │
  │           ├── Recoveries:
  │           │   ├── loanRecovery (EMI amount)
  │           │   └── advanceRecovery (installment)
  │           │
  │           ├── Net = grossPay + OT - deductions - recoveries
  │           │
  │           └── Employer:
  │               ├── employerPF = min(basic × 12%, 1800)
  │               ├── employerESI = gross ≤ 21000 ? gross × 3.25% : 0
  │               └── CTC = grossPay + employerPF + employerESI
  │
  ├── 4. Create employee_payroll for each employee
  ├── 5. Update payroll_run totals
  │     ├── total_gross_pay = sum of all employee grossPay
  │     ├── total_deductions = sum of all employee totalDeductions
  │     ├── total_net_pay = sum of all employee netPay
  │     └── employee_count = number of employees processed
  │
  └── 6. Return payroll_run with employee_payrolls
```

## State Machines

### Leave Status
```
                     ┌───────┐
                     │pending│
                     └───┬───┘
                  ┌──────┼──────┐
                  ▼      ▼      ▼
              ┌──────┐ ┌──────┐ ┌─────────┐
              │approved│ │rejected│ │cancelled│
              └───────┘ └──────┘ └─────────┘
```

### Payroll Run Status
```
  draft ──► computed ──► approved ──► paid ──► locked
    ▲          ▲
    └──────────┘ (recalculate)
```

### Exit Process Status
```
  requested ──► notice_period ──► clearance_pending ──► completed
      │
      └──► cancelled
```

## File Structure

```
src/domains/hr/
├── hr.types.ts            # 30+ interfaces, 20+ type aliases, 10+ enums, constants
├── hr.repository.ts       # 130+ data access methods across 20+ entities (~2387 lines)
├── hr.service.ts          # 9 service modules, 55+ business logic methods (~2066 lines)
├── hr.routes.ts           # 84 REST endpoints (~1259 lines)
└── hr.seed.ts             # 10 departments, 20 designations, 5 shifts, 8 leave types,
                           # 18 holidays, 2 payroll freqs, 12 employees with profiles

tests/hr.test.ts           # 217 test cases across 20 describe blocks (~2732 lines)
```

## API Summary (84 endpoints)

| Category | Endpoints | Auth Roles |
|----------|-----------|------------|
| Departments | 6 | owner, manager |
| Designations | 6 | owner, manager |
| Employees | 12 | owner, manager, accountant |
| Shifts | 6 | owner, manager |
| Attendance | 12 | owner, manager, accountant |
| Holidays | 5 | owner, manager |
| Leaves | 12 | owner, manager, accountant |
| Payroll | 14 | owner, manager, accountant |
| Loans | 5 | owner, manager |
| Advances | 5 | owner, manager |
| Reimbursements | 5 | owner, manager, accountant |
| Performance | 4 | owner, manager |
| Training | 4 | owner, manager |
| Disciplinary | 4 | owner, manager |
| Exit | 5 | owner, manager |
| Reports | 6 | owner, manager, accountant |
| Integration | 3 | owner, accountant |

## Key Constants

| Constant | Value | Notes |
|----------|-------|-------|
| PF_EMPLOYEE_RATE | 12% | Capped at ₹1,800/month |
| PF_EMPLOYER_RATE | 12% | Capped at ₹1,800/month |
| ESI_EMPLOYEE_RATE | 0.75% | Only if gross ≤ ₹21,000 |
| ESI_EMPLOYER_RATE | 3.25% | Only if gross ≤ ₹21,000 |
| PT_THRESHOLD | ₹15,000 | Professional Tax applies above |
| PT_AMOUNT | ₹200 | Monthly Professional Tax |
| OT_RATE_MULTIPLIER | 2.0x | Double the hourly rate |
| FULL_DAY_HOURS | 9h | Standard work day |
| HALF_DAY_HOURS | 4.5h | Minimum for half-day |
| MAX_OT_PER_DAY | 4h | Legal maximum |
| MAX_OT_PER_MONTH | 60h | Legal maximum |
| MIN_WAGE_HOURLY | ₹75 | Minimum hourly wage |
| MIN_WAGE_DAILY | ₹600 | Minimum daily wage |
