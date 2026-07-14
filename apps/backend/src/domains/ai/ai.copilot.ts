import { query } from '../../db';
import * as T from './ai.types';
import { AiRepository } from './ai.repository';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const now = (): string => new Date().toISOString();
const today = (): string => now().split('T')[0];
const monthStart = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

const makeCitation = (
  source: string,
  domain: T.BusinessDomain,
  metric: string,
  value: number,
): T.Citation => ({
  source,
  domain,
  metric,
  value: round2(value),
  timestamp: now(),
});

// ── Copilot Service ───────────────────────────────────────────────────

export const CopilotService = {
  async answerQuery(query: T.CopilotQuery): Promise<T.CopilotResponse> {
    const text = query.text.toLowerCase();

    // Route to specific handler based on keywords
    if (
      text.includes("today's revenue") ||
      text.includes('revenue today') ||
      text.includes('sales today') ||
      text.includes('income today')
    ) {
      return this.getRevenueAnswer();
    }

    if (
      text.includes("today's profit") ||
      text.includes('profit today') ||
      text.includes('pnl') ||
      text.includes('bottom line')
    ) {
      return this.getProfitAnswer();
    }

    if (
      text.includes('stock shortage') ||
      text.includes('low stock') ||
      text.includes('stock alert') ||
      text.includes('reorder')
    ) {
      return this.getStockShortageAnswer();
    }

    if (text.includes('fast moving') || text.includes('fast-moving')) {
      return this.getFastMovingAnswer();
    }

    if (text.includes('slow moving') || text.includes('slow-moving')) {
      return this.getSlowMovingAnswer();
    }

    if (
      text.includes('room occupancy') ||
      text.includes('occupancy rate') ||
      text.includes('occupancy today')
    ) {
      return this.getOccupancyAnswer();
    }

    if (
      text.includes('payroll cost') ||
      text.includes('payroll') ||
      text.includes('salary') ||
      text.includes('wages')
    ) {
      return this.getPayrollAnswer();
    }

    if (
      text.includes('cash flow') ||
      text.includes('cashflow') ||
      text.includes('cash position') ||
      text.includes('cash balance')
    ) {
      return this.getCashFlowAnswer();
    }

    if (
      text.includes('outstanding supplier') ||
      text.includes('supplier payment') ||
      text.includes('vendor outstanding') ||
      text.includes('unpaid supplier')
    ) {
      return this.getSupplierAnswer();
    }

    if (
      text.includes('pending approval') ||
      text.includes('approvals') ||
      text.includes('approve')
    ) {
      return this.getPendingApprovalsAnswer();
    }

    if (
      text.includes('bottle variance') ||
      text.includes('liquor variance') ||
      text.includes('bottle loss')
    ) {
      return this.getBottleVarianceAnswer();
    }

    if (
      text.includes('gst') &&
      (text.includes('summary') ||
        text.includes('payable') ||
        text.includes('return'))
    ) {
      return this.getGstAnswer();
    }

    if (
      text.includes('business health') ||
      text.includes('health') ||
      text.includes('overview')
    ) {
      return this.getBusinessHealth();
    }

    if (
      text.includes('growth trend') ||
      text.includes('growth') ||
      text.includes('trend')
    ) {
      return this.getGrowthTrends();
    }

    // Default: gather general context
    return this.getGeneralAnswer(text);
  },

  async getRevenueAnswer(): Promise<T.CopilotResponse> {
    const d = today();
    const rev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?`,
      [d],
    );
    const roomRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?
       AND (reference_type='hotel_check_out' OR reference_type='room_booking' OR reference_type IS NULL)`,
      [d],
    );
    const restRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?
       AND reference_type='restaurant_sale'`,
      [d],
    );
    const barRev = await query(
      `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
       WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?
       AND reference_type='bar_sale'`,
      [d],
    );

    const total = Number(rev[0]?.val || 0);
    const rooms = Number(roomRev[0]?.val || 0);
    const rest = Number(restRev[0]?.val || 0);
    const bar = Number(barRev[0]?.val || 0);

    const citations: T.Citation[] = [
      makeCitation('journal_entries', 'revenue', 'totalRevenue', total),
      makeCitation('journal_entries', 'rooms', 'roomRevenue', rooms),
      makeCitation('journal_entries', 'restaurant', 'restaurantRevenue', rest),
      makeCitation('journal_entries', 'bar', 'barRevenue', bar),
    ];

    return {
      answer: `Today's Revenue Summary:
• Total Revenue: ₹${round2(total).toLocaleString()}
  - Room Revenue: ₹${round2(rooms).toLocaleString()}
  - Restaurant Revenue: ₹${round2(rest).toLocaleString()}
  - Bar Revenue: ₹${round2(bar).toLocaleString()}`,
      citations,
      confidence: 0.9,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'revenue' },
          description: 'View detailed revenue report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getProfitAnswer(): Promise<T.CopilotResponse> {
    const d = today();
    const [rev, exp] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?`,
        [d],
      ),
      query(
        `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('payment','journal','adjustment') AND date(entry_date)=?`,
        [d],
      ),
    ]);
    const revenue = Number(rev[0]?.val || 0);
    const expenses = Number(exp[0]?.val || 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const citations: T.Citation[] = [
      makeCitation('journal_entries', 'revenue', 'revenue', revenue),
      makeCitation('journal_entries', 'accounting', 'expenses', expenses),
      makeCitation('journal_entries', 'accounting', 'profit', profit),
    ];

    return {
      answer: `Today's Profit & Loss Summary:
• Revenue: ₹${round2(revenue).toLocaleString()}
• Expenses: ₹${round2(expenses).toLocaleString()}
• Net Profit: ₹${round2(profit).toLocaleString()}
• Profit Margin: ${round2(margin)}%`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'accounting' },
          description: 'View P&L report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getStockShortageAnswer(): Promise<T.CopilotResponse> {
    const items = await query(
      `SELECT i.id, i.name, i.category, i.stock, i.min_stock, i.cost
       FROM inventory i WHERE i.is_active=1 AND i.min_stock > 0 AND i.stock <= i.min_stock
       ORDER BY (i.stock * 1.0 / i.min_stock) ASC LIMIT 10`,
    );
    const citations: T.Citation[] = items.map((item: any) =>
      makeCitation(
        'inventory',
        'inventory',
        'stockLevel',
        Number(item.stock || 0),
      ),
    );

    if (!items.length) {
      return {
        answer:
          'Good news! No stock items are below their reorder levels. All inventory levels are healthy.',
        citations: [],
        confidence: 0.95,
        requiresApproval: false,
        suggestedActions: [],
        generatedAt: now(),
      };
    }

    const answer = items
      .map(
        (item: any) =>
          `• ${item.name} (${item.category}): Current ${item.stock} / Min ${item.min_stock}`,
      )
      .join('\n');

    return {
      answer: `Stock Shortage Alerts (${items.length} items need reorder):\n${answer}`,
      citations,
      confidence: 0.9,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'inventory' },
          description: 'View inventory report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getFastMovingAnswer(): Promise<T.CopilotResponse> {
    const todayDate = today();
    const monthAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split('T')[0];
    const items = await query(
      `SELECT i.id, i.name, i.category, i.stock, COALESCE(SUM(ABS(il.quantity)), 0) as total_out
       FROM inventory i
       LEFT JOIN inventory_ledger il ON il.item_id = i.id AND date(il.created_at) BETWEEN ? AND ?
       WHERE i.is_active=1
       GROUP BY i.id
       HAVING total_out > 0
       ORDER BY total_out DESC LIMIT 10`,
      [monthAgo, todayDate],
    );
    const citations: T.Citation[] = items.map((item: any) =>
      makeCitation(
        'inventory_ledger',
        'inventory',
        'movement',
        Number(item.total_out || 0),
      ),
    );

    if (!items.length) {
      return {
        answer: 'No fast-moving product data available for the last 30 days.',
        citations: [],
        confidence: 0.7,
        requiresApproval: false,
        suggestedActions: [],
        generatedAt: now(),
      };
    }

    const answer = items
      .map(
        (item: any, i: number) =>
          `  ${i + 1}. ${item.name} (${item.category}) - ${item.total_out} units moved`,
      )
      .join('\n');

    return {
      answer: `Fast-Moving Products (Last 30 Days):\n${answer}`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'inventory' },
          description: 'View inventory movement report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getSlowMovingAnswer(): Promise<T.CopilotResponse> {
    const todayDate = today();
    const monthAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split('T')[0];
    const items = await query(
      `SELECT i.id, i.name, i.category, i.stock, COALESCE(SUM(ABS(il.quantity)), 0) as total_out
       FROM inventory i
       LEFT JOIN inventory_ledger il ON il.item_id = i.id AND date(il.created_at) BETWEEN ? AND ?
       WHERE i.is_active=1
       GROUP BY i.id
       HAVING total_out = 0 OR (i.stock > 0 AND total_out < i.stock * 0.1)
       ORDER BY i.stock DESC LIMIT 10`,
      [monthAgo, todayDate],
    );
    const citations: T.Citation[] = items.map((item: any) =>
      makeCitation(
        'inventory_ledger',
        'inventory',
        'stockValue',
        Number(item.stock || 0),
      ),
    );

    if (!items.length) {
      return {
        answer: 'No slow-moving products detected.',
        citations: [],
        confidence: 0.7,
        requiresApproval: false,
        suggestedActions: [],
        generatedAt: now(),
      };
    }

    const answer = items
      .map(
        (item: any, i: number) =>
          `  ${i + 1}. ${item.name} (${item.category}) - Stock: ${item.stock}, Moved: ${item.total_out}`,
      )
      .join('\n');

    return {
      answer: `Slow-Moving Products:\n${answer}`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'inventory' },
          description: 'View slow-moving items',
        },
      ],
      generatedAt: now(),
    };
  },

  async getOccupancyAnswer(): Promise<T.CopilotResponse> {
    const [occ, total] = await Promise.all([
      query("SELECT COUNT(*) as cnt FROM rooms WHERE status='occupied'"),
      query('SELECT COUNT(*) as cnt FROM rooms'),
    ]);
    const occupied = Number(occ[0]?.cnt || 0);
    const totalRooms = Number(total[0]?.cnt || 1);
    const occRate = (occupied / totalRooms) * 100;

    const citations: T.Citation[] = [
      makeCitation('rooms', 'rooms', 'occupancyRate', occRate),
      makeCitation('rooms', 'rooms', 'occupiedRooms', occupied),
    ];

    return {
      answer: `Room Occupancy Summary:
• Occupied Rooms: ${occupied} / ${totalRooms}
• Occupancy Rate: ${round2(occRate)}%`,
      citations,
      confidence: 0.95,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'rooms' },
          description: 'View room occupancy report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getPayrollAnswer(): Promise<T.CopilotResponse> {
    const ms = monthStart();
    const payroll = await query(
      `SELECT COALESCE(SUM(amount), 0) as val FROM payroll_entries
       WHERE pay_date >= ? AND status='paid'`,
      [ms],
    );
    const empCount = await query(
      'SELECT COUNT(*) as cnt FROM employees WHERE is_active=1',
    );
    const totalPayroll = Number(payroll[0]?.val || 0);
    const employees = Number(empCount[0]?.cnt || 0);

    const citations: T.Citation[] = [
      makeCitation(
        'payroll_entries',
        'payroll',
        'monthlyPayroll',
        totalPayroll,
      ),
      makeCitation('employees', 'hr', 'headcount', employees),
    ];

    return {
      answer: `Payroll Summary (This Month):
• Total Payroll: ₹${round2(totalPayroll).toLocaleString()}
• Active Employees: ${employees}
• Avg Cost/Employee: ₹${employees > 0 ? round2(totalPayroll / employees).toLocaleString() : 0}`,
      citations,
      confidence: 0.9,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'payroll' },
          description: 'View payroll report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getCashFlowAnswer(): Promise<T.CopilotResponse> {
    const d = today();
    const [rev, exp, cashBal] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?`,
        [d],
      ),
      query(
        `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('payment','journal','adjustment') AND date(entry_date)=?`,
        [d],
      ),
      query(
        `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
         WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='cash' OR name LIKE '%cash%')`,
      ),
    ]);
    const revenue = Number(rev[0]?.val || 0);
    const expenses = Number(exp[0]?.val || 0);
    const cashBalance = Number(cashBal[0]?.val || 0);

    const citations: T.Citation[] = [
      makeCitation('journal_entries', 'cash', 'cashInflow', revenue),
      makeCitation('journal_entries', 'cash', 'cashOutflow', expenses),
      makeCitation('chart_of_accounts', 'cash', 'cashBalance', cashBalance),
    ];

    return {
      answer: `Cash Flow Summary:
