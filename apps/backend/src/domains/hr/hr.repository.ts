import { query, run } from '../../db';
import * as T from './hr.types';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function now(): string {
  return new Date().toISOString();
}

function buildWhere(conditions: [string, any][], params: any[]): string {
  const cls: string[] = [];
  for (const [col, val] of conditions) {
    if (val !== undefined && val !== null) {
      if (
        col.includes('LIKE') ||
        col.includes('>') ||
        col.includes('<') ||
        col.includes('BETWEEN') ||
        col.includes('IN')
      ) {
        cls.push(col);
        params.push(val);
      } else {
        cls.push(`${col} = ?`);
        params.push(val);
      }
    }
  }
  return cls.length ? 'WHERE ' + cls.join(' AND ') : '';
}

function safeOrder(orderBy?: string, orderDir?: string): string {
  const allowed: string[] = [
    'created_at',
    'updated_at',
    'name',
    'code',
    'date',
    'employee_code',
    'first_name',
    'join_date',
    'status',
    'amount',
    'salary',
  ];
  const dir = orderDir === 'asc' ? 'ASC' : 'DESC';
  return allowed.includes(orderBy || '')
    ? `ORDER BY ${orderBy} ${dir}`
    : 'ORDER BY created_at DESC';
}

// ═══════════════════════════════════════════════════════════════════════════
// ROW MAPPERS
// ═══════════════════════════════════════════════════════════════════════════

