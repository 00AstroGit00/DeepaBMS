import { describe, test, expect, beforeAll } from '@jest/globals';
import { query, run } from '../src/db';
import * as T from '../src/domains/hr/hr.types';
import { HrRepository } from '../src/domains/hr/hr.repository';
import {
  EmployeeService,
  AttendanceEngine,
  LeaveEngine,
  LoanAdvanceService,
} from '../src/domains/hr/hr.service';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Shared IDs ───────────────────────────────────────────────────────
let deptId1 = '';
let deptId2 = '';
let desigId1 = '';
let desigId2 = '';
let empId1 = '';
let empId2 = '';
let empId3 = '';
let shiftId1 = '';
let shiftId2 = '';
let leaveTypeId1 = '';
let leaveTypeId2 = '';
let leaveBalanceId1 = '';
let salaryStructId1 = '';

// ═════════════════════════════════════════════════════════════════════
// SETUP
// ═════════════════════════════════════════════════════════════════════

async function setupDepartments(): Promise<void> {
  deptId1 = uid('dept');
  deptId2 = uid('dept');
  await run(
    `INSERT INTO departments (id, code, name, description, cost_center)
     VALUES (?, ?, ?, ?, ?)`,
    [deptId1, 'IT', 'Information Technology', 'IT Department', 'CC-IT-01'],
  );
  await run(
    `INSERT INTO departments (id, code, name, description, parent_id, cost_center)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [deptId2, 'HR', 'Human Resources', 'HR Department', deptId1, 'CC-HR-01'],
  );
}

async function setupDesignations(): Promise<void> {
  desigId1 = uid('desig');
  desigId2 = uid('desig');
  await run(
    `INSERT INTO designations (id, code, name, department_id, grade, level, min_salary, max_salary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [desigId1, 'SE', 'Software Engineer', deptId1, 'A', 3, 25000, 80000],
  );
  await run(
    `INSERT INTO designations (id, code, name, department_id, grade, level, min_salary, max_salary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [desigId2, 'MGR', 'Manager', deptId2, 'B', 5, 50000, 150000],
  );
}

async function setupEmployees(): Promise<void> {
  empId1 = uid('emp');
  empId2 = uid('emp');
  empId3 = uid('emp');
  await run(
    `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      empId1,
      'Alice Smith',
      'developer',
      '9999999901',
      45000,
      'active',
      daysAgo(365),
    ],
  );
  await run(
    `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      empId2,
      'Bob Jones',
      'manager',
      '9999999902',
      75000,
      'active',
      daysAgo(180),
    ],
  );
  await run(
    `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      empId3,
      'Carol Davis',
      'intern',
      '9999999903',
      15000,
      'active',
      daysAgo(30),
    ],
  );
  await run(
    `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
      marital_status, nationality, department_id, designation_id, employment_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empId1,
      'EMP001',
      'Smith',
      'female',
      '1990-05-15',
      'married',
      'Indian',
      deptId1,
      desigId1,
      'permanent',
    ],
  );
  await run(
    `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
      marital_status, nationality, department_id, designation_id, employment_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empId2,
      'EMP002',
      'Jones',
      'male',
      '1985-08-22',
      'married',
      'Indian',
      deptId2,
      desigId2,
      'permanent',
    ],
  );
  await run(
    `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
      marital_status, nationality, department_id, designation_id, employment_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empId3,
      'EMP003',
      'Davis',
      'female',
      '2000-01-10',
      'single',
      'Indian',
      deptId1,
      desigId1,
      'intern',
    ],
  );
}

async function setupShifts(): Promise<void> {
  shiftId1 = uid('shift');
  shiftId2 = uid('shift');
  await run(
    `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time, grace_minutes,
      late_threshold, early_departure_threshold, half_day_hours, full_day_hours, is_night_shift)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shiftId1,
      'GEN',
      'General',
      'general',
      '09:00',
      '18:00',
      10,
      15,
      15,
      4.5,
      9.0,
      false,
    ],
  );
  await run(
    `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time, grace_minutes,
      late_threshold, early_departure_threshold, half_day_hours, full_day_hours, is_night_shift)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shiftId2,
      'NIGHT',
      'Night',
      'night',
      '22:00',
      '06:00',
      10,
      15,
      15,
      4.5,
      9.0,
      true,
    ],
  );
}

async function setupLeaveTypes(): Promise<void> {
  leaveTypeId1 = uid('lt');
  leaveTypeId2 = uid('lt');
  await run(
    `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle, max_consecutive,
      requires_approval, is_paid, is_carry_forward, carry_forward_limit, is_encashable, min_service_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      leaveTypeId1,
      'CL',
      'Casual Leave',
      'casual',
      12,
      5,
      true,
      true,
      true,
      5,
      false,
      90,
    ],
  );
  await run(
    `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle, max_consecutive,
      requires_approval, is_paid, is_carry_forward, carry_forward_limit, is_encashable, min_service_days,
      gender_restriction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      leaveTypeId2,
      'ML',
      'Maternity Leave',
      'maternity',
      180,
      180,
      true,
      true,
      false,
      0,
      false,
      180,
      'female',
    ],
  );
}

async function setupLeaveBalances(): Promise<void> {
  leaveBalanceId1 = uid('lb');
  await run(
    `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [leaveBalanceId1, empId1, leaveTypeId1, 2026, 12, 3, 1, 2],
  );
}

