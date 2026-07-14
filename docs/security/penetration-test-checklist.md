# DeepaBMS — Penetration Test Checklist

> Companion to `security-hardening-guide.md`. Use one row per finding in the
> risk register. Severity: Critical / High / Medium / Low / Info.

---

## How to use

1. Create a test environment that mirrors production (same images, config).
2. For each item, record: **Result** (Pass/Fail/N-A), **Evidence** (request/response, screenshot), **Severity**, **Ticket**.
3. Re-test after remediation. Critical/High must be fixed before go-live.

---

## A01 — Broken Access Control

- [ ] **Tenant isolation**: as Tenant A, attempt to read/write Tenant B resources via `id` tampering, `X-Tenant-ID` swap, and subdomain spoofing. Expect 0 rows / 403.
- [ ] **IDOR**: enumerate object IDs of another tenant; verify `tenant_id` enforced server-side.
- [ ] **Vertical privilege escalation**: `readonly` user attempts `DELETE` / role-change endpoints. Expect 403.
- [ ] **System role misuse**: `support`/`billing` account attempts tenant business data write. Expect 403.
- [ ] **Missing function-level authz**: call `PUT /api/...` without auth. Expect 401.
- [ ] **Mass assignment**: send extra fields (`role`, `isAdmin`) in profile update. Expect ignored.
- [ ] **CORS**: send `Origin: evil.com` with credentials. Expect not allowed.

## A02 — Cryptographic Failures

- [ ] **TLS**: confirm TLS 1.2+ only; no TLS 1.0/1.1. Test with `sslscan`/`testssl.sh`.
- [ ] **Cert validity**: valid chain, correct SAN, HSTS present and `max-age` ≥ 1 year.
- [ ] **Sensitive data in transit**: intercept traffic; confirm no PII/tokens in plaintext / URLs.
- [ ] **At-rest encryption**: confirm DB volume + backups encrypted (KMS CMK).
- [ ] **JWT alg confusion**: send `alg: none` and `HS256` with public key as HMAC secret. Expect reject.
- [ ] **Weak secrets**: confirm `JWT_SECRET` ≥ 32 bytes random; not in repo.

## A03 — Injection

- [ ] **SQL injection**: fuzz all parameters with `' OR 1=1 --`, `1; DROP TABLE`. Expect parameterized (no error leakage / data change).
- [ ] **NoSQL injection** (if applicable): probe JSON bodies.
- [ ] **Command injection**: probe any shell-exec paths (sync, tunnel, imports).
- [ ] **LDAP/XML/XPath injection**: if used, fuzz.
- [ ] **XSS (stored/reflected/DOM)**: inject `<script>`, `<img onerror>` in all user-input fields; confirm CSP blocks execution.
- [ ] **XXE**: upload malicious XML to import endpoints.
- [ ] **Template injection**: SSTI probes in any templated response.

## A04 — Insecure Design

- [ ] **Abuse cases**: trial can be repeated infinitely with same CC (card testing).
- [ ] **Resource exhaustion**: large payloads (`limit: 5mb` boundary), deep pagination.
- [ ] **Race conditions**: concurrent redemption / balance mutation (double-spend).
- [ ] **Workflow bypass**: skip payment step via direct API call.
- [ ] **Rate-limit bypass**: header spoofing (`X-Forwarded-For`) to reset counters.

## A05 — Security Misconfiguration

- [ ] **Security headers**: run `scripts/security/owasp-check.sh`; all headers present.
- [ ] **Default credentials**: confirm no default admin / DB creds.
- [ ] **Verbose errors**: trigger 500; confirm no stack traces / SQL exposed.
- [ ] **Unnecessary services/ports**: `nmap` the host; only expected ports open.
- [ ] **Directory listing / exposed files**: probe `/.git`, `/.env`, `/debug`.
- [ ] **CORS misconfig**: `Access-Control-Allow-Origin: *` with credentials absent.
- [ ] **Cloud metadata**: SSRF to `169.254.169.254` blocked.
- [ ] **Container**: non-root, read-only FS, no privileged (inspect pod spec).

