import { query, run } from '../../db';
import * as T from './analytics.types';

function rowToKpiDefinition(row: any): T.KpiDefinition {
  let roles: T.DashboardRole[] = [];
  try {
    roles = JSON.parse(row.roles || '[]');
  } catch {
    roles = [];
  }
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description || '',
    category: row.category,
    formula: row.formula,
    unit: row.unit,
    decimalPlaces: Number(row.decimal_places ?? 2),
    isPercentage: Boolean(row.is_percentage ?? false),
    higherIsBetter: Boolean(row.higher_is_better ?? true),
    minRefreshInterval: Number(row.min_refresh_interval ?? 300),
    roles,
  };
}

function rowToDashboardConfig(row: any): T.DashboardConfig {
  let sections: T.DashboardSection[] = [];
  try {
    sections = JSON.parse(row.config || '{}').sections || [];
  } catch {
    sections = [];
  }
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    description: row.description || '',
    sections,
    refreshInterval: Number(row.refresh_interval ?? 60),
  };
}

function rowToDailySummary(row: any): T.DailySummary {
  return {
    date: row.date,
    totalRevenue: Number(row.total_revenue || 0),
    roomRevenue: Number(row.room_revenue || 0),
    restaurantRevenue: Number(row.restaurant_revenue || 0),
    barRevenue: Number(row.bar_revenue || 0),
    otherRevenue: Number(row.other_revenue || 0),
    totalExpenses: Number(row.total_expenses || 0),
    grossProfit: Number(row.gross_profit || 0),
    netProfit: Number(row.net_profit || 0),
    occupancyRate: Number(row.occupancy_rate || 0),
    restaurantCovers: Number(row.restaurant_covers || 0),
    averageBill: Number(row.average_bill || 0),
    barSales: Number(row.bar_sales || 0),
    cashBalance: Number(row.cash_balance || 0),
    bankBalance: Number(row.bank_balance || 0),
    receivables: Number(row.receivables || 0),
    payables: Number(row.payables || 0),
    gstPayable: Number(row.gst_payable || 0),
    gstInputCredit: Number(row.gst_input_credit || 0),
    inventoryValue: Number(row.inventory_value || 0),
    createdAt: row.created_at || '',
  };
}

function rowToWeeklySummary(row: any): T.WeeklySummary {
  const ds = rowToDailySummary(row);
  return {
    ...ds,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    weekNumber: Number(row.week_number),
    year: Number(row.year),
  };
}

function rowToMonthlySummary(row: any): T.MonthlySummary {
  const months = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  let departmentProfits: T.DepartmentProfit[] = [];
  try {
    departmentProfits = JSON.parse(row.department_profits || '[]');
  } catch {
    departmentProfits = [];
  }
  return {
    year: Number(row.year),
    month: Number(row.month),
    monthName: months[Number(row.month)] || '',
    totalRevenue: Number(row.total_revenue || 0),
    roomRevenue: Number(row.room_revenue || 0),
    restaurantRevenue: Number(row.restaurant_revenue || 0),
    barRevenue: Number(row.bar_revenue || 0),
    otherRevenue: Number(row.other_revenue || 0),
    costOfGoodsSold: Number(row.cost_of_goods_sold || 0),
    grossProfit: Number(row.gross_profit || 0),
    grossMargin: Number(row.gross_margin || 0),
    totalExpenses: Number(row.total_expenses || 0),
    netProfit: Number(row.net_profit || 0),
    netMargin: Number(row.net_margin || 0),
    occupancyRate: Number(row.occupancy_rate || 0),
    adr: Number(row.adr || 0),
    revpar: Number(row.revpar || 0),
    restaurantCovers: Number(row.restaurant_covers || 0),
    averageBill: Number(row.average_bill || 0),
    barSales: Number(row.bar_sales || 0),
    inventoryTurnover: Number(row.inventory_turnover || 0),
    gstPayable: Number(row.gst_payable || 0),
    gstInputCredit: Number(row.gst_input_credit || 0),
    cashFlow: Number(row.cash_flow || 0),
    receivables: Number(row.receivables || 0),
    payables: Number(row.payables || 0),
    cashPosition: Number(row.cash_position || 0),
    bankPosition: Number(row.bank_position || 0),
    wastePercent: Number(row.waste_percent || 0),
    complimentaryPercent: Number(row.complimentary_percent || 0),
    cancellationPercent: Number(row.cancellation_percent || 0),
    refundPercent: Number(row.refund_percent || 0),
    departmentProfits,
    createdAt: row.created_at || '',
  };
}

function rowToYearlySummary(row: any): T.YearlySummary {
  const ms = rowToMonthlySummary(row);
  return {
    ...ms,
    year: Number(row.year),
    monthlyBreakdown: [],
  };
}

