import { query } from '../../db';
import * as T from './ai.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const now = (): string => new Date().toISOString();

// ── Domain Relationship Map ───────────────────────────────────────────

const DOMAIN_RELATIONSHIPS: Record<
  T.BusinessDomain,
  { label: string; metrics: string[]; connections: T.BusinessDomain[] }
> = {
  revenue: {
    label: 'Revenue',
    metrics: ['dailyRevenue', 'monthlyRevenue', 'yearlyRevenue'],
    connections: ['rooms', 'restaurant', 'bar', 'accounting', 'gst'],
  },
  rooms: {
    label: 'Rooms',
    metrics: ['occupancyRate', 'adr', 'revpar', 'bookedRooms'],
    connections: ['revenue', 'accounting'],
  },
  restaurant: {
    label: 'Restaurant',
    metrics: ['covers', 'averageBill', 'restaurantRevenue'],
    connections: ['revenue', 'inventory', 'hr'],
  },
  bar: {
    label: 'Bar',
    metrics: ['barSales', 'pourCost', 'bottleVariance'],
    connections: ['revenue', 'liquor', 'inventory'],
  },
  inventory: {
    label: 'Inventory',
    metrics: ['stockLevel', 'turnover', 'shrinkage', 'valuation'],
    connections: ['restaurant', 'bar', 'purchasing', 'liquor'],
  },
  purchasing: {
    label: 'Purchasing',
    metrics: ['orderValue', 'supplierRating', 'onTimeDelivery'],
    connections: ['inventory', 'supplier', 'accounting'],
  },
  payroll: {
    label: 'Payroll',
    metrics: ['totalPayroll', 'employeeCount', 'overtime'],
    connections: ['hr', 'accounting', 'attendance'],
  },
  attendance: {
    label: 'Attendance',
    metrics: ['presentToday', 'absenteeism', 'lateCount'],
    connections: ['hr', 'payroll'],
  },
  cash: {
    label: 'Cash',
    metrics: ['cashBalance', 'cashFlow', 'shortage'],
    connections: ['accounting', 'revenue'],
  },
  accounting: {
    label: 'Accounting',
    metrics: ['profit', 'expenses', 'assets', 'liabilities'],
    connections: ['revenue', 'cash', 'gst', 'payroll', 'purchasing'],
  },
  gst: {
    label: 'GST',
    metrics: ['gstOutput', 'gstInput', 'gstPayable'],
    connections: ['accounting', 'revenue', 'purchasing'],
  },
  excise: {
    label: 'Excise',
    metrics: ['exciseDue', 'excisePaid', 'compliance'],
    connections: ['liquor', 'accounting'],
  },
  liquor: {
    label: 'Liquor',
    metrics: ['bottleCount', 'variance', 'costPerBottle'],
    connections: ['bar', 'inventory', 'excise'],
  },
  supplier: {
    label: 'Supplier',
    metrics: ['outstandingAmount', 'deliveryRating', 'paymentDays'],
    connections: ['purchasing', 'accounting'],
  },
  workflow: {
    label: 'Workflow',
    metrics: ['activeInstances', 'failedInstances', 'completionRate'],
    connections: ['sync'],
  },
  sync: {
    label: 'Sync',
    metrics: ['pendingQueue', 'conflicts', 'lastSync'],
    connections: ['workflow'],
  },
  hr: {
    label: 'Human Resources',
    metrics: ['headcount', 'attrition', 'trainingHours'],
    connections: ['payroll', 'attendance'],
  },
};

// ── Context Service ───────────────────────────────────────────────────

