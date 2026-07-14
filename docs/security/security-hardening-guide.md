> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS — Security Hardening Guide

> Audience: DevOps, Platform Security, Engineering Leads
> Scope: End-to-end security hardening for the DeepaBMS backend, container,
> supply chain, and deployment. Maps to OWASP ASVS L2, OWASP Top 10 (2021),
> and SOC 2 / ISO 27001 / GDPR.

---

## 1. Threat Model (summary)

| Asset | Threat | Vector | Control |
|-------|--------|--------|---------|
| Tenant data | Cross-tenant leakage | Broken isolation | Schema-per-tenant + `tenant_id` + RLS |
| Credentials | Credential theft | Phishing / weak secrets | Vault + 32-byte JWT, MFA |
| App runtime | RCE / supply-chain | Malicious dep | SBOM + Sigstore/Cosign |
| Transport | MITM | No TLS | cert-manager + HSTS |
| Edge | Volumetric / L7 attacks | Bots, scanners | WAF + rate limit + CSP |
| Secrets in CI | Leak | Committed .env | .gitignore + secret scan |

---

## 2. Dependency Scanning

### 2.1 npm audit (baseline)

```bash
npm audit --audit-level=high
npm audit fix --audit-level=high   # non-breaking only
```

Fail CI on `high`/`critical`. Use `npm ci` (lockfile-enforced) in pipelines so
the resolved tree is reproducible and auditable.

### 2.2 Snyk (depth + reachability)

```bash
snyk test --severity-threshold=high
snyk monitor --org=deepabms     # continuous monitoring
snyk code test                   # SAST on first-party code
```

### 2.3 Policy

- No package with a `critical` advisory reaches `main`.
- Dependencies reviewed via Dependabot/Renovate auto-PRs.
- `engines` field pins Node major; CI matrix tests supported versions only.

---

## 3. Container Scanning

Image built with distroless or slim base. Scan before push:

```bash
trivy image --severity CRITICAL,HIGH deepabms/api:${TAG}
trivy image --exit-code 1 --severity CRITICAL deepabms/api:${TAG}
```

- Block on **CRITICAL** (see `scripts/security/container-scan.sh`).
- Non-root user, `readOnlyRootFilesystem: true`, dropped capabilities.
- Base image digest-pinned (`FROM node:20-bookworm-slim@sha256:...`).
- `USER node` and `NODE_OPTIONS=--disable-proto=delete` to harden prototypes.

---

## 4. SBOM (Software Bill of Materials)

SBOM is generated in CycloneDX from the image and source, signed, and attached
to every release.

```bash
syft deepabms/api:${TAG} -o cyclonedx-json > sbom.cdx.json
cosign sign-blob --key cosign.key sbom.cdx.json \
  --bundle sbom.cdx.json.sig
cosign verify-blob --key cosign.pub sbom.cdx.json \
  --bundle sbom.cdx.json.sig
```

Targets (see `scripts/security/sbom-generate.sh`):

- `syft packages` for OS + language deps.
- `syft -o cyclonedx-json` output to `security-reports/sbom/`.
- Sign with keyless Sigstore (OIDC) in CI, or a retained key in air-gapped envs.
- Upload SBOM + signature to the release and to the artifact registry.

---

## 5. Supply-Chain Integrity (SLSA / Sigstore)

```
   Source ──(build)──▶ Artifact ──(cosign sign)──▶ Registry
      │                    │                           │
      │                    │  (keyless OIDC)           │ (verify on deploy)
      ▼                    ▼                           ▼
   provenance          signature + attestation    admission policy
   (SLSA L3)           (cosign attest --type slsa) (Connaisseur / Kyverno)
```

- **Provenance**: generate SLSA provenance with `slsa-framework/slsa-github-generator`.
- **Signing**: `cosign sign` images; `cosign attest` for SBOM + vuln scan.
- **Verification at admission**: Kyverno / Connaisseur rejects unsigned images.
- **Pin actions** by SHA in CI; no `pull_request_target` on untrusted input.

---

## 6. Secrets Management

### 6.1 Hierarchy

```
   ┌─────────────────────────────────────────────┐
   │ HashiCorp Vault (primary)                    │
   │   ├─ secret/data/deepabms/prod               │
   │   ├─ pki/                                    │  (dynamic DB creds)
   │   └─ transit/                                │  (encryption-as-a-service)
   └──────────────────┬──────────────────────────┘
                      │ fallback
                      ▼
   ┌─────────────────────────────────────────────┐
   │ Kubernetes Secrets (sealed-secrets / ESO)    │
   │   fetched from Vault via External Secrets    │
   └─────────────────────────────────────────────┘
```

