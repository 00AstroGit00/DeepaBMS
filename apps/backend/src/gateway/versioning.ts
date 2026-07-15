import { Router, Request, Response, NextFunction } from 'express';
import type { ApiVersion } from './gateway.types';

const SUPPORTED_VERSIONS: ApiVersion[] = ['v1', 'v2'];
const DEFAULT_VERSION: ApiVersion = 'v1';

declare global {
  namespace Express {
    interface Request {
      apiVersion?: ApiVersion;
    }
  }
}

export function versionMiddleware(version: ApiVersion) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.apiVersion = version;
    next();
  };
}

function resolveVersionFromAccept(req: Request): ApiVersion | null {
  const accept = req.headers['accept'];
  if (!accept) return null;

  const match = accept.match(
    /application\/vnd\.deepabms\.(\w+)\+json/,
  );
  if (match) {
    const v = match[1] as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(v)) return v;
  }
  return null;
}

function resolveVersionFromHeader(req: Request): ApiVersion | null {
  const header = req.headers['x-api-version'];
  if (typeof header === 'string') {
    const v = header.trim().toLowerCase() as ApiVersion;
    if (SUPPORTED_VERSIONS.includes(v)) return v;
  }
  return null;
}

export function resolveApiVersion(req: Request): ApiVersion {
  return (
    resolveVersionFromHeader(req) ||
    resolveVersionFromAccept(req) ||
    DEFAULT_VERSION
  );
}

export function apiVersionRouter(): Router {
  const router = Router();

  // v1 router — mounts to /api/v1
  const v1Router = Router({ mergeParams: true });
  v1Router.use(versionMiddleware('v1'));
  router.use('/v1', v1Router);

  // v2 router — mounts to /api/v2
  const v2Router = Router({ mergeParams: true });
  v2Router.use(versionMiddleware('v2'));
  router.use('/v2', v2Router);

  // Default legacy routes (/api/*) resolve version from header/accept and
  // attach it to the request for downstream consumption.
  router.use((req: Request, _res: Response, next: NextFunction) => {
    if (!req.apiVersion) {
      req.apiVersion = resolveApiVersion(req);
    }
    next();
  });

  return router;
}

export function getV1Router(): Router {
  const router = Router({ mergeParams: true });
  router.use(versionMiddleware('v1'));
  return router;
}

export function getV2Router(): Router {
  const router = Router({ mergeParams: true });
  router.use(versionMiddleware('v2'));
  return router;
}

export function versionGuard(allowedVersions: ApiVersion[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = req.apiVersion || resolveApiVersion(req);
    if (!allowedVersions.includes(version)) {
      res.status(400).json({
        message: `API version '${version}' not supported for this endpoint`,
        supported: allowedVersions,
      });
      return;
    }
    next();
  };
}
