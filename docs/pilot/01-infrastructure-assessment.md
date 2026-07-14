> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# 01 — Infrastructure Assessment Report (P7 Phase 1)

**Site:** Deepa Restaurant & Tourist Home
**Assessed by:** Deployment Engineer / DevOps
**Date:** ____ / ____ / 2026
**Status:** PREPARED — complete on-site verification before migration.

## 1. Verification Checklist
Fill the **EVIDENCE** column during the on-site visit. Run
`scripts/infra/check-readiness.sh` on the pilot server to auto-populate the
software component rows.

| # | Item | Requirement | Status | EVIDENCE |
|---|------|-------------|--------|----------|
| 1.1 | Server hardware | ≥ 4 vCPU, 8 GB RAM, SSD | ☐ | model/SPEC: ____ |
| 1.2 | OS | Ubuntu 22.04 LTS (Linux) | ☐ | `uname -a`: ____ |
| 1.3 | Network topology | Segregated LAN (POS/office), firewall | ☐ | diagram ref: ____ |
| 1.4 | PostgreSQL | v14+ (or app SQLite volume) | ☐ | `psql --version`: ____ |
| 1.5 | Redis | v7+ for cache/sessions | ☐ | `redis-cli --version`: ____ |
| 1.6 | Docker | v24+ | ☐ | `docker --version`: ____ |
| 1.7 | Kubernetes | v1.28+ (if HA) | ☐ | `kubectl version`: ____ |
| 1.8 | Storage | ≥ 100 GB free, SSD | ☐ | `df -h`: ____ |
| 1.9 | UPS | ≥ 15 min runtime, auto-shutdown | ☐ | model: ____ |
| 1.10 | Backup destination | Off-site / S3 + local | ☐ | mount/path: ____ |
| 1.11 | Receipt printers | Thermal, LAN/USB | ☐ | model/serial: ____ |
| 1.12 | Kitchen printers | Impact, LAN | ☐ | model/serial: ____ |
| 1.13 | Barcode printers | Label, USB | ☐ | model/serial: ____ |
| 1.14 | Barcode scanners | USB/HID | ☐ | model/serial: ____ |
| 1.15 | POS terminals | Touch, Windows/Linux | ☐ | qty/model: ____ |
| 1.16 | Cash drawers | RJ11 kick, per POS | ☐ | qty/serial: ____ |
| 1.17 | Local LAN | ≤ 2 ms latency, redundant switch | ☐ | iperf: ____ |
| 1.18 | Internet redundancy | 4G failover / dual ISP | ☐ | provider: ____ |

## 2. Capacity Notes
- Expected peak: ____ concurrent users, ____ orders/hour (lunch/dinner rush).
- DB growth: ____ MB/day (sales + audit). Retention: ____ days.
- Backup window: ____ ; RPO: ____ ; RTO: ____.

## 3. Risks
| ID | Risk | Mitigation |
|----|------|------------|
| I-1 | Single server SPOF | Daily backup + documented restore (see 09) |
| I-2 | Power loss corrupts DB | UPS + WAL mode + auto-shutdown script |
| I-3 | LAN congestion at rush | VLAN segregation, wired POS |

## 4. Sign-off
Infrastructure verified: ☐ YES / ☐ NO — **Name/Role: ____  Date: ____**
