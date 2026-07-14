export type StepType =
  | 'start'
  | 'end'
  | 'task'
  | 'approval'
  | 'condition'
  | 'parallel'
  | 'sequential'
  | 'timer'
  | 'delay'
  | 'wait'
  | 'escalation'
  | 'rollback'
  | 'compensation'
  | 'notification'
  | 'sub_workflow'
  | 'script';

export const VALID_STEP_TYPES: readonly StepType[] = [
  'start',
  'end',
  'task',
  'approval',
  'condition',
  'parallel',
  'sequential',
  'timer',
  'delay',
  'wait',
  'escalation',
  'rollback',
  'compensation',
  'notification',
  'sub_workflow',
  'script',
];

export type WorkflowStatus = 'draft' | 'published' | 'archived';

export type InstanceStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'suspended'
  | 'timed_out';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting'
  | 'timed_out'
  | 'retrying';

export type RuleCategory =
  | 'validation'
  | 'calculation'
  | 'scheduling'
  | 'approval'
  | 'alert'
  | 'automation'
  | 'compliance'
  | 'policy';

export const VALID_RULE_CATEGORIES: readonly RuleCategory[] = [
  'validation',
  'calculation',
  'scheduling',
  'approval',
  'alert',
  'automation',
  'compliance',
  'policy',
];

export type RuleStatus =
  'active' | 'inactive' | 'draft' | 'deprecated' | 'archived';

export type ApprovalCategory =
  | 'purchase'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'inventory'
  | 'restaurant'
  | 'hotel'
  | 'bar'
  | 'general'
  | 'compliance';

export const VALID_APPROVAL_CATEGORIES: readonly ApprovalCategory[] = [
  'purchase',
  'sales',
  'hr',
  'finance',
  'inventory',
  'restaurant',
  'hotel',
  'bar',
  'general',
  'compliance',
];

export type ApproverType =
  | 'owner'
  | 'manager'
  | 'finance'
  | 'hr'
  | 'inventory'
  | 'purchasing'
  | 'restaurant'
  | 'hotel'
  | 'bar'
  | 'compliance'
  | 'custom';

export type ApprovalType = 'any' | 'all' | 'specific' | 'escalation';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'expired'
  | 'skipped'
  | 'cancelled';

export type AssignmentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'delegated'
  | 'escalated'
  | 'expired'
  | 'skipped';

export type NotifType =
  'in_app' | 'push' | 'email' | 'sms' | 'whatsapp' | 'desktop';

export type NotifCategory =
  | 'info'
  | 'warning'
  | 'critical'
  | 'approval'
  | 'reminder'
  | 'escalation'
  | 'system'
  | 'audit';

export const VALID_NOTIF_CATEGORIES: readonly NotifCategory[] = [
  'info',
  'warning',
  'critical',
  'approval',
  'reminder',
  'escalation',
  'system',
  'audit',
];

export type NotifChannel =
  'in_app' | 'push' | 'email' | 'sms' | 'whatsapp' | 'desktop';

export type JobStatus = 'active' | 'paused' | 'archived' | 'completed';

export type JobInstanceStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';

export type VarScope = 'local' | 'global' | 'input' | 'output';

export type TimerStatus = 'pending' | 'triggered' | 'cancelled' | 'expired';

export type WorkflowCategory =
  | 'general'
  | 'hr'
  | 'finance'
  | 'inventory'
  | 'purchasing'
  | 'restaurant'
  | 'hotel'
  | 'bar'
  | 'sales'
  | 'compliance'
  | 'it'
  | 'operations'
  | 'custom';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: WorkflowStatus;
  category: string;
  tags: string[];
  icon: string | null;
  color: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  createdBy?: string;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  status?: WorkflowStatus;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepType: StepType;
  name: string;
  description: string | null;
  config: Record<string, any>;
  stepOrder: number;
  branchCondition: string | null;
  retryPolicy: string | null;
  timeoutMs: number | null;
  assignedRole: string | null;
  escalationStepId: string | null;
  compensationStepId: string | null;
  createdAt: string;
}

