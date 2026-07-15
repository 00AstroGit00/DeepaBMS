import { Request, Response, NextFunction } from 'express';
import { traceMiddleware } from './request-tracer';
import { resolveApiVersion } from './versioning';
import { createTenantRateLimiter } from './rate-limiter';
import type { ApiVersion, RateLimitConfig } from './gateway.types';

export interface GatewayMiddlewareOptions {
  tracing?: boolean;
  rateLimiting?: boolean;
  rateLimitConfig?: RateLimitConfig;
  versioning?: boolean;
}

export function gatewayMiddleware(options: GatewayMiddlewareOptions = {}) {
  const {
    tracing = true,
    rateLimiting = true,
    rateLimitConfig,
    versioning = true,
  } = options;

  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  if (tracing) {
    middlewares.push(traceMiddleware());
  }

  if (versioning) {
    middlewares.push((req: Request, _res: Response, next: NextFunction) => {
      if (!req.apiVersion) {
        req.apiVersion = resolveApiVersion(req);
      }
      next();
    });
  }

  if (rateLimiting) {
    const limiter = createTenantRateLimiter();
    const config: RateLimitConfig = rateLimitConfig || {
      windowMs: 15 * 60 * 1000,
      max: 500,
      perTenant: false,
    };
    middlewares.push(limiter.middleware(config));
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    let idx = 0;

    const runNext = (err?: any): void => {
      if (err) {
        next(err);
        return;
      }
      if (idx >= middlewares.length) {
        next();
        return;
      }
      const mw = middlewares[idx++];
      try {
        mw(req, res, runNext);
      } catch (e) {
        next(e);
      }
    };

    runNext();
  };
}

export function apiKeyAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      next();
      return;
    }

    const validApiKey = process.env.GATEWAY_API_KEY;
    if (!validApiKey) {
      next();
      return;
    }

    if (typeof apiKey === 'string' && apiKey === validApiKey) {
      if (!(req as any).user) {
        (req as any).user = {
          id: 'gateway',
          name: 'Gateway Service',
          role: 'apiclient',
        };
      }
      next();
      return;
    }

    res.status(401).json({ message: 'Invalid API key' });
  };
}

export function requestValidation() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && contentType) {
      if (
        !contentType.includes('application/json') &&
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded')
      ) {
        res.status(415).json({
          message: `Unsupported Content-Type: ${contentType}`,
          supported: [
            'application/json',
            'multipart/form-data',
            'application/x-www-form-urlencoded',
          ],
        });
        return;
      }
    }

    const apiVersion = req.apiVersion as ApiVersion | undefined;
    if (apiVersion === 'v2') {
      // v2 strict validation: require content-type for all request bodies
      if (
        ['POST', 'PUT', 'PATCH'].includes(req.method) &&
        !contentType &&
        (req.body && Object.keys(req.body).length > 0)
      ) {
        res.status(400).json({
          message: 'Content-Type header required for requests with a body',
        });
        return;
      }
    }

    next();
  };
}
