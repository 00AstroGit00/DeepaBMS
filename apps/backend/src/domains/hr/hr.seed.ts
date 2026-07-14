import type { SeedModule } from '../../seed/types';
import { query, run } from '../../db';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const DEPARTMENTS = [
  { code: 'ADMIN', name: 'Administration', costCenter: 'CC-001' },
  { code: 'FRONT', name: 'Front Office & Reception', costCenter: 'CC-002' },
  { code: 'HK', name: 'Housekeeping', costCenter: 'CC-003' },
  { code: 'FNB', name: 'Food & Beverage', costCenter: 'CC-004' },
  { code: 'KITCHEN', name: 'Kitchen', costCenter: 'CC-005' },
  { code: 'BAR', name: 'Bar & Liquor', costCenter: 'CC-006' },
  { code: 'ACCT', name: 'Accounts & Finance', costCenter: 'CC-007' },
  { code: 'PURCH', name: 'Purchasing & Stores', costCenter: 'CC-008' },
  { code: 'MAINT', name: 'Maintenance', costCenter: 'CC-009' },
  { code: 'SEC', name: 'Security', costCenter: 'CC-010' },
];

const DESIGNATIONS = [
  {
    code: 'GM',
    name: 'General Manager',
    level: 1,
    minSalary: 80000,
    maxSalary: 150000,
    deptCode: 'ADMIN',
  },
  {
    code: 'FO_MGR',
    name: 'Front Office Manager',
    level: 2,
    minSalary: 35000,
    maxSalary: 60000,
    deptCode: 'FRONT',
  },
  {
    code: 'RECEPT',
    name: 'Receptionist',
    level: 3,
    minSalary: 12000,
    maxSalary: 25000,
    deptCode: 'FRONT',
  },
  {
    code: 'HK_MGR',
    name: 'Housekeeping Manager',
    level: 2,
    minSalary: 25000,
    maxSalary: 45000,
    deptCode: 'HK',
  },
  {
    code: 'HK_STAFF',
    name: 'Housekeeping Staff',
    level: 3,
    minSalary: 8000,
    maxSalary: 15000,
    deptCode: 'HK',
  },
  {
    code: 'FNB_MGR',
    name: 'F&B Manager',
    level: 2,
    minSalary: 30000,
    maxSalary: 55000,
    deptCode: 'FNB',
  },
  {
    code: 'CAPTAIN',
    name: 'Restaurant Captain',
    level: 3,
    minSalary: 15000,
    maxSalary: 25000,
    deptCode: 'FNB',
  },
  {
    code: 'WAITER',
    name: 'Waiter/Server',
    level: 4,
    minSalary: 8000,
    maxSalary: 15000,
    deptCode: 'FNB',
  },
  {
    code: 'CHEF',
    name: 'Head Chef',
    level: 2,
    minSalary: 40000,
    maxSalary: 80000,
    deptCode: 'KITCHEN',
  },
  {
    code: 'CDC',
    name: 'Chef de Cuisine',
    level: 3,
    minSalary: 25000,
    maxSalary: 45000,
    deptCode: 'KITCHEN',
  },
  {
    code: 'COMMIS',
    name: 'Commis Chef',
    level: 4,
    minSalary: 10000,
    maxSalary: 18000,
    deptCode: 'KITCHEN',
  },
  {
    code: 'BAR_MGR',
    name: 'Bar Manager',
    level: 2,
    minSalary: 30000,
    maxSalary: 55000,
    deptCode: 'BAR',
  },
  {
    code: 'BARTENDER',
    name: 'Bartender',
    level: 3,
    minSalary: 12000,
    maxSalary: 22000,
    deptCode: 'BAR',
  },
  {
    code: 'ACCT_MGR',
    name: 'Accounts Manager',
    level: 2,
    minSalary: 35000,
    maxSalary: 60000,
    deptCode: 'ACCT',
  },
  {
    code: 'ACCT_STAFF',
    name: 'Accountant',
    level: 3,
    minSalary: 15000,
    maxSalary: 30000,
    deptCode: 'ACCT',
  },
  {
    code: 'PURCH_MGR',
    name: 'Purchase Manager',
    level: 2,
    minSalary: 25000,
    maxSalary: 45000,
    deptCode: 'PURCH',
  },
  {
    code: 'STORE_KP',
    name: 'Store Keeper',
    level: 3,
    minSalary: 10000,
    maxSalary: 18000,
    deptCode: 'PURCH',
  },
  {
    code: 'MAINT_TECH',
    name: 'Maintenance Technician',
    level: 3,
    minSalary: 12000,
    maxSalary: 22000,
    deptCode: 'MAINT',
  },
  {
    code: 'SEC_GUARD',
    name: 'Security Guard',
    level: 3,
    minSalary: 8000,
    maxSalary: 15000,
    deptCode: 'SEC',
  },
  {
    code: 'TRAINEE',
    name: 'Trainee',
    level: 5,
    minSalary: 5000,
    maxSalary: 10000,
    deptCode: 'FNB',
  },
];

