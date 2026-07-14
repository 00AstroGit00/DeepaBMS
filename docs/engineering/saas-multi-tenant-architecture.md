> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS — Multi-Tenant SaaS Architecture

> Status: Draft (Architecture Decision Record)
> Audience: Platform engineers, solution architects, DevOps
> Scope: How DeepaBMS is converted from a single-tenant hospitality ERP into a
> multi-tenant SaaS offering with hard tenant isolation, metering, billing, and
> white-labeling.

---

## 1. Goals & Non-Goals

### 1.1 Goals

- Support an arbitrary number of customers ("tenants") on shared infrastructure.
- Guarantee **cryptographic / logical isolation** so one tenant can never read or
  mutate another tenant's data.
- Provide a self-service provisioning flow (signup → trial → paid).
- Expose per-tenant feature flags, subscriptions, and usage metering.
- Support white-label deployments (custom domain, logo, colors, email sender).
- Enable per-tenant backup / restore without affecting other tenants.

### 1.2 Non-Goals

- Per-tenant dedicated hardware / single-tenant cloud accounts (covered by the
  `enterprise` plan "data-residency" add-on, not full isolation).
- A marketplace / app-store runtime for third-party plugins (future work).
- Rewriting the existing monolithic domain modules (`domains/*`); we add a
  tenancy layer *around* them.

---

## 2. Isolation Strategy — Hybrid Model

DeepaBMS uses a **hybrid isolation model**:

| Concern            | Strategy                                              |
|--------------------|-------------------------------------------------------|
| Tenant identity    | `tenant_id` column on every business table (RLS-ready)|
| Schema             | Dedicated Postgres *schema* per tenant (`t_<slug>`)   |
| Connection routing | Connection pool switches `search_path` per request    |
| Storage            | Tenant-scoped S3 prefix (`s3://bucket/<tenantSlug>/`) |
| Compute            | Shared app tier, isolated by `req.tenant` middleware  |
| Secrets            | Per-tenant KMS data key for PII columns (enterprise)  |

### 2.1 Why hybrid (not pure per-tenant-DB, not pure shared-table)

```
                  Pure Shared Table      Hybrid (chosen)      Pure Per-Tenant DB
                  ─────────────────      ──────────────       ─────────────────
Isolation          Weak (bugs leak)      Strong (schema)      Strongest
Cost / tenant      Lowest                Low                  High
Onboarding         Instant               Seconds (DDL)        Minutes (clone)
Backup granularity Table-level           Schema-level         DB-level
Cross-tenant query Hard to do safely     Easy (union)         Very hard
Blisk scaling      Best                  Good                 Poor
```

The hybrid model gives the **operational simplicity of shared infra** while
preserving **schema-level blast radius containment**: a misbehaving query or a
Postgres bug is contained to a single schema, and a single tenant can be backed
up / restored / migrated without touching others.

### 2.2 Row-Level `tenant_id`

Every business table carries a `tenant_id UUID NOT NULL` and a partial unique
index scoped to the tenant. Even though we route by schema, `tenant_id` is
retained as a defense-in-depth guard and to allow cross-tenant aggregation views
for the platform admin.

```
                                    ┌─────────────────────────────┐
  Request w/ X-Tenant-ID ───────▶   │   tenantMiddleware          │
  acme.deepabms.com                 │   resolve slug → schema     │
                                    │   set req.tenant            │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │   Pool: SET search_path =   │
                                    │   t_acme, shared, public    │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Postgres                                                    │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
        │  │ shared   │  │ t_acme   │  │ t_globex │  │ t_initech │   │
        │  │ (plans,  │  │ (sales,  │  │ (sales,  │  │ (sales,   │   │
        │  │ tenants) │  │  rooms…) │  │  rooms…) │  │  rooms…)  │   │
        │  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
        └──────────────────────────────────────────────────────────┘
```

---

## 3. Tenant Identity & Resolution

### 3.1 Resolution Order

1. **Header `X-Tenant-ID`** (machine-to-machine / API clients, internal jobs).
2. **Subdomain** `acme.deepabms.com` → slug `acme` (browser / mobile web).
3. **Custom domain** CNAME verified in `tenants.custom_domain`.
4. **Single-tenant fallback** when `SINGLE_TENANT_MODE=true` (legacy on-prem).

The implementation lives in `apps/backend/src/middleware/tenant.ts`.

### 3.2 Tenant Context Object

```typescript
interface TenantContext {
  tenantId: string;      // UUID PK in `shared.tenants`
  tenantSlug: string;    // DNS-safe identifier → schema name `t_<slug>`
  plan: 'single' | 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'trial' | 'past_due' | 'suspended';
  features: Record<FeatureName, boolean>;
  subscriptionEndsAt?: string;
  singleTenant: boolean;
}
```

