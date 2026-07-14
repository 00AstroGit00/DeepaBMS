> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# ADR-0013: Business Intelligence Architecture

**Status**: Accepted (2026-07-14)

**Domain**: Analytics

**Applies to**: Backend (apps/backend)

---

## Context

DeepaBMS has seven operational domains generating transactional data. The Financial Core (P4-2) provides double-entry accounting. Every domain produces data that management needs to analyze — revenue trends, occupancy, inventory turnover, supplier performance, GST liability, kitchen efficiency, bartender productivity.

The organization needs:
- Unified analytics across all domains without coupling to transactional schemas
- Role-specific executive dashboards for Owner, Manager, Accountant, Restaurant, Bar, Hotel, Inventory, Purchasing, and Finance
- Pre-computed materialized summaries to avoid expensive queries on transactional tables
- KPI library with 50+ defined metrics, formulas, and trend tracking
- Comparison, trend analysis, anomaly detection, and forecasting capability
- Exportable reports (CSV, Excel, PDF-ready structures)
- Future data warehouse and AI/ML integration without rewriting the analytics layer
- Payroll cost integration when P4-4 Payroll Automation begins

## Decision

### Architecture: Materialized Summary + Read-Optimized Query

The BI layer uses a **materialized summary pattern** with read-optimized queries:

