import { query, run } from '../../db';
import * as R from './hr.repository';
import * as T from './hr.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

const today = (): string => now().slice(0, 10);

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateEmployeeCode(
  departmentCode: string,
  sequence: number,
): string {
  const seq = String(sequence).padStart(4, '0');
  return `${departmentCode}${seq}`;
}

function validateTransition<T extends string>(
  current: T,
  next: T,
  transitions: Record<T, T[]>,
): void {
  const allowed = transitions[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error(`Invalid transition: ${current} -> ${next}`);
  }
}

// ── 1. EmployeeService ─────────────────────────────────────────────────────

export const EmployeeService = {
  async createEmployee(dto: T.CreateEmployeeDto): Promise<T.Employee> {
    if (!dto.firstName?.trim()) throw new Error('First name is required');
    if (!dto.lastName?.trim()) throw new Error('Last name is required');
    if (!dto.phone?.trim()) throw new Error('Phone is required');

    const dept = await R.HrRepository.findDepartmentById(dto.departmentId);
    if (!dept) throw new Error(`Department not found: ${dto.departmentId}`);

    const desig = await R.HrRepository.findDesignationById(dto.designationId);
    if (!desig) throw new Error(`Designation not found: ${dto.designationId}`);

    const existing = await R.HrRepository.getEmployeeCount();
    const employeeCode = generateEmployeeCode(dept.code, existing + 1);

    const employee = await R.HrRepository.createEmployee({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: dto.email || undefined,
      phone: dto.phone.trim(),
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      employmentType: dto.employmentType || 'permanent',
      joinDate: dto.joinDate,
      reportingToId: dto.reportingToId || undefined,
      bankAccountNo: dto.bankAccountNo || undefined,
      bankName: dto.bankName || undefined,
      bankIfsc: dto.bankIfsc || undefined,
      pfNumber: dto.pfNumber || undefined,
      esiNumber: dto.esiNumber || undefined,
      panNumber: dto.panNumber || undefined,
      aadhaarNumber: dto.aadhaarNumber || undefined,
    });

    if (dto.salary && dto.salary > 0) {
      await R.HrRepository.createSalaryStructure({
        employeeId: employee.id,
        effectiveFrom: dto.joinDate,
        basicPay: round2(dto.salary * 0.4),
        hra: round2(dto.salary * 0.2),
        conveyanceAllowance: round2(dto.salary * 0.1),
        medicalAllowance: 1250,
        specialAllowance: round2(dto.salary * 0.2),
        otherAllowance: 0,
      });
    }

    return employee;
  },

  async updateEmployee(
    id: string,
    updates: Partial<T.CreateEmployeeDto & { status: T.EmployeeStatus }>,
  ): Promise<T.Employee> {
    const existing = await R.HrRepository.findEmployeeById(id);
    if (!existing) throw new Error(`Employee not found: ${id}`);

    return R.HrRepository.updateEmployee(id, {
      ...updates,
    });
  },

  async getEmployee(id: string): Promise<T.Employee | null> {
    return R.HrRepository.findEmployeeById(id);
  },

  async listEmployees(
    filter?: T.EmployeeFilter,
  ): Promise<T.PaginatedResult<T.Employee>> {
    return R.HrRepository.findAllEmployees(filter || {});
  },

  async getEmployeeReport(id: string): Promise<{
    employee: T.Employee | null;
    attendance: T.Attendance[];
    leaves: T.LeaveApplication[];
    payroll: T.EmployeePayroll[];
  }> {
    const employee = await R.HrRepository.findEmployeeById(id);
    if (!employee) throw new Error(`Employee not found: ${id}`);

    const [attendance, leaves] = await Promise.all([
      R.HrRepository.findAttendanceRange(id, '2000-01-01', today()),
      R.HrRepository.findLeaveApplicationsByEmployee(id),
    ]);
    const payroll: T.EmployeePayroll[] = [];

    return { employee, attendance, leaves, payroll };
  },

  async getOrgChart(): Promise<any[]> {
    const employees = await R.HrRepository.findAllEmployees({});
    const depts = await R.HrRepository.findAllDepartments();
    const deptMap = new Map<string, any>();

    for (const dept of depts) {
      deptMap.set(dept.id, {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        headId: dept.headId,
        children: [],
        employees: [],
      });
    }

    for (const emp of employees.data) {
      if (emp.departmentId && deptMap.has(emp.departmentId)) {
        const node = deptMap.get(emp.departmentId);
        if (emp.reportingToId === null) {
          node.headId = emp.id;
        }
        node.employees.push({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          designationId: emp.designationId,
          reportingToId: emp.reportingToId,
        });
      }
    }

    const tree: any[] = [];
    for (const dept of depts) {
      if (!dept.parentId) {
        const node = deptMap.get(dept.id);
        if (node) {
          node.children = depts
            .filter((d) => d.parentId === dept.id)
            .map((d) => deptMap.get(d.id))
            .filter(Boolean);
          tree.push(node);
        }
      }
    }

    return tree;
  },
};

// ── 2. AttendanceEngine ────────────────────────────────────────────────────

