# Enterprise Business Intelligence & Executive Analytics

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ANALYTICS LAYER — READ-OPTIMIZED                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Routes (74 endpoints)                                                      │
│  ├── /api/analytics/dashboard/:role          → Role-specific dashboard      │
│  ├── /api/analytics/kpis/*                   → Operational KPIs             │
│  ├── /api/analytics/financial/*              → Financial KPIs               │
│  ├── /api/analytics/inventory/*              → Inventory analytics          │
│  ├── /api/analytics/hospitality/*            → Hospitality analytics        │
│  ├── /api/analytics/summaries/*              → Materialized summaries       │
│  ├── /api/analytics/trends/*                 → Trend analysis               │
│  ├── /api/analytics/events/*                 → Analytics events             │
│  ├── /api/analytics/export/*                 → Export (CSV/Excel/PDF)       │
│  └── /api/analytics/health                   → System health                │
│                                                                             │
│  Service Modules                                                            │
│  ├── DashboardService         → 12 dashboard configurations                 │
│  ├── OperationalKpiService    → 10 operational KPI calculators              │
│  ├── FinancialKpiService      → 10 financial KPI calculators                │
│  ├── InventoryAnalyticsService → 8 inventory analytics                      │
│  ├── HospitalityAnalyticsService → 8 hospitality analytics                  │
│  ├── AnalyticsEventService    → 5 event types                              │
│  ├── TrendAnalysisService     → 4 analysis methods                          │
│  ├── SummaryComputationService → Daily/weekly/monthly/yearly                │
│  └── CacheService             → TTL-based KPI caching                      │
│                                                                             │
│  Repository (60+ methods)                                                   │
│  ├── KPI Definitions (6)     → CRUD for KPI catalog                        │
│  ├── Dashboard Configs (5)   → CRUD for role dashboards                    │
│  ├── Daily Summaries (10)    → Compute + upsert + query                    │
│  ├── Weekly Summaries (5)    → Aggregate + query                           │
│  ├── Monthly Summaries (8)   → Aggregate + compute derived KPIs            │
│  ├── Yearly Summaries (5)    → Aggregate + query                           │
│  ├── Cache (8)               → TTL key-value store                         │
│  ├── Events (6)              → Snapshot + alert storage                    │
│  └── Transactional Bridge (17) → Read-only access to all domains           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

```
kpi_definitions (1:N) ── dashboard_configs
       │
       ├── key used in analytics_cache
       │
       └── key referenced in dashboard_configs.sections[].kpiKeys

daily_summaries (N:1) ── weekly_summaries (N:1) ── monthly_summaries (N:1) ── yearly_summaries
       │                      │                         │
       └── Aggregated from    └── Aggregated from       └── Aggregated from
           journal_entries        daily_summaries           daily_summaries
           rooms                                             + domain-specific
           sales                                              calculations (ADR,
           bar_sales                                          RevPAR, margin, etc.)
           inventory
           gst_registers

analytics_cache
  └── cache_key : KPI key + filter hash
  └── data      : JSON serialized result
  └── expires_at: TTL-based expiry

analytics_events
  └── event_type   : daily_snapshot | weekly_summary | monthly_summary
                     yearly_summary | threshold_alert | trend_detection
                     anomaly_detection
  └── period       : YYYY-MM-DD or YYYY-WW or YYYY-MM
  └── data         : JSON snapshot of KPI values
  └── threshold_breaches: JSON array of breached thresholds
```

## Summary Computation Flow

```
Trigger (manual or scheduled)
  │
  ├── computeAndSaveDailySummary(date)
  │     ├── Get journal revenue by type (room, restaurant, bar, other)
  │     ├── Get total expenses
  │     ├── Get account balances (cash, bank, receivables, payables)
  │     ├── Get restaurant covers + average bill
  │     ├── Get bar sales
  │     ├── Get occupancy rate
  │     ├── Get GST summary
  │     ├── Get inventory value
  │     └── UPSERT into daily_summaries
  │
  ├── computeAndSaveWeeklySummary(weekStart, weekEnd)
  │     └── Aggregate daily_summaries for the 7-day range
  │
  ├── computeAndSaveMonthlySummary(year, month)
  │     ├── Aggregate daily_summaries for the month
  │     ├── Compute: gross_margin, net_margin, ADR, RevPAR
  │     ├── Compute: inventory_turnover = COGS / avg_inventory
  │     ├── Compute: department profits from revenue splits
  │     └── UPSERT into monthly_summaries
  │
  ├── computeAndSaveYearlySummary(year)
  │     ├── Aggregate monthly_summaries for the year
  │     └── UPSERT into yearly_summaries
  │
  └── generateAnalyticsEvents(period)
        ├── Daily snapshot: all KPI values for the day
        ├── Threshold alerts: KPIs outside acceptable ranges
        └── Trend check: direction and magnitude of changes
```

## KPI Catalog (50+ KPIs across 11 categories)

### Revenue (4)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Daily Revenue | SUM(credit_total) WHERE status=posted | INR | owner, manager, accountant, finance |
| Department Revenue | Revenue split by voucher_type | INR | owner, manager, accountant, finance |
| Monthly Revenue | SUM(daily_summaries.total_revenue) | INR | owner, manager, accountant, finance |
| Peak Hour Revenue | MAX(revenue BY hour) | INR | owner, manager, restaurant, bar |

### Occupancy (3)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Occupancy Rate | (occupied_rooms / total_rooms) * 100 | % | owner, manager, hotel |
| ADR | room_revenue / occupied_room_nights | INR | owner, manager, hotel |
| RevPAR | room_revenue / available_room_nights | INR | owner, manager, hotel |

### Restaurant (4)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Restaurant Covers | COUNT(restaurant_orders) WHERE date=today | count | owner, manager, restaurant |
| Average Bill | total_revenue / total_covers | INR | owner, manager, restaurant |
| Table Turnover | total_covers / total_tables | turns | owner, manager, restaurant |
| Complimentary % | (complimentary_value / total_revenue) * 100 | % | owner, manager, restaurant |

### Bar (3)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Bar Sales | SUM(bar_sales.total) | INR | owner, manager, bar |
| Bartender Productivity | COUNT(pour_log) GROUP BY bartender | pours | owner, manager, bar |
| Popular Brands | COUNT(bar_sale_lines) GROUP BY brand | count | bar, manager |

### Inventory (5)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Inventory Turnover | COGS / avg_inventory_value | turns | owner, manager, inventory |
| Inventory Value | SUM(quantity * unit_cost) | INR | owner, manager, inventory |
| Shrinkage % | (shrinkage_value / total_value) * 100 | % | inventory, manager |
| Dead Stock Count | COUNT(items WHERE no_movement > 90 days) | count | inventory, manager |
| Reorder Alerts | COUNT(items WHERE stock <= reorder_level) | count | inventory, manager |

### Purchasing (3)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Purchase Efficiency | (on_time / total) * 100 | % | owner, manager, purchasing |
| Supplier On-Time Rate | AVG(supplier.on_time_rate) | % | purchasing, manager |
| Supplier Quality Rating | AVG(supplier.quality_rating) | rating | purchasing, manager |

### Finance (10)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Gross Profit | total_revenue - cogs | INR | owner, manager, accountant, finance |
| Gross Margin | (gross_profit / total_revenue) * 100 | % | owner, manager, accountant, finance |
| Net Profit | total_revenue - total_expenses | INR | owner, manager, accountant, finance |
| Net Margin | (net_profit / total_revenue) * 100 | % | owner, manager, accountant, finance |
| Cash Flow | cash_in - cash_out | INR | owner, manager, accountant, finance |
| Cash Position | SUM(balance) WHERE account_type=cash | INR | owner, manager, accountant, finance |
| Bank Position | SUM(balance) WHERE account_type=bank | INR | owner, manager, accountant, finance |
| Receivables | SUM(balance) WHERE receivable | INR | owner, manager, accountant, finance |
| Payables | SUM(balance) WHERE payable | INR | owner, manager, accountant, finance |
| Outstanding Payments | receivables + payables | INR | owner, manager, accountant, finance |

### GST (3)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| GST Payable | SUM(gst_amount) WHERE type=output | INR | owner, accountant, finance |
| GST Input Credit | SUM(gst_amount) WHERE type=input | INR | owner, accountant, finance |
| GST Net Liability | gst_payable - gst_input_credit | INR | owner, accountant, finance |

### Department Profitability (3)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Room Dept Profit | room_revenue - room_expenses | INR | owner, manager, finance |
| Restaurant Dept Profit | restaurant_revenue - restaurant_expenses | INR | owner, manager, finance |
| Bar Dept Profit | bar_revenue - bar_expenses | INR | owner, manager, finance |

### Hotel & Seasonality (4)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Cancellation Rate | (cancelled / total) * 100 | % | owner, manager, hotel |
| Length of Stay | AVG(checkout - checkin) | days | owner, manager, hotel |
| Seasonality Index | month_revenue / avg_monthly_revenue | ratio | owner, manager |

### Employee (3 — placeholder for payroll)
| KPI | Formula | Unit | Roles |
|-----|---------|------|-------|
| Payroll Cost | SUM(salary + wages) | INR | owner, manager, finance |
| Employee Count | COUNT(active_employees) | count | owner, manager |
| Cost Per Employee | payroll_cost / employee_count | INR | owner, finance |

## API Summary

| Category | Endpoints | Auth Roles |
|----------|-----------|------------|
| Dashboard | 12 | Per-role |
| Operational KPIs | 10 | owner, manager, accountant |
| Financial KPIs | 10 | owner, manager, accountant, finance |
| Inventory Analytics | 8 | owner, manager, inventory |
| Hospitality Analytics | 8 | owner, manager, hotel, restaurant, bar |
| Summary Management | 9 | owner, manager |
| Analytics Events | 6 | owner, manager |
| Trend Analysis | 5 | owner, manager, accountant |
| Health & Cache | 3 | owner, admin |
| Export | 4 | owner, manager, accountant |

## File Structure

```
src/domains/analytics/
├── analytics.types.ts        # 60+ interfaces, 10 enums, 5 type aliases (~250 lines)
├── analytics.repository.ts   # 65+ data access methods (materialized + bridge) (~1233 lines)
├── analytics.service.ts      # 9 service modules, 40+ methods (~1372 lines)
├── analytics.routes.ts       # 74 REST endpoints (~813 lines)
└── analytics.seed.ts         # 46 KPI definitions, 9 dashboard configs (~236 lines)

tests/analytics.test.ts       # 153 test cases across 16 describe blocks
```

## Performance Targets

| Endpoint Type | Target P95 | Cached | Uncached |
|--------------|------------|--------|----------|
| Dashboard render | 200ms | ✅ | 500ms |
| Single KPI value | 50ms | ✅ | 200ms |
| Trend analysis | 100ms | ✅ (600s TTL) | 400ms |
| Export | 1s | — | 2s |
| Summary recompute (daily) | 500ms | — | 500ms |
| Summary recompute (monthly) | 2s | — | 2s |