### 6.2 Rules

- No secrets in git, `.env`, or images (`docker history` safe).
- DB credentials are **dynamic** (Vault Database secrets engine) with 1h TTL.
- `JWT_SECRET` rotated quarterly + on incident (`scripts/security/rotate-secrets.sh`).
- Use `init` containers / ESO to mount secrets; never bake into image layers.
- `String` secrets referenced via secret refs in `k8s/` manifests.
- Rotate on offboarding; audit `vault audit` enabled.

### 6.3 Env Handling

- `.env.production` is git-ignored (verified by pre-commit hook).
- CI pulls secrets from Vault / GitHub Encrypted Secrets, never from files.

---

## 7. Certificate Management

- **cert-manager** (Ingress) issues Let's Encrypt certs via ACME HTTP-01 / DNS-01.
- Short-lived certs (90d) auto-renewed; alerts on renewal failure.
- `ClusterIssuer` for `deepabms.com` wildcard; per-tenant custom domains get
  their own `Certificate` object.
- HSTS preload enabled; OCSP stapling on.
- Internal mTLS between services via **SPIFFE/SPIRE** or Linkerd mesh.

```
   cert-manager ──ACME──▶ Let's Encrypt
        │
        ▼ issues
   Certificate (t_<slug>.deepabms.com)
        │
        ▼
   Ingress TLS ──▶ Pod (TLS termination at edge; mTLS mesh internally)
```

---

## 8. Web Application Firewall (WAF)

| Layer | Option | Notes |
|-------|--------|-------|
| CDN edge | Cloudflare WAF | Managed ruleset + OWASP core rules; bot fight mode |
| Cloud | AWS WAFv2 | Rate-based + SQLi/XSS rule groups |
| In-cluster | ModSecurity + OWASP CRS | NGINX Ingress annotation `nginx.ingress.kubernetes.io/enable-modsecurity` |

WAF policy:
- Block known bad bots, credential-stuffing, LFI/RFI, SQLi/XSS signatures.
- Anomaly scoring threshold = 5 → 403.
- Log-only mode during tuning, enforce after 2 weeks.
- Exclude health endpoints from rate rules.

---

## 9. Rate Limiting

Three tiers (implemented in `index.ts`):

1. **Global API**: 500 req / 15 min / IP.
2. **Auth**: 20 req / 15 min / IP (anti-bruteforce).
3. **Sync**: 300 req / 15 min / tenant.

Add tenant-aware limiting at the app tier (Redis token bucket keyed by
`tenantId` + `userId`) so one tenant cannot starve others. Return
`429` + `Retry-After`. Pair with WAF L7 limits.

---

## 10. Content Security Policy (CSP)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self';
font-src 'self';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
form-action 'self';
upgrade-insecure-requests;
```

- Report-only first (`Content-Security-Policy-Report-Only`) via `report-uri`.
- Tighten `connect-src` to known API origins per tenant.
- No `unsafe-eval` (avoid `new Function` / `eval`).

---

## 11. CSRF Protection

- State-changing requests require `SameSite=Strict/Lax` cookies + a CSRF token
  for browser sessions; API uses `Bearer` JWT (no cookie), exempt.
- `Origin`/`X-Requested-With` validated against allowlist.
- `Double-Submit Cookie` pattern for non-JWT flows.
- Mobile/Expo clients use `Authorization: Bearer` and are exempt from CSRF.

---

## 12. Security Headers (reference)

Set by `middleware/security.ts`:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Embedder-Policy` | `require-corp` |
| `Content-Security-Policy` | see §10 |

Verify with `scripts/security/owasp-check.sh`.

---

## 13. Authentication & Session Hardening

- `JWT_SECRET` ≥ 32 bytes random hex; `HS256` minimum, prefer `Ed25519` (ES256).
- Short token TTL (8h access, rotate); `iss`/`aud` validated.
- Constant-time PIN/JWT comparison (avoid timing attacks noted in AGENTS.md).
- Account lockout after N failures; alert on repeated failures.
- MFA (TOTP/WebAuthn) for `owner`/`manager` and all system roles.
- Session invalidation on password change / role change.