export const AttendanceEngine = {
  async markAttendance(dto: T.MarkAttendanceDto): Promise<T.Attendance> {
    const employee = await R.HrRepository.findEmployeeById(dto.employeeId);
    if (!employee) throw new Error(`Employee not found: ${dto.employeeId}`);

    let shiftId = dto.shiftId || null;
    if (!shiftId) {
      const empShifts = await R.HrRepository.getEmployeeShifts(dto.employeeId);
      const empShift = empShifts[0];
      if (empShift) {
        shiftId = empShift.shiftId;
      }
    }

    let shift: T.Shift | null = null;
    if (shiftId) {
      shift = await R.HrRepository.findShiftById(shiftId);
    }

    let status = dto.status || 'present';
    let workedHours = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let missingPunch = false;

    if (shift) {
      const fullDayHours = shift.fullDayHours || T.FULL_DAY_HOURS;

      if (!dto.clockIn && !dto.clockOut) {
        status = 'absent';
        missingPunch = true;
      } else if (dto.clockIn && dto.clockOut) {
        const clockInDate = new Date(`2000-01-01T${dto.clockIn}`);
        const shiftStart = new Date(`2000-01-01T${shift.startTime}`);
        const clockOutDate = new Date(`2000-01-01T${dto.clockOut}`);
        const shiftEnd = new Date(`2000-01-01T${shift.endTime}`);

        const diffMs = clockOutDate.getTime() - clockInDate.getTime();
        workedHours = Math.max(0, diffMs / (1000 * 60 * 60));

        if (
          clockInDate.getTime() >
          shiftStart.getTime() + shift.graceMinutes * 60 * 1000
        ) {
          status = 'late';
          lateMinutes = Math.round(
            (clockInDate.getTime() - shiftStart.getTime()) / (1000 * 60),
          );
        }

        if (
          clockOutDate.getTime() <
          shiftEnd.getTime() - shift.graceMinutes * 60 * 1000
        ) {
          status = status === 'late' ? 'late' : 'early_departure';
          earlyDepartureMinutes = Math.round(
            (shiftEnd.getTime() - clockOutDate.getTime()) / (1000 * 60),
          );
        }

        if (workedHours >= fullDayHours) {
          overtimeHours = Math.min(
            workedHours - fullDayHours,
            T.MAX_OT_HOURS_PER_DAY,
          );
        }

        if (workedHours <= shift.halfDayHours) {
          status = 'half_day';
        }
      } else {
        missingPunch = true;
        status = dto.status || 'present';
      }
    } else {
      if (!dto.clockIn && !dto.clockOut) {
        status = 'absent';
        missingPunch = true;
      } else if (dto.clockIn && dto.clockOut) {
        const clockInDate = new Date(`2000-01-01T${dto.clockIn}`);
        const clockOutDate = new Date(`2000-01-01T${dto.clockOut}`);
        const diffMs = clockOutDate.getTime() - clockInDate.getTime();
        workedHours = Math.max(0, diffMs / (1000 * 60 * 60));
      } else {
        missingPunch = true;
      }
    }

    const existing = await R.HrRepository.findAttendanceByEmployeeAndDate(
      dto.employeeId,
      dto.date,
    );
    if (existing) {
      throw new Error(
        `Attendance already exists for ${dto.employeeId} on ${dto.date}`,
      );
    }

    const created = await R.HrRepository.markAttendance({
      employeeId: dto.employeeId,
      date: dto.date,
      shiftId: shiftId || undefined,
      clockIn: dto.clockIn || undefined,
      clockOut: dto.clockOut || undefined,
      status,
      notes: dto.notes || undefined,
      source: (dto.source as any) || 'manual',
    });

    return R.HrRepository.updateAttendance(created.id, {
      workedHours: round2(workedHours),
      overtimeHours: round2(overtimeHours),
      lateMinutes,
      earlyDepartureMinutes,
      missingPunch,
    });
  },

  async bulkMarkAttendance(
    records: T.MarkAttendanceDto[],
  ): Promise<T.Attendance[]> {
    const results: T.Attendance[] = [];
    for (const record of records) {
      const attendance = await this.markAttendance(record);
      results.push(attendance);
    }
    return results;
  },

  async getAttendance(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<T.Attendance[]> {
    return R.HrRepository.findAttendanceRange(employeeId, fromDate, toDate);
  },

  async getAttendanceSummary(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{
    present: number;
    absent: number;
    halfDays: number;
    lateDays: number;
    overtimeHours: number;
  }> {
    const records = await R.HrRepository.findAttendanceRange(
      employeeId,
      fromDate,
      toDate,
    );
    let present = 0;
    let absent = 0;
    let halfDays = 0;
    let late = 0;
    let overtimeHours = 0;

    for (const r of records) {
      switch (r.status) {
        case 'present':
          present++;
          break;
        case 'absent':
          absent++;
          break;
        case 'half_day':
          halfDays++;
          break;
        case 'late':
          late++;
          break;
      }
      overtimeHours += r.overtimeHours;
    }

    return {
      present,
      absent,
      halfDays,
      lateDays: late,
      overtimeHours: round2(overtimeHours),
    };
  },

  async getDepartmentAttendance(
    departmentId: string,
    date: string,
  ): Promise<T.Attendance[]> {
    const employees = await R.HrRepository.findAllEmployees({
      departmentId,
      isActive: true,
    });
    const employeeIds = employees.data.map((e) => e.id);
    if (!employeeIds.length) return [];

    return R.HrRepository.findAttendanceByDepartment(departmentId, date, date);
  },

  async approveAttendance(
    id: string,
    approvedBy: string,
  ): Promise<T.Attendance> {
    const attendance = await R.HrRepository.findAttendanceById(id);
    if (!attendance) throw new Error(`Attendance not found: ${id}`);
    if (attendance.isApproved)
      throw new Error('Attendance is already approved');

    return R.HrRepository.approveAttendance(id, approvedBy);
  },

  async requestAttendanceCorrection(dto: {
    employeeId: string;
    date: string;
    originalClockIn?: string;
    originalClockOut?: string;
    correctedClockIn?: string;
    correctedClockOut?: string;
    reason: string;
  }): Promise<T.AttendanceCorrection> {
    const attendance = await R.HrRepository.findAttendanceByEmployeeAndDate(
      dto.employeeId,
      dto.date,
    );
    if (!attendance)
      throw new Error(
        `Attendance not found for ${dto.employeeId} on ${dto.date}`,
      );

    return R.HrRepository.createAttendanceCorrection({
      employeeId: dto.employeeId,
      date: dto.date,
      originalClockIn: attendance.clockIn,
      originalClockOut: attendance.clockOut,
      correctedClockIn: dto.correctedClockIn || attendance.clockIn,
      correctedClockOut: dto.correctedClockOut || attendance.clockOut,
      reason: dto.reason,
    });
  },

  async approveAttendanceCorrection(
    id: string,
    approvedBy: string,
  ): Promise<T.Attendance> {
    const correction = await R.HrRepository.findAttendanceCorrectionById(id);
    if (!correction) throw new Error(`Correction not found: ${id}`);
    if (correction.status !== 'pending') {
      throw new Error(`Correction is already ${correction.status}`);
    }

    await R.HrRepository.approveAttendanceCorrection(id, approvedBy);

    const attendance = await R.HrRepository.findAttendanceByEmployeeAndDate(
      correction.employeeId,
      correction.date,
    );
    if (!attendance) throw new Error('Original attendance record not found');

    return R.HrRepository.updateAttendance(attendance.id, {
      clockIn: correction.correctedClockIn,
      clockOut: correction.correctedClockOut,
    });
  },

  async getMissingPunches(date: string): Promise<T.Employee[]> {
    const employees = await R.HrRepository.findAllEmployees({ isActive: true });
    const missing: T.Employee[] = [];
    for (const emp of employees.data) {
      const attendance = await R.HrRepository.findAttendanceByEmployeeAndDate(
        emp.id,
        date,
      );
      if (!attendance || attendance.missingPunch) {
        missing.push(emp);
      }
    }
    return missing;
  },

  async getLateReport(
    fromDate: string,
    toDate: string,
  ): Promise<
    {
      employeeId: string;
      employeeName: string;
      date: string;
      lateMinutes: number;
    }[]
  > {
    const records = await R.HrRepository.findLateAttendance(fromDate, toDate);
    const employees = await R.HrRepository.findAllEmployees({});

    const empMap = new Map(employees.data.map((e) => [e.id, e]));

    return records.map((r) => ({
      employeeId: r.employeeId,
      employeeName: (() => {
        const emp = empMap.get(r.employeeId);
        return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
      })(),
      date: r.date,
      lateMinutes: r.lateMinutes,
    }));
  },
};

// ── 3. LeaveEngine ─────────────────────────────────────────────────────────

export const LeaveEngine = {
  async applyLeave(dto: T.LeaveApplicationDto): Promise<T.LeaveApplication> {
    const employee = await R.HrRepository.findEmployeeById(dto.employeeId);
    if (!employee) throw new Error(`Employee not found: ${dto.employeeId}`);

    const leaveConfig = await R.HrRepository.findLeaveTypeById(dto.leaveTypeId);
    if (!leaveConfig)
      throw new Error(`Leave type not found: ${dto.leaveTypeId}`);

    if (!leaveConfig.isActive) throw new Error('Leave type is inactive');

    if (
      leaveConfig.genderRestriction &&
      leaveConfig.genderRestriction !== employee.gender
    ) {
      throw new Error(
        `Leave type ${leaveConfig.name} is not applicable for gender ${employee.gender}`,
      );
    }

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    const days = Math.max(
      1,
      Math.round(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1,
    );

    const session = dto.session || 'full_day';
    const effectiveDays = session === 'full_day' ? days : days * 0.5;

    const serviceDays = Math.round(
      (fromDate.getTime() - new Date(employee.joinDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (serviceDays < leaveConfig.minServiceDays) {
      throw new Error(
        `Minimum ${leaveConfig.minServiceDays} days service required for ${leaveConfig.name}`,
      );
    }

    if (
      leaveConfig.maxConsecutive > 0 &&
      effectiveDays > leaveConfig.maxConsecutive
    ) {
      throw new Error(
        `Max ${leaveConfig.maxConsecutive} consecutive days allowed for ${leaveConfig.name}`,
      );
    }

    const overlapping = await R.HrRepository.getLeavesInRange(
      dto.employeeId,
      dto.fromDate,
      dto.toDate,
    );
    if (overlapping.length > 0) {
      throw new Error('Leave overlaps with an existing application');
    }

    const year = fromDate.getFullYear();
    let balance = await R.HrRepository.findLeaveBalance(
      dto.employeeId,
      dto.leaveTypeId,
      year,
    );
    if (!balance) {
      const balances = await this.initializeLeaveBalances(dto.employeeId, year);
      balance = balances.find((b) => b.leaveTypeId === dto.leaveTypeId) || null;
    }

    if (balance && leaveConfig.type !== 'loss_of_pay') {
      const available =
        balance.totalDays +
        balance.carriedForward -
        balance.usedDays -
        balance.pendingDays;
      if (effectiveDays > available) {
        throw new Error(
          `Insufficient balance: requested ${effectiveDays}, available ${available}`,
        );
      }
    }

    if (balance && leaveConfig.type !== 'loss_of_pay') {
      await R.HrRepository.updateLeaveBalance(balance.id, {
        pendingDays: balance.pendingDays + effectiveDays,
      });
    }

    let reportingTo = dto.employeeId;
    if (employee.reportingToId) {
      reportingTo = employee.reportingToId;
    }

    return R.HrRepository.createLeaveApplication({
      employeeId: dto.employeeId,
      leaveTypeId: dto.leaveTypeId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      session: dto.session || 'full_day',
      reason: dto.reason,
      isUrgent: dto.isUrgent || false,
      contactDuringLeave: dto.contactDuringLeave || undefined,
    });
  },

  async approveLeave(
    id: string,
    approvedBy: string,
  ): Promise<T.LeaveApplication> {
    const leave = await R.HrRepository.findLeaveApplicationById(id);
    if (!leave) throw new Error(`Leave application not found: ${id}`);
    validateTransition(leave.status, 'approved', T.LEAVE_STATUS_TRANSITIONS);

    const approved = await R.HrRepository.updateLeaveApplicationStatus(
      id,
      'approved',
      approvedBy,
    );

    const year = new Date(leave.fromDate).getFullYear();
    const balance = await R.HrRepository.findLeaveBalance(
      leave.employeeId,
      leave.leaveTypeId,
      year,
    );
    if (balance) {
      await R.HrRepository.updateLeaveBalance(balance.id, {
        usedDays: balance.usedDays + leave.days,
        pendingDays: Math.max(0, balance.pendingDays - leave.days),
      });
    }

    return approved;
  },

  async rejectLeave(
    id: string,
    approverId: string,
    reason: string,
  ): Promise<T.LeaveApplication> {
    const leave = await R.HrRepository.findLeaveApplicationById(id);
    if (!leave) throw new Error(`Leave application not found: ${id}`);
    validateTransition(leave.status, 'rejected', T.LEAVE_STATUS_TRANSITIONS);

    const rejected = await R.HrRepository.updateLeaveApplicationStatus(
      id,
      'rejected',
      approverId,
      reason,
    );

    const year = new Date(leave.fromDate).getFullYear();
    const balance = await R.HrRepository.findLeaveBalance(
      leave.employeeId,
      leave.leaveTypeId,
      year,
    );
    if (balance) {
      await R.HrRepository.updateLeaveBalance(balance.id, {
        pendingDays: Math.max(0, balance.pendingDays - leave.days),
      });
    }

    return rejected;
  },

  async cancelLeave(id: string): Promise<T.LeaveApplication> {
    const leave = await R.HrRepository.findLeaveApplicationById(id);
    if (!leave) throw new Error(`Leave application not found: ${id}`);
    validateTransition(leave.status, 'cancelled', T.LEAVE_STATUS_TRANSITIONS);

    const cancelled = await R.HrRepository.updateLeaveApplicationStatus(
      id,
      'cancelled',
    );

    const year = new Date(leave.fromDate).getFullYear();
    const balance = await R.HrRepository.findLeaveBalance(
      leave.employeeId,
      leave.leaveTypeId,
      year,
    );
    if (balance) {
      const usedReduction = leave.status === 'approved' ? leave.days : 0;
      const pendingReduction = leave.status === 'pending' ? leave.days : 0;
      await R.HrRepository.updateLeaveBalance(balance.id, {
        usedDays: Math.max(0, balance.usedDays - usedReduction),
        pendingDays: Math.max(0, balance.pendingDays - pendingReduction),
      });
    }

    return cancelled;
  },

  async getLeaveBalance(
    employeeId: string,
    year: number,
  ): Promise<T.LeaveBalance[]> {
    return R.HrRepository.findLeaveBalancesByEmployee(employeeId, year);
  },

  async initializeLeaveBalances(
    employeeId: string,
    year: number,
  ): Promise<T.LeaveBalance[]> {
    const configs = await R.HrRepository.findAllLeaveTypeConfigs();
    const results: T.LeaveBalance[] = [];
    for (const config of configs) {
      if (!config.isActive) continue;
      const existing = await R.HrRepository.findLeaveBalance(
        employeeId,
        config.id,
        year,
      );
      if (existing) {
        results.push(existing);
        continue;
      }
      const balance = await R.HrRepository.createLeaveBalance({
        employeeId,
        leaveTypeId: config.id,
        year,
        totalDays: config.daysPerCycle,
        usedDays: 0,
        pendingDays: 0,
        carriedForward: 0,
      });
      results.push(balance);
    }
    return results;
  },

  async carryForwardLeave(
    employeeId: string,
    fromYear: number,
    toYear: number,
  ): Promise<T.LeaveBalance[]> {
    const configs = await R.HrRepository.findAllLeaveTypeConfigs();
    const carryForwardConfigs = configs.filter((c) => c.isCarryForward);
    const results: T.LeaveBalance[] = [];

    for (const config of carryForwardConfigs) {
      const fromBalance = await R.HrRepository.findLeaveBalance(
        employeeId,
        config.id,
        fromYear,
      );
      if (!fromBalance) continue;

      const remaining =
        fromBalance.totalDays +
        fromBalance.carriedForward -
        fromBalance.usedDays;
      if (remaining <= 0) continue;

      const carryAmount = Math.min(remaining, config.carryForwardLimit);
      if (carryAmount <= 0) continue;

      let toBalance = await R.HrRepository.findLeaveBalance(
        employeeId,
        config.id,
        toYear,
      );
      if (toBalance) {
        await R.HrRepository.updateLeaveBalance(toBalance.id, {
          carriedForward: toBalance.carriedForward + carryAmount,
        });
      } else {
        toBalance = await R.HrRepository.createLeaveBalance({
          employeeId,
          leaveTypeId: config.id,
          year: toYear,
          totalDays: config.daysPerCycle,
          usedDays: 0,
          pendingDays: 0,
          carriedForward: carryAmount,
        });
      }
      results.push(toBalance);
    }

    return results;
  },

  async getLeaveSummary(
    employeeId: string,
    year: number,
  ): Promise<{
    balances: T.LeaveBalance[];
    totalApplied: number;
    totalApproved: number;
    totalRejected: number;
  }> {
    const balances = await R.HrRepository.findLeaveBalancesByEmployee(
      employeeId,
      year,
    );
    const applications = await R.HrRepository.findLeaveApplicationsByEmployee(
      employeeId,
      { fromDate: `${year}-01-01`, toDate: `${year}-12-31` },
    );
    let totalApplied = 0;
    let totalApproved = 0;
    let totalRejected = 0;
    for (const app of applications) {
      totalApplied += app.days;
      if (app.status === 'approved') totalApproved += app.days;
      if (app.status === 'rejected') totalRejected += app.days;
    }
    return { balances, totalApplied, totalApproved, totalRejected };
  },

  async getTeamLeaveCalendar(
    managerId: string,
    fromDate: string,
    toDate: string,
  ): Promise<T.LeaveApplication[]> {
    const team = await R.HrRepository.findEmployeesByReportingTo(managerId);
    const employeeIds = team.map((e) => e.id);
    if (!employeeIds.length) return [];
    const all: T.LeaveApplication[] = [];
    for (const eid of employeeIds) {
      const apps = await R.HrRepository.findLeaveApplicationsByEmployee(eid, {
        fromDate,
        toDate,
      });
      all.push(...apps);
    }
    return all;
  },

  async getHolidayCalendar(year: number): Promise<T.HolidayCalendar[]> {
    return R.HrRepository.findHolidaysByYear(year);
  },
};

// ── 4. PayrollEngine ───────────────────────────────────────────────────────

export const PayrollEngine = {
  async calculateEmployeePayroll(
    input: T.PayrollCalculationInput,
  ): Promise<T.PayrollCalculationResult> {
    const workingDaysInMonth =
      input.attendance.present +
      input.attendance.absent +
      input.attendance.halfDays +
      input.attendance.lateDays;

    const perDayRate =
      workingDaysInMonth > 0
        ? input.salaryStructure.grossSalary / workingDaysInMonth
        : 0;

    const basicPay = input.salaryStructure.basicPay;
    const hra = input.salaryStructure.hra;
    const conveyanceAllowance = input.salaryStructure.conveyanceAllowance;
    const medicalAllowance = input.salaryStructure.medicalAllowance;
    const specialAllowance = input.salaryStructure.specialAllowance;
    const otherAllowance = input.salaryStructure.otherAllowance;

    const grossPay =
      basicPay +
      hra +
      conveyanceAllowance +
      medicalAllowance +
      specialAllowance +
      otherAllowance;

    const otHourlyRate =
      (input.salaryStructure.grossSalary / T.FULL_DAY_HOURS / 30) *
      T.OT_RATE_MULTIPLIER;
    const overtimePay = round2(input.attendance.overtimeHours * otHourlyRate);
    const incentives = 0;
    const bonus = 0;

    const totalEarnings = grossPay + overtimePay + incentives + bonus;

    const pfDeduction = round2(Math.min(basicPay * T.PF_EMPLOYEE_RATE, 1800));
    const esiDeduction =
      input.salaryStructure.grossSalary <= 21000
        ? round2(input.salaryStructure.grossSalary * T.ESI_EMPLOYEE_RATE)
        : 0;
    const ptDeduction =
      input.salaryStructure.grossSalary >= T.PT_THRESHOLD ? T.PT_AMOUNT : 0;
    const incomeTax = 0;
    const otherDeductions = 0;

    const attendanceDeductions = round2(
      input.attendance.absent * perDayRate +
        input.attendance.halfDays * (perDayRate * 0.5),
    );
    const leaveDeductions = round2(input.leaves.unpaid * perDayRate);

    const totalDeductions = round2(
      pfDeduction +
        esiDeduction +
        ptDeduction +
        incomeTax +
        otherDeductions +
        attendanceDeductions +
        leaveDeductions,
    );

    const loanRecovery = input.loanRecovery || 0;
    const advanceRecovery = input.advanceRecovery || 0;

    const netPay = round2(
      totalEarnings - totalDeductions - loanRecovery - advanceRecovery,
    );

    const employerPf = round2(Math.min(basicPay * T.PF_EMPLOYER_RATE, 1800));
    const employerEsi =
      input.salaryStructure.grossSalary <= 21000
        ? round2(input.salaryStructure.grossSalary * T.ESI_EMPLOYER_RATE)
        : 0;

    const totalCostToCompany = round2(totalEarnings + employerPf + employerEsi);
    const payableAmount = round2(netPay + input.reimbursements);

    return {
      basicPay,
      hra,
      conveyanceAllowance,
      medicalAllowance,
      specialAllowance,
      otherAllowance,
      grossPay: round2(grossPay),
      overtimePay,
      incentives,
      bonus,
      totalEarnings: round2(totalEarnings),
      pfDeduction,
      esiDeduction,
      ptDeduction,
      incomeTax,
      otherDeductions,
      totalDeductions,
      loanRecovery,
      advanceRecovery,
      netPay,
      employerPf,
      employerEsi,
      totalCostToCompany,
      attendanceDeductions,
      leaveDeductions,
      payableAmount,
    };
  },

  async runPayroll(dto: T.PayrollRunDto): Promise<{
    payrollRun: T.PayrollRun;
    calculations: T.PayrollCalculationResult[];
  }> {
    const frequency = dto.frequency || 'monthly';

    const payrollRun = await R.HrRepository.createPayrollRun({
      month: dto.month,
      year: dto.year,
      frequency,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      notes: dto.notes || undefined,
    });
    const runId = payrollRun.id;

    let employees: T.Employee[];
    if (dto.employeeIds && dto.employeeIds.length > 0) {
      employees = [];
      for (const id of dto.employeeIds) {
        const emp = await R.HrRepository.findEmployeeById(id);
        if (emp) employees.push(emp);
      }
    } else {
      const result = await R.HrRepository.findAllEmployees({ isActive: true });
      employees = result.data;
    }

    const calculations: T.PayrollCalculationResult[] = [];
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalEmployerContributions = 0;

    for (const employee of employees) {
      const salaryStructure = await R.HrRepository.findActiveSalaryStructure(
        employee.id,
      );
      if (!salaryStructure) continue;

      const components = await R.HrRepository.findSalaryComponentsByStructure(
        salaryStructure.id,
      );
      const attendance = await AttendanceEngine.getAttendanceSummary(
        employee.id,
        dto.periodStart,
        dto.periodEnd,
      );

      const leaves = await R.HrRepository.findLeaveSummary(
        employee.id,
        dto.periodStart,
        dto.periodEnd,
      );

      const loans = (
        await R.HrRepository.findLoansByEmployee(employee.id)
      ).filter((l) => l.status === 'active');
      const loanRecovery = loans.reduce(
        (sum: number, l: T.EmployeeLoan) => sum + l.emiAmount,
        0,
      );

      const advances = (
        await R.HrRepository.findAdvancesByEmployee(employee.id)
      ).filter((a) => a.status === 'pending');
      const advanceRecovery = advances.reduce((acc: number, a: any) => {
        if (a.recoveryMode === 'one_time') return acc + a.remainingAmount;
        return acc + (a.installmentAmount || 0);
      }, 0);

      const reimbursements = (
        await R.HrRepository.findReimbursementsByEmployee(employee.id)
      ).filter((r) => r.status === 'approved');
      const totalReimbursement = reimbursements.reduce(
        (sum, r) => sum + r.amount,
        0,
      );

      const result = await this.calculateEmployeePayroll({
        employee,
        salaryStructure,
        components,
        attendance,
        leaves: { paid: leaves.paid, unpaid: leaves.unpaid },
        loanRecovery,
        advanceRecovery,
        reimbursements: totalReimbursement,
      });

      calculations.push(result);

      await R.HrRepository.createEmployeePayroll({
        payrollRunId: runId,
        employeeId: employee.id,
        grossPay: result.grossPay,
        totalDeductions: result.totalDeductions,
        netPay: result.netPay,
        overtimePay: result.overtimePay,
        incentives: result.incentives,
        commissions: 0,
        serviceChargeShare: 0,
        bonus: result.bonus,
        loanRecovery: result.loanRecovery,
        advanceRecovery: result.advanceRecovery,
        reimbursement: result.payableAmount - result.netPay,
        employerPf: result.employerPf,
        employerEsi: result.employerEsi,
        attendanceDeductions: result.attendanceDeductions,
        leaveDeductions: result.leaveDeductions,
        payableAmount: result.payableAmount,
        paymentMode: 'bank',
        components: JSON.stringify(components),
      });

      totalGrossPay += result.grossPay;
      totalDeductions += result.totalDeductions;
      totalNetPay += result.netPay;
      totalEmployerContributions += result.employerPf + result.employerEsi;
    }

    const updated = await R.HrRepository.updatePayrollRun(runId, {
      totalGrossPay: round2(totalGrossPay),
      totalDeductions: round2(totalDeductions),
      totalNetPay: round2(totalNetPay),
      totalEmployerContributions: round2(totalEmployerContributions),
      employeeCount: calculations.length,
      status: 'computed',
      processedAt: now(),
    });

    return { payrollRun: updated, calculations };
  },

  async approvePayroll(
    runId: string,
    approvedBy: string,
  ): Promise<T.PayrollRun> {
    const { run } = (await R.HrRepository.findPayrollRunById(runId)) as any;
    if (!run) throw new Error(`Payroll run not found: ${runId}`);
    validateTransition(run.status, 'approved', T.PAYROLL_STATUS_TRANSITIONS);

    return R.HrRepository.updatePayrollRunStatus(runId, 'approved', approvedBy);
  },

  async lockPayroll(runId: string, lockedBy: string): Promise<T.PayrollRun> {
    const { run } = (await R.HrRepository.findPayrollRunById(runId)) as any;
    if (!run) throw new Error(`Payroll run not found: ${runId}`);
    validateTransition(run.status, 'locked', T.PAYROLL_STATUS_TRANSITIONS);

    return R.HrRepository.updatePayrollRunStatus(runId, 'locked', lockedBy);
  },

  async processPayrollPayment(
    runId: string,
    paymentMode: 'cash' | 'bank' | 'cheque' | 'upi',
  ): Promise<T.PayrollRun> {
    const { run } = (await R.HrRepository.findPayrollRunById(runId)) as any;
    if (!run) throw new Error(`Payroll run not found: ${runId}`);
    validateTransition(run.status, 'paid', T.PAYROLL_STATUS_TRANSITIONS);

    const employeePayrolls =
      await R.HrRepository.findEmployeePayrollsByRun(runId);
    for (const ep of employeePayrolls) {
      await R.HrRepository.updateEmployeePayroll(ep.id, {
        paymentMode,
        paidAt: now(),
        isPaid: true,
      });
    }

    return R.HrRepository.updatePayrollRunStatus(runId, 'paid', '');
  },

  async getPayrollRun(runId: string): Promise<{
    payrollRun: T.PayrollRun | null;
    employees: (T.EmployeePayroll & { employee?: T.Employee })[];
  }> {
    const result = await R.HrRepository.findPayrollRunById(runId);
    if (!result) throw new Error(`Payroll run not found: ${runId}`);
    const payrollRun = result.run;

    const employeePayrolls =
      await R.HrRepository.findEmployeePayrollsByRun(runId);
    const enriched: (T.EmployeePayroll & { employee?: T.Employee })[] = [];

    for (const ep of employeePayrolls) {
      const employee = await R.HrRepository.findEmployeeById(ep.employeeId);
      enriched.push({ ...ep, employee: employee || undefined });
    }

    return { payrollRun, employees: enriched };
  },

  async getPayrollSummary(
    month: number,
    year: number,
  ): Promise<{
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    employeeCount: number;
    departmentBreakdown: {
      departmentId: string;
      departmentName: string;
      grossPay: number;
      deductions: number;
      netPay: number;
      count: number;
    }[];
  }> {
    const runs = await R.HrRepository.findPayrollRuns({ month, year });
    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        grossPay: number;
        deductions: number;
        netPay: number;
        count: number;
      }
    >();
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let employeeCount = 0;

    for (const run of runs) {
      const employeePayrolls = await R.HrRepository.findEmployeePayrollsByRun(
        run.id,
      );
      for (const ep of employeePayrolls) {
        const employee = await R.HrRepository.findEmployeeById(ep.employeeId);
        const deptId = employee?.departmentId || 'unknown';

        if (!deptMap.has(deptId)) {
          const dept =
            deptId !== 'unknown'
              ? await R.HrRepository.findDepartmentById(deptId)
              : null;
          deptMap.set(deptId, {
            departmentId: deptId,
            departmentName: dept?.name || 'Unknown',
            grossPay: 0,
            deductions: 0,
            netPay: 0,
            count: 0,
          });
        }

        const entry = deptMap.get(deptId)!;
        entry.grossPay += ep.grossPay;
        entry.deductions += ep.totalDeductions;
        entry.netPay += ep.netPay;
        entry.count++;
      }
    }

    for (const entry of deptMap.values()) {
      totalGrossPay += entry.grossPay;
      totalDeductions += entry.deductions;
      totalNetPay += entry.netPay;
      employeeCount += entry.count;
    }

    return {
      totalGrossPay: round2(totalGrossPay),
      totalDeductions: round2(totalDeductions),
      totalNetPay: round2(totalNetPay),
      employeeCount,
      departmentBreakdown: Array.from(deptMap.values()).map((d) => ({
        ...d,
        grossPay: round2(d.grossPay),
        deductions: round2(d.deductions),
        netPay: round2(d.netPay),
      })),
    };
  },

  async getEmployeePaySlip(
    employeeId: string,
    payrollRunId: string,
  ): Promise<{
    employee: T.Employee | null;
    payrollRun: T.PayrollRun | null;
    payroll: T.EmployeePayroll | null;
    calculation: T.PayrollCalculationResult | null;
  }> {
    const [employee, payrollRun, employeePayrolls] = await Promise.all([
      R.HrRepository.findEmployeeById(employeeId),
      R.HrRepository.findPayrollRunById(payrollRunId),
      R.HrRepository.findEmployeePayroll(employeeId, payrollRunId),
    ]);

    const payroll = employeePayrolls || null;
    let calculation: T.PayrollCalculationResult | null = null;

    if (payroll) {
      const salaryStructure =
        await R.HrRepository.findActiveSalaryStructure(employeeId);
      if (salaryStructure) {
        calculation = {
          basicPay: salaryStructure.basicPay,
          hra: salaryStructure.hra,
          conveyanceAllowance: salaryStructure.conveyanceAllowance,
          medicalAllowance: salaryStructure.medicalAllowance,
          specialAllowance: salaryStructure.specialAllowance,
          otherAllowance: salaryStructure.otherAllowance,
          grossPay: payroll.grossPay,
          overtimePay: payroll.overtimePay,
          incentives: payroll.incentives,
          bonus: payroll.bonus,
          totalEarnings:
            payroll.grossPay +
            payroll.overtimePay +
            payroll.incentives +
            payroll.bonus,
          pfDeduction: 0,
          esiDeduction: 0,
          ptDeduction: 0,
          incomeTax: 0,
          otherDeductions: 0,
          totalDeductions: payroll.totalDeductions,
          loanRecovery: payroll.loanRecovery,
          advanceRecovery: payroll.advanceRecovery,
          netPay: payroll.netPay,
          employerPf: payroll.employerPf,
          employerEsi: payroll.employerEsi,
          totalCostToCompany:
            payroll.grossPay + payroll.employerPf + payroll.employerEsi,
          attendanceDeductions: payroll.attendanceDeductions,
          leaveDeductions: payroll.leaveDeductions,
          payableAmount: payroll.payableAmount,
        };
      }
    }

    return {
      employee,
      payrollRun: payrollRun?.run || null,
      payroll,
      calculation,
    };
  },

  async recalculatePayroll(runId: string): Promise<{
    payrollRun: T.PayrollRun;
    calculations: T.PayrollCalculationResult[];
  }> {
    const result = await R.HrRepository.findPayrollRunById(runId);
    if (!result) throw new Error(`Payroll run not found: ${runId}`);
    const run = result.run;
    if (run.status !== 'draft') {
      throw new Error(`Cannot recalculate payroll with status: ${run.status}`);
    }

    await R.HrRepository.deleteEmployeePayrollsByRun(runId);

    return this.runPayroll({
      month: run.month,
      year: run.year,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      notes: `Recalculation - ${run.notes || ''}`,
    });
  },

  async getSalaryStructure(
    employeeId: string,
  ): Promise<T.SalaryStructure | null> {
    return R.HrRepository.findActiveSalaryStructure(employeeId);
  },

  async reviseSalary(
    employeeId: string,
    newGross: number,
    effectiveFrom: string,
    reason: string,
    approvedBy: string,
  ): Promise<T.SalaryStructure> {
    const employee = await R.HrRepository.findEmployeeById(employeeId);
    if (!employee) throw new Error(`Employee not found: ${employeeId}`);

    const current = await R.HrRepository.findActiveSalaryStructure(employeeId);
    if (!current) throw new Error('No active salary structure found');

    await R.HrRepository.deactivateSalaryStructure(current.id);

    const newStructure = await R.HrRepository.createSalaryStructure({
      employeeId,
      effectiveFrom,
      basicPay: round2(newGross * 0.4),
      hra: round2(newGross * 0.2),
      conveyanceAllowance: round2(newGross * 0.1),
      medicalAllowance: 1250,
      specialAllowance: round2(newGross * 0.2),
      otherAllowance: round2(newGross * 0.1),
    });

    await R.HrRepository.createSalaryRevision({
      employeeId,
      previousGross: current.grossSalary,
      newGross,
      revisionDate: today(),
      effectiveFrom,
      reason,
      approvedBy,
    });

    return newStructure;
  },

  async getSalaryRevisionHistory(
    employeeId: string,
  ): Promise<T.SalaryRevision[]> {
    return R.HrRepository.findSalaryRevisionsByEmployee(employeeId);
  },
};

// ── 5. LoanAdvanceService ─────────────────────────────────────────────────

export const LoanAdvanceService = {
  async applyLoan(dto: T.LoanApplicationDto): Promise<T.EmployeeLoan> {
    const employee = await R.HrRepository.findEmployeeById(dto.employeeId);
    if (!employee) throw new Error(`Employee not found: ${dto.employeeId}`);

    if (dto.principalAmount <= 0)
      throw new Error('Loan amount must be positive');
    if (dto.emiAmount <= 0) throw new Error('EMI amount must be positive');
    if (dto.totalEmis <= 0) throw new Error('Total EMIs must be positive');

    const activeLoans = await R.HrRepository.findLoansByEmployee(
      dto.employeeId,
    );
    const existingPrincipal = activeLoans.reduce(
      (s: number, l: T.EmployeeLoan) => s + l.remainingAmount,
      0,
    );
    if (existingPrincipal + dto.principalAmount > dto.principalAmount * 3) {
      throw new Error('Total loan exposure exceeds limit');
    }

    return R.HrRepository.createLoan({
      employeeId: dto.employeeId,
      loanType: dto.loanType,
      principalAmount: dto.principalAmount,
      emiAmount: dto.emiAmount,
      totalEmis: dto.totalEmis,
      purpose: dto.purpose,
    });
  },

  async approveLoan(id: string, approvedBy: string): Promise<T.EmployeeLoan> {
    const loan = await R.HrRepository.findLoanById(id);
    if (!loan) throw new Error(`Loan not found: ${id}`);
    if (loan.status !== 'active')
      throw new Error(`Loan status is ${loan.status}`);

    return R.HrRepository.updateLoanStatus(id, 'active');
  },

  async getOutstandingLoans(employeeId: string): Promise<T.EmployeeLoan[]> {
    return R.HrRepository.findLoansByEmployee(employeeId);
  },

  async getLoanEMISchedule(
    loanId: string,
  ): Promise<
    { emiNo: number; dueDate: string; amount: number; paid: boolean }[]
  > {
    const loan = await R.HrRepository.findLoanById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);

    const schedule: {
      emiNo: number;
      dueDate: string;
      amount: number;
      paid: boolean;
    }[] = [];
    const startMonth = loan.firstEmiDate || today();
    const startDate = new Date(startMonth);

    for (let i = 0; i < loan.totalEmis; i++) {
      const dueDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1,
      );
      schedule.push({
        emiNo: i + 1,
        dueDate: dueDate.toISOString().slice(0, 10),
        amount: loan.emiAmount,
        paid: i < loan.paidEmis,
      });
    }

    return schedule;
  },

  async applyAdvance(dto: T.AdvanceRequestDto): Promise<T.EmployeeAdvance> {
    const employee = await R.HrRepository.findEmployeeById(dto.employeeId);
    if (!employee) throw new Error(`Employee not found: ${dto.employeeId}`);

    if (dto.amount <= 0) throw new Error('Advance amount must be positive');
    const salAcct = employee.salaryAccountNo ?? '';
    if (dto.amount > (salAcct.length > 0 ? 50000 : 25000)) {
      throw new Error('Advance amount exceeds limit');
    }

    return R.HrRepository.createAdvance({
      employeeId: dto.employeeId,
      amount: dto.amount,
      recoveryMode: dto.recoveryMode,
      installmentAmount: dto.installmentAmount || undefined,
      installments: dto.installments || undefined,
      recoveryStartMonth: dto.recoveryStartMonth || today().slice(0, 7),
      purpose: dto.purpose,
    });
  },

  async approveAdvance(
    id: string,
    approvedBy: string,
  ): Promise<T.EmployeeAdvance> {
    const advance = await R.HrRepository.findAdvanceById(id);
    if (!advance) throw new Error(`Advance not found: ${id}`);
    if (advance.status !== 'pending') {
      throw new Error(`Advance status is ${advance.status}`);
    }

    return R.HrRepository.updateAdvanceStatus(id, 'approved', approvedBy);
  },
};

// ── 6. PerformanceService ─────────────────────────────────────────────────

export const PerformanceService = {
  async createReview(
    review: Omit<T.PerformanceReview, 'id' | 'createdAt'>,
  ): Promise<T.PerformanceReview> {
    const employee = await R.HrRepository.findEmployeeById(review.employeeId);
    if (!employee) throw new Error(`Employee not found: ${review.employeeId}`);

    const reviewer = await R.HrRepository.findEmployeeById(review.reviewerId);
    if (!reviewer) throw new Error(`Reviewer not found: ${review.reviewerId}`);

    if (review.rating < 1 || review.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return R.HrRepository.createPerformanceReview({
      employeeId: review.employeeId,
      reviewType: review.reviewType,
      reviewDate: review.reviewDate,
      reviewerId: review.reviewerId,
      rating: review.rating,
      strengths: review.strengths,
      improvements: review.improvements,
      goals: review.goals || undefined,
      reviewerComments: review.reviewerComments || undefined,
      nextReviewDate: review.nextReviewDate || undefined,
      overallScore: review.overallScore,
    });
  },

  async getReviewHistory(employeeId: string): Promise<T.PerformanceReview[]> {
    return R.HrRepository.findPerformanceReviewsByEmployee(employeeId);
  },

  async acknowledgeReview(
    id: string,
    employeeComments: string,
  ): Promise<T.PerformanceReview> {
    const review = await R.HrRepository.findPerformanceReviewById(id);
    if (!review) throw new Error(`Review not found: ${id}`);
    if (review.isAcknowledged)
      throw new Error('Review is already acknowledged');

    return R.HrRepository.acknowledgeReview(id);
  },

  async getTeamReviews(managerId: string): Promise<T.PerformanceReview[]> {
    const team = await R.HrRepository.findEmployeesByReportingTo(managerId);
    const employeeIds = team.map((e) => e.id);
    if (!employeeIds.length) return [];
    const all: T.PerformanceReview[] = [];
    for (const eid of employeeIds) {
      all.push(...(await R.HrRepository.findPerformanceReviewsByEmployee(eid)));
    }
    return all;
  },
};

// ── 7. ExitService ────────────────────────────────────────────────────────

export const ExitService = {
  async initiateExit(dto: {
    employeeId: string;
    exitType: T.ExitType;
    expectedLastDate: string;
    reason: string;
    noticePeriodDays?: number;
    isEligibleForRehire?: boolean;
  }): Promise<T.ExitProcess> {
    const employee = await R.HrRepository.findEmployeeById(dto.employeeId);
    if (!employee) throw new Error(`Employee not found: ${dto.employeeId}`);
    if (employee.status !== 'active') {
      throw new Error(`Employee status is ${employee.status}`);
    }

    const existing = await R.HrRepository.findExitProcessByEmployee(
      dto.employeeId,
    );
    if (existing) throw new Error('Active exit process already exists');

    return R.HrRepository.createExitProcess({
      employeeId: dto.employeeId,
      exitType: dto.exitType,
      requestDate: today(),
      expectedLastDate: dto.expectedLastDate,
      reason: dto.reason,
      noticePeriodDays: dto.noticePeriodDays || 30,
      noticePeriodWaived: false,
      isEligibleForRehire: dto.isEligibleForRehire ?? true,
    });
  },

  async approveExit(id: string, approvedBy: string): Promise<T.ExitProcess> {
    const exits = await R.HrRepository.findExitProcesses();
    const exit = exits.find((e) => e.id === id);
    if (!exit) throw new Error(`Exit process not found: ${id}`);
    validateTransition(exit.status, 'notice_period', T.EXIT_STATUS_TRANSITIONS);

    const updated = await R.HrRepository.updateExitProcessStatus(
      id,
      'notice_period',
      approvedBy,
    );

    await R.HrRepository.updateEmployee(exit.employeeId, {
      status: 'resigned',
    });

    return updated;
  },

  async processClearance(
    id: string,
    clearanceItems: { department: string; cleared: boolean; remarks: string }[],
  ): Promise<T.ExitProcess> {
    const exits = await R.HrRepository.findExitProcesses();
    const exit = exits.find((e) => e.id === id);
    if (!exit) throw new Error(`Exit process not found: ${id}`);
    validateTransition(
      exit.status,
      'clearance_pending',
      T.EXIT_STATUS_TRANSITIONS,
    );

    return R.HrRepository.updateExitProcessStatus(
      id,
      'clearance_pending',
      'system',
    );
  },

  async completeExit(
    id: string,
    actualLastDate: string,
    notes?: string,
  ): Promise<T.ExitProcess> {
    const exits = await R.HrRepository.findExitProcesses();
    const exit = exits.find((e) => e.id === id);
    if (!exit) throw new Error(`Exit process not found: ${id}`);
    validateTransition(exit.status, 'completed', T.EXIT_STATUS_TRANSITIONS);

    const updated = await R.HrRepository.updateExitProcessStatus(
      id,
      'completed',
      'system',
    );

    await R.HrRepository.updateEmployee(exit.employeeId, {
      status: 'terminated',
      isActive: false,
    });

    return updated;
  },

  async cancelExit(id: string): Promise<T.ExitProcess> {
    const exits = await R.HrRepository.findExitProcesses();
    const exit = exits.find((e) => e.id === id);
    if (!exit) throw new Error(`Exit process not found: ${id}`);
    validateTransition(exit.status, 'cancelled', T.EXIT_STATUS_TRANSITIONS);

    const updated = await R.HrRepository.updateExitProcessStatus(
      id,
      'cancelled',
      'system',
    );

    await R.HrRepository.updateEmployee(exit.employeeId, {
      status: 'active',
    });

    return updated;
  },
};

// ── 8. ReportingService ───────────────────────────────────────────────────

export const ReportingService = {
  async getHeadcountReport(): Promise<{
    byDepartment: {
      departmentId: string;
      departmentName: string;
      count: number;
    }[];
    byDesignation: {
      designationId: string;
      designationName: string;
      count: number;
    }[];
    byEmploymentType: { type: T.EmploymentType; count: number }[];
    total: number;
  }> {
    const result = await R.HrRepository.findAllEmployees({ isActive: true });
    const employees = result.data;
    const departments = await R.HrRepository.findAllDepartments();
    const designations = await R.HrRepository.findAllDesignations();

    const deptMap = new Map(departments.map((d) => [d.id, d.name]));
    const desigMap = new Map(designations.map((d) => [d.id, d.name]));

    const byDepartment = new Map<string, number>();
    const byDesignation = new Map<string, number>();
    const byEmploymentType = new Map<T.EmploymentType, number>();

    for (const emp of employees) {
      const deptId = emp.departmentId;
      byDepartment.set(deptId, (byDepartment.get(deptId) || 0) + 1);

      const desigId = emp.designationId;
      byDesignation.set(desigId, (byDesignation.get(desigId) || 0) + 1);

      byEmploymentType.set(
        emp.employmentType,
        (byEmploymentType.get(emp.employmentType) || 0) + 1,
      );
    }

    return {
      byDepartment: Array.from(byDepartment.entries()).map(([id, count]) => ({
        departmentId: id,
        departmentName: deptMap.get(id) || 'Unknown',
        count,
      })),
      byDesignation: Array.from(byDesignation.entries()).map(([id, count]) => ({
        designationId: id,
        designationName: desigMap.get(id) || 'Unknown',
        count,
      })),
      byEmploymentType: Array.from(byEmploymentType.entries()).map(
        ([type, count]) => ({
          type,
          count,
        }),
      ),
      total: employees.length,
    };
  },

  async getAttritionReport(
    fromDate: string,
    toDate: string,
  ): Promise<{
    totalExits: number;
    averageHeadcount: number;
    attritionRate: number;
    byReason: { reason: string; count: number }[];
  }> {
    const result = await R.HrRepository.findAllEmployees({});
    const totalEmployees = result.data.length;

    const allExits = await R.HrRepository.findExitProcesses();
    const exits = allExits.filter(
      (e: any) => e.requestDate >= fromDate && e.requestDate <= toDate,
    );
    const totalExits = exits.filter((e) => e.status === 'completed').length;

    const averageHeadcount = totalEmployees;
    const attritionRate =
      averageHeadcount > 0 ? round2((totalExits / averageHeadcount) * 100) : 0;

    const reasonMap = new Map<string, number>();
    for (const exit of exits) {
      if (exit.reason) {
        reasonMap.set(exit.reason, (reasonMap.get(exit.reason) || 0) + 1);
      }
    }

    return {
      totalExits,
      averageHeadcount,
      attritionRate,
      byReason: Array.from(reasonMap.entries()).map(([reason, count]) => ({
        reason,
        count,
      })),
    };
  },

  async getLabourCostReport(
    month: number,
    year: number,
  ): Promise<{
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerContributions: number;
    totalCost: number;
    employeeCount: number;
    costPerEmployee: number;
  }> {
    const runs = await R.HrRepository.findPayrollRuns({ month, year });
    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalEmployerContributions = 0;
    let employeeCount = 0;

    for (const run of runs) {
      totalGrossPay += run.totalGrossPay;
      totalDeductions += run.totalDeductions;
      totalNetPay += run.totalNetPay;
      totalEmployerContributions += run.totalEmployerContributions;
      employeeCount += run.employeeCount;
    }

    const totalCost = round2(totalGrossPay + totalEmployerContributions);
    const costPerEmployee =
      employeeCount > 0 ? round2(totalCost / employeeCount) : 0;

    return {
      totalGrossPay: round2(totalGrossPay),
      totalDeductions: round2(totalDeductions),
      totalNetPay: round2(totalNetPay),
      totalEmployerContributions: round2(totalEmployerContributions),
      totalCost,
      employeeCount,
      costPerEmployee,
    };
  },

  async getAttendanceReport(
    departmentId: string,
    month: number,
    year: number,
  ): Promise<{
    departmentId: string;
    month: number;
    year: number;
    totalEmployees: number;
    totalPresent: number;
    totalAbsent: number;
    totalHalfDays: number;
    totalLate: number;
    attendancePercentage: number;
  }> {
    const result = await R.HrRepository.findAllEmployees({
      departmentId,
      isActive: true,
    });
    const employees = result.data;

    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDays = 0;
    let totalLate = 0;

    for (const emp of employees) {
      const summary = await AttendanceEngine.getAttendanceSummary(
        emp.id,
        fromDate,
        toDate,
      );
      totalPresent += summary.present;
      totalAbsent += summary.absent;
      totalHalfDays += summary.halfDays;
      totalLate += summary.lateDays;
    }

    const totalDays = totalPresent + totalAbsent + totalHalfDays + totalLate;
    const attendancePercentage =
      totalDays > 0 ? round2((totalPresent / totalDays) * 100) : 0;

    return {
      departmentId,
      month,
      year,
      totalEmployees: employees.length,
      totalPresent,
      totalAbsent,
      totalHalfDays,
      totalLate,
      attendancePercentage,
    };
  },

  async getLeaveUtilizationReport(year: number): Promise<
    {
      leaveTypeId: string;
      leaveTypeName: string;
      totalDaysAllocated: number;
      totalDaysUsed: number;
      totalDaysPending: number;
      utilizationPercentage: number;
    }[]
  > {
    const configs = await R.HrRepository.findAllLeaveTypeConfigs();
    const allBalances = await R.HrRepository.findAllLeaveBalancesByYear(year);
    const reports: {
      leaveTypeId: string;
      leaveTypeName: string;
      totalDaysAllocated: number;
      totalDaysUsed: number;
      totalDaysPending: number;
      utilizationPercentage: number;
    }[] = [];

    for (const config of configs) {
      if (!config.isActive) continue;
      const balances = allBalances.filter((b) => b.leaveTypeId === config.id);
      const totalDaysAllocated = balances.reduce(
        (s, b) => s + b.totalDays + b.carriedForward,
        0,
      );
      const totalDaysUsed = balances.reduce((s, b) => s + b.usedDays, 0);
      const totalDaysPending = balances.reduce((s, b) => s + b.pendingDays, 0);
      const utilizationPercentage =
        totalDaysAllocated > 0
          ? round2((totalDaysUsed / totalDaysAllocated) * 100)
          : 0;

      reports.push({
        leaveTypeId: config.id,
        leaveTypeName: config.name,
        totalDaysAllocated,
        totalDaysUsed,
        totalDaysPending,
        utilizationPercentage,
      });
    }

    return reports;
  },

  async getPayrollCostProjection(
    nextMonths: number,
  ): Promise<
    { month: string; projectedCost: number; employeeCount: number }[]
  > {
    const now = new Date();
    const projections: {
      month: string;
      projectedCost: number;
      employeeCount: number;
    }[] = [];

    for (let i = 0; i < nextMonths; i++) {
      const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = projDate.getMonth() + 1;
      const year = projDate.getFullYear();

      const runs = await R.HrRepository.findPayrollRuns({ month, year });
      let totalGrossPay = 0;
      let totalEmployerContributions = 0;
      let employeeCount = 0;

      if (runs.length > 0) {
        for (const run of runs) {
          totalGrossPay += run.totalGrossPay;
          totalEmployerContributions += run.totalEmployerContributions;
          employeeCount += run.employeeCount;
        }
      } else {
        const result = await R.HrRepository.findAllEmployees({
          isActive: true,
        });
        employeeCount = result.data.length;
        const avgGross = result.data.reduce((s, e) => s + 25000, 0);
        totalGrossPay = avgGross;
        totalEmployerContributions = round2(avgGross * 0.15);
      }

      projections.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        projectedCost: round2(totalGrossPay + totalEmployerContributions),
        employeeCount,
      });
    }

    return projections;
  },
};

// ── 9. IntegrationService ──────────────────────────────────────────────────

export const IntegrationService = {
  async generatePayrollJournal(
    payrollRunId: string,
  ): Promise<{ journalId: string; entries: any[] }> {
    const runRec = await R.HrRepository.findPayrollRunById(payrollRunId);
    if (!runRec) throw new Error(`Payroll run not found: ${payrollRunId}`);

    const employeePayrolls =
      await R.HrRepository.findEmployeePayrollsByRun(payrollRunId);

    const totalGrossPay = employeePayrolls.reduce(
      (s, ep) => s + ep.grossPay,
      0,
    );
    const totalDeductions = employeePayrolls.reduce(
      (s, ep) => s + ep.totalDeductions,
      0,
    );
    const totalNetPay = employeePayrolls.reduce((s, ep) => s + ep.netPay, 0);
    const totalEmployerPf = employeePayrolls.reduce(
      (s, ep) => s + ep.employerPf,
      0,
    );
    const totalEmployerEsi = employeePayrolls.reduce(
      (s, ep) => s + ep.employerEsi,
      0,
    );
    const totalLoanRecovery = employeePayrolls.reduce(
      (s, ep) => s + ep.loanRecovery,
      0,
    );

    const totalEmployerContributions = totalEmployerPf + totalEmployerEsi;

    const entries = [
      {
        description: 'Salary Expense',
        debit: round2(totalGrossPay + totalEmployerContributions),
        credit: 0,
      },
      {
        description: 'Salary Payable',
        debit: 0,
        credit: totalNetPay,
      },
      {
        description: 'PF Payable',
        debit: 0,
        credit: round2(
          employeePayrolls.reduce((s, ep) => s + ep.employerPf, 0) +
            employeePayrolls.reduce(
              (s, ep) => s + (ep as any).pfDeduction || 0,
              0,
            ),
        ),
      },
      {
        description: 'ESI Payable',
        debit: 0,
        credit: round2(
          employeePayrolls.reduce((s, ep) => s + ep.employerEsi, 0) +
            employeePayrolls.reduce(
              (s, ep) => s + (ep as any).esiDeduction || 0,
              0,
            ),
        ),
      },
      {
        description: 'Loan Recovery',
        debit: 0,
        credit: totalLoanRecovery,
      },
    ];

    const journalId = uid('prj');
    await run('UPDATE payroll_runs SET journal_id = ? WHERE id = ?', [
      journalId,
      payrollRunId,
    ]);

    return { journalId, entries };
  },

  async publishPayrollKpis(payrollRunId: string): Promise<void> {
    const runRec = await R.HrRepository.findPayrollRunById(payrollRunId);
    if (!runRec) throw new Error(`Payroll run not found: ${payrollRunId}`);
    const run = runRec.run;

    const costPerEmployee =
      run.employeeCount > 0
        ? round2(
            (run.totalGrossPay + run.totalEmployerContributions) /
              run.employeeCount,
          )
        : 0;

    const kpis = {
      payroll_cost: run.totalGrossPay + run.totalEmployerContributions,
      employee_count: run.employeeCount,
      cost_per_employee: costPerEmployee,
      total_deductions: run.totalDeductions,
      total_net_pay: run.totalNetPay,
      period: `${run.year}-${String(run.month).padStart(2, '0')}`,
      published_at: now(),
    };

    void kpis;
  },

  async publishAttendanceKpis(date: string): Promise<void> {
    const result = await R.HrRepository.findAllEmployees({ isActive: true });
    const employees = result.data;
    let present = 0;
    let absent = 0;

    for (const emp of employees) {
      const att = await R.HrRepository.findAttendanceByEmployeeAndDate(
        emp.id,
        date,
      );
      if (!att || att.status === 'absent') {
        absent++;
      } else if (att.status === 'present') {
        present++;
      }
    }

    const total = employees.length;
    const attendanceRate = total > 0 ? round2((present / total) * 100) : 0;
    const absenteeism = total > 0 ? round2((absent / total) * 100) : 0;

    const kpis = {
      attendance_rate: attendanceRate,
      absenteeism,
      present_count: present,
      absent_count: absent,
      total_employees: total,
      date,
      published_at: now(),
    };

    void kpis;
  },
};

// ── Unified export ────────────────────────────────────────────────────────

export const hrService = {
  employee: EmployeeService,
  attendance: AttendanceEngine,
  leave: LeaveEngine,
  payroll: PayrollEngine,
  loanAdvance: LoanAdvanceService,
  performance: PerformanceService,
  exit: ExitService,
  reporting: ReportingService,
  integration: IntegrationService,

  createEmployee: EmployeeService.createEmployee.bind(EmployeeService),
  updateEmployee: EmployeeService.updateEmployee.bind(EmployeeService),
  getEmployee: EmployeeService.getEmployee.bind(EmployeeService),
  listEmployees: EmployeeService.listEmployees.bind(EmployeeService),

  markAttendance: AttendanceEngine.markAttendance.bind(AttendanceEngine),
  getAttendance: AttendanceEngine.getAttendance.bind(AttendanceEngine),
  getAttendanceSummary:
    AttendanceEngine.getAttendanceSummary.bind(AttendanceEngine),

  applyLeave: LeaveEngine.applyLeave.bind(LeaveEngine),
  approveLeave: LeaveEngine.approveLeave.bind(LeaveEngine),
  rejectLeave: LeaveEngine.rejectLeave.bind(LeaveEngine),
  getLeaveBalance: LeaveEngine.getLeaveBalance.bind(LeaveEngine),

  runPayroll: PayrollEngine.runPayroll.bind(PayrollEngine),
  approvePayroll: PayrollEngine.approvePayroll.bind(PayrollEngine),
  calculateEmployeePayroll:
    PayrollEngine.calculateEmployeePayroll.bind(PayrollEngine),

  applyLoan: LoanAdvanceService.applyLoan.bind(LoanAdvanceService),
  applyAdvance: LoanAdvanceService.applyAdvance.bind(LoanAdvanceService),

  getHeadcountReport:
    ReportingService.getHeadcountReport.bind(ReportingService),
  getAttritionReport:
    ReportingService.getAttritionReport.bind(ReportingService),

  generatePayrollJournal:
    IntegrationService.generatePayrollJournal.bind(IntegrationService),
  publishPayrollKpis:
    IntegrationService.publishPayrollKpis.bind(IntegrationService),
};
