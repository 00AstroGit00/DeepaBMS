export type EmployeeStatus =
  'active' | 'inactive' | 'suspended' | 'terminated' | 'resigned' | 'retired';
export type EmploymentType =
  | 'permanent'
  | 'probation'
  | 'contract'
  | 'intern'
  | 'trainee'
  | 'daily_wage'
  | 'hourly';
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type BloodGroup =
  'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late'
  | 'early_departure'
  | 'holiday'
  | 'leave'
  | 'week_off';
export type ShiftType =
  'general' | 'morning' | 'afternoon' | 'night' | 'split' | 'flexible';
export type LeaveType =
  | 'casual'
  | 'sick'
  | 'earned'
  | 'comp_off'
  | 'maternity'
  | 'paternity'
  | 'loss_of_pay'
  | 'bereavement'
  | 'marriage'
  | 'custom';
export type LeaveSession = 'full_day' | 'first_half' | 'second_half';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayrollFrequency = 'monthly' | 'weekly' | 'daily' | 'hourly';
export type PayrollStatus =
  'draft' | 'computed' | 'approved' | 'paid' | 'locked';
export type AllowanceType = 'fixed' | 'percentage' | 'variable';
export type DeductionType = 'fixed' | 'percentage' | 'statutory';
export type LoanStatus = 'active' | 'closed' | 'defaulted';
export type AdvanceRecoveryMode = 'one_time' | 'installment';
export type ReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type ReviewType =
  'annual' | 'quarterly' | 'monthly' | 'probation' | 'promotion';
export type DisciplinaryAction =
  'warning' | 'written_warning' | 'suspension' | 'termination';
export type ExitType =
  | 'resignation'
  | 'retirement'
  | 'termination'
  | 'mutual_separation'
  | 'contract_end';
export type ExitStatus =
  | 'requested'
  | 'notice_period'
  | 'clearance_pending'
  | 'completed'
  | 'cancelled';
export type TrainingStatus =
  'planned' | 'in_progress' | 'completed' | 'cancelled';
export type PayrollComponentType = 'earning' | 'deduction';
export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'voter_id'
  | 'driving_license'
  | 'passport'
  | 'bank_passbook'
  | 'salary_slip'
  | 'offer_letter'
  | 'experience_certificate'
  | 'education_certificate'
  | 'other';

export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  headId: string | null;
  parentId: string | null;
  isActive: boolean;
  costCenter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Designation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  grade: string | null;
  level: number;
  minSalary: number;
  maxSalary: number;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus: MaritalStatus;
  bloodGroup: BloodGroup | null;
  nationality: string;
  departmentId: string;
  designationId: string;
  reportingToId: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  joinDate: string;
  confirmationDate: string | null;
  exitDate: string | null;
  exitType: ExitType | null;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  code: string;
  name: string;
  shiftType: ShiftType;
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
  createdAt: string;
}

