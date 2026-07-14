# ADR-0014: Enterprise HRMS & Payroll Architecture

**Status**: Accepted (2026-07-14)

**Domain**: Human Resources

**Applies to**: Backend (apps/backend)

---

## Context

DeepaBMS has 12 operational employees and domain modules for every business function. Employee costs are the largest operating expense. Payroll automation is the final critical business function before production readiness.

The existing `employees` table (id, name, role, phone, salary, status, join_date, access) and related tables (`employee_attendance`, `employee_leaves`, `employee_advances`) are rudimentary — no departments, designations, shifts, leave policies, or payroll calculation.

The organization needs:
- A complete HRMS covering the entire employee lifecycle from onboarding to exit
- Automated payroll calculation with statutory deductions (PF, ESI, PT)
- Attendance engine supporting multiple shifts, overtime, corrections
- Leave management with configurable policies, carry-forward, encashment
- Accounting integration to auto-generate payroll journal entries
- Analytics integration to feed payroll costs into BI dashboards
- Role-based approval workflows for leaves, loans, advances, reimbursements
- Audit trail for all employee-related changes

## Decision

### Aggregate Design

The HRMS comprises 20 entity aggregates:

| Entity | Table | Description |
|--------|-------|-------------|
| Department | `departments` | Org hierarchy with head, cost center |
| Designation | `designations` | Job titles with grade, salary band |
| Employee | `employees` + `employee_profiles` | Master record split across two tables |
| Shift | `shifts` | Shift definitions with times, grace periods |
| EmployeeShift | `employee_shifts` | Per-employee shift assignments |
| Attendance | `attendance` | Daily punch records with status |
| AttendanceCorrection | `attendance_corrections` | Correction requests with approval |
| HolidayCalendar | `holiday_calendar` | Public/restricted/optional holidays |
| LeaveTypeConfig | `leave_type_configs` | Leave policy definitions |
| LeaveBalance | `leave_balances` | Annual leave entitlement tracking |
| LeaveApplication | `leave_applications` | Leave requests with approval workflow |
| PayrollFrequencyConfig | `payroll_frequency_config` | Monthly/daily/hourly payroll config |
| SalaryStructure | `salary_structures` | Pay breakdown (basic, HRA, allowances) |
| SalaryComponent | `salary_components` | Earning/deduction line items |
| SalaryRevision | `salary_revisions` | Salary change history |
| PayrollRun | `payroll_runs` | Payroll period processing |
| EmployeePayroll | `employee_payrolls` | Per-employee pay calculation |
| EmployeeLoan | `employee_loans` | Loan disbursement with EMI tracking |
| HrAdvance | `hr_advances` | Salary advance requests |
| EmployeeReimbursement | `employee_reimbursements` | Expense reimbursement |
| PerformanceReview | `performance_reviews` | Appraisal records |
| TrainingRecord | `training_records` | Training and certifications |
| DisciplinaryRecord | `disciplinary_records` | Warnings and actions |
| ExitProcess | `exit_processes` | Resignation/termination workflow |

### Employee Master Design

The employee record is split across two tables:

```
employees (legacy, section 10)
├── id, name, role, phone, salary, status, join_date, access

employee_profiles (new, section 18) 1:1 with employees.id
├── employee_code, last_name, gender, dob, marital_status
├── department_id → departments.id
├── designation_id → designations.id
├── reporting_to_id → employees.id
├── employment_type, confirmation_date, exit_date
├── bank_account, pf_number, esi_number, pan_number, aadhaar
├── emergency_contact, address fields
└── photo_url, signature_url
```

### Attendance Engine

Attendance is recorded per employee per day (unique constraint on employee_id + date):

1. **Clock-in/out**: Optional timestamps recorded on punch
2. **Auto-status**: Based on shift comparison:
   - `clockIn > shift.start + grace` → status = 'late', lateMinutes calculated
   - `clockOut < shift.end - grace` → status = 'early_departure'
   - No clockIn + no clockOut → status = 'absent'
   - Both present → status = 'present'
3. **Worked hours**: Calculated from clockOut - clockIn
4. **Overtime**: Hours beyond `FULL_DAY_HOURS` (9) × OT_RATE_MULTIPLIER (2.0)
   - Capped at `MAX_OT_HOURS_PER_DAY` (4) / `MAX_OT_HOURS_PER_MONTH` (60)
5. **Corrections**: Request → approval workflow to modify clock-in/out

### Payroll Engine

The payroll calculation pipeline:

```
For each employee in payroll run:
  1. Load active salary structure
  2. Load attendance summary (present, absent, half-days, late, overtime) for period
  3. Load leave usage (paid leaves, unpaid leaves) for period
  4. Load active loan EMI
  5. Load unrecovered advance
  6. Load approved reimbursements
  7. Calculate:
     a. Earnings: basic + HRA + allowances + overtime + incentives + bonus
     b. Deductions: PF (12% of basic, capped 1800) + ESI (0.75% if ≤21000) + PT (200 if ≥15000) + IT + other
     c. Attendance deductions: absent_days × per_day_rate
     d. Leave deductions: unpaid_leave_days × per_day_rate
     e. Recoveries: loan EMI + advance installment
     f. Net pay = totalEarnings - totalDeductions - recoveries
     g. Employer costs: PF (12% of basic, capped 1800) + ESI (3.25% if ≤21000)
     h. CTC = totalEarnings + employerPF + employerESI
  8. Create employee_payroll record
```

