# Git Release Checklist — DeepaBMS v1.0.0

> Mark each item ✅ only when executed and evidenced. Items marked ⛔ are currently
> blocking and unmet.

## Pre-release
- [ ] Working tree clean (no uncommitted changes) ⛔ (F-3: dirty tree observed)
- [ ] `npm ci` succeeds in CI
- [ ] `npx tsc --noEmit` clean ✅ (executed, clean)
- [ ] `npx eslint .` 0 errors ✅ (executed, 0 errors)
- [ ] `npm run build` (backend) emits dist ✅ (executed, dist/index.js)
- [ ] Expo/Windows production builds succeed ⛔ (not executed — EAS/`dotnet` unavailable)
- [ ] Full Jest suite green in CI ⛔ (F-2: sqlite3 native missing in audit env; must run on ubuntu-latest)
- [ ] Coverage threshold met ⛔
- [ ] `npm audit` / SCA: no Critical/High ⛔ (not run)

## Packaging
- [ ] Docker image built & pushed ⛔ (no docker)
- [ ] Helm chart linted (`helm lint`) ⛔ (no helm)
- [ ] K8s manifests validated (`kubectl apply --dry-run=server` / kubeconform) ⛔
- [ ] SBOM generated (`syft`) ⛔
- [ ] Container scanned (`trivy`) clean ⛔
- [ ] Checksums (SHA256) generated for artifacts ⛔
- [ ] Release bundle assembled ⛔

## Deployment correctness (F-1)
- [ ] Postgres/Redis removed from K8s/Compose/Helm OR app genuinely uses them ⛔
- [ ] SQLite volume mounted at exact `deepa-bms.db` path; durability verified ⛔
- [ ] Backup + restore runbook executed in staging ⛔

## Tagging & docs
- [ ] `git tag v1.0.0` created ✅/⛔ (ABSENT — F-3)
- [ ] Release notes published (GA_RELEASE_NOTES.md) ✅ (drafted)
- [ ] Version manifest + known issues + LTS policy committed ✅ (this set)
- [ ] Support matrix / training docs complete ⛔ (partial)

## Go/No-Go
- [ ] Board signs FINAL_CERTIFICATION_REPORT ⛔ (currently RED)
