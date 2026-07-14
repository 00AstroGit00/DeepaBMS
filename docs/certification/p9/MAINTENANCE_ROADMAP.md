# Maintenance Roadmap — DeepaBMS (post-1.0)

> Roadmap is conditioned on GA certification passing. Items below are maintenance/
> hardening, NOT new features for 1.0.

## Immediate (P9 follow-up)
- Resolve F-1: reconcile deployment artifacts with SQLite reality (remove Postgres/
  Redis or adopt a real DB); fix volume mount for data durability.
- Land CI evidence: Jest+coverage, Helm lint, kubectl validation, SBOM, trivy.
- Cut `v1.0.0` tag with checksums + release bundle.

## Short term (1.0.x)
- Eliminate the 62 pre-existing lint warnings.
- Add DB rollback/migration tooling (K-1).
- Validate Prometheus alerts in a live staging environment (K-2).
- Dependency CVE remediation pipeline (`npm audit` gate in CI).

## Medium term (1.2 LTS)
- Optional move to managed Postgres for multi-node HA (would then re-enable the
  currently-orphaned K8s postgres/redis artifacts intentionally).
- Centralized tracing (OpenTelemetry) beyond logs/metrics.
- Automated DR restore drill in CI.

## Long term (1.4+)
- Multi-tenant data isolation hardening (row-level) if tenant model is adopted.
- Performance regression gates in CI from the benchmark suite.