• Today's Inflow: ₹${round2(revenue).toLocaleString()}
• Today's Outflow: ₹${round2(expenses).toLocaleString()}
• Net Cash Flow: ₹${round2(revenue - expenses).toLocaleString()}
• Current Cash Balance: ₹${round2(cashBalance).toLocaleString()}`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'cash' },
          description: 'View cash flow report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getSupplierAnswer(): Promise<T.CopilotResponse> {
    const outstanding = await query(
      `SELECT COALESCE(SUM(outstanding), 0) as val FROM supplier_balances`,
    );
    const suppliers = await query(
      `SELECT s.id, s.name, COALESCE(sb.outstanding, 0) as outstanding
       FROM suppliers s
       LEFT JOIN supplier_balances sb ON sb.supplier_id = s.id
       WHERE sb.outstanding > 0
       ORDER BY sb.outstanding DESC LIMIT 5`,
    );
    const totalOutstanding = Number(outstanding[0]?.val || 0);

    const citations: T.Citation[] = [
      makeCitation(
        'supplier_balances',
        'supplier',
        'outstandingAmount',
        totalOutstanding,
      ),
    ];

    const topSuppliers = suppliers
      .map(
        (s: any) =>
          `  • ${s.name}: ₹${round2(Number(s.outstanding || 0)).toLocaleString()}`,
      )
      .join('\n');

    return {
      answer: `Supplier Outstanding Summary:
• Total Outstanding: ₹${round2(totalOutstanding).toLocaleString()}
${topSuppliers ? '\nTop Suppliers:\n' + topSuppliers : '\nNo outstanding supplier payments.'}`,
      citations,
      confidence: 0.9,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'supplier' },
          description: 'View supplier report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getPendingApprovalsAnswer(): Promise<T.CopilotResponse> {
    const [pendingPO, pendingInvoices] = await Promise.all([
      query(
        `SELECT COUNT(*) as cnt FROM purchase_orders WHERE status='pending'`,
      ),
      query(
        `SELECT COUNT(*) as cnt FROM purchase_invoices WHERE status='pending'`,
      ),
    ]);
    const poCount = Number(pendingPO[0]?.cnt || 0);
    const invCount = Number(pendingInvoices[0]?.cnt || 0);

    const citations: T.Citation[] = [
      makeCitation('purchase_orders', 'purchasing', 'pendingPOs', poCount),
      makeCitation(
        'purchase_invoices',
        'accounting',
        'pendingInvoices',
        invCount,
      ),
    ];

    return {
      answer: `Pending Approvals:
• Purchase Orders: ${poCount} pending approval
• Invoices: ${invCount} pending approval
• Total Items: ${poCount + invCount}`,
      citations,
      confidence: 0.95,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'purchasing' },
          description: 'View pending approvals',
        },
      ],
      generatedAt: now(),
    };
  },

  async getBottleVarianceAnswer(): Promise<T.CopilotResponse> {
    const variances = await query(
      `SELECT b.id, b.name, b.expected_stock, b.actual_stock,
              (b.expected_stock - b.actual_stock) as variance,
              CASE WHEN b.expected_stock > 0
                THEN ((b.expected_stock - b.actual_stock) * 100.0 / b.expected_stock)
                ELSE 0 END as variance_pct
       FROM liquor_bottles b
       WHERE b.is_active=1 AND b.expected_stock != b.actual_stock
       ORDER BY variance_pct DESC LIMIT 10`,
    );

    const citations: T.Citation[] = variances.map((v: any) =>
      makeCitation(
        'liquor_bottles',
        'liquor',
        'variance',
        Number(v.variance || 0),
      ),
    );

    if (!variances.length) {
      return {
        answer:
          'No bottle variances detected. All liquor stock levels match expectations.',
        citations: [],
        confidence: 0.95,
        requiresApproval: false,
        suggestedActions: [],
        generatedAt: now(),
      };
    }

    const answer = variances
      .map(
        (v: any) =>
          `  • ${v.name}: Expected ${v.expected_stock}, Actual ${v.actual_stock} (${round2(Number(v.variance_pct))}% variance)`,
      )
      .join('\n');

    return {
      answer: `Bottle/Liquor Variances Detected (${variances.length} items):\n${answer}`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'liquor' },
          description: 'View liquor variance report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getGstAnswer(): Promise<T.CopilotResponse> {
    const ms = monthStart();
    const gst = await query(
      `SELECT gst_type, COALESCE(SUM(gst_amount), 0) as total
       FROM gst_registers WHERE created_at >= ?
       GROUP BY gst_type`,
      [ms],
    );
    let input = 0,
      output = 0;
    for (const r of gst) {
      if (r.gst_type === 'input') input = Number(r.total || 0);
      if (r.gst_type === 'output') output = Number(r.total || 0);
    }
    const payable = output - input;

    const citations: T.Citation[] = [
      makeCitation('gst_registers', 'gst', 'gstOutput', output),
      makeCitation('gst_registers', 'gst', 'gstInput', input),
      makeCitation('gst_registers', 'gst', 'gstPayable', payable),
    ];

    return {
      answer: `GST Summary (This Month):
