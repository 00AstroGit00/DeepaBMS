# Long-Term Support (LTS) Policy — DeepaBMS

**Applies once v1.0.0 is certified and released.**

## Versioning
- Semantic Versioning 2.0.0. `MAJOR.MINOR.PATCH`.
- `MAJOR`: breaking schema/API/tenant changes. `MINOR`: backwards-compatible
  features. `PATCH`: fixes/security.

## Support windows
- **Stable (GA) release:** supported for **18 months** from release date.
- **LTS:** every **even MINOR** (1.2, 1.4, …) is designated LTS and receives
  **24 months** of support (security + critical fixes only after the first 18).
- **Patch cadence:** security patches within **7 days** of Critical CVE; normal
  patches on a monthly cadence.

## Security updates
- Critical/High CVEs: patched and released as PATCH within the SLA above.
- SBOM regenerated each release; container re-scanned.

## End-of-life
- EOL announced **6 months** before date; no fixes after EOL.
- Upgrade path documented for each MAJOR boundary.

## Current status
- Policy defined pre-emptively. **Not yet in force** — v1.0.0 is not released
  (certification blocked). LTS clock starts at GA tag.
