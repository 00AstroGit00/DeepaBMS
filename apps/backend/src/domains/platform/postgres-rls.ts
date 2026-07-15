import { query, run } from '../../db';

function isPostgres(): boolean {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function enableRls(tableName: string): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);

  await run(`
    ALTER TABLE ${safeTable} ENABLE ROW LEVEL SECURITY
  `);

  await run(`
    ALTER TABLE ${safeTable} FORCE ROW LEVEL SECURITY
  `);
}

export async function createTenantIsolationPolicy(
  tableName: string,
  policyName?: string,
): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName || `tenant_isolation_${tableName}`);

  await enableRls(tableName);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = '${safeTable}'
        AND policyname = '${safePolicy}'
      ) THEN
        CREATE POLICY ${safePolicy} ON ${safeTable}
          FOR ALL
          USING (current_setting('app.current_tenant_id', TRUE) = tenant_id::text);
      END IF;
    END;
    $$;
  `);
}

export async function createTenantSelectPolicy(
  tableName: string,
  policyName?: string,
): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName || `tenant_select_${tableName}`);

  await enableRls(tableName);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = '${safeTable}'
        AND policyname = '${safePolicy}'
      ) THEN
        CREATE POLICY ${safePolicy} ON ${safeTable}
          FOR SELECT
          USING (current_setting('app.current_tenant_id', TRUE) = tenant_id::text);
      END IF;
    END;
    $$;
  `);
}

export async function createTenantInsertPolicy(
  tableName: string,
  policyName?: string,
): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName || `tenant_insert_${tableName}`);

  await enableRls(tableName);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = '${safeTable}'
        AND policyname = '${safePolicy}'
      ) THEN
        CREATE POLICY ${safePolicy} ON ${safeTable}
          FOR INSERT
          WITH CHECK (current_setting('app.current_tenant_id', TRUE) = tenant_id::text);
      END IF;
    END;
    $$;
  `);
}

export async function createTenantUpdatePolicy(
  tableName: string,
  policyName?: string,
): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName || `tenant_update_${tableName}`);

  await enableRls(tableName);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = '${safeTable}'
        AND policyname = '${safePolicy}'
      ) THEN
        CREATE POLICY ${safePolicy} ON ${safeTable}
          FOR UPDATE
          USING (current_setting('app.current_tenant_id', TRUE) = tenant_id::text)
          WITH CHECK (current_setting('app.current_tenant_id', TRUE) = tenant_id::text);
      END IF;
    END;
    $$;
  `);
}

export async function createTenantDeletePolicy(
  tableName: string,
  policyName?: string,
): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName || `tenant_delete_${tableName}`);

  await enableRls(tableName);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = '${safeTable}'
        AND policyname = '${safePolicy}'
      ) THEN
        CREATE POLICY ${safePolicy} ON ${safeTable}
          FOR DELETE
          USING (current_setting('app.current_tenant_id', TRUE) = tenant_id::text);
      END IF;
    END;
    $$;
  `);
}

export async function dropRlsPolicy(tableName: string, policyName: string): Promise<void> {
  if (!isPostgres()) return;

  const safeTable = sanitizeIdentifier(tableName);
  const safePolicy = sanitizeIdentifier(policyName);

  await run(`
    DROP POLICY IF EXISTS ${safePolicy} ON ${safeTable}
  `);
}

export async function setTenantContext(tenantId: string): Promise<void> {
  if (!isPostgres()) return;

  const safeId = tenantId.replace(/[^a-f0-9-]/gi, '');

  await run(`SELECT set_config('app.current_tenant_id', ?, TRUE)`, [safeId]);
}

export async function verifyRlsIsolation(): Promise<{
  ok: boolean;
  detail: string;
  testTenantId?: string;
  crossTenantAccess?: boolean;
  isolationLevel?: string;
}> {
  if (!isPostgres()) {
    return { ok: true, detail: 'RLS is only applicable to PostgreSQL' };
  }

  try {
    const testTenantId = uid('rls-test');

    await setTenantContext(testTenantId);

    const currentSetting = await query(
      `SELECT current_setting('app.current_tenant_id', TRUE) as tenant_id`,
    );

    if (!currentSetting[0]?.tenant_id) {
      return {
        ok: false,
        detail: 'app.current_tenant_id is not set',
        testTenantId,
      };
    }

    const rlsEnabled = await query(`
      SELECT COUNT(*) as count FROM pg_tables
      WHERE tablename IN (
        SELECT tablename FROM pg_class
        WHERE relrowsecurity = TRUE
      )
    `);

    const policies = await query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      ORDER BY schemaname, tablename
    `);

    const hasTenantPolicy = policies.some(
      (p: any) =>
        p.qual && p.qual.includes('current_setting') && p.qual.includes('current_tenant_id'),
    );

    return {
      ok: hasTenantPolicy,
      detail: hasTenantPolicy
        ? `RLS is active. ${policies.length} policies found across ${rlsEnabled[0]?.count || 0} tables.`
        : 'No tenant isolation policies found. RLS is enabled but policies may be missing.',
      testTenantId,
      isolationLevel: hasTenantPolicy ? 'full' : 'none',
    };
  } catch (err: any) {
    return {
      ok: false,
      detail: `RLS verification failed: ${err.message}`,
    };
  }
}

export async function getRlsStatus(): Promise<{
  policies: any[];
  rlsTables: string[];
  tenantContext: string | null;
}> {
  if (!isPostgres()) {
    return { policies: [], rlsTables: [], tenantContext: null };
  }

  const policies = await query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    ORDER BY schemaname, tablename, policyname
  `);

  const rlsTablesRows = await query(`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      AND tablename IN (
        SELECT relname FROM pg_class WHERE relrowsecurity = TRUE
      )
    ORDER BY schemaname, tablename
  `);

  let tenantContext: string | null = null;
  try {
    const ctx = await query(
      `SELECT current_setting('app.current_tenant_id', TRUE) as val`,
    );
    tenantContext = ctx[0]?.val || null;
  } catch {
    tenantContext = null;
  }

  return {
    policies,
    rlsTables: rlsTablesRows.map((r: any) => `${r.schemaname}.${r.tablename}`),
    tenantContext,
  };
}

export async function applyRlsToAllTenantTables(schemaName: string): Promise<{
  table: string;
  policyCreated: boolean;
}[]> {
  if (!isPostgres()) {
    return [];
  }

  const safeSchema = sanitizeIdentifier(schemaName);

  const tables = await query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = ? AND tablename NOT IN ('schema_migrations', 'backup_records')`,
    [safeSchema],
  );

  const results: { table: string; policyCreated: boolean }[] = [];

  for (const { tablename } of tables) {
    try {
      const fullName = `${safeSchema}.${tablename}`;
      const hasTenantColumn = await query(
        `SELECT COUNT(*) as count FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? AND column_name = 'tenant_id'`,
        [safeSchema, tablename],
      );

      if (hasTenantColumn[0]?.count > 0) {
        await createTenantIsolationPolicy(fullName);
        results.push({ table: fullName, policyCreated: true });
      } else {
        results.push({ table: fullName, policyCreated: false });
      }
    } catch {
      results.push({ table: `${safeSchema}.${tablename}`, policyCreated: false });
    }
  }

  return results;
}