• Output GST (Collected): ₹${round2(output).toLocaleString()}
• Input GST (Credit): ₹${round2(input).toLocaleString()}
• Net GST Payable: ₹${round2(payable).toLocaleString()}`,
      citations,
      confidence: 0.9,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'gst' },
          description: 'View GST report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getBusinessHealth(): Promise<T.CopilotResponse> {
    const context = await AiRepository.getDatabaseContext();
    const alerts: string[] = [];

    const score = {
      revenue: 0,
      occupancy: 0,
      cash: 0,
      inventory: 0,
      payroll: 0,
    };
    if (context.dailyRevenue > 10000) score.revenue = 100;
    else if (context.dailyRevenue > 5000) score.revenue = 75;
    else if (context.dailyRevenue > 1000) score.revenue = 50;
    else score.revenue = 25;

    if (context.occupancyRate > 70) score.occupancy = 100;
    else if (context.occupancyRate > 50) score.occupancy = 75;
    else if (context.occupancyRate > 30) score.occupancy = 50;
    else score.occupancy = 25;

    const overallScore = round2(
      Object.values(score).reduce((a, b) => a + b, 0) /
        Object.keys(score).length,
    );

    if (context.dailyRevenue < 5000) alerts.push('Revenue is below target');
    if (context.occupancyRate < 40) alerts.push('Occupancy rate is low');
    if (context.payroll > context.dailyRevenue * 0.5)
      alerts.push('Payroll cost is high relative to revenue');

    const citations: T.Citation[] = [
      makeCitation('computed', 'revenue', 'healthScore', overallScore),
    ];

    const alertText = alerts.length
      ? `\n\nAlerts:\n${alerts.map((a) => `  ⚠ ${a}`).join('\n')}`
      : '';

    return {
      answer: `Business Health Score: ${overallScore}/100
