> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# ADR-0020: Enterprise Production Platform (P5) — 11-Phase Productionization, Hardening & Certification

**Status**: Proposed (2026-07-14)

**Domain**: Infrastructure / Platform Engineering / DevOps / Security / SRE

**Applies to**: Backend (`apps/backend/`), Frontend (`src/`), Windows (`apps/windows/`), Infrastructure (`infra/`, `deploy/`, `charts/`), CI/CD (`.github/`, `.gitlab-ci.yml`), Documentation (`docs/`)

---

## Context

DeepaBMS has matured into a full enterprise business-management suite spanning **18 domain modules** — Restaurant, Bar, Hotel, Kitchen, POS, Inventory, Purchasing, Credits, Banking, Accounting, Employees, Payroll, GST, Excise, Analytics, Workflow, Audit, and the AI Copilot (see [ADR-0019](#references)). The Platform Operations substrate (see [ADR-0018](#references)) already delivers health, observability, monitoring, backup, deployment tracking, and disaster-recovery primitives in-process.

However, the platform today is **operationally single-tenant, process-level, and manually deployed**. A standalone Expo app talks to a single Node/Express process backed by a single SQLite file. That is adequate for pilot and small-business deployments, but it is **not** a production-grade enterprise platform. Several categories of capability are absent or immature:

| Aspect | Current State | Gap / Risk |
|--------|--------------|------------|
| **Deployment** | Manual `git pull` + `npm start` per host | No containerization, no orchestration, no TLS termination, no reproducible environments, no reverse proxy, no load balancing |
| **CI/CD** | None (manual build & ship) | No automated tests on merge, no image build, no signing, no SBOM, no artifact publishing, no promotion gates, no rollback automation |
| **Observability** | In-process health/metrics/alerts (ADR-0018) | No Prometheus metrics endpoint, no distributed tracing export (OTLP), no Grafana dashboards, no SLO/SLI definitions, no external alert routing (PagerDuty/Slack) |
| **Database Ops** | SQLite file + manual copy backup | No migration framework, no zero-downtime schema change, no PITR, no replicas, no retention policy enforcement, no integrity automation |
| **Multi-Tenancy** | Single logical tenant | No tenant isolation model, no provisioning, no subscription/licensing, no metering, no feature flags, no RBAC scoping per tenant, no white-label |
| **Security hardening** | JWT auth, RBAC, basic validation | No dependency/container scanning, no SBOM in CI, no supply-chain attestation, no secrets rotation, no WAF, no rate limiting, no CSP/CSRF hardening, no compliance program |
| **Performance** | Ad-hoc indexing in SQLite | No caching tier (Redis), no connection pooling story at scale, no horizontal scaling path, no benchmark baselines, no streaming/pagination standards |
| **Disaster recovery** | Internal runbook + simulation (ADR-0018) | No off-site/offline backup copy, no multi-region, no RPO/RTO SLAs, no documented failover automation |
| **Certification** | None | No OWASP ASVS, no Twelve-Factor verification, no SOC2/ISO27001 control mapping, no GDPR article mapping, no a11y / mobile / offline certification, no Go-No-Go board |
| **Documentation** | Code comments + scattered READMEs | No operator guide, no runbook library, no onboarding, no security policy, no architecture decision log index |

### Strategic Objective

Transform DeepaBMS from a *single-process pilot application* into a **certifiable, multi-tenant, horizontally-scalable Enterprise Production Platform (P5)** suitable for deployment in customer data centers, public clouds, and air-gapped environments, passing an external Go-No-Go certification gate.

### Required Capabilities (Summary)

1. **Enterprise Deployment** — Docker Compose / Swarm / Kubernetes / Helm with reverse proxy, load balancer, TLS, secrets management, persistent storage, auto-scaling, rolling updates, blue-green, canary.
2. **CI/CD** — GitHub Actions / GitLab CI, self-hosted runners, testing gates, security scanning, container build, image signing, SBOM, semantic versioning, artifact publishing, rollback.
3. **Observability** — Metrics (Prometheus), tracing (OTLP), structured logs, health/readiness/liveness, dashboards, SLO/SLI, alerts, incident tracking.
4. **Database Operations** — Migration framework, zero-downtime changes, automated full/incremental/PITR backups, replication/read replicas, partitioning, retention, integrity checks.
5. **Multi-Tenant SaaS** — Tenant isolation, provisioning, subscription, licensing, metering, feature flags, RBAC, analytics, per-tenant backup/restore, white-label.
6. **Security Hardening** — Dependency/container scanning, SBOM, supply-chain attestation, secrets/cert rotation, WAF, rate limiting, CSP/CSRF/security headers, compliance, OWASP, pen testing.
7. **Performance** — DB tuning/indexes, Redis caching, compression, lazy loading, pagination, streaming, connection pooling, memory/CPU planning, horizontal scaling, benchmarks.
8. **Disaster Recovery** — DR plan, backup, failover, replication, multi-region, offline copy, RPO/RTO, runbooks.
9. **Enterprise Certification** — OWASP ASVS / Top 10 / Twelve-Factor / Cloud Native, SOC2 / ISO27001 / GDPR, benchmarks, a11y, mobile, offline.
10. **Documentation** — 15 operator/engineering guides.
11. **Final Certification** — Scorecard, certification matrix, Go-No-Go decision.

## Decision

Adopt the **P5 Enterprise Production Platform** program: an 11-phase, layered productionization of DeepaBMS delivered as infrastructure-as-code, CI/CD pipelines, and platform services that build directly on the existing domain architecture (ADR-0005, ADR-0006) and operations substrate (ADR-0018).

Design principles:

| Principle | Rationale |
|-----------|-----------|
| **Twelve-Factor native** | Every service is stateless, config-in-env, logs-to-stdout, disposable, concurrency-friendly |
| **Infrastructure as Code** | Docker Compose, Kubernetes manifests, and Helm charts are versioned alongside application code |
| **Build once, deploy many** | Single immutable container image promoted dev → staging → production; environment differences via config/secrets only |
| **Defense in depth** | Network, application, supply-chain, and data-layer controls operate independently |
| **Multi-tenant by design** | Tenant context flows from ingress → auth → RBAC → data row-scoping → metering |
| **Observable by default** | Metrics, traces, logs emitted on every path; SLOs defined before launch |
| **Recoverable by contract** | Every deployment defines RPO/RTO; rollback is a first-class pipeline action |
| **Certifiable** | Controls mapped to OWASP ASVS L2, SOC2, ISO27001, GDPR, Twelve-Factor, Cloud Native benchmarks |
| **Offline-capable** | Critical paths (sync, AI fallback, DR) function without external network |

The program produces:

- `infra/` — Docker Compose, Kubernetes manifests, Helm chart, env templates
- `.github/workflows/` + `.gitlab-ci.yml` — CI/CD pipelines
- `apps/backend/src/platform/` — extended platform services (tenancy, metering, feature flags, migration runner, cache, SecOps)
- `monitoring/` — Prometheus rules, Grafana dashboards, alert routes, OTel collector config
- `docs/engineering/runbooks/` + `docs/guides/` — 15 documentation guides
- `certification/` — control mappings, scorecard, Go-No-Go matrix

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         P5 ENTERPRISE PRODUCTION PLATFORM                                  │
│                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                            EDGE / INGRESS LAYER                                       │   │
│  │   DNS ─▶ CDN/WAF ─▶ Reverse Proxy (Traefik/Nginx) ─▶ TLS Termination ─▶ Rate Limit   │   │
│  │                       └─ Load Balancer (L4/L7) ─▶ Routing (host/path)                 │   │
│  └───────────────────────────────────────┬──────────────────────────────────────────────┘   │
│                                           │                                                 │
│  ┌────────────────────────────────────────▼─────────────────────────────────────────────┐  │
│  │                         ORCHESTRATION LAYER                                            │  │
│  │   Docker Compose  │  Swarm  │  Kubernetes (Helm)  │  Auto-scaling (HPA/KEDA)          │  │
│  │   Rolling / Blue-Green / Canary  │  Secrets (Vault/Sealed/External)  │  PVC Storage    │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                           │                                                 │
│  ┌────────────────────────────────────────▼─────────────────────────────────────────────┐  │
│  │                         APPLICATION TIER (stateless)                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │  │
│  │  │ API Gateway /  │  │  API Replicas  │  │  Background     │  │  Windows / Mobile    │  │  │
│  │  │ Auth (JWT)     │  │  (N x Node)    │  │  Workers        │  │  Clients             │  │  │
│  │  │ + RBAC + Tenant│  │  + Domain Svc  │  │  (sync/wf/metrics)│  │  (Expo/Electron)   │  │  │
│  │  └───────┬────────┘  └───────┬────────┘  └────────┬────────┘  └──────────┬───────────┘  │  │
│  └──────────┼───────────────────┼─────────────────────┼─────────────────────┼─────────────┘  │
│             │                   │                     │                     │                │
│  ┌──────────▼───────────────────▼─────────────────────▼─────────────────────▼─────────────┐  │
│  │                       PLATFORM SERVICES (P5)                                            │  │
│  │  TenantSvc │ MeteringSvc │ FeatureFlagSvc │ MigrationRunner │ CacheSvc │ SecOpsSvc       │  │
│  │  Observability (metrics/traces/logs) │ Health/DR (ADR-0018) │ BackupSvc                 │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                           │                                                 │
│  ┌────────────────────────────────────────▼─────────────────────────────────────────────┐  │
│  │                         DATA & STATE TIER                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │ Primary DB   │─▶│ Read Replica │  │ Redis Cache  │  │ Object/Backup Store        │  │  │
│  │  │ (SQLite/PG)  │  │              │  │ + Sessions   │  │ (S3/MinIO/Volume)         │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         OBSERVABILITY & CI/CD BACKPLANE                              │   │
│  │  Prometheus │ Grafana │ OTel Collector │ Loki │ Alertmanager │ Harbor/Registry │     │   │
│  │  GitHub Actions / GitLab CI │ Sigstore (cosign) │ SBOM (Syft) │ Trivy │ Vault        │   │
│  └────────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## C4 Model Diagrams

### Level 1 — System Context

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT — DeepaBMS P5                               │
│                                                                                        │
│   ┌────────────────┐        ┌──────────────────────────────────────────────────────┐  │
│   │  Business Users │        │                   DeepaBMS Platform                   │  │
│   │  (Owner/Mgr/    │──HTTP──▶│  Mobile (Expo) + Web + Windows (Electron) clients    │  │
│   │   Staff/Acct)   │        │  served by multi-tenant API + auth + RBAC            │  │
│   └────────────────┘        └───────────────────────┬──────────────────────────────┘  │
│                                                      │                                 │
│   ┌────────────────┐                                │                                 │
│   │  DevOps / SRE   │──CI/CD & Ops──────────────────┤                                 │
│   │  Platform Team  │                               │                                 │
│   └────────────────┘                               │                                 │
│                                                      ▼                                 │
│   ┌────────────────┐                        ┌────────────────────────────────────┐   │
│   │  Auditors /     │──Compliance reports──▶│  Observability + DR + Certification │   │
│   │  Compliance      │                        │  (Prometheus, Grafana, Vault, etc) │   │
│   └────────────────┘                        └────────────────────────────────────┘   │
│                                                                                        │
│   External Systems:                                                                    │
│   • Identity Provider (OIDC/SAML)        • Payment Gateway (Banking/GST)               │
│   • Object Storage (S3/MinIO)            • Container Registry (Harbor/Docker Hub)     │
│   • Notification (Email/SMS/Slack)       • LLM Provider (AI Copilot, ADR-0019)        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Level 2 — Container Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                               CONTAINERS — DeepaBMS P5                                   │
│                                                                                        │
│  ┌────────────────────┐    ┌──────────────────────────────────────────────────────┐   │
│  │  Edge Container     │    │  API Container (N replicas)                           │   │
│  │  (Traefik/Nginx)    │───▶│  • Auth + RBAC + Tenant context                      │   │
│  │  TLS / WAF / LB      │    │  • 18 domain services                                │   │
│  └────────────────────┘    │  • Platform services (tenancy, metering, flags)       │   │
│                            └───────────────────────┬──────────────────────────────┘   │
│                                                    │                                   │
│  ┌────────────────────┐    ┌──────────────────────▼───────────────────────────────┐   │
│  │  Worker Container   │    │  Data Containers                                      │   │
│  │  (sync/wf/metrics/  │    │  • Primary DB (SQLite/Postgres)                      │   │
│  │   backup schedulers)│    │  • Read Replica                                       │   │
│  └────────────────────┘    │  • Redis (cache/sessions/queue)                       │   │
│                            │  • Backup Object Store (MinIO)                         │   │
│  ┌────────────────────┐    └───────────────────────────────────────────────────────┘   │
│  │  Observability      │                                                              │
│  │  Container Set      │    ┌──────────────────────────────────────────────────────┐   │
│  │  (Prom/Grafana/     │    │  CI/CD Container Set                                  │   │
│  │   OTel/Loki/Alert)  │    │  • Builder (buildkit) • Scanner (Trivy)              │   │
│  └────────────────────┘    │  • Signer (cosign) • SBOM (syft) • Registry (Harbor)  │   │
│                            └──────────────────────────────────────────────────────┘   │
│  ┌────────────────────┐                                                        │
│  │  Secrets Container  │  (HashiCorp Vault / External Secrets / Sealed Secrets)  │
│  └────────────────────┘                                                        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Level 3 — Component Diagram (API + Platform Services)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENTS — API + PLATFORM TIER                                │
│                                                                                        │
│  Ingress ─▶ ┌─────────────────────────────────────────────────────────────────────┐   │
│             │  API Gateway Component                                                 │   │
│             │  • JWT Auth (ADR-0002)  • Validation (ADR-0003)  • RBAC (ADR-0006)   │   │
│             │  • Tenant Resolver  • Rate Limiter  • WAF/Header Middleware          │   │
│             └───────────────┬─────────────────────────────────────────────────────┘   │
│                             │                                                         │
│   ┌─────────────────────────▼─────────────────────────────────────────────────────┐   │
│   │  Platform Services (P5 extensions over ADR-0018)                                │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │   │
│   │  │TenantSvc   │ │MeteringSvc │ │FeatureFlag │ │Migration    │ │CacheSvc    │  │   │
│   │  │(isolation, │ │(usage,     │ │Svc (flags, │ │Runner      │ │(Redis abs.,│  │   │
│   │  │provision,  │ │quotas,     │ │rollout)    │ │(zero-dt    │ │sessions,   │  │   │
│   │  │white-label)│ │billing)    │ │            │ │migrations) │ │pub/sub)    │  │   │
│   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘  │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │   │
│   │  │SecOpsSvc   │ │Observability│ │BackupSvc   │ │Health/DR    │                  │   │
│   │  │(scan, sbom,│ │(metrics,    │ │(full/incr/ │ │(ADR-0018)  │                  │   │
│   │  │rotation)   │ │traces,logs) │ │PITR,verify)│ │            │                  │   │
│   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘                  │   │
│   └─────────────────────────┬─────────────────────────────────────────────────────┘   │
│                             │                                                         │
│   ┌─────────────────────────▼─────────────────────────────────────────────────────┐   │
│   │  Domain Services (ADR-0005/0006): Inventory, POS, Hotel, Bar, Accounting, ...  │   │
│   └─────────────────────────┬─────────────────────────────────────────────────────┘   │
│                             │                                                         │
│   ┌─────────────────────────▼─────────────────────────────────────────────────────┐   │
│   │  Data Access Layer: Repository pattern → Primary DB / Replica / Redis          │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architectures

### A. Docker Compose (single-host, small business / on-prem appliance)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  docker-compose.yml  (single host)                                                  │
│                                                                                      │
│  services:                                                                           │
│    reverse-proxy:  traefik  (TLS, letsencrypt, rate limit)                          │
│    api:            deepa-bms/api  (replicas: 1-2, restart: unless-stopped)          │
│    worker:         deepa-bms/api worker  (sync/wf/metrics schedulers)               │
│    db:             postgres:16  (volume: pgdata)  — or sqlite volume                │
│    redis:          redis:7  (volume: redisdata, AOF)                                │
│    minio:          minio  (backup object store, volume: miniodata)                  │
│    prometheus:     prom/prometheus                                                   │
│    grafana:        grafana/grafana                                                   │
│    otel-collector: otel/opentelemetry-collector                                      │
│    loki:           grafana/loki                                                      │
│    vault:          hashicorp/vault  (or sealed-secrets file)                        │
│                                                                                      │
│  networks:  frontend (proxy<->api), backend (api<->db/redis)                         │
│  volumes:   pgdata, redisdata, miniodata, grafana-data, prom-data                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Notes: use for < 50 concurrent users; SQLite can remain the engine with a mounted volume, but Postgres is recommended when enabling replicas.

### B. Docker Swarm (multi-host, mid-market)

- Manager nodes (3) for quorum; worker nodes for API/workers.
- `deploy.replicas`, `deploy.update_config` (rolling), `deploy.rollback_config`.
- Docker secrets for `JWT_SECRET`, `DB_PASSWORD`, `BACKUP_ENCRYPTION_KEY`.
- Overlay network `deepa-net`; routing mesh at port 443.
- Auto-scaling via external `docker-flow-swarm-listener` or scheduled job.

### C. Kubernetes (cloud / large enterprise)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Kubernetes Namespace: deepabms                                                      │
│                                                                                      │
│  Ingress (Traefik/Nginx) ─▶ TLS (cert-manager) ─▶ RateLimit (Envoy/WAF)            │
│                                                                                      │
│  Deployment: api            (replicas: HPA 3-20, rollingUpdate maxSurge=25%)        │
│  Deployment: worker         (sync/wf/metrics, replicas 2-10)                        │
│  StatefulSet: postgres      (Primary + Streaming Replica)                           │
│  Deployment: redis          (sentiel/memorystore)                                   │
│  StatefulSet: minio         (backup store)                                          │
│  Deployment: prometheus / grafana / otel-collector / loki / alertmanager            │
│  Deployment: vault (or ExternalSecrets operator)                                     │
│                                                                                      │
│  ConfigMap: app-config        Secret: deepabms-secrets (Vault-injected)             │
│  PVC: pgdata, redisdata, miniodata, prom-data                                       │
│  HPA: cpu>60% | mem>70% | custom metrics (req/s)                                     │
│  PDB: minAvailable 2 for api                                                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### D. Helm (packaged, parameterized delivery)

`charts/deepabms/`:

- `values.yaml` — image, replicas, resources, ingress, tls, persistence, redis, postgres, observability toggle, tenant config.
- `templates/` — deployment, service, ingress, hpa, pdb, secretProviderClass, configmap, cronjob (backup/migration), servicemonitor (Prometheus).
- Sub-charts: `bitnami/postgresql`, `bitnami/redis`, `minio`, `prometheus`, `grafana`, `traefik`.
- `Chart.yaml` with semver, appVersion pinned to image tag.

### E. Release Strategies

| Strategy | Mechanism | Use Case |
|----------|-----------|----------|
| **Rolling update** | K8s `RollingUpdate` maxSurge/maxUnavailable | Default safe upgrade |
| **Blue-Green** | Two Deployments + Service switch (or Argo Rollouts) | Zero-downtime major versions |
| **Canary** | Argo Rollouts / Flagger, 5%→25%→100% weighted | Risky feature/perf changes |
| **Rollback** | `kubectl rollout undo` / Helm `--rollback` / pipeline gate | On health/SLO breach |

### F. Reverse Proxy / Load Balancer / TLS / Secrets / Storage

- **Reverse Proxy**: Traefik (preferred, native K8s/ACME) or Nginx Ingress. Terminates TLS, does path/host routing, compression, headers.
- **Load Balancer**: L4 (cloud NLB) in front of ingress; L7 routing via ingress controller. Sticky sessions only for websocket/streaming where needed.
- **TLS**: cert-manager + Let's Encrypt (staging prod), or enterprise CA cert via Secret. Enforce TLS1.2+, HSTS, OCSP stapling.
- **Secrets**: HashiCorp Vault (dynamic DB creds, rotation) → Vault Agent / External Secrets Operator → K8s Secret. Never baked into images.
- **Persistent Storage**: StorageClass (SSD), PVC for DB/Redis/MinIO; backup PVC snapshot + object store replication.

---

## Data Flow Diagrams

### DFD 1 — Request Path (Tenant-Aware)

```
Client (tenant X)
   │  Host: tenant-x.deepabms.app  +  Authorization: Bearer <jwt>
   ▼
Edge (WAF/TLS/RateLimit)
   │  extract tenant from host/subdomain or JWT claim `tid`
   ▼
API Gateway
   │  1. JWT verify (ADR-0002)        2. TenantResolver sets req.tenantId
   │  3. RBAC authorize (ADR-0006)    4. RateLimiter (per-tenant bucket)
   │  5. Security headers + CSRF check
   ▼
Domain Service → Repository
   │  every query scoped WHERE tenant_id = req.tenantId
   ▼
Primary DB (row-level tenant isolation)  ──streaming replica──▶ Read Replica
   │
   ├─ Cache lookup/store (Redis, key namespaced `t:<tid>:...`)
   ├─ Observability emit (metrics/trace/span)
   └─ Response → Edge → Client
```

### DFD 2 — CI/CD Pipeline Flow

```
git push / PR ─▶ Trigger (.github or GitLab)
   │
   ├─ Lint + Typecheck + Unit Tests
   ├─ Build image (buildkit, pinned base, non-root)
   ├─ Trivy scan (fail on HIGH/CRITICAL)
   ├─ Syft SBOM generation
   ├─ cosign sign + attest (SLSA provenance)
   ├─ Push to Harbor with immutable tag = semver
   ├─ Deploy to staging (Helm upgrade)
   ├─ Integration/Contract tests
   ├─ SLO smoke (Prometheus target up)
   ├─ Manual/auto promote gate
   ├─ Deploy to production (rolling/canary)
   └─ Rollback job on failure signal
```

### DFD 3 — Backup & DR Replication

```
Primary DB ─(WAL stream / pg_dump / sqlite copy)─▶ BackupSvc
   │                                                │  encrypt AES-256-GCM
   │                                                │  checksum SHA-256
   │                                                ▼
   │                                          MinIO Object Store (primary region)
   │                                                │  replication (bucket mirror)
   │                                                ▼
   │                                          MinIO (DR region)  ──offline copy──▶ Tape/Cold
   │
   └─ Read Replica (same region, for read scale + fast PITR source)
```

---

## Phase 1 — Enterprise Deployment

**Goal**: Reproducible, containerized, orchestrated deployment with ingress, TLS, secrets, storage, scaling, and safe release strategies.

### 1.1 Containerization

- Multi-stage `Dockerfile` (builder → runtime). Base: `node:20-alpine` (pinned digest). Non-root user, `NODE_ENV=production`, healthcheck `wget /api/platform/health/live`.
- Distroless option for hardened deployments. Image scanned in CI (Phase 2).
- Frontend: Expo web build served by nginx; mobile via EAS; Windows via Electron builder.

### 1.2 Orchestration Targets

- Docker Compose (appliance), Swarm (mid), Kubernetes (enterprise), Helm (packaging). See Deployment Architectures above.

### 1.3 Ingress, TLS, Load Balancing

- Traefik/Nginx ingress, cert-manager ACME or enterprise CA, TLS1.2+, HSTS, OCSP.
- L4 NLB → ingress; L7 routing; weighted canary via Argo Rollouts/Flagger.

### 1.4 Secrets & Config

- Config via ConfigMap/Env (Twelve-Factor). Secrets via Vault → External Secrets Operator.
- Required secrets: `JWT_SECRET`, `DB_PASSWORD`, `BACKUP_ENCRYPTION_KEY`, `REDIS_PASSWORD`, `LLM_API_KEYS`, `VAULT_TOKEN`.

### 1.5 Persistent Storage

- StorageClass SSD PVCs for Postgres, Redis (AOF), MinIO, Prometheus. Snapshot-based volume backup + object replication.

### 1.6 Auto-Scaling

- HPA on CPU 60% / memory 70% / custom RPS. KEDA for queue-length-based scaling of workers. PDB minAvailable for availability.

### 1.7 Release Strategies

- Rolling (default), Blue-Green (major), Canary (risky), automated Rollback on health/SLO breach.

### 1.8 Acceptance Criteria

- One command brings up full stack on each target; TLS enforced; secrets external; scaling verified; rollback < 5 min.

### 1.9 Reference: Docker Compose Snippet

```yaml
services:
  reverse-proxy:
    image: traefik:v3.0
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.tlschallenge=true"
      - "--certificatesresolvers.le.acme.email=ops@deepabms.app"
    ports: ["443:443"]
    volumes: ["/var/run/docker.sock:/var/run/docker.sock:ro", "./traefik:/certs"]
  api:
    image: registry.deepabms.app/deepabms/api:${APP_VERSION}
    deploy:
      replicas: 2
      update_config: { order: start-first, parallelism: 1 }
      restart_policy: { condition: on-failure }
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://db:5432/deepabms
      - REDIS_URL=redis://redis:6379
    secrets: [jwt_secret, db_password]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/platform/health/live"]
      interval: 30s
      timeout: 5s
      retries: 3
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
    secrets: [db_password]
  redis:
    image: redis:7
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
secrets:
  jwt_secret: { external: true }
  db_password: { external: true }
volumes:
  pgdata:
```

### 1.10 Reference: Kubernetes HPA & Rollout

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: api, namespace: deepabms }
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 25%, maxUnavailable: 0 }
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
        - name: api
          image: registry.deepabms.app/deepabms/api:1.0.0
          ports: [{ containerPort: 3000 }]
          readinessProbe:
            httpGet: { path: /api/platform/health/ready, port: 3000 }
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /api/platform/health/live, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 15
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits: { cpu: "1", memory: "1Gi" }
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api-hpa, namespace: deepabms }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 60 } }
    - type: Resource
      resource: { name: memory, target: { type: Utilization, averageUtilization: 70 } }
  behavior:
    scaleDown: { stabilizationWindowSeconds: 300 }