export interface CreateStepDto {
  workflowId: string;
  stepType: StepType;
  name: string;
  description?: string;
  config?: Record<string, any>;
  stepOrder: number;
  branchCondition?: string;
  retryPolicy?: string;
  timeoutMs?: number;
  assignedRole?: string;
  escalationStepId?: string;
  compensationStepId?: string;
}

export interface UpdateStepDto {
  name?: string;
  description?: string;
  config?: Record<string, any>;
  stepOrder?: number;
  branchCondition?: string;
  retryPolicy?: string;
  timeoutMs?: number;
  assignedRole?: string;
  escalationStepId?: string;
  compensationStepId?: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: InstanceStatus;
  context: Record<string, any>;
  variables: Record<string, any>;
  startedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  priority: number;
  correlationId: string | null;
  parentInstanceId: string | null;
  createdAt: string;
}

export interface StartWorkflowDto {
  workflowId: string;
  context?: Record<string, any>;
  variables?: Record<string, any>;
  startedBy?: string;
  priority?: number;
  correlationId?: string;
  parentInstanceId?: string;
}

export interface WorkflowInstanceStep {
  id: string;
  instanceId: string;
  stepId: string;
  stepName: string;
  stepType: StepType;
  status: StepStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  assignedTo: string | null;
  completedBy: string | null;
}

export interface WorkflowVariable {
  id: string;
  instanceId: string;
  name: string;
  value: string;
  scope: VarScope;
}

export interface SetVariableDto {
  name: string;
  value: string;
  scope?: VarScope;
}

