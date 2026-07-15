import { Request, Response, NextFunction } from 'express';
import type { RateLimitConfig } from './gateway.types';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const CLEANUP_INTERVAL_MS = 60_000;

export class TenantRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private globalStore: Map<string, RateLimitEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt <= now) this.store.delete(key);
      }
      for (const [key, entry] of this.globalStore.entries()) {
        if (entry.resetAt <= now) this.globalStore.delete(key);
      }
    }, CLEANUP_INTERVAL_MS);

    this.cleanupTimer.unref();
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private checkLimit(
    store: Map<string, RateLimitEntry>,
    key: string,
    config: RateLimitConfig,
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
    }

    entry.count++;

    if (entry.count > config.max) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
  }

  middleware(config: RateLimitConfig) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const tenantId = req.tenant?.tenantId;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = config.perTenant && tenantId ? `tenant:${tenantId}` : `ip:${ip}`;

      const result = this.checkLimit(this.globalStore, key, config);

      res.setHeader('X-RateLimit-Limit', String(config.max));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

      if (!result.allowed) {
        res.status(429).json({
          message: 'Too many requests. Please try again later.',
        });
        return;
      }

      next();
    };
  }
}

// Singleton instance
let instance: TenantRateLimiter | null = null;

export function createTenantRateLimiter(): TenantRateLimiter {
  if (!instance) {
    instance = new TenantRateLimiter();
  }
  return instance;
}

export function createGlobalRateLimiter(config?: Partial<RateLimitConfig>) {
  const limiter = createTenantRateLimiter();
  const effectiveConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000,
    max: 500,
    perTenant: false,
    ...config,
  };
  return limiter.middleware(effectiveConfig);
}

export function getRateLimiterInstance(): TenantRateLimiter | null {
  return instance;
}