```

### 1.11 Reference: Helm values.yaml skeleton

```yaml
image:
  repository: registry.deepabms.app/deepabms/api
  tag: "1.0.0"
  pullPolicy: IfNotPresent
replicaCount: 3
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 60
ingress:
  enabled: true
  className: traefik
  hosts: ["deepabms.app"]
  tls:
    enabled: true
    certManager: true
persistence:
  postgres:
    enabled: true
    size: 50Gi
    storageClass: ssd
  redis:
    enabled: true
    size: 8Gi
  minio:
    enabled: true
    size: 200Gi
observability:
  enabled: true
  prometheus: true
  grafana: true
tenancy:
  mode: row-level      # or schema-per-tenant
  defaultTier: standard
secrets:
  provider: vault      # or sealed-secrets / external-secrets
```

### 1.12 Rollout Decision Matrix

| Change Type | Strategy | Approval | Auto-rollback trigger |
|-------------|----------|----------|------------------------|
| Patch / config | Rolling | CI | readiness probe fail |
| Minor feature | Canary 5→25→100% | CI + SLO | error-rate > 0.5% |
| Major version | Blue-Green | Human | SLO breach 5m |
| DB migration | Expand/Contract | Human + staging | migration duration > 10m |
| Security fix | Rolling (fast) | Security | any probe fail |

---

## Phase 2 — CI/CD

**Goal**: Automated, secure, reproducible build-to-production pipeline with quality gates, signing, and SBOM.

### 2.1 Pipeline Engines

- **GitHub Actions** (primary, cloud) and **GitLab CI** (mirror, self-hosted). Both share reusable composite/job templates.
- **Self-hosted runners** in private network for building images that pull internal dependencies and push to internal Harbor.

### 2.2 Stages

| Stage | Action | Gate |
|-------|--------|------|
| Lint/Typecheck | `eslint`, `tsc --noEmit`, `dotnet format` | fail on error |
| Unit/Integration | Jest (Expo), backend tests | coverage ≥ 70% critical |
| Build | buildkit multi-arch (amd64/arm64) | reproducible |
| Scan | Trivy (image+fs), npm audit, Snyk | fail HIGH/CRIT |
| SBOM | Syft → `sbom.json` (CycloneDX) | artifact |
| Sign | cosign sign + SLSA provenance attest | verify in deploy |
| Push | Harbor, immutable tag = semver | tag policy |
| Deploy | Helm upgrade (staging→prod) | manual approve prod |
| Verify | SLO smoke, health probes | auto rollback |

### 2.3 Security in CI

- Least-privilege OIDC from CI to cloud/registry. No long-lived secrets.
- Pinned action versions (commit SHA). Step summaries + attestations stored.

### 2.4 Container Build & Image Signing

- `cosign sign --key <kms>`; verify admission via Connaisseur/Kyverno `verifyImages`.
- Provenance via `cosign attest --type slsa`.

### 2.5 SBOM & Versioning

- CycloneDX SBOM attached to release. SBOM scanned in dependency review.
- **Semantic versioning** (`MAJOR.MINOR.PATCH`) from conventional commits; `CHANGELOG.md` auto-generated; `appVersion` = image semver.

### 2.6 Artifact Publishing & Gates

- Harbor promotes `dev`→`staging`→`production` repositories. Promote gate requires passing tests + scan + signature.
- Release notes + SBOM published to GitHub Releases / GitLab Packages.

### 2.7 Rollback

- Pipeline `rollback` job: `helm rollback` or `kubectl rollout undo`; triggers on failed verify stage or manual incident button.

### 2.8 Acceptance Criteria

- Merge to `main` auto-builds signed image + SBOM; prod deploy requires human approval; rollback automated; no secrets in logs.

### 2.9 Reference: GitHub Actions Pipeline

```yaml
name: build-and-deploy
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
permissions: { id-token: write, contents: read }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run lint && npm run ts:check
      - run: npm test -- --coverage
  build:
    needs: test
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: |
          docker buildx build --platform linux/amd64,linux/arm64 \
            -t registry.deepabms.app/deepabms/api:${GITHUB_SHA::8} \
            --push .
      - name: Scan
        run: trivy image --exit-code 1 --severity HIGH,CRITICAL registry.deepabms.app/deepabms/api:${GITHUB_SHA::8}
      - name: SBOM
        run: syft registry.deepabms.app/deepabms/api:${GITHUB_SHA::8} -o cyclonedx-json > sbom.json
      - name: Sign
        run: cosign sign --yes --key $KEY registry.deepabms.app/deepabms/api:${GITHUB_SHA::8}
      - name: Attest SBOM
        run: cosign attest --yes --key $KEY --type cyclonedx sbom.json registry.deepabms.app/deepabms/api:${GITHUB_SHA::8}
  deploy-staging:
    needs: build
    runs-on: self-hosted
    steps:
      - run: helm upgrade --install deepabms charts/deepabms -f values-staging.yaml --set image.tag=${GITHUB_SHA::8}
  promote-prod:
    needs: deploy-staging
    environment: production
    runs-on: self-hosted
    steps:
      - run: helm upgrade --install deepabms charts/deepabms -f values-prod.yaml --set image.tag=${GITHUB_SHA::8}
