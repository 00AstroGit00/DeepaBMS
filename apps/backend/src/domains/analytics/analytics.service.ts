import * as R from './analytics.repository';
import * as T from './analytics.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const safeDivide = (a: number, b: number): number => (b === 0 ? 0 : a / b);

const parseDateParam = (date?: string): string =>
  date || new Date().toISOString().split('T')[0];

const parseFilterDates = (
  filter?: T.AnalyticsFilter,
): { fromDate: string; toDate: string } => {
  const to = filter?.toDate || new Date().toISOString().split('T')[0];
  const from =
    filter?.fromDate ||
    new Date(new Date(to).getTime() - 30 * 86400000)
      .toISOString()
      .split('T')[0];
  return { fromDate: from, toDate: to };
};

const computeTrend = (
  current: number,
  previous: number | null,
): {
  change: number | null;
  changePercent: number | null;
  trend: T.TrendDirection;
} => {
  if (previous === null || previous === 0)
    return { change: null, changePercent: null, trend: 'stable' };
  const change = current - previous;
  const changePercent = (change / previous) * 100;
  const trend: T.TrendDirection =
    change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
  return { change, changePercent, trend };
};

const getCachedOrCompute = async <T>(
  cacheKey: string,
  computeFn: () => Promise<T>,
  ttlSeconds: number = 300,
): Promise<T> => {
  try {
    const cached = await R.AnalyticsRepository.getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached.data) as T;
    }
  } catch {
    // cache miss or parse error – proceed to compute
  }
  const data = await computeFn();
  try {
    await R.AnalyticsRepository.setCache(
      cacheKey,
      JSON.stringify(data),
      ttlSeconds,
    );
  } catch {
    // cache write failure is non-fatal
  }
  return data;
};

// ── 1. DashboardService ─────────────────────────────────────────────────────