---

## 14. Authorization & Tenant Isolation

- `tenantMiddleware` always runs before route handlers.
- `featureFlag()` enforces plan entitlements (403 on miss).
- RBAC: system roles vs tenant roles separated; support impersonation logged.
- SQL uses parameterized queries; `tenant_id` injected server-side, never from
  client-controlled JSON.
- Object-level authz checked per request, not cached across tenants.

---

## 15. Data Protection

- Encryption at rest: Postgres `pgcrypt` / volume encryption (KMS CMK).
- Encryption in transit: TLS 1.2+ everywhere; internal mTLS.
- PII columns (enterprise): per-tenant KMS data key via Vault transit.
- Backups encrypted; keys rotated; retention per policy.
- Data minimization; soft-delete with purge job.

---

## 16. Logging & Audit

- Structured JSON logs with `tenantId`, `requestId`, `userId`, `role`.
- `shared.global_audit` records authz-relevant events (login, role change,
  secret access, tenant create/restore, license issue).
- Logs shipped to SIEM; immutable / WORM storage for audit trail.
- No secrets or PAN/PII in logs (redaction filter).

---

## 17. OWASP ASVS L2 Checklist

| # | Control | Status target | Implemented in |
|---|---------|---------------|----------------|
| V1.2 | Email/phone verification | ✓ | provisioning flow |
| V2.1 | Password length ≥ 12 | ✓ | `validate.ts` |
| V2.2 | Secure password recovery | ✓ | auth domain |
| V2.3 | Anti-automation (rate limit) | ✓ | `index.ts` limiters |
| V3.1 | Reauth for sensitive ops | ◐ | MFA rollout |
| V3.2 | MFA available | ◐ | roadmap |
| V4.1 | Use TLS 1.2+ | ✓ | ingress/cert-manager |
| V4.2 | Valid certs, HSTS | ✓ | §7, §12 |
| V5.1 | Verify same context session binding | ✓ | JWT claims |
| V5.2 | Bind session to IP/device (optional) | ◐ | |
| V5.3 | Session termination on logout | ✓ | auth |
| V6.1 | Generic error messages | ✓ | error handler |
| V6.2 | CSRF defense | ✓ | §11 |
| V7.1 | Access control model enforced | ✓ | `authorize()` + tenant |
| V7.2 | Deny by default | ✓ | |
| V7.3 | Privilege escalation blocked | ✓ | RBAC separation |
| V8.1 | Input validation | ✓ | `validate.ts` |
| V9.1 | Business logic layer | ◐ | |
| V10.1 | Client checks reproduced server-side | ✓ | |
| V11.1 | Anti-automation, brute force | ✓ | §9 |
| V12.1 | File upload restrictions | ◐ | |
| V13.1 | SSRF protection | ◐ | |
| V14.1 | HTTP headers security | ✓ | §12 |
| V14.2 | Dependency & component hygiene | ✓ | §2, §3 |

`✓` = implemented/base, `◐` = partial / in progress.

---

## 18. OWASP Top 10 (2021) Checklist

| ID | Risk | Mitigation | Verification |
|----|------|------------|--------------|
| A01 | Broken Access Control | tenant + RBAC, deny default | `owasp-check.sh`, pen test |
| A02 | Cryptographic Failures | TLS, KMS, no plaintext secrets | §6, §15 |
| A03 | Injection | Parameterized SQL, validated input | `snyk code`, `validate.ts` |
| A04 | Insecure Design | Threat model, abuse cases | §1 |
| A05 | Security Misconfiguration | Headers, CIS baseline, no default creds | `owasp-check.sh` |
| A06 | Vulnerable & Outdated Components | SBOM + scans + Renovate | §2, §4 |
| A07 | Identification & Auth Failures | JWT hardening, lockout, MFA | §13 |
| A08 | Software & Data Integrity | Signed images/SBOM, Cosign | §5 |
| A09 | Security Logging & Monitoring | Audit log, SIEM, alerting | §16 |
| A10 | SSRF | Allowlist egress, metadata block | §17 V13.1 |

---

## 19. Penetration Testing

Run at least quarterly and after major changes. Use
`docs/security/penetration-test-checklist.md` as the test plan. External
third-party test annually. Track findings in a risk register; remediate
critical within 7 days.

---

## 20. Compliance Matrices

### 20.1 SOC 2 Type II (Security, Availability, Confidentiality)