export const ContextService = {
  async buildContext(
    domains: T.BusinessDomain[],
    filter?: any,
  ): Promise<T.ContextResponse> {
    const contextPromises = domains.map((d) =>
      this.getDomainSummary(d, filter),
    );
    const contexts = await Promise.all(contextPromises);
    const graph = this.getGraph(domains);
    return {
      contexts: contexts.filter((c): c is T.DomainContext => c !== null),
      graph,
      generatedAt: now(),
    };
  },

  async getDomainSummary(
    domain: T.BusinessDomain,
    _filter?: any,
  ): Promise<T.DomainContext | null> {
    const today = now().split('T')[0];
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    )
      .toISOString()
      .split('T')[0];

    try {
      switch (domain) {
        case 'revenue': {
          const rev = await query(
            `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
             WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)=?`,
            [today],
          );
          return {
            domain,
            summary: `Today's revenue: ${round2(Number(rev[0]?.val || 0))}`,
            metrics: { dailyRevenue: Number(rev[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'rooms': {
          const [occ, total] = await Promise.all([
            query("SELECT COUNT(*) as cnt FROM rooms WHERE status='occupied'"),
            query('SELECT COUNT(*) as cnt FROM rooms'),
          ]);
          const occRate =
            Number(total[0]?.cnt || 1) > 0
              ? (Number(occ[0]?.cnt || 0) / Number(total[0]?.cnt || 1)) * 100
              : 0;
          return {
            domain,
            summary: `Occupancy: ${round2(occRate)}%`,
            metrics: {
              occupancyRate: round2(occRate),
              occupied: Number(occ[0]?.cnt || 0),
              total: Number(total[0]?.cnt || 0),
            },
            timestamp: today,
          };
        }
        case 'restaurant': {
          const covers = await query(
            `SELECT COALESCE(SUM(guest_count), 0) as cnt FROM restaurant_orders
             WHERE date(created_at)=? AND status IN ('served','completed','paid')`,
            [today],
          );
          return {
            domain,
            summary: `Restaurant covers today: ${covers[0]?.cnt || 0}`,
            metrics: { covers: Number(covers[0]?.cnt || 0) },
            timestamp: today,
          };
        }
        case 'bar': {
          const sales = await query(
            `SELECT COALESCE(SUM(total_amount), 0) as val FROM bar_sales
             WHERE date(created_at)=? AND status='completed'`,
            [today],
          );
          return {
            domain,
            summary: `Bar sales today: ${round2(Number(sales[0]?.val || 0))}`,
            metrics: { barSales: Number(sales[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'inventory': {
          const invVal = await query(
            'SELECT COALESCE(SUM(stock * cost), 0) as val FROM inventory WHERE is_active=1',
          );
          return {
            domain,
            summary: `Inventory valuation: ${round2(Number(invVal[0]?.val || 0))}`,
            metrics: { inventoryValue: Number(invVal[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'payroll': {
          const payroll = await query(
            `SELECT COALESCE(SUM(amount), 0) as val FROM payroll_entries
             WHERE strftime('%Y-%m', pay_date)=strftime('%Y-%m', 'now') AND status='paid'`,
          );
          return {
            domain,
            summary: `Monthly payroll: ${round2(Number(payroll[0]?.val || 0))}`,
            metrics: { monthlyPayroll: Number(payroll[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'attendance': {
          const [present, totalEmp] = await Promise.all([
            query(
              `SELECT COUNT(*) as cnt FROM attendance WHERE date(login_time)=? AND status='present'`,
              [today],
            ),
            query('SELECT COUNT(*) as cnt FROM employees WHERE is_active=1'),
          ]);
          return {
            domain,
            summary: `Present today: ${present[0]?.cnt || 0} / ${totalEmp[0]?.cnt || 0}`,
            metrics: {
              present: Number(present[0]?.cnt || 0),
              total: Number(totalEmp[0]?.cnt || 0),
            },
            timestamp: today,
          };
        }
        case 'cash': {
          const cashBal = await query(
            `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
             WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='cash' OR name LIKE '%cash%')`,
          );
          return {
            domain,
            summary: `Cash balance: ${round2(Number(cashBal[0]?.val || 0))}`,
            metrics: { cashBalance: Number(cashBal[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'accounting': {
          const [expenses, revenue] = await Promise.all([
            query(
              `SELECT COALESCE(SUM(debit_total), 0) as val FROM journal_entries
               WHERE status='posted' AND voucher_type IN ('payment','journal','adjustment') AND date(entry_date)>=?`,
              [monthStart],
            ),
            query(
              `SELECT COALESCE(SUM(credit_total), 0) as val FROM journal_entries
               WHERE status='posted' AND voucher_type IN ('sales','receipt') AND date(entry_date)>=?`,
              [monthStart],
            ),
          ]);
          const rev = Number(revenue[0]?.val || 0);
          const exp = Number(expenses[0]?.val || 0);
          return {
            domain,
            summary: `MTD Revenue: ${round2(rev)}, Expenses: ${round2(exp)}, Profit: ${round2(rev - exp)}`,
            metrics: {
              revenue: rev,
              expenses: exp,
              profit: rev - exp,
            },
            timestamp: today,
          };
        }
        case 'gst': {
          const gst = await query(
            `SELECT gst_type, COALESCE(SUM(gst_amount), 0) as total
             FROM gst_registers WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m', 'now')
             GROUP BY gst_type`,
          );
          let input = 0,
            output = 0;
          for (const r of gst) {
            if (r.gst_type === 'input') input = Number(r.total || 0);
            if (r.gst_type === 'output') output = Number(r.total || 0);
          }
          return {
            domain,
            summary: `GST Output: ${round2(output)}, Input: ${round2(input)}, Payable: ${round2(output - input)}`,
            metrics: {
              gstOutput: output,
              gstInput: input,
              gstPayable: output - input,
            },
            timestamp: today,
          };
        }
        case 'excise': {
          return {
            domain,
            summary: 'Excise data available in liquor module',
            metrics: { exciseBalance: 0 },
            timestamp: today,
          };
        }
        case 'liquor': {
          const bottles = await query(
            'SELECT COUNT(*) as cnt FROM liquor_bottles WHERE is_active=1',
          );
          return {
            domain,
            summary: `Active liquor bottles: ${bottles[0]?.cnt || 0}`,
            metrics: { bottleCount: Number(bottles[0]?.cnt || 0) },
            timestamp: today,
          };
        }
        case 'supplier': {
          const outstanding = await query(
            `SELECT COALESCE(SUM(outstanding), 0) as val FROM supplier_balances`,
          );
          return {
            domain,
            summary: `Outstanding supplier payments: ${round2(Number(outstanding[0]?.val || 0))}`,
            metrics: { outstandingAmount: Number(outstanding[0]?.val || 0) },
            timestamp: today,
          };
        }
        case 'workflow': {
          const [active, failed] = await Promise.all([
            query(
              `SELECT COUNT(*) as cnt FROM workflow_instances WHERE status IN ('pending','running','paused')`,
            ),
            query(
              `SELECT COUNT(*) as cnt FROM workflow_instances WHERE status='failed'`,
            ),
          ]);
          return {
            domain,
            summary: `${active[0]?.cnt || 0} active, ${failed[0]?.cnt || 0} failed workflows`,
            metrics: {
              active: Number(active[0]?.cnt || 0),
              failed: Number(failed[0]?.cnt || 0),
            },
            timestamp: today,
          };
        }
        case 'sync': {
          const [queue, conflicts] = await Promise.all([
            query(
              `SELECT COUNT(*) as cnt FROM sync_queue WHERE status IN ('pending','failed')`,
            ),
            query(
              `SELECT COUNT(*) as cnt FROM conflict_log WHERE resolution='unresolved'`,
            ),
          ]);
          return {
            domain,
            summary: `${queue[0]?.cnt || 0} queued, ${conflicts[0]?.cnt || 0} conflicts`,
            metrics: {
              pendingQueue: Number(queue[0]?.cnt || 0),
              unresolvedConflicts: Number(conflicts[0]?.cnt || 0),
            },
            timestamp: today,
          };
        }
        case 'hr': {
          const count = await query(
            'SELECT COUNT(*) as cnt FROM employees WHERE is_active=1',
          );
          return {
            domain,
            summary: `Active employees: ${count[0]?.cnt || 0}`,
            metrics: { headcount: Number(count[0]?.cnt || 0) },
            timestamp: today,
          };
        }
        case 'purchasing': {
          const orders = await query(
            `SELECT COALESCE(SUM(total_amount), 0) as val FROM purchase_orders
             WHERE strftime('%Y-%m', order_date)=strftime('%Y-%m', 'now') AND status IN ('received','invoiced','closed')`,
          );
          return {
            domain,
            summary: `Monthly purchase value: ${round2(Number(orders[0]?.val || 0))}`,
            metrics: { monthlyPurchases: Number(orders[0]?.val || 0) },
            timestamp: today,
          };
        }
        default:
          return null;
      }
    } catch {
      return {
        domain,
        summary: `Unable to fetch data for ${domain}`,
        metrics: {},
        timestamp: now(),
      };
    }
  },

  getGraph(selectedDomains?: T.BusinessDomain[]): T.BusinessGraph {
    const allDomains = selectedDomains || T.VALID_DOMAINS;
    const nodes: T.BusinessGraphNode[] = allDomains.map((d) => {
      const info = DOMAIN_RELATIONSHIPS[d];
      return {
        domain: d,
        label: info?.label || d,
        metrics: info?.metrics || [],
        connections: info?.connections || [],
      };
    });
    const edges: T.BusinessGraphEdge[] = [];
    for (const node of nodes) {
      for (const conn of node.connections) {
        if (allDomains.includes(conn)) {
          edges.push({
            source: node.domain,
            target: conn,
            relationship: `${node.label} relates to ${DOMAIN_RELATIONSHIPS[conn]?.label || conn}`,
          });
        }
      }
    }
    return { nodes, edges };
  },

  getDomainRelationships(): Record<
    T.BusinessDomain,
    { label: string; metrics: string[]; connections: T.BusinessDomain[] }
  > {
    return DOMAIN_RELATIONSHIPS;
  },
};
