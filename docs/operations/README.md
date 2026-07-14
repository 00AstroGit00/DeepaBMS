> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS — Operations Documentation

> **Scope:** Production operations, deployment, reliability, and incident management for DeepaBMS.
> **Stack:** Express backend (`apps/backend`) · PostgreSQL 15 · Redis 7 · Nginx · Prometheus/Grafana/Alertmanager · Docker / Swarm / Kubernetes / Helm.
> **Last updated:** 2026-07-14

## How to Use This Suite

Start with the **Deployment Guide** to ship, the **Operations Manual** to run day-to-day, and the **SRE Runbook** when things break. Cross-references are included at the bottom of every guide.

## Documentation Index

| Guide | Audience | Contents |
|-------|----------|----------|
| [Deployment Guide](deployment-guide.md) | DevOps / Platform | Prerequisites, env config, Docker, Swarm, K8s (kustomize), Helm, prod checklist, verification, troubleshooting |
| [Operations Manual](operations-manual.md) | Ops / On-call | Start/stop, health, logs, backup verification, user/tenant mgmt, perf, maintenance, escalation |
| [Administrator Guide](administrator-guide.md) | SysAdmins | Architecture, roles/permissions, config, security, DB admin, backup/restore, monitoring, FAQ |
| [SRE Runbook](sre-runbook.md) | SRE / On-call | Playbooks: outage, DB failure, latency, errors, mem leak, disk full, cert, security, backup, replication lag |
| [Disaster Recovery Guide](disaster-recovery-guide.md) | SRE / BC | DR architecture, RPO/RTO, backup strategy, recovery procedures, testing, contacts |
| [Incident Response Guide](incident-response-guide.md) | IC / Mgmt | SEV1–4, team structure, comms templates, escalation matrix, post-incident review, tracking |
| [Performance Guide](performance-guide.md) | Backend / SRE | DB optimization, caching, pool tuning, mem/CPU, network, load testing, benchmarks |
| [Scaling Guide](scaling-guide.md) | SRE / Platform | When to scale, vertical/horizontal, DB & cache scaling, auto-scaling, LB, capacity |
| [Release Engineering Guide](release-engineering-guide.md) | Release Mgr | SemVer, branching, release process, CI/CD stages, gates, rollback, hotfix, notes |
| [API Deployment Guide](api-deployment-guide.md) | Backend / API consumers | API versioning, rate limiting, CORS, docs, monitoring, deprecation |
| [CI/CD Guide](ci-cd-guide.md) | Backend / Platform | Pipeline overview, GitHub Actions, GitLab CI, local CI, artifacts, registry, envs |
| [Helm Guide](helm-guide.md) | Platform / SRE | Chart structure, values, install/upgrade, customization, release mgmt |
| [Docker Guide](docker-guide.md) | Ops / Dev | Images, compose profiles, prod vs dev, volumes, network, health checks, logging |
| [Kubernetes Guide](kubernetes-guide.md) | SRE / Platform | Cluster reqs, manifests, kustomize overlays, deploy, ingress/TLS, PV, HPA, rolling updates |

## Supporting Documentation

- **Security Hardening Guide** — maintained separately at [`docs/security/security-hardening-guide.md`](../security/security-hardening-guide.md). Read it alongside the Administrator Guide and SRE security playbook.

## Quick Links

- Deploy (K8s): `kubectl apply -k k8s/overlays/production`
- Deploy (Helm): `helm upgrade --install deepa-bms helm/deepa-bms -n deepa-bms`
- Deploy (Compose): `docker compose -f docker-compose.prod.yml up -d --wait`
- Health: `curl -f http://localhost:3000/health/live`
- Incident channel: `#incident` · On-call: PagerDuty `deepa-sre`

## Conventions

- All commands assume a Bash/Zsh shell and `kubectl`/`docker`/`helm` in `PATH`.
- Placeholder secrets are shown as `<...>` — never commit real values.
- File references use repo-relative paths.