## A06 — Vulnerable & Outdated Components

- [ ] **Dependency scan**: `npm audit` + `snyk test` clean of high/critical.
- [ ] **SBOM review**: every component accounted for; no known CVEs.
- [ ] **Framework version**: Express / Node on supported release.
- [ ] **CVE check on OS packages** via Trivy.

## A07 — Identification & Authentication Failures

- [ ] **Brute force**: auth limiter blocks after 20/15min; account lockout.
- [ ] **Weak password policy**: < 12 chars rejected; common passwords rejected.
- [ ] **Credential stuffing**: distributed attempts mitigated by WAF + rate limit.
- [ ] **JWT**: no `alg:none`; `iss`/`aud` validated; short TTL; no sensitive data in payload.
- [ ] **Session fixations**: new session on login; invalid on logout.
- [ ] **MFA**: enforced for `owner`/`manager` and system roles.
- [ ] **Password reset**: token single-use, short TTL, bound to user.
- [ ] **Timing attack**: login response time constant for valid/invalid users.
- [ ] **Offline license grace**: beyond grace → `402`; within grace → banner only.

## A08 — Software & Data Integrity Failures

- [ ] **Unsigned image**: deploy unsigned image; admission (Kyverno) rejects.
- [ ] **SBOM tamper**: modify SBOM; signature verification fails.
- [ ] **CI poisoned PR**: `pull_request_target` with untrusted input — confirm absent.
- [ ] **Dependency confusion**: internal package name squatting — registry scoped.
- [ ] **Webhook integrity**: webhook signatures verified (HMAC).

## A09 — Security Logging & Monitoring Failures

- [ ] **Audit coverage**: auth success/failure, role change, tenant create/restore, secret access logged.
- [ ] **Log injection**: inject CRLF / control chars; confirm escaped.
- [ ] **No secret leakage**: confirm JWT/tokens redacted in logs.
- [ ] **Alerting**: simulate 403 spike / WAF block; confirm alert fires.
- [ ] **Log integrity**: audit logs immutable / WORM.

## A10 — SSRF

- [ ] **Internal endpoint**: send `url=http://169.254.169.254/...`; expect blocked.
- [ ] **Cloud metadata**: blocked at network + app allowlist.
- [ ] **Blind SSRF**: out-of-band callback attempt; monitor egress.
- [ ] **DNS rebinding**: resolve to internal IP; expect deny by allowlist.
- [ ] **File fetch**: `file://`, `http://localhost` blocked.

---

## API-Specific

- [ ] **Parameter pollution**: duplicate params alter behavior.
- [ ] **HTTP method override**: `X-HTTP-Method-Override` bypasses auth route.
- [ ] **GraphQL/REST introspection**: disabled in prod.
- [ ] **File upload**: malicious MIME, ZIP bomb, path traversal (`../../`).
- [ ] **Pagination/limits**: unbounded `?limit=` causes DoS.

---

## Mobile / Expo Client

- [ ] **Token storage**: secure store (Keychain/Keystore), not plaintext.
- [ ] **Root/jailbreak detection**: optional warning.
- [ ] **Cert pinning**: enforced for prod API.
- [ ] **Deep link**: validated; no auth bypass.
- [ ] **Logs**: no secrets in Metro/adb logs.

---

## Reporting Template

```
Finding: <title>
Category: <OWASP Top 10 ID>
Severity: <Critical|High|Medium|Low|Info>
Affected: <endpoint / component>
Method: <steps to reproduce>
Evidence: <request/response or screenshot>
Impact: <what an attacker gains>
Remediation: <fix>
Status: <Open|Fixed|Verified>
Ticket: <JIRA/link>
```

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Tester | | |
| Reviewer | | |
| Security Lead | | |
