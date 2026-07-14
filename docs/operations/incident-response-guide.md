# DeepaBMS Incident Response Guide

> **Status:** Production reference
> **Audience:** Incident Commanders, On-call, Engineering Management
> **Last updated:** 2026-07-14
> **Related:** [SRE Runbook](sre-runbook.md) · [Disaster Recovery](disaster-recovery-guide.md) · [Operations Manual](operations-manual.md)

## Table of Contents

1. [Severity Classification (SEV1–SEV4)](#severity-classification-sev1sev4)
2. [Team Structure](#team-structure)
3. [Communication Templates](#communication-templates)
4. [Escalation Matrix](#escalation-matrix)
5. [Post-Incident Review](#post-incident-review)
6. [Incident Tracking](#incident-tracking)

---

## Severity Classification (SEV1–SEV4)

| SEV | Definition | Examples | Response |
|-----|------------|----------|----------|
| **SEV1** | Full outage / data loss / security breach; customer-impacting | All APIs down, ransomware, DB loss | Page IC + on-call; war room immediately |
| **SEV2** | Major degradation; partial outage or elevated errors | One region down, high 5xx, latency spike | Page on-call; IC within 15m |
| **SEV3** | Minor impact; isolated or workaround exists | Single feature broken, non-critical job fail | Ticket; on-call during hours |
| **SEV4** | Cosmetic / no customer impact | Typo, low-priority bug | Backlog; normal triage |

> **Note:** When uncertain, round **up**. Downgrading requires IC sign-off.

---

## Team Structure

- **Incident Commander (IC):** owns decision-making, not hands-on fix.
- **On-call Engineer:** executes mitigation per [SRE Runbook](sre-runbook.md).
- **Communications Lead:** updates status page, stakeholders, customers.
- **Scribe:** records timeline in the incident channel.
- **Subject Matter Experts (SME):** backend, DB, infra as needed.

For SEV3/SEV4 a single on-call may fill multiple roles.

---

## Communication Templates

**Initial (SEV1/2):**
```
🚨 INCIDENT DECLARED — SEV<n>
Summary: <one line>
Impact: <who/what>
IC: @<name>  Comms: @<name>  War room: <link>
Next update: <time+30m>
```

**Status update:**
```
📢 UPDATE — SEV<n> — <time>
Status: Investigating / Mitigating / Monitoring
Progress: <what changed>
ETA: <next milestone>
Next update: <time>
```

**Resolved:**
```
✅ RESOLVED — SEV<n> — <time>
Duration: <x>
Root cause (prelim): <one line>
Post-mortem: <link/date>
```

> **Warning:** Never speculate on root cause or blame in external comms. Stick to impact + status.

---

## Escalation Matrix

| Minute | Action |
|--------|--------|
| 0 | On-call acknowledges page; declares incident if SEV1/2 |
| 5 | IC engaged; war room opened |
| 15 | If no mitigation: SRE lead + DB/infra SME looped |
| 30 | If SEV1 unmitigated: Eng Manager + Comms Lead (status page) |
| 60 | If SEV1: Business Owner + vendor support (parallel) |

Escalation contacts mirror [DR Contacts](disaster-recovery-guide.md#dr-contacts).

---

## Post-Incident Review

Required for **all SEV1/SEV2** (blameless), optional for SEV3.

- Held within **5 business days**.
- Artifacts: timeline, impact, root cause (5 whys), action items.
- Action items: owner + due date, tracked to closure.
- Published internally; trends reviewed quarterly.

Template: see [SRE Runbook – Post-Mortem Template](sre-runbook.md#post-mortem-template).

---

## Incident Tracking

- **Tool:** issue tracker with `incident/` label + severity field.
- **Channel:** `#incident-<id>` per active incident.
- **Metrics:** MTTR, MTTA, incident count by SEV, error-budget burn.
- **Closure:** only after verification + post-mortem (SEV1/2) complete.

> **Note:** Track near-misses too — they are leading indicators of future SEV1s.

---

*Cross-references: [SRE Runbook](sre-runbook.md) · [Disaster Recovery](disaster-recovery-guide.md) · [Operations Manual](operations-manual.md) · [Release Engineering](release-engineering-guide.md)*