Payroll run state machine: `draft → computed → approved → paid → locked`

- **Draft**: Initial state, editable
- **Computed**: Calculations done, payment not processed
- **Approved**: Manager approved, ready for payment
- **Paid**: Payment processed (cash/bank/cheque/UPI)
- **Locked**: Final state, no further changes

### Leave Management

Leave types are configurable in `leave_type_configs`:

| Leave | Days | Paid | Carry Forward | Encashable |
|-------|------|------|---------------|------------|
| Casual (CL) | 12 | Yes | 6 max | Yes |
| Sick (SL) | 12 | Yes | No | No |
| Earned (EL) | 15 | Yes | 30 max | Yes |
| Comp Off (CO) | 6 | Yes | 6 max | Yes |
| Maternity | 180 | Yes | No | No |
| Paternity | 15 | Yes | No | No |
| Loss of Pay | 365 | No | N/A | N/A |
| Bereavement | 3 | Yes | No | No |

Leave balance is computed as: `available = total + carried_forward - used - pending`

Balance is a computed column in the database (GENERATED ALWAYS AS).

### Accounting Integration

Payroll runs generate journal entries:

```
DR: Salary Expense Account          (total_gross_pay + employer_contributions)
CR: Salary Payable Account          (net_pay payable to employees)
CR: PF Payable Account              (employee PF + employer PF)
CR: ESI Payable Account             (employee ESI + employer ESI)
CR: TDS Payable Account             (income tax deducted)
CR: Loan Recovery Account           (loan EMI recovered)
CR: Advance Recovery Account        (advance recovered)
```

When paid through bank:
```
DR: Salary Payable Account          (net_pay)
CR: Bank Account                    (net_pay)
```

### Analytics Integration

Payroll publishes to analytics:
- `payroll_cost`: Total payroll expense
- `employee_count`: Active employee count
- `cost_per_employee`: Average cost per employee
- `department_profitability`: Updated with labour costs

Attendance publishes:
- `attendance_rate`: Present percentage
- `absenteeism`: Absent rate by department

### State Machines

**Leave**: `pending → approved | rejected | cancelled`
- Approved: deduct from balance (pending → used)
- Rejected: release pending balance
- Cancelled: restore pending balance

**Payroll Run**: `draft → computed → approved → paid → locked`
- Computed can revert to draft for recalculation
- Approved can revert to draft
- Paid and locked are terminal states

**Exit Process**: `requested → notice_period → clearance_pending → completed | cancelled`
- Clearance tracks checklist items before final settlement

### Biometric-Ready Architecture

The attendance `source` field supports: `manual | biometric | qr | gps | correction`

Future biometric adapters:
- Register biometric device → POST punches to `/api/hr/attendance`
- Device sends: employee_id, timestamp, type (in/out)
- System matches to shift, calculates status
- No changes needed to the core attendance model

## Consequences

### Positive
- **Complete employee lifecycle**: From onboarding to exit in one system
- **Statutory compliant**: PF, ESI, PT calculations built-in
- **Configurable leave**: Policies defined in DB, not code
- **State machine controlled**: No invalid transitions possible
- **Accounting ready**: Payroll journals auto-generated
- **Analytics ready**: KPIs published to BI layer
- **Biometric ready**: Adapter pattern for any device

### Negative
- **Complexity**: 24 new tables, 100+ repository methods, 55+ service methods
- **Data volume**: Daily attendance creates 365 records per employee per year
- **Payroll edge cases**: Retroactive adjustments, mid-month changes require careful handling

### Trade-offs
- **Two-table employee split**: Preserves backward compatibility with legacy `employees` table while adding 30+ new fields via `employee_profiles`
- **Generated balance column**: `leave_balances.available_days` is a computed column (no update needed) but requires SQLite 3.25+ for GENERATED ALWAYS AS
- **Payroll calculation in app code vs SQL**: Calculated in service layer (TypeScript) for debuggability and testability rather than SQL

## Future Roadmap

1. **Mobile Self-Service**: Attendance marking, leave applications, payslip viewing
2. **Biometric Device Integration**: Adapter for Mantra, BioMax, ZKTeco devices
3. **Recruitment Module**: Job postings, applicant tracking, interview scheduling
4. **Training & Certification**: Course catalog, enrollment, compliance tracking
5. **Advanced Payroll**: Arrears, bonus computation, full and final settlement
6. **Employee Portal**: Document upload, profile editing, org chart viewing
7. **Compliance Reports**: PF return, ESI return, Form 16, PT return