| TSC | Control area | Evidence |
|-----|--------------|----------|
| CC6.1 | Logical access — authn/authz | RBAC, audit log |
| CC6.6 | Boundary protection | WAF, network policy |
| CC6.8 | Tenant data disposal | purge job (§14.3) |
| CC7.1 | Vulnerability detection | scans, SBOM |
| CC7.2 | Incident response | IR runbook |
| A1.1 | Availability monitoring | metrics, alerts |
| C1.1 | Confidentiality of data | encryption, isolation |

`soc2-readiness.sh` automates evidence checks.

### 20.2 ISO/IEC 27001:2022

| Annex | Control | Mapping |
|-------|---------|---------|
| A.5.15 | Access control | RBAC |
| A.5.18 | Access rights | least privilege |
| A.8.9 | Configuration management | immutable infra |
| A.8.16 | Monitoring | SIEM/logging |
| A.8.24 | Crypto | KMS/TLS |
| A.8.25 | Secure dev lifecycle | SAST/SBOM |
| A.5.23 | Cloud security | k8s hardening |

### 20.3 GDPR (EU data subjects)

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| 32 | Security of processing | encryption, isolation |
| 44–49 | International transfers | data-residency (§13) |
| 17 | Right to erasure | purge job, deprovision |
| 30 | Records of processing | audit log |
| 33/34 | Breach notification | IR runbook + alerting |
| 25 | Data protection by design | tenant isolation by default |

---

## 21. Incident Response

1. Detect (SIEM alert / WAF block / 403 spike).
2. Triage & classify (P0–P3); page on-call.
3. Contain (revoke token, disable tenant, block IP at WAF).
4. Eradicate (rotate secrets, patch, rebuild signed image).
5. Recover (restore from verified backup, monitor).
6. Post-mortem (blameless, update this guide).

---

## 22. CI/CD Security Gates

```
   push ─▶ lint/typecheck ─▶ unit tests ─▶ snyk code
                                 │
                                 ▼
                          build image (digest-pinned)
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
        trivy (crit block)  syft SBOM + cosign   owasp-check (staging)
              │                  │                   │
              └──────────────────┼──────────────────┘
                                 ▼
                       deploy (Kyverno verify signature)
```

Automated scripts under `scripts/security/` and `scripts/compliance/`.

---

## 23. Hardening Checklist (quick reference)

- [ ] `npm ci` + `npm audit` in CI, fail on high/critical
- [ ] Trivy block on CRITICAL before push
- [ ] SBOM generated + cosign-signed every release
- [ ] Images non-root, read-only FS, dropped caps
- [ ] Vault for all secrets; dynamic DB creds
- [ ] cert-manager + HSTS + internal mTLS
- [ ] WAF (Cloudflare/ModSecurity) in enforce mode
- [ ] Rate limits per IP + per tenant
- [ ] CSP, CSRF, all security headers present
- [ ] JWT ≥ 32 bytes, short TTL, constant-time compare
- [ ] Audit logging to immutable store
- [ ] Quarterly pen test + annual external
- [ ] SOC 2 / ISO 27001 evidence gathered

---

## 24. Container & Kubernetes Hardening Baseline

### 24.1 Pod Security Standards

Apply `restricted` PSS profile to the `deepabms` namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: deepabms
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
```

### 24.2 Container runtime constraints

| Control | Value |
|---------|-------|
| `runAsNonRoot` | `true` |
| `runAsUser` | `10001` |
| `readOnlyRootFilesystem` | `true` |
| `allowPrivilegeEscalation` | `false` |
| `capabilities.drop` | `ALL` |
| `seccompProfile.type` | `RuntimeDefault` |

### 24.3 Network segmentation

- **Default-deny** `NetworkPolicy` on the namespace; only explicit allows.
- Frontend ↔ backend ↔ postgres flows explicitly permitted; no east-west by default.
- Postgres not exposed outside the cluster (no `LoadBalancer`/`NodePort`).
- Egress allowlist: package registry, Vault, S3, SMTP, ACME — everything else denied.

```
   Internet ──▶ Ingress/WAF ──▶ backend (Pod) ──▶ postgres (ClusterIP)
                    │                                  │
                    │                                  ▼
                    │                            vault / redis (internal)
                    ▼
              egress allowlist (registry, S3, SMTP, ACME)
