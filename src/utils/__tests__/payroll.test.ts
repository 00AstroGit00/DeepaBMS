import { computePayroll, payrollTotals } from '../payroll';
import { Employee, LeaveRequest } from '../../context/StoreContext';

describe('Payroll Calculations', () => {
  const dummyEmployees: Employee[] = [
    {
      id: 'emp-1',
      name: 'Rajan',
      role: 'Manager',
      phone: '9876543210',
      salary: 26000, // 26000 / 26 = 1000 dailyRate
      attendance: {
        '2026-07-01': 'P',
        '2026-07-02': 'H', // 0.5 day deduction (₹500)
        '2026-07-03': 'A', // 1 day deduction (₹1000)
        '2026-07-04': 'L'  // Unpaid leave day (₹1000 deduction)
      },
      advances: [
        { id: 'adv-1', date: '2026-07-05T12:00:00Z', amount: 5000 }
      ],
      status: 'active',
      joinDate: '2022-01-01',
      access: 'manager',
      leaveBalance: { casual: 6, sick: 6 },
      reviews: [],
      documents: []
    }
  ];

  const dummyLeaves: LeaveRequest[] = [
    {
      id: 'leave-1',
      empId: 'emp-1',
      from: '2026-07-04',
      to: '2026-07-04',
      days: 1,
      type: 'unpaid',
      reason: 'Personal work',
      status: 'approved',
      requestedOn: '2026-07-03T10:00:00Z'
    }
  ];

  test('computePayroll correctly handles half days, absences, unpaid leaves, and advances', () => {
    const rows = computePayroll(dummyEmployees, dummyLeaves, '2026-07');
    expect(rows).toHaveLength(1);

    const r = rows[0];
    expect(r.presentDays).toBe(1);
    expect(r.halfDays).toBe(1);
    expect(r.absentDays).toBe(1);
    expect(r.unpaidLeaveDays).toBe(1);
    expect(r.advances).toBe(5000);

    // Deductions: 1000 * (1 absent + 1 unpaid) + (1000 / 2) * 1 half day = 2000 + 500 = 2500
    expect(r.deductions).toBe(2500);

    // Net salary: 26000 - 5000 (advance) - 2500 (deductions) = 18500
    expect(r.net).toBe(18500);
  });

  test('payrollTotals computes grand totals accurately', () => {
    const rows = computePayroll(dummyEmployees, dummyLeaves, '2026-07');
    const totals = payrollTotals(rows);
    expect(totals.gross).toBe(26000);
    expect(totals.advances).toBe(5000);
    expect(totals.deductions).toBe(2500);
    expect(totals.net).toBe(18500);
  });
});