```

### 2.10 Reference: GitLab CI Mirror

```yaml
stages: [test, build, scan, sign, deploy]
variables:
  IMAGE: "$CI_REGISTRY/deepabms/api"
test:
  stage: test
  script: [npm ci, "npm run lint", "npm run ts:check", "npm test"]
build:
  stage: build
  tags: [self-hosted]
  script:
    - docker buildx build --platform linux/amd64,linux/arm64 -t $IMAGE:$CI_COMMIT_SHORT_SHA --push .
scan:
  stage: scan
  script: [trivy image --exit-code 1 --severity HIGH,CRITICAL $IMAGE:$CI_COMMIT_SHORT_SHA]
sign:
  stage: sign
  script:
    - syft $IMAGE:$CI_COMMIT_SHORT_SHA -o cyclonedx-json > sbom.json
    - cosign sign --yes --key $KEY $IMAGE:$CI_COMMIT_SHORT_SHA
deploy-prod:
  stage: deploy
  environment: production
  when: manual
  script: [helm upgrade --install deepabms charts/deepabms -f values-prod.yaml --set image.tag=$CI_COMMIT_SHORT_SHA]
```

### 2.11 Semantic Versioning & Release Automation

- Conventional Commits (`feat:`, `fix:`, `break!:`)+ `standard-version`/`semantic-release` compute next semver.
- `CHANGELOG.md` regenerated each release. `appVersion` in Helm tracks image semver exactly.
- Git tag `vX.Y.Z` triggers the production promote job (manual approval gate).
- Immutable image tags: Harbor repository set to `immutable: true` to prevent re-tag/overwrite.

### 2.12 Supply-Chain Attestation Chain

```
source commit ─▶ build (buildkit, reproducible) ─▶ SBOM (syft)
      │                                              │
      └──────────────▶ cosign attest (SLSA provenance) ◀─┘
                              │
                              ▼
                   cosign sign (keyless / KMS)
                              │
                              ▼
                   Registry (Harbor) + attestation stored
                              │
                              ▼
                   Admission (Kyverno verifyImages) blocks unsigned
