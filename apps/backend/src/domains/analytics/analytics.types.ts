export type KpiCategory =
  | 'revenue'
  | 'occupancy'
  | 'restaurant'
  | 'bar'
  | 'inventory'
  | 'purchasing'
  | 'finance'
  | 'gst'
  | 'excise'
  | 'hotel'
  | 'employee';

export type DashboardRole =
  | 'owner'
  | 'manager'
  | 'accountant'
  | 'restaurant'
  | 'bar'
  | 'hotel'
  | 'inventory'
  | 'purchasing'
  | 'finance';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ComparisonType =
  'period_over_period' | 'year_over_year' | 'budget_vs_actual';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export type AnalyticsEventType =
  | 'daily_snapshot'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'yearly_summary'
  | 'threshold_alert'
  | 'trend_detection'
  | 'anomaly_detection';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface KpiDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: KpiCategory;
  formula: string;
  unit: string;
  decimalPlaces: number;
  isPercentage: boolean;
  higherIsBetter: boolean;
  minRefreshInterval: number;
  roles: DashboardRole[];
}

export interface KpiValue {
  kpiKey: string;
  value: number;
  previousValue: number | null;
  change: number | null;
  changePercent: number | null;
  trend: TrendDirection;
  timestamp: string;
}

export interface DashboardConfig {
  id: string;
  role: DashboardRole;
  name: string;
  description: string;
  sections: DashboardSection[];
  refreshInterval: number;
}

export interface DashboardSection {
  id: string;
  title: string;
  type: 'kpi_grid' | 'chart' | 'table' | 'trend';
  kpiKeys: string[];
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area';
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
}

export interface DailySummary {
  date: string;
  totalRevenue: number;
  roomRevenue: number;
  restaurantRevenue: number;
  barRevenue: number;
  otherRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  occupancyRate: number;
  restaurantCovers: number;
  averageBill: number;
  barSales: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  payables: number;
  gstPayable: number;
  gstInputCredit: number;
  inventoryValue: number;
  createdAt: string;
}

export interface WeeklySummary extends DailySummary {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  monthName: string;
  totalRevenue: number;
  roomRevenue: number;
  restaurantRevenue: number;
  barRevenue: number;
  otherRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  restaurantCovers: number;
  averageBill: number;
  barSales: number;
  inventoryTurnover: number;
  gstPayable: number;
  gstInputCredit: number;
  cashFlow: number;
  receivables: number;
  payables: number;
  cashPosition: number;
  bankPosition: number;
  wastePercent: number;
  complimentaryPercent: number;
  cancellationPercent: number;
  refundPercent: number;
  departmentProfits: DepartmentProfit[];
  createdAt: string;
}

export interface YearlySummary extends MonthlySummary {
  year: number;
  monthlyBreakdown: MonthlySummary[];
}

export interface DepartmentProfit {
  department: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
}

export interface InventoryAnalytics {
  fastMovingItems: InventoryMovementItem[];
  slowMovingItems: InventoryMovementItem[];
  deadStock: InventoryMovementItem[];
  reorderAlerts: ReorderAlert[];
  stockAgeing: StockAgeing[];
  inventoryValuation: number;
  shrinkage: number;
  shrinkagePercent: number;
  varianceCount: number;
  consumptionTrends: ConsumptionTrend[];
}

export interface InventoryMovementItem {
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  turnoverDays: number;
  movementCount: number;
  lastMovement: string;
}

export interface ReorderAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  supplierId: string | null;
  supplierName: string | null;
}

export interface StockAgeing {
  itemId: string;
  itemName: string;
  batch: string | null;
  daysInStock: number;
  quantity: number;
  value: number;
  category: string;
}

export interface ConsumptionTrend {
  month: string;
  category: string;
  quantity: number;
  value: number;
  change: number;
}

export interface HospitalityAnalytics {
  roomOccupancy: number;
  lengthOfStay: number;
  bookingSources: BookingSource[];
  tableTurnover: number;
  kitchenPerformance: KitchenPerformance[];
  bartenderProductivity: BartenderProductivity[];
  popularBrands: PopularItem[];
  popularMenuItems: PopularItem[];
  peakHours: PeakHour[];
  seasonality: SeasonalityTrend[];
}

export interface BookingSource {
  source: string;
  count: number;
  percentage: number;
  revenue: number;
}

export interface KitchenPerformance {
  station: string;
  ordersPrepared: number;
  averageTime: number;
  refireCount: number;
  efficiency: number;
}

export interface BartenderProductivity {
  bartenderId: string;
  bartenderName: string;
  pours: number;
  revenue: number;
  averagePourSize: number;
}

export interface PopularItem {
  id: string;
  name: string;
  category: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PeakHour {
  hour: number;
  dayOfWeek: number;
  transactionCount: number;
  revenue: number;
}

export interface SeasonalityTrend {
  month: string;
  year: number;
  metric: string;
  value: number;
  average: number;
  deviation: number;
}

export interface FinancialAnalytics {
  profit: number;
  grossMargin: number;
  netMargin: number;
  cashFlow: number;
  gstLiability: number;
  inputCredit: number;
  bankPosition: number;
  receivables: number;
  payables: number;
  departmentProfitability: DepartmentProfit[];
}

export interface OperationalKpi {
  dailyRevenue: number;
  departmentRevenue: DepartmentRevenue[];
  occupancy: number;
  adr: number;
  revpar: number;
  restaurantCovers: number;
  averageBill: number;
  barSales: number;
  inventoryTurnover: number;
  purchaseEfficiency: number;
  supplierPerformance: SupplierPerformance[];
  wastePercent: number;
  complimentaryPercent: number;
  cancellationPercent: number;
  refundPercent: number;
  outstandingPayments: number;
  cashPosition: number;
}

export interface DepartmentRevenue {
  department: string;
  today: number;
  week: number;
  month: number;
  year: number;
  change: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  onTimeDeliveries: number;
  onTimeRate: number;
  qualityRating: number;
  returnRate: number;
}

export interface AnalyticsFilter {
  fromDate?: string;
  toDate?: string;
  granularity?: TimeGranularity;
  departments?: string[];
  comparison?: ComparisonType;
  exportFormat?: ExportFormat;
}

export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  period: string;
  data: Record<string, number>;
  generatedAt: string;
  thresholdBreaches: ThresholdBreach[];
}

export interface ThresholdBreach {
  kpiKey: string;
  kpiName: string;
  currentValue: number;
  thresholdValue: number;
  direction: 'above' | 'below';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrendAnalysis {
  kpiKey: string;
  kpiName: string;
  values: number[];
  timestamps: string[];
  direction: TrendDirection;
  changePercent: number;
  volatility: number;
  forecast: number | null;
}

export interface AnomalyDetection {
  kpiKey: string;
  kpiName: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface AnalyticsCache {
  id: string;
  cacheKey: string;
  data: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export const VALID_KPI_CATEGORIES: KpiCategory[] = [
  'revenue',
  'occupancy',
  'restaurant',
  'bar',
  'inventory',
  'purchasing',
  'finance',
  'gst',
  'excise',
  'hotel',
  'employee',
];

export const VALID_DASHBOARD_ROLES: DashboardRole[] = [
  'owner',
  'manager',
  'accountant',
  'restaurant',
  'bar',
  'hotel',
  'inventory',
  'purchasing',
  'finance',
];

export const VALID_TIME_GRANULARITIES: TimeGranularity[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

export const VALID_EXPORT_FORMATS: ExportFormat[] = ['csv', 'excel', 'pdf'];

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
