-- DeepaBMS Migration 001: Initial Schema
-- Version: 001
-- Description: Creates the full normalized relational schema for DeepaBMS.
-- NOTE: The canonical, complete schema lives in apps/backend/src/schema.sql.
--       This migration imports that file so the migration runner remains the
--       single source of truth for applying schema to a target PostgreSQL database.
--
-- The schema below is intentionally a thin include wrapper. The migration runner
-- (scripts/db/migrate.sh) passes DB connection parameters via the PG* environment
-- variables, so plain psql execution of this file will apply the full schema.

\i apps/backend/src/schema.sql