const SHIFTS = [
  {
    code: 'GEN',
    name: 'General',
    shiftType: 'general',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    lateThreshold: 15,
    earlyDepartureThreshold: 15,
    halfDayHours: 4.5,
    fullDayHours: 9,
    isNightShift: false,
  },
  {
    code: 'MORNING',
    name: 'Morning',
    shiftType: 'morning',
    startTime: '06:00',
    endTime: '14:00',
    graceMinutes: 10,
    lateThreshold: 15,
    earlyDepartureThreshold: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    isNightShift: false,
  },
  {
    code: 'AFTERNOON',
    name: 'Afternoon',
    shiftType: 'afternoon',
    startTime: '14:00',
    endTime: '22:00',
    graceMinutes: 10,
    lateThreshold: 15,
    earlyDepartureThreshold: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    isNightShift: false,
  },
  {
    code: 'NIGHT',
    name: 'Night',
    shiftType: 'night',
    startTime: '22:00',
    endTime: '06:00',
    graceMinutes: 10,
    lateThreshold: 15,
    earlyDepartureThreshold: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    isNightShift: true,
  },
  {
    code: 'SPLIT',
    name: 'Split',
    shiftType: 'split',
    startTime: '10:00',
    endTime: '22:00',
    graceMinutes: 15,
    lateThreshold: 15,
    earlyDepartureThreshold: 15,
    halfDayHours: 5,
    fullDayHours: 10,
    isNightShift: false,
  },
];

const LEAVE_TYPES = [
  {
    code: 'CL',
    name: 'Casual Leave',
    type: 'casual',
    daysPerCycle: 12,
    maxConsecutive: 5,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: true,
    carryForwardLimit: 6,
    isEncashable: true,
    minServiceDays: 60,
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    type: 'sick',
    daysPerCycle: 12,
    maxConsecutive: 3,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: false,
    carryForwardLimit: 0,
    isEncashable: false,
    minServiceDays: 30,
  },
  {
    code: 'EL',
    name: 'Earned Leave',
    type: 'earned',
    daysPerCycle: 15,
    maxConsecutive: 30,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: true,
    carryForwardLimit: 30,
    isEncashable: true,
    minServiceDays: 365,
  },
  {
    code: 'CO',
    name: 'Compensatory Off',
    type: 'comp_off',
    daysPerCycle: 6,
    maxConsecutive: 3,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: true,
    carryForwardLimit: 6,
    isEncashable: true,
    minServiceDays: 0,
  },
  {
    code: 'ML',
    name: 'Maternity Leave',
    type: 'maternity',
    daysPerCycle: 180,
    maxConsecutive: 180,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: false,
    carryForwardLimit: 0,
    isEncashable: false,
    minServiceDays: 180,
    genderRestriction: 'female',
  },
  {
    code: 'PL',
    name: 'Paternity Leave',
    type: 'paternity',
    daysPerCycle: 15,
    maxConsecutive: 15,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: false,
    carryForwardLimit: 0,
    isEncashable: false,
    minServiceDays: 180,
    genderRestriction: 'male',
  },
  {
    code: 'LOP',
    name: 'Loss of Pay',
    type: 'loss_of_pay',
    daysPerCycle: 365,
    maxConsecutive: 30,
    requiresApproval: true,
    isPaid: false,
    isCarryForward: false,
    carryForwardLimit: 0,
    isEncashable: false,
  },
  {
    code: 'BR',
    name: 'Bereavement Leave',
    type: 'bereavement',
    daysPerCycle: 3,
    maxConsecutive: 3,
    requiresApproval: true,
    isPaid: true,
    isCarryForward: false,
    carryForwardLimit: 0,
    isEncashable: false,
  },
];

