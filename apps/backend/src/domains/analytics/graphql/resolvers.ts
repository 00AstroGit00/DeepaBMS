import { analyticsService } from '../analytics.service';
import * as T from '../analytics.types';

export const resolvers = {
  Query: {
    dailyRevenue: async (
      _parent: any,
      { date }: { date: string },
      context: any,
    ) => {
      // Gating checks if required by context user
      if (
        context.user &&
        !['owner', 'manager', 'accountant'].includes(context.user.role)
      ) {
        throw new Error('Unauthorized role access to analytics');
      }
      return analyticsService.getDailyRevenue({ toDate: date });
    },
    occupancyAdrRevpar: async (
      _parent: any,
      { startDate, endDate }: { startDate: string; endDate: string },
    ) => {
      return analyticsService.getOccupancyAdrRevpar({
        fromDate: startDate,
        toDate: endDate,
      });
    },
    profitLoss: async (
      _parent: any,
      { startDate, endDate }: { startDate: string; endDate: string },
    ) => {
      return analyticsService.getProfitAndLoss({
        fromDate: startDate,
        toDate: endDate,
      });
    },
    reorderAlerts: async () => {
      return analyticsService.getReorderAlerts({});
    },
    stockAgeing: async () => {
      return analyticsService.getStockAgeing({});
    },
    receivablesPayables: async () => {
      const rp = await analyticsService.getReceivablesPayables({});
      return {
        ...rp,
        netBalance: rp.receivables - rp.payables,
      };
    },
    operationalKpis: async (
      _parent: any,
      { startDate, endDate }: { startDate: string; endDate: string },
    ) => {
      return analyticsService.getOperationalKpis({
        fromDate: startDate,
        toDate: endDate,
      });
    },
    dashboardKpiValues: async (_parent: any, { role }: { role: string }) => {
      return analyticsService.getDashboardKpiValues(
        {},
        role as T.DashboardRole,
      );
    },
  },
};
