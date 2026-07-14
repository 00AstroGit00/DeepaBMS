-- DeepaBMS Migration 002: Create Migration & Health Tracking Tables
-- Version: 002
-- Description: Operational tables used by the migration runner and integrity
--              monitors. These are NOT part of the business schema and live in
--              the public schema alongside it.

-- Tracks every applied migration so migrate.sh can compute pending/rolled-back state.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(50)   PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL,
    applied_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    checksum    VARCHAR(64)   NOT NULL,
    duration_ms INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at
    ON schema_migrations (applied_at);

-- Append-only log of database health checks performed by verify-integrity.sh.
CREATE TABLE IF NOT EXISTS db_health_log (
    id          BIGSERIAL     PRIMARY KEY,
    check_type  VARCHAR(50)   NOT NULL,
    status      VARCHAR(20)   NOT NULL,
    duration_ms INTEGER       NOT NULL DEFAULT 0,
    detail      TEXT,
    checked_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_db_health_log_checked_at
    ON db_health_log (checked_at);
CREATE INDEX IF NOT EXISTS idx_db_health_log_check_type
    ON db_health_log (check_type);