const HOLIDAYS_2026 = [
  { name: "New Year's Day", date: '2026-01-01', type: 'public' },
  { name: 'Republic Day', date: '2026-01-26', type: 'public' },
  { name: 'Maha Shivaratri', date: '2026-02-15', type: 'public' },
  { name: 'Holi', date: '2026-03-04', type: 'public' },
  { name: 'Good Friday', date: '2026-04-03', type: 'public' },
  { name: 'May Day', date: '2026-05-01', type: 'public' },
  { name: 'Independence Day', date: '2026-08-15', type: 'public' },
  { name: 'Onam', date: '2026-08-28', type: 'public' },
  { name: 'Gandhi Jayanti', date: '2026-10-02', type: 'public' },
  { name: 'Dussehra', date: '2026-10-21', type: 'public' },
  { name: 'Deepawali', date: '2026-11-08', type: 'public' },
  { name: 'Christmas', date: '2026-12-25', type: 'public' },
  { name: 'Vishu', date: '2026-04-14', type: 'public' },
  { name: 'Eid-ul-Fitr', date: '2026-03-31', type: 'public' },
  { name: 'Eid-ul-Adha', date: '2026-06-07', type: 'public' },
  { name: 'Milad-un-Nabi', date: '2026-09-05', type: 'restricted' },
  {
    name: 'Sree Narayana Guru Jayanti',
    date: '2026-08-20',
    type: 'restricted',
  },
  { name: 'Kerala Piravi', date: '2026-11-01', type: 'public' },
];

const PAYROLL_FREQUENCIES = [
  {
    code: 'MONTHLY',
    name: 'Monthly Payroll',
    frequency: 'monthly',
    cutoffDay: 25,
    processDay: 28,
    paymentDay: 1,
  },
  {
    code: 'DAILY_WAGE',
    name: 'Daily Wages',
    frequency: 'daily',
    cutoffDay: 0,
    processDay: 0,
    paymentDay: 0,
  },
];

const EMPLOYEES = [
  {
    name: 'Admin User',
    role: 'owner',
    phone: '9999999991',
    salary: 100000,
    deptCode: 'ADMIN',
    desigCode: 'GM',
    joinDate: '2024-01-01',
  },
  {
    name: 'Manager',
    role: 'manager',
    phone: '9999999992',
    salary: 60000,
    deptCode: 'ADMIN',
    desigCode: 'FO_MGR',
    joinDate: '2024-01-15',
  },
  {
    name: 'Accountant',
    role: 'accountant',
    phone: '9999999993',
    salary: 35000,
    deptCode: 'ACCT',
    desigCode: 'ACCT_STAFF',
    joinDate: '2024-02-01',
  },
  {
    name: 'Cashier',
    role: 'cashier',
    phone: '9999999994',
    salary: 18000,
    deptCode: 'FRONT',
    desigCode: 'RECEPT',
    joinDate: '2024-03-01',
  },
  {
    name: 'Reception',
    role: 'reception',
    phone: '9999999995',
    salary: 15000,
    deptCode: 'FRONT',
    desigCode: 'RECEPT',
    joinDate: '2024-03-15',
  },
  {
    name: 'F&B Manager',
    role: 'fnb',
    phone: '9999999996',
    salary: 40000,
    deptCode: 'FNB',
    desigCode: 'FNB_MGR',
    joinDate: '2024-04-01',
  },
  {
    name: 'Head Chef',
    role: 'kitchen',
    phone: '9999999997',
    salary: 55000,
    deptCode: 'KITCHEN',
    desigCode: 'CHEF',
    joinDate: '2024-04-01',
  },
  {
    name: 'Bar Manager',
    role: 'barstaff',
    phone: '9999999998',
    salary: 35000,
    deptCode: 'BAR',
    desigCode: 'BAR_MGR',
    joinDate: '2024-05-01',
  },
  {
    name: 'Bartender',
    role: 'barstaff',
    phone: '9999999999',
    salary: 18000,
    deptCode: 'BAR',
    desigCode: 'BARTENDER',
    joinDate: '2024-06-01',
  },
  {
    name: 'Housekeeper',
    role: 'staff',
    phone: '9999999910',
    salary: 12000,
    deptCode: 'HK',
    desigCode: 'HK_STAFF',
    joinDate: '2024-06-15',
  },
  {
    name: 'Store Keeper',
    role: 'inventory',
    phone: '9999999911',
    salary: 15000,
    deptCode: 'PURCH',
    desigCode: 'STORE_KP',
    joinDate: '2024-07-01',
  },
  {
    name: 'Waiter',
    role: 'fnb',
    phone: '9999999912',
    salary: 10000,
    deptCode: 'FNB',
    desigCode: 'WAITER',
    joinDate: '2024-08-01',
  },
];