export const DashboardService = {
  async getDashboardByRole(
    role: T.DashboardRole,
  ): Promise<T.DashboardConfig | null> {
    return R.AnalyticsRepository.findDashboardByRole(role);
  },

  async getDashboardKpiValues(
    role: T.DashboardRole,
    filter?: T.AnalyticsFilter,
  ): Promise<T.KpiValue[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const kpis = await R.AnalyticsRepository.findAllKpis(undefined, role);
    const results: T.KpiValue[] = [];
    for (const kpi of kpis) {
      let value = 0;
      let previousValue: number | null = null;
      try {
        value = await this.resolveKpiValue(kpi.key, fromDate, toDate);
        previousValue = await this.resolveKpiValue(
          kpi.key,
          new Date(new Date(fromDate).getTime() - 30 * 86400000)
            .toISOString()
            .split('T')[0],
          new Date(new Date(fromDate).getTime() - 1)
            .toISOString()
            .split('T')[0],
        );
      } catch {
        value = 0;
      }
      const trend = computeTrend(value, previousValue);
      results.push({
        kpiKey: kpi.key,
        value: round2(value),
        previousValue: previousValue !== null ? round2(previousValue) : null,
        change: trend.change !== null ? round2(trend.change) : null,
        changePercent:
          trend.changePercent !== null ? round2(trend.changePercent) : null,
        trend: trend.trend,
        timestamp: new Date().toISOString(),
      });
    }
    return results;
  },

  async resolveKpiValue(
    key: string,
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    const cacheKey = `kpi:${key}:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        switch (key) {
          case 'daily_revenue':
            return await OperationalKpiService.getDailyRevenue(fromDate);
          case 'occupancy':
            return await OperationalKpiService.getOccupancyAdrRevpar({
              fromDate,
              toDate,
            }).then((r) => r.occupancy);
          case 'restaurant_covers':
            return R.AnalyticsRepository.getRestaurantCovers(toDate);
          case 'bar_sales':
            return R.AnalyticsRepository.getBarSales(toDate);
          case 'inventory_turnover':
            return await OperationalKpiService.getInventoryTurnover({
              fromDate,
              toDate,
            });
          case 'cash_position':
            return await OperationalKpiService.getCashPosition({
              fromDate,
              toDate,
            });
          case 'gst_liability':
            return await FinancialKpiService.getGstLiability({
              fromDate,
              toDate,
            });
          case 'gross_margin':
            return await FinancialKpiService.getGrossMargin({
              fromDate,
              toDate,
            });
          case 'net_margin':
            return await FinancialKpiService.getNetMargin({ fromDate, toDate });
          case 'revpar':
            return await OperationalKpiService.getOccupancyAdrRevpar({
              fromDate,
              toDate,
            }).then((r) => r.revpar);
          case 'adr':
            return await OperationalKpiService.getOccupancyAdrRevpar({
              fromDate,
              toDate,
            }).then((r) => r.adr);
          default:
            return 0;
        }
      },
      120,
    );
  },

  async getExecutiveDashboard(filter?: T.AnalyticsFilter): Promise<{
    kpis: T.OperationalKpi;
    financial: T.FinancialAnalytics;
    trends: T.TrendAnalysis[];
  }> {
    const kpis = await OperationalKpiService.getOperationalKpis(filter || {});
    const financial = await FinancialKpiService.getFinancialAnalytics(
      filter || {},
    );
    const trends = await TrendAnalysisService.getTrendAnalysis(
      'daily_revenue',
      filter?.granularity || 'daily',
      7,
    );
    return { kpis, financial, trends: [trends] };
  },

  async getOwnerDashboard(filter?: T.AnalyticsFilter): Promise<{
    revenue: number;
    profit: number;
    occupancy: number;
    cashFlow: number;
    gstLiability: number;
    departmentProfits: T.DepartmentProfit[];
    monthlyTrend: number[];
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const [revenue, profit, occupancy, cashFlow, gstLiability] =
      await Promise.all([
        R.AnalyticsRepository.getJournalRevenueByType(fromDate, toDate).then(
          (r) => Object.values(r).reduce((a, b) => a + b, 0),
        ),
        FinancialKpiService.getProfitAndLoss({ fromDate, toDate }).then(
          (r) => r.profit,
        ),
        R.AnalyticsRepository.getOccupancyRate(toDate),
        FinancialKpiService.getCashFlow({ fromDate, toDate }),
        FinancialKpiService.getGstLiability({ fromDate, toDate }),
      ]);
    const deptProfits = await FinancialKpiService.getDepartmentProfitability({
      fromDate,
      toDate,
    });
    return {
      revenue,
      profit,
      occupancy,
      cashFlow,
      gstLiability,
      departmentProfits: deptProfits,
      monthlyTrend: [],
    };
  },

  async getManagerDashboard(filter?: T.AnalyticsFilter): Promise<{
    dailyRevenue: number;
    expenses: number;
    covers: number;
    occupancy: number;
    deptRevenue: T.DepartmentRevenue[];
    alerts: string[];
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const [dailyRevenue, expenses, covers, occupancy, deptRevenue] =
      await Promise.all([
        OperationalKpiService.getDailyRevenue(toDate),
        R.AnalyticsRepository.getJournalExpenses(fromDate, toDate),
        R.AnalyticsRepository.getRestaurantCovers(toDate),
        R.AnalyticsRepository.getOccupancyRate(toDate),
        OperationalKpiService.getDepartmentRevenue({ fromDate, toDate }),
      ]);
    return {
      dailyRevenue,
      expenses,
      covers,
      occupancy,
      deptRevenue,
      alerts: [],
    };
  },

  async getAccountantDashboard(filter?: T.AnalyticsFilter): Promise<{
    revenue: number;
    expenses: number;
    profit: number;
    cashBalance: number;
    bankBalance: number;
    receivables: number;
    payables: number;
    gstPayable: number;
    gstInputCredit: number;
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const revenues = await R.AnalyticsRepository.getJournalRevenueByType(
      fromDate,
      toDate,
    );
    const totalRevenue = Object.values(revenues).reduce((a, b) => a + b, 0);
    const expenses = await R.AnalyticsRepository.getJournalExpenses(
      fromDate,
      toDate,
    );
    const gst = await R.AnalyticsRepository.getGstSummary(fromDate, toDate);
    const [cashBalance, bankBalance, receivables, payables] = await Promise.all(
      [
        R.AnalyticsRepository.getAccountBalanceByType('asset').catch(() => 0),
        R.AnalyticsRepository.getAccountBalanceByType('liability').catch(
          () => 0,
        ),
        R.AnalyticsRepository.getAccountBalanceByType('asset').catch(() => 0),
        R.AnalyticsRepository.getAccountBalanceByType('liability').catch(
          () => 0,
        ),
      ],
    );
    return {
      revenue: totalRevenue,
      expenses,
      profit: totalRevenue - expenses,
      cashBalance,
      bankBalance,
      receivables,
      payables,
      gstPayable: gst.output,
      gstInputCredit: gst.input,
    };
  },

  async getRestaurantDashboard(filter?: T.AnalyticsFilter): Promise<{
    covers: number;
    averageBill: number;
    tableTurnover: number;
    kitchenPerformance: T.KitchenPerformance[];
    popularItems: T.PopularItem[];
    peakHours: T.PeakHour[];
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const [covers, revenue, tableTurnover, kitchenPerformance, peakHours] =
      await Promise.all([
        R.AnalyticsRepository.getRestaurantCovers(toDate),
        OperationalKpiService.getDailyRevenue(toDate),
        R.AnalyticsRepository.getTableTurnover(fromDate, toDate),
        R.AnalyticsRepository.getKitchenPerformance(fromDate, toDate),
        R.AnalyticsRepository.getPeakHours(fromDate, toDate),
      ]);
    const averageBill = covers > 0 ? round2(revenue / covers) : 0;
    return {
      covers,
      averageBill,
      tableTurnover,
      kitchenPerformance,
      popularItems: [],
      peakHours,
    };
  },

  async getBarDashboard(filter?: T.AnalyticsFilter): Promise<{
    sales: number;
    bartenderProductivity: T.BartenderProductivity[];
    popularBrands: T.PopularItem[];
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const sales = await R.AnalyticsRepository.getBarSales(toDate);
    return {
      sales,
      bartenderProductivity: [],
      popularBrands: [],
    };
  },

  async getHotelDashboard(filter?: T.AnalyticsFilter): Promise<{
    occupancy: number;
    adr: number;
    revpar: number;
    bookingSources: T.BookingSource[];
    lengthOfStay: number;
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const [occupancy, bookingSources] = await Promise.all([
      R.AnalyticsRepository.getOccupancyRate(toDate),
      R.AnalyticsRepository.getBookingSourceAnalytics(fromDate, toDate),
    ]);
    const { adr, revpar } = await OperationalKpiService.getOccupancyAdrRevpar({
      fromDate,
      toDate,
    });
    const lengthOfStay = await HospitalityAnalyticsService.getLengthOfStay({
      fromDate,
      toDate,
    });
    return { occupancy, adr, revpar, bookingSources, lengthOfStay };
  },

  async getInventoryDashboard(
    filter?: T.AnalyticsFilter,
  ): Promise<T.InventoryAnalytics> {
    const { fromDate, toDate } = parseFilterDates(filter);
    return R.AnalyticsRepository.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
  },

  async getPurchasingDashboard(filter?: T.AnalyticsFilter): Promise<{
    supplierPerformance: T.SupplierPerformance[];
    purchaseEfficiency: number;
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const supplierPerformance =
      await R.AnalyticsRepository.getSupplierPerformance(fromDate, toDate);
    return { supplierPerformance, purchaseEfficiency: 0 };
  },

  async getFinanceDashboard(
    filter?: T.AnalyticsFilter,
  ): Promise<T.FinancialAnalytics> {
    return FinancialKpiService.getFinancialAnalytics(filter || {});
  },
};

// ── 2. OperationalKpiService ────────────────────────────────────────────────

export const OperationalKpiService = {
  async getOperationalKpis(
    filter: T.AnalyticsFilter,
  ): Promise<T.OperationalKpi> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `operational_kpis:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.OperationalKpi>(
      cacheKey,
      async () => {
        const [
          dailyRevenue,
          departmentRevenue,
          { occupancy, adr, revpar },
          covers,
          averageBill,
          barSales,
          inventoryTurnover,
          cashPosition,
          supplierPerformance,
        ] = await Promise.all([
          this.getDailyRevenue(toDate),
          this.getDepartmentRevenue({ fromDate, toDate }),
          this.getOccupancyAdrRevpar({ fromDate, toDate }),
          R.AnalyticsRepository.getRestaurantCovers(toDate),
          this.getDailyRevenue(toDate).then((r) =>
            R.AnalyticsRepository.getRestaurantCovers(toDate).then((c) =>
              c > 0 ? round2(r / c) : 0,
            ),
          ),
          R.AnalyticsRepository.getBarSales(toDate),
          this.getInventoryTurnover({ fromDate, toDate }),
          this.getCashPosition({ fromDate, toDate }),
          R.AnalyticsRepository.getSupplierPerformance(fromDate, toDate),
        ]);
        return {
          dailyRevenue,
          departmentRevenue,
          occupancy,
          adr,
          revpar,
          restaurantCovers: covers,
          averageBill,
          barSales,
          inventoryTurnover,
          purchaseEfficiency: 0,
          supplierPerformance,
          wastePercent: 0,
          complimentaryPercent: 0,
          cancellationPercent: 0,
          refundPercent: 0,
          outstandingPayments: 0,
          cashPosition,
        };
      },
      300,
    );
  },

  async getDailyRevenue(date: string): Promise<number> {
    const d = parseDateParam(date);
    const revenues = await R.AnalyticsRepository.getJournalRevenueByType(d, d);
    return Object.values(revenues).reduce((a, b) => a + b, 0);
  },

  async getDepartmentRevenue(
    filter: T.AnalyticsFilter,
  ): Promise<T.DepartmentRevenue[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `dept_revenue:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.DepartmentRevenue[]>(
      cacheKey,
      async () => {
        const revenues = await R.AnalyticsRepository.getJournalRevenueByType(
          fromDate,
          toDate,
        );
        const total = Object.values(revenues).reduce((a, b) => a + b, 0);
        return Object.entries(revenues).map(([key, val]) => ({
          department: key,
          today: val,
          week: val,
          month: val,
          year: val,
          change: 0,
        }));
      },
      300,
    );
  },

  async getOccupancyAdrRevpar(
    filter: T.AnalyticsFilter,
  ): Promise<{ occupancy: number; adr: number; revpar: number }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `occupancy:${fromDate}:${toDate}`;
    return getCachedOrCompute(
      cacheKey,
      async () => {
        const occupancy = await R.AnalyticsRepository.getOccupancyRate(toDate);
        const roomRev = await R.AnalyticsRepository.getJournalRevenueByType(
          fromDate,
          toDate,
        ).then((r) => r.sales || 0);
        const totalRooms = 30;
        const occupiedRoomNights = round2((occupancy / 100) * totalRooms);
        const adr =
          occupiedRoomNights > 0 ? round2(roomRev / occupiedRoomNights) : 0;
        const revpar = totalRooms > 0 ? round2(roomRev / totalRooms) : 0;
        return { occupancy, adr, revpar };
      },
      300,
    );
  },

  async getRestaurantMetrics(
    filter: T.AnalyticsFilter,
  ): Promise<{ covers: number; averageBill: number }> {
    const d = parseDateParam(filter?.toDate);
    const covers = await R.AnalyticsRepository.getRestaurantCovers(d);
    const rev = await this.getDailyRevenue(d);
    return { covers, averageBill: covers > 0 ? round2(rev / covers) : 0 };
  },

  async getBarSales(filter: T.AnalyticsFilter): Promise<number> {
    const d = parseDateParam(filter?.toDate);
    return R.AnalyticsRepository.getBarSales(d);
  },

  async getInventoryTurnover(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `inv_turnover:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        const analytics =
          await R.AnalyticsRepository.getInventoryMovementAnalytics(
            fromDate,
            toDate,
          );
        const valuation = analytics.inventoryValuation || 1;
        const totalOut = analytics.fastMovingItems.reduce(
          (s, i) => s + i.quantity,
          0,
        );
        return round2(safeDivide(totalOut, valuation));
      },
      300,
    );
  },

  async getCashPosition(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `cash_position:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        const [cash, bank, receivables, payables] = await Promise.all([
          R.AnalyticsRepository.getAccountBalanceByType('asset').catch(() => 0),
          R.AnalyticsRepository.getAccountBalanceByType('liability').catch(
            () => 0,
          ),
          R.AnalyticsRepository.getAccountBalanceByType('asset').catch(() => 0),
          R.AnalyticsRepository.getAccountBalanceByType('liability').catch(
            () => 0,
          ),
        ]);
        return round2(cash + bank + receivables - payables);
      },
      300,
    );
  },
};

// ── 3. FinancialKpiService ──────────────────────────────────────────────────

export const FinancialKpiService = {
  async getFinancialAnalytics(
    filter: T.AnalyticsFilter,
  ): Promise<T.FinancialAnalytics> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `financial_analytics:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.FinancialAnalytics>(
      cacheKey,
      async () => {
        const [
          pnl,
          grossMargin,
          netMargin,
          cashFlow,
          gstLiability,
          inputCredit,
          bankPosition,
          receivablesPayables,
          departmentProfitability,
        ] = await Promise.all([
          this.getProfitAndLoss({ fromDate, toDate }),
          this.getGrossMargin({ fromDate, toDate }),
          this.getNetMargin({ fromDate, toDate }),
          this.getCashFlow({ fromDate, toDate }),
          this.getGstLiability({ fromDate, toDate }),
          this.getInputCredit({ fromDate, toDate }),
          this.getBankPosition({ fromDate, toDate }),
          this.getReceivablesPayables({ fromDate, toDate }),
          this.getDepartmentProfitability({ fromDate, toDate }),
        ]);
        return {
          profit: pnl.profit,
          grossMargin,
          netMargin,
          cashFlow,
          gstLiability,
          inputCredit,
          bankPosition,
          receivables: receivablesPayables.receivables,
          payables: receivablesPayables.payables,
          departmentProfitability,
        };
      },
      300,
    );
  },

  async getProfitAndLoss(
    filter: T.AnalyticsFilter,
  ): Promise<{ revenue: number; expenses: number; profit: number }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `pnl:${fromDate}:${toDate}`;
    return getCachedOrCompute(
      cacheKey,
      async () => {
        const revenues = await R.AnalyticsRepository.getJournalRevenueByType(
          fromDate,
          toDate,
        );
        const revenue = Object.values(revenues).reduce((a, b) => a + b, 0);
        const expenses = await R.AnalyticsRepository.getJournalExpenses(
          fromDate,
          toDate,
        );
        return { revenue, expenses, profit: revenue - expenses };
      },
      300,
    );
  },

  async getGrossMargin(filter: T.AnalyticsFilter): Promise<number> {
    const pnl = await this.getProfitAndLoss(filter);
    return pnl.revenue > 0
      ? round2(safeDivide(pnl.profit, pnl.revenue) * 100)
      : 0;
  },

  async getNetMargin(filter: T.AnalyticsFilter): Promise<number> {
    const pnl = await this.getProfitAndLoss(filter);
    return pnl.revenue > 0
      ? round2(safeDivide(pnl.profit, pnl.revenue) * 100)
      : 0;
  },

  async getCashFlow(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `cashflow:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        const revenues = await R.AnalyticsRepository.getJournalRevenueByType(
          fromDate,
          toDate,
        );
        const expenses = await R.AnalyticsRepository.getJournalExpenses(
          fromDate,
          toDate,
        );
        const revSum = Object.values(revenues).reduce((a, b) => a + b, 0);
        return round2(revSum - expenses);
      },
      300,
    );
  },

  async getGstLiability(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `gst_liability:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        const gst = await R.AnalyticsRepository.getGstSummary(fromDate, toDate);
        return round2(gst.output - gst.input);
      },
      300,
    );
  },

  async getInputCredit(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const gst = await R.AnalyticsRepository.getGstSummary(fromDate, toDate);
    return round2(gst.input);
  },

  async getBankPosition(filter: T.AnalyticsFilter): Promise<number> {
    return R.AnalyticsRepository.getAccountBalanceByType('asset').catch(
      () => 0,
    );
  },

  async getReceivablesPayables(
    filter: T.AnalyticsFilter,
  ): Promise<{ receivables: number; payables: number }> {
    return {
      receivables: await R.AnalyticsRepository.getAccountBalanceByType(
        'asset',
      ).catch(() => 0),
      payables: await R.AnalyticsRepository.getAccountBalanceByType(
        'liability',
      ).catch(() => 0),
    };
  },

  async getDepartmentProfitability(
    filter: T.AnalyticsFilter,
  ): Promise<T.DepartmentProfit[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `dept_profitability:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.DepartmentProfit[]>(
      cacheKey,
      async () => {
        const revenues = await R.AnalyticsRepository.getJournalRevenueByType(
          fromDate,
          toDate,
        );
        return Object.entries(revenues).map(([dept, rev]) => ({
          department: dept,
          revenue: rev,
          cost: 0,
          grossProfit: rev,
          grossMargin: 100,
          expenses: 0,
          netProfit: rev,
          netMargin: 100,
        }));
      },
      300,
    );
  },
};

// ── 4. InventoryAnalyticsService ────────────────────────────────────────────

export const InventoryAnalyticsService = {
  async getInventoryAnalytics(
    filter: T.AnalyticsFilter,
  ): Promise<T.InventoryAnalytics> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `inventory_analytics:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.InventoryAnalytics>(
      cacheKey,
      async () => {
        return R.AnalyticsRepository.getInventoryMovementAnalytics(
          fromDate,
          toDate,
        );
      },
      300,
    );
  },

  async getFastMovingItems(
    filter: T.AnalyticsFilter,
  ): Promise<T.InventoryMovementItem[]> {
    const analytics = await this.getInventoryAnalytics(filter);
    return analytics.fastMovingItems;
  },

  async getSlowMovingItems(
    filter: T.AnalyticsFilter,
  ): Promise<T.InventoryMovementItem[]> {
    const analytics = await this.getInventoryAnalytics(filter);
    return analytics.slowMovingItems;
  },

  async getDeadStock(
    filter: T.AnalyticsFilter,
  ): Promise<T.InventoryMovementItem[]> {
    const analytics = await this.getInventoryAnalytics(filter);
    return analytics.deadStock;
  },

  async getReorderAlerts(): Promise<T.ReorderAlert[]> {
    const today = parseDateParam();
    const monthAgo = new Date(new Date().getTime() - 30 * 86400000)
      .toISOString()
      .split('T')[0];
    const analytics = await R.AnalyticsRepository.getInventoryMovementAnalytics(
      monthAgo,
      today,
    );
    return analytics.reorderAlerts;
  },

  async getStockAgeing(): Promise<T.StockAgeing[]> {
    const today = parseDateParam();
    const monthAgo = new Date(new Date().getTime() - 30 * 86400000)
      .toISOString()
      .split('T')[0];
    const analytics = await R.AnalyticsRepository.getInventoryMovementAnalytics(
      monthAgo,
      today,
    );
    return analytics.stockAgeing;
  },

  async getShrinkage(
    filter: T.AnalyticsFilter,
  ): Promise<{ amount: number; percent: number }> {
    const analytics = await this.getInventoryAnalytics(filter);
    return {
      amount: analytics.shrinkage,
      percent: analytics.shrinkagePercent,
    };
  },

  async getConsumptionTrends(
    filter: T.AnalyticsFilter,
  ): Promise<T.ConsumptionTrend[]> {
    const analytics = await this.getInventoryAnalytics(filter);
    return analytics.consumptionTrends;
  },
};

