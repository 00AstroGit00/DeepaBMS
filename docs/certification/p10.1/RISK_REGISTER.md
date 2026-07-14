# Updated Risk Register — DeepaBMS v1.0.0 (P10.1 / R-8)

| ID | Risk | Sev | Status (after P10.1) |
|----|------|-----|----------------------|
| R-1 | No OSI license | High | CLOSED — MIT LICENSE added; README + package.json updated |
| R-2 | HPA on SQLite backend (data corruption) | High | CLOSED — k8s HPA manifest deleted; no HPA in k8s/ |
| R-3 | Docs contradict SQLite design | Med | CLOSED — ARCHITECTURE.md authoritative; 47 docs legacy-labelled; database.md fixed |
| R-4 | 19 high npm vulns (build/install chain) | High | OPEN — breaking fixes identified; accepted via SECURITY_EXCEPTIONS.md pending controlled upgrade |
| R-5 | No CI execution evidence | High | OPEN — checklist produced; no runs observed |
| R-6 | No runtime/production validation | High | OPEN — NOT VERIFIED; required evidence listed |
| R-6a | SQLite data durability unproven | High | OPEN (subset of R-6) — backup/restore not executed |
| R-7 | Stray `2.0` git tag | Low | RESOLVED-BY-RECOMMENDATION — deletion pending maintainer |
| R-8 | Production `console.*` noise (135) | Low | OPEN — quality, non-blocking; reduce in v1.0.1 |
| R-9 | License choice (MIT) not maintainer-confirmed | Low | OPEN — MIT is README's suggestion; confirm/swap trivially |

## Net

- **Closed:** R-1, R-2, R-3, R-7 (by recommendation).
- **Open / Not Verified:** R-4, R-5, R-6, R-6a, R-8, R-9.
- **GA-blocking opens:** R-4, R-5, R-6.