function rowToAnalyticsCache(row: any): T.AnalyticsCache {
  return {
    id: row.id,
    cacheKey: row.cache_key,
    data: row.data,
    expiresAt: row.expires_at,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToAnalyticsEvent(row: any): T.AnalyticsEvent {
  let data: Record<string, number> = {};
  let thresholdBreaches: T.ThresholdBreach[] = [];
  try {
    data = JSON.parse(row.data || '{}');
  } catch {
    data = {};
  }
  try {
    thresholdBreaches = JSON.parse(row.threshold_breaches || '[]');
  } catch {
    thresholdBreaches = [];
  }
  return {
    id: row.id,
    eventType: row.event_type,
    period: row.period,
    data,
    generatedAt: row.generated_at || '',
    thresholdBreaches,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function now(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

const REVENUE_VOUCHER_TYPES = ['sales', 'receipt'];
const EXPENSE_VOUCHER_TYPES = ['payment', 'journal', 'adjustment'];
const REVENUE_KINDS = ['sale', 'consumption'];
const TABLE_NAMES = [
  'kpi_definitions',
  'dashboard_configs',
  'daily_summaries',
  'weekly_summaries',
  'monthly_summaries',
  'yearly_summaries',
  'analytics_cache',
  'analytics_events',
];

export const AnalyticsRepository = {
  // ════════════════════════════════════════════════════════════════════════
  // KPI DEFINITIONS
  // ════════════════════════════════════════════════════════════════════════

  async createKpiDefinition(
    def: Omit<T.KpiDefinition, 'id'>,
  ): Promise<T.KpiDefinition> {
    const id = uid('kpi');
    await run(
      `INSERT INTO kpi_definitions (id, key, name, description, category, formula, unit, decimal_places, is_percentage, higher_is_better, min_refresh_interval, roles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        def.key,
        def.name,
        def.description,
        def.category,
        def.formula,
        def.unit,
        def.decimalPlaces,
        def.isPercentage ? 1 : 0,
        def.higherIsBetter ? 1 : 0,
        def.minRefreshInterval,
        JSON.stringify(def.roles),
      ],
    );
    const rows = await query('SELECT * FROM kpi_definitions WHERE id = ?', [
      id,
    ]);
    return rowToKpiDefinition(rows[0]);
  },

  async findKpiByKey(key: string): Promise<T.KpiDefinition | null> {
    const rows = await query('SELECT * FROM kpi_definitions WHERE key = ?', [
      key,
    ]);
    return rows.length ? rowToKpiDefinition(rows[0]) : null;
  },

  async findAllKpis(
    category?: T.KpiCategory,
    role?: T.DashboardRole,
  ): Promise<T.KpiDefinition[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (role) {
      conditions.push('roles LIKE ?');
      params.push(`%"${role}"%`);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const rows = await query(
      `SELECT * FROM kpi_definitions ${where} ORDER BY category, name`,
      params,
    );
    return rows.map(rowToKpiDefinition);
  },

  async updateKpiDefinition(
    id: string,
    updates: Partial<T.KpiDefinition>,
  ): Promise<T.KpiDefinition> {
    const existing = await query('SELECT * FROM kpi_definitions WHERE id = ?', [
      id,
    ]);
    if (!existing.length) throw new Error(`KPI definition not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.key !== undefined) {
      sets.push('key = ?');
      params.push(updates.key);
    }
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description);
    }
    if (updates.category !== undefined) {
      sets.push('category = ?');
      params.push(updates.category);
    }
    if (updates.formula !== undefined) {
      sets.push('formula = ?');
      params.push(updates.formula);
    }
    if (updates.unit !== undefined) {
      sets.push('unit = ?');
      params.push(updates.unit);
    }
    if (updates.decimalPlaces !== undefined) {
      sets.push('decimal_places = ?');
      params.push(updates.decimalPlaces);
    }
    if (updates.isPercentage !== undefined) {
      sets.push('is_percentage = ?');
      params.push(updates.isPercentage ? 1 : 0);
    }
    if (updates.higherIsBetter !== undefined) {
      sets.push('higher_is_better = ?');
      params.push(updates.higherIsBetter ? 1 : 0);
    }
    if (updates.minRefreshInterval !== undefined) {
      sets.push('min_refresh_interval = ?');
      params.push(updates.minRefreshInterval);
    }
    if (updates.roles !== undefined) {
      sets.push('roles = ?');
      params.push(JSON.stringify(updates.roles));
    }
    if (sets.length) {
      params.push(id);
      await run(
        `UPDATE kpi_definitions SET ${sets.join(', ')} WHERE id = ?`,
        params,
      );
    }
    const rows = await query('SELECT * FROM kpi_definitions WHERE id = ?', [
      id,
    ]);
    return rowToKpiDefinition(rows[0]);
  },

  async deleteKpiDefinition(id: string): Promise<void> {
    await run('DELETE FROM kpi_definitions WHERE id = ?', [id]);
  },

  async getKpiCount(): Promise<number> {
    const rows = await query('SELECT COUNT(*) as cnt FROM kpi_definitions');
    return Number(rows[0]?.cnt || 0);
  },

  // ════════════════════════════════════════════════════════════════════════
  // DASHBOARD CONFIGS
  // ════════════════════════════════════════════════════════════════════════

  async createDashboardConfig(
    config: Omit<T.DashboardConfig, 'id'>,
  ): Promise<T.DashboardConfig> {
    const id = uid('dbc');
    const configData = JSON.stringify({ sections: config.sections });
    await run(
      `INSERT INTO dashboard_configs (id, role, name, description, config, refresh_interval)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        config.role,
        config.name,
        config.description,
        configData,
        config.refreshInterval,
      ],
    );
    const rows = await query('SELECT * FROM dashboard_configs WHERE id = ?', [
      id,
    ]);
    return rowToDashboardConfig(rows[0]);
  },

  async findDashboardByRole(
    role: T.DashboardRole,
  ): Promise<T.DashboardConfig | null> {
    const rows = await query('SELECT * FROM dashboard_configs WHERE role = ?', [
      role,
    ]);
    return rows.length ? rowToDashboardConfig(rows[0]) : null;
  },

  async findAllDashboardConfigs(): Promise<T.DashboardConfig[]> {
    const rows = await query(
      'SELECT * FROM dashboard_configs ORDER BY role ASC',
    );
    return rows.map(rowToDashboardConfig);
  },

  async updateDashboardConfig(
    id: string,
    updates: Partial<T.DashboardConfig>,
  ): Promise<T.DashboardConfig> {
    const existing = await query(
      'SELECT * FROM dashboard_configs WHERE id = ?',
      [id],
    );
    if (!existing.length) throw new Error(`Dashboard config not found: ${id}`);
    const sets: string[] = [];
    const params: any[] = [];
    if (updates.role !== undefined) {
      sets.push('role = ?');
      params.push(updates.role);
    }
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      params.push(updates.description);
    }
    if (updates.sections !== undefined) {
      sets.push('config = ?');
      params.push(JSON.stringify({ sections: updates.sections }));
    }
    if (updates.refreshInterval !== undefined) {
      sets.push('refresh_interval = ?');
      params.push(updates.refreshInterval);
    }
    sets.push('updated_at = ?');
    params.push(now(), id);
    if (sets.length > 1) {
      await run(
        `UPDATE dashboard_configs SET ${sets.join(', ')} WHERE id = ?`,
        params,
      );
    }
    const rows = await query('SELECT * FROM dashboard_configs WHERE id = ?', [
      id,
    ]);
    return rowToDashboardConfig(rows[0]);
  },

  async deleteDashboardConfig(id: string): Promise<void> {
    await run('DELETE FROM dashboard_configs WHERE id = ?', [id]);
  },

  // ════════════════════════════════════════════════════════════════════════
  // DAILY SUMMARIES — COMPUTE + UPSERT
  // ════════════════════════════════════════════════════════════════════════

  async computeAndSaveDailySummary(date: string): Promise<T.DailySummary> {
    const roomRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales', 'receipt') AND date(entry_date)=?
       AND (reference_type='hotel_check_out' OR reference_type='room_booking' OR reference_type IS NULL)`,
      [date],
    );
    const restaurantRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales', 'receipt') AND date(entry_date)=?
       AND reference_type='restaurant_sale'`,
      [date],
    );
    const barRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales', 'receipt') AND date(entry_date)=?
       AND reference_type='bar_sale'`,
      [date],
    );
    const totalExp = await query(
      `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('payment', 'journal', 'adjustment') AND date(entry_date)=?`,
      [date],
    );

    const roomRevVal = Number(roomRev[0]?.val || 0);
    const restaurantRevVal = Number(restaurantRev[0]?.val || 0);
    const barRevVal = Number(barRev[0]?.val || 0);
    const totalExpVal = Number(totalExp[0]?.val || 0);
    const otherRevVal = 0;
    const totalRev = roomRevVal + restaurantRevVal + barRevVal + otherRevVal;

    const occupiedRooms = await query(
      "SELECT COUNT(*) as cnt FROM rooms WHERE status='occupied'",
    );
    const totalRooms = await query('SELECT COUNT(*) as cnt FROM rooms');
    const occRate =
      safeDivide(
        Number(occupiedRooms[0]?.cnt || 0),
        Number(totalRooms[0]?.cnt || 1),
      ) * 100;

    const restaurantCovers = await query(
      `SELECT COALESCE(SUM(guest_count), 0) as cnt FROM restaurant_orders
       WHERE date(created_at)=? AND status IN ('served', 'completed', 'paid')`,
      [date],
    );
    const covers = Number(restaurantCovers[0]?.cnt || 0);

    const barSales = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as val FROM bar_sales
       WHERE date(created_at)=? AND status='completed'`,
      [date],
    );
    const barSalesVal = Number(barSales[0]?.val || 0);

    const cashBalance = await query(
      `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
       WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='cash' OR name LIKE '%cash%')`,
    );
    const bankBalance = await query(
      `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
       WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='bank' OR name LIKE '%bank%')`,
    );
    const receivables = await query(
      `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
       WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='receivable' OR name LIKE '%receivable%')`,
    );
    const payables = await query(
      `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
       WHERE account_type='liability' AND is_active=1 AND is_group=0 AND (account_sub_type='payable' OR name LIKE '%payable%')`,
    );

    const gstPayable = await query(
      `SELECT COALESCE(SUM(gst_amount), 0) as val FROM gst_registers WHERE gst_type='output' AND strftime('%Y-%m-%d', created_at)=?`,
      [date],
    );
    const gstInput = await query(
      `SELECT COALESCE(SUM(gst_amount), 0) as val FROM gst_registers WHERE gst_type='input' AND strftime('%Y-%m-%d', created_at)=?`,
      [date],
    );

    const invVal = await query(
      `SELECT COALESCE(SUM(stock * cost), 0) as val FROM inventory WHERE is_active=1`,
    );

    const averageBill = covers > 0 ? round2(restaurantRevVal / covers) : 0;
    const grossProfit = totalRev - totalExpVal;
    const netProfit = grossProfit;

    const id = uid('ds');
    const ts = now();
    await run(
      `INSERT OR REPLACE INTO daily_summaries
       (id, date, total_revenue, room_revenue, restaurant_revenue, bar_revenue, other_revenue,
        total_expenses, gross_profit, net_profit, occupancy_rate, restaurant_covers, average_bill,
        bar_sales, cash_balance, bank_balance, receivables, payables, gst_payable, gst_input_credit,
        inventory_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        date,
        totalRev,
        roomRevVal,
        restaurantRevVal,
        barRevVal,
        otherRevVal,
        totalExpVal,
        grossProfit,
        netProfit,
        round2(occRate),
        covers,
        averageBill,
        barSalesVal,
        round2(Number(cashBalance[0]?.val || 0)),
        round2(Number(bankBalance[0]?.val || 0)),
        round2(Number(receivables[0]?.val || 0)),
        round2(Number(payables[0]?.val || 0)),
        round2(Number(gstPayable[0]?.val || 0)),
        round2(Number(gstInput[0]?.val || 0)),
        round2(Number(invVal[0]?.val || 0)),
        ts,
        ts,
      ],
    );

    const rows = await query('SELECT * FROM daily_summaries WHERE date = ?', [
      date,
    ]);
    return rowToDailySummary(rows[0]);
  },

  async findDailySummary(date: string): Promise<T.DailySummary | null> {
    const rows = await query('SELECT * FROM daily_summaries WHERE date = ?', [
      date,
    ]);
    return rows.length ? rowToDailySummary(rows[0]) : null;
  },

  async findDailySummaries(
    fromDate: string,
    toDate: string,
  ): Promise<T.DailySummary[]> {
    const rows = await query(
      'SELECT * FROM daily_summaries WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [fromDate, toDate],
    );
    return rows.map(rowToDailySummary);
  },

  async findLatestDailySummary(): Promise<T.DailySummary | null> {
    const rows = await query(
      'SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 1',
    );
    return rows.length ? rowToDailySummary(rows[0]) : null;
  },

  async deleteDailySummary(date: string): Promise<void> {
    await run('DELETE FROM daily_summaries WHERE date = ?', [date]);
  },

  // ════════════════════════════════════════════════════════════════════════
  // WEEKLY SUMMARIES
  // ════════════════════════════════════════════════════════════════════════

  async computeAndSaveWeeklySummary(
    weekStart: string,
    weekEnd: string,
  ): Promise<T.WeeklySummary> {
    const rows = await query(
      `SELECT
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(room_revenue), 0) as room_revenue,
        COALESCE(SUM(restaurant_revenue), 0) as restaurant_revenue,
        COALESCE(SUM(bar_revenue), 0) as bar_revenue,
        COALESCE(SUM(other_revenue), 0) as other_revenue,
        COALESCE(SUM(total_expenses), 0) as total_expenses,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COALESCE(SUM(net_profit), 0) as net_profit,
        AVG(occupancy_rate) as occupancy_rate,
        COALESCE(SUM(restaurant_covers), 0) as restaurant_covers,
        COALESCE(SUM(restaurant_revenue), 0) / CASE WHEN SUM(restaurant_covers) > 0 THEN SUM(restaurant_covers) ELSE 1 END as average_bill,
        COALESCE(SUM(bar_sales), 0) as bar_sales,
        AVG(cash_balance) as cash_balance,
        AVG(bank_balance) as bank_balance,
        AVG(receivables) as receivables,
        AVG(payables) as payables,
        COALESCE(SUM(gst_payable), 0) as gst_payable,
        COALESCE(SUM(gst_input_credit), 0) as gst_input_credit,
        AVG(inventory_value) as inventory_value
       FROM daily_summaries WHERE date >= ? AND date <= ?`,
      [weekStart, weekEnd],
    );
    const agg = rows[0];
    const startDate = new Date(weekStart);
    const weekNumber = Math.ceil(
      (startDate.getTime() -
        new Date(startDate.getFullYear(), 0, 1).getTime()) /
        (7 * 86400000),
    );
    const year = startDate.getFullYear();
    const id = uid('ws');
    const avgBill =
      Number(agg.restaurant_covers || 0) > 0
        ? round2(
            Number(agg.restaurant_revenue || 0) /
              Number(agg.restaurant_covers || 1),
          )
        : 0;

    await run(
      `INSERT OR REPLACE INTO weekly_summaries
       (id, week_start, week_end, week_number, year, total_revenue, room_revenue, restaurant_revenue,
        bar_revenue, other_revenue, total_expenses, gross_profit, net_profit, occupancy_rate,
        restaurant_covers, average_bill, bar_sales, cash_balance, bank_balance, receivables,
        payables, gst_payable, gst_input_credit, inventory_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        weekStart,
        weekEnd,
        weekNumber,
        year,
        round2(Number(agg.total_revenue || 0)),
        round2(Number(agg.room_revenue || 0)),
        round2(Number(agg.restaurant_revenue || 0)),
        round2(Number(agg.bar_revenue || 0)),
        round2(Number(agg.other_revenue || 0)),
        round2(Number(agg.total_expenses || 0)),
        round2(Number(agg.gross_profit || 0)),
        round2(Number(agg.net_profit || 0)),
        round2(Number(agg.occupancy_rate || 0)),
        Number(agg.restaurant_covers || 0),
        avgBill,
        round2(Number(agg.bar_sales || 0)),
        round2(Number(agg.cash_balance || 0)),
        round2(Number(agg.bank_balance || 0)),
        round2(Number(agg.receivables || 0)),
        round2(Number(agg.payables || 0)),
        round2(Number(agg.gst_payable || 0)),
        round2(Number(agg.gst_input_credit || 0)),
        round2(Number(agg.inventory_value || 0)),
      ],
    );

    const result = await query(
      'SELECT * FROM weekly_summaries WHERE week_start = ? AND week_end = ?',
      [weekStart, weekEnd],
    );
    return rowToWeeklySummary(result[0]);
  },

  async findWeeklySummary(
    weekStart: string,
    weekEnd: string,
  ): Promise<T.WeeklySummary | null> {
    const rows = await query(
      'SELECT * FROM weekly_summaries WHERE week_start = ? AND week_end = ?',
      [weekStart, weekEnd],
    );
    return rows.length ? rowToWeeklySummary(rows[0]) : null;
  },

  async findWeeklySummaries(year: number): Promise<T.WeeklySummary[]> {
    const rows = await query(
      'SELECT * FROM weekly_summaries WHERE year = ? ORDER BY week_start ASC',
      [year],
    );
    return rows.map(rowToWeeklySummary);
  },

  async findLatestWeeklySummary(): Promise<T.WeeklySummary | null> {
    const rows = await query(
      'SELECT * FROM weekly_summaries ORDER BY week_start DESC LIMIT 1',
    );
    return rows.length ? rowToWeeklySummary(rows[0]) : null;
  },

  async deleteWeeklySummary(weekStart: string, weekEnd: string): Promise<void> {
    await run(
      'DELETE FROM weekly_summaries WHERE week_start = ? AND week_end = ?',
      [weekStart, weekEnd],
    );
  },

  // ════════════════════════════════════════════════════════════════════════
  // MONTHLY SUMMARIES
  // ════════════════════════════════════════════════════════════════════════

  async computeAndSaveMonthlySummary(
    year: number,
    month: number,
  ): Promise<T.MonthlySummary> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const rows = await query(
      `SELECT
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(room_revenue), 0) as room_revenue,
        COALESCE(SUM(restaurant_revenue), 0) as restaurant_revenue,
        COALESCE(SUM(bar_revenue), 0) as bar_revenue,
        COALESCE(SUM(other_revenue), 0) as other_revenue,
        COALESCE(SUM(total_expenses), 0) as total_expenses,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COALESCE(SUM(net_profit), 0) as net_profit,
        AVG(occupancy_rate) as occupancy_rate,
        COALESCE(SUM(restaurant_covers), 0) as restaurant_covers,
        COALESCE(SUM(bar_sales), 0) as bar_sales,
        AVG(cash_balance) as cash_balance,
        AVG(bank_balance) as bank_balance,
        AVG(receivables) as receivables,
        AVG(payables) as payables,
        COALESCE(SUM(gst_payable), 0) as gst_payable,
        COALESCE(SUM(gst_input_credit), 0) as gst_input_credit,
        AVG(inventory_value) as inventory_value
       FROM daily_summaries WHERE strftime('%Y-%m', date) = ?`,
      [monthStr],
    );
    const agg = rows[0];

    const cogs = await query(
      `SELECT COALESCE(SUM(total_cost), 0) as val FROM purchase_orders
       WHERE strftime('%Y-%m', order_date) = ? AND status IN ('received', 'invoiced', 'closed')`,
      [monthStr],
    );
    const cogsVal = Number(cogs[0]?.val || 0);

    const totalRevenue = Number(agg.total_revenue || 0);
    const grossProfit = Number(agg.gross_profit || 0);
    const netProfit = Number(agg.net_profit || 0);
    const occupancyRate = Number(agg.occupancy_rate || 0);
    const roomRevenue = Number(agg.room_revenue || 0);
    const restaurantCovers = Number(agg.restaurant_covers || 0);
    const averageBill =
      restaurantCovers > 0
        ? round2(Number(agg.restaurant_revenue || 0) / restaurantCovers)
        : 0;

    const daysInMonth = new Date(year, month, 0).getDate();
    const occupiedRoomNights = round2(
      (occupancyRate / 100) * ((30 * daysInMonth) / 30),
    );
    const availableRoomNights = (30 * daysInMonth) / 30;

    const grossMargin = safeDivide(grossProfit, totalRevenue) * 100;
    const netMargin = safeDivide(netProfit, totalRevenue) * 100;
    const adr = safeDivide(roomRevenue, occupiedRoomNights);
    const revpar = safeDivide(roomRevenue, availableRoomNights);
    const avgInv = Number(agg.inventory_value || 0);
    const inventoryTurnover = avgInv > 0 ? safeDivide(cogsVal, avgInv) : 0;

    const cashFlow =
      Number(agg.bank_balance || 0) - Number(agg.cash_balance || 0);
    const wastePercent = 0;
    const complimentaryPercent = 0;
    const cancellationPercent = 0;
    const refundPercent = 0;

    const departmentProfits: T.DepartmentProfit[] = [
      {
        department: 'rooms',
        revenue: Number(agg.room_revenue || 0),
        cost: 0,
        grossProfit: Number(agg.room_revenue || 0),
        grossMargin: 100,
        expenses: 0,
        netProfit: Number(agg.room_revenue || 0),
        netMargin: 100,
      },
      {
        department: 'restaurant',
        revenue: Number(agg.restaurant_revenue || 0),
        cost: round2(cogsVal * 0.6),
        grossProfit: round2(
          Number(agg.restaurant_revenue || 0) - cogsVal * 0.6,
        ),
        grossMargin:
          safeDivide(
            Number(agg.restaurant_revenue || 0) - cogsVal * 0.6,
            Number(agg.restaurant_revenue || 1),
          ) * 100,
        expenses: 0,
        netProfit: Number(agg.restaurant_revenue || 0),
        netMargin: 100,
      },
      {
        department: 'bar',
        revenue: Number(agg.bar_revenue || 0),
        cost: round2(cogsVal * 0.3),
        grossProfit: round2(Number(agg.bar_revenue || 0) - cogsVal * 0.3),
        grossMargin:
          safeDivide(
            Number(agg.bar_revenue || 0) - cogsVal * 0.3,
            Number(agg.bar_revenue || 1),
          ) * 100,
        expenses: 0,
        netProfit: Number(agg.bar_revenue || 0),
        netMargin: 100,
      },
    ];

    const id = uid('ms');
    await run(
      `INSERT OR REPLACE INTO monthly_summaries
       (id, year, month, total_revenue, room_revenue, restaurant_revenue, bar_revenue, other_revenue,
        cost_of_goods_sold, gross_profit, gross_margin, total_expenses, net_profit, net_margin,
        occupancy_rate, adr, revpar, restaurant_covers, average_bill, bar_sales, inventory_turnover,
        gst_payable, gst_input_credit, cash_flow, receivables, payables, cash_position, bank_position,
        waste_percent, complimentary_percent, cancellation_percent, refund_percent, department_profits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        year,
        month,
        round2(totalRevenue),
        round2(Number(agg.room_revenue || 0)),
        round2(Number(agg.restaurant_revenue || 0)),
        round2(Number(agg.bar_revenue || 0)),
        round2(Number(agg.other_revenue || 0)),
        round2(cogsVal),
        round2(grossProfit),
        round2(grossMargin),
        round2(Number(agg.total_expenses || 0)),
        round2(netProfit),
        round2(netMargin),
        round2(occupancyRate),
        round2(adr),
        round2(revpar),
        restaurantCovers,
        averageBill,
        round2(Number(agg.bar_sales || 0)),
        round2(inventoryTurnover),
        round2(Number(agg.gst_payable || 0)),
        round2(Number(agg.gst_input_credit || 0)),
        round2(cashFlow),
        round2(Number(agg.receivables || 0)),
        round2(Number(agg.payables || 0)),
        round2(Number(agg.cash_balance || 0)),
        round2(Number(agg.bank_balance || 0)),
        round2(wastePercent),
        round2(complimentaryPercent),
        round2(cancellationPercent),
        round2(refundPercent),
        JSON.stringify(departmentProfits),
      ],
    );

    const result = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? AND month = ?',
      [year, month],
    );
    return rowToMonthlySummary(result[0]);
  },

  async findMonthlySummary(
    year: number,
    month: number,
  ): Promise<T.MonthlySummary | null> {
    const rows = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? AND month = ?',
      [year, month],
    );
    return rows.length ? rowToMonthlySummary(rows[0]) : null;
  },

  async findMonthlySummaries(year: number): Promise<T.MonthlySummary[]> {
    const rows = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? ORDER BY month ASC',
      [year],
    );
    return rows.map(rowToMonthlySummary);
  },

  async findLatestMonthlySummary(): Promise<T.MonthlySummary | null> {
    const rows = await query(
      'SELECT * FROM monthly_summaries ORDER BY year DESC, month DESC LIMIT 1',
    );
    return rows.length ? rowToMonthlySummary(rows[0]) : null;
  },

  async findMonthlySummariesRange(
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
  ): Promise<T.MonthlySummary[]> {
    const rows = await query(
      `SELECT * FROM monthly_summaries
       WHERE (year > ? OR (year = ? AND month >= ?))
         AND (year < ? OR (year = ? AND month <= ?))
       ORDER BY year ASC, month ASC`,
      [fromYear, fromYear, fromMonth, toYear, toYear, toMonth],
    );
    return rows.map(rowToMonthlySummary);
  },

  async deleteMonthlySummary(year: number, month: number): Promise<void> {
    await run('DELETE FROM monthly_summaries WHERE year = ? AND month = ?', [
      year,
      month,
    ]);
  },

  // ════════════════════════════════════════════════════════════════════════
  // YEARLY SUMMARIES
  // ════════════════════════════════════════════════════════════════════════

  async computeAndSaveYearlySummary(year: number): Promise<T.YearlySummary> {
    const rows = await query(
      `SELECT
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(room_revenue), 0) as room_revenue,
        COALESCE(SUM(restaurant_revenue), 0) as restaurant_revenue,
        COALESCE(SUM(bar_revenue), 0) as bar_revenue,
        COALESCE(SUM(other_revenue), 0) as other_revenue,
        COALESCE(SUM(cost_of_goods_sold), 0) as cost_of_goods_sold,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        AVG(gross_margin) as gross_margin,
        COALESCE(SUM(total_expenses), 0) as total_expenses,
        COALESCE(SUM(net_profit), 0) as net_profit,
        AVG(net_margin) as net_margin,
        AVG(occupancy_rate) as occupancy_rate,
        AVG(adr) as adr,
        AVG(revpar) as revpar,
        COALESCE(SUM(restaurant_covers), 0) as restaurant_covers,
        AVG(average_bill) as average_bill,
        COALESCE(SUM(bar_sales), 0) as bar_sales,
        AVG(inventory_turnover) as inventory_turnover,
        COALESCE(SUM(gst_payable), 0) as gst_payable,
        COALESCE(SUM(gst_input_credit), 0) as gst_input_credit,
        COALESCE(SUM(cash_flow), 0) as cash_flow,
        AVG(receivables) as receivables,
        AVG(payables) as payables,
        AVG(cash_position) as cash_position,
        AVG(bank_position) as bank_position,
        AVG(waste_percent) as waste_percent,
        AVG(complimentary_percent) as complimentary_percent,
        AVG(cancellation_percent) as cancellation_percent,
        AVG(refund_percent) as refund_percent
       FROM monthly_summaries WHERE year = ?`,
      [year],
    );
    const agg = rows[0];

    const monthlyRows = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? ORDER BY month ASC',
      [year],
    );
    const monthlyBreakdown = monthlyRows.map(rowToMonthlySummary);

    const id = uid('ys');
    await run(
      `INSERT OR REPLACE INTO yearly_summaries
       (id, year, total_revenue, room_revenue, restaurant_revenue, bar_revenue, other_revenue,
        cost_of_goods_sold, gross_profit, gross_margin, total_expenses, net_profit, net_margin,
        occupancy_rate, adr, revpar, restaurant_covers, average_bill, bar_sales, inventory_turnover,
        gst_payable, gst_input_credit, cash_flow, receivables, payables, cash_position, bank_position,
        waste_percent, complimentary_percent, cancellation_percent, refund_percent, department_profits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        year,
        round2(Number(agg.total_revenue || 0)),
        round2(Number(agg.room_revenue || 0)),
        round2(Number(agg.restaurant_revenue || 0)),
        round2(Number(agg.bar_revenue || 0)),
        round2(Number(agg.other_revenue || 0)),
        round2(Number(agg.cost_of_goods_sold || 0)),
        round2(Number(agg.gross_profit || 0)),
        round2(Number(agg.gross_margin || 0)),
        round2(Number(agg.total_expenses || 0)),
        round2(Number(agg.net_profit || 0)),
        round2(Number(agg.net_margin || 0)),
        round2(Number(agg.occupancy_rate || 0)),
        round2(Number(agg.adr || 0)),
        round2(Number(agg.revpar || 0)),
        Number(agg.restaurant_covers || 0),
        round2(Number(agg.average_bill || 0)),
        round2(Number(agg.bar_sales || 0)),
        round2(Number(agg.inventory_turnover || 0)),
        round2(Number(agg.gst_payable || 0)),
        round2(Number(agg.gst_input_credit || 0)),
        round2(Number(agg.cash_flow || 0)),
        round2(Number(agg.receivables || 0)),
        round2(Number(agg.payables || 0)),
        round2(Number(agg.cash_position || 0)),
        round2(Number(agg.bank_position || 0)),
        round2(Number(agg.waste_percent || 0)),
        round2(Number(agg.complimentary_percent || 0)),
        round2(Number(agg.cancellation_percent || 0)),
        round2(Number(agg.refund_percent || 0)),
        JSON.stringify(
          monthlyBreakdown.map((m) => ({
            department: 'all',
            revenue: m.totalRevenue,
            cost: m.costOfGoodsSold,
            grossProfit: m.grossProfit,
            grossMargin: m.grossMargin,
            expenses: m.totalExpenses,
            netProfit: m.netProfit,
            netMargin: m.netMargin,
          })),
        ),
      ],
    );

    const result = await query(
      'SELECT * FROM yearly_summaries WHERE year = ?',
      [year],
    );
    const ys = rowToYearlySummary(result[0]);
    ys.monthlyBreakdown = monthlyBreakdown;
    return ys;
  },

  async findYearlySummary(year: number): Promise<T.YearlySummary | null> {
    const rows = await query('SELECT * FROM yearly_summaries WHERE year = ?', [
      year,
    ]);
    if (!rows.length) return null;
    const monthlyRows = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? ORDER BY month ASC',
      [year],
    );
    const ys = rowToYearlySummary(rows[0]);
    ys.monthlyBreakdown = monthlyRows.map(rowToMonthlySummary);
    return ys;
  },

  async findAllYearlySummaries(): Promise<T.YearlySummary[]> {
    const rows = await query(
      'SELECT * FROM yearly_summaries ORDER BY year DESC',
    );
    return rows.map(rowToYearlySummary);
  },

  async findLatestYearlySummary(): Promise<T.YearlySummary | null> {
    const rows = await query(
      'SELECT * FROM yearly_summaries ORDER BY year DESC LIMIT 1',
    );
    if (!rows.length) return null;
    const year = rows[0].year;
    const monthlyRows = await query(
      'SELECT * FROM monthly_summaries WHERE year = ? ORDER BY month ASC',
      [year],
    );
    const ys = rowToYearlySummary(rows[0]);
    ys.monthlyBreakdown = monthlyRows.map(rowToMonthlySummary);
    return ys;
  },

  async deleteYearlySummary(year: number): Promise<void> {
    await run('DELETE FROM yearly_summaries WHERE year = ?', [year]);
  },

  // ════════════════════════════════════════════════════════════════════════
  // ANALYTICS CACHE
  // ════════════════════════════════════════════════════════════════════════

  async getCache(cacheKey: string): Promise<T.AnalyticsCache | null> {
    const rows = await query(
      `SELECT * FROM analytics_cache WHERE cache_key = ? AND expires_at > ?`,
      [cacheKey, now()],
    );
    return rows.length ? rowToAnalyticsCache(rows[0]) : null;
  },

  async setCache(
    cacheKey: string,
    data: string,
    ttlSeconds: number,
  ): Promise<T.AnalyticsCache> {
    const existing = await query(
      'SELECT * FROM analytics_cache WHERE cache_key = ?',
      [cacheKey],
    );
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    if (existing.length) {
      await run(
        'UPDATE analytics_cache SET data = ?, expires_at = ?, updated_at = ? WHERE cache_key = ?',
        [data, expiresAt, now(), cacheKey],
      );
    } else {
      const id = uid('ac');
      await run(
        'INSERT INTO analytics_cache (id, cache_key, data, expires_at) VALUES (?, ?, ?, ?)',
        [id, cacheKey, data, expiresAt],
      );
    }
    const rows = await query(
      'SELECT * FROM analytics_cache WHERE cache_key = ?',
      [cacheKey],
    );
    return rowToAnalyticsCache(rows[0]);
  },

  async clearCache(cacheKey: string): Promise<void> {
    await run('DELETE FROM analytics_cache WHERE cache_key = ?', [cacheKey]);
  },

  async clearExpiredCache(): Promise<number> {
    const result = await run(
      'DELETE FROM analytics_cache WHERE expires_at < ?',
      [now()],
    );
    return result.changes;
  },

  async clearAllCache(): Promise<void> {
    await run('DELETE FROM analytics_cache');
  },

  async getCacheStats(): Promise<{
    count: number;
    oldest: string | null;
    newest: string | null;
  }> {
    const countRow = await query('SELECT COUNT(*) as cnt FROM analytics_cache');
    const oldestRow = await query(
      'SELECT MIN(created_at) as oldest FROM analytics_cache',
    );
    const newestRow = await query(
      'SELECT MAX(created_at) as newest FROM analytics_cache',
    );
    return {
      count: Number(countRow[0]?.cnt || 0),
      oldest: oldestRow[0]?.oldest || null,
      newest: newestRow[0]?.newest || null,
    };
  },

  // ════════════════════════════════════════════════════════════════════════
  // ANALYTICS EVENTS
  // ════════════════════════════════════════════════════════════════════════

  async createAnalyticsEvent(
    event: Omit<T.AnalyticsEvent, 'id' | 'generatedAt'>,
  ): Promise<T.AnalyticsEvent> {
    const id = uid('ae');
    const ts = now();
    await run(
      `INSERT INTO analytics_events (id, event_type, period, data, threshold_breaches, generated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        event.eventType,
        event.period,
        JSON.stringify(event.data),
        JSON.stringify(event.thresholdBreaches),
        ts,
      ],
    );
    const rows = await query('SELECT * FROM analytics_events WHERE id = ?', [
      id,
    ]);
    return rowToAnalyticsEvent(rows[0]);
  },

  async findEventsByType(
    type: T.AnalyticsEventType,
  ): Promise<T.AnalyticsEvent[]> {
    const rows = await query(
      'SELECT * FROM analytics_events WHERE event_type = ? ORDER BY generated_at DESC',
      [type],
    );
    return rows.map(rowToAnalyticsEvent);
  },

  async findEventsByPeriod(period: string): Promise<T.AnalyticsEvent[]> {
    const rows = await query(
      'SELECT * FROM analytics_events WHERE period = ? ORDER BY generated_at DESC',
      [period],
    );
    return rows.map(rowToAnalyticsEvent);
  },

  async findLatestEvents(limit: number): Promise<T.AnalyticsEvent[]> {
    const rows = await query(
      'SELECT * FROM analytics_events ORDER BY generated_at DESC LIMIT ?',
      [limit],
    );
    return rows.map(rowToAnalyticsEvent);
  },

  async findThresholdBreaches(
    period: string,
    severity: string,
  ): Promise<T.AnalyticsEvent[]> {
    const rows = await query(
      `SELECT * FROM analytics_events
       WHERE period = ? AND threshold_breaches LIKE ?
       ORDER BY generated_at DESC`,
      [period, `%"severity":"${severity}"%`],
    );
    return rows.map(rowToAnalyticsEvent);
  },

  async deleteEventsOlderThan(date: string): Promise<number> {
    const result = await run(
      'DELETE FROM analytics_events WHERE generated_at < ?',
      [date],
    );
    return result.changes;
  },

  // ════════════════════════════════════════════════════════════════════════
  // TRANSACTIONAL READ METHODS
  // ════════════════════════════════════════════════════════════════════════

  async getJournalRevenueByType(
    fromDate: string,
    toDate: string,
  ): Promise<Record<string, number>> {
    const rows = await query(
      `SELECT voucher_type, COALESCE(SUM(credit_total), 0) as revenue
       FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales', 'receipt')
         AND date(entry_date) BETWEEN ? AND ?
       GROUP BY voucher_type`,
      [fromDate, toDate],
    );
    const result: Record<string, number> = {};
    for (const r of rows) result[r.voucher_type] = Number(r.revenue || 0);
    return result;
  },

  async getJournalExpenses(fromDate: string, toDate: string): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('payment', 'journal', 'adjustment')
         AND date(entry_date) BETWEEN ? AND ?`,
      [fromDate, toDate],
    );
    return Number(rows[0]?.val || 0);
  },

  async getAccountBalanceByType(accountType: string): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
       WHERE account_type=? AND is_active=1 AND is_group=0`,
      [accountType],
    );
    return Number(rows[0]?.val || 0);
  },

  async getGstSummary(
    fromDate: string,
    toDate: string,
  ): Promise<{ input: number; output: number }> {
    const rows = await query(
      `SELECT gst_type, COALESCE(SUM(gst_amount), 0) as total
       FROM gst_registers WHERE date(created_at) BETWEEN ? AND ?
       GROUP BY gst_type`,
      [fromDate, toDate],
    );
    let input = 0,
      output = 0;
    for (const r of rows) {
      if (r.gst_type === 'input') input = Number(r.total || 0);
      if (r.gst_type === 'output') output = Number(r.total || 0);
    }
    return { input, output };
  },

  async getOccupancyRate(date: string): Promise<number> {
    const occupied = await query(
      "SELECT COUNT(*) as cnt FROM rooms WHERE status='occupied'",
    );
    const total = await query('SELECT COUNT(*) as cnt FROM rooms');
    const totalCount = Number(total[0]?.cnt || 1);
    return safeDivide(Number(occupied[0]?.cnt || 0), totalCount) * 100;
  },

  async getRestaurantCovers(date: string): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(guest_count), 0) as cnt FROM restaurant_orders
       WHERE date(created_at)=? AND status IN ('served', 'completed', 'paid')`,
      [date],
    );
    return Number(rows[0]?.cnt || 0);
  },

  async getBarSales(date: string): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as val FROM bar_sales
       WHERE date(created_at)=? AND status='completed'`,
      [date],
    );
    return Number(rows[0]?.val || 0);
  },

  async getInventoryValue(): Promise<number> {
    const rows = await query(
      `SELECT COALESCE(SUM(stock * cost), 0) as val FROM inventory WHERE is_active=1`,
    );
    return Number(rows[0]?.val || 0);
  },

  async getInventoryMovementAnalytics(
    fromDate: string,
    toDate: string,
  ): Promise<T.InventoryAnalytics> {
    const allItems = await query(
      `SELECT i.id, i.name, i.category, i.stock, i.cost, i.min_stock,
              COALESCE(SUM(CASE WHEN il.kind IN ('sale', 'consumption') THEN ABS(il.quantity) ELSE 0 END), 0) as total_out
       FROM inventory i
       LEFT JOIN inventory_ledger il ON il.item_id = i.id AND date(il.created_at) BETWEEN ? AND ?
       WHERE i.is_active=1
       GROUP BY i.id`,
      [fromDate, toDate],
    );

    const fast: T.InventoryMovementItem[] = [];
    const slow: T.InventoryMovementItem[] = [];
    const dead: T.InventoryMovementItem[] = [];
    const reorderAlerts: T.ReorderAlert[] = [];
    const stockAgeing: T.StockAgeing[] = [];
    let totalValuation = 0;

    for (const item of allItems) {
      const turnoverDays =
        Number(item.total_out || 0) > 0
          ? round2(
              (Math.abs(Number(item.stock || 0)) / Number(item.total_out)) * 30,
            )
          : 999;
      const entry: T.InventoryMovementItem = {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        quantity: Number(item.stock || 0),
        turnoverDays,
        movementCount: 0,
        lastMovement: '',
      };
      if (turnoverDays <= 30) fast.push(entry);
      else if (turnoverDays <= 90) slow.push(entry);
      else dead.push(entry);

      const value = Number(item.stock || 0) * Number(item.cost || 0);
      totalValuation += value;

      if (
        Number(item.stock || 0) <= Number(item.min_stock || 0) &&
        Number(item.min_stock || 0) > 0
      ) {
        reorderAlerts.push({
          itemId: item.id,
          itemName: item.name,
          currentStock: Number(item.stock || 0),
          reorderLevel: Number(item.min_stock || 0),
          reorderQuantity: Number(item.stock || 0) * 2,
          supplierId: null,
          supplierName: null,
        });
      }

      stockAgeing.push({
        itemId: item.id,
        itemName: item.name,
        batch: null,
        daysInStock: 0,
        quantity: Number(item.stock || 0),
        value: round2(value),
        category: item.category,
      });
    }

    return {
      fastMovingItems: fast,
      slowMovingItems: slow,
      deadStock: dead,
      reorderAlerts,
      stockAgeing,
      inventoryValuation: round2(totalValuation),
      shrinkage: 0,
      shrinkagePercent: 0,
      varianceCount: 0,
      consumptionTrends: [],
    };
  },

  async getBookingSourceAnalytics(
    fromDate: string,
    toDate: string,
  ): Promise<T.BookingSource[]> {
    const rows = await query(
      `SELECT source, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
       FROM reservations
       WHERE date(created_at) BETWEEN ? AND ? AND status NOT IN ('inquiry', 'cancelled')
       GROUP BY source
       ORDER BY count DESC`,
      [fromDate, toDate],
    );
    const total = rows.reduce(
      (s: number, r: any) => s + Number(r.count || 0),
      0,
    );
    return rows.map((r: any) => ({
      source: r.source,
      count: Number(r.count || 0),
      percentage: safeDivide(Number(r.count || 0), total) * 100,
      revenue: Number(r.revenue || 0),
    }));
  },

  async getKitchenPerformance(
    fromDate: string,
    toDate: string,
  ): Promise<T.KitchenPerformance[]> {
    const rows = await query(
      `SELECT k.station_id as station, COUNT(*) as orders_prepared,
              AVG(CASE WHEN k.status IN ('ready', 'served')
                THEN (julianday(k.updated_at) - julianday(k.created_at)) * 86400 ELSE NULL END) as avg_time,
              SUM(CASE WHEN k.status = 'cancelled' THEN 1 ELSE 0 END) as refire_count
       FROM kot k
       WHERE date(k.created_at) BETWEEN ? AND ? AND k.status IN ('ready', 'served', 'cancelled')
       GROUP BY k.station_id`,
      [fromDate, toDate],
    );
    return rows.map((r: any) => ({
      station: r.station || 'unknown',
      ordersPrepared: Number(r.orders_prepared || 0),
      averageTime: round2(Number(r.avg_time || 0)),
      refireCount: Number(r.refire_count || 0),
      efficiency: 0,
    }));
  },

  async getTableTurnover(fromDate: string, toDate: string): Promise<number> {
    const rows = await query(
      `SELECT COUNT(*) as cnt FROM restaurant_orders
       WHERE date(created_at) BETWEEN ? AND ? AND status IN ('completed', 'paid', 'served')`,
      [fromDate, toDate],
    );
    const tables = await query('SELECT COUNT(*) as cnt FROM dining_tables');
    return safeDivide(Number(rows[0]?.cnt || 0), Number(tables[0]?.cnt || 1));
  },

  async getSupplierPerformance(
    fromDate: string,
    toDate: string,
  ): Promise<T.SupplierPerformance[]> {
    const rows = await query(
      `SELECT s.id as supplier_id, s.name as supplier_name,
              COUNT(po.id) as total_orders,
              COALESCE(SUM(CASE WHEN po.status IN ('received', 'invoiced', 'closed')
                AND po.expected_date >= po.order_date THEN 1 ELSE 0 END), 0) as on_time,
              AVG(s.rating) as quality_rating
       FROM suppliers s
       LEFT JOIN purchase_orders po ON po.supplier_id = s.id
         AND date(po.created_at) BETWEEN ? AND ?
       WHERE s.is_active = 1
       GROUP BY s.id`,
      [fromDate, toDate],
    );
    return rows.map((r: any) => ({
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      totalOrders: Number(r.total_orders || 0),
      onTimeDeliveries: Number(r.on_time || 0),
      onTimeRate:
        safeDivide(Number(r.on_time || 0), Number(r.total_orders || 1)) * 100,
      qualityRating: Number(r.quality_rating || 0),
      returnRate: 0,
    }));
  },

  async getPeakHours(fromDate: string, toDate: string): Promise<T.PeakHour[]> {
    const rows = await query(
      `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
              CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
              COUNT(*) as transaction_count,
              COALESCE(SUM(total_amount), 0) as revenue
       FROM restaurant_orders
       WHERE date(created_at) BETWEEN ? AND ? AND status NOT IN ('cancelled', 'voided')
       GROUP BY hour, day_of_week
       ORDER BY transaction_count DESC`,
      [fromDate, toDate],
    );
    return rows.map((r: any) => ({
      hour: Number(r.hour || 0),
      dayOfWeek: Number(r.day_of_week || 0),
      transactionCount: Number(r.transaction_count || 0),
      revenue: Number(r.revenue || 0),
    }));
  },

  async getSeasonalityTrends(year: number): Promise<T.SeasonalityTrend[]> {
    const rows = await query(
      `SELECT strftime('%m', date) as month, strftime('%Y', date) as year,
              COALESCE(SUM(total_revenue), 0) as revenue
       FROM daily_summaries WHERE strftime('%Y', date) = ?
       GROUP BY month ORDER BY month`,
      [String(year)],
    );
    const allYears = await query(
      `SELECT strftime('%m', date) as month, AVG(total_revenue) as avg_rev
       FROM daily_summaries GROUP BY month`,
    );
    const avgMap: Record<string, number> = {};
    for (const r of allYears) avgMap[r.month] = Number(r.avg_rev || 0);

    return rows.map((r: any) => {
      const val = Number(r.revenue || 0);
      const avg = avgMap[r.month] || 1;
      return {
        month: r.month,
        year: Number(r.year),
        metric: 'total_revenue',
        value: val,
        average: avg,
        deviation: safeDivide(val - avg, avg) * 100,
      };
    });
  },

  // ════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════

  async getDatabaseSize(): Promise<Record<string, number>> {
    const sizes: Record<string, number> = {};
    for (const tbl of TABLE_NAMES) {
      const rows = await query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
      sizes[tbl] = Number(rows[0]?.cnt || 0);
    }
    return sizes;
  },

  async getSummaryCoverage(): Promise<{
    datesWithData: string[];
    missingDates: string[];
  }> {
    const rows = await query(
      'SELECT date FROM daily_summaries ORDER BY date ASC',
    );
    const datesWithData = rows.map((r: any) => r.date);
    const missingDates: string[] = [];
    if (datesWithData.length >= 2) {
      const start = new Date(datesWithData[0]);
      const end = new Date(datesWithData[datesWithData.length - 1]);
      const existing = new Set(datesWithData);
      const current = new Date(start);
      while (current <= end) {
        const ds = current.toISOString().slice(0, 10);
        if (!existing.has(ds)) missingDates.push(ds);
        current.setDate(current.getDate() + 1);
      }
    }
    return { datesWithData, missingDates };
  },

  async getLastComputedTimestamp(): Promise<Record<string, string | null>> {
    const daily = await query(
      'SELECT MAX(created_at) as ts FROM daily_summaries',
    );
    const weekly = await query(
      'SELECT MAX(created_at) as ts FROM weekly_summaries',
    );
    const monthly = await query(
      'SELECT MAX(created_at) as ts FROM monthly_summaries',
    );
    const yearly = await query(
      'SELECT MAX(created_at) as ts FROM yearly_summaries',
    );
    return {
      daily: daily[0]?.ts || null,
      weekly: weekly[0]?.ts || null,
      monthly: monthly[0]?.ts || null,
      yearly: yearly[0]?.ts || null,
    };
  },

  async getAnalyticsHealth(): Promise<{
    kpiCount: number;
    cacheCount: number;
    eventCount: number;
    dailyCoverage: number;
    isHealthy: boolean;
    issues: string[];
  }> {
    const kpiCount = await this.getKpiCount();
    const cacheRows = await query(
      'SELECT COUNT(*) as cnt FROM analytics_cache',
    );
    const cacheCount = Number(cacheRows[0]?.cnt || 0);
    const eventRows = await query(
      'SELECT COUNT(*) as cnt FROM analytics_events',
    );
    const eventCount = Number(eventRows[0]?.cnt || 0);

    const coverage = await this.getSummaryCoverage();
    const dailyCoverage =
      coverage.datesWithData.length > 0
        ? round2(
            (coverage.datesWithData.length /
              (coverage.datesWithData.length + coverage.missingDates.length)) *
              100,
          )
        : 0;

    const issues: string[] = [];
    if (kpiCount === 0) issues.push('No KPI definitions found');
    if (coverage.missingDates.length > 5)
      issues.push(`${coverage.missingDates.length} missing daily summaries`);
    if (dailyCoverage < 50) issues.push('Daily summary coverage below 50%');

    return {
      kpiCount,
      cacheCount,
      eventCount,
      dailyCoverage,
      isHealthy: issues.length === 0,
      issues,
    };
  },
};