// ── 5. HospitalityAnalyticsService ──────────────────────────────────────────

export const HospitalityAnalyticsService = {
  async getHospitalityAnalytics(
    filter: T.AnalyticsFilter,
  ): Promise<T.HospitalityAnalytics> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `hospitality:${fromDate}:${toDate}`;
    return getCachedOrCompute<T.HospitalityAnalytics>(
      cacheKey,
      async () => {
        const [
          roomOccupancy,
          lengthOfStay,
          bookingSources,
          tableTurnover,
          kitchenPerformance,
          peakHours,
        ] = await Promise.all([
          this.getRoomOccupancy({ fromDate, toDate }),
          this.getLengthOfStay({ fromDate, toDate }),
          R.AnalyticsRepository.getBookingSourceAnalytics(fromDate, toDate),
          R.AnalyticsRepository.getTableTurnover(fromDate, toDate),
          R.AnalyticsRepository.getKitchenPerformance(fromDate, toDate),
          R.AnalyticsRepository.getPeakHours(fromDate, toDate),
        ]);
        return {
          roomOccupancy,
          lengthOfStay,
          bookingSources,
          tableTurnover,
          kitchenPerformance,
          bartenderProductivity: [],
          popularBrands: [],
          popularMenuItems: [],
          peakHours,
          seasonality: [],
        };
      },
      300,
    );
  },

  async getRoomOccupancy(filter: T.AnalyticsFilter): Promise<number> {
    const d = parseDateParam(filter?.toDate);
    return R.AnalyticsRepository.getOccupancyRate(d);
  },

  async getLengthOfStay(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const cacheKey = `length_of_stay:${fromDate}:${toDate}`;
    return getCachedOrCompute<number>(
      cacheKey,
      async () => {
        const sources = await R.AnalyticsRepository.getBookingSourceAnalytics(
          fromDate,
          toDate,
        );
        const totalNights = sources.reduce(
          (s, src) => s + (src.revenue > 0 ? src.count : 0),
          0,
        );
        const totalBookings = sources.reduce((s, src) => s + src.count, 0);
        return totalBookings > 0
          ? round2(safeDivide(totalNights, totalBookings))
          : 0;
      },
      300,
    );
  },

  async getBookingSources(
    filter: T.AnalyticsFilter,
  ): Promise<T.BookingSource[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    return R.AnalyticsRepository.getBookingSourceAnalytics(fromDate, toDate);
  },

  async getTableTurnover(filter: T.AnalyticsFilter): Promise<number> {
    const { fromDate, toDate } = parseFilterDates(filter);
    return R.AnalyticsRepository.getTableTurnover(fromDate, toDate);
  },

  async getKitchenPerformance(
    filter: T.AnalyticsFilter,
  ): Promise<T.KitchenPerformance[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    return R.AnalyticsRepository.getKitchenPerformance(fromDate, toDate);
  },

  async getBartenderProductivity(
    _filter: T.AnalyticsFilter,
  ): Promise<T.BartenderProductivity[]> {
    return [];
  },

  async getPeakHours(filter: T.AnalyticsFilter): Promise<T.PeakHour[]> {
    const { fromDate, toDate } = parseFilterDates(filter);
    return R.AnalyticsRepository.getPeakHours(fromDate, toDate);
  },
};