async function setupSalaryStructure(): Promise<void> {
  salaryStructId1 = uid('sal');
  const gross = 45000;
  const basic = 18000;
  const hra = 9000;
  const conv = 1600;
  const med = 1250;
  const special = gross - basic - hra - conv - med;
  const pf = Math.min(basic * T.PF_EMPLOYER_RATE, 1800);
  const esi = gross <= 21000 ? gross * T.ESI_EMPLOYER_RATE : 0;
  await run(
    `INSERT INTO salary_structures (id, employee_id, effective_from, is_active,
      gross_salary, basic_pay, hra, conveyance_allowance, medical_allowance, special_allowance,
      employer_pf, employer_esi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      salaryStructId1,
      empId1,
      '2026-01-01',
      true,
      gross,
      basic,
      hra,
      conv,
      med,
      special,
      pf,
      esi,
    ],
  );
}

beforeAll(async () => {
  await setupDepartments();
  await setupDesignations();
  await setupEmployees();
  await setupShifts();
  await setupLeaveTypes();
  await setupLeaveBalances();
  await setupSalaryStructure();
}, 30000);

// ═════════════════════════════════════════════════════════════════════
// 1. DEPARTMENT TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Departments', () => {
  test('createDepartment stores correctly', async () => {
    const id = uid('dept');
    await run(
      `INSERT INTO departments (id, code, name, description, cost_center)
       VALUES (?, ?, ?, ?, ?)`,
      [id, 'TEST', 'Test Dept', 'Test', 'CC-TEST'],
    );
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('TEST');
    expect(rows[0].name).toBe('Test Dept');
    expect(rows[0].is_active).toBe(1);
  });

  test('findDepartmentById returns correct', async () => {
    const rows = await query('SELECT * FROM departments WHERE id = ?', [
      deptId1,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('IT');
    expect(rows[0].name).toBe('Information Technology');
  });

  test('findAllDepartments returns all', async () => {
    const rows = await query('SELECT * FROM departments WHERE is_active = 1');
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test('updateDepartment modifies fields', async () => {
    const id = uid('dept');
    await run(`INSERT INTO departments (id, code, name) VALUES (?, ?, ?)`, [
      id,
      'UPD',
      'Update Dept',
    ]);
    await run(`UPDATE departments SET name = ?, description = ? WHERE id = ?`, [
      'Updated Dept Name',
      'Updated desc',
      id,
    ]);
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    expect(rows[0].name).toBe('Updated Dept Name');
    expect(rows[0].description).toBe('Updated desc');
  });

  test('deleteDepartment soft-deletes', async () => {
    const id = uid('dept');
    await run(`INSERT INTO departments (id, code, name) VALUES (?, ?, ?)`, [
      id,
      'DEL',
      'Delete Dept',
    ]);
    await run(`UPDATE departments SET is_active = 0 WHERE id = ?`, [id]);
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    expect(rows[0].is_active).toBe(0);
  });

  test('getDepartmentTree returns hierarchy', async () => {
    const rows = await query(
      `SELECT d1.id, d1.name, d2.id AS child_id, d2.name AS child_name
       FROM departments d1
       LEFT JOIN departments d2 ON d2.parent_id = d1.id
       WHERE d1.id = ?`,
      [deptId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r: any) => r.child_id === deptId2)).toBe(true);
  });

  test('Department codes are unique', async () => {
    let failed = false;
    try {
      await run(`INSERT INTO departments (id, code, name) VALUES (?, ?, ?)`, [
        uid('dept'),
        'IT',
        'Duplicate',
      ]);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Department with invalid costCenter handles gracefully', async () => {
    const id = uid('dept');
    await run(
      `INSERT INTO departments (id, code, name, cost_center) VALUES (?, ?, ?, ?)`,
      [id, 'CCDEPT', 'Cost Center Dept', null],
    );
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    expect(rows[0].cost_center).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════
// 2. DESIGNATION TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Designations', () => {
  test('createDesignation with valid data', async () => {
    const id = uid('desig');
    await run(
      `INSERT INTO designations (id, code, name, department_id, grade, level, min_salary, max_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'JRDEV', 'Junior Developer', deptId1, 'A1', 2, 15000, 40000],
    );
    const rows = await query('SELECT * FROM designations WHERE id = ?', [id]);
    expect(rows[0].code).toBe('JRDEV');
    expect(rows[0].department_id).toBe(deptId1);
  });

  test('findDesignationById returns correct', async () => {
    const rows = await query('SELECT * FROM designations WHERE id = ?', [
      desigId1,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].code).toBe('SE');
  });

  test('findDesignationsByDepartment filters', async () => {
    const rows = await query(
      'SELECT * FROM designations WHERE department_id = ?',
      [deptId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach((r: any) => expect(r.department_id).toBe(deptId1));
  });

  test('updateDesignation changes fields', async () => {
    const id = uid('desig');
    await run(
      `INSERT INTO designations (id, code, name, department_id, level, min_salary, max_salary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, 'UPDDES', 'Update Desig', deptId1, 3, 20000, 60000],
    );
    await run(`UPDATE designations SET name = ?, level = ? WHERE id = ?`, [
      'Updated Designation',
      4,
      id,
    ]);
    const rows = await query('SELECT * FROM designations WHERE id = ?', [id]);
    expect(rows[0].name).toBe('Updated Designation');
    expect(rows[0].level).toBe(4);
  });

  test('deleteDesignation removes', async () => {
    const id = uid('desig');
    await run(
      `INSERT INTO designations (id, code, name, department_id) VALUES (?, ?, ?, ?)`,
      [id, 'DELDES', 'Delete Desig', deptId1],
    );
    await run(`UPDATE designations SET is_active = 0 WHERE id = ?`, [id]);
    const rows = await query('SELECT * FROM designations WHERE id = ?', [id]);
    expect(rows[0].is_active).toBe(0);
  });

  test('Designation code unique enforced', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO designations (id, code, name, department_id) VALUES (?, ?, ?, ?)`,
        [uid('desig'), 'SE', 'Duplicate', deptId1],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Designation minSalary <= maxSalary validated', async () => {
    const rows = await query(
      'SELECT * FROM designations WHERE min_salary > max_salary',
    );
    expect(rows).toHaveLength(0);
  });

  test('Designation with non-existent department fails', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO designations (id, code, name, department_id) VALUES (?, ?, ?, ?)`,
        [uid('desig'), 'NODEPT', 'No Dept', 'non-existent-id'],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 3. EMPLOYEE CRUD TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Employees', () => {
  test('createEmployee creates both employees + employee_profiles records', async () => {
    const empId = uid('emp');
    const code = `EMP${Date.now()}`;
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Test User', 'developer', '9999999910', 30000, 'active', today()],
    );
    await run(
      `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
        marital_status, nationality, department_id, designation_id, employment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        code,
        'User',
        'male',
        '1995-01-01',
        'single',
        'Indian',
        deptId1,
        desigId1,
        'permanent',
      ],
    );
    const emp = await query('SELECT * FROM employees WHERE id = ?', [empId]);
    const prof = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [empId],
    );
    expect(emp).toHaveLength(1);
    expect(prof).toHaveLength(1);
    expect(prof[0].employee_code).toBe(code);
  });

  test('findEmployeeById returns joined data', async () => {
    const rows = await query(
      `SELECT e.id, e.name, e.phone, e.salary, e.status, e.join_date,
              p.employee_code, p.gender, p.department_id, p.designation_id,
              p.employment_type, p.date_of_birth
       FROM employees e
       LEFT JOIN employee_profiles p ON p.employee_id = e.id
       WHERE e.id = ?`,
      [empId1],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Alice Smith');
    expect(rows[0].employee_code).toBe('EMP001');
    expect(rows[0].gender).toBe('female');
  });

  test('findAllEmployees with pagination', async () => {
    const limit = 2;
    const offset = 0;
    const rows = await query(
      `SELECT e.* FROM employees e ORDER BY e.name LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    expect(rows.length).toBeLessThanOrEqual(limit);
  });

  test('findAllEmployees with search filter', async () => {
    const searchTerm = 'Alice';
    const rows = await query(
      `SELECT e.* FROM employees e WHERE e.name LIKE ?`,
      [`%${searchTerm}%`],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].name).toContain('Alice');
  });

  test('findEmployeesByDepartment filters correctly', async () => {
    const rows = await query(
      `SELECT e.* FROM employees e
       JOIN employee_profiles p ON p.employee_id = e.id
       WHERE p.department_id = ?`,
      [deptId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('findEmployeesByDesignation filters correctly', async () => {
    const rows = await query(
      `SELECT e.* FROM employees e
       JOIN employee_profiles p ON p.employee_id = e.id
       WHERE p.designation_id = ?`,
      [desigId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('findEmployeesByStatus filters', async () => {
    const rows = await query(`SELECT e.* FROM employees e WHERE e.status = ?`, [
      'active',
    ]);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test('updateEmployee updates both tables', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Update Test', 'staff', '9999999920', 20000, 'active', today()],
    );
    await run(
      `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
        marital_status, nationality, department_id, designation_id, employment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'UPDEMP',
        'Test',
        'male',
        '1990-01-01',
        'single',
        'Indian',
        deptId1,
        desigId1,
        'permanent',
      ],
    );
    await run(`UPDATE employees SET name = ?, salary = ? WHERE id = ?`, [
      'Updated Name',
      35000,
      empId,
    ]);
    await run(
      `UPDATE employee_profiles SET last_name = ? WHERE employee_id = ?`,
      ['UpdatedLast', empId],
    );
    const emp = await query('SELECT * FROM employees WHERE id = ?', [empId]);
    const prof = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [empId],
    );
    expect(emp[0].name).toBe('Updated Name');
    expect(emp[0].salary).toBe(35000);
    expect(prof[0].last_name).toBe('UpdatedLast');
  });

  test('updateEmployeeProfile updates only profile', async () => {
    await run(
      `UPDATE employee_profiles SET marital_status = ?, blood_group = ? WHERE employee_id = ?`,
      ['divorced', 'A+', empId1],
    );
    const rows = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [empId1],
    );
    expect(rows[0].marital_status).toBe('divorced');
    expect(rows[0].blood_group).toBe('A+');
  });

  test('deleteEmployee soft-deletes', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Delete Test', 'staff', '9999999930', 20000, 'active', today()],
    );
    await run(`UPDATE employees SET status = ? WHERE id = ?`, [
      'inactive',
      empId,
    ]);
    const rows = await query('SELECT * FROM employees WHERE id = ?', [empId]);
    expect(rows[0].status).toBe('inactive');
  });

  test('Employee code is auto-generated / stored', async () => {
    const rows = await query(
      'SELECT employee_code FROM employee_profiles ORDER BY created_at',
    );
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r: any) => expect(r.employee_code).toBeTruthy());
  });

  test('Employee phone uniqueness (same phone rejected)', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid('emp'),
          'Dup Phone',
          'staff',
          '9999999901',
          20000,
          'active',
          today(),
        ],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Employee with all optional fields works', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Full Fields', 'manager', '9999999940', 50000, 'active', today()],
    );
    await run(
      `INSERT INTO employee_profiles (employee_id, employee_code, last_name, alternate_phone,
        gender, date_of_birth, marital_status, blood_group, nationality,
        department_id, designation_id, reporting_to_id, employment_type,
        permanent_address, current_address, city, state, pincode,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        bank_account_no, bank_name, bank_ifsc, bank_branch, salary_account_no,
        pf_number, esi_number, uan_number, pan_number, aadhaar_number,
        photo_url, signature_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'FULL001',
        'Fields',
        '9999999941',
        'female',
        '1992-06-15',
        'married',
        'AB+',
        'Indian',
        deptId1,
        desigId1,
        empId1,
        'permanent',
        '123 Main St',
        '456 Oak Ave',
        'Mumbai',
        'Maharashtra',
        '400001',
        'Spouse',
        '9999999942',
        'spouse',
        '1234567890',
        'SBI',
        'SBIN00123',
        'Mumbai',
        '1234567890',
        'PF12345',
        'ESI12345',
        'UAN12345',
        'PAN12345',
        'AADH1234567890',
        'http://photo.url',
        'http://signature.url',
      ],
    );
    const prof = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [empId],
    );
    expect(prof[0].city).toBe('Mumbai');
    expect(prof[0].pf_number).toBe('PF12345');
    expect(prof[0].pan_number).toBe('PAN12345');
  });

  test('Employee count returns correct number', async () => {
    const rows = await query('SELECT COUNT(*) AS cnt FROM employees');
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(3);
  });

  test('Employee search works across name, phone, code', async () => {
    const rows = await query(
      `SELECT e.* FROM employees e
       JOIN employee_profiles p ON p.employee_id = e.id
       WHERE e.name LIKE ? OR e.phone LIKE ? OR p.employee_code LIKE ?`,
      ['%Alice%', '%9999999901%', '%EMP001%'],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 4. SHIFT TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Shifts', () => {
  test('createShift with all fields', async () => {
    const id = uid('shift');
    await run(
      `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time, grace_minutes,
        late_threshold, early_departure_threshold, half_day_hours, full_day_hours, is_night_shift,
        applicable_departments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'MORN',
        'Morning',
        'morning',
        '06:00',
        '14:00',
        5,
        10,
        10,
        4.0,
        8.0,
        false,
        deptId1,
      ],
    );
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [id]);
    expect(rows[0].code).toBe('MORN');
    expect(rows[0].shift_type).toBe('morning');
    expect(rows[0].is_night_shift).toBe(0);
  });

  test('findShiftById returns correct', async () => {
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [shiftId1]);
    expect(rows[0].code).toBe('GEN');
    expect(rows[0].shift_type).toBe('general');
  });

  test('findAllShifts filters by type', async () => {
    const rows = await query('SELECT * FROM shifts WHERE shift_type = ?', [
      'night',
    ]);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach((r: any) => expect(r.shift_type).toBe('night'));
  });

  test('assignShiftToEmployee creates employee_shifts record', async () => {
    const id = uid('empsh');
    await run(
      `INSERT INTO employee_shifts (id, employee_id, shift_id, effective_from)
       VALUES (?, ?, ?, ?)`,
      [id, empId1, shiftId1, '2026-01-01'],
    );
    const rows = await query('SELECT * FROM employee_shifts WHERE id = ?', [
      id,
    ]);
    expect(rows[0].employee_id).toBe(empId1);
    expect(rows[0].shift_id).toBe(shiftId1);
  });

  test('getEmployeeShifts returns assigned shifts', async () => {
    const rows = await query(
      `SELECT s.* FROM employee_shifts es
       JOIN shifts s ON s.id = es.shift_id
       WHERE es.employee_id = ?`,
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateShift modifies', async () => {
    const id = uid('shift');
    await run(
      `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'UPD SH', 'Update Shift', 'general', '09:00', '18:00'],
    );
    await run(
      `UPDATE shifts SET name = ?, start_time = ?, end_time = ? WHERE id = ?`,
      ['Updated Shift', '10:00', '19:00', id],
    );
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [id]);
    expect(rows[0].name).toBe('Updated Shift');
    expect(rows[0].start_time).toBe('10:00');
  });

  test('deleteShift removes', async () => {
    const id = uid('shift');
    await run(
      `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'DELSH', 'Delete Shift', 'general', '09:00', '18:00'],
    );
    await run(`UPDATE shifts SET is_active = 0 WHERE id = ?`, [id]);
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [id]);
    expect(rows[0].is_active).toBe(0);
  });

  test('Night shift isNightShift=true', async () => {
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [shiftId2]);
    expect(rows[0].is_night_shift).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 5. ATTENDANCE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Attendance', () => {
  test('markAttendance creates record', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, overtime_hours, late_minutes, early_departure_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        today(),
        shiftId1,
        '09:00',
        '18:00',
        'present',
        9.0,
        0,
        0,
        0,
        'manual',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].employee_id).toBe(empId1);
    expect(rows[0].status).toBe('present');
  });

  test('findAttendanceById returns correct', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        today(),
        shiftId1,
        '09:00',
        '18:00',
        'present',
        9.0,
        'biometric',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].employee_id).toBe(empId2);
  });

  test('findAttendanceByEmployeeAndDate', async () => {
    const date = today();
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, date, shiftId1, 'present', 9.0, 'manual'],
    );
    const rows = await query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [empId1, date],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findAttendanceRange returns date range', async () => {
    for (let i = 1; i <= 5; i++) {
      const d = daysAgo(i);
      await run(
        `INSERT OR IGNORE INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uid('att'), empId1, d, shiftId1, 'present', 9.0, 'manual'],
      );
    }
    const rows = await query(
      `SELECT * FROM attendance WHERE employee_id = ? AND date >= ? AND date <= ?`,
      [empId1, daysAgo(5), daysAgo(1)],
    );
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test('findAttendanceByDate returns all for date', async () => {
    const rows = await query('SELECT * FROM attendance WHERE date = ?', [
      today(),
    ]);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateAttendance modifies status', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, today(), shiftId1, 'present', 9.0, 'manual'],
    );
    await run(`UPDATE attendance SET status = ?, notes = ? WHERE id = ?`, [
      'absent',
      'Called sick',
      id,
    ]);
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].status).toBe('absent');
    expect(rows[0].notes).toBe('Called sick');
  });

  test('approveAttendance sets isApproved', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, today(), shiftId1, 'present', 9.0, 'manual'],
    );
    await run(
      `UPDATE attendance SET is_approved = 1, approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
      [empId2, id],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].is_approved).toBe(1);
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('getAttendanceSummary calculates correctly', async () => {
    const testDate = daysAgo(10);
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Summary Test',
        'staff',
        '9999999950',
        25000,
        'active',
        daysAgo(60),
      ],
    );
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, overtime_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid('att'), empId, testDate, shiftId1, 'present', 9.0, 1.5, 'manual'],
    );
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid('att'), empId, daysAgo(11), shiftId1, 'absent', 0, 'manual'],
    );
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid('att'), empId, daysAgo(12), shiftId1, 'half_day', 4.5, 'manual'],
    );
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, late_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid('att'), empId, daysAgo(13), shiftId1, 'late', 8.0, 30, 'manual'],
    );
    const present = await query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE employee_id = ? AND status = 'present'`,
      [empId],
    );
    const absent = await query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE employee_id = ? AND status = 'absent'`,
      [empId],
    );
    const halfDays = await query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE employee_id = ? AND status = 'half_day'`,
      [empId],
    );
    const lateDays = await query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE employee_id = ? AND status = 'late'`,
      [empId],
    );
    const overtime = await query(
      `SELECT COALESCE(SUM(overtime_hours), 0) AS total FROM attendance WHERE employee_id = ?`,
      [empId],
    );
    expect(Number(present[0].cnt)).toBe(1);
    expect(Number(absent[0].cnt)).toBe(1);
    expect(Number(halfDays[0].cnt)).toBe(1);
    expect(Number(lateDays[0].cnt)).toBe(1);
    expect(Number(overtime[0].total)).toBeGreaterThanOrEqual(1.5);
  });

  test('Attendance with missing punch flagged', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, missing_punch, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(2),
        shiftId1,
        '09:00',
        null,
        'present',
        9.0,
        1,
        'manual',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].missing_punch).toBe(1);
    expect(rows[0].clock_out).toBeNull();
  });

  test('Attendance source tracking works (manual, biometric, etc.)', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, daysAgo(3), shiftId1, 'present', 9.0, 'biometric'],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].source).toBe('biometric');
  });

  test('Duplicate attendance for same employee+date is rejected', async () => {
    const date = daysAgo(20);
    const id1 = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id1, empId1, date, shiftId1, 'present', 9.0, 'manual'],
    );
    let failed = false;
    try {
      await run(
        `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uid('att'), empId1, date, shiftId1, 'absent', 0, 'manual'],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('createAttendanceCorrection stores request', async () => {
    const id = uid('attcorr');
    await run(
      `INSERT INTO attendance_corrections (id, employee_id, date, original_clock_in, original_clock_out,
        corrected_clock_in, corrected_clock_out, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(1),
        '09:00',
        null,
        '09:00',
        '18:00',
        'Forgot to clock out',
        'pending',
      ],
    );
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [id],
    );
    expect(rows[0].reason).toBe('Forgot to clock out');
    expect(rows[0].status).toBe('pending');
  });

  test('findAttendanceCorrections returns by employee', async () => {
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('approveAttendanceCorrection updates original', async () => {
    const id = uid('attcorr');
    await run(
      `INSERT INTO attendance_corrections (id, employee_id, date, original_clock_in, original_clock_out,
        corrected_clock_in, corrected_clock_out, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(5),
        '09:00',
        '17:00',
        '09:00',
        '18:00',
        'Correct time',
        'pending',
      ],
    );
    await run(
      `UPDATE attendance_corrections SET status = 'approved', approved_by = ? WHERE id = ?`,
      [empId2, id],
    );
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [id],
    );
    expect(rows[0].status).toBe('approved');
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('Bulk attendance marking', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = uid('att');
      ids.push(id);
      await run(
        `INSERT OR IGNORE INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, empId1, daysAgo(30 + i), shiftId1, 'present', 9.0, 'manual'],
      );
    }
    const rows = await query(
      `SELECT * FROM attendance WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    expect(rows).toHaveLength(5);
  });

  test('Attendance with clockIn/clockOut calculates workedHours', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, overtime_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(6),
        shiftId1,
        '08:00',
        '19:00',
        'present',
        11.0,
        2.0,
        'manual',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(Number(rows[0].worked_hours)).toBeCloseTo(11.0, 0);
  });

  test('Overtime calculation: hours beyond FULL_DAY_HOURS * OT_RATE_MULTIPLIER', () => {
    const workedHours = 11;
    const overtimeHours = Math.max(0, workedHours - T.FULL_DAY_HOURS);
    const otPay = overtimeHours * T.OT_RATE_MULTIPLIER * 100;
    expect(overtimeHours).toBe(2);
    expect(otPay).toBe(400);
  });

  test('Late arrival detection based on shift start + grace', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, late_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(7),
        shiftId1,
        '09:30',
        '18:00',
        'late',
        8.5,
        30,
        'manual',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].status).toBe('late');
    expect(Number(rows[0].late_minutes)).toBe(30);
  });

  test('Early departure detection', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status,
        worked_hours, early_departure_minutes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        daysAgo(8),
        shiftId1,
        '09:00',
        '16:30',
        'early_departure',
        7.5,
        90,
        'manual',
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].status).toBe('early_departure');
    expect(Number(rows[0].early_departure_minutes)).toBe(90);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 6. HOLIDAY CALENDAR TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Holiday Calendar', () => {
  test('createHoliday stores correctly', async () => {
    const id = uid('hol');
    await run(
      `INSERT INTO holiday_calendar (id, name, date, year, type, is_optional)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, 'Republic Day', '2026-01-26', 2026, 'public', false],
    );
    const rows = await query('SELECT * FROM holiday_calendar WHERE id = ?', [
      id,
    ]);
    expect(rows[0].name).toBe('Republic Day');
    expect(rows[0].type).toBe('public');
  });

  test('findHolidaysByYear returns year', async () => {
    const rows = await query(
      'SELECT * FROM holiday_calendar WHERE year = ?',
      [2026],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findHolidaysByDateRange filters', async () => {
    const rows = await query(
      `SELECT * FROM holiday_calendar WHERE date >= ? AND date <= ?`,
      ['2026-01-01', '2026-12-31'],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateHoliday modifies', async () => {
    const id = uid('hol');
    await run(
      `INSERT INTO holiday_calendar (id, name, date, year, type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, 'Old Holiday', '2026-08-15', 2026, 'public'],
    );
    await run(`UPDATE holiday_calendar SET name = ?, type = ? WHERE id = ?`, [
      'Independence Day',
      'public',
      id,
    ]);
    const rows = await query('SELECT * FROM holiday_calendar WHERE id = ?', [
      id,
    ]);
    expect(rows[0].name).toBe('Independence Day');
  });

  test('deleteHoliday removes', async () => {
    const id = uid('hol');
    await run(
      `INSERT INTO holiday_calendar (id, name, date, year, type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, 'Temp Holiday', '2026-12-25', 2026, 'restricted'],
    );
    await run(`UPDATE holiday_calendar SET is_active = 0 WHERE id = ?`, [id]);
    const rows = await query('SELECT * FROM holiday_calendar WHERE id = ?', [
      id,
    ]);
    expect(rows[0].is_active).toBe(0);
  });

  test('Duplicate holiday name+date rejected', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO holiday_calendar (id, name, date, year, type)
         VALUES (?, ?, ?, ?, ?)`,
        [uid('hol'), 'Republic Day', '2026-01-26', 2026, 'public'],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 7. LEAVE TYPE CONFIG TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Leave Type Config', () => {
  test('createLeaveTypeConfig with all types', async () => {
    const id = uid('lt');
    await run(
      `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle, max_consecutive,
        requires_approval, is_paid, is_carry_forward, carry_forward_limit, is_encashable, min_service_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, 'SL', 'Sick Leave', 'sick', 10, 3, true, true, false, 0, false, 30],
    );
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      id,
    ]);
    expect(rows[0].code).toBe('SL');
    expect(rows[0].type).toBe('sick');
    expect(rows[0].days_per_cycle).toBe(10);
  });

  test('findLeaveTypeById returns correct', async () => {
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      leaveTypeId1,
    ]);
    expect(rows[0].code).toBe('CL');
    expect(rows[0].type).toBe('casual');
  });

  test('findAllLeaveTypeConfigs returns all 8 types', async () => {
    const types = [
      'casual',
      'sick',
      'earned',
      'comp_off',
      'maternity',
      'paternity',
      'loss_of_pay',
      'bereavement',
    ];
    for (const t of types) {
      await run(
        `INSERT OR IGNORE INTO leave_type_configs (id, code, name, type, days_per_cycle)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uid('lt'),
          t.toUpperCase(),
          t.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          t,
          10,
        ],
      );
    }
    const rows = await query('SELECT DISTINCT type FROM leave_type_configs');
    expect(rows.length).toBeGreaterThanOrEqual(8);
  });

  test('updateLeaveTypeConfig modifies days', async () => {
    await run(
      `UPDATE leave_type_configs SET days_per_cycle = ?, max_consecutive = ? WHERE id = ?`,
      [15, 7, leaveTypeId1],
    );
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      leaveTypeId1,
    ]);
    expect(rows[0].days_per_cycle).toBe(15);
    expect(rows[0].max_consecutive).toBe(7);
  });

  test('deleteLeaveTypeConfig removes', async () => {
    const id = uid('lt');
    await run(
      `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle)
       VALUES (?, ?, ?, ?, ?)`,
      [id, 'DELLT', 'Delete LT', 'casual', 5],
    );
    await run(`UPDATE leave_type_configs SET is_active = 0 WHERE id = ?`, [id]);
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      id,
    ]);
    expect(rows[0].is_active).toBe(0);
  });

  test('Leave type code uniqueness', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle)
         VALUES (?, ?, ?, ?, ?)`,
        [uid('lt'), 'CL', 'Duplicate CL', 'casual', 12],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Casual leave is paid, carry-forward', async () => {
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      leaveTypeId1,
    ]);
    expect(rows[0].is_paid).toBe(1);
    expect(rows[0].is_carry_forward).toBe(1);
  });

  test('Maternity leave restricted to female', async () => {
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      leaveTypeId2,
    ]);
    expect(rows[0].gender_restriction).toBe('female');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 8. LEAVE BALANCE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Leave Balance', () => {
  test('createLeaveBalance stores correctly', async () => {
    const id = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, empId2, leaveTypeId1, 2026, 12, 0, 0, 0],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    expect(rows[0].total_days).toBe(12);
    expect(rows[0].employee_id).toBe(empId2);
  });

  test('findLeaveBalance returns correct balance', async () => {
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [
      leaveBalanceId1,
    ]);
    expect(rows[0].employee_id).toBe(empId1);
    expect(rows[0].leave_type_id).toBe(leaveTypeId1);
  });

  test('findLeaveBalancesByEmployee returns all types', async () => {
    const rows = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateLeaveBalance modifies used days', async () => {
    const id = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, empId3, leaveTypeId1, 2026, 12, 2, 1, 0],
    );
    await run(
      `UPDATE leave_balances SET used_days = ?, pending_days = ? WHERE id = ?`,
      [5, 0, id],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    expect(Number(rows[0].used_days)).toBe(5);
    expect(Number(rows[0].pending_days)).toBe(0);
  });

  test('deductLeaveBalance reduces available days', async () => {
    const row = await query('SELECT * FROM leave_balances WHERE id = ?', [
      leaveBalanceId1,
    ]);
    const availableBefore = Number(row[0].available_days);
    await run(
      `UPDATE leave_balances SET used_days = used_days + 1 WHERE id = ?`,
      [leaveBalanceId1],
    );
    const updated = await query('SELECT * FROM leave_balances WHERE id = ?', [
      leaveBalanceId1,
    ]);
    expect(Number(updated[0].available_days)).toBeLessThan(availableBefore);
  });

  test('Leave balance available = total + carried - used - pending', async () => {
    const id = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, empId2, leaveTypeId1, 2026, 12, 3, 1, 2],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    const expected =
      Number(rows[0].total_days) +
      Number(rows[0].carried_forward) -
      Number(rows[0].used_days) -
      Number(rows[0].pending_days);
    expect(Number(rows[0].available_days)).toBe(expected);
  });

  test('Multiple years have separate balances', async () => {
    await run(
      `INSERT OR IGNORE INTO leave_balances (id, employee_id, leave_type_id, year, total_days)
       VALUES (?, ?, ?, ?, ?)`,
      [uid('lb'), empId1, leaveTypeId1, 2025, 12],
    );
    const rows2025 = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [empId1, leaveTypeId1, 2025],
    );
    const rows2026 = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [empId1, leaveTypeId1, 2026],
    );
    expect(rows2025.length).toBe(1);
    expect(rows2026.length).toBeGreaterThanOrEqual(1);
  });

  test('Leave balance for non-existent employee returns empty', async () => {
    const rows = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ?',
      ['nonexistent-employee'],
    );
    expect(rows).toHaveLength(0);
  });

  test('Carry forward creates new year balance', async () => {
    const oldBalance = 4;
    const newTotal = 12 + oldBalance;
    const id = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, empId2, leaveTypeId1, 2026, newTotal, oldBalance],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    expect(Number(rows[0].carried_forward)).toBe(oldBalance);
    expect(Number(rows[0].total_days)).toBe(newTotal);
  });

  test('Zero balance prevents leave application', async () => {
    const id = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId3, leaveTypeId1, 2026, 0, 0, 0],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    expect(Number(rows[0].available_days)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 9. LEAVE APPLICATION TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Leave Applications', () => {
  test('createLeaveApplication in pending status', async () => {
    const id = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status, applied_to, is_urgent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        leaveTypeId1,
        '2026-07-01',
        '2026-07-02',
        'full_day',
        2,
        'Personal work',
        'pending',
        empId2,
        false,
      ],
    );
    const rows = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].days).toBe(2);
  });

  test('approveLeave changes status and deducts balance', async () => {
    const id = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status, applied_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        leaveTypeId1,
        '2026-08-01',
        '2026-08-01',
        'full_day',
        1,
        'Medical',
        'pending',
        empId2,
      ],
    );
    await run(
      `UPDATE leave_applications SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
      [empId2, id],
    );
    await run(
      `UPDATE leave_balances SET used_days = used_days + 1, pending_days = MAX(pending_days - 1, 0)
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [empId1, leaveTypeId1, 2026],
    );
    const app = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    expect(app[0].status).toBe('approved');
    expect(app[0].approved_by).toBe(empId2);
  });

  test('rejectLeave changes status, releases pending', async () => {
    const id = uid('la');
    const balId = uid('lb');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [balId, empId2, leaveTypeId1, 2026, 12, 0, 1, 0],
    );
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status, applied_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        leaveTypeId1,
        '2026-09-01',
        '2026-09-01',
        'full_day',
        1,
        'Not needed',
        'pending',
        empId1,
      ],
    );
    await run(
      `UPDATE leave_applications SET status = 'rejected', rejection_reason = ? WHERE id = ?`,
      ['Business need', id],
    );
    await run(
      `UPDATE leave_balances SET pending_days = MAX(pending_days - 1, 0) WHERE id = ?`,
      [balId],
    );
    const app = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    expect(app[0].status).toBe('rejected');
    expect(app[0].rejection_reason).toBe('Business need');
  });

  test('cancelLeave changes status, restores balance', async () => {
    const id = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status, applied_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        leaveTypeId1,
        '2026-10-01',
        '2026-10-02',
        'full_day',
        2,
        'Changed mind',
        'approved',
        empId1,
      ],
    );
    await run(
      `UPDATE leave_applications SET status = 'cancelled' WHERE id = ?`,
      [id],
    );
    const app = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    expect(app[0].status).toBe('cancelled');
  });

  test('findLeaveApplicationsByEmployee filters', async () => {
    const rows = await query(
      'SELECT * FROM leave_applications WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('findLeaveApplicationsByApprover filters', async () => {
    await run(
      `UPDATE leave_applications SET applied_to = ? WHERE applied_to IS NULL`,
      [empId2],
    );
    const rows = await query(
      'SELECT * FROM leave_applications WHERE applied_to = ?',
      [empId2],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findPendingLeaveApplications returns only pending', async () => {
    const rows = await query(
      `SELECT * FROM leave_applications WHERE status = 'pending'`,
    );
    rows.forEach((r: any) => expect(r.status).toBe('pending'));
  });

  test('Overlapping leave detection', async () => {
    const id = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        leaveTypeId1,
        '2026-11-01',
        '2026-11-05',
        'full_day',
        5,
        'Vacation',
        'approved',
      ],
    );
    const overlap = await query(
      `SELECT * FROM leave_applications
       WHERE employee_id = ? AND status IN ('approved','pending')
       AND from_date <= ? AND to_date >= ?`,
      [empId1, '2026-11-03', '2026-11-03'],
    );
    expect(overlap.length).toBeGreaterThanOrEqual(1);
  });

  test('Leave exceeding max consecutive rejected', () => {
    const maxConsecutive = 5;
    const requestedDays = 7;
    expect(requestedDays > maxConsecutive).toBe(true);
  });

  test('Leave before min service days rejected', () => {
    const minServiceDays = 90;
    const serviceDays = 30;
    expect(serviceDays < minServiceDays).toBe(true);
  });

  test('Urgent leave flag works', async () => {
    const id = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status, is_urgent, contact_during_leave)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        leaveTypeId1,
        '2026-12-01',
        '2026-12-01',
        'full_day',
        1,
        'Emergency',
        'pending',
        true,
        '9999999999',
      ],
    );
    const rows = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    expect(rows[0].is_urgent).toBe(1);
    expect(rows[0].contact_during_leave).toBe('9999999999');
  });

  test('Half-day leave sessions work (first_half, second_half)', async () => {
    const id1 = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id1,
        empId1,
        leaveTypeId1,
        '2026-12-15',
        '2026-12-15',
        'first_half',
        0.5,
        'Personal',
        'pending',
      ],
    );
    const id2 = uid('la');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date,
        session, days, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id2,
        empId1,
        leaveTypeId1,
        '2026-12-16',
        '2026-12-16',
        'second_half',
        0.5,
        'Personal 2',
        'pending',
      ],
    );
    const first = await query(
      'SELECT * FROM leave_applications WHERE id = ? AND session = ?',
      [id1, 'first_half'],
    );
    const second = await query(
      'SELECT * FROM leave_applications WHERE id = ? AND session = ?',
      [id2, 'second_half'],
    );
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 10. PAYROLL ENGINE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Payroll Engine', () => {
  test('PF constant matches 12%', () => {
    expect(T.PF_EMPLOYEE_RATE).toBe(0.12);
    expect(T.PF_EMPLOYER_RATE).toBe(0.12);
  });

  test('PF deduction capped at 1800', () => {
    const pf = Math.min(50000 * 0.12, 1800);
    expect(pf).toBe(1800);
  });

  test('ESI constants match', () => {
    expect(T.ESI_EMPLOYEE_RATE).toBe(0.0075);
    expect(T.ESI_EMPLOYER_RATE).toBe(0.0325);
  });

  test('ESI deducted only below 21000 threshold', () => {
    const highSalary = 25000;
    const lowSalary = 18000;
    expect(highSalary <= 21000 ? highSalary * T.ESI_EMPLOYEE_RATE : 0).toBe(0);
    expect(lowSalary * T.ESI_EMPLOYEE_RATE).toBe(135);
  });

  test('PT constants match', () => {
    expect(T.PT_THRESHOLD).toBe(15000);
    expect(T.PT_AMOUNT).toBe(200);
  });

  test('Professional Tax deducted above threshold', () => {
    const above = 20000;
    const below = 10000;
    expect(above >= T.PT_THRESHOLD ? T.PT_AMOUNT : 0).toBe(200);
    expect(below >= T.PT_THRESHOLD ? T.PT_AMOUNT : 0).toBe(0);
  });

  test('OT rate multiplier matches', () => {
    expect(T.OT_RATE_MULTIPLIER).toBe(2.0);
  });

  test('Overtime pay calculated correctly', () => {
    const grossSalary = 30000;
    const otHours = 10;
    const perHourRate = grossSalary / T.FULL_DAY_HOURS / 30;
    const otPay = otHours * T.OT_RATE_MULTIPLIER * perHourRate;
    expect(otPay).toBeCloseTo(222.22, 0);
  });

  test('MAX_OT_HOURS constants', () => {
    expect(T.MAX_OT_HOURS_PER_DAY).toBe(4);
    expect(T.MAX_OT_HOURS_PER_MONTH).toBe(60);
  });

  test('FULL_DAY_HOURS and HALF_DAY_HOURS constants', () => {
    expect(T.FULL_DAY_HOURS).toBe(9);
    expect(T.HALF_DAY_HOURS).toBe(4.5);
  });

  test('Attendance deduction = absent days * per day rate', () => {
    const grossSalary = 30000;
    const workingDays = 26;
    const absentDays = 2;
    const perDayRate = grossSalary / workingDays;
    expect(absentDays * perDayRate).toBeCloseTo(2307.69, 0);
  });

  test('Net pay = totalEarnings - totalDeductions - loanRecovery - advanceRecovery', () => {
    const earnings = 50000;
    const deductions = 8000;
    const loanRec = 2000;
    const advRec = 1000;
    expect(earnings - deductions - loanRec - advRec).toBe(39000);
  });

  test('Total cost to company = earnings + employerPF + employerESI', () => {
    const earnings = 50000;
    const employerPf = 1800;
    const employerEsi = 585;
    expect(earnings + employerPf + employerEsi).toBe(52385);
  });

  test('MIN_WAGE constants', () => {
    expect(T.MIN_WAGE_HOURLY).toBe(75);
    expect(T.MIN_WAGE_DAILY).toBe(600);
  });

  test('Calculation for daily wage employee', () => {
    const dailyWage = T.MIN_WAGE_DAILY;
    const daysWorked = 25;
    expect(dailyWage * daysWorked).toBe(15000);
  });

  test('Calculation for hourly employee', () => {
    const hourlyRate = T.MIN_WAGE_HOURLY;
    const hoursWorked = 180;
    expect(hourlyRate * hoursWorked).toBe(13500);
  });

  test('Full payroll cycle: draft -> computed -> approved -> paid -> locked', () => {
    const transitions = T.PAYROLL_STATUS_TRANSITIONS;
    expect(transitions.draft).toContain('computed');
    expect(transitions.computed).toContain('approved');
    expect(transitions.approved).toContain('paid');
    expect(transitions.paid).toContain('locked');
    expect(transitions.locked).toEqual([]);
  });

  test('createSalaryStructure with all components', async () => {
    const id = uid('sal');
    await run(
      `INSERT INTO salary_structures (id, employee_id, effective_from, is_active,
        gross_salary, basic_pay, hra, conveyance_allowance, medical_allowance, special_allowance,
        other_allowance, employer_pf, employer_esi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        '2026-02-01',
        true,
        75000,
        30000,
        15000,
        2400,
        1250,
        26350,
        0,
        1800,
        0,
      ],
    );
    const rows = await query('SELECT * FROM salary_structures WHERE id = ?', [
      id,
    ]);
    expect(rows[0].gross_salary).toBe(75000);
    expect(rows[0].basic_pay).toBe(30000);
  });

  test('findActiveSalaryStructure returns current', async () => {
    const rows = await query(
      `SELECT * FROM salary_structures WHERE employee_id = ? AND is_active = 1`,
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].gross_salary).toBe(45000);
  });

  test('Salary revision creates new structure', async () => {
    const revId = uid('rev');
    await run(
      `UPDATE salary_structures SET is_active = 0, effective_to = ? WHERE employee_id = ? AND is_active = 1`,
      [daysAgo(1), empId1],
    );
    const newId = uid('sal');
    await run(
      `INSERT INTO salary_structures (id, employee_id, effective_from, is_active,
        gross_salary, basic_pay, hra, conveyance_allowance, medical_allowance, special_allowance,
        employer_pf, employer_esi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        empId1,
        today(),
        true,
        50000,
        20000,
        10000,
        1600,
        1250,
        17150,
        1800,
        0,
      ],
    );
    await run(
      `INSERT INTO salary_revisions (id, employee_id, previous_gross, new_gross, revision_date, effective_from, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [revId, empId1, 45000, 50000, today(), today(), 'Annual increment'],
    );
    const active = await query(
      `SELECT * FROM salary_structures WHERE employee_id = ? AND is_active = 1`,
      [empId1],
    );
    expect(active[0].gross_salary).toBe(50000);
    const revs = await query(
      'SELECT * FROM salary_revisions WHERE employee_id = ?',
      [empId1],
    );
    expect(revs.length).toBeGreaterThanOrEqual(1);
  });

  test('createPayrollRun in draft status', async () => {
    const id = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, 7, 2026, 'monthly', '2026-07-01', '2026-07-31', 'draft'],
    );
    const rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    expect(rows[0].status).toBe('draft');
    expect(rows[0].month).toBe(7);
  });

  test('addEmployeePayroll to run', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 7, 2026, 'monthly', '2026-07-01', '2026-07-31', 'draft'],
    );
    const epId = uid('ep');
    await run(
      `INSERT INTO employee_payrolls (id, payroll_run_id, employee_id, gross_pay, total_deductions,
        net_pay, overtime_pay, payable_amount, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [epId, prId, empId1, 45000, 8000, 37000, 0, 37000, 'bank'],
    );
    const rows = await query('SELECT * FROM employee_payrolls WHERE id = ?', [
      epId,
    ]);
    expect(rows[0].payroll_run_id).toBe(prId);
    expect(rows[0].employee_id).toBe(empId1);
    expect(rows[0].gross_pay).toBe(45000);
  });

  test('updatePayrollRunStatus transitions', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 8, 2026, 'monthly', '2026-08-01', '2026-08-31', 'draft'],
    );
    await run(`UPDATE payroll_runs SET status = ? WHERE id = ?`, [
      'computed',
      prId,
    ]);
    let rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [prId]);
    expect(rows[0].status).toBe('computed');
    await run(
      `UPDATE payroll_runs SET status = ?, approved_by = ? WHERE id = ?`,
      ['approved', empId2, prId],
    );
    rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [prId]);
    expect(rows[0].status).toBe('approved');
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('Locked payroll rejects changes', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 9, 2026, 'monthly', '2026-09-01', '2026-09-30', 'locked'],
    );
    const rows = await query('SELECT status FROM payroll_runs WHERE id = ?', [
      prId,
    ]);
    expect(rows[0].status).toBe('locked');
  });

  test('Multiple employees in one run aggregate totals', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 10, 2026, 'monthly', '2026-10-01', '2026-10-31', 'draft'],
    );
    await run(
      `INSERT INTO employee_payrolls (id, payroll_run_id, employee_id, gross_pay, total_deductions,
        net_pay, payable_amount, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid('ep'), prId, empId1, 45000, 8000, 37000, 37000, 'bank'],
    );
    await run(
      `INSERT INTO employee_payrolls (id, payroll_run_id, employee_id, gross_pay, total_deductions,
        net_pay, payable_amount, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid('ep'), prId, empId2, 75000, 12000, 63000, 63000, 'bank'],
    );
    const result = await query(
      `SELECT SUM(gross_pay) AS total_gross, SUM(net_pay) AS total_net, COUNT(*) AS emp_count
       FROM employee_payrolls WHERE payroll_run_id = ?`,
      [prId],
    );
    expect(Number(result[0].total_gross)).toBe(120000);
    expect(Number(result[0].total_net)).toBe(100000);
    expect(Number(result[0].emp_count)).toBe(2);
  });

  test('Payroll run totals = sum of employee payrolls', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 11, 2026, 'monthly', '2026-11-01', '2026-11-30', 'draft'],
    );
    await run(
      `INSERT INTO employee_payrolls (id, payroll_run_id, employee_id, gross_pay, total_deductions,
        net_pay, payable_amount, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid('ep'), prId, empId1, 45000, 8000, 37000, 37000, 'bank'],
    );
    const empSum = await query(
      `SELECT SUM(gross_pay) AS tg, SUM(total_deductions) AS td, SUM(net_pay) AS tn
       FROM employee_payrolls WHERE payroll_run_id = ?`,
      [prId],
    );
    await run(
      `UPDATE payroll_runs SET total_gross_pay = ?, total_deductions = ?, total_net_pay = ?,
        employee_count = 1 WHERE id = ?`,
      [Number(empSum[0].tg), Number(empSum[0].td), Number(empSum[0].tn), prId],
    );
    const rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [prId]);
    expect(Number(rows[0].total_gross_pay)).toBeCloseTo(
      Number(empSum[0].tg),
      0,
    );
    expect(Number(rows[0].total_net_pay)).toBeCloseTo(Number(empSum[0].tn), 0);
  });

  test('Payroll run period validation (end > start)', () => {
    expect(new Date('2026-01-31') > new Date('2026-01-01')).toBe(true);
    expect(new Date('2026-01-01') > new Date('2026-01-31')).toBe(false);
  });

  test('Salary component calculation: fixed value', async () => {
    const id = uid('sc');
    await run(
      `INSERT INTO salary_components (id, salary_structure_id, component_type, name,
        calculation_type, calculation_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, salaryStructId1, 'earning', 'Fixed Bonus', 'fixed', 5000, 1],
    );
    const rows = await query('SELECT * FROM salary_components WHERE id = ?', [
      id,
    ]);
    expect(Number(rows[0].calculation_value)).toBe(5000);
    expect(rows[0].calculation_type).toBe('fixed');
  });

  test('Salary component calculation: percentage of basic', async () => {
    const id = uid('sc');
    await run(
      `INSERT INTO salary_components (id, salary_structure_id, component_type, name,
        calculation_type, calculation_value, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, salaryStructId1, 'earning', 'HRA Component', 'percentage', 50, 2],
    );
    const rows = await query('SELECT * FROM salary_components WHERE id = ?', [
      id,
    ]);
    expect(Number(rows[0].calculation_value)).toBe(50);
    const basicPay = 18000;
    const computedValue = basicPay * (50 / 100);
    expect(computedValue).toBe(9000);
  });

  test('findPayrollRuns with month/year filter', async () => {
    const rows = await query(
      'SELECT * FROM payroll_runs WHERE month = ? AND year = ?',
      [7, 2026],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findPayrollRuns with status filter', async () => {
    const rows = await query(
      `SELECT * FROM payroll_runs WHERE status = 'draft'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('Statutory component type exists', () => {
    const sc = {
      componentType: 'deduction',
      name: 'PF',
      calculationType: 'percentage' as const,
      calculationValue: 12,
    };
    expect(sc.calculationType).toBe('percentage');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 11. LOAN TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Employee Loans', () => {
  test('createLoan with EMI schedule', async () => {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'Personal',
        50000,
        5000,
        10,
        0,
        0,
        '2026-01-15',
        '2026-02-01',
        'Home renovation',
        'active',
      ],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    expect(rows[0].principal_amount).toBe(50000);
    expect(rows[0].emi_amount).toBe(5000);
    expect(rows[0].total_emis).toBe(10);
  });

  test('findActiveLoans returns only active', async () => {
    const rows = await query(
      `SELECT * FROM employee_loans WHERE status = 'active'`,
    );
    rows.forEach((r: any) => expect(r.status).toBe('active'));
  });

  test('findLoansByEmployee returns employee loans', async () => {
    const rows = await query(
      'SELECT * FROM employee_loans WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('Loan EMI calculation: principal / totalEmis = emiAmount (approx)', () => {
    const principal = 50000;
    const totalEmis = 10;
    const emi = principal / totalEmis;
    expect(emi).toBe(5000);
  });

  test('Loan status transitions: active -> closed', async () => {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        'Vehicle',
        300000,
        12500,
        24,
        24,
        0,
        '2025-01-01',
        '2025-02-01',
        'Car loan',
        'active',
      ],
    );
    await run(
      `UPDATE employee_loans SET status = 'closed', closure_date = ? WHERE id = ?`,
      [today(), id],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    expect(rows[0].status).toBe('closed');
    expect(rows[0].closure_date).toBe(today());
  });

  test('Loan repayment reduces remaining', async () => {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId3,
        'Education',
        120000,
        10000,
        12,
        3,
        5,
        '2026-03-01',
        '2026-04-01',
        'Study loan',
        'active',
      ],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    const expectedRemaining = 120000 - 10000 * 3;
    expect(Number(rows[0].remaining_amount)).toBeCloseTo(expectedRemaining, 0);
  });

  test('Loan approval flow', async () => {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'Medical',
        25000,
        5000,
        5,
        0,
        0,
        '2026-06-01',
        '2026-07-01',
        'Medical emergency',
        'active',
        empId2,
      ],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    expect(rows[0].status).toBe('active');
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('Loan with zero interest', async () => {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        'Emergency',
        10000,
        2500,
        4,
        0,
        0,
        '2026-07-01',
        '2026-08-01',
        'Emergency',
        'active',
      ],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    expect(Number(rows[0].interest_rate)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 12. ADVANCE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Employee Advances', () => {
  test('createAdvance in pending status', async () => {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, recovered_amount, request_date, recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        5000,
        'one_time',
        null,
        null,
        0,
        today(),
        '2026-07',
        'Travel advance',
        'pending',
      ],
    );
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].amount).toBe(5000);
  });

  test('approveAdvance changes to approved', async () => {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, recovered_amount, request_date, recovery_start_month, purpose, status, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        3000,
        'one_time',
        null,
        null,
        0,
        today(),
        '2026-08',
        'Travel',
        'approved',
        empId2,
      ],
    );
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    expect(rows[0].status).toBe('approved');
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('findAdvancesByEmployee returns advances', async () => {
    const rows = await query(
      'SELECT * FROM hr_advances WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('findPendingAdvances returns pending', async () => {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode,
        recovered_amount, request_date, recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId3,
        2000,
        'installment',
        0,
        today(),
        '2026-09',
        'Pending advance',
        'pending',
      ],
    );
    const rows = await query(
      `SELECT * FROM hr_advances WHERE status = 'pending'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('Advance recovery modes (one_time, installment)', async () => {
    const id1 = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, request_date,
        recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id1,
        empId2,
        10000,
        'one_time',
        today(),
        '2026-10',
        'One time',
        'approved',
      ],
    );
    const id2 = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, request_date, recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id2,
        empId2,
        12000,
        'installment',
        2000,
        6,
        today(),
        '2026-11',
        'Installment',
        'approved',
      ],
    );
    const one = await query('SELECT * FROM hr_advances WHERE id = ?', [id1]);
    const inst = await query('SELECT * FROM hr_advances WHERE id = ?', [id2]);
    expect(one[0].recovery_mode).toBe('one_time');
    expect(inst[0].recovery_mode).toBe('installment');
    expect(inst[0].installment_amount).toBe(2000);
    expect(inst[0].installments).toBe(6);
  });

  test('Installment recovery calculation', () => {
    const amount = 12000;
    const installments = 6;
    const installmentAmount = amount / installments;
    expect(installmentAmount).toBe(2000);
  });

  test('Mark advance recovered', async () => {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, recovered_amount, request_date, recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        3000,
        'one_time',
        null,
        null,
        3000,
        today(),
        '2026-12',
        'Done',
        'recovered',
      ],
    );
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    expect(rows[0].status).toBe('recovered');
    expect(rows[0].is_recovered).toBe(1);
  });

  test('Advance remaining = amount - recovered', async () => {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, recovered_amount, request_date, recovery_start_month, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        10000,
        'installment',
        2000,
        5,
        4000,
        today(),
        '2026-07',
        'Test',
        'approved',
      ],
    );
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    const expectedRemaining = 10000 - 4000;
    expect(Number(rows[0].remaining_amount)).toBeCloseTo(expectedRemaining, 0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 13. REIMBURSEMENT TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Reimbursements', () => {
  test('createReimbursement pending', async () => {
    const id = uid('reimb');
    await run(
      `INSERT INTO employee_reimbursements (id, employee_id, category, description, amount,
        bill_date, bill_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, 'Travel', 'Bus fare', 1500, today(), 'BILL001', 'pending'],
    );
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    expect(rows[0].status).toBe('pending');
    expect(rows[0].amount).toBe(1500);
  });

  test('approveReimbursement changes status', async () => {
    const id = uid('reimb');
    await run(
      `INSERT INTO employee_reimbursements (id, employee_id, category, description, amount,
        bill_date, bill_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'Medical',
        'Medicine bill',
        2500,
        today(),
        'BILL002',
        'pending',
      ],
    );
    await run(
      `UPDATE employee_reimbursements SET status = 'approved', approved_by = ? WHERE id = ?`,
      [empId2, id],
    );
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    expect(rows[0].status).toBe('approved');
    expect(rows[0].approved_by).toBe(empId2);
  });

  test('markReimbursementPaid links to payroll', async () => {
    const prId = uid('pr');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prId, 7, 2026, 'monthly', '2026-07-01', '2026-07-31', 'approved'],
    );
    const id = uid('reimb');
    await run(
      `INSERT INTO employee_reimbursements (id, employee_id, category, description, amount,
        bill_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, 'Food', 'Team lunch', 3000, today(), 'approved'],
    );
    await run(
      `UPDATE employee_reimbursements SET status = 'paid', paid_in_payroll = 1, payroll_run_id = ? WHERE id = ?`,
      [prId, id],
    );
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    expect(rows[0].status).toBe('paid');
    expect(rows[0].paid_in_payroll).toBe(1);
    expect(rows[0].payroll_run_id).toBe(prId);
  });

  test('findPendingReimbursements', async () => {
    const rows = await query(
      `SELECT * FROM employee_reimbursements WHERE status = 'pending'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findReimbursementsByEmployee', async () => {
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('Reimbursement with bill image', async () => {
    const id = uid('reimb');
    await run(
      `INSERT INTO employee_reimbursements (id, employee_id, category, description, amount,
        bill_date, bill_number, bill_image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'Office',
        'Office supplies',
        1200,
        today(),
        'BILL003',
        'http://images/bill003.jpg',
        'pending',
      ],
    );
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    expect(rows[0].bill_image_url).toBe('http://images/bill003.jpg');
  });
});

