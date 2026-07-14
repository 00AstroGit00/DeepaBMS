import { initializeDatabase } from '../src/db';

// Ensure the SQLite schema (schema.sql) is applied before any test runs.
// The application only calls initializeDatabase() at process startup
// (src/index.ts); tests construct repositories directly, so they must
// initialize the schema themselves. Without this, a fresh CI database has
// no tables and every query fails with "no such table".
beforeAll(async () => {
  await initializeDatabase();
});