// ── 6. AnalyticsEventService ────────────────────────────────────────────────

export const AnalyticsEventService = {
  async generateDailySnapshot(date: string): Promise<T.AnalyticsEvent> {
    const d = parseDateParam(date);
    const summary = await R.AnalyticsRepository.computeAndSaveDailySummary(d);
    const data: Record<string, number> = {
      totalRevenue: summary.totalRevenue,
      roomRevenue: summary.roomRevenue,
      restaurantRevenue: summary.restaurantRevenue,
      barRevenue: summary.barRevenue,
      totalExpenses: summary.totalExpenses,
      grossProfit: summary.grossProfit,
      netProfit: summary.netProfit,
      occupancyRate: summary.occupancyRate,
      restaurantCovers: summary.restaurantCovers,
      barSales: summary.barSales,
    };
    return R.AnalyticsRepository.createAnalyticsEvent({
      eventType: 'daily_snapshot',
      period: d,
      data,
      thresholdBreaches: [],
    });
  },

  async generateWeeklySummary(
    weekStart: string,
    weekEnd: string,
  ): Promise<T.AnalyticsEvent> {
    const summary = await R.AnalyticsRepository.computeAndSaveWeeklySummary(
      weekStart,
      weekEnd,
    );
    const data: Record<string, number> = {
      totalRevenue: summary.totalRevenue,
      roomRevenue: summary.roomRevenue,
      restaurantRevenue: summary.restaurantRevenue,
      barRevenue: summary.barRevenue,
      totalExpenses: summary.totalExpenses,
      grossProfit: summary.grossProfit,
      netProfit: summary.netProfit,
      occupancyRate: summary.occupancyRate,
      restaurantCovers: summary.restaurantCovers,
      barSales: summary.barSales,
    };
    return R.AnalyticsRepository.createAnalyticsEvent({
      eventType: 'weekly_summary',
      period: `${weekStart}_${weekEnd}`,
      data,
      thresholdBreaches: [],
    });
  },

  async generateMonthlySummary(
    year: number,
    month: number,
  ): Promise<T.AnalyticsEvent> {
    const summary = await R.AnalyticsRepository.computeAndSaveMonthlySummary(
      year,
      month,
    );
    const data: Record<string, number> = {
      totalRevenue: summary.totalRevenue,
      roomRevenue: summary.roomRevenue,
      restaurantRevenue: summary.restaurantRevenue,
      barRevenue: summary.barRevenue,
      grossProfit: summary.grossProfit,
      netProfit: summary.netProfit,
      occupancyRate: summary.occupancyRate,
      adr: summary.adr,
      revpar: summary.revpar,
      grossMargin: summary.grossMargin,
      netMargin: summary.netMargin,
    };
    return R.AnalyticsRepository.createAnalyticsEvent({
      eventType: 'monthly_summary',
      period: `${year}-${String(month).padStart(2, '0')}`,
      data,
      thresholdBreaches: [],
    });
  },

  async generateYearlySummary(year: number): Promise<T.AnalyticsEvent> {
    const summary =
      await R.AnalyticsRepository.computeAndSaveYearlySummary(year);
    const data: Record<string, number> = {
      totalRevenue: summary.totalRevenue,
      roomRevenue: summary.roomRevenue,
      restaurantRevenue: summary.restaurantRevenue,
      barRevenue: summary.barRevenue,
      grossProfit: summary.grossProfit,
      netProfit: summary.netProfit,
      occupancyRate: summary.occupancyRate,
      adr: summary.adr,
      revpar: summary.revpar,
      grossMargin: summary.grossMargin,
      netMargin: summary.netMargin,
    };
    return R.AnalyticsRepository.createAnalyticsEvent({
      eventType: 'yearly_summary',
      period: String(year),
      data,
      thresholdBreaches: [],
    });
  },

  async generateThresholdAlerts(
    filter?: T.AnalyticsFilter,
  ): Promise<T.AnalyticsEvent> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const kpis = await OperationalKpiService.getOperationalKpis({
      fromDate,
      toDate,
    });
    const breaches: T.ThresholdBreach[] = [];
    if (kpis.occupancy < 30) {
      breaches.push({
        kpiKey: 'occupancy',
        kpiName: 'Occupancy Rate',
        currentValue: kpis.occupancy,
        thresholdValue: 30,
        direction: 'below',
        severity: 'high',
      });
    }
    if (kpis.dailyRevenue < 1000) {
      breaches.push({
        kpiKey: 'daily_revenue',
        kpiName: 'Daily Revenue',
        currentValue: kpis.dailyRevenue,
        thresholdValue: 1000,
        direction: 'below',
        severity: 'medium',
      });
    }
    return R.AnalyticsRepository.createAnalyticsEvent({
      eventType: 'threshold_alert',
      period: `${fromDate}_${toDate}`,
      data: { revenue: kpis.dailyRevenue, occupancy: kpis.occupancy },
      thresholdBreaches: breaches,
    });
  },
};