• Revenue Health: ${score.revenue}/100 (Daily: ₹${round2(context.dailyRevenue).toLocaleString()})
• Occupancy Health: ${score.occupancy}/100 (Rate: ${round2(context.occupancyRate)}%)
• Cash Position: ₹${round2(context.dailyRevenue - context.expenses).toLocaleString()}${alertText}`,
      citations,
      confidence: 0.85,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'revenue' },
          description: 'View full health report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getGrowthTrends(): Promise<T.CopilotResponse> {
    const todayDate = today();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split('T')[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)
      .toISOString()
      .split('T')[0];

    const [currentPeriod, previousPeriod] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date) BETWEEN ? AND ?`,
        [sevenDaysAgo, todayDate],
      ),
      query(
        `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
         WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date) BETWEEN ? AND ?`,
        [fourteenDaysAgo, sevenDaysAgo],
      ),
    ]);

    const current = Number(currentPeriod[0]?.val || 0);
    const previous = Number(previousPeriod[0]?.val || 0);
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    const citations: T.Citation[] = [
      makeCitation(
        'journal_entries',
        'revenue',
        'currentPeriodRevenue',
        current,
      ),
      makeCitation(
        'journal_entries',
        'revenue',
        'previousPeriodRevenue',
        previous,
      ),
    ];

    const direction =
      growth > 0 ? 'upward' : growth < 0 ? 'downward' : 'stable';

    return {
      answer: `Growth Trends (Last 14 Days):
• Current 7 Days Revenue: ₹${round2(current).toLocaleString()}
• Previous 7 Days Revenue: ₹${round2(previous).toLocaleString()}
• Growth: ${round2(growth)}% (${direction} trend)`,
      citations,
      confidence: 0.8,
      requiresApproval: false,
      suggestedActions: [
        {
          type: 'view_report',
          params: { domain: 'revenue' },
          description: 'View growth trend report',
        },
      ],
      generatedAt: now(),
    };
  },

  async getGeneralAnswer(text: string): Promise<T.CopilotResponse> {
    const context = await AiRepository.getDatabaseContext();
    const citations: T.Citation[] = [
      makeCitation('computed', 'revenue', 'dailyRevenue', context.dailyRevenue),
      makeCitation('computed', 'rooms', 'occupancyRate', context.occupancyRate),
    ];

    return {
      answer: `Based on the current data:\n• Today's Revenue: ₹${round2(context.dailyRevenue).toLocaleString()}\n• Occupancy Rate: ${round2(context.occupancyRate)}%\n• Restaurant Covers: ${context.restaurantCovers}\n• Bar Sales: ₹${round2(context.barSales).toLocaleString()}\n• Inventory Value: ₹${round2(context.inventoryValue).toLocaleString()}\n• Monthly Payroll: ₹${round2(context.payroll).toLocaleString()}\n\nHow can I help you further? You can ask about revenue, profit, stock, occupancy, payroll, cash flow, suppliers, approvals, or GST.`,
      citations,
      confidence: 0.75,
      requiresApproval: false,
      suggestedActions: [],
      generatedAt: now(),
    };
  },
};
