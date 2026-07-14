import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as T from './analytics.types';
import { analyticsService } from './analytics.service';

const router = Router();

// ── Role permission presets ────────────────────────────────────────────────
const R_ALL = [
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
const R_OM = ['owner', 'manager'];
const R_OWN = ['owner'];
const R_FIN = ['owner', 'manager', 'accountant', 'finance'];
const R_INV = ['owner', 'manager', 'inventory'];
const R_HOT = ['owner', 'manager', 'hotel'];
const R_REST = ['owner', 'manager', 'restaurant'];
const R_BAR = ['owner', 'manager', 'bar'];
const R_PUR = ['owner', 'manager', 'purchasing'];
const R_ACC = ['owner', 'manager', 'accountant'];

// ── Helpers ────────────────────────────────────────────────────────────────

function handleError(
  res: Response,
  err: any,
  msg = 'Internal server error',
): void {
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Invalid') ||
        err.message?.includes('required') ||
        err.message?.includes('Validation')
      ? 400
      : 500;
  res.status(status).json({ success: false, message: err.message || msg });
}

function parseFilter(req: Request): T.AnalyticsFilter {
  const { fromDate, toDate, granularity, comparison, exportFormat } = req.query;
  const filter: T.AnalyticsFilter = {};
  if (fromDate) filter.fromDate = fromDate as string;
  if (toDate) filter.toDate = toDate as string;
  if (granularity) filter.granularity = granularity as T.TimeGranularity;
  if (comparison) filter.comparison = comparison as T.ComparisonType;
  if (exportFormat) filter.exportFormat = exportFormat as T.ExportFormat;
  return filter;
}

function validateRole(role: string): boolean {
  return T.VALID_DASHBOARD_ROLES.includes(role as T.DashboardRole);
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/executive',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getExecutiveDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/owner',
  authenticate,
  authorize(...R_OWN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getOwnerDashboard(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/manager',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getManagerDashboard(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/accountant',
  authenticate,
  authorize(...R_ACC),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getAccountantDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/restaurant',
  authenticate,
  authorize(...R_REST),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getRestaurantDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/bar',
  authenticate,
  authorize(...R_BAR),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBarDashboard(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/hotel',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getHotelDashboard(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/inventory',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getInventoryDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/purchasing',
  authenticate,
  authorize(...R_PUR),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getPurchasingDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/finance',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getFinanceDashboard(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/:role',
  authenticate,
  authorize(...R_ALL),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.params;
      if (!validateRole(role)) {
        res
          .status(400)
          .json({ success: false, message: `Invalid dashboard role: ${role}` });
        return;
      }
      const data = await analyticsService.getDashboardByRole(
        parseFilter(req),
        role as T.DashboardRole,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/dashboard/:role/kpis',
  authenticate,
  authorize(...R_ALL),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.params;
      if (!validateRole(role)) {
        res
          .status(400)
          .json({ success: false, message: `Invalid dashboard role: ${role}` });
        return;
      }
      const data = await analyticsService.getDashboardKpiValues(
        parseFilter(req),
        role as T.DashboardRole,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// OPERATIONAL KPI ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/kpis/operational',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getOperationalKpis(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/daily-revenue',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getDailyRevenue(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/department-revenue',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getDepartmentRevenue(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/occupancy',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getOccupancyAdrRevpar(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/restaurant',
  authenticate,
  authorize(...R_REST),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getRestaurantMetrics(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/bar-sales',
  authenticate,
  authorize(...R_BAR),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBarSales(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/inventory-turnover',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getInventoryTurnover(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/cash-position',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getCashPosition(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/outstanding-payments',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getReceivablesPayables(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/kpis/supplier-performance',
  authenticate,
  authorize(...R_PUR),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getPurchasingDashboard(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL KPI ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/financial',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getFinancialAnalytics(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/profit-loss',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getProfitAndLoss(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/gross-margin',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getGrossMargin(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/net-margin',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getNetMargin(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/cash-flow',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getCashFlow(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/gst-liability',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getGstLiability(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/input-credit',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getInputCredit(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/bank-position',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBankPosition(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/receivables-payables',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getReceivablesPayables(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/financial/department-profitability',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getDepartmentProfitability(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/inventory',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getInventoryAnalytics(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/fast-moving',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getFastMovingItems(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/slow-moving',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getSlowMovingItems(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/dead-stock',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getDeadStock(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/reorder-alerts',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getReorderAlerts(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/stock-ageing',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getStockAgeing(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/shrinkage',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getShrinkage(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/inventory/consumption-trends',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getConsumptionTrends(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// HOSPITALITY ANALYTICS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/hospitality',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getHospitalityAnalytics(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/occupancy',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getRoomOccupancy(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/length-of-stay',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getLengthOfStay(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/booking-sources',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBookingSources(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/table-turnover',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getTableTurnover(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/kitchen-performance',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getKitchenPerformance(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/bartender-productivity',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getBartenderProductivity(
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/hospitality/peak-hours',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getPeakHours(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/summaries/daily/refresh',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.body;
      if (!fromDate || !toDate) {
        res.status(400).json({
          success: false,
          message: 'fromDate and toDate are required',
        });
        return;
      }
      const data = await analyticsService.refreshDailySummaries(
        fromDate,
        toDate,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/summaries/weekly/refresh',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { year } = req.body;
      if (!year) {
        res.status(400).json({ success: false, message: 'year is required' });
        return;
      }
      const data = await analyticsService.refreshWeeklySummaries(year);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/summaries/monthly/refresh',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { year } = req.body;
      if (!year) {
        res.status(400).json({ success: false, message: 'year is required' });
        return;
      }
      const data = await analyticsService.refreshMonthlySummaries(year);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/summaries/yearly/refresh',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { years } = req.body;
      if (!years) {
        res.status(400).json({ success: false, message: 'years is required' });
        return;
      }
      const data = await analyticsService.refreshYearlySummaries(years);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/summaries/refresh-all',
  authenticate,
  authorize(...R_OWN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.refreshAll();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/summaries/daily',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;
      const filter = parseFilter(req);
      if (fromDate) filter.fromDate = fromDate as string;
      if (toDate) filter.toDate = toDate as string;
      const data = await analyticsService.findDailySummaries(filter);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/summaries/weekly',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const year = req.query.year as string | undefined;
      const filter = parseFilter(req);
      const data = await analyticsService.findWeeklySummaries(
        filter,
        year ? Number(year) : undefined,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/summaries/monthly',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const year = req.query.year as string | undefined;
      const filter = parseFilter(req);
      const data = await analyticsService.findMonthlySummaries(
        filter,
        year ? Number(year) : undefined,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/summaries/yearly',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.findAllYearlySummaries();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS EVENTS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/events/daily-snapshot',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { date } = req.body;
      if (!date) {
        res.status(400).json({ success: false, message: 'date is required' });
        return;
      }
      const data = await analyticsService.generateDailySnapshot(date);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/events/weekly-summary',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { weekStart, weekEnd } = req.body;
      if (!weekStart || !weekEnd) {
        res.status(400).json({
          success: false,
          message: 'weekStart and weekEnd are required',
        });
        return;
      }
      const data = await analyticsService.generateWeeklySummary(
        weekStart,
        weekEnd,
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/events/monthly-summary',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { year, month } = req.body;
      if (!year || !month) {
        res
          .status(400)
          .json({ success: false, message: 'year and month are required' });
        return;
      }
      const data = await analyticsService.generateMonthlySummary(year, month);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/events/yearly-summary',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { year } = req.body;
      if (!year) {
        res.status(400).json({ success: false, message: 'year is required' });
        return;
      }
      const data = await analyticsService.generateYearlySummary(year);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/events/threshold-alerts',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.generateThresholdAlerts();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/events',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await analyticsService.findLatestEvents(limit);
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// TREND & ANALYSIS ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/trends/:kpiKey',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { kpiKey } = req.params;
      const data = await analyticsService.getTrendAnalysis(
        kpiKey,
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/comparison',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getComparison(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/anomalies/:kpiKey',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { kpiKey } = req.params;
      const data = await analyticsService.detectAnomalies(
        kpiKey,
        parseFilter(req),
      );
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/forecast/:kpiKey',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const { kpiKey } = req.params;
      const data = await analyticsService.getForecast(kpiKey, parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH & CACHE ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/health',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getAnalyticsHealth();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/cache/clear',
  authenticate,
  authorize(...R_OWN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.clearAnalyticsCache();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/summary-coverage',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.getSummaryCoverage();
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/export/kpis',
  authenticate,
  authorize(...R_OM),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.exportKpis(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/export/financial',
  authenticate,
  authorize(...R_FIN),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.exportFinancial(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/export/inventory',
  authenticate,
  authorize(...R_INV),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.exportInventory(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/export/hospitality',
  authenticate,
  authorize(...R_HOT),
  async (req: Request, res: Response) => {
    try {
      const data = await analyticsService.exportHospitality(parseFilter(req));
      res.json({ success: true, data });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;
