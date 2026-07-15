import { Pool, PoolClient, QueryResult } from 'pg';
import { query, run } from '../../db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReplicaConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface PoolConfig {
  primary: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
  replicas?: ReplicaConfig[];
  failover?: {
    enabled: boolean;
    healthCheckIntervalMs: number;
    maxFailoverAttempts: number;
  };
  retry?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

const DEFAULT_POOL_CONFIG: Partial<PoolConfig['primary']> = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const DEFAULT_FAILOVER_CONFIG: { enabled: boolean; healthCheckIntervalMs: number; maxFailoverAttempts: number } = {
  enabled: true,
  healthCheckIntervalMs: 10000,
  maxFailoverAttempts: 3,
};

const DEFAULT_RETRY_CONFIG: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number } = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

function now(): string {
  return new Date().toISOString();
}

function isPostgres(): boolean {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── MultiPoolRouter ───────────────────────────────────────────────────────────

export class MultiPoolRouter {
  private primaryPool: Pool;
  private replicaPools: Pool[] = [];
  private replicaHealth: Map<number, boolean> = new Map();
  private failoverConfig: NonNullable<PoolConfig['failover']>;
  private retryConfig: NonNullable<PoolConfig['retry']>;
  private currentPrimaryConfig: NonNullable<PoolConfig['primary']>;
  private currentReplicaConfigs: ReplicaConfig[] = [];
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isFailoverActive = false;
  private failoverAttempts = 0;

  constructor(config: PoolConfig) {
    this.currentPrimaryConfig = config.primary;
    this.currentReplicaConfigs = config.replicas || [];
    this.failoverConfig = {
      enabled: config.failover?.enabled ?? DEFAULT_FAILOVER_CONFIG.enabled,
      healthCheckIntervalMs: config.failover?.healthCheckIntervalMs ?? DEFAULT_FAILOVER_CONFIG.healthCheckIntervalMs,
      maxFailoverAttempts: config.failover?.maxFailoverAttempts ?? DEFAULT_FAILOVER_CONFIG.maxFailoverAttempts,
    };
    this.retryConfig = {
      maxAttempts: config.retry?.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts,
      baseDelayMs: config.retry?.baseDelayMs ?? DEFAULT_RETRY_CONFIG.baseDelayMs,
      maxDelayMs: config.retry?.maxDelayMs ?? DEFAULT_RETRY_CONFIG.maxDelayMs,
    };

    this.primaryPool = this.createPool(config.primary);

    for (const replica of this.currentReplicaConfigs) {
      const pool = this.createPool(replica);
      this.replicaPools.push(pool);
      this.replicaHealth.set(this.replicaPools.length - 1, true);
    }

    if (this.failoverConfig.enabled) {
      this.startHealthCheck();
    }
  }

  private createPool(opts: { host: string; port: number; database: string; user: string; password: string; max?: number; idleTimeoutMillis?: number; connectionTimeoutMillis?: number }): Pool {
    return new Pool({
      host: opts.host,
      port: opts.port,
      database: opts.database,
      user: opts.user,
      password: opts.password,
      max: opts.max || DEFAULT_POOL_CONFIG.max,
      idleTimeoutMillis: opts.idleTimeoutMillis || DEFAULT_POOL_CONFIG.idleTimeoutMillis,
      connectionTimeoutMillis: opts.connectionTimeoutMillis || DEFAULT_POOL_CONFIG.connectionTimeoutMillis,
    });
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.checkReplicaHealth();
    }, this.failoverConfig.healthCheckIntervalMs);
  }

  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async checkReplicaHealth(): Promise<void> {
    for (let i = 0; i < this.replicaPools.length; i++) {
      try {
        const client = await this.replicaPools[i].connect();
        await client.query('SELECT 1');
        client.release();
        this.replicaHealth.set(i, true);
      } catch {
        const wasHealthy = this.replicaHealth.get(i);
        this.replicaHealth.set(i, false);
        if (wasHealthy) {
          console.warn(`[MultiPoolRouter] Replica ${i} is unhealthy at ${now()}`);
        }
      }
    }

    const allReplicasDown = this.replicaPools.every((_, i) => !this.replicaHealth.get(i));

    if (allReplicasDown && this.replicaPools.length > 0) {
      await this.handleFailover();
    }
  }

  private async handleFailover(): Promise<void> {
    if (this.isFailoverActive) return;
    this.isFailoverActive = true;

    try {
      console.warn('[MultiPoolRouter] All replicas down. Attempting failover...');

      for (let attempt = 1; attempt <= this.failoverConfig.maxFailoverAttempts; attempt++) {
        const primaryHealthy = await this.checkPrimaryHealth();
        if (primaryHealthy) {
          console.log('[MultiPoolRouter] Primary is healthy. Routing reads to primary.');
          this.isFailoverActive = false;
          this.failoverAttempts = 0;
          return;
        }

        console.warn(`[MultiPoolRouter] Failover attempt ${attempt}/${this.failoverConfig.maxFailoverAttempts} failed. Retrying...`);
        await sleep(this.failoverConfig.healthCheckIntervalMs);
      }

      this.failoverAttempts++;
      console.error(`[MultiPoolRouter] Failover exhausted after ${this.failoverConfig.maxFailoverAttempts} attempts.`);
    } finally {
      this.isFailoverActive = false;
    }
  }

  private async checkPrimaryHealth(): Promise<boolean> {
    try {
      const client = await this.primaryPool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  getPrimaryPool(): Pool {
    return this.primaryPool;
  }

  getHealthyReplicaPool(): Pool | null {
    if (this.isFailoverActive) {
      return this.primaryPool;
    }

    for (let i = 0; i < this.replicaPools.length; i++) {
      if (this.replicaHealth.get(i)) {
        return this.replicaPools[i];
      }
    }

    return this.replicaPools.length > 0 ? null : this.primaryPool;
  }

  async write(sql: string, params?: any[]): Promise<QueryResult> {
    return this.executeWithRetry(() => this.primaryPool.query(sql, params));
  }

  async read(sql: string, params?: any[]): Promise<QueryResult> {
    const replica = this.getHealthyReplicaPool();
    if (replica) {
      return this.executeWithRetry(() => replica.query(sql, params));
    }
    return this.executeWithRetry(() => this.primaryPool.query(sql, params));
  }

  private async executeWithRetry(fn: () => Promise<QueryResult>): Promise<QueryResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        if (
          err.code === '40P01' ||
          err.code === '40001' ||
          err.code === '08003' ||
          err.code === '08006'
        ) {
          if (attempt < this.retryConfig.maxAttempts) {
            const delay = Math.min(
              this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
              this.retryConfig.maxDelayMs,
            );
            console.warn(`[MultiPoolRouter] Retry ${attempt}/${this.retryConfig.maxAttempts} after ${delay}ms: ${err.message}`);
            await sleep(delay);
            continue;
          }
        }
        throw err;
      }
    }

    throw lastError || new Error('Execution failed after retries');
  }

  async getConnection(isWrite = true): Promise<PoolClient> {
    const pool = isWrite ? this.primaryPool : this.getHealthyReplicaPool() || this.primaryPool;
    return pool.connect();
  }

  async end(): Promise<void> {
    this.stopHealthCheck();
    await this.primaryPool.end();
    for (const pool of this.replicaPools) {
      await pool.end();
    }
  }
}