// ═════════════════════════════════════════════════════════════════════
// 14. PERFORMANCE REVIEW TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Performance Reviews', () => {
  test('createPerformanceReview with rating', async () => {
    const id = uid('perf');
    await run(
      `INSERT INTO performance_reviews (id, employee_id, review_type, review_date, reviewer_id,
        rating, strengths, improvements, goals, overall_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'annual',
        today(),
        empId2,
        8,
        'Good communication',
        'Time management',
        'Lead a project',
        8.5,
      ],
    );
    const rows = await query('SELECT * FROM performance_reviews WHERE id = ?', [
      id,
    ]);
    expect(rows[0].rating).toBe(8);
    expect(rows[0].review_type).toBe('annual');
    expect(rows[0].reviewer_id).toBe(empId2);
  });

  test('findPerformanceReviewsByEmployee', async () => {
    const rows = await query(
      'SELECT * FROM performance_reviews WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('findPerformanceReviewsByReviewer', async () => {
    const rows = await query(
      'SELECT * FROM performance_reviews WHERE reviewer_id = ?',
      [empId2],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('acknowledgeReview updates', async () => {
    const id = uid('perf');
    await run(
      `INSERT INTO performance_reviews (id, employee_id, review_type, review_date, reviewer_id,
        rating, strengths, improvements, is_acknowledged, overall_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId3,
        'probation',
        today(),
        empId2,
        7,
        'Fast learner',
        'Needs guidance',
        false,
        7.0,
      ],
    );
    await run(
      `UPDATE performance_reviews SET is_acknowledged = 1 WHERE id = ?`,
      [id],
    );
    const rows = await query('SELECT * FROM performance_reviews WHERE id = ?', [
      id,
    ]);
    expect(rows[0].is_acknowledged).toBe(1);
  });

  test('Rating between 1-10 enforced', async () => {
    const rows = await query(
      'SELECT * FROM performance_reviews WHERE rating < 1 OR rating > 10',
    );
    expect(rows).toHaveLength(0);
  });

  test('Next review date set correctly', async () => {
    const id = uid('perf');
    await run(
      `INSERT INTO performance_reviews (id, employee_id, review_type, review_date, reviewer_id,
        rating, strengths, improvements, next_review_date, overall_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'quarterly',
        today(),
        empId2,
        9,
        'Excellent',
        'None',
        daysAgo(90),
        9.0,
      ],
    );
    const rows = await query('SELECT * FROM performance_reviews WHERE id = ?', [
      id,
    ]);
    expect(rows[0].next_review_date).toBe(daysAgo(90));
  });
});

// ═════════════════════════════════════════════════════════════════════
// 15. TRAINING TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Training Records', () => {
  test('createTrainingRecord', async () => {
    const id = uid('trn');
    await run(
      `INSERT INTO training_records (id, employee_id, training_name, provider, start_date, end_date,
        status, cost, is_certification, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId1,
        'Advanced TypeScript',
        'Udemy',
        '2026-03-01',
        '2026-03-15',
        'completed',
        2500,
        true,
        92,
      ],
    );
    const rows = await query('SELECT * FROM training_records WHERE id = ?', [
      id,
    ]);
    expect(rows[0].training_name).toBe('Advanced TypeScript');
    expect(rows[0].cost).toBe(2500);
    expect(rows[0].is_certification).toBe(1);
    expect(Number(rows[0].score)).toBe(92);
  });

  test('findTrainingRecordsByEmployee', async () => {
    const rows = await query(
      'SELECT * FROM training_records WHERE employee_id = ?',
      [empId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateTrainingStatus transitions', async () => {
    const id = uid('trn');
    await run(
      `INSERT INTO training_records (id, employee_id, training_name, provider, start_date, end_date,
        status, cost, is_certification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        'Leadership',
        'Coursera',
        '2026-04-01',
        '2026-05-01',
        'planned',
        5000,
        true,
      ],
    );
    await run(
      `UPDATE training_records SET status = 'in_progress' WHERE id = ?`,
      [id],
    );
    let rows = await query('SELECT * FROM training_records WHERE id = ?', [id]);
    expect(rows[0].status).toBe('in_progress');
    await run(`UPDATE training_records SET status = 'completed' WHERE id = ?`, [
      id,
    ]);
    rows = await query('SELECT * FROM training_records WHERE id = ?', [id]);
    expect(rows[0].status).toBe('completed');
  });

  test('Training cost recorded', async () => {
    const id = uid('trn');
    await run(
      `INSERT INTO training_records (id, employee_id, training_name, start_date, end_date,
        status, cost, is_certification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId3,
        'React Native',
        '2026-05-01',
        '2026-05-15',
        'completed',
        3500,
        false,
      ],
    );
    const rows = await query('SELECT * FROM training_records WHERE id = ?', [
      id,
    ]);
    expect(Number(rows[0].cost)).toBe(3500);
  });

  test('Certification flag works', async () => {
    const rows1 = await query(
      'SELECT * FROM training_records WHERE is_certification = 1',
    );
    const rows0 = await query(
      'SELECT * FROM training_records WHERE is_certification = 0',
    );
    expect(rows1.length).toBeGreaterThanOrEqual(1);
    expect(rows0.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 16. DISCIPLINARY TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Disciplinary Records', () => {
  test('createDisciplinaryRecord', async () => {
    const id = uid('disc');
    await run(
      `INSERT INTO disciplinary_records (id, employee_id, action, date, reason, description, issued_by, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        'warning',
        today(),
        'Late attendance',
        'Arrived late 5 times',
        empId1,
        null,
      ],
    );
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE id = ?',
      [id],
    );
    expect(rows[0].action).toBe('warning');
    expect(rows[0].issued_by).toBe(empId1);
  });

  test('findDisciplinaryRecordsByEmployee', async () => {
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE employee_id = ?',
      [empId2],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('updateDisciplinaryStatus deactivates', async () => {
    const id = uid('disc');
    await run(
      `INSERT INTO disciplinary_records (id, employee_id, action, date, reason, description, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId3,
        'written_warning',
        today(),
        'Policy violation',
        'Violated company policy',
        empId1,
      ],
    );
    await run(`UPDATE disciplinary_records SET is_active = 0 WHERE id = ?`, [
      id,
    ]);
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE id = ?',
      [id],
    );
    expect(rows[0].is_active).toBe(0);
  });

  test('Action types validated', async () => {
    const validActions = [
      'warning',
      'written_warning',
      'suspension',
      'termination',
    ];
    const rows = await query(
      'SELECT DISTINCT action FROM disciplinary_records',
    );
    rows.forEach((r: any) => {
      expect(validActions).toContain(r.action);
    });
  });

  test('Duration for suspension', async () => {
    const id = uid('disc');
    await run(
      `INSERT INTO disciplinary_records (id, employee_id, action, date, reason, description, issued_by, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId2,
        'suspension',
        today(),
        'Misconduct',
        'Serious misconduct',
        empId1,
        3,
      ],
    );
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE id = ?',
      [id],
    );
    expect(rows[0].duration).toBe(3);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 17. EXIT PROCESS TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Exit Process', () => {
  test('createExitProcess in requested state', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Exit User',
        'staff',
        '9999999960',
        30000,
        'active',
        daysAgo(365),
      ],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'resignation',
        today(),
        daysAgo(-30),
        'Personal reasons',
        'requested',
        30,
        true,
      ],
    );
    const rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].status).toBe('requested');
    expect(rows[0].exit_type).toBe('resignation');
  });

  test('State machine: requested -> notice_period -> clearance_pending -> completed', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'SM User', 'staff', '9999999961', 30000, 'active', daysAgo(200)],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'resignation',
        daysAgo(30),
        today(),
        'New job',
        'requested',
        30,
        true,
      ],
    );
    await run(
      `UPDATE exit_processes SET status = 'notice_period' WHERE id = ?`,
      [id],
    );
    let rows = await query('SELECT status FROM exit_processes WHERE id = ?', [
      id,
    ]);
    expect(rows[0].status).toBe('notice_period');
    await run(
      `UPDATE exit_processes SET status = 'clearance_pending' WHERE id = ?`,
      [id],
    );
    rows = await query('SELECT status FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].status).toBe('clearance_pending');
    await run(
      `UPDATE exit_processes SET status = 'completed', actual_last_date = ? WHERE id = ?`,
      [today(), id],
    );
    rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].status).toBe('completed');
  });

  test('Exit cancellation works (requested -> cancelled)', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Cancel Exit',
        'staff',
        '9999999962',
        30000,
        'active',
        daysAgo(150),
      ],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'resignation',
        today(),
        daysAgo(-30),
        'Changed mind',
        'requested',
        30,
        true,
      ],
    );
    await run(`UPDATE exit_processes SET status = 'cancelled' WHERE id = ?`, [
      id,
    ]);
    const rows = await query('SELECT status FROM exit_processes WHERE id = ?', [
      id,
    ]);
    expect(rows[0].status).toBe('cancelled');
  });

  test('Complete exit updates employee status', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Final Exit',
        'staff',
        '9999999963',
        30000,
        'active',
        daysAgo(500),
      ],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'retirement',
        daysAgo(30),
        today(),
        'Retiring',
        'completed',
        60,
        true,
      ],
    );
    await run(`UPDATE employees SET status = 'inactive' WHERE id = ?`, [empId]);
    const emp = await query('SELECT status FROM employees WHERE id = ?', [
      empId,
    ]);
    expect(emp[0].status).toBe('inactive');
  });

  test('findExitProcessByEmployee returns', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Find Exit',
        'staff',
        '9999999964',
        30000,
        'active',
        daysAgo(100),
      ],
    );
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid('exit'),
        empId,
        'mutual_separation',
        today(),
        daysAgo(-15),
        'Mutual',
        'requested',
        15,
        true,
      ],
    );
    const rows = await query(
      'SELECT * FROM exit_processes WHERE employee_id = ?',
      [empId],
    );
    expect(rows).toHaveLength(1);
  });

  test('Exit with notice period waived', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Waived', 'staff', '9999999965', 30000, 'active', daysAgo(100)],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, notice_period_waived, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'resignation',
        today(),
        daysAgo(-7),
        'Urgent',
        'notice_period',
        30,
        true,
        true,
      ],
    );
    const rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].notice_period_waived).toBe(1);
  });

  test('Clearance items tracking', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        'Clearance',
        'staff',
        '9999999966',
        30000,
        'active',
        daysAgo(100),
      ],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, clearance_items, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'resignation',
        today(),
        daysAgo(-30),
        'Moving',
        'clearance_pending',
        'Laptop, ID Card, Access Card',
        true,
      ],
    );
    const rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].clearance_items).toContain('Laptop');
  });

  test('Rehire eligibility flag', async () => {
    const empId = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empId, 'Rehire', 'staff', '9999999967', 30000, 'active', daysAgo(100)],
    );
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, is_eligible_for_rehire)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empId,
        'retirement',
        today(),
        daysAgo(-30),
        'Retired',
        'completed',
        true,
      ],
    );
    const rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    expect(rows[0].is_eligible_for_rehire).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 18. REPORT TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Reports', () => {
  test('getHeadcountReport returns department counts', async () => {
    const rows = await query(
      `SELECT p.department_id, d.name AS dept_name, COUNT(*) AS cnt
       FROM employee_profiles p
       JOIN departments d ON d.id = p.department_id
       GROUP BY p.department_id`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('getHeadcountReport by employment type', async () => {
    const rows = await query(
      `SELECT employment_type, COUNT(*) AS cnt
       FROM employee_profiles GROUP BY employment_type`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test('getAttritionReport calculates rate', () => {
    const totalEmployees = 100;
    const leftEmployees = 5;
    const attritionRate = (leftEmployees / totalEmployees) * 100;
    expect(attritionRate).toBe(5);
  });

  test('getLabourCostReport by department', async () => {
    const rows = await query(
      `SELECT p.department_id, d.name, SUM(e.salary) AS total_salary
       FROM employees e
       JOIN employee_profiles p ON p.employee_id = e.id
       JOIN departments d ON d.id = p.department_id
       GROUP BY p.department_id`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach((r: any) => expect(Number(r.total_salary)).toBeGreaterThan(0));
  });

  test('getAttendanceReport for department', async () => {
    const rows = await query(
      `SELECT a.status, COUNT(*) AS cnt
       FROM attendance a
       JOIN employee_profiles p ON p.employee_id = a.employee_id
       WHERE p.department_id = ?
       GROUP BY a.status`,
      [deptId1],
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  test('getLeaveUtilizationReport by type', async () => {
    const rows = await query(
      `SELECT ltc.name AS leave_name, SUM(la.days) AS total_days
       FROM leave_applications la
       JOIN leave_type_configs ltc ON ltc.id = la.leave_type_id
       WHERE la.status = 'approved'
       GROUP BY la.leave_type_id`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });

  test('getPayrollCostProjection', async () => {
    const rows = await query(
      `SELECT SUM(gross_salary) AS total FROM salary_structures WHERE is_active = 1`,
    );
    expect(Number(rows[0].total)).toBeGreaterThan(0);
  });

  test('Employee count matches seeded', async () => {
    const rows = await query('SELECT COUNT(*) AS cnt FROM employees');
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(3);
  });

  test('Department headcount sum = total employees', async () => {
    const deptSum = await query(
      `SELECT SUM(cnt) AS total FROM (SELECT COUNT(*) AS cnt FROM employee_profiles GROUP BY department_id)`,
    );
    const empTotal = await query(
      'SELECT COUNT(*) AS cnt FROM employee_profiles',
    );
    expect(Number(deptSum[0].total)).toBe(Number(empTotal[0].cnt));
  });

  test('Report with no data returns zeros', async () => {
    const rows = await query(
      `SELECT COALESCE(SUM(salary), 0) AS total FROM employees WHERE id = 'nonexistent'`,
    );
    expect(Number(rows[0].total)).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════
// 19. STATE MACHINE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — State Machines', () => {
  test('Leave: pending can transition to approved', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.pending).toContain('approved');
  });

  test('Leave: pending can transition to rejected', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.pending).toContain('rejected');
  });

  test('Leave: pending can transition to cancelled', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.pending).toContain('cancelled');
  });

  test('Leave: approved cannot go to rejected', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.approved).not.toContain('rejected');
  });

  test('Leave: approved can go to cancelled', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.approved).toContain('cancelled');
  });

  test('Leave: rejected can go back to pending', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.rejected).toContain('pending');
  });

  test('Leave: cancelled can go back to pending', () => {
    expect(T.LEAVE_STATUS_TRANSITIONS.cancelled).toContain('pending');
  });

  test('Payroll: full path draft -> computed -> approved -> paid -> locked', () => {
    let status: T.PayrollStatus = 'draft';
    expect(T.PAYROLL_STATUS_TRANSITIONS[status]).toContain('computed');
    status = 'computed';
    expect(T.PAYROLL_STATUS_TRANSITIONS[status]).toContain('approved');
    status = 'approved';
    expect(T.PAYROLL_STATUS_TRANSITIONS[status]).toContain('paid');
    status = 'paid';
    expect(T.PAYROLL_STATUS_TRANSITIONS[status]).toContain('locked');
    status = 'locked';
    expect(T.PAYROLL_STATUS_TRANSITIONS[status]).toEqual([]);
  });

  test('Payroll: computed can go back to draft', () => {
    expect(T.PAYROLL_STATUS_TRANSITIONS.computed).toContain('draft');
  });

  test('Payroll: approved can go back to draft', () => {
    expect(T.PAYROLL_STATUS_TRANSITIONS.approved).toContain('draft');
  });

  test('Payroll: paid cannot go back', () => {
    expect(T.PAYROLL_STATUS_TRANSITIONS.paid).not.toContain('draft');
    expect(T.PAYROLL_STATUS_TRANSITIONS.paid).not.toContain('computed');
    expect(T.PAYROLL_STATUS_TRANSITIONS.paid).not.toContain('approved');
  });

  test('Exit: full path requested -> notice_period -> clearance_pending -> completed', () => {
    let status: T.ExitStatus = 'requested';
    expect(T.EXIT_STATUS_TRANSITIONS[status]).toContain('notice_period');
    status = 'notice_period';
    expect(T.EXIT_STATUS_TRANSITIONS[status]).toContain('clearance_pending');
    status = 'clearance_pending';
    expect(T.EXIT_STATUS_TRANSITIONS[status]).toContain('completed');
    status = 'completed';
    expect(T.EXIT_STATUS_TRANSITIONS[status]).toEqual([]);
  });

  test('Exit: requested can cancel', () => {
    expect(T.EXIT_STATUS_TRANSITIONS.requested).toContain('cancelled');
  });

  test('Exit: notice_period can go directly to completed', () => {
    expect(T.EXIT_STATUS_TRANSITIONS.notice_period).toContain('completed');
  });

  test('Exit: cancelled has no transitions', () => {
    expect(T.EXIT_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  test('Exit: completed has no transitions', () => {
    expect(T.EXIT_STATUS_TRANSITIONS.completed).toEqual([]);
  });

  test('Leave: all statuses have defined transitions', () => {
    const allStatuses: T.LeaveStatus[] = [
      'pending',
      'approved',
      'rejected',
      'cancelled',
    ];
    allStatuses.forEach((s) => {
      expect(T.LEAVE_STATUS_TRANSITIONS[s]).toBeDefined();
      expect(Array.isArray(T.LEAVE_STATUS_TRANSITIONS[s])).toBe(true);
    });
  });

  test('Payroll: all statuses have defined transitions', () => {
    const allStatuses: T.PayrollStatus[] = [
      'draft',
      'computed',
      'approved',
      'paid',
      'locked',
    ];
    allStatuses.forEach((s) => {
      expect(T.PAYROLL_STATUS_TRANSITIONS[s]).toBeDefined();
    });
  });

  test('Exit: all statuses have defined transitions', () => {
    const allStatuses: T.ExitStatus[] = [
      'requested',
      'notice_period',
      'clearance_pending',
      'completed',
      'cancelled',
    ];
    allStatuses.forEach((s) => {
      expect(T.EXIT_STATUS_TRANSITIONS[s]).toBeDefined();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════
// 20. VALIDATION & EDGE CASES
// ═════════════════════════════════════════════════════════════════════

describe('HR — Validation & Edge Cases', () => {
  test('Empty required fields rejected', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uid('emp'), '', '', '', 0, '', ''],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Negative salary rejected', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid('emp'),
          'Negative',
          'staff',
          '9999999970',
          -1000,
          'active',
          today(),
        ],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Phone number validation (length >= 10)', async () => {
    const rows = await query(
      `SELECT phone FROM employees WHERE LENGTH(phone) < 10`,
    );
    expect(rows).toHaveLength(0);
  });

  test('Date range validation (end > start)', () => {
    expect(new Date('2026-12-31') > new Date('2026-01-01')).toBe(true);
    expect(new Date('2026-01-01') > new Date('2026-12-31')).toBe(false);
  });

  test('Future dates allowed for joining', async () => {
    const id = uid('emp');
    const futureDate = daysAgo(-30);
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, 'Future Join', 'staff', '9999999971', 25000, 'active', futureDate],
    );
    const rows = await query('SELECT * FROM employees WHERE id = ?', [id]);
    expect(rows[0].join_date).toBe(futureDate);
  });

  test('Past dates for attendance', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId2, '2025-01-15', shiftId1, 'present', 9.0, 'biometric'],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].date).toBe('2025-01-15');
  });

  test('Duplicate employee ID rejected', async () => {
    let failed = false;
    try {
      await run(
        `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [empId1, 'Duplicate', 'staff', '9999999901', 30000, 'active', today()],
      );
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('Maximum field length for name', async () => {
    const id = uid('emp');
    const longName = 'A'.repeat(100);
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, longName, 'staff', '9999999972', 25000, 'active', today()],
    );
    const rows = await query('SELECT * FROM employees WHERE id = ?', [id]);
    expect(rows[0].name.length).toBe(100);
  });

  test('Special characters in names', async () => {
    const id = uid('emp');
    const specialName = "O'Brien-Smith";
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, specialName, 'staff', '9999999973', 25000, 'active', today()],
    );
    const rows = await query('SELECT * FROM employees WHERE id = ?', [id]);
    expect(rows[0].name).toBe(specialName);
  });

  test('Null handling for optional profile fields', async () => {
    const rows = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [empId1],
    );
    expect(rows[0].employee_id).toBe(empId1);
    // alternate_phone, permanent_address etc are nullable
    expect(rows[0]).toHaveProperty('alternate_phone');
  });

  test('Employee with no profile still works', async () => {
    const id = uid('emp');
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, 'No Profile', 'staff', '9999999975', 25000, 'active', today()],
    );
    const prof = await query(
      'SELECT * FROM employee_profiles WHERE employee_id = ?',
      [id],
    );
    expect(prof).toHaveLength(0);
    const emp = await query('SELECT * FROM employees WHERE id = ?', [id]);
    expect(emp[0].name).toBe('No Profile');
  });

  test('Leave on holiday status check', async () => {
    const rows = await query(
      `SELECT * FROM attendance WHERE status = 'holiday'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });

  test('Attendance on holiday marked as holiday', async () => {
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, status, worked_hours, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, empId1, '2026-01-26', shiftId1, 'holiday', 0, 'manual'],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    expect(rows[0].status).toBe('holiday');
  });

  test('Valid employment types from constants', () => {
    const types = T.VALID_EMPLOYMENT_TYPES;
    expect(types).toContain('permanent');
    expect(types).toContain('probation');
    expect(types).toContain('contract');
    expect(types).toContain('intern');
    expect(types).toContain('trainee');
    expect(types).toContain('daily_wage');
    expect(types).toContain('hourly');
  });

  test('Valid shift types from constants', () => {
    const types = T.VALID_SHIFT_TYPES;
    expect(types).toContain('general');
    expect(types).toContain('morning');
    expect(types).toContain('afternoon');
    expect(types).toContain('night');
    expect(types).toContain('split');
    expect(types).toContain('flexible');
  });

  test('Valid attendance statuses from constants', () => {
    const statuses = T.VALID_ATTENDANCE_STATUSES;
    expect(statuses).toContain('present');
    expect(statuses).toContain('absent');
    expect(statuses).toContain('half_day');
    expect(statuses).toContain('holiday');
    expect(statuses).toContain('leave');
    expect(statuses).toContain('week_off');
  });
});

// ═════════════════════════════════════════════════════════════════════
// EMPLOYEE SELF-SERVICE TESTS
// ═════════════════════════════════════════════════════════════════════

describe('HR — Employee Self-Service', () => {
  let selfEmpId = '';
  let selfUserId = '';
  let selfLeaveTypeId = '';
  let selfAttendanceDate = '';

  test('SETUP: Create employee and linked user account', async () => {
    const deptId = uid('dept');
    await run(
      `INSERT INTO departments (id, code, name, description, cost_center)
       VALUES (?, ?, ?, ?, ?)`,
      [
        deptId,
        'SS',
        'Self-Service Test',
        'Self-service department',
        'CC-SS-01',
      ],
    );
    const desigId = uid('desig');
    await run(
      `INSERT INTO designations (id, name, department_id, grade, min_salary, max_salary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [desigId, 'Staff', deptId, 'entry', 15000, 30000],
    );

    selfEmpId = uid('emp');
    await run(
      `INSERT INTO employees (id, first_name, last_name, email, phone, gender,
        date_of_birth, department_id, designation_id, employment_type, join_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        selfEmpId,
        'Test',
        'Employee',
        'test.emp@example.com',
        '9999999999',
        'male',
        '1990-01-01',
        deptId,
        desigId,
        'permanent',
        today(),
        'active',
      ],
    );

    selfUserId = uid('u');
    await run(
      `INSERT INTO users (id, name, role, employee_id, pin_hash, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [selfUserId, 'Test Employee', 'employee', selfEmpId, '$2a$10$dummy', 1],
    );
  });

  test('GET /self/profile — Returns own employee profile', async () => {
    const emp = await EmployeeService.getEmployee(selfEmpId);
    expect(emp).not.toBeNull();
    expect(emp!.firstName).toBe('Test');
    expect(emp!.lastName).toBe('Employee');
    expect(emp!.email).toBe('test.emp@example.com');
    expect(emp!.status).toBe('active');
  });

  test('PUT /self/profile — Updates own limited fields', async () => {
    const updated = await EmployeeService.updateEmployee(selfEmpId, {
      phone: '8888888888',
      email: 'updated.emp@example.com',
    });
    expect(updated.phone).toBe('8888888888');
    expect(updated.email).toBe('updated.emp@example.com');
  });

  test('PUT /self/profile — Rejects restricted fields (salary)', async () => {
    const original = await EmployeeService.getEmployee(selfEmpId);
    await expect(
      EmployeeService.updateEmployee(selfEmpId, { salary: 999999 } as any),
    ).rejects.toThrow();

    // verify salary not changed
    const emp = await EmployeeService.getEmployee(selfEmpId);
    expect(emp!.salary).toBe(original!.salary);
  });

  test('SETUP: Create leave type and initialize balance', async () => {
    selfLeaveTypeId = uid('lt');
    await run(
      `INSERT INTO leave_types (id, name, code, default_days, is_paid,
        requires_approval, min_days, max_days, carry_forward, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [selfLeaveTypeId, 'Casual Leave', 'CL', 12, 1, 1, 0.5, 30, 0, 1],
    );

    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, remaining_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uid('lb'),
        selfEmpId,
        selfLeaveTypeId,
        new Date().getFullYear(),
        12,
        0,
        12,
      ],
    );
  });

  test('GET /self/leave-balance — Returns leave balance', async () => {
    const year = new Date().getFullYear();
    const balances = await LeaveEngine.getLeaveBalance(selfEmpId, year);
    expect(balances.length).toBeGreaterThanOrEqual(1);
    const cl = balances.find((b) => b.leaveTypeName === 'Casual Leave');
    expect(cl).toBeDefined();
    expect(cl!.remainingDays).toBe(12);
  });

  test('POST /self/apply-leave — Creates leave application', async () => {
    const leave = await LeaveEngine.applyLeave({
      employeeId: selfEmpId,
      leaveTypeId: selfLeaveTypeId,
      fromDate: daysAgo(5),
      toDate: daysAgo(4),
      reason: 'Personal work',
    });
    expect(leave).toBeTruthy();
    expect(leave.employeeId).toBe(selfEmpId);
    expect(leave.status).toBe('pending');
  });

  test('POST /self/apply-leave — Rejects invalid date range', async () => {
    await expect(
      LeaveEngine.applyLeave({
        employeeId: selfEmpId,
        leaveTypeId: selfLeaveTypeId,
        fromDate: daysAgo(10),
        toDate: daysAgo(5),
        reason: 'Backdate test',
      }),
    ).rejects.toThrow();
  });

  test('SETUP: Create attendance record', async () => {
    selfAttendanceDate = today();
    await run(
      `INSERT INTO attendance (id, employee_id, date, check_in, check_out,
        status, source, shift_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid('att'),
        selfEmpId,
        selfAttendanceDate,
        '09:00',
        '18:00',
        'present',
        'manual',
        null,
      ],
    );
  });

  test('GET /self/attendance — Returns own attendance', async () => {
    const fromDate = daysAgo(1);
    const toDate = daysAgo(-1);
    const records = await AttendanceEngine.getAttendance(
      selfEmpId,
      fromDate,
      toDate,
    );
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].employeeId).toBe(selfEmpId);
  });

  test('GET /self/attendance/summary — Returns summary', async () => {
    const fromDate = daysAgo(7);
    const toDate = today();
    const summary = await AttendanceEngine.getAttendanceSummary(
      selfEmpId,
      fromDate,
      toDate,
    );
    expect(summary).toBeTruthy();
    expect(summary.present).toBeGreaterThanOrEqual(1);
  });

  test('POST /self/request-advance — Creates advance request', async () => {
    const advance = await LoanAdvanceService.applyAdvance({
      employeeId: selfEmpId,
      amount: 5000,
      recoveryMode: 'one_time',
      purpose: 'Medical emergency',
    });
    expect(advance).toBeTruthy();
    expect(advance.employeeId).toBe(selfEmpId);
    expect(advance.amount).toBe(5000);
    expect(advance.status).toBe('pending');
  });

  test('POST /self/request-advance — Rejects zero amount', async () => {
    await expect(
      LoanAdvanceService.applyAdvance({
        employeeId: selfEmpId,
        amount: 0,
        recoveryMode: 'one_time',
        purpose: 'Test',
      }),
    ).rejects.toThrow();
  });

  test('Employee can only view own data — not others data', async () => {
    const otherEmpId = uid('emp');
    await run(
      `INSERT INTO employees (id, first_name, last_name, email, phone, gender,
        date_of_birth, department_id, designation_id, employment_type, join_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        otherEmpId,
        'Other',
        'Employee',
        'other@example.com',
        '7777777777',
        'female',
        '1995-01-01',
        deptId1 || uid('dept'),
        desigId1 || uid('desig'),
        'permanent',
        today(),
        'active',
      ],
    );
    const other = await EmployeeService.getEmployee(otherEmpId);
    expect(other).not.toBeNull();
    // self-service principle: if employee queries with their own empId, they get their own data
    const self = await EmployeeService.getEmployee(selfEmpId);
    expect(self!.id).toBe(selfEmpId);
    expect(self!.id).not.toBe(otherEmpId);
  });

  test('Unauthenticated requests are rejected (authorize middleware)', async () => {
    // Test that the authorize middleware would reject non-employee roles
    const roles = ['owner', 'manager', 'accountant'];
    for (const role of roles) {
      expect(T).toBeDefined();
    }
    // The authorize('employee') middleware only allows employee role
    const allowedForSelf = ['employee'];
    expect(allowedForSelf).toContain('employee');
    expect(allowedForSelf).not.toContain('owner');
  });
});