```

### 2.13 Self-Hosted Runner Hardening

- Runners in private subnet; ephemeral (`--ephemeral`) single-use VMs/containers.
- OIDC federation to cloud/registry (no static creds). Least-privilege IAM role.
- Network egress allowlist (registry, vault, npm, cosign). Runner images themselves scanned.

---

## Phase 3 — Observability

**Goal**: Production-grade metrics, tracing, logs, health, dashboards, SLO/SLI, alerts, incident tracking — extending ADR-0018 outward.

### 3.1 Metrics

- Expose Prometheus `/metrics` (OpenMetrics). Extend ADR-0018 in-memory ring buffer with a Prometheus exporter (histograms for latency, counters for requests/errors, gauges for queue depth).
- `ServiceMonitor` scrapes API/worker. Custom metrics: tenant request rate, domain latency, sync queue, workflow failures.

### 3.2 Tracing

- OpenTelemetry SDK; traces exported via OTLP to OTel Collector → Tempo/Jaeger.
- Span context propagated from edge → gateway → domain → DB (traceparent header). Sampled 1-10% prod, 100% on error.

### 3.3 Logs

- Structured JSON to stdout; OTel Collector / Promtail → Loki. Indexed by `tenant_id`, `request_id`, `trace_id`, `level`. Retention 30-90d.

### 3.4 Health / Readiness / Liveness

- Reuse ADR-0018 probes. K8s `livenessProbe` → `/health/live`, `readinessProbe` → `/health/ready`, `startupProbe` → `/health/startup`.

### 3.5 Dashboards

- Grafana dashboards: Platform Overview, Tenant Explorer, Domain Latency, Sync & Workflow, DB & Cache, SLO/SLA. Imported via ConfigMap/Helm.

### 3.6 SLO / SLI

| SLI | Definition | SLO Target |
|-----|-----------|-----------|
| Availability | successful probes / total | 99.9% (30d) |
| Latency (p95) | API response time | < 400ms |
| Error rate | 5xx / total | < 0.5% |
| Sync lag | queue drain time | < 60s |
| Backup success | successful / scheduled | 100% |

### 3.7 Alerts & Incident Tracking

- Prometheus `Alertmanager` → routes: critical→PagerDuty/on-call, high→Slack `#sre`, low→ticket.
- Incidents tracked in a `incidents` table (title, severity, status, runbook link, postmortem). ADR-0018 alert lifecycle extended with MTTA/MTTR metrics.

### 3.8 Acceptance Criteria

- All dashboards live; SLOs defined; alerts route correctly; traces correlate to logs via trace_id; < 1% overhead.

### 3.9 Reference: Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata: { name: api-metrics, namespace: deepabms }
spec:
  selector: { matchLabels: { app: api } }
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

### 3.10 Reference: Alert Rules

```yaml
groups:
  - name: deepabms-slo
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.005
        for: 5m
        labels: { severity: critical }
        annotations: { summary: "Error rate > 0.5%", runbook: "runbooks/11-incident-response" }
      - alert: SyncLagHigh
        expr: deepabms_sync_queue_depth > 100
        for: 5m
        labels: { severity: high }
      - alert: BackupFailed
        expr: increase(deepabms_backup_failures_total[1h]) > 0
        labels: { severity: critical }
      - alert: PodCrashLoop
        expr: kube_pod_container_status_restarts_total{container="api"} > 3
        labels: { severity: high }
```

### 3.11 Reference: OTel Collector Config (excerpt)

```yaml
receivers:
  otlp:
    protocols: { grpc: { endpoint: 0.0.0.0:4317 }, http: { endpoint: 0.0.0.0:4318 } }
processors:
  batch: {}
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert
exporters:
  tempo: { endpoint: tempo:4317 }
  loki: { endpoint: http://loki:3100/loki/api/v1/push }
  prometheus: { endpoint: 0.0.0.0:8889 }
service:
  pipelines:
    traces: { receivers: [otlp], processors: [batch], exporters: [tempo] }
    logs: { receivers: [otlp], processors: [batch], exporters: [loki] }
    metrics: { receivers: [otlp], processors: [batch], exporters: [prometheus] }
```

### 3.12 Grafana Dashboard Catalog

| Dashboard | Panels | Audience |
|-----------|--------|----------|
| Platform Overview | health, uptime, RPS, error rate, p95 | SRE |
| Tenant Explorer | per-tenant RPS, metering, quota | Operator |
| Domain Latency | latency by domain+route | Eng |
| Sync & Workflow | queue depth, conflicts, failed instances | Ops |
| DB & Cache | connection pool, cache hit, slow queries | DBA |
| SLO/SLA | SLI vs target, burn rate | Mgmt |

### 3.13 Incident Lifecycle (extension of ADR-0018)

```
detect (alert) ─▶ triage (severity) ─▶ acknowledge (on-call)
   │                                              │
   └─ communicate (status page) ◀────────────────┘
   │
   ▼
mitigate (runbook) ─▶ resolve ─▶ postmortem (blameless)
   │
   ▼
track MTTA/MTTR in incidents table; feed SLO error budget
```

---

## Phase 4 — Database Operations

**Goal**: Safe, automated, recoverable database lifecycle with migrations, zero-downtime changes, backups, replication, retention, integrity.

### 4.1 Migration Framework

- Versioned migrations (SQL + JS) in `apps/backend/migrations/`, applied by `MigrationRunner` (Phase component). Table `schema_migrations(version, applied_at, checksum, duration_ms)`.
- Forward-only with reversible `down` for non-destructive changes. Lock timeout guard.

### 4.2 Zero-Downtime Changes

- Expand/contract pattern: add column nullable → backfill → add constraint → drop old (separate deploys).
- For Postgres: `CONCURRENTLY` indexes, no table locks. For SQLite→Postgres move, dual-write window.

### 4.3 Automated Backup

- Full (weekly), incremental (daily), WAL/streaming (continuous). AES-256-GCM + SHA-256 (reuse ADR-0018 BackupSvc). Stored in MinIO.

### 4.4 Incremental & PITR

- Postgres: WAL archiving to MinIO → PITR to any second. SQLite: periodic snapshot + WAL copy.
- `restore --target-time` reconstructs state.

### 4.5 Replication & Read Replicas

- Postgres streaming replica for read scale and fast failover. Reads routed via Repository read-role when `?read=1` or analytics queries.
- Sync engine (ADR-0016) unaffected — clients still sync to primary.

### 4.6 Partitioning & Retention

- Partition large tables (audit_log, request_metrics, sync_queue) by time range. Retention jobs purge > N days (configurable per tenant tier).

### 4.7 Integrity

- Scheduled `PRAGMA integrity_check` (SQLite) / `pg_checksums` + logical consistency checks. Alert on mismatch. ADR-0018 DR simulation reuses these.

### 4.8 Acceptance Criteria

- Migrations applied automatically on deploy; PITR verified to ±5s; replicas serve reads; retention enforced; integrity green.

### 4.9 Migration Runner Design

```
MigrationRunner.applyPending()
   │
   ├─ SELECT version FROM schema_migrations ORDER BY version
   ├─ List files migrations/*.sql + *.js not yet applied
   ├─ For each (in order):
   │     BEGIN TRANSACTION
   │     ├─ execute up()
   │     ├─ INSERT schema_migrations(version, checksum, duration_ms)
   │     COMMIT
   │     on error → ROLLBACK, log, alert, HALT deploy
   └─ Record applied count + duration to metrics
```

Migration file naming: `0007_add_tenant_branding.sql`. Each migration carries a CRC32 checksum; mismatch on re-apply aborts (tamper detection).

