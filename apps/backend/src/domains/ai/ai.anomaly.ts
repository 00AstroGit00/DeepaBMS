import { query } from '../../db';
import * as T from './ai.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const now = (): string => new Date().toISOString();

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Anomaly Service ───────────────────────────────────────────────────

export const AnomalyService = {
  async detectAnomalies(request: T.AnomalyRequest): Promise<T.AnomalyResponse> {
    const allAnomalies: T.Anomaly[] = [];

    for (const domain of request.domains) {
      const domainAnomalies = await this.detectDomainAnomalies(
        domain as unknown as T.AnomalyCategory,
        request.timeRange,
        request.sensitivity,
      );
      allAnomalies.push(...domainAnomalies);
    }

    const ranked = this.rankBySeverity(allAnomalies);
    const summary = this.generateSummary(ranked);

    return {
      anomalies: ranked,
      summary,
    };
  },

  async detectDomainAnomalies(
    domain: T.AnomalyCategory,
    timeRange: { from: string; to: string },
    sensitivity: number,
  ): Promise<T.Anomaly[]> {
    const threshold = 4 - sensitivity; // sensitivity 1-5 maps to z-score threshold 3 down to 0.5

    try {
      switch (domain) {
        case 'inventory':
          return this.detectInventoryAnomalies(timeRange, threshold);
        case 'bottle_loss':
          return this.detectBottleLossAnomalies(timeRange, threshold);
        case 'discount':
          return this.detectDiscountAnomalies(timeRange, threshold);
        case 'payroll':
          return this.detectPayrollAnomalies(timeRange, threshold);
        case 'attendance':
          return this.detectAttendanceAnomalies(timeRange, threshold);
        case 'supplier':
          return this.detectSupplierAnomalies(timeRange, threshold);
        case 'cash':
          return this.detectCashAnomalies(timeRange, threshold);
        case 'accounting':
          return this.detectAccountingAnomalies(timeRange, threshold);
        case 'workflow':
          return this.detectWorkflowAnomalies(timeRange, threshold);
        case 'sync':
          return this.detectSyncAnomalies(timeRange, threshold);
        default:
          return [];
      }
    } catch {
      return [];
    }
  },

  // ── Domain-specific anomaly detectors ─────────────────────────────

  async detectInventoryAnomalies(
    timeRange: { from: string; to: string },
    threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const items = await query(
      `SELECT id, name, stock, min_stock FROM inventory WHERE is_active=1`,
    );
    for (const item of items) {
      const stock = Number(item.stock || 0);
      const minStock = Number(item.min_stock || 0);
      if (minStock > 0 && stock < minStock * 0.5) {
        const deviation = minStock - stock;
        anomalies.push({
          id: uid('anom'),
          domain: 'inventory',
          metric: 'stockLevel',
          expectedValue: minStock,
          actualValue: stock,
          deviation,
          zScore: round2(deviation / Math.max(minStock, 1)),
          severity: stock === 0 ? 'critical' : 'high',
          explanation: `Stock level for ${item.name} dropped ${deviation > 100 ? 'significantly' : 'moderately'} below reorder point`,
          timestamp: now(),
          source: 'inventory',
        });
      }
    }
    return anomalies;
  },

  async detectBottleLossAnomalies(
    _timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const bottles = await query(
      `SELECT b.id, b.name, b.expected_stock, b.actual_stock
       FROM liquor_bottles b WHERE b.is_active=1`,
    );
    for (const bottle of bottles) {
      const expected = Number(bottle.expected_stock || 0);
      const actual = Number(bottle.actual_stock || 0);
      if (expected > 0) {
        const variancePct = ((expected - actual) / expected) * 100;
        if (variancePct > 5) {
          anomalies.push({
            id: uid('anom'),
            domain: 'bottle_loss',
            metric: 'bottleVariance',
            expectedValue: expected,
            actualValue: actual,
            deviation: expected - actual,
            zScore: round2(variancePct / 5),
            severity:
              variancePct > 15
                ? 'critical'
                : variancePct > 10
                  ? 'high'
                  : 'medium',
            explanation: `Bottle variance of ${round2(variancePct)}% detected for ${bottle.name}`,
            timestamp: now(),
            source: 'liquor',
          });
        }
      }
    }
    return anomalies;
  },

  async detectDiscountAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const discounts = await query(
      `SELECT id, discount_percent, bill_id, created_at
       FROM restaurant_bills
       WHERE discount_percent > 0 AND date(created_at) BETWEEN ? AND ?
       ORDER BY discount_percent DESC LIMIT 10`,
      [timeRange.from, timeRange.to],
    );
    for (const d of discounts) {
      const pct = Number(d.discount_percent || 0);
      if (pct > 30) {
        anomalies.push({
          id: uid('anom'),
          domain: 'discount',
          metric: 'discountRate',
          expectedValue: 15,
          actualValue: pct,
          deviation: pct - 15,
          zScore: round2((pct - 15) / 5),
          severity: pct > 50 ? 'critical' : pct > 40 ? 'high' : 'medium',
          explanation: `High discount of ${pct}% on bill ${d.bill_id || 'unknown'}`,
          timestamp: d.created_at || now(),
          source: 'restaurant',
        });
      }
    }
    return anomalies;
  },

  async detectPayrollAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const normalPayroll = 50000; // expected normal payroll
    const payroll = await query(
      `SELECT COALESCE(SUM(amount), 0) as val FROM payroll_entries
       WHERE pay_date BETWEEN ? AND ? AND status='paid'`,
      [timeRange.from, timeRange.to],
    );
    const totalPayroll = Number(payroll[0]?.val || 0);
    if (totalPayroll > normalPayroll * 2) {
      anomalies.push({
        id: uid('anom'),
        domain: 'payroll',
        metric: 'payrollAmount',
        expectedValue: normalPayroll,
        actualValue: totalPayroll,
        deviation: totalPayroll - normalPayroll,
        zScore: round2((totalPayroll - normalPayroll) / normalPayroll),
        severity: totalPayroll > normalPayroll * 3 ? 'critical' : 'high',
        explanation: `Payroll of ₹${round2(totalPayroll).toLocaleString()} is more than 2x the normal amount`,
        timestamp: now(),
        source: 'payroll',
      });
    }
    return anomalies;
  },

  async detectAttendanceAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const absences = await query(
      `SELECT date(login_time) as day, COUNT(*) as absent_count
       FROM attendance
       WHERE status='absent' AND date(login_time) BETWEEN ? AND ?
       GROUP BY date(login_time) ORDER BY absent_count DESC LIMIT 5`,
      [timeRange.from, timeRange.to],
    );
    const totalEmp = await query(
      'SELECT COUNT(*) as cnt FROM employees WHERE is_active=1',
    );
    const totalCount = Number(totalEmp[0]?.cnt || 1);
    for (const a of absences) {
      const absentCount = Number(a.absent_count || 0);
      const pct = (absentCount / totalCount) * 100;
      if (pct > 20) {
        anomalies.push({
          id: uid('anom'),
          domain: 'attendance',
          metric: 'absenteeism',
          expectedValue: totalCount * 0.1,
          actualValue: absentCount,
          deviation: absentCount - totalCount * 0.1,
          zScore: round2(pct / 10),
          severity: pct > 30 ? 'high' : 'medium',
          explanation: `Absenteeism of ${round2(pct)}% on ${a.day} exceeds 20% threshold`,
          timestamp: a.day || now(),
          source: 'attendance',
        });
      }
    }
    return anomalies;
  },

  async detectSupplierAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const lateDeliveries = await query(
      `SELECT po.id, po.supplier_name, po.order_date, po.expected_date, po.status
       FROM purchase_orders po
       WHERE po.expected_date IS NOT NULL AND po.expected_date < ? AND po.status != 'received'
       AND po.order_date BETWEEN ? AND ?`,
      [now().split('T')[0], timeRange.from, timeRange.to],
    );
    if (lateDeliveries.length > 0) {
      const rate =
        (lateDeliveries.length / Math.max(lateDeliveries.length + 10, 1)) * 100;
      if (rate > 50) {
        anomalies.push({
          id: uid('anom'),
          domain: 'supplier',
          metric: 'lateDeliveryRate',
          expectedValue: 50,
          actualValue: rate,
          deviation: rate - 50,
          zScore: round2((rate - 50) / 10),
          severity: rate > 80 ? 'critical' : 'high',
          explanation: `${lateDeliveries.length} late supplier deliveries (${round2(rate)}% late rate)`,
          timestamp: now(),
          source: 'purchasing',
        });
      }
    }
    return anomalies;
  },

  async detectCashAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const cashAccount = await query(
      `SELECT id, name, balance, expected_balance
       FROM chart_of_accounts
       WHERE account_type='asset' AND is_active=1 AND is_group=0
       AND account_sub_type='cash' AND expected_balance IS NOT NULL`,
    );
    for (const acct of cashAccount) {
      const balance = Number(acct.balance || 0);
      const expected = Number(acct.expected_balance || 0);
      if (expected > 0) {
        const diff = Math.abs(balance - expected);
        const diffPct = (diff / expected) * 100;
        if (diffPct > 10) {
          anomalies.push({
            id: uid('anom'),
            domain: 'cash',
            metric: 'cashShortage',
            expectedValue: expected,
            actualValue: balance,
            deviation: balance - expected,
            zScore: round2(diffPct / 5),
            severity: diffPct > 20 ? 'critical' : 'high',
            explanation: `Cash shortage of ₹${round2(diff).toLocaleString()} (${round2(diffPct)}%) in ${acct.name}`,
            timestamp: now(),
            source: 'accounting',
          });
        }
      }
    }
    return anomalies;
  },

  async detectAccountingAnomalies(
    timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const entries = await query(
      `SELECT je.id, je.voucher_type, je.debit_total, je.credit_total, je.entry_date
       FROM journal_entries je
       WHERE je.status='posted' AND date(je.entry_date) BETWEEN ? AND ?
       AND je.debit_total != je.credit_total`,
      [timeRange.from, timeRange.to],
    );
    for (const entry of entries) {
      const debit = Number(entry.debit_total || 0);
      const credit = Number(entry.credit_total || 0);
      if (Math.abs(debit - credit) > 0.01) {
        anomalies.push({
          id: uid('anom'),
          domain: 'accounting',
          metric: 'journalImbalance',
          expectedValue: credit,
          actualValue: debit,
          deviation: debit - credit,
          zScore: round2(
            Math.abs(debit - credit) / Math.max(Math.abs(credit), 1),
          ),
          severity: Math.abs(debit - credit) > 10000 ? 'critical' : 'high',
          explanation: `Journal entry ${entry.id} has imbalance: debit ₹${round2(debit)} vs credit ₹${round2(credit)}`,
          timestamp: entry.entry_date || now(),
          source: 'accounting',
        });
      }
    }
    return anomalies;
  },

  async detectWorkflowAnomalies(
    _timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const [total, failed] = await Promise.all([
      query('SELECT COUNT(*) as cnt FROM workflow_instances'),
      query(
        "SELECT COUNT(*) as cnt FROM workflow_instances WHERE status='failed'",
      ),
    ]);
    const totalCount = Number(total[0]?.cnt || 0);
    const failedCount = Number(failed[0]?.cnt || 0);
    if (totalCount > 0) {
      const failureRate = (failedCount / totalCount) * 100;
      if (failureRate > 20) {
        anomalies.push({
          id: uid('anom'),
          domain: 'workflow',
          metric: 'failureRate',
          expectedValue: totalCount * 0.1,
          actualValue: failedCount,
          deviation: failedCount - totalCount * 0.1,
          zScore: round2(failureRate / 10),
          severity: failureRate > 40 ? 'critical' : 'high',
          explanation: `Workflow failure rate of ${round2(failureRate)}% exceeds 20% threshold`,
          timestamp: now(),
          source: 'workflow',
        });
      }
    }
    return anomalies;
  },

  async detectSyncAnomalies(
    _timeRange: { from: string; to: string },
    _threshold: number,
  ): Promise<T.Anomaly[]> {
    const anomalies: T.Anomaly[] = [];
    const [total, failed] = await Promise.all([
      query('SELECT COUNT(*) as cnt FROM sync_queue'),
      query("SELECT COUNT(*) as cnt FROM sync_queue WHERE status='failed'"),
    ]);
    const totalCount = Number(total[0]?.cnt || 0);
    const failedCount = Number(failed[0]?.cnt || 0);
    if (totalCount > 0) {
      const failureRate = (failedCount / totalCount) * 100;
      if (failureRate > 20) {
        anomalies.push({
          id: uid('anom'),
          domain: 'sync',
          metric: 'syncFailureRate',
          expectedValue: totalCount * 0.1,
          actualValue: failedCount,
          deviation: failedCount - totalCount * 0.1,
          zScore: round2(failureRate / 10),
          severity: failureRate > 40 ? 'critical' : 'high',
          explanation: `Sync failure rate of ${round2(failureRate)}% exceeds 20% threshold`,
          timestamp: now(),
          source: 'sync',
        });
      }
    }
    return anomalies;
  },

  // ── Reusable detection methods ────────────────────────────────────

  zScoreDetection(data: number[], threshold = 2): T.Anomaly[] {
    if (data.length < 3) return [];
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length,
    );
    if (stdDev === 0) return [];

    const anomalies: T.Anomaly[] = [];
    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs(data[i] - mean) / stdDev;
      if (zScore > threshold) {
        anomalies.push({
          id: uid('anom'),
          domain: 'inventory',
          metric: 'value',
          expectedValue: round2(mean),
          actualValue: round2(data[i]),
          deviation: round2(data[i] - mean),
          zScore: round2(zScore),
          severity: zScore > 3 ? 'critical' : 'high',
          explanation: this.explainAnomaly({
            id: '',
            domain: 'inventory',
            metric: 'value',
            expectedValue: mean,
            actualValue: data[i],
            deviation: data[i] - mean,
            zScore,
            severity: zScore > 3 ? 'critical' : 'high',
            explanation: '',
            timestamp: now(),
            source: 'statistical',
          }),
          timestamp: now(),
          source: 'statistical',
        });
      }
    }
    return anomalies;
  },

  iqrDetection(data: number[]): T.Anomaly[] {
    if (data.length < 4) return [];
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const anomalies: T.Anomaly[] = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] < lowerBound || data[i] > upperBound) {
        anomalies.push({
          id: uid('anom'),
          domain: 'inventory',
          metric: 'value',
          expectedValue: round2((q1 + q3) / 2),
          actualValue: round2(data[i]),
          deviation: round2(data[i] - (q1 + q3) / 2),
          zScore: round2(Math.abs(data[i] - (q1 + q3) / 2) / Math.max(iqr, 1)),
          severity: 'medium',
          explanation: `Value ${round2(data[i])} is outside IQR range [${round2(lowerBound)}, ${round2(upperBound)}]`,
          timestamp: now(),
          source: 'statistical',
        });
      }
    }
    return anomalies;
  },

  percentageChangeDetection(data: number[], maxChange = 50): T.Anomaly[] {
    if (data.length < 2) return [];
    const anomalies: T.Anomaly[] = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      if (prev === 0) continue;
      const changePct = ((data[i] - prev) / prev) * 100;
      if (Math.abs(changePct) > maxChange) {
        anomalies.push({
          id: uid('anom'),
          domain: 'inventory',
          metric: 'change',
          expectedValue: round2(prev),
          actualValue: round2(data[i]),
          deviation: round2(data[i] - prev),
          zScore: round2(Math.abs(changePct) / maxChange),
          severity: Math.abs(changePct) > maxChange * 2 ? 'critical' : 'high',
          explanation: `Sudden ${changePct > 0 ? 'increase' : 'decrease'} of ${round2(Math.abs(changePct))}% detected`,
          timestamp: now(),
          source: 'statistical',
        });
      }
    }
    return anomalies;
  },

  // ── Utility methods ───────────────────────────────────────────────

  explainAnomaly(anomaly: T.Anomaly): string {
    if (anomaly.explanation) return anomaly.explanation;
    const direction = anomaly.deviation > 0 ? 'above' : 'below';
    return `Value ${round2(anomaly.actualValue)} is ${direction} expected ${round2(anomaly.expectedValue)} by ${round2(Math.abs(anomaly.deviation))} (z-score: ${round2(anomaly.zScore)})`;
  },

  rankBySeverity(anomalies: T.Anomaly[]): T.Anomaly[] {
    const severityWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...anomalies].sort(
      (a, b) =>
        (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0) ||
        Math.abs(b.zScore) - Math.abs(a.zScore),
    );
  },

  generateSummary(anomalies: T.Anomaly[]): string {
    if (!anomalies.length)
      return 'No anomalies detected across the requested domains.';
    const bySeverity: Record<string, number> = {};
    for (const a of anomalies) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    }
    const parts: string[] = [];
    if (bySeverity.critical) parts.push(`${bySeverity.critical} critical`);
    if (bySeverity.high) parts.push(`${bySeverity.high} high`);
    if (bySeverity.medium) parts.push(`${bySeverity.medium} medium`);
    if (bySeverity.low) parts.push(`${bySeverity.low} low`);
    return `Found ${anomalies.length} anomaly(ies): ${parts.join(', ')} severity.`;
  },
};