```

---

## 25. Secure Software Development Lifecycle (SSDLC)

| Phase | Activity | Tooling |
|-------|----------|---------|
| Plan | Threat model, abuse cases | §1 |
| Code | Pre-commit (lint, secret scan) | `gitleaks`, ESLint |
| Build | Reproducible, SBOM, sign | `npm ci`, Syft, Cosign |
| Test | SAST + DAST + dep scan | `snyk code`, `npm audit`, `trivy` |
| Release | Attest + provenance | SLSA generator, `cosign attest` |
| Deploy | Admission policy | Kyverno / Connaisseur |
| Operate | Monitor + alert | SIEM, WAF analytics |

Pre-commit secret scanning rejects commits containing high-entropy strings or
known secret patterns (`gitleaks detect --pre-commit`). `.env`, `.env.production`,
and `*.key` are git-ignored and enforced by the pre-commit hook.

---

## 26. Threat Detection & Response Automation

- **WAF analytics**: alert on > 50 blocked requests/min from a single ASN.
- **Auth anomalies**: alert on > 10 failed logins/min per tenant; auto-block IP
  at WAF for 1h.
- **Metering spikes**: alert on API usage > 5× tenant baseline (possible abuse).
- **Crypto/dependency drift**: SBOM diff in CI; unexpected new package fails build.
- **Image drift**: Kyverno verifies running image digest matches signed release.
- **SIEM correlation**: combine `global_audit` + WAF + app logs for lateral-movement
  detection across tenants (isolation breach signal).

Runbook (abbreviated):
1. Page on-call; open incident channel.
2. Contain: revoke tenant session keys, block source IP at WAF, scale to 0 if needed.
3. Eradicate: rotate secrets (`rotate-secrets.sh`), patch, redeploy signed image.
4. Recover: restore from verified backup (`t_<slug>` scope), monitor.
5. Post-mortem within 5 business days; update this guide.

---

## 27. Data Subject & Privacy Controls (GDPR deep-dive)

- **Consent logging**: marketing/analytics consent recorded per user.
- **Data inventory**: `shared.data_inventory` maps fields → category → lawful basis.
- **Erasure**: `DELETE` cascade scoped to `tenant_id`; backups purged on rotation.
- **Portability**: export endpoint returns tenant data as JSON/CSV (feature-gated).
- **Breach**: 72-hour authority notification template; 24-hour internal TTX.
- **DPIA**: required for new high-risk processing (e.g., AI insights on PII).

---

## 28. Risk Register (template)

| ID | Risk | Likelihood | Impact | Controls | Owner | Status |
|----|------|-----------|--------|----------|-------|--------|
| R1 | Cross-tenant data leak | Low | Critical | Schema isolation + RLS | Platform | Mitigated |
| R2 | Stolen signing key | Low | High | Cosign + short TTL + KMS | Security | Mitigated |
| R3 | Supply-chain RCE | Medium | High | SBOM + Trivy + provenance | DevOps | Mitigated |
| R4 | DDoS / L7 flood | Medium | Medium | WAF + rate limit + autoscale | SRE | Mitigated |
| R5 | Insider abuse | Low | High | Audit + least privilege | Security | Monitored |

---

## 29. Glossary

- **SBOM**: Software Bill of Materials — inventory of all components in a build.
- **SLSA**: Supply-chain Levels for Software Artifacts — build integrity framework.
- **Sigstore**: Open-source signing/verification (Cosign, Fulcio, Rekor).
- **Cosign**: Tool to sign/verify containers and blobs.
- **Kyverno**: Kubernetes policy engine for admission control.
- **ASVS**: OWASP Application Security Verification Standard.
- **PSS**: Pod Security Standards (privileged / baseline / restricted).
- **mTLS**: mutual TLS — both client and server present certificates.
- **KMS**: Key Management Service — centralized cryptographic key storage.
- **ESO**: External Secrets Operator — syncs external secret stores into k8s.

---

## 30. References

- OWASP ASVS 4.0.3 — https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 (2021) — https://owasp.org/Top10/
- OWASP Cheat Sheet Series — https://cheatsheetseries.owasp.org
- SLSA — https://slsa.dev
- Sigstore — https://www.sigstore.dev
- CIS Docker / Kubernetes Benchmarks
- NIST SP 800-204 (cloud security), SP 800-218 (SSDF)
- SOC 2 (AICPA TSC), ISO/IEC 27001:2022, GDPR (EU 2016/679)