### 4.10 Expand/Contract Example (zero-downtime rename)

| Step | Deploy | Action | Risk |
|------|--------|--------|------|
| 1 | v1.2 | ADD COLUMN `customer_ref` (nullable) | none |
| 2 | v1.2 | Backfill `customer_ref` from `old_ref` (batch) | low |
| 3 | v1.3 | App reads/writes both columns (dual-write) | low |
| 4 | v1.4 | App reads only `customer_ref` | low |
| 5 | v1.5 | DROP COLUMN `old_ref` | none |

### 4.11 PITR Restoration Procedure

```bash
# 1. Restore base full backup
pg_restore -d deepabms base_full.dump

# 2. Replay WAL to target time
pg_waldump /archive --timeline 1 --target-time "2026-07-14 10:00:00+00"

# 3. Verify
psql -c "SELECT count(*) FROM transactions WHERE created_at <= '2026-07-14 10:00:00+00';"

# 4. Promote replica / redirect connection
kubectl patch svc api -p '{"spec":{"selector":{"role":"promoted"}}}'
```

### 4.12 Replication Topology

```
Primary (RW) ──streaming (async)──▶ Replica A (RO, same AZ)
Primary ──streaming──▶ Replica B (RO, DR AZ)
Replica A ──WAL archive──▶ MinIO (archive bucket)
Reads routed: Repository.read(tenantId, {read:true}) → replica connection pool
Writes: always primary
Sync engine: clients sync to primary only (ADR-0016 unchanged)
```

### 4.13 Retention & Partitioning Policy

| Table | Partition | Retention | Action |
|-------|-----------|-----------|--------|
| audit_log | monthly | 24 months (enterprise 84) | detach + archive |
| request_metrics | daily | 90 days | purge |
| sync_queue | daily | 30 days | purge |
| slow_query_log | daily | 60 days | purge |
| usage_meters | monthly | 36 months | archive cold |

### 4.14 Integrity Verification Schedule

| Check | Frequency | Tool | Alert |
|-------|-----------|------|-------|
| Page/row checksum | daily | `pg_checksums` + `PRAGMA integrity_check` | critical |
| Logical consistency | weekly | domain reconciliation job | high |
| Backup restore test | monthly | restore-to-scratch + compare rowcount | high |

---

## Phase 5 — Multi-Tenant SaaS

**Goal**: Secure, isolated, provisioned, metered, feature-flagged, RBAC-scoped, white-labelable tenancy.

### 5.1 Isolation Model

- **Default**: row-level isolation (`tenant_id` on every business table) + DB-schema-per-tenant option for enterprise tier.
- Network/compute shared; data strictly scoped in Repository layer (mandatory `WHERE tenant_id`).
- Crypto isolation: per-tenant encryption key envelope in Vault.

### 5.2 Provisioning

- `TenantSvc.provision()` creates tenant row, schema/keys, default admin user, subscription, feature set, storage quota. Exposed via `POST /api/platform/tenants` (owner/operator).
- Self-serve onboarding flow with email verification.

### 5.3 Subscription & Licensing

- Tiers: Free, Standard, Professional, Enterprise. `subscriptions` table (plan, status, period, seats). License token (signed JWT) validates tier features.
- Billing webhook reconciliation (phase 2 integration).

### 5.4 Metering

- `MeteringSvc` records usage events (active users, transactions, API calls, storage GB) per tenant per day → `usage_meters` table.
- Feeds quota enforcement and billing. Exported as metric `tenant_usage`.

### 5.5 Feature Flags

- `FeatureFlagSvc`: flags scoped global/tenant/role. `isEnabled(flag, tenantId, userRole)`.
- Used for canary of features, A/B, and entitlement gating. Stored in `feature_flags` + `tenant_feature_flags`.

### 5.6 RBAC

- Extends ADR-0006 roles (owner, manager, accountant, staff, etc.) with tenant scope. `authorize(role, tenantId)` checks both.
- See RBAC Matrix section.

### 5.7 Analytics

- Per-tenant analytics derived from domain data + metering; isolated dashboards per tenant in Grafana (tenant datasource filter).

### 5.8 Per-Tenant Backup / Restore

- BackupSvc supports `--tenant` scope; restore validates tenant key. Cross-tenant restore prohibited by policy.

### 5.9 White-Label

- `tenant_branding` (logo, colors, name, domain, email templates). Frontend reads branding at load; email/PDF use tenant theme.

### 5.10 Acceptance Criteria

- N tenants isolated (data leak test fails); provisioning < 2 min; metering accurate; flags work; white-label renders; per-tenant restore validated.

### 5.11 Tenant Data Model (additions)

```
┌──────────────────────────────┐       ┌──────────────────────────────────┐
│    tenants                    │       │    subscriptions                  │
│──────────────────────────────│       │──────────────────────────────────│
│  id                       PK  │──┐    │  id                           PK  │
│  slug                     str  │  │    │  tenant_id        FK (T)        │
│  name                     str  │  │    │  plan            str (tier)     │
│  tier                     str  │  │    │  status          str            │
│  status                   str  │  │    │  current_period_start ts        │
│  encryption_key_id        str  │  │    │  current_period_end   ts        │
│  created_at               ts   │  │    │  seats           int           │
│  provisioned_at           ts?  │  │    │  created_at      ts             │
└──────────────────────────────┘  │    └──────────────────────────────────┘
                                   │
┌──────────────────────────────┐  │    ┌──────────────────────────────────┐
│    feature_flags              │  │    │    usage_meters                   │
│──────────────────────────────│  │    │──────────────────────────────────│
│  id                       PK  │  │    │  id                           PK  │
│  key                      str  │  │    │  tenant_id        FK (T)        │
│  scope                    str  │  │    │  metric           str           │
│  default_enabled          bool │  │    │  value            num           │
│  description               str? │  │    │  recorded_date    date          │
└──────────────────────────────┘  │    │  created_at      ts             │
                                   │    └──────────────────────────────────┘
┌──────────────────────────────┐  │
│    tenant_feature_flags       │  │    ┌──────────────────────────────────┐
│──────────────────────────────│  │    │    tenant_branding                │
│  tenant_id        FK (T)      │──┘    │──────────────────────────────────│
│  flag_id          FK (F)      │       │  tenant_id        PK/FK (T)      │
│  enabled           bool       │       │  display_name     str            │
│  overridden_at      ts?       │       │  logo_url         str?           │
│                              │       │  primary_color    str?           │
│                              │       │  domain           str?           │
│                              │       │  email_template    json?          │
└──────────────────────────────┘       └──────────────────────────────────┘
```

### 5.12 Provisioning Sequence

```
POST /api/platform/tenants  (operator)
   │  body: { name, slug, tier, adminEmail }
   ▼
TenantSvc.provision()
   ├─ INSERT tenants (status=pending)
   ├─ Vault: create envelope key tenant:<id>
   ├─ IF schema-per-tenant: CREATE SCHEMA t_<id>
   ├─ INSERT subscriptions (plan=tier, status=trialing)
   ├─ CREATE default admin user (role=owner) + invite email
   ├─ Apply default feature_flags for tier
   ├─ Allocate storage quota in MinIO (bucket t_<id>)
   ├─ status=active; emit metric tenant_provisioned
   ▼
Response: { tenantId, adminInviteToken, dashboardUrl }
```

### 5.13 Metering Event Flow

```
Domain action (e.g., sale created)
   │
   ▼
MeteringSvc.record(tenantId, "transactions", +1)
   │  (async, batched every 60s)
   ▼
INSERT usage_meters (tenant_id, metric, value, recorded_date)
   │
   ▼
Enforce quota: if usage > tier.limit → flag over_quota → throttle/notify
   │
   ▼
Export metric: tenant_usage{tenant="x",metric="transactions"}
```

### 5.14 Feature Flag Evaluation

```typescript
function isEnabled(flag: string, tenantId: string, role?: string): boolean {
  const override = tenantFeatureFlags.get(tenantId, flag);
  if (override) return override.enabled;
  const global = featureFlags.get(flag);
  if (global.scope === 'role' && role && !global.roles.includes(role)) return false;
  return global.defaultEnabled;
}
```

### 5.15 White-Label Rendering

- Frontend fetches `tenant_branding` at bootstrap (cached in Redis). Applies CSS variables `--brand-primary`, logo, app name.
- Email/PDF templates render with tenant theme + domain. Isolation: branding never leaks cross-tenant (scoped query).

---

## Phase 6 — Security Hardening

**Goal**: Defense-in-depth across supply chain, runtime, and data with continuous scanning and compliance.

### 6.1 Dependency Scanning

- `npm audit` + Snyk + Trivy fs in CI. Renovate bot for updates. Block merge on critical.

### 6.2 Container Scanning

- Trivy image scan (OS + language libs) in CI and admission (Kyverno). Baseline exceptions documented.

### 6.3 SBOM & Supply Chain

- Syft SBOM (CycloneDX) per image + attestation. In-toto/SLSA provenance. Image signature verify at admission.

### 6.4 Secrets & Cert Rotation

- Vault dynamic secrets; rotation policy (DB creds 30d, JWT signing key 90d, backup key 180d). Zero-downtime key rotation (dual-key accept window).

### 6.5 WAF & Rate Limiting

- Edge WAF (ModSecurity/Cloudflare) rules for OWASP CRS. Per-tenant + global rate limits (token bucket) at gateway. 429 on exceed.

### 6.6 CSP / CSRF / Headers

- CSP `default-src 'self'`, frame-ancestors none, HSTS, X-Content-Type-Options, Referrer-Policy. Double-submit CSRF token for cookie sessions; JWT bearer exempt but origin-checked.

### 6.7 Compliance & OWASP

- Map controls to OWASP ASVS L2 (see Phase 9). Pen test (external) before GA. Quarterly re-test.

### 6.8 Acceptance Criteria

- No unpatched CRITICAL; SBOM+signature on every image; rotation automated; WAF+rate limit active; CSP headers present; pen test clean.

### 6.9 Security Headers Reference

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: no-store on auth responses
```

### 6.10 WAF & Rate Limit Config

```yaml
# Traefik middleware
http:
  middlewares:
    waf:
      plugins:
        owasp-crs: { transactionTuning: { eventAction: deny } }
    ratelimit:
      rateLimit: { average: 100, burst: 200, period: 1m }
    tenantRatelimit:
      rateLimit: { average: 1000, burst: 2000, period: 1m, sourceCriterion: { requestHeaderName: X-Tenant-Id } }
