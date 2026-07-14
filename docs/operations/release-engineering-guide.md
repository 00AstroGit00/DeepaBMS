# DeepaBMS Release Engineering Guide

> **Status:** Production reference
> **Audience:** Release Managers, Backend, Platform
> **Last updated:** 2026-07-14
> **Related:** [CI/CD Guide](ci-cd-guide.md) · [Deployment Guide](deployment-guide.md) · [Incident Response](incident-response-guide.md)

## Table of Contents

1. [Versioning (SemVer)](#versioning-semver)
2. [Branch Strategy](#branch-strategy)
3. [Release Process](#release-process)
4. [CI/CD Stages](#cicd-stages)
5. [Deployment Gates](#deployment-gates)
6. [Rollback](#rollback)
7. [Hotfix](#hotfix)
8. [Release Notes](#release-notes)

---

## Versioning (SemVer)

DeepaBMS follows [SemVer 2.0](https://semver.org): `MAJOR.MINOR.PATCH`.

- **MAJOR:** breaking API/DB migration incompatible with prior version.
- **MINOR:** backward-compatible features.
- **PATCH:** backward-compatible fixes.

Tags: `v1.2.0`. Backend image tag mirrors version (`deepa-bms-backend:1.2.0`). Set via `BUILD_VERSION` at build.

> **Note:** Database migrations must be reversible for MINOR; MAJOR may require a documented migration path.

---

## Branch Strategy

```
main ──────●──────────●──────────●   (always releasable)
            \        /            \
release/1.2  ●──────●              ●  (cut from main)
              \    /                \
hotfix/1.2.1  ●──●                  ●
```

- `main`: protected; requires PR + green CI.
- `release/x.y`: stabilization branch; only merges from `main` or hotfixes.
- `hotfix/x.y.z`: branched from `release/x.y`; merged back to both.

---

## Release Process

1. Cut `release/x.y` from `main` when feature-complete.
2. Run full CI; QA sign-off on staging.
3. Tag `vX.Y.Z` and build immutable artifacts ([CI/CD](ci-cd-guide.md)).
4. Deploy to staging; verify SLOs.
5. Deployment gate approval ([#deployment-gates](#deployment-gates)).
6. Progressive rollout to production (canary 10% → 100%).
7. Publish release notes; close release.

---

## CI/CD Stages

Defined in `.github/workflows` / `.gitlab-ci.yml`:

1. **Lint & Typecheck** — `eslint`, `tsc`.
2. **Unit & Integration Tests** — Jest, backend + API contract.
3. **Build** — `apps/backend` tsc → `dist`; Docker image build.
4. **Scan** — Trivy / SAST.
5. **Push** — image to registry with version + `latest` (pinned in prod).
6. **Deploy** — staging auto; production gated.

> **Note:** Production deploy never runs automatically. It requires the gate in the next section.

---

## Deployment Gates

| Gate | Criteria | Approver |
|------|----------|----------|
| Build | Green CI, no HIGH/CRIT vulns | Automated |
| Staging | SLOs met 24h, QA sign-off | QA Lead |
| Pre-prod | DB migration dry-run passes | DB Lead |
| Production | Business window + IC aware | Release Mgr |

> **Warning:** Skipping the DB migration dry-run gate has caused outages. Always verify `migrate --check` before prod.

---

## Rollback

```bash
# Helm
helm rollback deepa-bms <previous-revision> -n deepa-bms

# Kustomize
kubectl -n deepa-bms rollout undo deployment/backend

# Compose
docker compose -f docker-compose.prod.yml up -d --no-deps \
  backend=deepa-bms-backend:<prev-version>
```

If a **breaking DB migration** shipped, restore from backup ([DR](disaster-recovery-guide.md)) — code rollback alone won't revert schema.

> **Note:** Rollback target must be a previously deployed, verified image tag. Never roll forward blindly during a SEV1.

---

## Hotfix

1. Branch `hotfix/x.y.z` from `release/x.y`.
2. Fix + tests; fast-track CI (still full pipeline).
3. Merge to `release/x.y` and `main`.
4. Tag `vX.Y.Z`; deploy per standard gates (expedited).
5. Communicate in release notes as security/critical.

---

## Release Notes

Template:

```markdown
## DeepaBMS vX.Y.Z — <date>
### Type: MAJOR | MINOR | PATCH | HOTFIX
### Highlights
- ...
### Breaking Changes
- ... (migration steps)
### Fixed
- ...
### Upgrade Steps
1. Backup DB
2. helm upgrade ... --version X.Y.Z
### Known Issues
- ...
```

Publish to `#releases` and the changelog; link from status page.

---

*Cross-references: [CI/CD Guide](ci-cd-guide.md) · [Deployment Guide](deployment-guide.md) · [SRE Runbook: High Error Rate](sre-runbook.md#high-error-rate) · [Incident Response](incident-response-guide.md)*