// ── Tenant-aware client ───────────────────────────────────────────────────────

export async function getClient(tenantId: string): Promise<PoolClient | null> {
  if (!isPostgres()) return null;

  const { Pool: PgPool } = require('pg');
  const pool = new PgPool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/deepabms',
    max: 1,
  });

  const client = await pool.connect();
  await client.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenantId]);
  return client;
}

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!isPostgres()) {
    return fn({} as PoolClient);
  }

  const { Pool: PgPool } = require('pg');
  const pool = new PgPool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/deepabms',
    max: 1,
  });

  const client = await pool.connect();

  try {
    await client.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenantId]);
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}

export async function withTenantPool<T>(
  router: MultiPoolRouter,
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
  isWrite = true,
): Promise<T> {
  const client = await router.getConnection(isWrite);

  try {
    await client.query(`SELECT set_config('app.current_tenant_id', $1, TRUE)`, [tenantId]);
    return await fn(client);
  } finally {
    client.release();
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createDefaultRouter(): MultiPoolRouter | null {
  if (!isPostgres()) return null;

  const config: PoolConfig = {
    primary: {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432', 10),
      database: process.env.PG_DATABASE || 'deepabms',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    replicas: [],
    failover: {
      enabled: process.env.PG_FAILOVER_ENABLED !== 'false',
      healthCheckIntervalMs: parseInt(process.env.PG_HEALTH_CHECK_INTERVAL || '10000', 10),
      maxFailoverAttempts: parseInt(process.env.PG_FAILOVER_MAX_ATTEMPTS || '3', 10),
    },
    retry: {
      maxAttempts: parseInt(process.env.PG_RETRY_MAX_ATTEMPTS || '3', 10),
      baseDelayMs: parseInt(process.env.PG_RETRY_BASE_DELAY || '100', 10),
      maxDelayMs: parseInt(process.env.PG_RETRY_MAX_DELAY || '2000', 10),
    },
  };

  const replicaHosts = (process.env.PG_REPLICA_HOSTS || '').split(',').filter(Boolean);
  for (const host of replicaHosts) {
    config.replicas!.push({
      host: host.trim(),
      port: parseInt(process.env.PG_REPLICA_PORT || '5432', 10),
      database: process.env.PG_REPLICA_DATABASE || process.env.PG_DATABASE || 'deepabms',
      user: process.env.PG_REPLICA_USER || process.env.PG_USER || 'postgres',
      password: process.env.PG_REPLICA_PASSWORD || process.env.PG_PASSWORD || 'postgres',
      max: parseInt(process.env.PG_REPLICA_POOL_MAX || '10', 10),
    });
  }

  return new MultiPoolRouter(config);
}

let _defaultRouter: MultiPoolRouter | null = null;

export function getDefaultRouter(): MultiPoolRouter | null {
  if (!_defaultRouter) {
    _defaultRouter = createDefaultRouter();
  }
  return _defaultRouter;
}

export function resetDefaultRouter(): void {
  if (_defaultRouter) {
    _defaultRouter.end().catch(() => {});
    _defaultRouter = null;
  }
}

export async function getPoolHealth(): Promise<{
  primary: { ok: boolean; detail: string };
  replicas: { index: number; ok: boolean; detail: string }[];
  failoverActive: boolean;
  totalConnections: number;
}> {
  if (!isPostgres()) {
    return {
      primary: { ok: true, detail: 'SQLite mode — no PostgreSQL pool' },
      replicas: [],
      failoverActive: false,
      totalConnections: 0,
    };
  }

  const router = getDefaultRouter();
  if (!router) {
    return {
      primary: { ok: false, detail: 'No pool router available' },
      replicas: [],
      failoverActive: false,
      totalConnections: 0,
    };
  }

  let primaryOk = false;
  let primaryDetail = 'unknown';

  try {
    const client = await router.getPrimaryPool().connect();
    await client.query('SELECT 1');
    client.release();
    primaryOk = true;
    primaryDetail = 'connected';
  } catch (err: any) {
    primaryDetail = err.message;
  }

  const replicaResults: { index: number; ok: boolean; detail: string }[] = [];
  let totalConns = 0;

  try {
    const stats = await router.getPrimaryPool().query(`
      SELECT COUNT(*) as total FROM pg_stat_activity WHERE datname = current_database()
    `);
    totalConns = parseInt(stats.rows[0]?.total || '0', 10);
  } catch {
    /* ignore */
  }

  return {
    primary: { ok: primaryOk, detail: primaryDetail },
    replicas: replicaResults,
    failoverActive: false,
    totalConnections: totalConns,
  };
}