export interface WorkflowTimer {
  id: string;
  instanceId: string | null;
  stepId: string | null;
  triggerAt: string;
  status: TimerStatus;
  action: Record<string, any>;
  createdAt: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string | null;
  category: RuleCategory;
  domain: string;
  priority: number;
  conditions: string;
  actions: string;
  elseActions: string | null;
  status: RuleStatus;
  version: number;
  effectivityStart: string | null;
  effectivityEnd: string | null;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleDto {
  name: string;
  description?: string;
  category: RuleCategory;
  domain?: string;
  priority?: number;
  conditions: string;
  actions: string;
  elseActions?: string;
  effectivityStart?: string;
  effectivityEnd?: string;
  tags?: string[];
  createdBy?: string;
}

export interface UpdateRuleDto {
  name?: string;
  description?: string;
  category?: RuleCategory;
  domain?: string;
  priority?: number;
  conditions?: string;
  actions?: string;
  elseActions?: string;
  status?: RuleStatus;
  effectivityStart?: string;
  effectivityEnd?: string;
  tags?: string[];
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  output: Record<string, any>;
  executionTimeMs: number;
}

export interface ApprovalChain {
  id: string;
  name: string;
  description: string | null;
  category: ApprovalCategory;
  levels: number;
  timeoutHours: number;
  autoApprove: boolean;
  autoReject: boolean;
  requireAll: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChainDto {
  name: string;
  description?: string;
  category: ApprovalCategory;
  levels?: number;
  timeoutHours?: number;
  autoApprove?: boolean;
  autoReject?: boolean;
  requireAll?: boolean;
}

export interface ApprovalChainLevel {
  id: string;
  chainId: string;
  level: number;
  role: string;
  approverType: ApproverType;
  approvalType: ApprovalType;
  timeoutHours: number;
  escalationTo: number | null;
  canDelegate: boolean;
}

export interface CreateChainLevelDto {
  chainId: string;
  level: number;
  role: string;
  approverType: ApproverType;
  approvalType?: ApprovalType;
  timeoutHours?: number;
  escalationTo?: number;
  canDelegate?: boolean;
}

export interface ApprovalRequest {
  id: string;
  instanceId: string | null;
  stepId: string | null;
  chainId: string;
  chainVersion: number;
  context: Record<string, any>;
  status: ApprovalStatus;
  requestedBy: string;
  requestedFrom: string | null;
  requestedAt: string;
  completedAt: string | null;
  comments: string | null;
  priority: number;
  expiresAt: string | null;
}

export interface CreateApprovalRequestDto {
  chainId: string;
  instanceId?: string;
  stepId?: string;
  context?: Record<string, any>;
  requestedBy: string;
  requestedFrom?: string;
  priority?: number;
  expiresAt?: string;
}

export interface ApprovalAssignment {
  id: string;
  requestId: string;
  level: number;
  assignedTo: string;
  status: AssignmentStatus;
  comments: string | null;
  assignedAt: string;
  completedAt: string | null;
  delegatedTo: string | null;
}

export interface Notification {
  id: string;
  userId: string | null;
  role: string | null;
  type: NotifType;
  category: NotifCategory;
  title: string;
  body: string | null;
  data: Record<string, any>;
  channel: string;
  isRead: boolean;
  isArchived: boolean;
  sentAt: string;
  readAt: string | null;
  deliveredAt: string | null;
  source: string | null;
  sourceId: string | null;
}

export interface CreateNotificationDto {
  userId?: string;
  role?: string;
  type?: NotifType;
  category: NotifCategory;
  title: string;
  body?: string;
  data?: Record<string, any>;
  channel?: string;
  source?: string;
  sourceId?: string;
}

export interface NotificationChannel {
  id: string;
  userId: string;
  channel: NotifChannel;
  enabled: boolean;
  config: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  channel: string;
  template: string;
  variables: string[];
  createdAt: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  description: string | null;
  workflowId: string | null;
  workflowInput: Record<string, any>;
  cronExpr: string | null;
  intervalSeconds: number | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string;
  businessCalendarOnly: boolean;
  maxRetries: number;
  maxInstances: number;
  status: JobStatus;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobDto {
  name: string;
  description?: string;
  workflowId?: string;
  workflowInput?: Record<string, any>;
  cronExpr?: string;
  intervalSeconds?: number;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  businessCalendarOnly?: boolean;
  maxRetries?: number;
  maxInstances?: number;
  createdBy?: string;
}

export interface ScheduledJobInstance {
  id: string;
  jobId: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: JobInstanceStatus;
  errorMessage: string | null;
  retryCount: number;
  workflowInstanceId: string | null;
  output: string | null;
}

export interface WorkflowAuditEntry {
  id: string;
  instanceId: string | null;
  workflowId: string | null;
  action: string;
  actor: string;
  details: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
}

export interface BusinessCalendarEntry {
  id: string;
  date: string;
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName: string | null;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  isBusinessDay: boolean;
}

// ── Retry Policy ────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 60000,
  retryableErrors: ['timeout', 'network', 'database'],
};

// ── Domain event types for event automation ─────────────────────────────

export const WORKFLOW_EVENTS: Record<string, string[]> = {
  SaleCompleted: ['sale'],
  PurchaseReceived: ['purchasing'],
  ReservationCreated: ['rooms'],
  CheckInCompleted: ['rooms'],
  CheckOutCompleted: ['rooms'],
  PayrollProcessed: ['hr'],
  InventoryAdjusted: ['inventory'],
  EmployeeClockIn: ['hr'],
  BottleOpened: ['liquor'],
  ShiftClosed: ['general'],
  DayClosed: ['accounting'],
  MonthClosed: ['accounting'],
  InvoiceGenerated: ['accounting'],
  PaymentReceived: ['sales'],
  GoodsReceived: ['purchasing'],
  LeaveApproved: ['hr'],
  AdvanceApproved: ['hr'],
  KOTCreated: ['restaurant'],
  OrderCompleted: ['restaurant'],
  NightAuditCompleted: ['rooms'],
  SyncCompleted: ['sync'],
};

export type EventAction =
  'start_workflow' | 'send_notification' | 'evaluate_rules';

export interface EventRuleMapping {
  eventType: string;
  workflowId: string;
  action: EventAction;
  condition?: string;
  priority?: number;
}

// ── Cross-domain automation pipelines ──────────────────────────────────

export interface AutomationPipeline {
  id: string;
  fromDomain: string;
  toDomain: string;
  eventType: string;
  workflowId: string;
  enabled: boolean;
  description: string;
}

export const DEFAULT_PIPELINES: AutomationPipeline[] = [
  {
    id: 'pipe-001',
    fromDomain: 'purchasing',
    toDomain: 'inventory',
    eventType: 'PurchaseReceived',
    workflowId: '',
    enabled: true,
    description: 'Purchase → Inventory: auto-update stock on goods receipt',
  },
  {
    id: 'pipe-002',
    fromDomain: 'inventory',
    toDomain: 'analytics',
    eventType: 'InventoryAdjusted',
    workflowId: '',
    enabled: true,
    description: 'Inventory → Analytics: trigger KPI recalculation',
  },
  {
    id: 'pipe-003',
    fromDomain: 'restaurant',
    toDomain: 'inventory',
    eventType: 'OrderCompleted',
    workflowId: '',
    enabled: true,
    description: 'Restaurant → Inventory: consume recipe ingredients',
  },
  {
    id: 'pipe-004',
    fromDomain: 'restaurant',
    toDomain: 'accounting',
    eventType: 'SaleCompleted',
    workflowId: '',
    enabled: true,
    description: 'Restaurant → Accounting: post sales journal entry',
  },
  {
    id: 'pipe-005',
    fromDomain: 'bar',
    toDomain: 'excise',
    eventType: 'BottleOpened',
    workflowId: '',
    enabled: true,
    description: 'Bar → Excise: log bottle opening for compliance',
  },
  {
    id: 'pipe-006',
    fromDomain: 'bar',
    toDomain: 'inventory',
    eventType: 'SaleCompleted',
    workflowId: '',
    enabled: true,
    description: 'Bar → Inventory: reduce liquor stock',
  },
  {
    id: 'pipe-007',
    fromDomain: 'hr',
    toDomain: 'accounting',
    eventType: 'PayrollProcessed',
    workflowId: '',
    enabled: true,
    description: 'Payroll → Accounting: post salary journal',
  },
  {
    id: 'pipe-008',
    fromDomain: 'hr',
    toDomain: 'analytics',
    eventType: 'PayrollProcessed',
    workflowId: '',
    enabled: true,
    description: 'Payroll → Analytics: update labor KPIs',
  },
  {
    id: 'pipe-009',
    fromDomain: 'hotel',
    toDomain: 'accounting',
    eventType: 'CheckOutCompleted',
    workflowId: '',
    enabled: true,
    description: 'Hotel → Accounting: post folio to ledger',
  },
  {
    id: 'pipe-010',
    fromDomain: 'hotel',
    toDomain: 'housekeeping',
    eventType: 'CheckOutCompleted',
    workflowId: '',
    enabled: true,
    description: 'Hotel → Housekeeping: trigger room cleaning',
  },
  {
    id: 'pipe-011',
    fromDomain: 'rooms',
    toDomain: 'reminder',
    eventType: 'ReservationCreated',
    workflowId: '',
    enabled: true,
    description: 'Reservation → Reminder: schedule check-in reminder',
  },
  {
    id: 'pipe-012',
    fromDomain: 'employee',
    toDomain: 'hr',
    eventType: 'EmployeeClockIn',
    workflowId: '',
    enabled: true,
    description: 'Employee → HR: record attendance',
  },
  {
    id: 'pipe-013',
    fromDomain: 'attendance',
    toDomain: 'payroll',
    eventType: 'ShiftClosed',
    workflowId: '',
    enabled: true,
    description: 'Attendance → Payroll: calculate overtime',
  },
  {
    id: 'pipe-014',
    fromDomain: 'accounting',
    toDomain: 'analytics',
    eventType: 'DayClosed',
    workflowId: '',
    enabled: true,
    description: 'Accounting → Analytics: refresh financial dashboards',
  },
  {
    id: 'pipe-015',
    fromDomain: 'sync',
    toDomain: 'audit',
    eventType: 'SyncCompleted',
    workflowId: '',
    enabled: true,
    description: 'Sync → Audit: log sync completion',
  },
];

export interface ExpressionContext {
  variables: Record<string, any>;
  instance: WorkflowInstance | null;
  step: WorkflowInstanceStep | null;
  user?: { id: string; name: string; role: string };
  now: string;
  domain?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  category?: string;
  domain?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}