function accessForRole(role: string): string {
  if (role === 'owner') return 'owner';
  if (role === 'manager') return 'manager';
  return 'staff';
}

const DEFAULT_LEAVE_BALANCES: Record<string, number> = {
  CL: 12,
  SL: 12,
  EL: 15,
  CO: 6,
  LOP: 365,
};

const SHIFT_BY_DEPT: Record<string, string> = {
  KITCHEN: 'MORNING',
  BAR: 'AFTERNOON',
  SEC: 'NIGHT',
};

export const hrSeed: SeedModule = {
  name: 'hr',
  dependsOn: ['auth'],

  async run(): Promise<void> {
    try {
      const existing = await query('SELECT COUNT(*) as count FROM departments');
      if (existing[0].count > 0) {
        console.log('[hr.seed] Departments already exist, skipping...');
        return;
      }

      console.log('[hr.seed] Seeding HR domain...');

      // ── 1. Departments ──────────────────────────────────────────────

      const deptById: Record<string, string> = {};
      for (const d of DEPARTMENTS) {
        const id = uid('dept');
        await run(
          `INSERT INTO departments (id, code, name, cost_center, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [id, d.code, d.name, d.costCenter],
        );
        deptById[d.code] = id;
      }
      console.log(`[hr.seed]   Created ${DEPARTMENTS.length} departments`);

      // ── 2. Designations ────────────────────────────────────────────

      const desigById: Record<string, string> = {};
      for (const d of DESIGNATIONS) {
        const id = uid('desig');
        await run(
          `INSERT INTO designations (id, code, name, department_id, level, min_salary, max_salary, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            id,
            d.code,
            d.name,
            deptById[d.deptCode],
            d.level,
            d.minSalary,
            d.maxSalary,
          ],
        );
        desigById[d.code] = id;
      }
      console.log(`[hr.seed]   Created ${DESIGNATIONS.length} designations`);

      // ── 3. Shifts ──────────────────────────────────────────────────

      const shiftById: Record<string, string> = {};
      for (const s of SHIFTS) {
        const id = uid('shift');
        await run(
          `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time,
            grace_minutes, late_threshold, early_departure_threshold,
            half_day_hours, full_day_hours, is_night_shift, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            id,
            s.code,
            s.name,
            s.shiftType,
            s.startTime,
            s.endTime,
            s.graceMinutes,
            s.lateThreshold,
            s.earlyDepartureThreshold,
            s.halfDayHours,
            s.fullDayHours,
            s.isNightShift ? 1 : 0,
          ],
        );
        shiftById[s.code] = id;
      }
      console.log(`[hr.seed]   Created ${SHIFTS.length} shifts`);

      // ── 4. Leave Type Configs ──────────────────────────────────────

      const leaveTypeById: Record<string, string> = {};
      for (const lt of LEAVE_TYPES) {
        const id = uid('leave');
        const genderRest =
          'genderRestriction' in lt ? (lt as any).genderRestriction : null;
        await run(
          `INSERT INTO leave_type_configs
            (id, code, name, type, days_per_cycle, max_consecutive,
             requires_approval, is_paid, is_carry_forward, carry_forward_limit,
             is_encashable, min_service_days, gender_restriction, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            id,
            lt.code,
            lt.name,
            lt.type,
            lt.daysPerCycle,
            lt.maxConsecutive,
            lt.requiresApproval ? 1 : 0,
            lt.isPaid ? 1 : 0,
            lt.isCarryForward ? 1 : 0,
            lt.carryForwardLimit,
            lt.isEncashable ? 1 : 0,
            lt.minServiceDays,
            genderRest,
          ],
        );
        leaveTypeById[lt.code] = id;
      }
      console.log(
        `[hr.seed]   Created ${LEAVE_TYPES.length} leave type configs`,
      );

      // ── 5. Holiday Calendar 2026 ───────────────────────────────────

      for (const h of HOLIDAYS_2026) {
        const id = uid('hol');
        const year = parseInt(h.date.slice(0, 4), 10);
        const isOptional = h.type === 'restricted' ? 1 : 0;
        await run(
          `INSERT INTO holiday_calendar (id, name, date, year, type, is_optional, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [id, h.name, h.date, year, h.type, isOptional],
        );
      }
      console.log(`[hr.seed]   Created ${HOLIDAYS_2026.length} holidays`);

      // ── 6. Payroll Frequency Configs ───────────────────────────────

      for (const pf of PAYROLL_FREQUENCIES) {
        const id = uid('payf');
        await run(
          `INSERT INTO payroll_frequency_config (id, code, name, frequency, cutoff_day, process_day, payment_day, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            id,
            pf.code,
            pf.name,
            pf.frequency,
            pf.cutoffDay,
            pf.processDay,
            pf.paymentDay,
          ],
        );
      }
      console.log(
        `[hr.seed]   Created ${PAYROLL_FREQUENCIES.length} payroll frequency configs`,
      );

      // ── 7. Employees + Profiles + Shifts + Salary + Leave Balances ──

      for (let i = 0; i < EMPLOYEES.length; i++) {
        const emp = EMPLOYEES[i];

        // Check if already exists
        const existingEmp = await query(
          'SELECT id FROM employees WHERE phone = ?',
          [emp.phone],
        );
        if (existingEmp.length > 0) {
          console.log(
            `[hr.seed]   Employee ${emp.name} already exists, skipping...`,
          );
          continue;
        }

        const empId = uid('emp');
        const empCode = `EMP-${String(i + 1).padStart(3, '0')}`;
        const access = accessForRole(emp.role);

        await run(
          `INSERT INTO employees (id, name, role, phone, salary, status, join_date, access)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            empId,
            emp.name,
            emp.role,
            emp.phone,
            emp.salary,
            emp.joinDate,
            access,
          ],
        );

        await run(
          `INSERT INTO employee_profiles
            (employee_id, employee_code, department_id, designation_id,
             employment_type, gender, nationality, marital_status)
           VALUES (?, ?, ?, ?, 'permanent', 'male', 'Indian', 'single')`,
          [empId, empCode, deptById[emp.deptCode], desigById[emp.desigCode]],
        );

        // Shift assignment
        const shiftCode = SHIFT_BY_DEPT[emp.deptCode] || 'GEN';
        const shiftId2 = shiftById[shiftCode];
        const shiftAssignId = uid('esft');
        await run(
          `INSERT INTO employee_shifts (id, employee_id, shift_id, effective_from, is_active)
           VALUES (?, ?, ?, ?, 1)`,
          [shiftAssignId, empId, shiftId2, emp.joinDate],
        );

        // Salary structure
        const gross = emp.salary;
        const basicPay = Math.round(gross * 0.5 * 100) / 100;
        const hra = Math.round(gross * 0.2 * 100) / 100;
        const conveyanceAllowance = 1600;
        const medicalAllowance = 1250;
        const specialAllowance =
          Math.round(
            (gross - basicPay - hra - conveyanceAllowance - medicalAllowance) *
              100,
          ) / 100;
        const salaryStructId = uid('sal');
        const empPf = Math.round(gross * 0.12 * 100) / 100;
        await run(
          `INSERT INTO salary_structures
            (id, employee_id, effective_from, is_active, gross_salary,
             basic_pay, hra, conveyance_allowance, medical_allowance,
             special_allowance, employer_pf, employer_esi)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            salaryStructId,
            empId,
            emp.joinDate,
            gross,
            basicPay,
            hra,
            conveyanceAllowance,
            medicalAllowance,
            specialAllowance,
            empPf,
          ],
        );

        // Leave balances
        for (const [ltCode, days] of Object.entries(DEFAULT_LEAVE_BALANCES)) {
          const ltId = leaveTypeById[ltCode];
          if (!ltId) continue;
          const balId = uid('lbal');
          await run(
            `INSERT INTO leave_balances
              (id, employee_id, leave_type_id, year, total_days,
               used_days, pending_days, carried_forward)
             VALUES (?, ?, ?, 2026, ?, 0, 0, 0)`,
            [balId, empId, ltId, days],
          );
        }
      }
      console.log(
        `[hr.seed]   Created ${EMPLOYEES.length} employees with profiles, shifts, salary structures & leave balances`,
      );

      console.log('[hr.seed] HR seeding complete.');
    } catch (err) {
      console.error('[hr.seed] Seeding failed:', err);
    }
  },

  async verify(): Promise<boolean> {
    const result = await query('SELECT COUNT(*) as count FROM departments');
    return result[0].count >= DEPARTMENTS.length;
  },
};
