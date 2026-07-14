# P8 Phase 5 — Security Reassessment

**Auditor:** Independent Security Consultant
**Verdict:** ⚠️ Multiple High findings; not production-safe without remediation.

> Verification note: SEC-01 and SEC-02 were re-confirmed by the lead auditor
> reading `auth.seed.ts`/`auth.routes.ts` and `middleware/tenant.ts`.

## SEC-01 — Default seeded PINs grant owner access (High)
**Evidence:** `seed/auth.seed.ts:17-19`, `auth.routes.ts:16-24`
```ts
const p1 = await bcrypt.hash('1234', saltRounds);
const p2 = await bcrypt.hash('2345', saltRounds);
const p3 = await bcrypt.hash('3456', saltRounds);
...
const users = await query('SELECT * FROM users WHERE active = 1');
for (const u of users) {
  const valid = await bcrypt.compare(pin, u.pin_hash);
```
PIN-only login, default `1234/2345/3456`. `POST /api/auth/login {pin:"1234"}`
returns an **owner** JWT. **Root cause:** demo seeds shipped as defaults;
no forced rotation. **Impact:** full admin compromise on fresh deploy.
**Effort:** 0.5d (force PIN change on first login + document). **Priority:** P0.

## SEC-02 — Tenant escape via attacker-controlled X-Tenant-ID (High)
**Evidence:** `middleware/tenant.ts:71-74`
```ts
const headerId = req.headers['x-tenant-id'];
if (typeof headerId === 'string' && headerId.trim().length > 0) {
  return { id: headerId.trim() };
}
```
Header accepted with **no binding** to the JWT user's tenant. Any logged-in user
sets `X-Tenant-ID: <victim>` to reach another tenant's data. **Impact:** broken
tenant isolation / privilege escalation (multi-tenant mode). **Effort:** 1d
(bind tenant to JWT claim, reject header override). **Priority:** P0 (if
multi-tenant is ever enabled).

## SEC-03 — Hardcoded fallback backup encryption key (Medium)
**Evidence:** `platform.service.ts:314`
```ts
crypto.scryptSync(
  process.env.BACKUP_ENCRYPTION_KEY || 'deepabms-backup-key-default', 'salt', 32)
```
If env unset, all backups encrypted with a publicly-known key. **Effort:** 0.5d
(refuse to start without the env). **Priority:** P1.

## SEC-04 — Trivially bypassable prompt-injection gate (Medium)
**Evidence:** `ai/ai.safety.ts:5-27,80-85`
```ts
const INJECTION_PATTERNS = [ /ignore\s+(all\s+)?(previous|above|prior)\s+.../i, ... ];
// RBAC check hardcoded passed:true
```
Blocklist misses "disregard the above", "new system prompt:", "you are now
root". RBAC check is `passed:true`. **Impact:** injected prompts reach the
model; RBAC not actually enforced in AI path. **Effort:** 2–3d (semantic
classification + real RBAC enforcement). **Priority:** P1.

## SEC-05 — Device secrets in URL query string (Medium)
**Evidence:** `sync.routes.ts:269-273,314-318`, `schema.sql:2141`
```ts
router.get('/download', async (req) => {
  const deviceId = req.query.deviceId as string;
  const token = req.query.token as string;
```
`device_secret` stored plaintext; sent in query for `/download`, `/status`,
`/device/auth` → leaks via proxy logs/referrers. **Effort:** 1d (move to
Authorization header / POST body). **Priority:** P1.

## SEC-06 — Weak JWT secret only warned (Medium)
**Evidence:** `index.ts:54-58`
```ts
if (JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is too short ...');
}
```
Not enforced; short secret → token forgery (`role: owner`). **Effort:** 0.5d
(enforce ≥32 chars, fail fast). **Priority:** P1.

## SEC-07 — PIN-only login, no per-account lockout (Medium)
**Evidence:** `auth.routes.ts:16` + `index.ts:128-133` (IP-wide 20/15min cap).
Online brute-force feasible; combined with SEC-01 trivial. **Effort:** 1d
(per-account lockout + constant-time compare). **Priority:** P1.

## SEC-08 — JWT verify omits explicit algorithms (Low)
**Evidence:** `middleware/auth.ts:68`
```ts
const decoded = jwt.verify(token, JWT_SECRET, { issuer, audience }) as any;
```
Missing `algorithms:['HS256']` (defense-in-depth; v9 already rejects `none`).
**Effort:** 5m. **Priority:** P2.

## SEC-09 — Unauthenticated health endpoints (Low)
**Evidence:** `platform.routes.ts:40,51,69,99` — `/health`, `/health/live`,
`/health/ready`, `/health/startup` unauthenticated, disclose infra status.
**Effort:** 2h. **Priority:** P2.

## Verified SECURE (no defect)
- **SQL injection:** all repository queries parameterized; dynamic WHERE/ORDER BY
  whitelisted (`safeOrder`, `buildWhere`). No string-concatenated SQL.
- **Committed secrets:** `.env` gitignored; no hardcoded API keys in source.
- **RBAC guards:** every sensitive route has `authenticate`+`authorize(...)`.
- **JWT `none`:** rejected by library; issuer/audience validated.