// ── 7. TrendAnalysisService ─────────────────────────────────────────────────

export const TrendAnalysisService = {
  async getTrendAnalysis(
    kpiKey: string,
    granularity: T.TimeGranularity,
    periods: number,
  ): Promise<T.TrendAnalysis> {
    const cacheKey = `trend:${kpiKey}:${granularity}:${periods}`;
    return getCachedOrCompute<T.TrendAnalysis>(
      cacheKey,
      async () => {
        const values: number[] = [];
        const timestamps: string[] = [];
        const now = new Date();
        for (let i = periods - 1; i >= 0; i--) {
          let date: string;
          if (granularity === 'daily') {
            const d = new Date(now.getTime() - i * 86400000);
            date = d.toISOString().split('T')[0];
            values.push(
              await R.AnalyticsRepository.getJournalRevenueByType(
                date,
                date,
              ).then((r) => Object.values(r).reduce((a, b) => a + b, 0)),
            );
          } else if (granularity === 'weekly') {
            const end = new Date(now.getTime() - i * 7 * 86400000);
            const start = new Date(end.getTime() - 6 * 86400000);
            date = `${start.toISOString().split('T')[0]}`;
            const revs = await R.AnalyticsRepository.getJournalRevenueByType(
              start.toISOString().split('T')[0],
              end.toISOString().split('T')[0],
            );
            values.push(Object.values(revs).reduce((a, b) => a + b, 0));
          } else {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            date = `${year}-${String(month).padStart(2, '0')}`;
            const lastDay = new Date(year, month, 0).getDate();
            const from = `${year}-${String(month).padStart(2, '0')}-01`;
            const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const revs = await R.AnalyticsRepository.getJournalRevenueByType(
              from,
              to,
            );
            values.push(Object.values(revs).reduce((a, b) => a + b, 0));
          }
          timestamps.push(date);
        }
        const direction: T.TrendDirection =
          values.length >= 2
            ? values[values.length - 1] > values[0]
              ? 'up'
              : values[values.length - 1] < values[0]
                ? 'down'
                : 'stable'
            : 'stable';
        const changePercent =
          values.length >= 2 && values[0] !== 0
            ? round2(
                ((values[values.length - 1] - values[0]) / values[0]) * 100,
              )
            : 0;
        const mean =
          values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
        const variance =
          values.reduce((a, b) => a + (b - mean) ** 2, 0) /
          Math.max(values.length, 1);
        return {
          kpiKey,
          kpiName: kpiKey,
          values,
          timestamps,
          direction,
          changePercent,
          volatility: round2(Math.sqrt(variance)),
          forecast: null,
        };
      },
      600,
    );
  },

  async getComparison(filter: T.AnalyticsFilter): Promise<{
    current: Record<string, number>;
    previous: Record<string, number>;
    changes: Record<string, { value: number; percent: number }>;
  }> {
    const { fromDate, toDate } = parseFilterDates(filter);
    const periodMs = new Date(toDate).getTime() - new Date(fromDate).getTime();
    const prevFrom = new Date(new Date(fromDate).getTime() - periodMs)
      .toISOString()
      .split('T')[0];
    const prevTo = new Date(new Date(fromDate).getTime() - 86400000)
      .toISOString()
      .split('T')[0];

    const [currentRev, currentExp, previousRev, previousExp] =
      await Promise.all([
        R.AnalyticsRepository.getJournalRevenueByType(fromDate, toDate),
        R.AnalyticsRepository.getJournalExpenses(fromDate, toDate),
        R.AnalyticsRepository.getJournalRevenueByType(prevFrom, prevTo),
        R.AnalyticsRepository.getJournalExpenses(prevFrom, prevTo),
      ]);

    const current: Record<string, number> = {
      revenue: Object.values(currentRev).reduce((a, b) => a + b, 0),
      expenses: currentExp,
    };
    const previous: Record<string, number> = {
      revenue: Object.values(previousRev).reduce((a, b) => a + b, 0),
      expenses: previousExp,
    };
    const changes: Record<string, { value: number; percent: number }> = {};
    for (const key of Object.keys(current)) {
      const cur = current[key];
      const prev = previous[key] || 0;
      changes[key] = {
        value: round2(cur - prev),
        percent: prev !== 0 ? round2(((cur - prev) / prev) * 100) : 0,
      };
    }
    return { current, previous, changes };
  },

  async detectAnomalies(kpiKey: string): Promise<T.AnomalyDetection[]> {
    const trend = await this.getTrendAnalysis(kpiKey, 'daily', 30);
    if (trend.values.length < 7) return [];
    const mean = trend.values.reduce((a, b) => a + b, 0) / trend.values.length;
    const stdDev = Math.sqrt(
      trend.values.reduce((a, b) => a + (b - mean) ** 2, 0) /
        trend.values.length,
    );
    const anomalies: T.AnomalyDetection[] = [];
    for (let i = 0; i < trend.values.length; i++) {
      const val = trend.values[i];
      const deviation = val - mean;
      const zScore = stdDev > 0 ? Math.abs(deviation) / stdDev : 0;
      if (zScore > 2) {
        anomalies.push({
          kpiKey,
          kpiName: kpiKey,
          expectedValue: round2(mean),
          actualValue: round2(val),
          deviation: round2(deviation),
          severity: zScore > 3 ? 'critical' : 'high',
          timestamp: trend.timestamps[i] || '',
        });
      }
    }
    return anomalies;
  },

  async getForecast(kpiKey: string, _periods: number): Promise<number | null> {
    const trend = await this.getTrendAnalysis(kpiKey, 'daily', 14);
    if (trend.values.length < 3) return null;
    const last = trend.values[trend.values.length - 1];
    const changeRate =
      trend.values.length > 1
        ? (trend.values[trend.values.length - 1] -
            trend.values[trend.values.length - 2]) /
          Math.max(trend.values[trend.values.length - 2], 1)
        : 0;
    return round2(last * (1 + changeRate));
  },
};