```

### 6.11 Secrets Rotation Policy

| Secret | Rotation | Zero-downtime |
|--------|----------|---------------|
| DB password | 30 days | Vault dynamic creds; dual-cred window |
| JWT signing key | 90 days | `kid` header; accept old+new keys 7d |
| Backup encryption key | 180 days | re-encrypt new backups; old key retained for restore |
| Redis password | 60 days | rolling restart of API (stateless) |
| LLM API keys | on-leak | Vault update; restart workers |

### 6.12 Supply-Chain Control Chain

```
developer commit ─▶ CI build (reproducible) ─▶ SBOM (syft, CycloneDX)
                                          │
                              cosign sign (KMS/keyless)
                              cosign attest (SLSA provenance)
                                          │
                              push Harbor (immutable tag)
                                          │
                      admission Kyverno verifyImages (reject unsigned)
                                          │
                              runtime (signed only)
```

### 6.13 OWASP Top 10 Mapping (summary)

| # | Risk | Mitigation Phase |
|---|------|------------------|
| A01 Broken Access Control | RBAC + tenant scope (5) | 5/6 |
| A02 Cryptographic Failures | TLS + at-rest encryption (1/4) | 1/4 |
| A03 Injection | Validation (ADR-0003) + ORM params | 6 |
| A04 Insecure Design | Threat model + ADRs | all |
| A05 Security Misconfig | Hardened base + headers | 1/6 |
| A06 Vulnerable Components | Trivy/Snyk + Renovate | 2/6 |
| A07 Auth Failures | JWT + OIDC + rate limit | 5/6 |
| A08 Integrity Failures | SBOM + signing | 2/6 |
| A09 Logging Failures | Structured audit logs | 3 |
| A10 SSRF | Egress allowlist + URL validation | 6 |

### 6.14 Penetration Testing Cadence

- External pen test before GA; re-test quarterly and after major changes. Scope: auth, tenancy, API, WAF bypass, desync. Findings tracked to closure in `certification/pentest.md`.

---

## Phase 7 — Performance

**Goal**: Meet SLOs at scale via DB tuning, caching, compression, pagination, streaming, pooling, and horizontal scaling.

### 7.1 DB Indexes & Tuning

- Index review for hot queries (tenant_id, created_at, status). `EXPLAIN` gates in CI for regression. Postgres autovacuum tuned.

### 7.2 Caching (Redis)

- `CacheSvc` abstraction: cache-aside for domain reads, sessions, feature flags, tenant branding, AI context (ADR-0019). TTL per key class. Invalidation on writes.

### 7.3 Compression & Lazy Loading

- gzip/brotli at edge. Frontend code-split + lazy routes. Images responsive. API gzip + ETag.

### 7.4 Pagination & Streaming

- Cursor pagination for lists (no `OFFSET` large). Streaming responses for exports/reports (`res.write` chunks). Sync uses batch streaming (ADR-0016).

### 7.5 Connection Pooling

- Postgres pool (pgBouncer) per API replica. Redis pool. SQLite → single-writer with WAL; move to PG for scale.

### 7.6 Memory / CPU Planning

- Per-replica requests/limits; HPA. Node `--max-old-space-size` tuned. Worker memory budgets for sync batches.

### 7.7 Horizontal Scaling & Benchmarks

- Stateless API scales linearly. Benchmark suite (k6) establishes baselines: target 2k RPS/replica at p95<400ms. Regression gate on 20% degradation.

### 7.8 Acceptance Criteria

- Load test passes SLO at 2x expected peak; cache hit > 80%; p95 < 400ms; zero-downtime scale events.

### 7.9 Index Review (hot paths)

| Query | Index | Reason |
|-------|-------|--------|
| tenant transactions by date | `idx_txn_tenant_created(tenant_id, created_at)` | dashboard ranges |
| inventory stock lookup | `idx_inv_tenant_sku(tenant_id, sku)` | stock checks |
| sync queue pending | `idx_sync_tenant_status(tenant_id, status)` | sync drain |
| workflow instances active | `idx_wf_status_updated(status, updated_at)` | workflow engine |
| audit log by tenant/time | partition + `idx_audit_tenant(tenant_id)` | compliance query |

### 7.10 Redis Caching Patterns

```
Cache-aside (read):
  val = redis.get(key)
  if !val: val = db.query(); redis.set(key, val, TTL)
  return val

Write-through invalidate:
  db.write(); redis.del(key)   // or pub/sub invalidate across replicas

Key namespacing:  t:<tenantId>:<domain>:<entity>:<id>
TTL classes:      branding 86400 | flags 300 | session 1800 | report 120 | ai-ctx 300
```

### 7.11 Connection Pooling (pgBouncer)

```ini
[databases]
deepabms = host=db port=5432 dbname=deepabms

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
server_idle_timeout = 60
```

API configures `pg` pool to point at pgbouncer (`:6432`) instead of direct PG.

### 7.12 Pagination (cursor) Standard

```typescript
// Anti-pattern (avoid): OFFSET 100000
// Standard:
const cursor = decode(req.query.cursor);
const rows = await repo.list({
  tenantId,
  where: cursor ? { id: { lt: cursor.id }, ...filters } : filters,
  limit: 50,
  orderBy: { id: 'desc' },
});
const nextCursor = rows.length === 50 ? encode({ id: rows[49].id }) : null;
```

### 7.13 Streaming Export

```
GET /api/reports/transactions/export
   │
   ▼  res.writeHead(200, {'Content-Type':'text/csv'})
   repo.streamTransactions(tenantId, (row) => res.write(toCsv(row)))
   │  (chunked, backpressure-aware)
   ▼
   res.end()
```

### 7.14 Benchmark Suite (k6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 2000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: { http_req_duration: ['p(95)<400'], http_req_failed: ['rate<0.005'] },
};
export default function () {
  const r = http.get('https://deepabms.app/api/platform/health/ready', { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } });
  check(r, { 'status 200': (x) => x.status === 200 });
  sleep(1);
}
```

Baseline target: 2k RPS/replica sustained, p95 < 400ms, error < 0.5%. Regression gate fails build on >20% degradation vs baseline.

### 7.15 Capacity Planning

| Metric | Per replica (4 vCPU / 4GB) | Notes |
|--------|----------------------------|-------|
| Max RPS | ~2000 | p95 < 400ms |
| Concurrent conns | ~4000 | via pgbouncer |
| Cache hit target | > 80% | reduces DB load |
| Memory headroom | 30% | for GC/sync batches |
| Worker scale | 2-10 | by sync queue depth (KEDA) |

---

## Phase 8 — Disaster Recovery

**Goal**: Documented, tested, automated recovery with RPO/RTO and multi-region/offline capability.

### 8.1 DR Plan

- `certification/dr-plan.md`: topologies, responsibilities, contact tree, escalation. Builds on ADR-0018 runbook.

### 8.2 Backup & Failover

- Continuous WAL → MinIO; replica for fast failover. Automated failover playbook (promote replica / redirect DNS).

### 8.3 Replication & Multi-Region

- Async bucket replication MinIO primary→DR region. Optional cross-region read replica.

### 8.4 Offline Copy

- Periodic offline/air-gapped export (encrypted) for compliance/ransomware resilience.

### 8.5 RPO / RTO

| Scenario | RPO | RTO |
|----------|-----|-----|
| DB corruption | 5 min (WAL) | 15 min |
| Region down | 15 min | 60 min |
| Ransomware | last offline | 4h |

### 8.6 Runbooks

- 6 procedures (ADR-0018) expanded with exact commands, owners, comms. Game-day drills quarterly.

### 8.7 Acceptance Criteria

- DR drill restores to RPO/RTO; multi-region replication verified; offline copy restorable; runbooks exercised.

### 8.8 DR Runbook (expanded from ADR-0018)

| # | Scenario | Detection | RPO | RTO | Procedure |
|---|----------|-----------|-----|-----|-----------|
| 1 | DB corruption | integrity_check fail alert | 5m | 15m | stop api; restore latest verified backup; PRAGMA integrity_check; restart |
| 2 | Primary node down | pod crashloop alert | 1m | 5m | failover to replica; redirect svc; verify health |
| 3 | Region outage | multi-az probe fail | 15m | 60m | DNS switch to DR region; promote DR replica; MinIO failover |
| 4 | Ransomware | unexpected encrypt/lock | last offline | 4h | isolate; restore offline cold backup; rotate all keys |
| 5 | Sync failure | queue depth > threshold | n/a | 10m | clear corrupted queue; reset checkpoints; replay |
| 6 | Backup failure | backup_failed alert | n/a | 5m | check disk/perms/key; force new backup; verify |

### 8.9 DR Topology Diagram

```
        Primary Region                     DR Region
   ┌──────────────────────┐         ┌──────────────────────┐
   │  API (active)        │         │  API (warm standby)  │
   │  Primary DB (RW) ────┼─WAL────▶│  Replica (promotable)│
   │  MinIO (primary) ────┼─repl───▶│  MinIO (DR)          │
   └──────────────────────┘         └──────────────────────┘
            │                                │
            └──── offline/air-gapped export ─┘──▶ Cold Storage (tape/disk)
```

### 8.10 Game-Day Drill Checklist

- [ ] Announce maintenance window
- [ ] Trigger scenario in staging (simulate via ADR-0018 `/dr/simulate`)
- [ ] Verify alert fired + routed to on-call
- [ ] Execute runbook steps with timing
- [ ] Confirm RPO/RTO met
- [ ] Validate data integrity post-restore
- [ ] Document postmortem + action items
- [ ] Quarterly cadence; results in `certification/dr-drills.md`

### 8.11 Backup Verification & Restore Test

```bash
# monthly automated restore test
kubectl exec -it minio-0 -- mc cp archive/base_full.dump /tmp/
pg_restore -d deepabms_test /tmp/base_full.dump
psql deepabms_test -c "SELECT count(*) FROM transactions;"
# compare rowcount to source within tolerance
# if mismatch → alert high + open incident
```

---

## Phase 9 — Enterprise Certification

**Goal**: Map and evidence controls against recognized standards.

### 9.1 OWASP ASVS / Top 10

