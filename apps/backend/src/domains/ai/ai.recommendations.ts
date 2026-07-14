import { query } from '../../db';
import * as T from './ai.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const now = (): string => new Date().toISOString();

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Recommendation Service ────────────────────────────────────────────

export const RecommendationService = {
  async generateRecommendations(
    request: T.RecommendationRequest,
  ): Promise<T.RecommendationResponse> {
    const context = await this.gatherContext(request.domain);
    let recommendations: T.Recommendation[] = [];

    switch (request.domain) {
      case 'inventory':
        recommendations = this.reorderRecommendations(context);
        break;
      case 'restaurant':
        recommendations = [
          ...this.menuOptimizationRecommendations(context),
          ...this.pricingRecommendations(context),
        ];
        break;
      case 'rooms':
        recommendations = this.roomPricingRecommendations(context);
        break;
      case 'hr':
        recommendations = this.shiftPlanningRecommendations(context);
        break;
      case 'purchasing':
        recommendations = this.purchasingRecommendations(context);
        break;
      case 'cash':
        recommendations = this.cashManagementRecommendations(context);
        break;
      case 'payroll':
        recommendations = this.labourAllocationRecommendations(context);
        break;
      default:
        recommendations = this.operationalEfficiencyRecommendations(context);
    }

    if (request.focus) {
      const focus = request.focus.toLowerCase();
      recommendations = recommendations.filter(
        (r) =>
          r.category.toLowerCase().includes(focus) ||
          r.title.toLowerCase().includes(focus),
      );
    }

    if (request.limit && recommendations.length > request.limit) {
      recommendations = recommendations.slice(0, request.limit);
    }

    recommendations = recommendations.map((r) => ({
      ...r,
      id: r.id || uid('rec'),
    }));

    return {
      recommendations,
      generatedAt: now(),
    };
  },

  async gatherContext(domain: T.BusinessDomain): Promise<Record<string, any>> {
    const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];
    try {
      switch (domain) {
        case 'inventory': {
          const [reorderItems, invVal] = await Promise.all([
            query(
              `SELECT i.id, i.name, i.stock, i.min_stock, i.cost
               FROM inventory i WHERE i.is_active=1 AND i.min_stock > 0 AND i.stock <= i.min_stock
               ORDER BY (i.stock * 1.0 / i.min_stock) ASC`,
            ),
            query(
              'SELECT COALESCE(SUM(stock * cost), 0) as val FROM inventory WHERE is_active=1',
            ),
          ]);
          return { reorderItems, inventoryValue: Number(invVal[0]?.val || 0) };
        }
        case 'restaurant': {
          const [popularItems, covers] = await Promise.all([
            query(
              `SELECT mi.id, mi.name, mi.category, COUNT(oi.id) as order_count, SUM(oi.quantity * oi.rate) as revenue
               FROM menu_items mi
               LEFT JOIN order_items oi ON oi.item_id = mi.id
               WHERE mi.is_active=1
               GROUP BY mi.id
               ORDER BY order_count DESC LIMIT 20`,
            ),
            query(
              `SELECT COALESCE(SUM(guest_count), 0) as cnt FROM restaurant_orders
               WHERE date(created_at)>=? AND status IN ('served','completed','paid')`,
              [ms],
            ),
          ]);
          return { popularItems, covers: Number(covers[0]?.cnt || 0) };
        }
        case 'rooms': {
          const [occ, total] = await Promise.all([
            query("SELECT COUNT(*) as cnt FROM rooms WHERE status='occupied'"),
            query('SELECT COUNT(*) as cnt FROM rooms'),
          ]);
          return {
            occupancyRate:
              (Number(occ[0]?.cnt || 0) /
                Math.max(Number(total[0]?.cnt || 1), 1)) *
              100,
            occupied: Number(occ[0]?.cnt || 0),
            total: Number(total[0]?.cnt || 0),
          };
        }
        case 'hr':
        case 'payroll': {
          const [empCount, payroll] = await Promise.all([
            query('SELECT COUNT(*) as cnt FROM employees WHERE is_active=1'),
            query(
              `SELECT COALESCE(SUM(amount), 0) as val FROM payroll_entries
               WHERE pay_date >= ? AND status='paid'`,
              [ms],
            ),
          ]);
          return {
            employeeCount: Number(empCount[0]?.cnt || 0),
            totalPayroll: Number(payroll[0]?.val || 0),
          };
        }
        case 'cash': {
          const cashBal = await query(
            `SELECT COALESCE(SUM(balance), 0) as val FROM chart_of_accounts
             WHERE account_type='asset' AND is_active=1 AND is_group=0 AND (account_sub_type='cash' OR name LIKE '%cash%')`,
          );
          return { cashBalance: Number(cashBal[0]?.val || 0) };
        }
        case 'purchasing': {
          const [suppliers, orders] = await Promise.all([
            query(
              `SELECT s.id, s.name, s.rating, COALESCE(sb.outstanding, 0) as outstanding
               FROM suppliers s
               LEFT JOIN supplier_balances sb ON sb.supplier_id = s.id
               ORDER BY s.rating ASC LIMIT 10`,
            ),
            query(
              `SELECT COUNT(*) as cnt FROM purchase_orders WHERE status='pending'`,
            ),
          ]);
          return { suppliers, pendingOrders: Number(orders[0]?.cnt || 0) };
        }
        default:
          return {};
      }
    } catch {
      return {};
    }
  },

  reorderRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const items = context.reorderItems || [];
    if (items.length > 0) {
      recs.push({
        id: uid('rec'),
        domain: 'inventory',
        category: 'reorder',
        title: 'Urgent Stock Reorder Required',
        description: `${items.length} items are below reorder levels`,
        rationale: `Items need restocking to avoid stockouts. Total of ${items.length} items require immediate attention.`,
        expectedBenefit: 'Prevents revenue loss from stockouts',
        confidence: 0.9,
        priority: 'critical',
        requiresApproval: true,
        actions: items.map((item: any) => ({
          type: 'create_purchase_order',
          params: {
            itemId: item.id,
            quantity: item.min_stock * 2 - item.stock,
          },
          description: `Reorder ${item.name}`,
        })),
      });
    }
    if (context.inventoryValue > 500000) {
      recs.push({
        id: uid('rec'),
        domain: 'inventory',
        category: 'optimization',
        title: 'High Inventory Value Alert',
        description: `Inventory value of ₹${round2(context.inventoryValue).toLocaleString()} is high`,
        rationale:
          'High inventory ties up working capital. Consider reducing stock levels.',
        expectedBenefit:
          'Improves cash flow by reducing inventory holding costs',
        confidence: 0.7,
        priority: 'medium',
        requiresApproval: false,
        actions: [
          {
            type: 'run_inventory_analysis',
            params: {},
            description: 'Analyze slow-moving items for clearance',
          },
        ],
      });
    }
    return recs;
  },

  pricingRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const items = context.popularItems || [];
    const lowMarginItems = items.filter(
      (i: any) => i.revenue > 0 && i.order_count > 5,
    );
    if (lowMarginItems.length > 0) {
      recs.push({
        id: uid('rec'),
        domain: 'restaurant',
        category: 'pricing',
        title: 'Menu Item Margin Optimization',
        description: `${lowMarginItems.length} popular items may need price review`,
        rationale:
          'Popular items with low margins can be adjusted to improve overall profitability.',
        expectedBenefit: '3-5% improvement in restaurant gross margin',
        confidence: 0.75,
        priority: 'medium',
        requiresApproval: true,
        actions: [
          {
            type: 'review_pricing',
            params: {},
            description: 'Review pricing for top-selling items',
          },
        ],
      });
    }
    return recs;
  },

  menuOptimizationRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const items = context.popularItems || [];
    const slowItems = items.filter((i: any) => i.order_count <= 2);
    if (slowItems.length > 3) {
      recs.push({
        id: uid('rec'),
        domain: 'restaurant',
        category: 'menu_optimization',
        title: 'Menu Item Rationalization',
        description: `${slowItems.length} items have low order volume`,
        rationale:
          'Removing or replacing slow-moving menu items can reduce waste and simplify operations.',
        expectedBenefit: 'Reduces food waste and simplifies kitchen operations',
        confidence: 0.8,
        priority: 'medium',
        requiresApproval: true,
        actions: [
          {
            type: 'review_menu_items',
            params: { minOrders: 3 },
            description: 'Review slow-moving items for removal',
          },
        ],
      });
    }
    return recs;
  },

  roomPricingRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const occupancy = context.occupancyRate || 0;
    if (occupancy < 50) {
      recs.push({
        id: uid('rec'),
        domain: 'rooms',
        category: 'pricing',
        title: 'Low Occupancy - Promotional Pricing',
        description: `Current occupancy is ${round2(occupancy)}%`,
        rationale:
          'Low occupancy suggests need for promotional rates or package deals to attract guests.',
        expectedBenefit: '10-20% increase in occupancy rate',
        confidence: 0.8,
        priority: 'high',
        requiresApproval: true,
        actions: [
          {
            type: 'adjust_room_pricing',
            params: { discountPercent: 15, duration: '7 days' },
            description: 'Apply 15% promotional discount for 7 days',
          },
        ],
      });
    }
    if (occupancy > 85) {
      recs.push({
        id: uid('rec'),
        domain: 'rooms',
        category: 'pricing',
        title: 'High Occupancy - Rate Optimization',
        description: `Current occupancy is ${round2(occupancy)}%`,
        rationale:
          'High occupancy allows for dynamic pricing to maximize revenue.',
        expectedBenefit: '5-10% increase in ADR and RevPAR',
        confidence: 0.85,
        priority: 'high',
        requiresApproval: true,
        actions: [
          {
            type: 'increase_room_rates',
            params: { increasePercent: 10 },
            description: 'Increase room rates by 10%',
          },
        ],
      });
    }
    return recs;
  },

  shiftPlanningRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const empCount = context.employeeCount || 0;
    if (empCount < 5) {
      recs.push({
        id: uid('rec'),
        domain: 'hr',
        category: 'staffing',
        title: 'Understaffing Alert',
        description: `Only ${empCount} active employees`,
        rationale:
          'Low staffing levels may impact service quality and operational efficiency.',
        expectedBenefit:
          'Improves service quality and reduces employee burnout',
        confidence: 0.9,
        priority: 'high',
        requiresApproval: true,
        actions: [
          {
            type: 'initiate_recruitment',
            params: { positions: empCount < 3 ? 5 : 3 },
            description: 'Initiate recruitment for additional staff',
          },
        ],
      });
    }
    return recs;
  },

  purchasingRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const suppliers = context.suppliers || [];
    const lowRatedSuppliers = suppliers.filter(
      (s: any) => Number(s.rating || 0) < 3,
    );
    if (lowRatedSuppliers.length > 0) {
      recs.push({
        id: uid('rec'),
        domain: 'purchasing',
        category: 'supplier_management',
        title: 'Underperforming Suppliers Review',
        description: `${lowRatedSuppliers.length} suppliers have low ratings`,
        rationale:
          'Poor supplier performance affects inventory quality and delivery reliability.',
        expectedBenefit: 'Improves on-time delivery and quality',
        confidence: 0.8,
        priority: 'medium',
        requiresApproval: true,
        actions: lowRatedSuppliers.map((s: any) => ({
          type: 'review_supplier',
          params: { supplierId: s.id },
          description: `Review supplier: ${s.name}`,
        })),
      });
    }
    if (context.pendingOrders > 5) {
      recs.push({
        id: uid('rec'),
        domain: 'purchasing',
        category: 'workflow',
        title: 'Pending Purchase Orders',
        description: `${context.pendingOrders} purchase orders pending approval`,
        rationale:
          'Unapproved purchase orders may delay inventory replenishment.',
        expectedBenefit: 'Faster procurement cycle',
        confidence: 0.85,
        priority: 'high',
        requiresApproval: false,
        actions: [
          {
            type: 'approve_pending_orders',
            params: {},
            description: 'Review and approve pending POs',
          },
        ],
      });
    }
    return recs;
  },

  cashManagementRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const cashBalance = context.cashBalance || 0;
    if (cashBalance < 10000) {
      recs.push({
        id: uid('rec'),
        domain: 'cash',
        category: 'cash_management',
        title: 'Low Cash Balance Warning',
        description: `Cash balance is ₹${round2(cashBalance).toLocaleString()}`,
        rationale:
          'Low cash balance may affect daily operations and supplier payments.',
        expectedBenefit: 'Ensures operational liquidity',
        confidence: 0.9,
        priority: 'critical',
        requiresApproval: true,
        actions: [
          {
            type: 'transfer_funds',
            params: { amount: 50000, from: 'bank', to: 'cash' },
            description: 'Transfer funds from bank to cash',
          },
        ],
      });
    }
    return recs;
  },

  labourAllocationRecommendations(context: any): T.Recommendation[] {
    const recs: T.Recommendation[] = [];
    const payroll = context.totalPayroll || 0;
    const empCount = context.employeeCount || 1;
    const avgCost = payroll / empCount;
    if (avgCost > 30000) {
      recs.push({
        id: uid('rec'),
        domain: 'payroll',
        category: 'cost_optimization',
        title: 'High Average Employee Cost',
        description: `Average cost per employee is ₹${round2(avgCost).toLocaleString()}`,
        rationale:
          'High per-employee cost may indicate overstaffing or excessive overtime.',
        expectedBenefit: '15-20% reduction in payroll costs',
        confidence: 0.7,
        priority: 'medium',
        requiresApproval: true,
        actions: [
          {
            type: 'review_staffing_levels',
            params: {},
            description: 'Review department-wise staffing levels',
          },
        ],
      });
    }
    return recs;
  },

  operationalEfficiencyRecommendations(context: any): T.Recommendation[] {
    return [
      {
        id: uid('rec'),
        domain: 'workflow',
        category: 'optimization',
        title: 'Cross-Domain Efficiency Review',
        description: 'Review operational efficiency across all domains',
        rationale:
          'Regular cross-domain reviews help identify bottlenecks and improvement opportunities.',
        expectedBenefit: '5-10% improvement in overall operational efficiency',
        confidence: 0.65,
        priority: 'low',
        requiresApproval: false,
        actions: [
          {
            type: 'run_efficiency_audit',
            params: {},
            description: 'Run operational efficiency audit',
          },
        ],
      },
    ];
  },
};
