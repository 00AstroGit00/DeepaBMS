# 08 — Defect Log (P7 Phase 8)

**Status:** TEMPLATE — classify and track only production-blocking issues.
Do NOT add features. Fix only Critical/High that block go-live.

## Classification
- **Critical:** data loss, financial error, system down, security breach.
- **High:** major workflow blocked, no workaround.
- **Medium:** workaround exists, degrades UX.
- **Low:** cosmetic / nice-to-have.

## Defect Entries
| ID | Date | Title | Severity | Module | Status | Fix/Workaround | Verified By |
|----|------|-------|----------|--------|--------|----------------|-------------|
| D-001 | ____ | ____ | Crit/High/Med/Low | ____ | Open/Fixed/Deferred | ____ | ____ |
| D-002 | ____ | ____ | | | | | |
| D-003 | ____ | ____ | | | | | |

## Triage Rules
1. Critical → fix immediately (emergency patch), re-validate (02/04).
2. High → fix before GA; block go-live if unresolved.
3. Medium/Low → log to backlog; may defer to 1.0.1 (no feature creep in RC1).

## Change Control
- Every fix is a PR with tests; re-run `tsc`, `eslint`, and affected UAT
  scenario. No schema-breaking changes post-migration without rollback plan.

## Sign-off
All Critical/High resolved: ☐ YES / ☐ NO — **QA Lead: ____  Date: ____**
