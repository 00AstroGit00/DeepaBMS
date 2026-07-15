# DeepaBMS L3 — Backup Certification
**Phase**: L3 Production Readiness Remediation
**Date**: July 15, 2026

---

## Remediation Actions

### backup.yml Rewrite
**Before**: PostgreSQL-targeted backup workflow (used pg_dump, postgres:15 service container)
**After**: SQLite file-copy backup workflow (uses scripts/backup/production-backup.sh)

**Changes made**:
- Removed PostgreSQL service container dependency
- Replaced pg_dump with SQLite file copy + integrity verification
- Added backend build + startup step for live database backup
- Added integrity verification (file type check, size check > 1KB)
- Upload backup as CI artifact (30-day retention)
- AWS S3 upload disabled (AWS secrets not configured — set to `if: false`)

## Backup Scripts Status

| Script | Path | Status |
|:-------|:-----|:-------|
| Production backup | `scripts/backup/production-backup.sh` | ✅ CONFIGURED |
| Integrity verification | `scripts/db/verify-integrity.sh` | ✅ CONFIGURED |
| PITR restore | `scripts/restore/pitr-restore.sh` | ✅ CONFIGURED |

## Backup Schedule

| Trigger | Schedule | Method |
|:--------|:---------|:-------|
| CI Cron | Daily at 02:00 UTC | `.github/workflows/backup.yml` |
| Manual | Human-triggered | `workflow_dispatch` |
| Local | Human-executed | `bash scripts/backup/production-backup.sh` |

## Backup Encryption

| Setting | Value |
|:--------|:-------|
| Encryption method | `BACKUP_ENCRYPTION_KEY` env var |
| Encryption tool | OpenSSL AES-256-CBC (script-configured) |
| Key management | External (set via environment) |

## Retention Policy

| Tier | Retention | Location |
|:-----|:----------|:---------|
| CI artifacts | 30 days | GitHub Actions |
| S3 (future) | 30 days | s3://backup-bucket/sqlite/ |

## Verification Procedure

```bash
# Manual backup + verify
bash scripts/backup/production-backup.sh
bash scripts/db/verify-integrity.sh

# Restore from backup
bash scripts/restore/pitr-restore.sh /path/to/backup.db
```

## Certification

| Criterion | Status | Evidence |
|:----------|:------:|:---------|
| Automated backup | ✅ | CI workflow + local script |
| Integrity verification | ✅ | verify-integrity.sh |
| Restore procedure | ✅ | pitr-restore.sh |
| Encryption | ✅ | AES-256-CBC via env key |
| Retention | ✅ | 30-day CI artifact retention |
| Offsite storage | ⚠️ | S3 configured but disabled (no AWS secrets) |