// ── 8. SummaryComputationService ────────────────────────────────────────────

export const SummaryComputationService = {
  async refreshDailySummaries(
    fromDate: string,
    toDate: string,
  ): Promise<{ computed: number; errors: number }> {
    let computed = 0;
    let errors = 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const current = new Date(start);
    while (current <= end) {
      const ds = current.toISOString().split('T')[0];
      try {
        await R.AnalyticsRepository.computeAndSaveDailySummary(ds);
        computed++;
      } catch {
        errors++;
      }
      current.setDate(current.getDate() + 1);
    }
    return { computed, errors };
  },

  async refreshWeeklySummaries(
    year: number,
  ): Promise<{ computed: number; errors: number }> {
    let computed = 0;
    let errors = 0;
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const current = new Date(start);
    while (current <= end) {
      const weekStart = current.toISOString().split('T')[0];
      const weekEnd = new Date(current.getTime() + 6 * 86400000)
        .toISOString()
        .split('T')[0];
      if (new Date(weekEnd) > end) break;
      try {
        await R.AnalyticsRepository.computeAndSaveWeeklySummary(
          weekStart,
          weekEnd,
        );
        computed++;
      } catch {
        errors++;
      }
      current.setDate(current.getDate() + 7);
    }
    return { computed, errors };
  },

  async refreshMonthlySummaries(
    year: number,
  ): Promise<{ computed: number; errors: number }> {
    let computed = 0;
    let errors = 0;
    for (let month = 1; month <= 12; month++) {
      try {
        await R.AnalyticsRepository.computeAndSaveMonthlySummary(year, month);
        computed++;
      } catch {
        errors++;
      }
    }
    return { computed, errors };
  },

  async refreshYearlySummaries(
    years: number[],
  ): Promise<{ computed: number; errors: number }> {
    let computed = 0;
    let errors = 0;
    for (const year of years) {
      try {
        await R.AnalyticsRepository.computeAndSaveYearlySummary(year);
        computed++;
      } catch {
        errors++;
      }
    }
    return { computed, errors };
  },

  async refreshAll(): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  }> {
    const year = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];
    const monthStart = `${year}-01-01`;
    const [daily, weekly, monthly, yearly] = await Promise.all([
      this.refreshDailySummaries(monthStart, today),
      this.refreshWeeklySummaries(year),
      this.refreshMonthlySummaries(year),
      this.refreshYearlySummaries([year - 1, year]),
    ]);
    return {
      daily: daily.computed,
      weekly: weekly.computed,
      monthly: monthly.computed,
      yearly: yearly.computed,
    };
  },
};

