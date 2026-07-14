// ── AI Gateway ────────────────────────────────────────────────────────

export type AiModelType = 'rule-based' | 'openai' | 'anthropic' | 'local';

export interface AiRequest {
  text: string;
  userId: string;
  role: string;
  conversationId?: string;
  context?: Record<string, any>;
}

export interface AiResponse {
  answer: string;
  conversationId?: string;
  citations: Citation[];
  confidence: number;
  requiresApproval: boolean;
  suggestedActions: SuggestionAction[];
  modelUsed: AiModelType;
  processingTimeMs: number;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: AiToolCall[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: AiMessage[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredRoles: string[];
  requiresApproval: boolean;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
}

// ── Business Knowledge Graph ──────────────────────────────────────────

export type BusinessDomain =
  | 'revenue'
  | 'rooms'
  | 'restaurant'
  | 'bar'
  | 'inventory'
  | 'purchasing'
  | 'payroll'
  | 'attendance'
  | 'cash'
  | 'accounting'
  | 'gst'
  | 'excise'
  | 'liquor'
  | 'supplier'
  | 'workflow'
  | 'sync'
  | 'hr';

export interface DomainContext {
  domain: BusinessDomain;
  summary: string;
  metrics: Record<string, number>;
  timestamp: string;
}

export interface ContextQuery {
  domains: BusinessDomain[];
  filters?: Record<string, any>;
  timeRange?: { from: string; to: string };
}

export interface BusinessGraphNode {
  domain: BusinessDomain;
  label: string;
  metrics: string[];
  connections: BusinessDomain[];
}

export interface BusinessGraphEdge {
  source: BusinessDomain;
  target: BusinessDomain;
  relationship: string;
}

export interface BusinessGraph {
  nodes: BusinessGraphNode[];
  edges: BusinessGraphEdge[];
}

export interface ContextResponse {
  contexts: DomainContext[];
  graph: BusinessGraph;
  generatedAt: string;
}

// ── Prompt Library ────────────────────────────────────────────────────

export type PromptIntent =
  'query' | 'forecast' | 'anomaly' | 'recommend' | 'explain' | 'chat';

export interface PromptTemplate {
  id: string;
  name: string;
  intent: PromptIntent;
  template: string;
  variables: string[];
  domain: BusinessDomain[];
  roles: string[];
  version: number;
}

export interface PromptRequest {
  templateId: string;
  variables: Record<string, any>;
  context?: Record<string, any>;
  userId: string;
}

// ── Executive Copilot ─────────────────────────────────────────────────

export interface CopilotQuery {
  text: string;
  domains?: BusinessDomain[];
  timeRange?: { from: string; to: string };
  userId: string;
  role: string;
}

export interface CopilotResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  requiresApproval: boolean;
  suggestedActions: SuggestionAction[];
  generatedAt: string;
}

export interface Citation {
  source: string;
  domain: BusinessDomain;
  metric: string;
  value: number;
  timestamp: string;
  query?: string;
}

// ── Forecasting ───────────────────────────────────────────────────────

export type ForecastMethod = 'sma' | 'linear' | 'exponential';

export interface ForecastRequest {
  domain: BusinessDomain;
  metric: string;
  periods: number;
  method: ForecastMethod;
}

export interface ForecastPeriod {
  index: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  actual?: number;
}

export interface ForecastResponse {
  metric: string;
  domain: BusinessDomain;
  periods: ForecastPeriod[];
  method: ForecastMethod;
  confidence: { lower: number; upper: number; interval: number };
  assumptions: string[];
}

// ── Anomaly Detection ─────────────────────────────────────────────────

export interface AnomalyRequest {
  domains: AnomalyCategory[];
  timeRange: { from: string; to: string };
  sensitivity: 1 | 2 | 3 | 4 | 5;
}

export interface Anomaly {
  id: string;
  domain: BusinessDomain | AnomalyCategory;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  timestamp: string;
  source: string;
}

export type AnomalyCategory =
  | 'inventory'
  | 'bottle_loss'
  | 'discount'
  | 'payroll'
  | 'attendance'
  | 'supplier'
  | 'cash'
  | 'accounting'
  | 'workflow'
  | 'sync';

export interface AnomalyResponse {
  anomalies: Anomaly[];
  summary: string;
}

// ── Recommendations ───────────────────────────────────────────────────

export interface RecommendationRequest {
  domain: BusinessDomain;
  focus?: string;
  limit?: number;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  generatedAt: string;
}

export interface Recommendation {
  id: string;
  domain: BusinessDomain;
  category: string;
  title: string;
  description: string;
  rationale: string;
  expectedBenefit: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  type: string;
  params: Record<string, any>;
  description: string;
}

// ── NLP / Natural Language ────────────────────────────────────────────

export type NlpIntent =
  | 'revenue_query'
  | 'profit_query'
  | 'stock_query'
  | 'occupancy_query'
  | 'payroll_query'
  | 'cash_flow_query'
  | 'supplier_query'
  | 'approval_query'
  | 'general_query'
  | 'unknown';

export interface NlpQuery {
  text: string;
  userId: string;
  role: string;
  context?: Record<string, any>;
}

export interface NlpResult {
  intent: NlpIntent;
  entities: NlpEntity[];
  confidence: number;
  mappedQuery: string;
  sql?: string;
  explanation: string;
}

export interface NlpEntity {
  type: string;
  value: string;
  confidence: number;
}

// ── Safety ────────────────────────────────────────────────────────────

export type SafetyCheckType =
  'prompt_injection' | 'rbac' | 'tool_permission' | 'destructive_action';

export interface SafetyCheck {
  type: SafetyCheckType;
  passed: boolean;
  reason: string;
}

export interface SafetyResult {
  checks: SafetyCheck[];
  passed: boolean;
  blockedReason?: string;
  requiresConfirmation: boolean;
}

// ── AI Audit Log ─────────────────────────────────────────────────────

export interface AiAuditEntry {
  id: string;
  userId: string;
  action: string;
  model: AiModelType;
  prompt: string;
  response: string;
  tokens: number;
  duration: number;
  safetyChecks: SafetyCheck[];
  createdAt: string;
}

// ── Validators ────────────────────────────────────────────────────────

export const VALID_AI_MODELS: AiModelType[] = [
  'rule-based',
  'openai',
  'anthropic',
  'local',
];

export const VALID_DOMAINS: BusinessDomain[] = [
  'revenue',
  'rooms',
  'restaurant',
  'bar',
  'inventory',
  'purchasing',
  'payroll',
  'attendance',
  'cash',
  'accounting',
  'gst',
  'excise',
  'liquor',
  'supplier',
  'workflow',
  'sync',
  'hr',
];

export const VALID_INTENTS: PromptIntent[] = [
  'query',
  'forecast',
  'anomaly',
  'recommend',
  'explain',
  'chat',
];

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