export interface EmployeeShift {
  id: string;
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  workedHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  missingPunch: boolean;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  correctionReason: string | null;
  notes: string | null;
  source: 'manual' | 'biometric' | 'qr' | 'gps' | 'correction';
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCalendar {
  id: string;
  name: string;
  date: string;
  year: number;
  type: 'public' | 'restricted' | 'optional';
  isOptional: boolean;
  applicableDepartments: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveTypeConfig {
  id: string;
  code: string;
  name: string;
  type: LeaveType;
  daysPerCycle: number;
  maxConsecutive: number;
  requiresApproval: boolean;
  isPaid: boolean;
  isCarryForward: boolean;
  carryForwardLimit: number;
  isEncashable: boolean;
  minServiceDays: number;
  genderRestriction: Gender | null;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carriedForward: number;
  availableDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  session: LeaveSession;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedTo: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  isUrgent: boolean;
  contactDuringLeave: string | null;
  alternateArrangements: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollFrequencyConfig {
  id: string;
  code: string;
  name: string;
  frequency: PayrollFrequency;
  cutoffDay: number;
  processDay: number;
  paymentDay: number;
  isActive: boolean;
  createdAt: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  grossSalary: number;
  basicPay: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  employerPf: number;
  employerEsi: number;
  totalCostToCompany: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponent {
  id: string;
  salaryStructureId: string;
  componentType: PayrollComponentType;
  name: string;
  calculationType: AllowanceType | DeductionType;
  calculationValue: number;
  isActive: boolean;
  isStatutory: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  frequency: PayrollFrequency;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  processedBy: string | null;
  processedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  lockedAt: string | null;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalEmployerContributions: number;
  employeeCount: number;
  journalId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayroll {
  id: string;
  payrollRunId: string;
  employeeId: string;
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
  employerPf: number;
  employerEsi: number;
  attendanceDeductions: number;
  leaveDeductions: number;
  payableAmount: number;
  paymentMode: 'cash' | 'bank' | 'cheque' | 'upi';
  paidAt: string | null;
  isPaid: boolean;
  components: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevision {
  id: string;
  employeeId: string;
  previousGross: number;
  newGross: number;
  revisionDate: string;
  effectiveFrom: string;
  reason: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  loanType: string;
  principalAmount: number;
  emiAmount: number;
  totalEmis: number;
  paidEmis: number;
  remainingAmount: number;
  interestRate: number;
  sanctionDate: string;
  firstEmiDate: string;
  closureDate: string | null;
  status: LoanStatus;
  purpose: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  amount: number;
  recoveryMode: AdvanceRecoveryMode;
  installmentAmount: number | null;
  installments: number | null;
  recoveredAmount: number;
  remainingAmount: number;
  requestDate: string;
  recoveryStartMonth: string;
  isRecovered: boolean;
  purpose: string;
  approvedBy: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'recovered';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeReimbursement {
  id: string;
  employeeId: string;
  category: string;
  description: string;
  amount: number;
  billDate: string;
  billNumber: string | null;
  billImageUrl: string | null;
  status: ReimbursementStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  paidInPayroll: boolean;
  payrollRunId: string | null;
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewType: ReviewType;
  reviewDate: string;
  reviewerId: string;
  rating: number;
  strengths: string;
  improvements: string;
  goals: string | null;
  reviewerComments: string | null;
  employeeComments: string | null;
  isAcknowledged: boolean;
  nextReviewDate: string | null;
  overallScore: number;
  createdAt: string;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  trainingName: string;
  provider: string;
  startDate: string;
  endDate: string;
  status: TrainingStatus;
  cost: number;
  isCertification: boolean;
  certificateUrl: string | null;
  score: number | null;
  feedback: string | null;
  createdAt: string;
}

export interface DisciplinaryRecord {
  id: string;
  employeeId: string;
  action: DisciplinaryAction;
  date: string;
  reason: string;
  description: string;
  issuedBy: string;
  duration: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface ExitProcess {
  id: string;
  employeeId: string;
  exitType: ExitType;
  requestDate: string;
  expectedLastDate: string;
  actualLastDate: string | null;
  reason: string;
  status: ExitStatus;
  noticePeriodDays: number;
  noticePeriodWaived: boolean;
  clearanceItems: string | null;
  isEligibleForRehire: boolean;
  exitInterviewNotes: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: DocumentType;
  documentName: string;
  documentUrl: string;
  issueDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  date: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  correctedClockIn: string | null;
  correctedClockOut: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PayrollJournalEntry {
  payrollRunId: string;
  journalId: string;
  voucherNo: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  period: string;
  createdAt: string;
}

// ── DTOs ────────────────────────────────────────────────────────────

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description?: string;
  headId?: string;
  parentId?: string;
  costCenter?: string;
}

export interface CreateDesignationDto {
  code: string;
  name: string;
  departmentId: string;
  description?: string;
  grade?: string;
  level?: number;
  minSalary?: number;
  maxSalary?: number;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender: Gender;
  dateOfBirth: string;
  departmentId: string;
  designationId: string;
  employmentType?: EmploymentType;
  joinDate: string;
  reportingToId?: string;
  salary?: number;
  bankAccountNo?: string;
  bankName?: string;
  bankIfsc?: string;
  pfNumber?: string;
  esiNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
}

export interface MarkAttendanceDto {
  employeeId: string;
  date: string;
  shiftId?: string;
  clockIn?: string;
  clockOut?: string;
  status?: AttendanceStatus;
  source?: string;
  notes?: string;
}

export interface LeaveApplicationDto {
  employeeId: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  session?: LeaveSession;
  reason: string;
  isUrgent?: boolean;
  contactDuringLeave?: string;
}

export interface PayrollRunDto {
  month: number;
  year: number;
  frequency?: PayrollFrequency;
  periodStart: string;
  periodEnd: string;
  employeeIds?: string[];
  notes?: string;
}

export interface SalaryStructureDto {
  employeeId: string;
  effectiveFrom: string;
  basicPay: number;
  hra: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  otherAllowance?: number;
}

export interface LoanApplicationDto {
  employeeId: string;
  loanType: string;
  principalAmount: number;
  emiAmount: number;
  totalEmis: number;
  purpose: string;
}

export interface AdvanceRequestDto {
  employeeId: string;
  amount: number;
  recoveryMode: AdvanceRecoveryMode;
  installmentAmount?: number;
  installments?: number;
  recoveryStartMonth?: string;
  purpose: string;
}

// ── Filters ─────────────────────────────────────────────────────────

export interface EmployeeFilter {
  departmentId?: string;
  designationId?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  search?: string;
  isActive?: boolean;
  offset?: number;
  limit?: number;
}

export interface AttendanceFilter {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
  status?: AttendanceStatus;
  departmentId?: string;
  shiftId?: string;
  offset?: number;
  limit?: number;
}

export interface PayrollFilter {
  month?: number;
  year?: number;
  employeeId?: string;
  status?: PayrollStatus;
  departmentId?: string;
}

export interface LeaveFilter {
  employeeId?: string;
  status?: LeaveStatus;
  leaveTypeId?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Payroll Calculation Types ────────────────────────────────────────

export interface PayrollCalculationInput {
  employee: Employee;
  salaryStructure: SalaryStructure;
  components: SalaryComponent[];
  attendance: {
    present: number;
    absent: number;
    halfDays: number;
    lateDays: number;
    overtimeHours: number;
  };
  leaves: { paid: number; unpaid: number };
  loanRecovery: number;
  advanceRecovery: number;
  reimbursements: number;
}

export interface PayrollCalculationResult {
  basicPay: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  grossPay: number;
  overtimePay: number;
  incentives: number;
  bonus: number;
  totalEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  ptDeduction: number;
  incomeTax: number;
  otherDeductions: number;
  totalDeductions: number;
  loanRecovery: number;
  advanceRecovery: number;
  netPay: number;
  employerPf: number;
  employerEsi: number;
  totalCostToCompany: number;
  attendanceDeductions: number;
  leaveDeductions: number;
  payableAmount: number;
}

// ── State Machines ──────────────────────────────────────────────────

export const LEAVE_STATUS_TRANSITIONS: Record<LeaveStatus, LeaveStatus[]> = {
  pending: ['approved', 'rejected', 'cancelled'],
  approved: ['cancelled'],
  rejected: ['pending'],
  cancelled: ['pending'],
};

export const PAYROLL_STATUS_TRANSITIONS: Record<
  PayrollStatus,
  PayrollStatus[]
> = {
  draft: ['computed', 'approved'],
  computed: ['approved', 'draft'],
  approved: ['paid', 'draft'],
  paid: ['locked'],
  locked: [],
};

export const EXIT_STATUS_TRANSITIONS: Record<ExitStatus, ExitStatus[]> = {
  requested: ['notice_period', 'cancelled'],
  notice_period: ['clearance_pending', 'completed'],
  clearance_pending: ['completed'],
  completed: [],
  cancelled: [],
};

// ── Constants ───────────────────────────────────────────────────────

export const PF_EMPLOYEE_RATE = 0.12;
export const PF_EMPLOYER_RATE = 0.12;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;
export const PT_THRESHOLD = 15000;
export const PT_AMOUNT = 200;
export const MIN_WAGE_HOURLY = 75;
export const MIN_WAGE_DAILY = 600;
export const OT_RATE_MULTIPLIER = 2.0;
export const NIGHT_ALLOWANCE_PERCENT = 0.1;
export const MAX_OT_HOURS_PER_DAY = 4;
export const MAX_OT_HOURS_PER_MONTH = 60;
export const FULL_DAY_HOURS = 9;
export const HALF_DAY_HOURS = 4.5;

export const VALID_LEAVE_TYPES: LeaveType[] = [
  'casual',
  'sick',
  'earned',
  'comp_off',
  'maternity',
  'paternity',
  'loss_of_pay',
  'bereavement',
  'marriage',
  'custom',
];

export const VALID_EMPLOYMENT_TYPES: EmploymentType[] = [
  'permanent',
  'probation',
  'contract',
  'intern',
  'trainee',
  'daily_wage',
  'hourly',
];

export const VALID_SHIFT_TYPES: ShiftType[] = [
  'general',
  'morning',
  'afternoon',
  'night',
  'split',
  'flexible',
];

export const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'half_day',
  'late',
  'early_departure',
  'holiday',
  'leave',
  'week_off',
];

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