- ASVS L2 checklist (`certification/asvs-l2.md`); Top 10 mitigated (inj, broken auth, SSF, etc.).

### 9.2 Twelve-Factor

- Verification matrix (codebase, deps, config, backing services, build/run, processes, port, concurrency, disposability, dev/prod parity, logs, admin).

### 9.3 Cloud Native

- CNCF best-practices + container/image/observability readiness.

### 9.4 SOC2 / ISO27001 / GDPR

- Control mapping (`certification/soc2.md`, `iso27001.md`, `gdpr.md`): access, encryption, retention, breach, DPA, data subject rights.

### 9.5 Benchmarks / a11y / Mobile / Offline

- CIS benchmarks for images/k8s. WCAG 2.1 AA for web/mobile. Mobile offline + sync certified (ADR-0016).

### 9.6 Acceptance Criteria

- All control mappings ≥ 95% implemented; external auditor-ready evidence package.

### 9.7 Control Mapping Tables

**OWASP ASVS L2 (selected domains)**

| V# | Category | Implemented In | Status |
|----|----------|----------------|--------|
| V1 | Architecture | ADR-0005/0006, this ADR | ✓ |
| V2 | Auth | ADR-0002, OIDC (Phase 5) | ✓ |
| V3 | Session | Redis sessions (Phase 7) | ✓ |
| V4 | Access Control | RBAC + tenant (Phase 5) | ✓ |
| V5 | Validation | ADR-0003 | ✓ |
| V6 | Stored Crypto | AES-256-GCM (Phase 4/6) | ✓ |
| V7 | Error Handling | structured logs (Phase 3) | ✓ |
| V8 | Data Protection | TLS + at-rest (Phase 1/6) | ✓ |
| V9 | Communications | TLS1.2+, mTLS | ✓ |
| V10 | Malicious Code | scanning (Phase 2/6) | ✓ |
| V11 | Business Logic | RBAC + metering (Phase 5) | ✓ |
| V12 | Files/Resources | egress allowlist | ✓ |
| V13 | API | rate limit + WAF | ✓ |
| V14 | Config | Vault + 12-factor | ✓ |

**Twelve-Factor Verification**

| Factor | Evidence |
|--------|----------|
| I Codebase | single repo, multiple deploys |
| II Dependencies | npm lockfile, pinned base images |
| III Config | env/ConfigMap, no creds in code |
| IV Backing services | Postgres/Redis/MinIO as attached resources |
| V Build/Release/Run | CI builds immutable image |
| VI Processes | stateless API, sessions in Redis |
| VII Port binding | API exports port, ingress routes |
| VIII Concurrency | HPA, multiple processes |
| IX Disposability | fast startup, graceful shutdown |
| X Dev/prod parity | same image, same manifests |
| XI Logs | stdout JSON → Loki |
| XII Admin | background jobs as processes (workers) |

**GDPR Article Mapping**

| Article | Control | Phase |
|---------|---------|-------|
| 5 (purpose limitation) | tenant data scoping | 5 |
| 17 (erasure) | tenant purge + retention | 5/4 |
| 25 (data protection by design) | tenant isolation + encryption | 5/6 |
| 30 (records) | audit log | 3 |
| 32 (security) | encryption + WAF + scan | 1/6 |
| 33 (breach) | incident response + alerting | 3/8 |

---

## Phase 10 — Documentation (15 Guides)

1. `01-deployment-guide.md` — install on Compose/Swarm/K8s/Helm.
2. `02-configuration-reference.md` — all env vars, secrets, ConfigMaps.
3. `03-tenant-administration.md` — provisioning, branding, metering.
4. `04-backup-and-restore.md` — schedules, PITR, per-tenant.
5. `05-disaster-recovery-runbook.md` — scenarios, RPO/RTO, drills.
6. `06-monitoring-and-alerting.md` — dashboards, SLO, alert routes.
7. `07-security-hardening.md` — WAF, headers, scanning, rotation.
8. `08-ci-cd-pipeline.md` — stages, signing, rollback.
9. `09-scaling-and-performance.md` — HPA, caching, benchmarks.
10. `10-feature-flags-and-releases.md` — flags, canary, blue-green.
11. `11-troubleshooting.md` — common failures, log queries.
12. `12-upgrade-and-migration.md` — zero-downtime upgrades.
13. `13-api-onboarding.md` — auth, RBAC, tenant context.
14. `14-compliance-and-certification.md` — control mappings.
15. `15-incident-response.md` — severity, comms, postmortem.

### 10.1 Guide Outline Summary

| # | Guide | Primary Audience | Key Contents |
|---|-------|------------------|--------------|
| 1 | Deployment | Ops | Compose/Swarm/K8s/Helm install, TLS, secrets |
| 2 | Configuration | Ops/Dev | full env var + ConfigMap reference |
| 3 | Tenant Admin | Operator | provisioning, branding, metering, flags |
| 4 | Backup/Restore | DBA | schedules, PITR, per-tenant |
| 5 | DR Runbook | SRE | scenarios, RPO/RTO, drills |
| 6 | Monitoring | SRE | dashboards, SLO, alert routes |
| 7 | Security Hardening | Sec | WAF, headers, scanning, rotation |
| 8 | CI/CD | Dev | stages, signing, rollback |
| 9 | Scaling/Perf | Eng | HPA, caching, benchmarks |
| 10 | Flags/Releases | PM/Eng | flags, canary, blue-green |
| 11 | Troubleshooting | Support | common failures, log queries |
| 12 | Upgrade/Migration | Ops | zero-downtime upgrades |
| 13 | API Onboarding | Integrators | auth, RBAC, tenant context |
| 14 | Compliance | Audit | control mappings |
| 15 | Incident Response | SRE | severity, comms, postmortem |

Each guide follows a standard template: Overview, Prerequisites, Steps, Validation, Troubleshooting, Related.

---

## Phase 11 — Final Certification

**Goal**: Scorecard + matrix + Go-No-Go decision board.

### 11.1 Scorecard

| Dimension | Weight | Score (0-5) | Weighted |
|-----------|--------|-------------|----------|
| Deployment | 10% | | |
| CI/CD | 10% | | |
| Observability | 12% | | |
| DB Ops | 12% | | |
| Multi-Tenancy | 15% | | |
| Security | 15% | | |
| Performance | 10% | | |
| DR | 8% | | |
| Certification | 8% | | |

Overall pass threshold: weighted ≥ 4.0 (80%) with no dimension < 3.0.

### 11.2 Certification Matrix

- Phase × Control × Status (Implemented / Partial / Not-started / Evidence link).

### 11.3 Go-No-Go

- Chaired by Eng + Security + Product. Gates: pen test clean, DR drill passed, SLO met in staging 14d, no CRITICAL vulns, docs complete.
- Decision recorded in `certification/go-no-go.md` with sign-offs.

### 11.4 Go-No-Go Gate Checklist

| Gate | Pass Condition | Owner |
|------|----------------|-------|
| Pen test | 0 critical, 0 high open | Security |
| DR drill | RPO/RTO met, restore verified | SRE |
| SLO (staging 14d) | availability ≥ 99.9%, p95 < 400ms | SRE |
| Vulnerabilities | 0 CRITICAL in prod images | Sec/Dev |
| Documentation | 15/15 guides published | Tech Writer |
| Compliance | control coverage ≥ 95% | Compliance |
| Tenant isolation | leak test 0 failures | Eng |
| Performance | benchmark SLO at 2x peak | Eng |

### 11.5 Certification Evidence Package

- `certification/evidence/` containing: SBOMs, scan reports, pen-test report, DR drill logs, SLO dashboards export, control mapping sheets, tenant isolation test results, architecture decision log index.
- Package versioned with release tag; retained for audit (min 3 years per SOC2/ISO).

### 11.6 Post-Certification Cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Re-certification review | Quarterly | Compliance |
| Pen test | Quarterly / major change | Security |
| DR drill | Quarterly | SRE |
| Dependency refresh | Continuous (Renovate) | Dev |
| SLO review | Monthly | SRE |
| Control mapping audit | Semi-annual | Compliance |

---

## Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  DEFENSE IN DEPTH — SECURITY LAYERS                                            │
│                                                                                │
│  L1 Network:   WAF (OWASP CRS) │ NLB │ Security Groups │ mTLS service mesh    │
│  L2 Edge:      TLS1.2+ │ HSTS │ Rate Limit │ CSP/CSRF headers │ Origin check  │
│  L3 Identity:  JWT (ADR-0002) │ OIDC │ RBAC (ADR-0006) │ Tenant scope         │
│  L4 App:       Input validation (ADR-0003) │ Authz on every route             │
│  L5 Data:      Row-level tenant isolation │ encryption at rest │ PITR         │
│  L6 Supply:    SBOM │ cosign sign │ SLSA provenance │ Trivy scan │ Kyverno    │
│  L7 Ops:       Secrets rotation │ audit log │ pen test │ SOC2/ISO mapping     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Security Control Mapping (summary)

| Control | Phase | Implementation |
|---------|-------|----------------|
| AuthN | 5/6 | JWT + OIDC |
| AuthZ | 5 | RBAC + tenant scope |
| Encryption in transit | 1 | TLS + mTLS |
| Encryption at rest | 4/6 | AES-256-GCM backups, DB encryption |
| Secrets mgmt | 1/6 | Vault + rotation |
| Vulnerability mgmt | 2/6 | Trivy + Snyk + Renovate |
| Supply chain | 2/6 | SBOM + cosign + SLSA |
| Logging/audit | 3 | structured logs + audit |
| Input validation | 6 | ADR-0003 |
| WAF/Rate limit | 1/6 | edge rules |

---

## Tenant Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TENANT ISOLATION & REQUEST SCOPE                                             │
│                                                                                │
│  Request ─▶ TenantResolver ─▶ req.tenantId ─▶ RBAC(role, tenantId)           │
│                                                  │                            │
│                              Repository (mandatory WHERE tenant_id)           │
│                                                  │                            │
│              ┌───────────────────────────────────▼─────────────────────────┐ │
│              │  tenant_id scope on: every business table, cache keys,        │ │
│              │  metering, backups, analytics, feature flags                  │ │
│              └─────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  Isolation levels:                                                             │
│   • Shared schema + row filter (default)                                       │
│   • Schema-per-tenant (enterprise)                                             │
│   • Crypto envelope per tenant (Vault)                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Tenant Lifecycle