```
┌────────────────────────────────────────────────────────────────────┐
│                  ANALYTICS LAYER (P4-3)                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐  │
│  │   Routes      │──→│   Service         │──→│   Repository       │  │
│  │   74 endpoints│   │   KPI calculation │   │   Materialized     │  │
│  └──────────────┘   │   Cache + Trends   │   │   summary access   │  │
│                     │   Event generation │   │   + transactional   │  │
│                     └──────────────────┘   │   read bridge       │  │
│                                            └────────┬───────────┘  │
│                                                     │               │
│                    ┌────────────────────────────────┴──────────┐   │
│                    │              ANALYTICS TABLES              │   │
│                    │  kpi_definitions     dashboard_configs     │   │
│                    │  daily_summaries     weekly_summaries      │   │
│                    │  monthly_summaries   yearly_summaries      │   │
│                    │  analytics_cache     analytics_events      │   │
│                    └────────────────────────────────────────────┘   │
│                                                     │               │
│                    ┌────────────────────────────────┴──────────┐   │
│                    │         TRANSACTIONAL DOMAINS (READ-ONLY)  │   │
│                    │  accounting     rooms       restaurant     │   │
│                    │  bar            inventory   purchasing     │   │
│                    │  sales          employees                  │   │
│                    └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Materialized Summary Strategy

**Never query operational tables directly for dashboards.** The analytics layer maintains six summary tables:

| Table | Granularity | Source | Refresh |
|-------|------------|--------|---------|
| `daily_summaries` | One row per day | Aggregated from journal_entries, rooms, restaurant, bar, inventory | On-demand or scheduled |
| `weekly_summaries` | One row per week | Aggregated from daily_summaries | Implicit from daily |
| `monthly_summaries` | One row per month | Aggregated from daily_summaries + additional domain calculations | On-demand |
| `yearly_summaries` | One row per year | Aggregated from monthly_summaries | On-demand |
| `analytics_cache` | Key-value with TTL | Computed KPI values | TTL-based |
| `analytics_events` | Event log | Generated snapshots/alerts | Event-driven |

### KPI Definition System

Each KPI is defined as a row in `kpi_definitions`:

| Field | Description |
|-------|-------------|
| key | Machine-readable identifier (e.g., `daily_revenue`) |
| name | Human-readable name |
| category | Revenue, occupancy, restaurant, bar, inventory, purchasing, finance, gst, excise, hotel, employee |
| formula | Expression describing calculation |
| unit | INR, %, count, turns, rating, ratio |
| is_percentage | Display as percentage |
| higher_is_better | Trend direction indicator |
| roles | JSON array of permitted dashboard roles |
| min_refresh_interval | Minimum seconds between refreshes |

### Dashboard Configuration

Each role gets a dashboard defined in `dashboard_configs`:

| Role | Focus Areas | KPI Count | Refresh |
|------|------------|-----------|---------|
| Owner | All KPIs, executive summary, trends | 20+ | 60s |
| Manager | Operational + financial, department comparison | 16+ | 60s |
| Accountant | Financial + GST, receivables/payables | 12+ | 300s |
| Restaurant | Covers, average bill, popular items, kitchen | 8+ | 30s |
| Bar | Sales, popular brands, bartender productivity | 6+ | 30s |
| Hotel | Occupancy, ADR, RevPAR, booking sources | 8+ | 60s |
| Inventory | Turnover, reorder alerts, stock ageing | 8+ | 300s |
| Purchasing | Supplier performance, efficiency | 6+ | 300s |
| Finance | Profitability, cash position, department P&L | 12+ | 300s |

### Caching Strategy

| Cache Layer | TTL | Purpose |
|-------------|-----|---------|
| Summary tables | Until recomputed | Materialized daily/weekly/monthly/yearly aggregates |
| analytics_cache | 300s default, 60s for operational, 600s for trends | Expensive KPI calculations |
| HTTP-level | None currently | Future: CDN/Redis |

### Separation of Concerns

The analytics layer is **read-only** with one exception: it writes to its own summary tables and cache. It never writes to any transactional table. This guarantees:

1. Transactional writes never block analytics reads
2. Analytics schema changes never affect operational queries
3. The BI layer can be rebuilt, scaled, or replaced independently
4. Future data warehouse ETL can consume the same summary tables

### KPI Formula Categories

| Type | Examples | Source |
|------|----------|--------|
| Direct aggregate | Daily Revenue = SUM(credit_total) | journal_entries |
| Rate | Occupancy = occupied/total * 100 | rooms table |
| Derived ratio | Gross Margin = (revenue - cogs) / revenue * 100 | computed in service |
| Time-series trend | Month-over-month change | computed in service |
| Anomaly | Deviation from rolling average | computed in service |

## Consequences

### Positive
- **Zero impact on transactional performance**: Dashboards never query operational tables directly
- **Role-specific views**: Each role sees only relevant KPIs without data leakage
- **Extensible KPI catalog**: New KPIs are rows in a table, not code changes
- **Payroll-ready**: When payroll automation begins, costs immediately appear in profitability reports
- **Audit trail**: Analytics events log every snapshot and threshold breach
- **Exportable**: All KPIs can be exported as CSV/Excel/PDF-ready JSON
- **Future-proof**: Summary tables serve as data mart for future data warehouse

### Negative
- **Stale data window**: Summaries are as fresh as the last refresh operation
- **Storage overhead**: Summary tables duplicate data from transactional tables
- **Refresh orchestration**: Must trigger recomputation after relevant operational events

### Trade-offs
- **Summary tables vs real-time compute**: Summaries are fast but potentially stale; the analytics_cache TTL provides a middle ground for operational KPIs
- **SQL-based vs OLAP cube**: SQL materialization is simpler and sufficient for current volume; future migration to OLAP (ClickHouse, DuckDB) is supported by the same summary table schema
- **Single vs distributed**: Current design is single-server SQLite; the repository abstraction allows swapping to PostgreSQL or dedicated analytics DB

## Future Roadmap

1. **Payroll Integration**: When P4-4 begins, add `payroll_cost`, `cost_per_employee` KPIs
2. **Automated Snapshot Scheduler**: Cron-based daily/weekly/monthly summary computation
3. **Alert Service**: Real-time threshold breach notifications via WebSocket/push
4. **Data Warehouse**: Periodic ETL from SQLite to dedicated analytics DB (ClickHouse/DuckDB)
5. **ML Forecasting**: Time-series forecasting using the trend data
6. **Anomaly Detection Service**: Automated outlier detection with configurable sensitivity
7. **Embedded Dashboards**: Iframe/API-based dashboards for POS terminals, KDS screens
8. **Natural Language Query**: LLM-powered "ask about your business" feature
