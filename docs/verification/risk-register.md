# Risk Register — DeepaBMS v1.0 RC1

**Phase:** P6-11 (Risk Consolidation)
**Date:** 2026-07-14

| ID | Risk | Likelihood | Impact | Severity | Mitigation | Owner |
|----|------|-----------|--------|----------|------------|-------|
| R-1 | Doc count inaccuracies ship in RC | High | Med | **High** | Fix D-1/D-2 before tag | Docs |
| R-2 | Lint errors (12 prettier) in release | High | Low | Medium | `eslint --fix` pre-tag | Build |
| R-3 | Native sqlite3 fails on target arch | Med | High | **High** | CI matrix per-arch; prebuilt binary | Backend |
| R-4 | Frontend has zero automated tests | High | High | **High** | Add RNTL suite pre-GA | Mobile |
| R-5 | Runtime coverage unverified (Termux) | High | High | **High** | Run Jest+coverage on ubuntu CI | CI |
| R-6 | Tenant↔feature-flags circular dep | Med | Low | Low | Lazy accessor refactor | Backend |
| R-7 | Mobile reducer perf on low-end HW | Med | Med | Medium | Split/memoize reducer | Mobile |
| R-8 | Sync setTimeout race | Med | Med | Medium | State-machine guard | Mobile |
| R-9 | PIN timing-attack exposure | Low | Med | Medium | Constant-time compare | Security |
| R-10 | No security lint/secret scan | Med | Med | Medium | Add plugins to CI | CI |
| R-11 | No chaos/pen-test executed | Med | High | Medium | Run CE-1…5 + DAST staging | Ops/Sec |
| R-12 | Compliance evidence gaps (SOC2/GDPR) | Med | Med | Medium | Controls register + retention | Compliance |
| R-13 | K8s/Helm not linted | Med | Med | Medium | `helm lint`/`kubeconform` | Ops |

**Top 3 must-close before GA:** R-1, R-3, R-4/R-5 (coverage + frontend tests).
