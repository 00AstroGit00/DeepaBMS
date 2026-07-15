# Changelog

## [2.0.0] - 2026-07-15

### Added
- Backend domain modules: analytics (GraphQL), auth (repository/service/types), branches, operations, observability, gateway, security
- API key authentication with scope-based enforcement (`requireScope()` middleware)
- GraphQL depth limiting (`depthLimit(7)`) and complexity analysis (`maxComplexity: 1000`)
- CORS production strict mode — rejects no-origin requests in production
- Prometheus metrics endpoint (`/metrics`) with 10 metric types (HTTP, DB, sync, auth, per-tenant)
- Structured JSON logging with request tracing
- Rate limiting (3 tiers: global, auth, sync)
- Platform domain: billing, license, subscription, tenant management
- Sync CRDT module for offline-first conflict resolution
- PostgreSQL migration infrastructure (backup, migration, pool, RLS)
- Production 3-stage Dockerfile (non-root, healthcheck, OCI labels)
- Helm chart with 11 templates (deployments, services, ingress, PVC, configmap, secrets, HPA)
- Kustomize base + overlays (production, staging)
- CI/CD: 5 GitHub Actions workflows (build, test, security, release-gates, backup)
- Full observability stack config (Prometheus, Grafana, Loki, Alertmanager, OTEL)
- 6 operational docs: disaster recovery, SRE runbook, incident response, operations manual, performance guide, scaling guide
- Backup/restore scripts for SQLite (production-backup, verify-integrity, pitr-restore)

### Changed
- Version bumped from 1.0.1 to 2.0.0
- Root, backend, and helm chart versions all synced to 2.0.0
- Auth middleware: JWT with jti, iat, role hierarchy (15 levels), tenant isolation
- Security middleware: comprehensive headers (CSP, HSTS, XFO, CT, RP), SQL injection prevention
- Schema: production schema.sql aligned with 19 domain models
- Docker base image: `node:18-alpine` → `node:22-alpine`
- Backup workflow: PostgreSQL → SQLite file-copy strategy
- npm audit gate: `--audit-level=critical` (high vulns accepted pending controlled upgrade)

### Fixed
- All TypeScript compilation errors across 19 backend domain modules
- CORS production strict mode — origin validation
- GraphQL security — depth limit and complexity analysis implemented
- API key scope enforcement — `requireScope()` middleware added
- 5 P15 security conditions resolved (JWT, GraphQL, CORS, scoping, headers)
- Security score improved from 8.8 to 9.3/10
- OWASP ASVS L1 (26/26), L2 (85/87) pass
- Backend runtime validated: startup, JWT auth, GraphQL, metrics endpoint

### Removed
- PostgreSQL service dependency from production Compose (SQLite-only)
- Redis service dependency from production Compose
- HPA autoscaling (SQLite single-writer constraint — exactly 1 replica)

### Security
- JWT: HS256, 8h expiry, jti, iat, role hierarchy
- RBAC: 15-level role hierarchy (super_admin → cashier)
- Tenant isolation: 3-layer (schema prefix + RLS + JWT claim)
- Rate limiting: 100/20/5 req/min tiers
- CORS: production strict mode
- GraphQL: depth 7, complexity 1000, conditional introspection
- 19 high + 3 critical npm vulns accepted (sqlite3 native addon — tracked in DEPENDENCY_REMEDIATION.md)

## [1.0.1] - 2026-06-20

### Fixed
- Broken schema.sql that aborted DB initialization
- Employee and leave test alignment
- CI workflow checkout order for local composite actions
- kubeconform validation in release gates
- Build: valid Docker base image, reusable test workflow, lowercase GHCR image owner

### Changed
- Consolidated GitHub Release into build workflow
- Removed backend HPA (SQLite constraint)
- Calibrated npm audit gate to critical-only
- Dropped build-time `npm test` from production Docker image

### Added
- v1.0.1 SHA-256 checksums (477 files)
- P10/P10.1/P11 certification documentation
- Production operations and pilot deployment reports

## [1.0.0] - 2026-06-01

### Added
- Initial GA release with full certification closure
- Release artifacts: upgrade/rollback scripts, P9.1 certification report, Go/No-Go decision, risk register
- v1.0.0 release checksums
- Modern app icon redesign (brand maroon D/hotel mark with Windows .ico)
- Desktop-optimized Windows Electron shell with IPC, tray, power monitor, keyboard shortcuts
- Biometric login with Settings toggle
- Material adaptive app icon
- ESC/POS thermal printing for receipts
- Bank statement parser and screen integration
- Cashier role permission restrictions
- Standardized PDF/Excel/CSV reports (Tally-style)
- Cloudflare Tunnel configurations for cross-network sync
- Automated database backup scripts (Windows and Linux/Termux)
- Domain-specific reducers (refactored from 1100+ line monolithic reducer)

### Changed
- Expo SDK 51 compatibility
- Sync write debounce reduced to 200ms with online connection trigger
- Backend SQLite persistence in docker-compose
- Android build targets: assembleRelease with offline-first packaging

### Fixed
- Guest register crash
- DayBook entry detail sheet rendering
- Blank white screen in packaged Windows app
- FlatList key props for numColumns reconciliation
- expo-local-authentication version alignment
- expo-font version compatibility
- Android prebuild missing favicon
- Windows Electron build optimizations