`req.tenant` is attached by the middleware and consumed by every downstream
handler, the connection pool, the metering layer, and the feature-flag layer.

---

## 4. Provisioning Flow

A new tenant is created through either self-service signup or an operator
console. Provisioning is **idempotent** and **transactional**: schema creation,
plan assignment, license issuance, and seed data all succeed or roll back.

```
┌──────────┐   1. signup    ┌────────────┐   2. payment    ┌──────────┐
│ Prospect │ ─────────────▶ │ Provision  │ ─────────────▶ │ Billing  │
│ (web)    │                │ Service    │                │ (Stripe) │
└──────────┘                └─────┬──────┘                └──────────┘
                                   │ 3. create
                                   ▼
                         ┌──────────────────┐
                         │ shared.tenants   │  INSERT (status=trial)
                         │   + license key  │
                         └────────┬─────────┘
                                  │ 4. CREATE SCHEMA t_<slug>
                                  ▼
                         ┌──────────────────┐
                         │ run tenant DDL   │  (sales, rooms, inventory…)
                         │ + seed catalog   │
                         └────────┬─────────┘
                                  │ 5. emit event
                                  ▼
                         ┌──────────────────┐
                         │ metering +       │  init counters to 0
                         │ welcome email    │
                         └──────────────────┘
```

### 4.1 Provisioning Steps (detailed)

| # | Step | Implementation | Failure mode |
|---|------|----------------|--------------|
| 1 | Validate signup (email, slug uniqueness) | `provision.validate()` | 409 slug taken |
| 2 | Insert `shared.tenants` row (status=`trial`) | transactional | rollback |
| 3 | `CREATE SCHEMA t_<slug>` + run migrations | `migrateTenant()` | drop schema on fail |
| 4 | Seed minimal catalog (units, tax, currencies) | `seedTenant()` | rollback |
| 5 | Issue license key + offline grace token | `issueLicense()` | retry w/ idempotency key |
| 6 | Create Stripe customer + subscription (trial) | `billing.createCustomer()` | best-effort, async |
| 7 | Initialize metering counters | `metering.reset()` | idempotent |
| 8 | Send welcome + verification email | queue job | non-blocking |

### 4.2 Tenant DDL Template

A tenant schema is a clone of the canonical `template1` schema (or generated from
`apps/backend/src/schema.sql` subset). Cross-tenant shared tables
(`plans`, `feature_flag_overrides`, `global_audit`) live in `shared`.

---

## 5. Subscription & Billing Model

### 5.1 Plans

| Plan        | Price (USD/mo) | Locations | Users | Storage | API | Highlights |
|-------------|---------------|-----------|-------|---------|-----|------------|
| Starter     | 49            | 1         | 5     | 5 GB    | —   | Core BMS only |
| Growth      | 199           | 10        | 50    | 50 GB   | ✓   | + analytics, API, white-label |
| Enterprise  | Custom        | Unlimited | Unlimited | 1 TB+ | ✓ | + SSO/SAML, AI, data-residency |

### 5.2 Plan → Feature Matrix

See `FEATURE_FLAGS` in `apps/backend/src/middleware/feature-flags.ts`. The
middleware `featureFlag(name)` returns `403` when a tenant's plan lacks a
feature. Per-tenant overrides live in `shared.feature_flag_overrides` (JSONB),
merged on top of the plan defaults.

```
   GET /api/analytics/forecast
        │
        ▼
   tenantMiddleware   → req.tenant.features['advanced-analytics'] ?
        │
        ▼
   featureFlag('advanced-analytics')   → 403 if false
        │
        ▼
   analytics.routes handler
```

### 5.3 Lifecycle States

```
   trial ──(payment)──▶ active ──(charge fail)──▶ past_due
     │                    │                           │
     │(no payment, 14d)   │(cancel)                  │(7d grace)
     ▼                    ▼                           ▼
   suspended ◀──────── suspended ◀─────────────── suspended
     │
     │(30d)
     ▼
   deprovision (schema archived, then purged after 90d)
```

---

## 6. Licensing

DeepaBMS issues a **signed license key** per tenant. The key encodes plan,
expiry, seat count, and a signature (Ed25519). Validation happens both online
(authoritative) and offline (grace).

### 6.1 License Payload

```json
{
  "tenantId": "acme-uuid",
  "plan": "growth",
  "seats": 50,
  "issuedAt": "2026-07-01T00:00:00Z",
  "expiresAt": "2027-07-01T00:00:00Z",
  "nonce": "a1b2c3..."
}
```

