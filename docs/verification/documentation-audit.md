# Documentation Audit — DeepaBMS v1.0 RC1

**Phase:** P6-9 (Documentation Consistency & Accuracy)
**Date:** 2026-07-14
**Verdict:** FAIL (material inaccuracies in counts — must fix before RC tag)

## 1. Purpose
Cross-check published engineering documentation against verified repository
facts. Inaccurate counts undermine the certification's credibility.

## 2. Discrepancies Found

### D-1 — Domain module count (Medium)
- `engineering-dashboard.md`: states "18 domain modules" (and "12" elsewhere).
- `module-map.md` header: "(19)".
- **Reality: 16 domain directories.**
- Action: correct both docs to 16.

### D-2 — Test suite / case count (Medium)
- `engineering-dashboard.md`: "19 suites / ~1900+ cases".
- **Reality: 15 test files / 1,693 cases.**
- Action: correct to 15 / 1,693.

### D-3 — "Validation" domain (Low)
- `module-map.md` lists a "Validation" domain (26 tests).
- **Reality:** no `src/domains/validation/`; validation is
  `middleware/validate.ts` + `tests/validate.test.ts`.
- Action: relabel as "Validation (middleware)" or remove from domain table.

### D-4 — ADR numbering (Low)
- ADR-0001 never authored; ADR-0015 number skipped with no note.
- Action: document the gaps or author a placeholder ADR-0001.

### D-5 — AI domain structure (Low)
- AGENTS.md implies standard domain pattern (single `service.ts`).
- `domains/ai/` has 11 files (gateway, safety, copilot, etc.), no `service.ts`.
- Not an error, but docs should note the AI domain's bespoke structure.

## 3. Accurate Summary (to publish)
- **16** backend domain modules, all with mounted routes.
- **15** test files, **1,693** test cases (backend only).
- **19** ADRs (ADR-0002…0014, 0016…0020).
- **0** TypeScript errors; **12** auto-fixable lint errors.
- **1** circular dependency (tenant ↔ feature-flags).

## 4. Recommendations
1. **(High/0.5h/High/Nil)** Fix D-1, D-2 counts in dashboard + module-map.
2. **(Low/0.5h/Med/Nil)** Fix D-3, D-4, D-5 annotations.
3. **(Low/—/Med/Nil)** Add a CI doc-lint check that asserts counts against
   `grep`/script output to prevent recurrence.
