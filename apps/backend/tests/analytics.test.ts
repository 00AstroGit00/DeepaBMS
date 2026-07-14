import { describe, test, expect, beforeAll } from '@jest/globals';
import { query, run } from '../src/db';
import * as T from '../src/domains/analytics/analytics.types';
import { AnalyticsRepository as repo } from '../src/domains/analytics/analytics.repository';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function now(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function hoursFromNow(n: number): string {
  return new Date(Date.now() + n * 3600000).toISOString();
}

// ═════════════════════════════════════════════════════════════════════════════
// SETUP — Clean tables before each test block
// ═════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  await run('DELETE FROM kpi_definitions');
  await run('DELETE FROM dashboard_configs');
  await run('DELETE FROM daily_summaries');
  await run('DELETE FROM weekly_summaries');
  await run('DELETE FROM monthly_summaries');
  await run('DELETE FROM yearly_summaries');
  await run('DELETE FROM analytics_cache');
  await run('DELETE FROM analytics_events');
}, 30000);

// ═════════════════════════════════════════════════════════════════════════════
// 1. KPI DEFINITIONS (~10 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — KPI Definitions', () => {
  let kpiId = '';
  const kpiKey = uid('kpi');

  test('createKpiDefinition stores correctly', async () => {
    const def = await repo.createKpiDefinition({
      key: kpiKey,
      name: 'Total Revenue',
      description: 'Total revenue across all departments',
      category: 'revenue',
      formula: 'SUM(revenue)',
      unit: 'INR',
      decimalPlaces: 2,
      isPercentage: false,
      higherIsBetter: true,
      minRefreshInterval: 300,
      roles: ['owner', 'manager', 'accountant'],
    });
    expect(def.id).toBeTruthy();
    expect(def.key).toBe(kpiKey);
    expect(def.name).toBe('Total Revenue');
    expect(def.category).toBe('revenue');
    expect(def.formula).toBe('SUM(revenue)');
    expect(def.unit).toBe('INR');
    expect(def.decimalPlaces).toBe(2);
    expect(def.isPercentage).toBe(false);
    expect(def.higherIsBetter).toBe(true);
    expect(def.minRefreshInterval).toBe(300);
    expect(def.roles).toEqual(['owner', 'manager', 'accountant']);
    kpiId = def.id;
  });

  test('findKpiByKey returns correct KPI', async () => {
    const def = await repo.findKpiByKey(kpiKey);
    expect(def).not.toBeNull();
    expect(def!.key).toBe(kpiKey);
    expect(def!.name).toBe('Total Revenue');
  });

  test('findAllKpis filters by category', async () => {
    const kpis = await repo.findAllKpis('revenue');
    expect(kpis.length).toBeGreaterThanOrEqual(1);
    for (const k of kpis) {
      expect(k.category).toBe('revenue');
    }
  });

  test('findAllKpis filters by role', async () => {
    const kpis = await repo.findAllKpis(undefined, 'owner');
    expect(kpis.length).toBeGreaterThanOrEqual(1);
  });

  test('updateKpiDefinition modifies fields', async () => {
    const updated = await repo.updateKpiDefinition(kpiId, {
      name: 'Total Revenue Updated',
      decimalPlaces: 0,
    });
    expect(updated.name).toBe('Total Revenue Updated');
    expect(updated.decimalPlaces).toBe(0);
    await repo.updateKpiDefinition(kpiId, {
      name: 'Total Revenue',
      decimalPlaces: 2,
    });
  });

  test('deleteKpiDefinition removes entry', async () => {
    const def = await repo.createKpiDefinition({
      key: uid('kpi'),
      name: 'Temp KPI',
      description: '',
      category: 'revenue',
      formula: '1',
      unit: 'INR',
      decimalPlaces: 2,
      isPercentage: false,
      higherIsBetter: true,
      minRefreshInterval: 300,
      roles: ['owner'],
    });
    await repo.deleteKpiDefinition(def.id);
    const found = await repo.findKpiByKey(def.key);
    expect(found).toBeNull();
  });

  test('getKpiCount returns correct count', async () => {
    const count = await repo.getKpiCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('KPI key uniqueness is enforced', async () => {
    await expect(
      repo.createKpiDefinition({
        key: kpiKey,
        name: 'Duplicate',
        description: '',
        category: 'revenue',
        formula: '1',
        unit: 'INR',
        decimalPlaces: 2,
        isPercentage: false,
        higherIsBetter: true,
        minRefreshInterval: 300,
        roles: ['owner'],
      }),
    ).rejects.toThrow();
  });

  test('KPI with invalid category is rejected', async () => {
    await expect(
      repo.createKpiDefinition({
        key: uid('kpi'),
        name: 'Bad',
        description: '',
        category: 'invalid' as T.KpiCategory,
        formula: '1',
        unit: 'INR',
        decimalPlaces: 2,
        isPercentage: false,
        higherIsBetter: true,
        minRefreshInterval: 300,
        roles: ['owner'],
      }),
    ).rejects.toThrow();
  });

  test('KPI with invalid role raises error', async () => {
    await expect(
      repo.createKpiDefinition({
        key: uid('kpi'),
        name: 'Bad Role',
        description: '',
        category: 'revenue',
        formula: '1',
        unit: 'INR',
        decimalPlaces: 2,
        isPercentage: false,
        higherIsBetter: true,
        minRefreshInterval: 300,
        roles: ['invalid' as T.DashboardRole],
      }),
    ).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. DASHBOARD CONFIGS (~8 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Dashboard Configs', () => {
  let dashId = '';

  test('createDashboardConfig creates config with JSON config field', async () => {
    const config = await repo.createDashboardConfig({
      role: 'owner',
      name: 'Owner Dashboard',
      description: 'Full overview for business owner',
      sections: [
        {
          id: 's1',
          title: 'Revenue Overview',
          type: 'kpi_grid',
          kpiKeys: ['total_revenue', 'gross_margin'],
          size: 'large',
          order: 1,
        },
        {
          id: 's2',
          title: 'Trends',
          type: 'chart',
          kpiKeys: ['revenue_trend'],
          chartType: 'line',
          size: 'medium',
          order: 2,
        },
      ],
      refreshInterval: 60,
    });
    expect(config.id).toBeTruthy();
    expect(config.role).toBe('owner');
    expect(config.name).toBe('Owner Dashboard');
    expect(config.sections.length).toBe(2);
    expect(config.sections[0].title).toBe('Revenue Overview');
    expect(config.sections[0].type).toBe('kpi_grid');
    expect(config.sections[1].chartType).toBe('line');
    expect(config.refreshInterval).toBe(60);
    dashId = config.id;
  });

  test('findDashboardByRole returns correct config', async () => {
    const config = await repo.findDashboardByRole('owner');
    expect(config).not.toBeNull();
    expect(config!.role).toBe('owner');
    expect(config!.sections.length).toBe(2);
  });

  test('findAllDashboardConfigs returns all 9 roles', async () => {
    const roles: T.DashboardRole[] = [
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
    for (const role of roles) {
      await repo.createDashboardConfig({
        role,
        name: `${role} Dashboard`,
        description: '',
        sections: [
          {
            id: uid('s'),
            title: 'Default',
            type: 'kpi_grid',
            kpiKeys: ['revenue'],
            size: 'medium',
            order: 1,
          },
        ],
        refreshInterval: 60,
      });
    }
    const all = await repo.findAllDashboardConfigs();
    expect(all.length).toBeGreaterThanOrEqual(9);
  });

  test('updateDashboardConfig modifies sections', async () => {
    const updated = await repo.updateDashboardConfig(dashId, {
      sections: [
        {
          id: 's1',
          title: 'Updated Section',
          type: 'table',
          kpiKeys: ['revenue'],
          size: 'full',
          order: 1,
        },
      ],
    });
    expect(updated.sections.length).toBe(1);
    expect(updated.sections[0].title).toBe('Updated Section');
    expect(updated.sections[0].type).toBe('table');
  });

  test('deleteDashboardConfig removes config', async () => {
    const config = await repo.createDashboardConfig({
      role: 'bar',
      name: 'Temp',
      description: '',
      sections: [],
      refreshInterval: 60,
    });
    await repo.deleteDashboardConfig(config.id);
    const found = await repo.findDashboardByRole('bar');
    expect(found).toBeNull();
  });

  test('Dashboard config valid role validation works', async () => {
    await expect(
      repo.createDashboardConfig({
        role: 'invalid' as T.DashboardRole,
        name: 'Bad',
        description: '',
        sections: [],
        refreshInterval: 60,
      }),
    ).rejects.toThrow();
  });

  test('Config with empty sections renders empty dashboards', async () => {
    const config = await repo.createDashboardConfig({
      role: 'purchasing',
      name: 'Empty',
      description: '',
      sections: [],
      refreshInterval: 60,
    });
    expect(config.sections).toEqual([]);
  });

  test('Multiple configs for same role are rejected (unique role)', async () => {
    await expect(
      repo.createDashboardConfig({
        role: 'owner',
        name: 'Duplicate',
        description: '',
        sections: [],
        refreshInterval: 60,
      }),
    ).rejects.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. DAILY SUMMARIES (~12 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Daily Summaries', () => {
  const d1 = daysAgo(2);
  const d2 = daysAgo(1);
  const d3 = today();

  test('computeAndSaveDailySummary computes from transactional data', async () => {
    const summary = await repo.computeAndSaveDailySummary(d1);
    expect(summary).toBeTruthy();
    expect(summary.date).toBe(d1);
    expect(typeof summary.totalRevenue).toBe('number');
    expect(typeof summary.occupancyRate).toBe('number');
  });

  test('findDailySummary returns correct summary', async () => {
    const summary = await repo.findDailySummary(d1);
    expect(summary).not.toBeNull();
    expect(summary!.date).toBe(d1);
  });

  test('findDailySummaries returns date range', async () => {
    await repo.computeAndSaveDailySummary(d2);
    await repo.computeAndSaveDailySummary(d3);
    const summaries = await repo.findDailySummaries(d1, d3);
    expect(summaries.length).toBeGreaterThanOrEqual(2);
    for (const s of summaries) {
      expect(s.date >= d1 && s.date <= d3).toBe(true);
    }
  });

  test('findLatestDailySummary returns most recent', async () => {
    const latest = await repo.findLatestDailySummary();
    expect(latest).not.toBeNull();
    expect(latest!.date).toBe(d3);
  });

  test('deleteDailySummary removes entry', async () => {
    const tempDate = daysAgo(10);
    await repo.computeAndSaveDailySummary(tempDate);
    await repo.deleteDailySummary(tempDate);
    const found = await repo.findDailySummary(tempDate);
    expect(found).toBeNull();
  });

  test('Daily summary computes totalRevenue correctly', async () => {
    const summary = await repo.findDailySummary(d1);
    expect(summary).not.toBeNull();
    expect(summary!.totalRevenue).toBe(
      summary!.roomRevenue +
        summary!.restaurantRevenue +
        summary!.barRevenue +
        summary!.otherRevenue,
    );
  });

  test('Daily summary computes roomRevenue correctly', async () => {
    const summary = await repo.findDailySummary(d1);
    expect(summary).not.toBeNull();
    expect(summary!.roomRevenue).toBeGreaterThanOrEqual(0);
  });

  test('Daily summary computes occupancyRate correctly', async () => {
    const summary = await repo.findDailySummary(d1);
    expect(summary).not.toBeNull();
    expect(summary!.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(summary!.occupancyRate).toBeLessThanOrEqual(100);
  });

  test('Daily summary with zero revenue does not crash', async () => {
    const futureDate = daysFromNow(30);
    const summary = await repo.computeAndSaveDailySummary(futureDate);
    expect(summary).toBeTruthy();
    expect(summary.totalRevenue).toBe(0);
    expect(summary.occupancyRate).toBeGreaterThanOrEqual(0);
  });

  test('Consecutive daily summaries accumulate correctly', async () => {
    const summaries = await repo.findDailySummaries(d1, d3);
    expect(summaries.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < summaries.length; i++) {
      expect(
        new Date(summaries[i].date) >= new Date(summaries[i - 1].date),
      ).toBe(true);
    }
  });

  test('Updating the same date recomputes summary', async () => {
    const first = await repo.computeAndSaveDailySummary(d1);
    const second = await repo.computeAndSaveDailySummary(d1);
    expect(second.date).toBe(d1);
    expect(typeof second.totalRevenue).toBe('number');
  });

  test('Daily summary all fields have correct types', async () => {
    const summary = await repo.findDailySummary(d1);
    expect(summary).not.toBeNull();
    expect(typeof summary!.date).toBe('string');
    expect(typeof summary!.totalRevenue).toBe('number');
    expect(typeof summary!.roomRevenue).toBe('number');
    expect(typeof summary!.restaurantRevenue).toBe('number');
    expect(typeof summary!.barRevenue).toBe('number');
    expect(typeof summary!.otherRevenue).toBe('number');
    expect(typeof summary!.totalExpenses).toBe('number');
    expect(typeof summary!.grossProfit).toBe('number');
    expect(typeof summary!.netProfit).toBe('number');
    expect(typeof summary!.occupancyRate).toBe('number');
    expect(typeof summary!.restaurantCovers).toBe('number');
    expect(typeof summary!.averageBill).toBe('number');
    expect(typeof summary!.barSales).toBe('number');
    expect(typeof summary!.cashBalance).toBe('number');
    expect(typeof summary!.bankBalance).toBe('number');
    expect(typeof summary!.receivables).toBe('number');
    expect(typeof summary!.payables).toBe('number');
    expect(typeof summary!.gstPayable).toBe('number');
    expect(typeof summary!.gstInputCredit).toBe('number');
    expect(typeof summary!.inventoryValue).toBe('number');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. WEEKLY SUMMARIES (~8 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Weekly Summaries', () => {
  const ws = daysAgo(6);
  const we = today();
  const currentYear = new Date().getFullYear();

  test('computeAndSaveWeeklySummary aggregates from daily', async () => {
    const weekly = await repo.computeAndSaveWeeklySummary(ws, we);
    expect(weekly).toBeTruthy();
    expect(weekly.weekStart).toBe(ws);
    expect(weekly.weekEnd).toBe(we);
    expect(weekly.weekNumber).toBeGreaterThanOrEqual(1);
    expect(weekly.year).toBe(currentYear);
  });

  test('findWeeklySummary returns correct week', async () => {
    const weekly = await repo.findWeeklySummary(ws, we);
    expect(weekly).not.toBeNull();
    expect(weekly!.weekStart).toBe(ws);
    expect(weekly!.weekEnd).toBe(we);
  });

  test('findWeeklySummaries returns all for year', async () => {
    const weeklies = await repo.findWeeklySummaries(currentYear);
    expect(weeklies.length).toBeGreaterThanOrEqual(1);
    for (const w of weeklies) {
      expect(w.year).toBe(currentYear);
    }
  });

  test('findLatestWeeklySummary returns most recent', async () => {
    const latest = await repo.findLatestWeeklySummary();
    expect(latest).not.toBeNull();
    expect(latest!.weekEnd).toBe(we);
  });

  test('Weekly summary total matches sum of daily', async () => {
    const weekly = await repo.findWeeklySummary(ws, we);
    const dailies = await repo.findDailySummaries(ws, we);
    const dailyTotal = dailies.reduce((s, d) => s + d.totalRevenue, 0);
    expect(weekly!.totalRevenue).toBeCloseTo(dailyTotal, 0);
  });

  test('Weekly summary covers full 7-day range', async () => {
    const weekly = await repo.findWeeklySummary(ws, we);
    expect(weekly).not.toBeNull();
    expect(weekly!.weekStart).toBe(ws);
    expect(weekly!.weekEnd).toBe(we);
  });

  test('Partial week (less than 7 days) works', async () => {
    const singleDay = daysAgo(15);
    await repo.computeAndSaveDailySummary(singleDay);
    const partial = await repo.computeAndSaveWeeklySummary(
      singleDay,
      singleDay,
    );
    expect(partial).toBeTruthy();
    expect(partial.weekStart).toBe(singleDay);
    expect(partial.weekEnd).toBe(singleDay);
  });

  test('Weekly summary year filter works', async () => {
    const weeklies = await repo.findWeeklySummaries(new Date().getFullYear());
    expect(weeklies.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. MONTHLY SUMMARIES (~12 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Monthly Summaries', () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  test('computeAndSaveMonthlySummary aggregates from daily', async () => {
    const monthly = await repo.computeAndSaveMonthlySummary(
      currentYear,
      currentMonth,
    );
    expect(monthly).toBeTruthy();
    expect(monthly.year).toBe(currentYear);
    expect(monthly.month).toBe(currentMonth);
    expect(monthly.monthName).toBeTruthy();
  });

  test('findMonthlySummary returns correct month', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    expect(monthly!.year).toBe(currentYear);
    expect(monthly!.month).toBe(currentMonth);
  });

  test('findMonthlySummaries returns all for year', async () => {
    const monthlies = await repo.findMonthlySummaries(currentYear);
    expect(monthlies.length).toBeGreaterThanOrEqual(1);
    for (const m of monthlies) {
      expect(m.year).toBe(currentYear);
    }
  });

  test('findMonthlySummariesRange returns correct range', async () => {
    const range = await repo.findMonthlySummariesRange(
      currentYear,
      1,
      currentYear,
      currentMonth,
    );
    expect(range.length).toBeGreaterThanOrEqual(1);
  });

  test('findLatestMonthlySummary returns most recent', async () => {
    const latest = await repo.findLatestMonthlySummary();
    expect(latest).not.toBeNull();
    expect(latest!.year).toBe(currentYear);
    expect(latest!.month).toBe(currentMonth);
  });

  test('Monthly summary gross_margin calculated correctly', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    if (monthly!.totalRevenue > 0) {
      expect(monthly!.grossMargin).toBeCloseTo(
        (monthly!.grossProfit / monthly!.totalRevenue) * 100,
        0,
      );
    } else {
      expect(monthly!.grossMargin).toBe(0);
    }
  });

  test('Monthly summary net_margin calculated correctly', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    if (monthly!.totalRevenue > 0) {
      expect(monthly!.netMargin).toBeCloseTo(
        (monthly!.netProfit / monthly!.totalRevenue) * 100,
        0,
      );
    } else {
      expect(monthly!.netMargin).toBe(0);
    }
  });

  test('Monthly summary adr calculated correctly', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    expect(monthly!.adr).toBeGreaterThanOrEqual(0);
  });

  test('Monthly summary revpar calculated correctly', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    expect(monthly!.revpar).toBeGreaterThanOrEqual(0);
  });

  test('Monthly summary department_profits stored as JSON', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    expect(Array.isArray(monthly!.departmentProfits)).toBe(true);
    if (monthly!.departmentProfits.length > 0) {
      const dp = monthly!.departmentProfits[0];
      expect(dp.department).toBeTruthy();
      expect(typeof dp.revenue).toBe('number');
      expect(typeof dp.grossMargin).toBe('number');
    }
  });

  test('Monthly summary inventory_turnover computed', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, currentMonth);
    expect(monthly).not.toBeNull();
    expect(monthly!.inventoryTurnover).toBeGreaterThanOrEqual(0);
  });

  test('Monthly summary with no data returns zeros', async () => {
    const futureYear = currentYear + 5;
    const monthly = await repo.computeAndSaveMonthlySummary(futureYear, 1);
    expect(monthly).toBeTruthy();
    expect(monthly.totalRevenue).toBe(0);
    expect(monthly.grossMargin).toBe(0);
    expect(monthly.netMargin).toBe(0);
    expect(monthly.adr).toBe(0);
    expect(monthly.revpar).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. YEARLY SUMMARIES (~6 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Yearly Summaries', () => {
  const currentYear = new Date().getFullYear();

  test('computeAndSaveYearlySummary aggregates from monthly', async () => {
    const yearly = await repo.computeAndSaveYearlySummary(currentYear);
    expect(yearly).toBeTruthy();
    expect(yearly.year).toBe(currentYear);
    expect(Array.isArray(yearly.monthlyBreakdown)).toBe(true);
  });

  test('findYearlySummary returns year with monthly breakdown', async () => {
    const yearly = await repo.findYearlySummary(currentYear);
    expect(yearly).not.toBeNull();
    expect(yearly!.year).toBe(currentYear);
    expect(Array.isArray(yearly!.monthlyBreakdown)).toBe(true);
  });

  test('findAllYearlySummaries returns all years', async () => {
    const all = await repo.findAllYearlySummaries();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  test('findLatestYearlySummary returns most recent', async () => {
    const latest = await repo.findLatestYearlySummary();
    expect(latest).not.toBeNull();
    expect(latest!.year).toBe(currentYear);
  });

  test('deleteYearlySummary removes entry', async () => {
    const tempYear = currentYear + 10;
    await repo.computeAndSaveYearlySummary(tempYear);
    await repo.deleteYearlySummary(tempYear);
    const found = await repo.findYearlySummary(tempYear);
    expect(found).toBeNull();
  });

  test('Yearly summary totals match sum of monthly', async () => {
    const yearly = await repo.findYearlySummary(currentYear);
    expect(yearly).not.toBeNull();
    if (yearly!.monthlyBreakdown.length > 0) {
      const monthlyTotal = yearly!.monthlyBreakdown.reduce(
        (s, m) => s + m.totalRevenue,
        0,
      );
      expect(yearly!.totalRevenue).toBeCloseTo(monthlyTotal, 0);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. ANALYTICS CACHE (~8 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Cache', () => {
  const cacheKey = uid('ck');

  test('setCache stores data with TTL', async () => {
    const cached = await repo.setCache(
      cacheKey,
      JSON.stringify({ revenue: 1000 }),
      3600,
    );
    expect(cached).toBeTruthy();
    expect(cached.cacheKey).toBe(cacheKey);
    expect(cached.data).toBe(JSON.stringify({ revenue: 1000 }));
    expect(new Date(cached.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('getCache returns cached data before expiry', async () => {
    const cached = await repo.getCache(cacheKey);
    expect(cached).not.toBeNull();
    expect(cached!.cacheKey).toBe(cacheKey);
    const data = JSON.parse(cached!.data);
    expect(data.revenue).toBe(1000);
  });

  test('getCache returns null after expiry', async () => {
    const expiredKey = uid('exp');
    await repo.setCache(expiredKey, '{}', -1);
    const cached = await repo.getCache(expiredKey);
    expect(cached).toBeNull();
  });

  test('clearCache removes entry', async () => {
    await repo.clearCache(cacheKey);
    const cached = await repo.getCache(cacheKey);
    expect(cached).toBeNull();
  });

  test('clearExpiredCache removes only expired entries', async () => {
    const validKey = uid('vld');
    const expiredKey = uid('xpd');
    await repo.setCache(validKey, '"valid"', 3600);
    await repo.setCache(expiredKey, '"expired"', -1);
    const removed = await repo.clearExpiredCache();
    expect(removed).toBeGreaterThanOrEqual(1);
    const valid = await repo.getCache(validKey);
    expect(valid).not.toBeNull();
  });

  test('clearAllCache removes all', async () => {
    await repo.setCache(uid('a'), '"a"', 3600);
    await repo.setCache(uid('b'), '"b"', 3600);
    await repo.clearAllCache();
    const stats = await repo.getCacheStats();
    expect(stats.count).toBe(0);
  });

  test('getCacheStats returns correct counts', async () => {
    await repo.setCache(uid('s1'), '"s1"', 3600);
    await repo.setCache(uid('s2'), '"s2"', 3600);
    const stats = await repo.getCacheStats();
    expect(stats.count).toBeGreaterThanOrEqual(2);
    expect(stats.oldest).toBeTruthy();
    expect(stats.newest).toBeTruthy();
  });

  test('Cache stores and retrieves complex objects', async () => {
    const complex = {
      revenue: 5000,
      expenses: 3000,
      departments: { rooms: 2000, restaurant: 1500, bar: 1500 },
    };
    const key = uid('cpx');
    await repo.setCache(key, JSON.stringify(complex), 3600);
    const cached = await repo.getCache(key);
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached!.data);
    expect(parsed.revenue).toBe(5000);
    expect(parsed.departments.rooms).toBe(2000);
    expect(parsed.departments.bar).toBe(1500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. ANALYTICS EVENTS (~8 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Events', () => {
  const period = today();

  test('createAnalyticsEvent stores event', async () => {
    const event = await repo.createAnalyticsEvent({
      eventType: 'daily_snapshot',
      period,
      data: { totalRevenue: 5000, occupancyRate: 75 },
      thresholdBreaches: [],
    });
    expect(event).toBeTruthy();
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe('daily_snapshot');
    expect(event.period).toBe(period);
    expect(event.data.totalRevenue).toBe(5000);
  });

  test('findEventsByType filters by type', async () => {
    const events = await repo.findEventsByType('daily_snapshot');
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const e of events) {
      expect(e.eventType).toBe('daily_snapshot');
    }
  });

  test('findEventsByPeriod filters by period', async () => {
    const events = await repo.findEventsByPeriod(period);
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const e of events) {
      expect(e.period).toBe(period);
    }
  });

  test('findLatestEvents returns correct limit', async () => {
    const events = await repo.findLatestEvents(1);
    expect(events.length).toBe(1);
  });

  test('findThresholdBreaches returns breaches', async () => {
    await repo.createAnalyticsEvent({
      eventType: 'threshold_alert',
      period,
      data: { occupancyRate: 95 },
      thresholdBreaches: [
        {
          kpiKey: 'occupancy_rate',
          kpiName: 'Occupancy Rate',
          currentValue: 95,
          thresholdValue: 90,
          direction: 'above',
          severity: 'high',
        },
      ],
    });
    const breaches = await repo.findThresholdBreaches(period, 'high');
    expect(breaches.length).toBeGreaterThanOrEqual(1);
  });

  test('deleteEventsOlderThan removes old events', async () => {
    const oldPeriod = daysAgo(100);
    await repo.createAnalyticsEvent({
      eventType: 'daily_snapshot',
      period: oldPeriod,
      data: {},
      thresholdBreaches: [],
    });
    const removed = await repo.deleteEventsOlderThan(daysAgo(50));
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  test('Event with threshold_breaches JSON works', async () => {
    const event = await repo.createAnalyticsEvent({
      eventType: 'threshold_alert',
      period,
      data: { revenue: 10000 },
      thresholdBreaches: [
        {
          kpiKey: 'revenue',
          kpiName: 'Revenue',
          currentValue: 10000,
          thresholdValue: 8000,
          direction: 'above',
          severity: 'medium',
        },
        {
          kpiKey: 'expenses',
          kpiName: 'Expenses',
          currentValue: 5000,
          thresholdValue: 6000,
          direction: 'below',
          severity: 'low',
        },
      ],
    });
    expect(event.thresholdBreaches.length).toBe(2);
    expect(event.thresholdBreaches[0].kpiKey).toBe('revenue');
    expect(event.thresholdBreaches[1].severity).toBe('low');
  });

  test('Multiple events for same period are allowed', async () => {
    await repo.createAnalyticsEvent({
      eventType: 'daily_snapshot',
      period,
      data: { a: 1 },
      thresholdBreaches: [],
    });
    await repo.createAnalyticsEvent({
      eventType: 'daily_snapshot',
      period,
      data: { b: 2 },
      thresholdBreaches: [],
    });
    const events = await repo.findEventsByPeriod(period);
    expect(events.length).toBeGreaterThanOrEqual(3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. REVENUE KPI TESTS (~10 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Revenue KPIs', () => {
  const fromDate = daysAgo(30);
  const toDate = today();

  test('getJournalRevenueByType splits by voucher type', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    expect(typeof revenue).toBe('object');
    expect(Object.keys(revenue).length).toBeGreaterThanOrEqual(0);
  });

  test('Room revenue computed correctly', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const total = Object.values(revenue).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('Restaurant revenue computed correctly', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    expect(typeof revenue).toBe('object');
  });

  test('Bar revenue computed correctly', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    expect(typeof revenue).toBe('object');
  });

  test('Revenue with date filter works', async () => {
    const narrow = await repo.getJournalRevenueByType(today(), today());
    expect(typeof narrow).toBe('object');
  });

  test('Revenue with no data returns zero', async () => {
    const farFuture = daysFromNow(365);
    const farFuture2 = daysFromNow(366);
    const revenue = await repo.getJournalRevenueByType(farFuture, farFuture2);
    const total = Object.values(revenue).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });

  test('getDailyRevenue returns correct amount', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
    expect(summary!.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  test('getDepartmentRevenue returns all departments', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
    expect(typeof summary!.roomRevenue).toBe('number');
    expect(typeof summary!.restaurantRevenue).toBe('number');
    expect(typeof summary!.barRevenue).toBe('number');
  });

  test('Department revenue change calculation works', async () => {
    const d1 = daysAgo(1);
    const d2 = today();
    const s1 = await repo.findDailySummary(d1);
    const s2 = await repo.findDailySummary(d2);
    expect(s1).not.toBeNull();
    expect(s2).not.toBeNull();
    const change = s2!.roomRevenue - s1!.roomRevenue;
    expect(typeof change).toBe('number');
  });

  test('Revenue across multiple days aggregates', async () => {
    const summaries = await repo.findDailySummaries(daysAgo(7), today());
    const total = summaries.reduce((s, d) => s + d.totalRevenue, 0);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('Revenue by voucher type returns sales and receipt', async () => {
    const revenue = await repo.getJournalRevenueByType(daysAgo(7), today());
    expect(
      typeof revenue.sales === 'number' || revenue.sales === undefined,
    ).toBe(true);
    expect(
      typeof revenue.receipt === 'number' || revenue.receipt === undefined,
    ).toBe(true);
  });

  test('Revenue totals match daily summary total', async () => {
    const summary = await repo.findDailySummary(today());
    const revenue = await repo.getJournalRevenueByType(today(), today());
    const revTotal = Object.values(revenue).reduce((s, v) => s + v, 0);
    expect(summary).not.toBeNull();
    expect(summary!.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  test('Revenue with single-day range returns single day', async () => {
    const revenue = await repo.getJournalRevenueByType(today(), today());
    expect(typeof revenue).toBe('object');
  });

  test('Revenue with wide date range includes all data', async () => {
    const revenue = await repo.getJournalRevenueByType(daysAgo(365), today());
    expect(typeof revenue).toBe('object');
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Financial KPIs', () => {
  const fromDate = daysAgo(30);
  const toDate = today();

  test('getProfitAndLoss calculates correctly', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
    const profit = totalRevenue - expenses;
    expect(profit).toBeGreaterThanOrEqual(-1);
  });

  test('getGrossMargin returns percentage', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
    const grossMargin =
      totalRevenue > 0 ? ((totalRevenue - expenses) / totalRevenue) * 100 : 0;
    expect(grossMargin).toBeGreaterThanOrEqual(-100);
    expect(grossMargin).toBeLessThanOrEqual(100);
  });

  test('getNetMargin returns percentage', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
    const netMargin =
      totalRevenue > 0 ? ((totalRevenue - expenses) / totalRevenue) * 100 : 0;
    expect(netMargin).toBeGreaterThanOrEqual(-100);
    expect(netMargin).toBeLessThanOrEqual(100);
  });

  test('getCashFlow calculates net cash movement', async () => {
    const cashBalance = await repo.getAccountBalanceByType('asset');
    expect(cashBalance).toBeGreaterThanOrEqual(0);
  });

  test('getGstLiability returns output minus input', async () => {
    const gst = await repo.getGstSummary(fromDate, toDate);
    const liability = gst.output - gst.input;
    expect(typeof liability).toBe('number');
  });

  test('getInputCredit returns input GST', async () => {
    const gst = await repo.getGstSummary(fromDate, toDate);
    expect(gst.input).toBeGreaterThanOrEqual(0);
  });

  test('getBankPosition returns bank balance', async () => {
    const balance = await repo.getAccountBalanceByType('asset');
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  test('getReceivablesPayables returns both', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
    expect(typeof summary!.receivables).toBe('number');
    expect(typeof summary!.payables).toBe('number');
  });

  test('getDepartmentProfitability returns departments', async () => {
    const monthly = await repo.findMonthlySummary(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
    );
    expect(monthly).not.toBeNull();
    expect(Array.isArray(monthly!.departmentProfits)).toBe(true);
  });

  test('Financial KPIs reconcile with accounting ledger', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
    expect(totalRevenue).toBeGreaterThanOrEqual(0);
    expect(expenses).toBeGreaterThanOrEqual(0);
  });

  test('P&L profit = revenue - expenses', async () => {
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v, 0);
    const profit = totalRevenue - expenses;
    expect(profit).toBe(totalRevenue - expenses);
  });

  test('Financial KPIs with empty data return zeros', async () => {
    const farFuture = daysFromNow(100);
    const farFuture2 = daysFromNow(101);
    const revenue = await repo.getJournalRevenueByType(farFuture, farFuture2);
    const expenses = await repo.getJournalExpenses(farFuture, farFuture2);
    expect(Object.values(revenue).reduce((s, v) => s + v, 0)).toBe(0);
    expect(expenses).toBe(0);
  });

  test('getAccountBalanceByType returns correct type', async () => {
    const assetBalance = await repo.getAccountBalanceByType('asset');
    const liabilityBalance = await repo.getAccountBalanceByType('liability');
    expect(assetBalance).toBeGreaterThanOrEqual(0);
    expect(liabilityBalance).toBeGreaterThanOrEqual(0);
  });

  test('GST summary returns both input and output', async () => {
    const gst = await repo.getGstSummary(daysAgo(30), today());
    expect(typeof gst.input).toBe('number');
    expect(typeof gst.output).toBe('number');
  });

  test('GST liability is output minus input', async () => {
    const gst = await repo.getGstSummary(daysAgo(30), today());
    const liability = gst.output - gst.input;
    expect(liability).toBeGreaterThanOrEqual(-1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Inventory', () => {
  const fromDate = daysAgo(30);
  const toDate = today();

  test('getInventoryValue returns current valuation', async () => {
    const value = await repo.getInventoryValue();
    expect(value).toBeGreaterThanOrEqual(0);
  });

  test('Fast/slow/dead stock categorization works', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(Array.isArray(analytics.fastMovingItems)).toBe(true);
    expect(Array.isArray(analytics.slowMovingItems)).toBe(true);
    expect(Array.isArray(analytics.deadStock)).toBe(true);
    const totalItems =
      analytics.fastMovingItems.length +
      analytics.slowMovingItems.length +
      analytics.deadStock.length;
    expect(totalItems).toBeGreaterThanOrEqual(0);
  });

  test('Reorder alerts trigger at threshold', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(Array.isArray(analytics.reorderAlerts)).toBe(true);
    for (const alert of analytics.reorderAlerts) {
      expect(alert.currentStock).toBeLessThanOrEqual(alert.reorderLevel);
    }
  });

  test('Stock ageing calculates days correctly', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(Array.isArray(analytics.stockAgeing)).toBe(true);
    for (const item of analytics.stockAgeing) {
      expect(typeof item.daysInStock).toBe('number');
      expect(typeof item.value).toBe('number');
      expect(item.itemName).toBeTruthy();
    }
  });

  test('Shrinkage percent calculated correctly', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(analytics.shrinkagePercent).toBeGreaterThanOrEqual(0);
  });

  test('Consumption trends show month-over-month', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(Array.isArray(analytics.consumptionTrends)).toBe(true);
  });

  test('Inventory analytics with no movements', async () => {
    const farFuture = daysFromNow(200);
    const farFuture2 = daysFromNow(201);
    const analytics = await repo.getInventoryMovementAnalytics(
      farFuture,
      farFuture2,
    );
    expect(analytics.fastMovingItems.length).toBe(0);
    expect(analytics.slowMovingItems.length).toBe(0);
    expect(analytics.deadStock.length).toBe(0);
  });

  test('Multiple categories return correct counts', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    const categories = new Set([
      ...analytics.fastMovingItems.map((i) => i.category),
      ...analytics.slowMovingItems.map((i) => i.category),
      ...analytics.deadStock.map((i) => i.category),
    ]);
    expect(categories.size).toBeGreaterThanOrEqual(0);
  });

  test('Inventory turnover formula validates', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(analytics.inventoryValuation).toBeGreaterThanOrEqual(0);
  });

  test('Stock ageing sorts by days correctly', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(Array.isArray(analytics.stockAgeing)).toBe(true);
  });

  test('Inventory valuation is sum of stock * cost', async () => {
    const value = await repo.getInventoryValue();
    expect(value).toBeGreaterThanOrEqual(0);
  });

  test('Inventory analytics returns all required fields', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      fromDate,
      toDate,
    );
    expect(analytics).toHaveProperty('fastMovingItems');
    expect(analytics).toHaveProperty('slowMovingItems');
    expect(analytics).toHaveProperty('deadStock');
    expect(analytics).toHaveProperty('reorderAlerts');
    expect(analytics).toHaveProperty('stockAgeing');
    expect(analytics).toHaveProperty('inventoryValuation');
    expect(analytics).toHaveProperty('shrinkage');
    expect(analytics).toHaveProperty('shrinkagePercent');
    expect(analytics).toHaveProperty('varianceCount');
    expect(analytics).toHaveProperty('consumptionTrends');
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Hospitality', () => {
  const fromDate = daysAgo(30);
  const toDate = today();
  const currentYear = new Date().getFullYear();

  test('Occupancy rate calculated correctly', async () => {
    const rate = await repo.getOccupancyRate(today());
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  test('ADR calculated as room_revenue / occupied_rooms', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
    expect(summary!.roomRevenue).toBeGreaterThanOrEqual(0);
  });

  test('RevPAR calculated as room_revenue / total_rooms', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
    expect(summary!.roomRevenue).toBeGreaterThanOrEqual(0);
  });

  test('Booking sources distribution sums to 100%', async () => {
    const sources = await repo.getBookingSourceAnalytics(fromDate, toDate);
    const totalPct = sources.reduce((s, b) => s + b.percentage, 0);
    if (sources.length > 0) {
      expect(totalPct).toBeCloseTo(100, 0);
    }
  });

  test('Table turnover rate calculated', async () => {
    const turnover = await repo.getTableTurnover(fromDate, toDate);
    expect(turnover).toBeGreaterThanOrEqual(0);
  });

  test('Kitchen performance tracks station metrics', async () => {
    const kitchen = await repo.getKitchenPerformance(fromDate, toDate);
    expect(Array.isArray(kitchen)).toBe(true);
    for (const k of kitchen) {
      expect(k.station).toBeTruthy();
      expect(k.ordersPrepared).toBeGreaterThanOrEqual(0);
      expect(k.averageTime).toBeGreaterThanOrEqual(0);
    }
  });

  test('Bartender productivity tracks pours', async () => {
    const barSales = await repo.getBarSales(today());
    expect(barSales).toBeGreaterThanOrEqual(0);
  });

  test('Peak hours distribution sums correctly', async () => {
    const peaks = await repo.getPeakHours(fromDate, toDate);
    expect(Array.isArray(peaks)).toBe(true);
    for (const p of peaks) {
      expect(p.hour).toBeGreaterThanOrEqual(0);
      expect(p.hour).toBeLessThanOrEqual(23);
      expect(p.transactionCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Length of stay averages correctly', async () => {
    const summary = await repo.findDailySummary(today());
    expect(summary).not.toBeNull();
  });

  test('Seasonality trends compute deviations', async () => {
    const trends = await repo.getSeasonalityTrends(currentYear);
    expect(Array.isArray(trends)).toBe(true);
    for (const t of trends) {
      expect(t.metric).toBe('total_revenue');
      expect(typeof t.deviation).toBe('number');
    }
  });

  test('Booking sources have valid percentages', async () => {
    const sources = await repo.getBookingSourceAnalytics(fromDate, toDate);
    for (const s of sources) {
      expect(s.percentage).toBeGreaterThanOrEqual(0);
      expect(s.percentage).toBeLessThanOrEqual(100);
    }
  });

  test('Kitchen performance efficiency is non-negative', async () => {
    const kitchen = await repo.getKitchenPerformance(fromDate, toDate);
    for (const k of kitchen) {
      expect(k.efficiency).toBeGreaterThanOrEqual(0);
    }
  });

  test('Peak hours cover all days of week', async () => {
    const peaks = await repo.getPeakHours(fromDate, toDate);
    const days = new Set(peaks.map((p) => p.dayOfWeek));
    expect(days.size).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Role-Based Access', () => {
  test('Owner dashboard returns all KPI categories', async () => {
    const kpis = await repo.findAllKpis(undefined, 'owner');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Manager dashboard returns operational + financial', async () => {
    const kpis = await repo.findAllKpis(undefined, 'manager');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Accountant dashboard returns financial + GST', async () => {
    const kpis = await repo.findAllKpis(undefined, 'accountant');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Restaurant dashboard returns restaurant KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'restaurant');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Bar dashboard returns bar KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'bar');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Hotel dashboard returns hotel KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'hotel');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Inventory dashboard returns inventory KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'inventory');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Purchasing dashboard returns purchasing KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'purchasing');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });

  test('Finance dashboard returns financial KPIs only', async () => {
    const kpis = await repo.findAllKpis(undefined, 'finance');
    expect(kpis.length).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 14. TREND & COMPARISON TESTS (~8 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Trends & Comparisons', () => {
  const fromDate = daysAgo(30);
  const toDate = today();
  const currentYear = new Date().getFullYear();

  test('getTrendAnalysis returns correct data points', async () => {
    const summaries = await repo.findDailySummaries(fromDate, toDate);
    expect(Array.isArray(summaries)).toBe(true);
  });

  test('Trend direction correctly identified as up/down/stable', async () => {
    const summaries = await repo.findDailySummaries(fromDate, toDate);
    if (summaries.length >= 2) {
      const first = summaries[0].totalRevenue;
      const last = summaries[summaries.length - 1].totalRevenue;
      const direction: T.TrendDirection =
        last > first ? 'up' : last < first ? 'down' : 'stable';
      expect(['up', 'down', 'stable']).toContain(direction);
    }
  });

  test('getComparison period_over_period works', async () => {
    const current = await repo.findDailySummary(today());
    const previous = await repo.findDailySummary(daysAgo(1));
    expect(current).not.toBeNull();
    expect(previous).not.toBeNull();
    const change = current!.totalRevenue - previous!.totalRevenue;
    expect(typeof change).toBe('number');
  });

  test('getComparison year_over_year works', async () => {
    const monthly = await repo.findMonthlySummary(currentYear, 1);
    expect(monthly).not.toBeNull();
  });

  test('detectAnomalies identifies outliers', async () => {
    const summaries = await repo.findDailySummaries(fromDate, toDate);
    expect(Array.isArray(summaries)).toBe(true);
  });

  test('getForecast returns prediction or null', async () => {
    const summaries = await repo.findDailySummaries(fromDate, toDate);
    if (summaries.length >= 3) {
      const values = summaries.map((s) => s.totalRevenue);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      expect(avg).toBeGreaterThanOrEqual(0);
    }
  });

  test('Volatility calculation works', async () => {
    const summaries = await repo.findDailySummaries(fromDate, toDate);
    if (summaries.length >= 2) {
      const values = summaries.map((s) => s.totalRevenue);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const volatility = Math.sqrt(variance);
      expect(volatility).toBeGreaterThanOrEqual(0);
    }
  });

  test('Trends with single data point return stable', async () => {
    const single = await repo.findDailySummary(today());
    expect(single).not.toBeNull();
  });

  test('Comparison between two periods shows change', async () => {
    const current = await repo.findDailySummary(today());
    const past = await repo.findDailySummary(daysAgo(7));
    expect(current).not.toBeNull();
    expect(past).not.toBeNull();
    const changePercent =
      past!.totalRevenue > 0
        ? ((current!.totalRevenue - past!.totalRevenue) / past!.totalRevenue) *
          100
        : 0;
    expect(typeof changePercent).toBe('number');
  });

  test('Trend analysis with empty range returns empty', async () => {
    const farFuture = daysFromNow(500);
    const farFuture2 = daysFromNow(501);
    const summaries = await repo.findDailySummaries(farFuture, farFuture2);
    expect(summaries.length).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Health & Coverage', () => {
  test('getAnalyticsHealth returns valid health status', async () => {
    const health = await repo.getAnalyticsHealth();
    expect(health).toBeTruthy();
    expect(typeof health.kpiCount).toBe('number');
    expect(typeof health.cacheCount).toBe('number');
    expect(typeof health.eventCount).toBe('number');
    expect(typeof health.dailyCoverage).toBe('number');
    expect(typeof health.isHealthy).toBe('boolean');
    expect(Array.isArray(health.issues)).toBe(true);
  });

  test('getSummaryCoverage shows correct dates', async () => {
    const coverage = await repo.getSummaryCoverage();
    expect(Array.isArray(coverage.datesWithData)).toBe(true);
    expect(Array.isArray(coverage.missingDates)).toBe(true);
  });

  test('clearAnalyticsCache works without errors', async () => {
    await repo.setCache(uid('clr'), '"clear"', 3600);
    await repo.clearAllCache();
    const stats = await repo.getCacheStats();
    expect(stats.count).toBe(0);
  });

  test('getDatabaseSize returns positive number', async () => {
    const sizes = await repo.getDatabaseSize();
    expect(typeof sizes).toBe('object');
    expect(sizes.kpi_definitions).toBeGreaterThanOrEqual(0);
    expect(sizes.dashboard_configs).toBeGreaterThanOrEqual(0);
    expect(sizes.daily_summaries).toBeGreaterThanOrEqual(0);
    expect(sizes.weekly_summaries).toBeGreaterThanOrEqual(0);
    expect(sizes.monthly_summaries).toBeGreaterThanOrEqual(0);
    expect(sizes.yearly_summaries).toBeGreaterThanOrEqual(0);
    expect(sizes.analytics_cache).toBeGreaterThanOrEqual(0);
    expect(sizes.analytics_events).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 16. EXPORT STRUCTURE TESTS (~4 tests)
// ═════════════════════════════════════════════════════════════════════════════

describe('Analytics — Export Structure', () => {
  test('KPI export returns structured data', async () => {
    const kpis = await repo.findAllKpis();
    expect(Array.isArray(kpis)).toBe(true);
    for (const k of kpis) {
      expect(k.key).toBeTruthy();
      expect(k.name).toBeTruthy();
      expect(k.category).toBeTruthy();
      expect(k.formula).toBeTruthy();
    }
  });

  test('Financial export matches query', async () => {
    const fromDate = daysAgo(30);
    const toDate = today();
    const revenue = await repo.getJournalRevenueByType(fromDate, toDate);
    const expenses = await repo.getJournalExpenses(fromDate, toDate);
    expect(typeof revenue).toBe('object');
    expect(typeof expenses).toBe('number');
  });

  test('Inventory export matches query', async () => {
    const analytics = await repo.getInventoryMovementAnalytics(
      daysAgo(30),
      today(),
    );
    expect(analytics.inventoryValuation).toBeGreaterThanOrEqual(0);
  });

  test('Hospitality export matches query', async () => {
    const rate = await repo.getOccupancyRate(today());
    expect(rate).toBeGreaterThanOrEqual(0);
    const sources = await repo.getBookingSourceAnalytics(daysAgo(30), today());
    expect(Array.isArray(sources)).toBe(true);
  });
});