// ── 9. CacheService ─────────────────────────────────────────────────────────

export const CacheService = {
  async getAnalyticsHealth(): Promise<{
    repository: any;
    status: string;
    lastComputed: string | null;
  }> {
    const health = await R.AnalyticsRepository.getAnalyticsHealth();
    const timestamps = await R.AnalyticsRepository.getLastComputedTimestamp();
    return {
      repository: health,
      status: health.isHealthy ? 'healthy' : 'degraded',
      lastComputed: timestamps.daily || null,
    };
  },

  async clearAnalyticsCache(): Promise<void> {
    await R.AnalyticsRepository.clearAllCache();
  },

  async getSummaryCoverage(): Promise<any> {
    return R.AnalyticsRepository.getSummaryCoverage();
  },

  getCachedOrCompute,
};

// ── Adapter methods for routes ──────────────────────────────────────────────

function withFilter(method: (filter: T.AnalyticsFilter) => Promise<any>) {
  return (filter: T.AnalyticsFilter) => method(filter);
}

async function findDailySummaries(
  filter: T.AnalyticsFilter,
): Promise<T.DailySummary[]> {
  const { fromDate, toDate } = parseFilterDates(filter);
  return R.AnalyticsRepository.findDailySummaries(fromDate, toDate);
}

async function findWeeklySummaries(
  filter: T.AnalyticsFilter,
  year?: number,
): Promise<T.WeeklySummary[]> {
  const y = year || new Date().getFullYear();
  return R.AnalyticsRepository.findWeeklySummaries(y);
}

async function findMonthlySummaries(
  filter: T.AnalyticsFilter,
  year?: number,
): Promise<T.MonthlySummary[]> {
  const y = year || new Date().getFullYear();
  return R.AnalyticsRepository.findMonthlySummaries(y);
}

async function findAllYearlySummaries(): Promise<T.YearlySummary[]> {
  return R.AnalyticsRepository.findAllYearlySummaries();
}

async function findLatestEvents(limit?: number): Promise<T.AnalyticsEvent[]> {
  return R.AnalyticsRepository.findLatestEvents(limit || 50);
}

async function exportKpis(filter: T.AnalyticsFilter): Promise<any[]> {
  const kpis = await OperationalKpiService.getOperationalKpis(filter);
  return [
    { key: 'daily_revenue', value: kpis.dailyRevenue },
    { key: 'occupancy', value: kpis.occupancy },
    { key: 'bar_sales', value: kpis.barSales },
  ];
}

async function exportFinancial(filter: T.AnalyticsFilter): Promise<any[]> {
  const fin = await FinancialKpiService.getFinancialAnalytics(filter);
  return [
    { key: 'profit', value: fin.profit },
    { key: 'gross_margin', value: fin.grossMargin },
    { key: 'net_margin', value: fin.netMargin },
  ];
}

async function exportInventory(filter: T.AnalyticsFilter): Promise<any[]> {
  const inv = await InventoryAnalyticsService.getInventoryAnalytics(filter);
  return [
    { key: 'valuation', value: inv.inventoryValuation },
    { key: 'shrinkage', value: inv.shrinkage },
  ];
}

async function exportHospitality(filter: T.AnalyticsFilter): Promise<any[]> {
  const hosp =
    await HospitalityAnalyticsService.getHospitalityAnalytics(filter);
  return [
    { key: 'occupancy', value: hosp.roomOccupancy },
    { key: 'table_turnover', value: hosp.tableTurnover },
  ];
}

// ── Unified export ──────────────────────────────────────────────────────────