Signature = `Ed25519(privkey, base64(payload))`. The public key is embedded in
the backend; rotation is managed via a key id (`kid`) header.

### 6.2 Offline Grace

On-prem / poor-connectivity deployments validate the license locally. If the
license is within the **grace window** (e.g. 7 days past `expiresAt`) the system
operates in read-only / degraded mode and surfaces a banner. Beyond grace the
API returns `402 Payment Required`.

```
   validateLicense()
        │
        ├─ valid & online  ─────────────▶ normal
        ├─ expired ≤ grace ─────────────▶ degrade + banner
        └─ expired > grace  ────────────▶ 402
```

---

## 7. Usage Metering

Metering is **event-sourced**: every billable action emits a metered event to a
durable counter table, aggregated nightly into `shared.usage_monthly`.

### 7.1 Metered Dimensions

| Dimension    | Unit        | Source event                    | Enforced? |
|--------------|-------------|---------------------------------|-----------|
| API calls    | count / mo  | `api.request` (per tenant path) | soft cap  |
| Storage      | GB / mo     | object store scan (nightly)     | hard cap  |
| Users        | seats       | `user.created` / `user.removed` | hard cap  |
| Active orgs  | locations   | `location.created`              | hard cap  |

### 7.2 Aggregation Pipeline

```
   API / worker events ──▶ Kafka topic `meter.events`
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Stream processor  │  tumbling 1-min windows
                          │ (count, sum)      │
                          └────────┬─────────┘
                                   ▼
                          ┌──────────────────┐
                          │ shared.meter_raw  │  (append-only)
                          └────────┬─────────┘
                                   │ nightly cron
                                   ▼
                          ┌──────────────────┐
                          │ shared.usage_monthly │  (tenant, dim, value)
                          └────────┬─────────┘
                                   │
                                   ▼
                          Billing reconciliation + overage invoices
```

### 7.3 Soft vs Hard Caps

- **Soft cap** (API): throttle + notify at 80%, 100%; continue billing overage.
- **Hard cap** (storage, seats): block new creation at limit; allow deletions.

---

## 8. Feature Flags (per-tenant JSONB toggle)

Plan defaults are defined in code (`FEATURE_FLAGS`). Tenants can be granted
per-feature overrides stored as JSONB:

```sql
ALTER TABLE shared.tenants
  ADD COLUMN feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;
```

```json
{ "white-label": true, "priority-support": false }
```

Resolution: `merge(planDefaults, overrides)`. The `featureFlag()` middleware
reads the resolved set from `req.tenant.features`. Overrides are audited in
`shared.global_audit`.

---

## 9. Tenant RBAC

Two orthogonal role axes:

1. **System roles** (platform operator): `superadmin`, `support`, `billing`,
   `auditor` — operate across tenants, never touch tenant business data except
   via support impersonation (logged).
2. **Tenant roles** (per-tenant): `owner`, `manager`, `accountant`, `cashier`,
   `reception`, `inventory`, `readonly`, `apiclient` — scoped to one schema.

### 9.1 RBAC Model

```
   System   ┌────────────┬──────────┬─────────┬────────┐
   Roles    │ superadmin │ support  │ billing │ auditor│
            └────────────┴────┬─────┴─────────┴────────┘
                              │ impersonate (audited)
                              ▼
   Tenant   ┌───────┬────────┬─────────┬────────┬────────┬─────────┐
   Roles    │ owner │ manager│accountant│cashier │inventory│readonly │
            └───────┴────────┴─────────┴────────┴────────┴─────────┘
                              │
                              ▼
                  permission set  (role → [perm...])
                  e.g. accountant → [invoice.read, invoice.write, report.read]
```

Permissions are stored in `shared.rbac_roles` (role → permission array) and
checked with `authorize(...)` from `auth.ts` plus a tenant-scoped guard. System
roles carry a `system_scope` flag so the auth layer rejects any attempt to use a
system role inside a tenant business route.

---

## 10. Tenant Analytics

The platform operator gets a cross-tenant analytics view built from
`usage_monthly` and `global_audit`:

- MRR, churn, trial→paid conversion, API growth, storage growth.
- Per-tenant health score (login recency, error rate, metering headroom).

Tenants see only their own analytics, gated by `featureFlag('advanced-analytics')`
or `featureFlag('ai-insights')`.

```
   ┌─────────────────────────────────────────────────────────┐
   │ shared.usage_monthly  + shared.global_audit              │
   │            │                                              │
   │            ▼                                              │
   │   platform analytics warehouse (read replica)            │
   │            │                                              │
   │   ┌────────┴────────┐     ┌──────────────────────┐       │
   │   │ operator dashboard│     │ per-tenant dashboards │       │
   │   └─────────────────┘     └──────────────────────┘       │
   └─────────────────────────────────────────────────────────┘
```