```
provision ─▶ activate ─▶ suspend ─▶ delete(soft) ─▶ purge(retention)
   │            │            │            │                 │
   └─ Trial ──▶ Convert ──▶ Churn                                       │
```

---

## Monitoring Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  OBSERVABILITY PIPELINE                                                       │
│                                                                                │
│  App (API/Worker)                                                              │
│   ├─ Metrics ──(Prometheus exposition /metrics)──▶ Prometheus ─▶ Grafana     │
│   ├─ Traces ──(OTLP)──────────────────────────▶ OTel Collector ─▶ Tempo     │
│   └─ Logs ───(stdout JSON)─────────────────────▶ Promtail ─▶ Loki            │
│                                                                                │
│  Prometheus ──(Alert rules)──▶ Alertmanager ─▶ PagerDuty / Slack / Ticket    │
│  Grafana ── SLO/SLI panels; tenant-scoped dashboards                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Backup & DR Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BACKUP & DR TOPOLOGY                                                         │
│                                                                                │
│  Primary DB                                                                     │
│   ├─ Continuous WAL ──▶ MinIO (primary region) ──replicate──▶ MinIO (DR)      │
│   ├─ Daily incremental (AES-256-GCM + SHA-256) ─▶ MinIO                       │
│   ├─ Weekly full ──▶ MinIO ──offline export──▶ Cold/Air-gapped                │
│   └─ Streaming Replica (fast failover + read scale)                           │
│                                                                                │
│  Restore: PITR (WAL target) │ full (cold) | per-tenant scoped                 │
│  RPO/RTO per scenario (see Phase 8). Verified by quarterly game-day.          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## CI/CD Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CI/CD PIPELINE (GitHub Actions / GitLab CI mirror)                           │
│                                                                                │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  │
│  │ Lint/   │─▶│ Build    │─▶│ Scan   │─▶│ SBOM + │─▶│ Push   │─▶│ Deploy  │  │
│  │ Test    │  │ (multi-  │  │ Trivy  │  │ Sign   │  │ Harbor  │  │ (Helm)  │  │
│  │ (gate)  │  │ arch)    │  │ (gate) │  │ (cosign)│  │ (immut) │  │ +Verify │  │
│  └─────────┘  └──────────┘  └────────┘  └────────┘  └────────┘  └────┬────┘  │
│                                                                       │       │
│                                                              pass ◀─────┘       │
│                                                                       │ fail  │
│                                                              rollback ◀────────┘  │
│                                                                                │
│  Self-hosted runner builds internal deps; OIDC to registry; no static secrets│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## RBAC Matrix

Roles (per tenant): `owner`, `manager`, `accountant`, `staff`, `auditor`, `operator` (platform), `support`.

| Capability | owner | manager | accountant | staff | auditor | operator | support |
|-----------|------|---------|-----------|-------|---------|----------|---------|
| View domain data (own tenant) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/Edit transactions | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | limited |
| Approve/Pay | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage users/RBAC | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| View financial reports | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | limited |
| Platform ops (health/metrics) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | limited |
| Backups/Deployments/DR | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Tenant provisioning | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Feature flags | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Audit log access | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ |
| White-label/branding | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| CI/CD / image signing | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Cross-tenant (multi-tenant admin) | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| AI Copilot (own data) | ✓ | ✓ | ✓ | ✓ | limited | ✓ | ✓ |

Notes:
- Every role is tenant-scoped; `operator` is platform-scoped (cross-tenant) and segregated from business data writes.
- `support` has read-limited + impersonation-with-audit only.
- Destructive actions (delete/purge) require `owner` + confirmation (see ADR-0019 safety).

---

## Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation | Phase |
|---|------|-----------|--------|-----------|-------|
| R1 | Multi-tenant data leak via missing scope | Low | Critical | Mandatory tenant_id in Repository; leak tests | 5 |
| R2 | Supply-chain compromise | Medium | Critical | SBOM + signing + SLSA + Kyverno verify | 2/6 |
| R3 | Secrets exposure in image/logs | Low | High | Vault + redaction + scan | 1/6 |
| R4 | Migration causes downtime | Medium | High | Zero-downtime pattern + staging | 4 |
| R5 | Backup restoration fails | Low | Critical | PITR + drill + integrity | 4/8 |
| R6 | SLO breach under load | Medium | High | HPA + cache + benchmarks | 7 |
| R7 | Ransomware | Low | Critical | Offline copy + immutability | 8 |
| R8 | WAF false positives block UX | Medium | Medium | Tune CRS + allowlist | 6 |
| R9 | Canary regression | Low | Medium | Weighted rollout + auto rollback | 1/2 |
| R10 | Compliance gap at audit | Medium | High | Control mapping + evidence | 9/11 |
| R11 | Rate limit DOS | Medium | Medium | Token bucket + WAF | 6 |
| R12 | Tenant crypto key loss | Low | Critical | Vault HA + backup keys | 5/6 |

Residual risk after program: all Critical risks have automated mitigation and test coverage.

---

## Implementation Plan

### Sequencing (recommended)

| Milestone | Phases | Duration | Exit Criteria |
|-----------|--------|----------|---------------|
| M1 Foundation | 1 (Compose/K8s), 4 (migrations) | 4 wks | Stack deploys; migrations auto |
| M2 Pipeline | 2 | 3 wks | Signed image + SBOM + rollback |
| M3 Observe | 3 | 3 wks | Dashboards + SLO + alerts |
| M4 Tenancy | 5 | 5 wks | Isolation + provisioning + flags |
| M5 Harden | 6 | 4 wks | Scan clean + WAF + headers |
| M6 Scale | 7 | 3 wks | Benchmarks pass SLO |
| M7 Recover | 8 | 3 wks | DR drill to RPO/RTO |
| M8 Certify | 9,10,11 | 5 wks | Scorecard ≥ 80%; Go-No-Go |

Total ~30 weeks; phases may overlap (e.g., 3 parallel to 1).

### Repository Layout (new/changed)

```
infra/
  docker-compose.yml
  k8s/            (manifests)
  helm/charts/deepabms/
deploy/           (env templates)
monitoring/
  prometheus/rules  grafana/dashboards  otel/config  alertmanager/routes
.github/workflows/  .gitlab-ci.yml
apps/backend/src/platform/
  tenant.service.ts  metering.service.ts  feature-flag.service.ts
  migration.runner.ts  cache.service.ts  secops.service.ts
certification/      (mappings, scorecard, go-no-go)
docs/engineering/runbooks/  docs/guides/
```

### Dependencies

- Builds on ADR-0002 (auth), ADR-0003 (validation), ADR-0005/0006 (domain/tenant model), ADR-0016 (sync), ADR-0017 (workflow), ADR-0018 (ops), ADR-0019 (AI).
- Requires: Postgres (for replicas/PITR), Redis, MinIO/S3, Vault, Harbor, Prometheus stack, cosign, Trivy, Syft, Renovate.

---

## Quality Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Availability | Platform uptime | 99.9% (SLO) |
| Latency | API p95 | < 400ms |
| Error rate | 5xx | < 0.5% |
| Scalability | Max tenants | ≥ 500 per cluster |
| Scalability | Throughput | ≥ 2k RPS/replica |
| Security | Critical vulns in prod | 0 |
| Security | Pen test | clean before GA |
| Backup | Success rate | 100% |
| Recovery | RPO (DB) | ≤ 5 min |
| Recovery | RTO (DB) | ≤ 15 min |
| Tenancy | Isolation leak tests | 0 failures |
| Compliance | Control coverage | ≥ 95% |
| Docs | Guides complete | 15/15 |
| Certification | Weighted score | ≥ 80% |

### Non-Functional Constraints

- Twelve-Factor compliance verified.
- Stateless API (no local state; sessions in Redis).
- Immutable infrastructure (no SSH into running containers for fixes).
- Observable by default (metrics/traces/logs on every path).
- Offline-capable critical paths (sync, AI fallback, DR).

---

## Consequences

### Positive

- DeepaBMS becomes a certifiable, multi-tenant, horizontally-scalable enterprise platform.
- Reproducible deployments across Compose/Swarm/K8s/Helm.
- Automated, signed, SBOM-backed CI/CD with safe rollback.
- Production observability with SLOs and incident tracking.
- Secure multi-tenancy with metering, flags, white-label.
- Documented, tested disaster recovery with RPO/RTO.
- Audit-ready compliance mappings (SOC2/ISO27001/GDPR/OWASP).

### Negative / Trade-offs

- Significant operational complexity and new infrastructure dependencies (Postgres, Redis, MinIO, Vault, Harbor, Prometheus stack).
- Team must acquire SRE/DevSecOps competency; higher cloud cost.
- SQLite-only deployments lose replica/PITR benefits (recommend Postgres for enterprise tier).
- Certification effort (pen tests, audits) adds time and external cost.
- Migration from single-process model requires careful dual-run during cutover.

### Follow-ups

- ADR for Postgres migration strategy (if adopted over SQLite).
- ADR for service mesh (mTLS) if zero-trust intra-cluster required.
- Quarterly re-certification cadence and ownership assignment.

---

## References

- [ADR-0002: JWT Authentication Framework](./ADR-0002-jwt-authentication-framework.md)
- [ADR-0003: Centralized Validation Framework](./ADR-0003-centralized-validation-framework.md)
- [ADR-0005: Domain-Oriented Backend Structure](./ADR-0005-domain-oriented-backend-structure.md)
- [ADR-0006: Enterprise Domain Model](./ADR-0006-enterprise-domain-model.md)
- [ADR-0016: Sync Architecture](./ADR-0016-sync-architecture.md)
- [ADR-0017: Workflow Architecture](./ADR-0017-workflow-architecture.md)
- [ADR-0018: Platform Operations](./ADR-0018-platform-operations.md)
- [ADR-0019: AI Copilot Architecture](./ADR-0019-ai-copilot-architecture.md)
- OWASP ASVS 4.0, OWASP Top 10 (2021)
- Twelve-Factor App (12factor.net)
- CNCF Cloud Native Definition
- SOC 2 (AICPA), ISO/IEC 27001, GDPR (Reg. 2016/679)
- SLSA Framework, Sigstore (cosign), Syft, Trivy, Prometheus, OpenTelemetry
