# P11 — Final Risk Register

| ID | Risk | Sev | Status | Closes when |
|----|------|-----|--------|--------------|
| R-1 | No OSI license | High | CLOSED (tree) / ❌ not in tag | LICENSE committed into the release tree |
| R-2 | HPA on SQLite backend | High | CLOSED (tree) / ❌ not in tag | HPA removal committed into the release tree |
| R-3 | Docs contradict SQLite | Med | CLOSED (tree) / ❌ not in tag | doc fixes committed into the release tree |
| R-4 | 19 high npm vulns | High | OPEN | controlled upgrade + clean `npm audit --audit-level=high` |
| R-5 | No CI evidence | High | OPEN | green runs of all 6 workflows with artifacts |
| R-6 | No runtime evidence | High | OPEN | executed container-smoke + helm/k8s + backup/restore + perf |
| R-7 | Stray `2.0` tag | Low | RESOLVED-BY-RECOMMENDATION | maintainer deletes tag |
| RK-7 | Stale/absent checksums | Med | OPEN | regenerated from the final release tree; committed into tag |
| RK-9 | Full-tree license scan | Low | OPEN | license-checker run; no copyleft conflict |
| RK-10 | console.* noise | Low | OPEN | reduced in v1.0.1 |

## Net posture

- **Closed in working tree:** R-1, R-2, R-3 (but not yet in the release tag).
- **Open / Not Verified:** R-4, R-5, R-6, RK-7, RK-9, RK-10.
- **GA gate:** blocked by R-4, R-5, R-6, RK-7 and the tag-incompleteness
  (R-1/R-2/R-3 not in `v1.0.0`).
