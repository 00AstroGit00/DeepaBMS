import { keyOf } from './helpers';
import { Employee, LeaveRequest } from '../context/StoreContext';

export interface PayrollRow {
  empId: string;
  name: string;
  role: string;
  salary: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  advances: number;
  deductions: number;
  net: number;
}

export interface PayrollTotals {
  gross: number;
  advances: number;
  deductions: number;
  net: number;
}

export const computePayroll = (
  employees: Employee[],
  leaves: LeaveRequest[],
  monthKey: string // format: 'YYYY-MM'
): PayrollRow[] => {
  return employees
    .filter((emp) => emp.status === 'active')
    .map((emp) => {
      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let unpaidLeaveDays = 0;

      Object.entries(emp.attendance).forEach(([dateStr, status]) => {
        if (dateStr.startsWith(monthKey)) {
          if (status === 'P') {
            presentDays++;
          } else if (status === 'H') {
            halfDays++;
          } else if (status === 'A') {
            absentDays++;
          } else if (status === 'L') {
            leaveDays++;
            const lRequest = leaves.find(
              (l) =>
                l.empId === emp.id &&
                l.status === 'approved' &&
                l.from <= dateStr &&
                dateStr <= l.to
            );
            if (lRequest && lRequest.type === 'unpaid') {
              unpaidLeaveDays++;
            }
          }
        }
      });

      const dailyRate = emp.salary / 26;
      const advancesSum = emp.advances
        .filter((adv) => keyOf(adv.date).startsWith(monthKey))
        .reduce((sum, item) => sum + item.amount, 0);

      const deductionsSum = Math.round(
        dailyRate * (absentDays + unpaidLeaveDays) + (dailyRate / 2) * halfDays
      );
      const netSalary = Math.max(0, Math.round(emp.salary - advancesSum - deductionsSum));

      return {
        empId: emp.id,
        name: emp.name,
        role: emp.role,
        salary: emp.salary,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        unpaidLeaveDays,
        advances: advancesSum,
        deductions: deductionsSum,
        net: netSalary
      };
    });
};

export const payrollTotals = (rows: PayrollRow[]): PayrollTotals => {
  return {
    gross: rows.reduce((sum, row) => sum + row.salary, 0),
    advances: rows.reduce((sum, row) => sum + row.advances, 0),
    deductions: rows.reduce((sum, row) => sum + row.deductions, 0),
    net: rows.reduce((sum, row) => sum + row.net, 0)
  };
};