function rowToDepartment(row: any): T.Department {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || null,
    headId: row.head_id || null,
    parentId: row.parent_id || null,
    isActive: Boolean(row.is_active ?? true),
    costCenter: row.cost_center || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToDesignation(row: any): T.Designation {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || null,
    departmentId: row.department_id,
    grade: row.grade || null,
    level: row.level ?? 1,
    minSalary: Number(row.min_salary || 0),
    maxSalary: Number(row.max_salary || 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToEmployee(row: any): T.Employee {
  return {
    id: row.id,
    employeeCode: row.employee_code || row.id || '',
    firstName: row.first_name || row.name || '',
    lastName: row.last_name || '',
    email: row.email || null,
    phone: row.phone || '',
    alternatePhone: row.alternate_phone || null,
    gender: row.gender || ('male' as T.Gender),
    dateOfBirth: row.date_of_birth || '',
    maritalStatus: row.marital_status || ('single' as T.MaritalStatus),
    bloodGroup: row.blood_group || (null as T.BloodGroup | null),
    nationality: row.nationality || 'Indian',
    departmentId: row.department_id || '',
    designationId: row.designation_id || '',
    reportingToId: row.reporting_to_id || null,
    employmentType: row.employment_type || ('permanent' as T.EmploymentType),
    status: row.status || ('active' as T.EmployeeStatus),
    salary: Number(row.salary || 0),
    joinDate: row.join_date || '',
    confirmationDate: row.confirmation_date || null,
    exitDate: row.exit_date || null,
    exitType: row.exit_type || (null as T.ExitType | null),
    exitReason: row.exit_reason || null,
    permanentAddress: row.permanent_address || null,
    currentAddress: row.current_address || null,
    city: row.city || null,
    state: row.state || null,
    pincode: row.pincode || null,
    emergencyContactName: row.emergency_contact_name || null,
    emergencyContactPhone: row.emergency_contact_phone || null,
    emergencyContactRelation: row.emergency_contact_relation || null,
    bankAccountNo: row.bank_account_no || null,
    bankName: row.bank_name || null,
    bankIfsc: row.bank_ifsc || null,
    bankBranch: row.bank_branch || null,
    salaryAccountNo: row.salary_account_no || null,
    pfNumber: row.pf_number || null,
    esiNumber: row.esi_number || null,
    uanNumber: row.uan_number || null,
    panNumber: row.pan_number || null,
    aadhaarNumber: row.aadhaar_number || null,
    photoUrl: row.photo_url || null,
    signatureUrl: row.signature_url || null,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToShift(row: any): T.Shift {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shiftType: row.shift_type as T.ShiftType,
    startTime: row.start_time,
    endTime: row.end_time,
    graceMinutes: row.grace_minutes ?? 10,
    lateThresholdMinutes: row.late_threshold ?? 15,
    earlyDepartureThresholdMinutes: row.early_departure_threshold ?? 15,
    halfDayHours: Number(row.half_day_hours || 4.5),
    fullDayHours: Number(row.full_day_hours || 9.0),
    isNightShift: Boolean(row.is_night_shift ?? false),
    isActive: Boolean(row.is_active ?? true),
    applicableDepartments: row.applicable_departments || null,
    createdAt: row.created_at || '',
  };
}

function rowToEmployeeShift(row: any): T.EmployeeShift {
  return {
    id: row.id,
    employeeId: row.employee_id,
    shiftId: row.shift_id,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to || null,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToAttendance(row: any): T.Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    shiftId: row.shift_id || null,
    clockIn: row.clock_in || null,
    clockOut: row.clock_out || null,
    status: row.status as T.AttendanceStatus,
    workedHours: Number(row.worked_hours || 0),
    overtimeHours: Number(row.overtime_hours || 0),
    lateMinutes: row.late_minutes ?? 0,
    earlyDepartureMinutes: row.early_departure_minutes ?? 0,
    missingPunch: Boolean(row.missing_punch ?? false),
    isApproved: Boolean(row.is_approved ?? false),
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    correctionReason: row.correction_reason || null,
    notes: row.notes || null,
    source: row.source || 'manual',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToAttendanceCorrection(row: any): T.AttendanceCorrection {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    originalClockIn: row.original_clock_in || null,
    originalClockOut: row.original_clock_out || null,
    correctedClockIn: row.corrected_clock_in || null,
    correctedClockOut: row.corrected_clock_out || null,
    reason: row.reason,
    status: row.status || 'pending',
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    createdAt: row.created_at || '',
  };
}

function rowToHoliday(row: any): T.HolidayCalendar {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    year: row.year,
    type: row.type as 'public' | 'restricted' | 'optional',
    isOptional: Boolean(row.is_optional ?? false),
    applicableDepartments: row.applicable_departments || null,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToLeaveTypeConfig(row: any): T.LeaveTypeConfig {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type as T.LeaveType,
    daysPerCycle: row.days_per_cycle,
    maxConsecutive: row.max_consecutive ?? 0,
    requiresApproval: Boolean(row.requires_approval ?? true),
    isPaid: Boolean(row.is_paid ?? true),
    isCarryForward: Boolean(row.is_carry_forward ?? false),
    carryForwardLimit: row.carry_forward_limit ?? 0,
    isEncashable: Boolean(row.is_encashable ?? false),
    minServiceDays: row.min_service_days ?? 0,
    genderRestriction: row.gender_restriction || (null as T.Gender | null),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToLeaveBalance(row: any): T.LeaveBalance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    year: row.year,
    totalDays: Number(row.total_days),
    usedDays: Number(row.used_days || 0),
    pendingDays: Number(row.pending_days || 0),
    carriedForward: Number(row.carried_forward || 0),
    availableDays: Number(row.available_days || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToLeaveApplication(row: any): T.LeaveApplication {
  return {
    id: row.id,
    employeeId: row.employee_id,
    leaveTypeId: row.leave_type_id,
    fromDate: row.from_date,
    toDate: row.to_date,
    session: row.session || ('full_day' as T.LeaveSession),
    days: Number(row.days),
    reason: row.reason,
    status: row.status || ('pending' as T.LeaveStatus),
    appliedTo: row.applied_to || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    rejectionReason: row.rejection_reason || null,
    isUrgent: Boolean(row.is_urgent ?? false),
    contactDuringLeave: row.contact_during_leave || null,
    alternateArrangements: row.alternate_arrangements || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToPayrollFrequencyConfig(row: any): T.PayrollFrequencyConfig {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    frequency: row.frequency as T.PayrollFrequency,
    cutoffDay: row.cutoff_day,
    processDay: row.process_day,
    paymentDay: row.payment_day,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToSalaryStructure(row: any): T.SalaryStructure {
  return {
    id: row.id,
    employeeId: row.employee_id,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to || null,
    isActive: Boolean(row.is_active ?? true),
    grossSalary: Number(row.gross_salary || 0),
    basicPay: Number(row.basic_pay || 0),
    hra: Number(row.hra || 0),
    conveyanceAllowance: Number(row.conveyance_allowance || 0),
    medicalAllowance: Number(row.medical_allowance || 0),
    specialAllowance: Number(row.special_allowance || 0),
    otherAllowance: Number(row.other_allowance || 0),
    employerPf: Number(row.employer_pf || 0),
    employerEsi: Number(row.employer_esi || 0),
    totalCostToCompany: Number(row.total_ctc || row.total_cost_to_company || 0),
    createdBy: row.created_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToSalaryComponent(row: any): T.SalaryComponent {
  return {
    id: row.id,
    salaryStructureId: row.salary_structure_id,
    componentType: row.component_type as T.PayrollComponentType,
    name: row.name,
    calculationType: row.calculation_type as T.AllowanceType | T.DeductionType,
    calculationValue: Number(row.calculation_value),
    isActive: Boolean(row.is_active ?? true),
    isStatutory: Boolean(row.is_statutory ?? false),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at || '',
  };
}

function rowToSalaryRevision(row: any): T.SalaryRevision {
  return {
    id: row.id,
    employeeId: row.employee_id,
    previousGross: Number(row.previous_gross),
    newGross: Number(row.new_gross),
    revisionDate: row.revision_date,
    effectiveFrom: row.effective_from,
    reason: row.reason,
    approvedBy: row.approved_by || null,
    createdAt: row.created_at || '',
  };
}

function rowToPayrollRun(row: any): T.PayrollRun {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    frequency: row.frequency || ('monthly' as T.PayrollFrequency),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status || ('draft' as T.PayrollStatus),
    processedBy: row.processed_by || null,
    processedAt: row.processed_at || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    lockedAt: row.locked_at || null,
    totalGrossPay: Number(row.total_gross_pay || 0),
    totalDeductions: Number(row.total_deductions || 0),
    totalNetPay: Number(row.total_net_pay || 0),
    totalEmployerContributions: Number(row.total_employer_contributions || 0),
    employeeCount: row.employee_count ?? 0,
    journalId: row.journal_id || null,
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToEmployeePayroll(row: any): T.EmployeePayroll {
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    employeeId: row.employee_id,
    grossPay: Number(row.gross_pay || 0),
    totalDeductions: Number(row.total_deductions || 0),
    netPay: Number(row.net_pay || 0),
    overtimePay: Number(row.overtime_pay || 0),
    incentives: Number(row.incentives || 0),
    commissions: Number(row.commissions || 0),
    serviceChargeShare: Number(row.service_charge_share || 0),
    bonus: Number(row.bonus || 0),
    loanRecovery: Number(row.loan_recovery || 0),
    advanceRecovery: Number(row.advance_recovery || 0),
    reimbursement: Number(row.reimbursement || 0),
    employerPf: Number(row.employer_pf || 0),
    employerEsi: Number(row.employer_esi || 0),
    attendanceDeductions: Number(row.attendance_deductions || 0),
    leaveDeductions: Number(row.leave_deductions || 0),
    payableAmount: Number(row.payable_amount || 0),
    paymentMode: row.payment_mode || 'bank',
    paidAt: row.paid_at || null,
    isPaid: Boolean(row.is_paid ?? false),
    components: row.components || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToEmployeeLoan(row: any): T.EmployeeLoan {
  return {
    id: row.id,
    employeeId: row.employee_id,
    loanType: row.loan_type,
    principalAmount: Number(row.principal_amount),
    emiAmount: Number(row.emi_amount),
    totalEmis: row.total_emis,
    paidEmis: row.paid_emis ?? 0,
    remainingAmount: Number(row.remaining_amount || 0),
    interestRate: Number(row.interest_rate || 0),
    sanctionDate: row.sanction_date,
    firstEmiDate: row.first_emi_date,
    closureDate: row.closure_date || null,
    status: row.status || ('active' as T.LoanStatus),
    purpose: row.purpose || '',
    approvedBy: row.approved_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToEmployeeAdvance(row: any): T.EmployeeAdvance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    amount: Number(row.amount),
    recoveryMode: row.recovery_mode || ('installment' as T.AdvanceRecoveryMode),
    installmentAmount: row.installment_amount
      ? Number(row.installment_amount)
      : null,
    installments: row.installments || null,
    recoveredAmount: Number(row.recovered_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    requestDate: row.request_date,
    recoveryStartMonth: row.recovery_start_month,
    isRecovered: Boolean(row.is_recovered ?? false),
    purpose: row.purpose || '',
    approvedBy: row.approved_by || null,
    status: row.status || 'pending',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToReimbursement(row: any): T.EmployeeReimbursement {
  return {
    id: row.id,
    employeeId: row.employee_id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    billDate: row.bill_date,
    billNumber: row.bill_number || null,
    billImageUrl: row.bill_image_url || null,
    status: row.status || ('pending' as T.ReimbursementStatus),
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    paidInPayroll: Boolean(row.paid_in_payroll ?? false),
    payrollRunId: row.payroll_run_id || null,
    createdAt: row.created_at || '',
  };
}

function rowToPerformanceReview(row: any): T.PerformanceReview {
  return {
    id: row.id,
    employeeId: row.employee_id,
    reviewType: row.review_type as T.ReviewType,
    reviewDate: row.review_date,
    reviewerId: row.reviewer_id,
    rating: row.rating,
    strengths: row.strengths || '',
    improvements: row.improvements || '',
    goals: row.goals || null,
    reviewerComments: row.reviewer_comments || null,
    employeeComments: row.employee_comments || null,
    isAcknowledged: Boolean(row.is_acknowledged ?? false),
    nextReviewDate: row.next_review_date || null,
    overallScore: Number(row.overall_score || 0),
    createdAt: row.created_at || '',
  };
}

function rowToTrainingRecord(row: any): T.TrainingRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    trainingName: row.training_name,
    provider: row.provider || '',
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status || ('planned' as T.TrainingStatus),
    cost: Number(row.cost || 0),
    isCertification: Boolean(row.is_certification ?? false),
    certificateUrl: row.certificate_url || null,
    score: row.score ? Number(row.score) : null,
    feedback: row.feedback || null,
    createdAt: row.created_at || '',
  };
}

function rowToDisciplinaryRecord(row: any): T.DisciplinaryRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    action: row.action as T.DisciplinaryAction,
    date: row.date,
    reason: row.reason,
    description: row.description || '',
    issuedBy: row.issued_by,
    duration: row.duration || null,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
  };
}

function rowToExitProcess(row: any): T.ExitProcess {
  return {
    id: row.id,
    employeeId: row.employee_id,
    exitType: row.exit_type as T.ExitType,
    requestDate: row.request_date,
    expectedLastDate: row.expected_last_date,
    actualLastDate: row.actual_last_date || null,
    reason: row.reason,
    status: row.status || ('requested' as T.ExitStatus),
    noticePeriodDays: row.notice_period_days ?? 0,
    noticePeriodWaived: Boolean(row.notice_period_waived ?? false),
    clearanceItems: row.clearance_items || null,
    isEligibleForRehire: Boolean(row.is_eligible_for_rehire ?? true),
    exitInterviewNotes: row.exit_interview_notes || null,
    approvedBy: row.approved_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Full employee query (JOIN employees + employee_profiles)
// ═══════════════════════════════════════════════════════════════════════════

const EMPLOYEE_SELECT = `
  SELECT e.*, p.employee_code, p.last_name, p.alternate_phone, p.gender,
         p.date_of_birth, p.marital_status, p.blood_group, p.nationality,
         p.department_id, p.designation_id, p.reporting_to_id, p.employment_type,
         p.confirmation_date, p.exit_date, p.exit_type, p.exit_reason,
         p.permanent_address, p.current_address, p.city, p.state, p.pincode,
         p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation,
         p.bank_account_no, p.bank_name, p.bank_ifsc, p.bank_branch, p.salary_account_no,
         p.pf_number, p.esi_number, p.uan_number, p.pan_number, p.aadhaar_number,
         p.photo_url, p.signature_url, p.updated_at as profile_updated_at,
         e.created_at, e.updated_at
  FROM employees e
  LEFT JOIN employee_profiles p ON e.id = p.employee_id`;

const EMPLOYEE_COLUMNS = `
  id, name, role, phone, salary, status, join_date, access,
  created_at, updated_at`;

// ═══════════════════════════════════════════════════════════════════════════
// HR REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export const HrRepository = {
  // ────────────────────────────────────────────────────────────────────────
  // DEPARTMENTS
  // ────────────────────────────────────────────────────────────────────────

  async createDepartment(dto: T.CreateDepartmentDto): Promise<T.Department> {
    const id = uid('dept');
    const ts = now();
    await run(
      `INSERT INTO departments (id, code, name, description, head_id, parent_id, cost_center, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        dto.code,
        dto.name,
        dto.description || null,
        dto.headId || null,
        dto.parentId || null,
        dto.costCenter || null,
        ts,
        ts,
      ],
    );
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    return rowToDepartment(rows[0]);
  },

  async findDepartmentById(id: string): Promise<T.Department | null> {
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    return rows.length ? rowToDepartment(rows[0]) : null;
  },

  async findAllDepartments(filter?: {
    isActive?: boolean;
    parentId?: string | null;
  }): Promise<T.Department[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (filter?.isActive !== undefined)
      conditions.push(['is_active', filter.isActive ? 1 : 0]);
    if (filter?.parentId !== undefined)
      conditions.push(['parent_id', filter.parentId]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM departments ${where} ORDER BY code ASC`,
      params,
    );
    return rows.map(rowToDepartment);
  },

  async updateDepartment(
    id: string,
    updates: Partial<T.CreateDepartmentDto & { isActive: boolean }>,
  ): Promise<T.Department> {
    const existing = await this.findDepartmentById(id);
    if (!existing) throw new Error(`Department not found: ${id}`);
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (updates.code !== undefined) {
      sets.push('code = ?');
      params.push(updates.code);
    }
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description || null);
    }
    if (updates.headId !== undefined) {
      sets.push('head_id = ?');
      params.push(updates.headId || null);
    }
    if (updates.parentId !== undefined) {
      sets.push('parent_id = ?');
      params.push(updates.parentId || null);
    }
    if (updates.costCenter !== undefined) {
      sets.push('cost_center = ?');
      params.push(updates.costCenter || null);
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }
    if (params.length === 1) return existing;
    await run(`UPDATE departments SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findDepartmentById(id))!;
  },

  async deleteDepartment(id: string): Promise<void> {
    await run(
      'UPDATE departments SET is_active = 0, updated_at = ? WHERE id = ?',
      [now(), id],
    );
  },

  async getDepartmentTree(): Promise<T.Department[]> {
    const rows = await query(
      'SELECT * FROM departments WHERE is_active = 1 ORDER BY code ASC',
    );
    return rows.map(rowToDepartment);
  },

  // ────────────────────────────────────────────────────────────────────────
  // DESIGNATIONS
  // ────────────────────────────────────────────────────────────────────────

  async createDesignation(dto: T.CreateDesignationDto): Promise<T.Designation> {
    const id = uid('desig');
    await run(
      `INSERT INTO designations (id, code, name, description, department_id, grade, level, min_salary, max_salary, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        dto.code,
        dto.name,
        dto.description || null,
        dto.departmentId,
        dto.grade || null,
        dto.level ?? 1,
        dto.minSalary ?? 0,
        dto.maxSalary ?? 0,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM designations WHERE id = ?', [id]);
    return rowToDesignation(rows[0]);
  },

  async findDesignationById(id: string): Promise<T.Designation | null> {
    const rows = await query('SELECT * FROM designations WHERE id = ?', [id]);
    return rows.length ? rowToDesignation(rows[0]) : null;
  },

  async findDesignationsByDepartment(
    departmentId: string,
  ): Promise<T.Designation[]> {
    const rows = await query(
      'SELECT * FROM designations WHERE department_id = ? AND is_active = 1 ORDER BY level ASC',
      [departmentId],
    );
    return rows.map(rowToDesignation);
  },

  async findAllDesignations(filter?: {
    isActive?: boolean;
    departmentId?: string;
  }): Promise<T.Designation[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (filter?.isActive !== undefined)
      conditions.push(['is_active', filter.isActive ? 1 : 0]);
    if (filter?.departmentId)
      conditions.push(['department_id', filter.departmentId]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM designations ${where} ORDER BY level ASC`,
      params,
    );
    return rows.map(rowToDesignation);
  },

  async updateDesignation(
    id: string,
    updates: Partial<T.CreateDesignationDto & { isActive: boolean }>,
  ): Promise<T.Designation> {
    const existing = await this.findDesignationById(id);
    if (!existing) throw new Error(`Designation not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.code !== undefined) {
      sets.push('code = ?');
      params.push(updates.code);
    }
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description || null);
    }
    if (updates.departmentId !== undefined) {
      sets.push('department_id = ?');
      params.push(updates.departmentId);
    }
    if (updates.grade !== undefined) {
      sets.push('grade = ?');
      params.push(updates.grade || null);
    }
    if (updates.level !== undefined) {
      sets.push('level = ?');
      params.push(updates.level);
    }
    if (updates.minSalary !== undefined) {
      sets.push('min_salary = ?');
      params.push(updates.minSalary);
    }
    if (updates.maxSalary !== undefined) {
      sets.push('max_salary = ?');
      params.push(updates.maxSalary);
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }
    if (!sets.length) return existing;
    await run(`UPDATE designations SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findDesignationById(id))!;
  },

  async deleteDesignation(id: string): Promise<void> {
    await run('UPDATE designations SET is_active = 0 WHERE id = ?', [id]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // EMPLOYEES
  // ────────────────────────────────────────────────────────────────────────

  async createEmployee(dto: T.CreateEmployeeDto): Promise<T.Employee> {
    const id = uid('emp');
    const ts = now();
    await run(
      `INSERT INTO employees (id, name, role, phone, salary, status, join_date, access, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, 'staff', ?, ?)`,
      [
        id,
        dto.firstName + (dto.lastName ? ' ' + dto.lastName : ''),
        dto.designationId,
        dto.phone,
        dto.salary ?? 0,
        dto.joinDate,
        ts,
        ts,
      ],
    );
    await run(
      `INSERT INTO employee_profiles (employee_id, employee_code, last_name, gender, date_of_birth,
        department_id, designation_id, employment_type, reporting_to_id,
        bank_account_no, bank_name, bank_ifsc, pf_number, esi_number, pan_number, aadhaar_number,
        updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        `EMP${ts.slice(2, 10).replace(/[-:]/g, '').slice(0, 8)}`,
        dto.lastName || '',
        dto.gender,
        dto.dateOfBirth,
        dto.departmentId,
        dto.designationId,
        dto.employmentType || 'permanent',
        dto.reportingToId || null,
        dto.bankAccountNo || null,
        dto.bankName || null,
        dto.bankIfsc || null,
        dto.pfNumber || null,
        dto.esiNumber || null,
        dto.panNumber || null,
        dto.aadhaarNumber || null,
        ts,
      ],
    );
    const rows = await query(`${EMPLOYEE_SELECT} WHERE e.id = ?`, [id]);
    return rowToEmployee(rows[0]);
  },

  async findEmployeeById(id: string): Promise<T.Employee | null> {
    const rows = await query(`${EMPLOYEE_SELECT} WHERE e.id = ?`, [id]);
    return rows.length ? rowToEmployee(rows[0]) : null;
  },

  async findAllEmployees(
    filter?: T.EmployeeFilter,
  ): Promise<T.PaginatedResult<T.Employee>> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.departmentId)
      conditions.push(['p.department_id', filter.departmentId]);
    if (filter?.designationId)
      conditions.push(['p.designation_id', filter.designationId]);
    if (filter?.status) conditions.push(['e.status', filter.status]);
    if (filter?.employmentType)
      conditions.push(['p.employment_type', filter.employmentType]);
    if (filter?.isActive !== undefined)
      conditions.push(['e.status', filter.isActive ? 'active' : 'inactive']);
    if (filter?.search)
      conditions.push([
        '(e.name LIKE ? OR e.phone LIKE ? OR p.employee_code LIKE ?)',
        `%${filter.search}%`,
      ]);

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM employees e LEFT JOIN employee_profiles p ON e.id = p.employee_id ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `${EMPLOYEE_SELECT} ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToEmployee), total, offset, limit };
  },

  async findEmployeesByDepartment(departmentId: string): Promise<T.Employee[]> {
    const rows = await query(
      `${EMPLOYEE_SELECT} WHERE p.department_id = ? AND e.status = 'active' ORDER BY e.name ASC`,
      [departmentId],
    );
    return rows.map(rowToEmployee);
  },

  async findEmployeesByDesignation(
    designationId: string,
  ): Promise<T.Employee[]> {
    const rows = await query(
      `${EMPLOYEE_SELECT} WHERE p.designation_id = ? AND e.status = 'active' ORDER BY e.name ASC`,
      [designationId],
    );
    return rows.map(rowToEmployee);
  },

  async findEmployeesByStatus(status: T.EmployeeStatus): Promise<T.Employee[]> {
    const rows = await query(
      `${EMPLOYEE_SELECT} WHERE e.status = ? ORDER BY e.name ASC`,
      [status],
    );
    return rows.map(rowToEmployee);
  },

  async findEmployeesByReportingTo(managerId: string): Promise<T.Employee[]> {
    const rows = await query(
      `${EMPLOYEE_SELECT} WHERE p.reporting_to_id = ? AND e.status = 'active' ORDER BY e.name ASC`,
      [managerId],
    );
    return rows.map(rowToEmployee);
  },

  async updateEmployee(
    id: string,
    updates: Partial<
      T.CreateEmployeeDto & { status?: T.EmployeeStatus; isActive?: boolean }
    >,
  ): Promise<T.Employee> {
    const existing = await this.findEmployeeById(id);
    if (!existing) throw new Error(`Employee not found: ${id}`);
    const ts = now();

    const empSets: string[] = ['updated_at = ?'];
    const empParams: any[] = [ts];
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const fname = updates.firstName ?? existing.firstName;
      const lname = updates.lastName ?? existing.lastName;
      empSets.push('name = ?');
      empParams.push(`${fname}${lname ? ' ' + lname : ''}`);
    }
    if (updates.phone !== undefined) {
      empSets.push('phone = ?');
      empParams.push(updates.phone);
    }
    if (updates.joinDate !== undefined) {
      empSets.push('join_date = ?');
      empParams.push(updates.joinDate);
    }
    if (updates.status !== undefined) {
      empSets.push('status = ?');
      empParams.push(updates.status);
    }

    if (empParams.length > 1) {
      await run(`UPDATE employees SET ${empSets.join(', ')} WHERE id = ?`, [
        ...empParams,
        id,
      ]);
    }

    const profSets: string[] = ['updated_at = ?'];
    const profParams: any[] = [ts];
    if (updates.lastName !== undefined) {
      profSets.push('last_name = ?');
      profParams.push(updates.lastName);
    }
    if (updates.gender !== undefined) {
      profSets.push('gender = ?');
      profParams.push(updates.gender);
    }
    if (updates.dateOfBirth !== undefined) {
      profSets.push('date_of_birth = ?');
      profParams.push(updates.dateOfBirth);
    }
    if (updates.departmentId !== undefined) {
      profSets.push('department_id = ?');
      profParams.push(updates.departmentId);
    }
    if (updates.designationId !== undefined) {
      profSets.push('designation_id = ?');
      profParams.push(updates.designationId);
    }
    if (updates.employmentType !== undefined) {
      profSets.push('employment_type = ?');
      profParams.push(updates.employmentType);
    }
    if (updates.reportingToId !== undefined) {
      profSets.push('reporting_to_id = ?');
      profParams.push(updates.reportingToId || null);
    }
    if (updates.bankAccountNo !== undefined) {
      profSets.push('bank_account_no = ?');
      profParams.push(updates.bankAccountNo || null);
    }
    if (updates.bankName !== undefined) {
      profSets.push('bank_name = ?');
      profParams.push(updates.bankName || null);
    }
    if (updates.bankIfsc !== undefined) {
      profSets.push('bank_ifsc = ?');
      profParams.push(updates.bankIfsc || null);
    }
    if (updates.pfNumber !== undefined) {
      profSets.push('pf_number = ?');
      profParams.push(updates.pfNumber || null);
    }
    if (updates.esiNumber !== undefined) {
      profSets.push('esi_number = ?');
      profParams.push(updates.esiNumber || null);
    }
    if (updates.panNumber !== undefined) {
      profSets.push('pan_number = ?');
      profParams.push(updates.panNumber || null);
    }
    if (updates.aadhaarNumber !== undefined) {
      profSets.push('aadhaar_number = ?');
      profParams.push(updates.aadhaarNumber || null);
    }

    if (profParams.length > 1) {
      const existingProf = await query(
        'SELECT COUNT(*) as cnt FROM employee_profiles WHERE employee_id = ?',
        [id],
      );
      if (Number(existingProf[0]?.cnt || 0) > 0) {
        await run(
          `UPDATE employee_profiles SET ${profSets.join(', ')} WHERE employee_id = ?`,
          [...profParams, id],
        );
      } else {
        await run(
          `INSERT INTO employee_profiles (employee_id, ${profSets.map((s) => s.split(' =')[0]).join(', ')})
           VALUES (?, ${profParams.map(() => '?').join(', ')})`,
          [id, ...profParams],
        );
      }
    }
    return (await this.findEmployeeById(id))!;
  },

  async updateEmployeeProfile(
    id: string,
    profileUpdates: Partial<{
      lastName: string;
      alternatePhone: string | null;
      gender: T.Gender;
      dateOfBirth: string;
      maritalStatus: T.MaritalStatus;
      bloodGroup: T.BloodGroup | null;
      nationality: string;
      departmentId: string;
      designationId: string;
      reportingToId: string | null;
      employmentType: T.EmploymentType;
      confirmationDate: string | null;
      exitDate: string | null;
      exitType: T.ExitType | null;
      exitReason: string | null;
      permanentAddress: string | null;
      currentAddress: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
      emergencyContactRelation: string | null;
      bankAccountNo: string | null;
      bankName: string | null;
      bankIfsc: string | null;
      bankBranch: string | null;
      salaryAccountNo: string | null;
      pfNumber: string | null;
      esiNumber: string | null;
      uanNumber: string | null;
      panNumber: string | null;
      aadhaarNumber: string | null;
      photoUrl: string | null;
      signatureUrl: string | null;
    }>,
  ): Promise<T.Employee> {
    const ts = now();
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [ts];
    const mappings: [string, keyof typeof profileUpdates][] = [
      ['last_name', 'lastName'],
      ['alternate_phone', 'alternatePhone'],
      ['gender', 'gender'],
      ['date_of_birth', 'dateOfBirth'],
      ['marital_status', 'maritalStatus'],
      ['blood_group', 'bloodGroup'],
      ['nationality', 'nationality'],
      ['department_id', 'departmentId'],
      ['designation_id', 'designationId'],
      ['reporting_to_id', 'reportingToId'],
      ['employment_type', 'employmentType'],
      ['confirmation_date', 'confirmationDate'],
      ['exit_date', 'exitDate'],
      ['exit_type', 'exitType'],
      ['exit_reason', 'exitReason'],
      ['permanent_address', 'permanentAddress'],
      ['current_address', 'currentAddress'],
      ['city', 'city'],
      ['state', 'state'],
      ['pincode', 'pincode'],
      ['emergency_contact_name', 'emergencyContactName'],
      ['emergency_contact_phone', 'emergencyContactPhone'],
      ['emergency_contact_relation', 'emergencyContactRelation'],
      ['bank_account_no', 'bankAccountNo'],
      ['bank_name', 'bankName'],
      ['bank_ifsc', 'bankIfsc'],
      ['bank_branch', 'bankBranch'],
      ['salary_account_no', 'salaryAccountNo'],
      ['pf_number', 'pfNumber'],
      ['esi_number', 'esiNumber'],
      ['uan_number', 'uanNumber'],
      ['pan_number', 'panNumber'],
      ['aadhaar_number', 'aadhaarNumber'],
      ['photo_url', 'photoUrl'],
      ['signature_url', 'signatureUrl'],
    ];
    for (const [col, key] of mappings) {
      if (profileUpdates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(profileUpdates[key]);
      }
    }
    if (params.length > 1) {
      const existing = await query(
        'SELECT COUNT(*) as cnt FROM employee_profiles WHERE employee_id = ?',
        [id],
      );
      if (Number(existing[0]?.cnt || 0) > 0) {
        await run(
          `UPDATE employee_profiles SET ${sets.join(', ')} WHERE employee_id = ?`,
          [...params, id],
        );
      } else {
        const cols = ['employee_id', ...sets.map((s) => s.split(' =')[0])];
        const vals = [id, ...params];
        await run(
          `INSERT INTO employee_profiles (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`,
          vals,
        );
      }
    }
    return (await this.findEmployeeById(id))!;
  },

  async deleteEmployee(id: string): Promise<void> {
    await run(
      "UPDATE employees SET status = 'inactive', updated_at = ? WHERE id = ?",
      [now(), id],
    );
  },

  async searchEmployees(
    searchTerm: string,
    filter?: { departmentId?: string; limit?: number },
  ): Promise<T.Employee[]> {
    const params: any[] = [
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
    ];
    let extraSql = '';
    if (filter?.departmentId) {
      extraSql = ' AND p.department_id = ?';
      params.push(filter.departmentId);
    }
    const limit = filter?.limit ?? 20;
    const rows = await query(
      `${EMPLOYEE_SELECT} WHERE (e.name LIKE ? OR e.phone LIKE ? OR p.employee_code LIKE ?)${extraSql} AND e.status = 'active' ORDER BY e.name ASC LIMIT ?`,
      [...params, limit],
    );
    return rows.map(rowToEmployee);
  },

  async getEmployeeCount(filter?: {
    departmentId?: string;
    status?: string;
  }): Promise<number> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (filter?.departmentId)
      conditions.push(['p.department_id', filter.departmentId]);
    if (filter?.status) conditions.push(['e.status', filter.status]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT COUNT(*) as total FROM employees e LEFT JOIN employee_profiles p ON e.id = p.employee_id ${where}`,
      params,
    );
    return rows[0]?.total || 0;
  },

  // ────────────────────────────────────────────────────────────────────────
  // SHIFTS
  // ────────────────────────────────────────────────────────────────────────

  async createShift(dto: {
    code: string;
    name: string;
    shiftType: T.ShiftType;
    startTime: string;
    endTime: string;
    graceMinutes?: number;
    lateThresholdMinutes?: number;
    earlyDepartureThresholdMinutes?: number;
    halfDayHours?: number;
    fullDayHours?: number;
    isNightShift?: boolean;
    applicableDepartments?: string;
  }): Promise<T.Shift> {
    const id = uid('shift');
    await run(
      `INSERT INTO shifts (id, code, name, shift_type, start_time, end_time,
        grace_minutes, late_threshold, early_departure_threshold,
        half_day_hours, full_day_hours, is_night_shift, is_active, applicable_departments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        dto.code,
        dto.name,
        dto.shiftType,
        dto.startTime,
        dto.endTime,
        dto.graceMinutes ?? 10,
        dto.lateThresholdMinutes ?? 15,
        dto.earlyDepartureThresholdMinutes ?? 15,
        dto.halfDayHours ?? 4.5,
        dto.fullDayHours ?? 9.0,
        dto.isNightShift ? 1 : 0,
        dto.applicableDepartments || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [id]);
    return rowToShift(rows[0]);
  },

  async findShiftById(id: string): Promise<T.Shift | null> {
    const rows = await query('SELECT * FROM shifts WHERE id = ?', [id]);
    return rows.length ? rowToShift(rows[0]) : null;
  },

  async findAllShifts(filter?: {
    isActive?: boolean;
    shiftType?: T.ShiftType;
  }): Promise<T.Shift[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (filter?.isActive !== undefined)
      conditions.push(['is_active', filter.isActive ? 1 : 0]);
    if (filter?.shiftType) conditions.push(['shift_type', filter.shiftType]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM shifts ${where} ORDER BY name ASC`,
      params,
    );
    return rows.map(rowToShift);
  },

  async updateShift(
    id: string,
    updates: Partial<{
      code: string;
      name: string;
      shiftType: T.ShiftType;
      startTime: string;
      endTime: string;
      graceMinutes: number;
      lateThresholdMinutes: number;
      earlyDepartureThresholdMinutes: number;
      halfDayHours: number;
      fullDayHours: number;
      isNightShift: boolean;
      isActive: boolean;
      applicableDepartments: string | null;
    }>,
  ): Promise<T.Shift> {
    const existing = await this.findShiftById(id);
    if (!existing) throw new Error(`Shift not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    const mappings: [string, keyof typeof updates][] = [
      ['code', 'code'],
      ['name', 'name'],
      ['shift_type', 'shiftType'],
      ['start_time', 'startTime'],
      ['end_time', 'endTime'],
      ['grace_minutes', 'graceMinutes'],
      ['late_threshold', 'lateThresholdMinutes'],
      ['early_departure_threshold', 'earlyDepartureThresholdMinutes'],
      ['half_day_hours', 'halfDayHours'],
      ['full_day_hours', 'fullDayHours'],
      ['is_night_shift', 'isNightShift'],
      ['is_active', 'isActive'],
      ['applicable_departments', 'applicableDepartments'],
    ];
    for (const [col, key] of mappings) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(updates[key]);
      }
    }
    if (!sets.length) return existing;
    await run(`UPDATE shifts SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findShiftById(id))!;
  },

  async deleteShift(id: string): Promise<void> {
    await run('UPDATE shifts SET is_active = 0 WHERE id = ?', [id]);
  },

  async assignShiftToEmployee(assignment: {
    employeeId: string;
    shiftId: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }): Promise<T.EmployeeShift> {
    const id = uid('empsh');
    await run(
      `INSERT INTO employee_shifts (id, employee_id, shift_id, effective_from, effective_to, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        assignment.employeeId,
        assignment.shiftId,
        assignment.effectiveFrom,
        assignment.effectiveTo || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM employee_shifts WHERE id = ?', [
      id,
    ]);
    return rowToEmployeeShift(rows[0]);
  },

  async getEmployeeShifts(employeeId: string): Promise<T.EmployeeShift[]> {
    const rows = await query(
      `SELECT * FROM employee_shifts WHERE employee_id = ? ORDER BY effective_from DESC`,
      [employeeId],
    );
    return rows.map(rowToEmployeeShift);
  },

  // ────────────────────────────────────────────────────────────────────────
  // ATTENDANCE
  // ────────────────────────────────────────────────────────────────────────

  async markAttendance(dto: T.MarkAttendanceDto): Promise<T.Attendance> {
    const existing = await query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [dto.employeeId, dto.date],
    );
    if (existing.length) {
      const sets: string[] = ['updated_at = ?'];
      const params: any[] = [now()];
      if (dto.shiftId !== undefined) {
        sets.push('shift_id = ?');
        params.push(dto.shiftId || null);
      }
      if (dto.clockIn !== undefined) {
        sets.push('clock_in = ?');
        params.push(dto.clockIn || null);
      }
      if (dto.clockOut !== undefined) {
        sets.push('clock_out = ?');
        params.push(dto.clockOut || null);
      }
      if (dto.status !== undefined) {
        sets.push('status = ?');
        params.push(dto.status);
      }
      if (dto.notes !== undefined) {
        sets.push('notes = ?');
        params.push(dto.notes || null);
      }
      if (dto.source !== undefined) {
        sets.push('source = ?');
        params.push(dto.source);
      }
      await run(
        `UPDATE attendance SET ${sets.join(', ')} WHERE employee_id = ? AND date = ?`,
        [...params, dto.employeeId, dto.date],
      );
      const rows = await query(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [dto.employeeId, dto.date],
      );
      return rowToAttendance(rows[0]);
    }
    const id = uid('att');
    await run(
      `INSERT INTO attendance (id, employee_id, date, shift_id, clock_in, clock_out, status, source, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.employeeId,
        dto.date,
        dto.shiftId || null,
        dto.clockIn || null,
        dto.clockOut || null,
        dto.status || 'present',
        dto.source || 'manual',
        dto.notes || null,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    return rowToAttendance(rows[0]);
  },

  async findAttendanceById(id: string): Promise<T.Attendance | null> {
    const rows = await query('SELECT * FROM attendance WHERE id = ?', [id]);
    return rows.length ? rowToAttendance(rows[0]) : null;
  },

  async findAttendanceByEmployeeAndDate(
    employeeId: string,
    date: string,
  ): Promise<T.Attendance | null> {
    const rows = await query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, date],
    );
    return rows.length ? rowToAttendance(rows[0]) : null;
  },

  async findAttendanceRange(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<T.Attendance[]> {
    const rows = await query(
      'SELECT * FROM attendance WHERE employee_id = ? AND date >= ? AND date <= ? ORDER BY date ASC',
      [employeeId, fromDate, toDate],
    );
    return rows.map(rowToAttendance);
  },

  async findAttendanceByDate(date: string): Promise<T.Attendance[]> {
    const rows = await query(
      'SELECT * FROM attendance WHERE date = ? ORDER BY employee_id ASC',
      [date],
    );
    return rows.map(rowToAttendance);
  },

  async findAttendanceByDepartment(
    departmentId: string,
    fromDate: string,
    toDate: string,
  ): Promise<T.Attendance[]> {
    const rows = await query(
      `SELECT a.* FROM attendance a
       INNER JOIN employee_profiles p ON a.employee_id = p.employee_id
       WHERE p.department_id = ? AND a.date >= ? AND a.date <= ?
       ORDER BY a.date ASC, a.employee_id ASC`,
      [departmentId, fromDate, toDate],
    );
    return rows.map(rowToAttendance);
  },

  async updateAttendance(
    id: string,
    updates: Partial<{
      shiftId: string | null;
      clockIn: string | null;
      clockOut: string | null;
      status: T.AttendanceStatus;
      workedHours: number;
      overtimeHours: number;
      lateMinutes: number;
      earlyDepartureMinutes: number;
      missingPunch: boolean;
      notes: string | null;
    }>,
  ): Promise<T.Attendance> {
    const existing = await this.findAttendanceById(id);
    if (!existing) throw new Error(`Attendance not found: ${id}`);
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (updates.shiftId !== undefined) {
      sets.push('shift_id = ?');
      params.push(updates.shiftId);
    }
    if (updates.clockIn !== undefined) {
      sets.push('clock_in = ?');
      params.push(updates.clockIn);
    }
    if (updates.clockOut !== undefined) {
      sets.push('clock_out = ?');
      params.push(updates.clockOut);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.workedHours !== undefined) {
      sets.push('worked_hours = ?');
      params.push(updates.workedHours);
    }
    if (updates.overtimeHours !== undefined) {
      sets.push('overtime_hours = ?');
      params.push(updates.overtimeHours);
    }
    if (updates.lateMinutes !== undefined) {
      sets.push('late_minutes = ?');
      params.push(updates.lateMinutes);
    }
    if (updates.earlyDepartureMinutes !== undefined) {
      sets.push('early_departure_minutes = ?');
      params.push(updates.earlyDepartureMinutes);
    }
    if (updates.missingPunch !== undefined) {
      sets.push('missing_punch = ?');
      params.push(updates.missingPunch ? 1 : 0);
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?');
      params.push(updates.notes);
    }
    if (params.length === 1) return existing;
    await run(`UPDATE attendance SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findAttendanceById(id))!;
  },

  async approveAttendance(
    id: string,
    approvedBy: string,
  ): Promise<T.Attendance> {
    const ts = now();
    await run(
      'UPDATE attendance SET is_approved = 1, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?',
      [approvedBy, ts, ts, id],
    );
    return (await this.findAttendanceById(id))!;
  },

  async getAttendanceSummary(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{
    present: number;
    absent: number;
    halfDays: number;
    late: number;
    overtime: number;
  }> {
    const rows = await query(
      `SELECT
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as halfDays,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(overtime_hours) as overtime
       FROM attendance
       WHERE employee_id = ? AND date >= ? AND date <= ?`,
      [employeeId, fromDate, toDate],
    );
    const r = rows[0] || {};
    return {
      present: Number(r.present || 0),
      absent: Number(r.absent || 0),
      halfDays: Number(r.halfDays || 0),
      late: Number(r.late || 0),
      overtime: Number(r.overtime || 0),
    };
  },

  async createAttendanceCorrection(dto: {
    employeeId: string;
    date: string;
    originalClockIn?: string | null;
    originalClockOut?: string | null;
    correctedClockIn?: string | null;
    correctedClockOut?: string | null;
    reason: string;
  }): Promise<T.AttendanceCorrection> {
    const id = uid('attcorr');
    await run(
      `INSERT INTO attendance_corrections (id, employee_id, date, original_clock_in, original_clock_out,
        corrected_clock_in, corrected_clock_out, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        dto.employeeId,
        dto.date,
        dto.originalClockIn || null,
        dto.originalClockOut || null,
        dto.correctedClockIn || null,
        dto.correctedClockOut || null,
        dto.reason,
        now(),
      ],
    );
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [id],
    );
    return rowToAttendanceCorrection(rows[0]);
  },

  async findAttendanceCorrections(
    employeeId: string,
  ): Promise<T.AttendanceCorrection[]> {
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId],
    );
    return rows.map(rowToAttendanceCorrection);
  },

  async approveAttendanceCorrection(
    id: string,
    approvedBy: string,
  ): Promise<T.AttendanceCorrection> {
    const ts = now();
    await run(
      `UPDATE attendance_corrections SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
      [approvedBy, ts, id],
    );
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [id],
    );
    return rowToAttendanceCorrection(rows[0]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // HOLIDAY CALENDAR
  // ────────────────────────────────────────────────────────────────────────

  async createHoliday(holiday: {
    name: string;
    date: string;
    year: number;
    type: 'public' | 'restricted' | 'optional';
    isOptional?: boolean;
    applicableDepartments?: string;
  }): Promise<T.HolidayCalendar> {
    const id = uid('hol');
    await run(
      `INSERT INTO holiday_calendar (id, name, date, year, type, is_optional, applicable_departments, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        holiday.name,
        holiday.date,
        holiday.year,
        holiday.type,
        holiday.isOptional ? 1 : 0,
        holiday.applicableDepartments || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM holiday_calendar WHERE id = ?', [
      id,
    ]);
    return rowToHoliday(rows[0]);
  },

  async findHolidayById(id: string): Promise<T.HolidayCalendar | null> {
    const rows = await query('SELECT * FROM holiday_calendar WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToHoliday(rows[0]) : null;
  },

  async findHolidaysByYear(year: number): Promise<T.HolidayCalendar[]> {
    const rows = await query(
      'SELECT * FROM holiday_calendar WHERE year = ? AND is_active = 1 ORDER BY date ASC',
      [year],
    );
    return rows.map(rowToHoliday);
  },

  async findHolidaysByDateRange(
    fromDate: string,
    toDate: string,
  ): Promise<T.HolidayCalendar[]> {
    const rows = await query(
      'SELECT * FROM holiday_calendar WHERE date >= ? AND date <= ? AND is_active = 1 ORDER BY date ASC',
      [fromDate, toDate],
    );
    return rows.map(rowToHoliday);
  },

  async updateHoliday(
    id: string,
    updates: Partial<{
      name: string;
      date: string;
      year: number;
      type: 'public' | 'restricted' | 'optional';
      isOptional: boolean;
      applicableDepartments: string | null;
      isActive: boolean;
    }>,
  ): Promise<T.HolidayCalendar> {
    const existing = await this.findHolidayById(id);
    if (!existing) throw new Error(`Holiday not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.date !== undefined) {
      sets.push('date = ?');
      params.push(updates.date);
    }
    if (updates.year !== undefined) {
      sets.push('year = ?');
      params.push(updates.year);
    }
    if (updates.type !== undefined) {
      sets.push('type = ?');
      params.push(updates.type);
    }
    if (updates.isOptional !== undefined) {
      sets.push('is_optional = ?');
      params.push(updates.isOptional ? 1 : 0);
    }
    if (updates.applicableDepartments !== undefined) {
      sets.push('applicable_departments = ?');
      params.push(updates.applicableDepartments);
    }
    if (updates.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }
    if (!sets.length) return existing;
    await run(`UPDATE holiday_calendar SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findHolidayById(id))!;
  },

  async deleteHoliday(id: string): Promise<void> {
    await run('UPDATE holiday_calendar SET is_active = 0 WHERE id = ?', [id]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // LEAVE TYPES
  // ────────────────────────────────────────────────────────────────────────

  async createLeaveTypeConfig(config: {
    code: string;
    name: string;
    type: T.LeaveType;
    daysPerCycle: number;
    maxConsecutive?: number;
    requiresApproval?: boolean;
    isPaid?: boolean;
    isCarryForward?: boolean;
    carryForwardLimit?: number;
    isEncashable?: boolean;
    minServiceDays?: number;
    genderRestriction?: T.Gender | null;
  }): Promise<T.LeaveTypeConfig> {
    const id = uid('ltype');
    await run(
      `INSERT INTO leave_type_configs (id, code, name, type, days_per_cycle, max_consecutive,
        requires_approval, is_paid, is_carry_forward, carry_forward_limit,
        is_encashable, min_service_days, gender_restriction, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        config.code,
        config.name,
        config.type,
        config.daysPerCycle,
        config.maxConsecutive ?? 0,
        config.requiresApproval !== false ? 1 : 0,
        config.isPaid !== false ? 1 : 0,
        config.isCarryForward ? 1 : 0,
        config.carryForwardLimit ?? 0,
        config.isEncashable ? 1 : 0,
        config.minServiceDays ?? 0,
        config.genderRestriction || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      id,
    ]);
    return rowToLeaveTypeConfig(rows[0]);
  },

  async findLeaveTypeById(id: string): Promise<T.LeaveTypeConfig | null> {
    const rows = await query('SELECT * FROM leave_type_configs WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToLeaveTypeConfig(rows[0]) : null;
  },

  async findAllLeaveTypeConfigs(): Promise<T.LeaveTypeConfig[]> {
    const rows = await query(
      'SELECT * FROM leave_type_configs WHERE is_active = 1 ORDER BY name ASC',
    );
    return rows.map(rowToLeaveTypeConfig);
  },

  async updateLeaveTypeConfig(
    id: string,
    updates: Partial<{
      code: string;
      name: string;
      type: T.LeaveType;
      daysPerCycle: number;
      maxConsecutive: number;
      requiresApproval: boolean;
      isPaid: boolean;
      isCarryForward: boolean;
      carryForwardLimit: number;
      isEncashable: boolean;
      minServiceDays: number;
      genderRestriction: T.Gender | null;
      isActive: boolean;
    }>,
  ): Promise<T.LeaveTypeConfig> {
    const existing = await this.findLeaveTypeById(id);
    if (!existing) throw new Error(`Leave type not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    const mappings: [string, keyof typeof updates][] = [
      ['code', 'code'],
      ['name', 'name'],
      ['type', 'type'],
      ['days_per_cycle', 'daysPerCycle'],
      ['max_consecutive', 'maxConsecutive'],
      ['requires_approval', 'requiresApproval'],
      ['is_paid', 'isPaid'],
      ['is_carry_forward', 'isCarryForward'],
      ['carry_forward_limit', 'carryForwardLimit'],
      ['is_encashable', 'isEncashable'],
      ['min_service_days', 'minServiceDays'],
      ['gender_restriction', 'genderRestriction'],
      ['is_active', 'isActive'],
    ];
    for (const [col, key] of mappings) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(updates[key]);
      }
    }
    if (!sets.length) return existing;
    await run(`UPDATE leave_type_configs SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findLeaveTypeById(id))!;
  },

  async deleteLeaveTypeConfig(id: string): Promise<void> {
    await run('UPDATE leave_type_configs SET is_active = 0 WHERE id = ?', [id]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // LEAVE BALANCES
  // ────────────────────────────────────────────────────────────────────────

  async createLeaveBalance(balance: {
    employeeId: string;
    leaveTypeId: string;
    year: number;
    totalDays: number;
    usedDays?: number;
    pendingDays?: number;
    carriedForward?: number;
  }): Promise<T.LeaveBalance> {
    const id = uid('lbal');
    await run(
      `INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_forward, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        balance.employeeId,
        balance.leaveTypeId,
        balance.year,
        balance.totalDays,
        balance.usedDays ?? 0,
        balance.pendingDays ?? 0,
        balance.carriedForward ?? 0,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    return rowToLeaveBalance(rows[0]);
  },

  async findLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<T.LeaveBalance | null> {
    const rows = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?',
      [employeeId, leaveTypeId, year],
    );
    return rows.length ? rowToLeaveBalance(rows[0]) : null;
  },

  async findLeaveBalancesByEmployee(
    employeeId: string,
    year: number,
  ): Promise<T.LeaveBalance[]> {
    const rows = await query(
      'SELECT * FROM leave_balances WHERE employee_id = ? AND year = ? ORDER BY created_at ASC',
      [employeeId, year],
    );
    return rows.map(rowToLeaveBalance);
  },

  async updateLeaveBalance(
    id: string,
    updates: Partial<{
      totalDays: number;
      usedDays: number;
      pendingDays: number;
      carriedForward: number;
    }>,
  ): Promise<T.LeaveBalance> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (updates.totalDays !== undefined) {
      sets.push('total_days = ?');
      params.push(updates.totalDays);
    }
    if (updates.usedDays !== undefined) {
      sets.push('used_days = ?');
      params.push(updates.usedDays);
    }
    if (updates.pendingDays !== undefined) {
      sets.push('pending_days = ?');
      params.push(updates.pendingDays);
    }
    if (updates.carriedForward !== undefined) {
      sets.push('carried_forward = ?');
      params.push(updates.carriedForward);
    }
    if (params.length === 1)
      return (
        await query('SELECT * FROM leave_balances WHERE id = ?', [id])
      ).map(rowToLeaveBalance)[0];
    await run(`UPDATE leave_balances SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [id]);
    return rowToLeaveBalance(rows[0]);
  },

  async deductLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    days: number,
  ): Promise<T.LeaveBalance> {
    const existing = await this.findLeaveBalance(employeeId, leaveTypeId, year);
    if (!existing)
      throw new Error(
        `Leave balance not found for employee ${employeeId}, type ${leaveTypeId}, year ${year}`,
      );
    await run(
      'UPDATE leave_balances SET used_days = used_days + ?, updated_at = ? WHERE id = ?',
      [days, now(), existing.id],
    );
    const rows = await query('SELECT * FROM leave_balances WHERE id = ?', [
      existing.id,
    ]);
    return rowToLeaveBalance(rows[0]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // LEAVE APPLICATIONS
  // ────────────────────────────────────────────────────────────────────────

  async createLeaveApplication(
    dto: T.LeaveApplicationDto,
  ): Promise<T.LeaveApplication> {
    const id = uid('lev');
    await run(
      `INSERT INTO leave_applications (id, employee_id, leave_type_id, from_date, to_date, session, days, reason,
        status, is_urgent, contact_during_leave, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        id,
        dto.employeeId,
        dto.leaveTypeId,
        dto.fromDate,
        dto.toDate,
        dto.session || 'full_day',
        0,
        dto.reason,
        dto.isUrgent ? 1 : 0,
        dto.contactDuringLeave || null,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    return rowToLeaveApplication(rows[0]);
  },

  async findLeaveApplicationById(
    id: string,
  ): Promise<T.LeaveApplication | null> {
    const rows = await query('SELECT * FROM leave_applications WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToLeaveApplication(rows[0]) : null;
  },

  async findLeaveApplicationsByEmployee(
    employeeId: string,
    filter?: T.LeaveFilter,
  ): Promise<T.LeaveApplication[]> {
    const conditions: [string, any][] = [['employee_id', employeeId]];
    const params: any[] = [];
    if (filter?.status) conditions.push(['status', filter.status]);
    if (filter?.leaveTypeId)
      conditions.push(['leave_type_id', filter.leaveTypeId]);
    if (filter?.fromDate)
      conditions.push(['from_date >= ?', filter.fromDate].reverse() as any);
    if (filter?.toDate)
      conditions.push(['to_date <= ?', filter.toDate].reverse() as any);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM leave_applications ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToLeaveApplication);
  },

  async findLeaveApplicationsByApprover(
    approverId: string,
    filter?: { status?: T.LeaveStatus },
  ): Promise<T.LeaveApplication[]> {
    const conditions: [string, any][] = [['applied_to', approverId]];
    const params: any[] = [];
    if (filter?.status) conditions.push(['status', filter.status]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM leave_applications ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToLeaveApplication);
  },

  async findPendingLeaveApplications(): Promise<T.LeaveApplication[]> {
    const rows = await query(
      "SELECT * FROM leave_applications WHERE status = 'pending' ORDER BY created_at ASC",
    );
    return rows.map(rowToLeaveApplication);
  },

  async updateLeaveApplicationStatus(
    id: string,
    status: T.LeaveStatus,
    approvedBy?: string,
    rejectionReason?: string,
  ): Promise<T.LeaveApplication> {
    const existing = await this.findLeaveApplicationById(id);
    if (!existing) throw new Error(`Leave application not found: ${id}`);
    const allowed = T.LEAVE_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(
        `Cannot transition leave from ${existing.status} to ${status}`,
      );
    }
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, now()];
    if (status === 'approved') {
      sets.push('approved_by = ?');
      params.push(approvedBy || null);
      sets.push('approved_at = ?');
      params.push(now());
    }
    if (status === 'rejected' && rejectionReason) {
      sets.push('rejection_reason = ?');
      params.push(rejectionReason);
    }
    await run(`UPDATE leave_applications SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findLeaveApplicationById(id))!;
  },

  async getLeavesInRange(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<T.LeaveApplication[]> {
    const rows = await query(
      `SELECT * FROM leave_applications
       WHERE employee_id = ? AND from_date <= ? AND to_date >= ? AND status = 'approved'
       ORDER BY from_date ASC`,
      [employeeId, toDate, fromDate],
    );
    return rows.map(rowToLeaveApplication);
  },

  async getLeaveSummary(
    employeeId: string,
    year: number,
  ): Promise<{
    totalDays: number;
    approvedDays: number;
    pendingDays: number;
    rejectedDays: number;
  }> {
    const rows = await query(
      `SELECT
         SUM(CASE WHEN status = 'approved' THEN days ELSE 0 END) as approvedDays,
         SUM(CASE WHEN status = 'pending' THEN days ELSE 0 END) as pendingDays,
         SUM(CASE WHEN status = 'rejected' THEN days ELSE 0 END) as rejectedDays,
         SUM(days) as totalDays
       FROM leave_applications
       WHERE employee_id = ? AND strftime('%Y', from_date) = ?`,
      [employeeId, String(year)],
    );
    const r = rows[0] || {};
    return {
      totalDays: Number(r.totalDays || 0),
      approvedDays: Number(r.approvedDays || 0),
      pendingDays: Number(r.pendingDays || 0),
      rejectedDays: Number(r.rejectedDays || 0),
    };
  },

  // ────────────────────────────────────────────────────────────────────────
  // PAYROLL FREQUENCY CONFIG
  // ────────────────────────────────────────────────────────────────────────

  async createPayrollFrequencyConfig(config: {
    code: string;
    name: string;
    frequency: T.PayrollFrequency;
    cutoffDay: number;
    processDay: number;
    paymentDay: number;
  }): Promise<T.PayrollFrequencyConfig> {
    const id = uid('pfreq');
    await run(
      `INSERT INTO payroll_frequency_config (id, code, name, frequency, cutoff_day, process_day, payment_day, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        config.code,
        config.name,
        config.frequency,
        config.cutoffDay,
        config.processDay,
        config.paymentDay,
        now(),
      ],
    );
    const rows = await query(
      'SELECT * FROM payroll_frequency_config WHERE id = ?',
      [id],
    );
    return rowToPayrollFrequencyConfig(rows[0]);
  },

  async findPayrollFrequencyById(
    id: string,
  ): Promise<T.PayrollFrequencyConfig | null> {
    const rows = await query(
      'SELECT * FROM payroll_frequency_config WHERE id = ?',
      [id],
    );
    return rows.length ? rowToPayrollFrequencyConfig(rows[0]) : null;
  },

  async findAllPayrollFrequencies(): Promise<T.PayrollFrequencyConfig[]> {
    const rows = await query(
      'SELECT * FROM payroll_frequency_config WHERE is_active = 1 ORDER BY name ASC',
    );
    return rows.map(rowToPayrollFrequencyConfig);
  },

  // ────────────────────────────────────────────────────────────────────────
  // SALARY STRUCTURES
  // ────────────────────────────────────────────────────────────────────────

  async createSalaryStructure(
    dto: T.SalaryStructureDto,
  ): Promise<T.SalaryStructure> {
    const id = uid('salstr');
    const gross =
      dto.basicPay +
      dto.hra +
      (dto.conveyanceAllowance ?? 0) +
      (dto.medicalAllowance ?? 0) +
      (dto.specialAllowance ?? 0) +
      (dto.otherAllowance ?? 0);
    await run(
      `INSERT INTO salary_structures (id, employee_id, effective_from, is_active,
        gross_salary, basic_pay, hra, conveyance_allowance, medical_allowance,
        special_allowance, other_allowance, employer_pf, employer_esi, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        id,
        dto.employeeId,
        dto.effectiveFrom,
        gross,
        dto.basicPay,
        dto.hra,
        dto.conveyanceAllowance ?? 0,
        dto.medicalAllowance ?? 0,
        dto.specialAllowance ?? 0,
        dto.otherAllowance ?? 0,
        dto.employeeId,
        now(),
        now(),
      ],
    );
    await run(
      'UPDATE salary_structures SET is_active = 0 WHERE employee_id = ? AND id != ? AND is_active = 1',
      [dto.employeeId, id],
    );
    const rows = await query('SELECT * FROM salary_structures WHERE id = ?', [
      id,
    ]);
    return rowToSalaryStructure(rows[0]);
  },

  async findActiveSalaryStructure(
    employeeId: string,
  ): Promise<T.SalaryStructure | null> {
    const rows = await query(
      `SELECT * FROM salary_structures WHERE employee_id = ? AND is_active = 1 ORDER BY effective_from DESC LIMIT 1`,
      [employeeId],
    );
    return rows.length ? rowToSalaryStructure(rows[0]) : null;
  },

  async findSalaryStructureById(id: string): Promise<T.SalaryStructure | null> {
    const rows = await query('SELECT * FROM salary_structures WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToSalaryStructure(rows[0]) : null;
  },

  async findSalaryStructuresByEmployee(
    employeeId: string,
  ): Promise<T.SalaryStructure[]> {
    const rows = await query(
      'SELECT * FROM salary_structures WHERE employee_id = ? ORDER BY effective_from DESC',
      [employeeId],
    );
    return rows.map(rowToSalaryStructure);
  },

  // ────────────────────────────────────────────────────────────────────────
  // SALARY COMPONENTS
  // ────────────────────────────────────────────────────────────────────────

  async createSalaryComponent(component: {
    salaryStructureId: string;
    componentType: T.PayrollComponentType;
    name: string;
    calculationType: T.AllowanceType | T.DeductionType;
    calculationValue: number;
    isStatutory?: boolean;
    sortOrder?: number;
  }): Promise<T.SalaryComponent> {
    const id = uid('salcomp');
    await run(
      `INSERT INTO salary_components (id, salary_structure_id, component_type, name, calculation_type,
        calculation_value, is_active, is_statutory, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        component.salaryStructureId,
        component.componentType,
        component.name,
        component.calculationType,
        component.calculationValue,
        component.isStatutory ? 1 : 0,
        component.sortOrder ?? 0,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM salary_components WHERE id = ?', [
      id,
    ]);
    return rowToSalaryComponent(rows[0]);
  },

  async findSalaryComponentsByStructure(
    structureId: string,
  ): Promise<T.SalaryComponent[]> {
    const rows = await query(
      'SELECT * FROM salary_components WHERE salary_structure_id = ? ORDER BY sort_order ASC',
      [structureId],
    );
    return rows.map(rowToSalaryComponent);
  },

  // ────────────────────────────────────────────────────────────────────────
  // SALARY REVISIONS
  // ────────────────────────────────────────────────────────────────────────

  async createSalaryRevision(revision: {
    employeeId: string;
    previousGross: number;
    newGross: number;
    revisionDate: string;
    effectiveFrom: string;
    reason: string;
    approvedBy?: string;
  }): Promise<T.SalaryRevision> {
    const id = uid('salrev');
    await run(
      `INSERT INTO salary_revisions (id, employee_id, previous_gross, new_gross, revision_date,
        effective_from, reason, approved_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        revision.employeeId,
        revision.previousGross,
        revision.newGross,
        revision.revisionDate,
        revision.effectiveFrom,
        revision.reason,
        revision.approvedBy || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM salary_revisions WHERE id = ?', [
      id,
    ]);
    return rowToSalaryRevision(rows[0]);
  },

  async findSalaryRevisionsByEmployee(
    employeeId: string,
  ): Promise<T.SalaryRevision[]> {
    const rows = await query(
      'SELECT * FROM salary_revisions WHERE employee_id = ? ORDER BY revision_date DESC',
      [employeeId],
    );
    return rows.map(rowToSalaryRevision);
  },

  // ────────────────────────────────────────────────────────────────────────
  // PAYROLL RUNS
  // ────────────────────────────────────────────────────────────────────────

  async createPayrollRun(dto: T.PayrollRunDto): Promise<T.PayrollRun> {
    const id = uid('prun');
    await run(
      `INSERT INTO payroll_runs (id, month, year, frequency, period_start, period_end, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [
        id,
        dto.month,
        dto.year,
        dto.frequency || 'monthly',
        dto.periodStart,
        dto.periodEnd,
        dto.notes || null,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    return rowToPayrollRun(rows[0]);
  },

  async findPayrollRunById(id: string): Promise<{
    run: T.PayrollRun;
    employeePayrolls: T.EmployeePayroll[];
  } | null> {
    const rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    if (!rows.length) return null;
    const run = rowToPayrollRun(rows[0]);
    const empPayrolls = await query(
      'SELECT * FROM employee_payrolls WHERE payroll_run_id = ? ORDER BY created_at ASC',
      [id],
    );
    return { run, employeePayrolls: empPayrolls.map(rowToEmployeePayroll) };
  },

  async findPayrollRuns(filter?: T.PayrollFilter): Promise<T.PayrollRun[]> {
    const conditions: [string, any][] = [];
    const params: any[] = [];
    if (filter?.month) conditions.push(['month', filter.month]);
    if (filter?.year) conditions.push(['year', filter.year]);
    if (filter?.status) conditions.push(['status', filter.status]);
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM payroll_runs ${where} ORDER BY year DESC, month DESC`,
      params,
    );
    return rows.map(rowToPayrollRun);
  },

  async updatePayrollRunStatus(
    id: string,
    status: T.PayrollStatus,
    updatedBy: string,
  ): Promise<T.PayrollRun> {
    const existing = await this.findPayrollRunById(id);
    if (!existing) throw new Error(`Payroll run not found: ${id}`);
    const allowed = T.PAYROLL_STATUS_TRANSITIONS[existing.run.status] || [];
    if (!allowed.includes(status)) {
      throw new Error(
        `Cannot transition payroll from ${existing.run.status} to ${status}`,
      );
    }
    const ts = now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, ts];
    if (status === 'computed') {
      sets.push('processed_by = ?');
      sets.push('processed_at = ?');
      params.push(updatedBy, ts);
    }
    if (status === 'approved') {
      sets.push('approved_by = ?');
      sets.push('approved_at = ?');
      params.push(updatedBy, ts);
    }
    if (status === 'locked') {
      sets.push('locked_at = ?');
      params.push(ts);
    }
    await run(`UPDATE payroll_runs SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findPayrollRunById(id))!.run;
  },

  // ────────────────────────────────────────────────────────────────────────
  // EMPLOYEE PAYROLLS
  // ────────────────────────────────────────────────────────────────────────

  async createEmployeePayroll(dto: {
    payrollRunId: string;
    employeeId: string;
    grossPay: number;
    totalDeductions: number;
    netPay: number;
    overtimePay?: number;
    incentives?: number;
    commissions?: number;
    serviceChargeShare?: number;
    bonus?: number;
    loanRecovery?: number;
    advanceRecovery?: number;
    reimbursement?: number;
    attendanceDeductions?: number;
    leaveDeductions?: number;
    payableAmount: number;
    employerPf?: number;
    employerEsi?: number;
    paymentMode?: 'cash' | 'bank' | 'cheque' | 'upi';
    components?: string;
  }): Promise<T.EmployeePayroll> {
    const id = uid('emppay');
    const payable =
      dto.payableAmount ||
      dto.netPay -
        (dto.loanRecovery ?? 0) -
        (dto.advanceRecovery ?? 0) +
        (dto.reimbursement ?? 0);
    await run(
      `INSERT INTO employee_payrolls (id, payroll_run_id, employee_id,
        gross_pay, total_deductions, net_pay, overtime_pay, incentives, commissions,
        service_charge_share, bonus, loan_recovery, advance_recovery, reimbursement,
        attendance_deductions, leave_deductions, payable_amount, payment_mode,
        employer_pf, employer_esi, components, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.payrollRunId,
        dto.employeeId,
        dto.grossPay,
        dto.totalDeductions,
        dto.netPay,
        dto.overtimePay ?? 0,
        dto.incentives ?? 0,
        dto.commissions ?? 0,
        dto.serviceChargeShare ?? 0,
        dto.bonus ?? 0,
        dto.loanRecovery ?? 0,
        dto.advanceRecovery ?? 0,
        dto.reimbursement ?? 0,
        dto.attendanceDeductions ?? 0,
        dto.leaveDeductions ?? 0,
        payable,
        dto.paymentMode || 'bank',
        dto.employerPf ?? 0,
        dto.employerEsi ?? 0,
        dto.components || null,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM employee_payrolls WHERE id = ?', [
      id,
    ]);
    return rowToEmployeePayroll(rows[0]);
  },

  async findEmployeePayrollsByRun(
    payrollRunId: string,
  ): Promise<T.EmployeePayroll[]> {
    const rows = await query(
      'SELECT * FROM employee_payrolls WHERE payroll_run_id = ? ORDER BY created_at ASC',
      [payrollRunId],
    );
    return rows.map(rowToEmployeePayroll);
  },

  async findEmployeePayroll(
    employeeId: string,
    payrollRunId: string,
  ): Promise<T.EmployeePayroll | null> {
    const rows = await query(
      'SELECT * FROM employee_payrolls WHERE employee_id = ? AND payroll_run_id = ?',
      [employeeId, payrollRunId],
    );
    return rows.length ? rowToEmployeePayroll(rows[0]) : null;
  },

  async updateEmployeePayroll(
    id: string,
    updates: Partial<{
      grossPay: number;
      totalDeductions: number;
      netPay: number;
      overtimePay: number;
      incentives: number;
      commissions: number;
      serviceChargeShare: number;
      bonus: number;
      loanRecovery: number;
      advanceRecovery: number;
      reimbursement: number;
      attendanceDeductions: number;
      leaveDeductions: number;
      payableAmount: number;
      paymentMode: string;
      isPaid: boolean;
      paidAt: string | null;
      components: string | null;
    }>,
  ): Promise<T.EmployeePayroll> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    const mappings: [string, keyof typeof updates][] = [
      ['gross_pay', 'grossPay'],
      ['total_deductions', 'totalDeductions'],
      ['net_pay', 'netPay'],
      ['overtime_pay', 'overtimePay'],
      ['incentives', 'incentives'],
      ['commissions', 'commissions'],
      ['service_charge_share', 'serviceChargeShare'],
      ['bonus', 'bonus'],
      ['loan_recovery', 'loanRecovery'],
      ['advance_recovery', 'advanceRecovery'],
      ['reimbursement', 'reimbursement'],
      ['attendance_deductions', 'attendanceDeductions'],
      ['leave_deductions', 'leaveDeductions'],
      ['payable_amount', 'payableAmount'],
      ['payment_mode', 'paymentMode'],
      ['is_paid', 'isPaid'],
      ['paid_at', 'paidAt'],
      ['components', 'components'],
    ];
    for (const [col, key] of mappings) {
      if (updates[key] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(updates[key]);
      }
    }
    if (params.length === 1) {
      const rows = await query('SELECT * FROM employee_payrolls WHERE id = ?', [
        id,
      ]);
      return rowToEmployeePayroll(rows[0]);
    }
    await run(`UPDATE employee_payrolls SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM employee_payrolls WHERE id = ?', [
      id,
    ]);
    return rowToEmployeePayroll(rows[0]);
  },

  async lockPayrollRun(id: string, lockedBy: string): Promise<T.PayrollRun> {
    const ts = now();
    await run(
      "UPDATE payroll_runs SET status = 'locked', locked_at = ?, updated_at = ? WHERE id = ?",
      [ts, ts, id],
    );
    return (await this.findPayrollRunById(id))!.run;
  },

  async getPayrollSummary(payrollRunId: string): Promise<{
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerContributions: number;
    employeeCount: number;
  }> {
    const rows = await query(
      `SELECT
         SUM(gross_pay) as totalGrossPay,
         SUM(total_deductions) as totalDeductions,
         SUM(net_pay) as totalNetPay,
         SUM(employer_pf + employer_esi) as totalEmployerContributions,
         COUNT(*) as employeeCount
       FROM employee_payrolls WHERE payroll_run_id = ?`,
      [payrollRunId],
    );
    const r = rows[0] || {};
    return {
      totalGrossPay: Number(r.totalGrossPay || 0),
      totalDeductions: Number(r.totalDeductions || 0),
      totalNetPay: Number(r.totalNetPay || 0),
      totalEmployerContributions: Number(r.totalEmployerContributions || 0),
      employeeCount: Number(r.employeeCount || 0),
    };
  },

  // ────────────────────────────────────────────────────────────────────────
  // LOANS
  // ────────────────────────────────────────────────────────────────────────

  async createLoan(loan: T.LoanApplicationDto): Promise<T.EmployeeLoan> {
    const id = uid('loan');
    await run(
      `INSERT INTO employee_loans (id, employee_id, loan_type, principal_amount, emi_amount,
        total_emis, paid_emis, interest_rate, sanction_date, first_emi_date, purpose, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        loan.employeeId,
        loan.loanType,
        loan.principalAmount,
        loan.emiAmount,
        loan.totalEmis,
        now(),
        now(),
        loan.purpose,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    return rowToEmployeeLoan(rows[0]);
  },

  async findLoanById(id: string): Promise<T.EmployeeLoan | null> {
    const rows = await query('SELECT * FROM employee_loans WHERE id = ?', [id]);
    return rows.length ? rowToEmployeeLoan(rows[0]) : null;
  },

  async findLoansByEmployee(employeeId: string): Promise<T.EmployeeLoan[]> {
    const rows = await query(
      'SELECT * FROM employee_loans WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId],
    );
    return rows.map(rowToEmployeeLoan);
  },

  async findActiveLoans(): Promise<T.EmployeeLoan[]> {
    const rows = await query(
      "SELECT * FROM employee_loans WHERE status = 'active' ORDER BY created_at DESC",
    );
    return rows.map(rowToEmployeeLoan);
  },

  async updateLoanStatus(
    id: string,
    status: T.LoanStatus,
  ): Promise<T.EmployeeLoan> {
    const ts = now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, ts];
    if (status === 'closed') {
      sets.push('closure_date = ?');
      params.push(now().slice(0, 10));
    }
    await run(`UPDATE employee_loans SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findLoanById(id))!;
  },

  async recordLoanEmi(loanId: string): Promise<T.EmployeeLoan> {
    const loan = await this.findLoanById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);
    await run(
      'UPDATE employee_loans SET paid_emis = paid_emis + 1, updated_at = ? WHERE id = ?',
      [now(), loanId],
    );
    const updated = await this.findLoanById(loanId);
    if (updated && updated.paidEmis >= updated.totalEmis) {
      await this.updateLoanStatus(loanId, 'closed');
    }
    return (await this.findLoanById(loanId))!;
  },

  // ────────────────────────────────────────────────────────────────────────
  // ADVANCES
  // ────────────────────────────────────────────────────────────────────────

  async createAdvance(dto: T.AdvanceRequestDto): Promise<T.EmployeeAdvance> {
    const id = uid('adv');
    await run(
      `INSERT INTO hr_advances (id, employee_id, amount, recovery_mode, installment_amount,
        installments, recovered_amount, request_date, recovery_start_month, purpose, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'pending', ?, ?)`,
      [
        id,
        dto.employeeId,
        dto.amount,
        dto.recoveryMode,
        dto.installmentAmount || null,
        dto.installments || null,
        now().slice(0, 10),
        dto.recoveryStartMonth || now().slice(0, 7),
        dto.purpose,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    return rowToEmployeeAdvance(rows[0]);
  },

  async findAdvanceById(id: string): Promise<T.EmployeeAdvance | null> {
    const rows = await query('SELECT * FROM hr_advances WHERE id = ?', [id]);
    return rows.length ? rowToEmployeeAdvance(rows[0]) : null;
  },

  async findAdvancesByEmployee(
    employeeId: string,
  ): Promise<T.EmployeeAdvance[]> {
    const rows = await query(
      'SELECT * FROM hr_advances WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId],
    );
    return rows.map(rowToEmployeeAdvance);
  },

  async findPendingAdvances(): Promise<T.EmployeeAdvance[]> {
    const rows = await query(
      "SELECT * FROM hr_advances WHERE status = 'pending' ORDER BY created_at ASC",
    );
    return rows.map(rowToEmployeeAdvance);
  },

  async updateAdvanceStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'recovered',
    approvedBy?: string,
  ): Promise<T.EmployeeAdvance> {
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, now()];
    if (status === 'approved' && approvedBy) {
      sets.push('approved_by = ?');
      params.push(approvedBy);
    }
    if (status === 'recovered') {
      sets.push('is_recovered = ?');
      params.push(1);
    }
    await run(`UPDATE hr_advances SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findAdvanceById(id))!;
  },

  async recoverAdvance(
    advanceId: string,
    amount?: number,
  ): Promise<T.EmployeeAdvance> {
    const adv = await this.findAdvanceById(advanceId);
    if (!adv) throw new Error(`Advance not found: ${advanceId}`);
    const recoverAmount = amount ?? adv.installmentAmount ?? adv.amount;
    await run(
      'UPDATE hr_advances SET recovered_amount = recovered_amount + ?, updated_at = ? WHERE id = ?',
      [recoverAmount, now(), advanceId],
    );
    const updated = await this.findAdvanceById(advanceId);
    if (updated && updated.recoveredAmount >= updated.amount) {
      await this.updateAdvanceStatus(advanceId, 'recovered');
    }
    return (await this.findAdvanceById(advanceId))!;
  },

  // ────────────────────────────────────────────────────────────────────────
  // REIMBURSEMENTS
  // ────────────────────────────────────────────────────────────────────────

  async createReimbursement(reimbursement: {
    employeeId: string;
    category: string;
    description: string;
    amount: number;
    billDate: string;
    billNumber?: string;
    billImageUrl?: string;
  }): Promise<T.EmployeeReimbursement> {
    const id = uid('reimb');
    await run(
      `INSERT INTO employee_reimbursements (id, employee_id, category, description, amount,
        bill_date, bill_number, bill_image_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        reimbursement.employeeId,
        reimbursement.category,
        reimbursement.description,
        reimbursement.amount,
        reimbursement.billDate,
        reimbursement.billNumber || null,
        reimbursement.billImageUrl || null,
        now(),
      ],
    );
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    return rowToReimbursement(rows[0]);
  },

  async findReimbursementById(
    id: string,
  ): Promise<T.EmployeeReimbursement | null> {
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE id = ?',
      [id],
    );
    return rows.length ? rowToReimbursement(rows[0]) : null;
  },

  async findReimbursementsByEmployee(
    employeeId: string,
  ): Promise<T.EmployeeReimbursement[]> {
    const rows = await query(
      'SELECT * FROM employee_reimbursements WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId],
    );
    return rows.map(rowToReimbursement);
  },

  async findPendingReimbursements(): Promise<T.EmployeeReimbursement[]> {
    const rows = await query(
      "SELECT * FROM employee_reimbursements WHERE status = 'pending' ORDER BY created_at ASC",
    );
    return rows.map(rowToReimbursement);
  },

  async approveReimbursement(
    id: string,
    approvedBy: string,
  ): Promise<T.EmployeeReimbursement> {
    const ts = now();
    await run(
      "UPDATE employee_reimbursements SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?",
      [approvedBy, ts, id],
    );
    return (await this.findReimbursementById(id))!;
  },

  async markReimbursementPaid(
    id: string,
    payrollRunId: string,
  ): Promise<T.EmployeeReimbursement> {
    await run(
      "UPDATE employee_reimbursements SET status = 'paid', paid_in_payroll = 1, payroll_run_id = ? WHERE id = ?",
      [payrollRunId, id],
    );
    return (await this.findReimbursementById(id))!;
  },

  // ────────────────────────────────────────────────────────────────────────
  // PERFORMANCE REVIEWS
  // ────────────────────────────────────────────────────────────────────────

  async createPerformanceReview(review: {
    employeeId: string;
    reviewType: T.ReviewType;
    reviewDate: string;
    reviewerId: string;
    rating: number;
    strengths?: string;
    improvements?: string;
    goals?: string;
    reviewerComments?: string;
    overallScore?: number;
    nextReviewDate?: string;
  }): Promise<T.PerformanceReview> {
    const id = uid('perf');
    await run(
      `INSERT INTO performance_reviews (id, employee_id, review_type, review_date, reviewer_id,
        rating, strengths, improvements, goals, reviewer_comments, overall_score, next_review_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        review.employeeId,
        review.reviewType,
        review.reviewDate,
        review.reviewerId,
        review.rating,
        review.strengths || '',
        review.improvements || '',
        review.goals || null,
        review.reviewerComments || null,
        review.overallScore ?? review.rating,
        review.nextReviewDate || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM performance_reviews WHERE id = ?', [
      id,
    ]);
    return rowToPerformanceReview(rows[0]);
  },

  async findPerformanceReviewById(
    id: string,
  ): Promise<T.PerformanceReview | null> {
    const rows = await query('SELECT * FROM performance_reviews WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToPerformanceReview(rows[0]) : null;
  },

  async findPerformanceReviewsByEmployee(
    employeeId: string,
  ): Promise<T.PerformanceReview[]> {
    const rows = await query(
      'SELECT * FROM performance_reviews WHERE employee_id = ? ORDER BY review_date DESC',
      [employeeId],
    );
    return rows.map(rowToPerformanceReview);
  },

  async findPerformanceReviewsByReviewer(
    reviewerId: string,
  ): Promise<T.PerformanceReview[]> {
    const rows = await query(
      'SELECT * FROM performance_reviews WHERE reviewer_id = ? ORDER BY review_date DESC',
      [reviewerId],
    );
    return rows.map(rowToPerformanceReview);
  },

  async acknowledgeReview(id: string): Promise<T.PerformanceReview> {
    await run(
      'UPDATE performance_reviews SET is_acknowledged = 1 WHERE id = ?',
      [id],
    );
    return (await this.findPerformanceReviewById(id))!;
  },

  // ────────────────────────────────────────────────────────────────────────
  // TRAINING RECORDS
  // ────────────────────────────────────────────────────────────────────────

  async createTrainingRecord(record: {
    employeeId: string;
    trainingName: string;
    provider?: string;
    startDate: string;
    endDate: string;
    status?: T.TrainingStatus;
    cost?: number;
    isCertification?: boolean;
    certificateUrl?: string;
    score?: number;
    feedback?: string;
  }): Promise<T.TrainingRecord> {
    const id = uid('train');
    await run(
      `INSERT INTO training_records (id, employee_id, training_name, provider,
        start_date, end_date, status, cost, is_certification,
        certificate_url, score, feedback, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.employeeId,
        record.trainingName,
        record.provider || '',
        record.startDate,
        record.endDate,
        record.status || 'planned',
        record.cost ?? 0,
        record.isCertification ? 1 : 0,
        record.certificateUrl || null,
        record.score ?? null,
        record.feedback || null,
        now(),
      ],
    );
    const rows = await query('SELECT * FROM training_records WHERE id = ?', [
      id,
    ]);
    return rowToTrainingRecord(rows[0]);
  },

  async findTrainingRecordById(id: string): Promise<T.TrainingRecord | null> {
    const rows = await query('SELECT * FROM training_records WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToTrainingRecord(rows[0]) : null;
  },

  async findTrainingRecordsByEmployee(
    employeeId: string,
  ): Promise<T.TrainingRecord[]> {
    const rows = await query(
      'SELECT * FROM training_records WHERE employee_id = ? ORDER BY start_date DESC',
      [employeeId],
    );
    return rows.map(rowToTrainingRecord);
  },

  async updateTrainingStatus(
    id: string,
    status: T.TrainingStatus,
  ): Promise<T.TrainingRecord> {
    await run('UPDATE training_records SET status = ? WHERE id = ?', [
      status,
      id,
    ]);
    return (await this.findTrainingRecordById(id))!;
  },

  async deleteTrainingRecord(id: string): Promise<void> {
    await run('DELETE FROM training_records WHERE id = ?', [id]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // DISCIPLINARY RECORDS
  // ────────────────────────────────────────────────────────────────────────

  async createDisciplinaryRecord(record: {
    employeeId: string;
    action: T.DisciplinaryAction;
    date: string;
    reason: string;
    description?: string;
    issuedBy: string;
    duration?: number;
  }): Promise<T.DisciplinaryRecord> {
    const id = uid('disc');
    await run(
      `INSERT INTO disciplinary_records (id, employee_id, action, date, reason, description, issued_by, duration, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        record.employeeId,
        record.action,
        record.date,
        record.reason,
        record.description || '',
        record.issuedBy,
        record.duration || null,
        now(),
      ],
    );
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE id = ?',
      [id],
    );
    return rowToDisciplinaryRecord(rows[0]);
  },

  async findDisciplinaryRecordById(
    id: string,
  ): Promise<T.DisciplinaryRecord | null> {
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE id = ?',
      [id],
    );
    return rows.length ? rowToDisciplinaryRecord(rows[0]) : null;
  },

  async findDisciplinaryRecordsByEmployee(
    employeeId: string,
  ): Promise<T.DisciplinaryRecord[]> {
    const rows = await query(
      'SELECT * FROM disciplinary_records WHERE employee_id = ? ORDER BY date DESC',
      [employeeId],
    );
    return rows.map(rowToDisciplinaryRecord);
  },

  async updateDisciplinaryStatus(
    id: string,
    isActive: boolean,
  ): Promise<T.DisciplinaryRecord> {
    await run('UPDATE disciplinary_records SET is_active = ? WHERE id = ?', [
      isActive ? 1 : 0,
      id,
    ]);
    return (await this.findDisciplinaryRecordById(id))!;
  },

  async deleteDisciplinaryRecord(id: string): Promise<void> {
    await run('DELETE FROM disciplinary_records WHERE id = ?', [id]);
  },

  // ────────────────────────────────────────────────────────────────────────
  // EXIT PROCESS
  // ────────────────────────────────────────────────────────────────────────

  async createExitProcess(exit: {
    employeeId: string;
    exitType: T.ExitType;
    requestDate: string;
    expectedLastDate: string;
    reason: string;
    noticePeriodDays?: number;
    noticePeriodWaived?: boolean;
    isEligibleForRehire?: boolean;
  }): Promise<T.ExitProcess> {
    const id = uid('exit');
    await run(
      `INSERT INTO exit_processes (id, employee_id, exit_type, request_date, expected_last_date,
        reason, status, notice_period_days, notice_period_waived, is_eligible_for_rehire, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
      [
        id,
        exit.employeeId,
        exit.exitType,
        exit.requestDate,
        exit.expectedLastDate,
        exit.reason,
        exit.noticePeriodDays ?? 0,
        exit.noticePeriodWaived ? 1 : 0,
        exit.isEligibleForRehire !== false ? 1 : 0,
        now(),
        now(),
      ],
    );
    const rows = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    return rowToExitProcess(rows[0]);
  },

  async findExitProcessByEmployee(
    employeeId: string,
  ): Promise<T.ExitProcess | null> {
    const rows = await query(
      'SELECT * FROM exit_processes WHERE employee_id = ?',
      [employeeId],
    );
    return rows.length ? rowToExitProcess(rows[0]) : null;
  },

  async findExitProcesses(status?: T.ExitStatus): Promise<T.ExitProcess[]> {
    const params: any[] = status ? [status] : [];
    const rows = await query(
      status
        ? 'SELECT * FROM exit_processes WHERE status = ? ORDER BY created_at DESC'
        : 'SELECT * FROM exit_processes ORDER BY created_at DESC',
      params,
    );
    return rows.map(rowToExitProcess);
  },

  async updateExitProcessStatus(
    id: string,
    status: T.ExitStatus,
    updatedBy: string,
  ): Promise<T.ExitProcess> {
    const existing = await query('SELECT * FROM exit_processes WHERE id = ?', [
      id,
    ]);
    if (!existing.length) throw new Error(`Exit process not found: ${id}`);
    const current = existing[0];
    const allowed =
      T.EXIT_STATUS_TRANSITIONS[current.status as T.ExitStatus] || [];
    if (!allowed.includes(status)) {
      throw new Error(
        `Cannot transition exit process from ${current.status} to ${status}`,
      );
    }
    const ts = now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, ts];
    if (status === 'completed') {
      sets.push('actual_last_date = ?');
      params.push(ts.slice(0, 10));
    }
    if (['completed', 'clearance_pending', 'notice_period'].includes(status)) {
      sets.push('approved_by = ?');
      params.push(updatedBy);
    }
    await run(`UPDATE exit_processes SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    if (['completed', 'cancelled'].includes(status)) {
      const exitRows = await query(
        'SELECT * FROM exit_processes WHERE id = ?',
        [id],
      );
      if (exitRows.length) {
        const empStatus = status === 'completed' ? 'terminated' : 'active';
        await run(
          `UPDATE employees SET status = ?, updated_at = ? WHERE id = ?`,
          [empStatus, ts, exitRows[0].employee_id],
        );
      }
    }
    return rowToExitProcess(
      (await query('SELECT * FROM exit_processes WHERE id = ?', [id]))[0],
    );
  },

  async completeExitProcess(
    id: string,
    actualLastDate: string,
    clearanceItems?: string,
  ): Promise<T.ExitProcess> {
    await run(
      `UPDATE exit_processes SET status = 'completed', actual_last_date = ?, clearance_items = ?, updated_at = ?
       WHERE id = ?`,
      [actualLastDate, clearanceItems || null, now(), id],
    );
    const exit = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    if (exit.length) {
      await run(
        "UPDATE employees SET status = 'terminated', updated_at = ? WHERE id = ?",
        [now(), exit[0].employee_id],
      );
    }
    return rowToExitProcess(exit[0]);
  },

  async cancelExitProcess(id: string): Promise<void> {
    const ts = now();
    await run(
      "UPDATE exit_processes SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [ts, id],
    );
    const exit = await query('SELECT * FROM exit_processes WHERE id = ?', [id]);
    if (exit.length) {
      await run(
        "UPDATE employees SET status = 'active', updated_at = ? WHERE id = ?",
        [ts, exit[0].employee_id],
      );
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // UTILITY / REPORTING
  // ────────────────────────────────────────────────────────────────────────

  async getReport(employeeId: string): Promise<{
    employee: T.Employee | null;
    salaryStructure: T.SalaryStructure | null;
    attendance: {
      present: number;
      absent: number;
      halfDays: number;
      late: number;
      overtime: number;
    };
    leaveSummary: {
      totalDays: number;
      approvedDays: number;
      pendingDays: number;
      rejectedDays: number;
    };
    loans: T.EmployeeLoan[];
    advances: T.EmployeeAdvance[];
    reimbursements: T.EmployeeReimbursement[];
    performanceReviews: T.PerformanceReview[];
    trainingRecords: T.TrainingRecord[];
    disciplinaryRecords: T.DisciplinaryRecord[];
    exitProcess: T.ExitProcess | null;
  }> {
    const employee = await this.findEmployeeById(employeeId);
    const salaryStructure = await this.findActiveSalaryStructure(employeeId);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const toDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate().toString().padStart(2, '0')}`;
    const attendance = await this.getAttendanceSummary(
      employeeId,
      fromDate,
      toDate,
    );
    const leaveSummary = await this.getLeaveSummary(employeeId, year);
    const loans = await this.findLoansByEmployee(employeeId);
    const advances = await this.findAdvancesByEmployee(employeeId);
    const reimbursements = await this.findReimbursementsByEmployee(employeeId);
    const performanceReviews =
      await this.findPerformanceReviewsByEmployee(employeeId);
    const trainingRecords =
      await this.findTrainingRecordsByEmployee(employeeId);
    const disciplinaryRecords =
      await this.findDisciplinaryRecordsByEmployee(employeeId);
    const exitProcess = await this.findExitProcessByEmployee(employeeId);
    return {
      employee,
      salaryStructure,
      attendance,
      leaveSummary,
      loans,
      advances,
      reimbursements,
      performanceReviews,
      trainingRecords,
      disciplinaryRecords,
      exitProcess,
    };
  },

  async getDepartmentHeadcount(
    departmentId: string,
  ): Promise<{ total: number; active: number; inactive: number }> {
    const rows = await query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN e.status != 'active' THEN 1 ELSE 0 END) as inactive
       FROM employees e
       INNER JOIN employee_profiles p ON e.id = p.employee_id
       WHERE p.department_id = ?`,
      [departmentId],
    );
    const r = rows[0] || {};
    return {
      total: Number(r.total || 0),
      active: Number(r.active || 0),
      inactive: Number(r.inactive || 0),
    };
  },

  async getOrgChart(): Promise<{
    departments: T.Department[];
    designations: T.Designation[];
    employees: {
      id: string;
      name: string;
      departmentId: string;
      designationId: string;
      reportingToId: string | null;
    }[];
  }> {
    const departments = await this.findAllDepartments({ isActive: true });
    const designations = await this.findAllDesignations({ isActive: true });
    const empRows = await query(
      `SELECT e.id, e.name, p.department_id, p.designation_id, p.reporting_to_id
       FROM employees e
       LEFT JOIN employee_profiles p ON e.id = p.employee_id
       WHERE e.status = 'active'`,
    );
    const employees = empRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      departmentId: r.department_id || '',
      designationId: r.designation_id || '',
      reportingToId: r.reporting_to_id || null,
    }));
    return { departments, designations, employees };
  },

  async getPayrollCost(
    month: number,
    year: number,
  ): Promise<{
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerContributions: number;
    employeeCount: number;
  }> {
    const rows = await query(
      `SELECT
         SUM(ep.gross_pay) as totalGrossPay,
         SUM(ep.total_deductions) as totalDeductions,
         SUM(ep.net_pay) as totalNetPay,
         SUM(ep.employer_pf + ep.employer_esi) as totalEmployerContributions,
         COUNT(DISTINCT ep.employee_id) as employeeCount
       FROM employee_payrolls ep
       INNER JOIN payroll_runs pr ON ep.payroll_run_id = pr.id
       WHERE pr.month = ? AND pr.year = ? AND pr.status IN ('approved', 'paid', 'locked')`,
      [month, year],
    );
    const r = rows[0] || {};
    return {
      totalGrossPay: Number(r.totalGrossPay || 0),
      totalDeductions: Number(r.totalDeductions || 0),
      totalNetPay: Number(r.totalNetPay || 0),
      totalEmployerContributions: Number(r.totalEmployerContributions || 0),
      employeeCount: Number(r.employeeCount || 0),
    };
  },

  async getAttendanceRate(
    departmentId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    lateDays: number;
    attendanceRate: number;
  }> {
    const rows = await query(
      `SELECT
         COUNT(*) as totalDays,
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as presentDays,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absentDays,
         SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as halfDays,
         SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as lateDays
       FROM attendance a
       INNER JOIN employee_profiles p ON a.employee_id = p.employee_id
       WHERE p.department_id = ? AND a.date >= ? AND a.date <= ?`,
      [departmentId, fromDate, toDate],
    );
    const r = rows[0] || {};
    const total = Number(r.totalDays || 0);
    const present = Number(r.presentDays || 0);
    const half = Number(r.halfDays || 0);
    return {
      totalDays: total,
      presentDays: present,
      absentDays: Number(r.absentDays || 0),
      halfDays: half,
      lateDays: Number(r.lateDays || 0),
      attendanceRate:
        total > 0
          ? Math.round(((present + half * 0.5) / total) * 10000) / 100
          : 0,
    };
  },

  async findAttendanceCorrectionById(
    id: string,
  ): Promise<T.AttendanceCorrection | null> {
    const rows = await query(
      'SELECT * FROM attendance_corrections WHERE id = ?',
      [id],
    );
    return rows.length ? rowToAttendanceCorrection(rows[0]) : null;
  },

  async findLateAttendance(
    fromDate: string,
    toDate: string,
  ): Promise<T.Attendance[]> {
    const rows = await query(
      `SELECT * FROM attendance WHERE (status = 'late' OR late_minutes > 0) AND date >= ? AND date <= ? ORDER BY date ASC, employee_id ASC`,
      [fromDate, toDate],
    );
    return rows.map(rowToAttendance);
  },

  async findLeaveSummary(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<{ paid: number; unpaid: number }> {
    const rows = await query(
      `SELECT la.days, ltc.is_paid
       FROM leave_applications la
       JOIN leave_type_configs ltc ON ltc.id = la.leave_type_id
       WHERE la.employee_id = ? AND la.status = 'approved'
         AND la.from_date <= ? AND la.to_date >= ?`,
      [employeeId, toDate, fromDate],
    );
    let paid = 0;
    let unpaid = 0;
    for (const r of rows) {
      if (r.is_paid) paid += Number(r.days || 0);
      else unpaid += Number(r.days || 0);
    }
    return { paid, unpaid };
  },

  async updatePayrollRun(
    id: string,
    updates: Partial<{
      totalGrossPay: number;
      totalDeductions: number;
      totalNetPay: number;
      totalEmployerContributions: number;
      employeeCount: number;
      notes: string;
      status: T.PayrollStatus;
      processedAt: string;
      approvedAt: string;
      lockedAt: string;
    }>,
  ): Promise<T.PayrollRun> {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now()];
    if (updates.totalGrossPay !== undefined) {
      sets.push('total_gross_pay = ?');
      params.push(updates.totalGrossPay);
    }
    if (updates.totalDeductions !== undefined) {
      sets.push('total_deductions = ?');
      params.push(updates.totalDeductions);
    }
    if (updates.totalNetPay !== undefined) {
      sets.push('total_net_pay = ?');
      params.push(updates.totalNetPay);
    }
    if (updates.totalEmployerContributions !== undefined) {
      sets.push('total_employer_contributions = ?');
      params.push(updates.totalEmployerContributions);
    }
    if (updates.employeeCount !== undefined) {
      sets.push('employee_count = ?');
      params.push(updates.employeeCount);
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?');
      params.push(updates.notes);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.processedAt !== undefined) {
      sets.push('processed_at = ?');
      params.push(updates.processedAt);
    }
    if (updates.approvedAt !== undefined) {
      sets.push('approved_at = ?');
      params.push(updates.approvedAt);
    }
    if (updates.lockedAt !== undefined) {
      sets.push('locked_at = ?');
      params.push(updates.lockedAt);
    }
    await run(`UPDATE payroll_runs SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    const rows = await query('SELECT * FROM payroll_runs WHERE id = ?', [id]);
    return rowToPayrollRun(rows[0]);
  },

  async deactivateSalaryStructure(employeeId: string): Promise<void> {
    await run(
      'UPDATE salary_structures SET is_active = 0, updated_at = ? WHERE employee_id = ?',
      [now(), employeeId],
    );
  },

  async deleteEmployeePayrollsByRun(payrollRunId: string): Promise<void> {
    await run('DELETE FROM employee_payrolls WHERE payroll_run_id = ?', [
      payrollRunId,
    ]);
  },

  async findAllLeaveBalancesByYear(year: number): Promise<T.LeaveBalance[]> {
    const rows = await query(
      'SELECT * FROM leave_balances WHERE year = ? ORDER BY employee_id ASC',
      [year],
    );
    return rows.map(rowToLeaveBalance);
  },
};
