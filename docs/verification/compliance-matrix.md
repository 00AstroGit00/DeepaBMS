# Compliance Matrix — DeepaBMS v1.0 RC1

**Phase:** P6-8 (Regulatory & Standards Readiness)
**Date:** 2026-07-14
**Verdict:** PARTIAL READY (GST/Excise strongly covered; SOC2/ISO evidence pending)

## 1. Framework Coverage
| Framework | Relevance | Status | Evidence |
|-----------|-----------|--------|----------|
| **GST (India)** | Tax compliance for sales/accounting | Strong | accounting domain + GST ledger paths |
| **Kerala Excise** | Liquor/bar tracking | Strong | liquor domain (peg tracking, ADR-0010) |
| **SOC 2 (Trust)** | Security/availability/confidentiality | Partial | RBAC, audit domain, backups; no formal controls register |
| **ISO 27001** | InfoSec management | Partial | Security middleware; no ISMS docs |
| **GDPR** | PII of customers/employees | Partial | No explicit data-retention/anonymization controls found |
| **PCI-DSS** | Card payments | N/A | No card storage; gateway-only assumed |

## 2. Auditability
- Dedicated `audit` domain (`audit.routes.ts`) captures audit events.
- `security.test.ts` + RBAC guards support non-repudiation claims.
- No dedicated test suite for the audit domain itself (see test-coverage TC-2).

## 3. Data Residency & Retention
- No documented data-retention policy or PII anonymization flow.
- Single-region SQLite deployment implies data residency is customer-controlled.

## 4. Findings Summary
| ID | Severity | Finding |
|----|----------|---------|
| COMP-1 | Medium | No SOC2/ISO controls evidence register |
| COMP-2 | Medium | No GDPR retention/anonymization controls |
| COMP-3 | Low | Audit domain lacks dedicated test suite |
| COMP-4 | Info | GST + Kerala Excise well covered |

## 5. Recommendations
1. **(Medium/1wk/High/Med)** Produce a SOC2/ISO controls mapping doc citing
   existing artifacts (RBAC, audit, backups, TLS).
2. **(Medium/3d/High/Med)** Add PII retention/anonymization policy + a
   delete-user data-flow test (GDPR Art.17).
3. **(Low/1d/Low/Nil)** Add audit-domain test suite.