export const analyticsService = {
  // Dashboard
  getDashboardByRole: (filter: T.AnalyticsFilter, role: T.DashboardRole) =>
    DashboardService.getDashboardByRole(role),
  getDashboardKpiValues: (filter: T.AnalyticsFilter, role: T.DashboardRole) =>
    DashboardService.getDashboardKpiValues(role, filter),
  getExecutiveDashboard: withFilter(DashboardService.getExecutiveDashboard),
  getOwnerDashboard: withFilter(DashboardService.getOwnerDashboard),
  getManagerDashboard: withFilter(DashboardService.getManagerDashboard),
  getAccountantDashboard: withFilter(DashboardService.getAccountantDashboard),
  getRestaurantDashboard: withFilter(DashboardService.getRestaurantDashboard),
  getBarDashboard: withFilter(DashboardService.getBarDashboard),
  getHotelDashboard: withFilter(DashboardService.getHotelDashboard),
  getInventoryDashboard: withFilter(DashboardService.getInventoryDashboard),
  getPurchasingDashboard: withFilter(DashboardService.getPurchasingDashboard),
  getFinanceDashboard: withFilter(DashboardService.getFinanceDashboard),

  // Operational KPIs
  getOperationalKpis: withFilter(OperationalKpiService.getOperationalKpis),
  getDailyRevenue: (filter: T.AnalyticsFilter) =>
    OperationalKpiService.getDailyRevenue(parseDateParam(filter?.toDate)),
  getDepartmentRevenue: withFilter(OperationalKpiService.getDepartmentRevenue),
  getOccupancyAdrRevpar: withFilter(
    OperationalKpiService.getOccupancyAdrRevpar,
  ),
  getRestaurantMetrics: withFilter(OperationalKpiService.getRestaurantMetrics),
  getBarSales: (filter: T.AnalyticsFilter) =>
    OperationalKpiService.getBarSales(filter),
  getInventoryTurnover: withFilter(OperationalKpiService.getInventoryTurnover),
  getCashPosition: withFilter(OperationalKpiService.getCashPosition),

  // Financial KPIs
  getFinancialAnalytics: withFilter(FinancialKpiService.getFinancialAnalytics),
  getProfitAndLoss: withFilter(FinancialKpiService.getProfitAndLoss),
  getGrossMargin: withFilter(FinancialKpiService.getGrossMargin),
  getNetMargin: withFilter(FinancialKpiService.getNetMargin),
  getCashFlow: withFilter(FinancialKpiService.getCashFlow),
  getGstLiability: withFilter(FinancialKpiService.getGstLiability),
  getInputCredit: withFilter(FinancialKpiService.getInputCredit),
  getBankPosition: withFilter(FinancialKpiService.getBankPosition),
  getReceivablesPayables: withFilter(
    FinancialKpiService.getReceivablesPayables,
  ),
  getDepartmentProfitability: withFilter(
    FinancialKpiService.getDepartmentProfitability,
  ),

  // Inventory Analytics
  getInventoryAnalytics: withFilter(
    InventoryAnalyticsService.getInventoryAnalytics,
  ),
  getFastMovingItems: withFilter(InventoryAnalyticsService.getFastMovingItems),
  getSlowMovingItems: withFilter(InventoryAnalyticsService.getSlowMovingItems),
  getDeadStock: withFilter(InventoryAnalyticsService.getDeadStock),
  getReorderAlerts: (_filter?: T.AnalyticsFilter) =>
    InventoryAnalyticsService.getReorderAlerts(),
  getStockAgeing: (_filter?: T.AnalyticsFilter) =>
    InventoryAnalyticsService.getStockAgeing(),
  getShrinkage: withFilter(InventoryAnalyticsService.getShrinkage),
  getConsumptionTrends: withFilter(
    InventoryAnalyticsService.getConsumptionTrends,
  ),

  // Hospitality Analytics
  getHospitalityAnalytics: withFilter(
    HospitalityAnalyticsService.getHospitalityAnalytics,
  ),
  getRoomOccupancy: withFilter(HospitalityAnalyticsService.getRoomOccupancy),
  getLengthOfStay: withFilter(HospitalityAnalyticsService.getLengthOfStay),
  getBookingSources: withFilter(HospitalityAnalyticsService.getBookingSources),
  getTableTurnover: withFilter(HospitalityAnalyticsService.getTableTurnover),
  getKitchenPerformance: withFilter(
    HospitalityAnalyticsService.getKitchenPerformance,
  ),
  getBartenderProductivity: withFilter(
    HospitalityAnalyticsService.getBartenderProductivity,
  ),
  getPeakHours: withFilter(HospitalityAnalyticsService.getPeakHours),

  // Summary Computation
  refreshDailySummaries: SummaryComputationService.refreshDailySummaries,
  refreshWeeklySummaries: SummaryComputationService.refreshWeeklySummaries,
  refreshMonthlySummaries: SummaryComputationService.refreshMonthlySummaries,
  refreshYearlySummaries: SummaryComputationService.refreshYearlySummaries,
  refreshAll: SummaryComputationService.refreshAll,

  // Summary queries
  findDailySummaries,
  findWeeklySummaries,
  findMonthlySummaries,
  findAllYearlySummaries,

  // Analytics Events
  generateDailySnapshot: AnalyticsEventService.generateDailySnapshot,
  generateWeeklySummary: AnalyticsEventService.generateWeeklySummary,
  generateMonthlySummary: AnalyticsEventService.generateMonthlySummary,
  generateYearlySummary: AnalyticsEventService.generateYearlySummary,
  generateThresholdAlerts: AnalyticsEventService.generateThresholdAlerts,
  findLatestEvents,

  // Trends & Analysis
  getTrendAnalysis: (kpiKey: string, filter: T.AnalyticsFilter) =>
    TrendAnalysisService.getTrendAnalysis(
      kpiKey,
      filter?.granularity || 'daily',
      7,
    ),
  getComparison: withFilter(TrendAnalysisService.getComparison),
  detectAnomalies: (kpiKey: string, _filter: T.AnalyticsFilter) =>
    TrendAnalysisService.detectAnomalies(kpiKey),
  getForecast: (kpiKey: string, _filter: T.AnalyticsFilter) =>
    TrendAnalysisService.getForecast(kpiKey, 7),

  // Cache & Health
  getAnalyticsHealth: CacheService.getAnalyticsHealth,
  clearAnalyticsCache: CacheService.clearAnalyticsCache,
  getSummaryCoverage: CacheService.getSummaryCoverage,

  // Export
  exportKpis,
  exportFinancial,
  exportInventory,
  exportHospitality,

  // Nested access (for programmatic use)
  dashboard: DashboardService,
  operational: OperationalKpiService,
  financial: FinancialKpiService,
  inventory: InventoryAnalyticsService,
  hospitality: HospitalityAnalyticsService,
  events: AnalyticsEventService,
  trends: TrendAnalysisService,
  summaries: SummaryComputationService,
  cache: CacheService,
};