---

## 11. Backup & Restore (schema-level)

Because each tenant owns a schema, backups are **schema-scoped**. The platform
runs a nightly job that:

1. Locks writes to the tenant schema (`pg_export_snapshot` / `pg_dump -n t_<slug>`).
2. Streams to `s3://deepa-bms-backups/<tenantSlug>/<date>.dump` (encrypted).
3. Writes a manifest to `shared.backup_manifest`.
4. Retention: 35 daily, 12 monthly, 7 yearly.

### 11.1 Restore

```
   restoreTenant(slug, pointInTime)
        │
        ├─ provision temp schema t_<slug>_restore
        ├─ pg_restore from chosen dump
        ├─ smoke test (count rows, fk check)
        ├─ swap: rename t_<slug> → t_<slug>_old, restore → t_<slug>
        └─ vacuum + reindex + notify
```

Restore never touches other tenants. A **restore dry-run** validates the dump
without swapping.

---

## 12. White-Labeling

| Element     | Storage                              | Applied at            |
|-------------|--------------------------------------|-----------------------|
| Custom domain | `tenants.custom_domain` (verified CNAME + ACME cert) | ingress / TLS |
| Logo        | `s3://…/<slug>/brand/logo.png`        | frontend config API   |
| Colors      | `tenants.theme` JSONB (`{primary, accent, surface}`) | RN/Web theme |
| Email sender| `tenants.email_from` + verified SES/Domain | notification service  |

```
   Browser ──▶ custom-domain CNAME ──▶ ingress (SNI → cert)
        │                                     │
        │  GET /api/brand/config              ▼
        └────────────────────────────▶ tenantMiddleware → brand resolver
                                            │
                                            ▼
                                   { logo, theme, from, name }
```

The mobile/Web app fetches `/api/brand/config` before first paint to apply the
tenant theme. Default branding applies when `white-label` feature is off.

---

## 13. Data Residency (Enterprise add-on)

Enterprise tenants may pin their schema to a specific regional Postgres
instance (`tenants.region`). The pool router selects the regional cluster by
`region`, keeping data within jurisdiction (GDPR Art. 44–49). Cross-region
replication is disabled for these tenants.

---

## 14. Cross-Cutting Concerns

### 14.1 Observability

Every log line carries `tenantId` (from `req.tenant`). Metrics are tagged with
`tenant_slug` so per-tenant dashboards and alerting work out of the box.

### 14.2 Cost Attribution

The metering pipeline also feeds a cost model (compute seconds, storage bytes,
egress bytes) enabling per-tenant gross-margin reporting.

### 14.3 Migration / Decommission

Deprovisioning archives the schema (`t_<slug>` → `archive.t_<slug>_<date>`) and
purges after 90 days per the data-retention policy. License + billing records
are retained for the statutory period (7 years for tax) but anonymized.

---

## 15. Security Implications

- Tenant isolation failures are treated as **P0 incidents**.
- A CI test spins up two tenants and asserts cross-tenant read returns 0 rows.
- Schema creation uses parameterized identifiers; `search_path` is set
  per-connection, never from raw user input.
- `req.tenant` is immutable after `tenantMiddleware`; handlers may not override it.

---

## 16. Roadmap

1. Q3: self-service signup + Stripe billing integration.
2. Q4: per-tenant KMS data keys for PII columns (enterprise).
3. Q1: data-residency regional clusters (EU, US, APAC).
4. Q2: tenant-level canary deploys via schema-versioned migrations.

---

## Appendix A — Env Vars

| Var                       | Purpose                          |
|---------------------------|----------------------------------|
| `SINGLE_TENANT_MODE`      | Force single-tenant fallback     |
| `TENANT_BASE_DOMAIN`      | Root domain for subdomain parse  |
| `TENANT_MODE`             | `multi` / `single`               |
| `SINGLE_TENANT_PLAN`      | Plan used in fallback            |
| `SINGLE_TENANT_SLUG`      | Slug used in fallback            |
| `SINGLE_TENANT_ID`        | Tenant UUID used in fallback     |

## Appendix B — Key Files

| File | Responsibility |
|------|----------------|
| `apps/backend/src/middleware/tenant.ts` | Tenant resolution + context |
| `apps/backend/src/middleware/feature-flags.ts` | Plan → feature matrix |
| `apps/backend/src/middleware/auth.ts` | JWT auth + RBAC helpers |
| `shared.tenants` | Tenant registry (Postgres) |
| `shared.usage_monthly` | Aggregated metering |
| `shared.feature_flag_overrides` | Per-tenant toggles |
