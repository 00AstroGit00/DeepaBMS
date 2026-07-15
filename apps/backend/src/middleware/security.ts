import { Request, Response, NextFunction } from 'express';

// ── Environment ──────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';
const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://localhost:8081,http://localhost:19006'
)
  .split(',')
  .map((s) => s.trim());

// ── Trust proxy ──────────────────────────────────────────────────────
export const TRUST_PROXY =
  process.env.TRUST_PROXY ||
  (IS_PROD ? 'loopback,linklocal,uniquelocal' : 'loopback');

// ── Security headers ─────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-DNS-Prefetch-Control': 'off',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

const PROD_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

// ── Request limit protection ───────────────────────────────────────────
const MAX_BODY_SIZE = process.env.BODY_SIZE_LIMIT || '5mb';

// ── SQL injection detection pattern ────────────────────────────────────
const SQL_INJECTION_PATTERNS = /(\b(ALTER|CREATE|DELETE|DROP|EXEC|INSERT|MERGE|SELECT|TRUNCATE|UPDATE|UNION)\b.*['"]|['"].*\b(OR|AND)\b\s*['"]?\s*['"]?\d|--|\bxp_cmdshell\b|CHAR\s*\(|NCHAR\s*\()/i;

// ── SQL injection prevention middleware ───────────────────────────────
export function preventSqlInjection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === 'GET' || req.method === 'DELETE') {
    const queryString = JSON.stringify(req.query);
    if (SQL_INJECTION_PATTERNS.test(queryString)) {
      res.status(400).json({ message: 'Request rejected: suspicious query parameters' });
      return;
    }
  }

  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (SQL_INJECTION_PATTERNS.test(bodyString)) {
      res.status(400).json({ message: 'Request rejected: suspicious body content' });
      return;
    }
  }

  next();
}

// ── Request body size limiter ───────────────────────────────────────────
export function limitRequestBody(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxBytes = parseMaxBytes(MAX_BODY_SIZE);

  if (contentLength > maxBytes) {
    res.status(413).json({ message: 'Request entity too large' });
    return;
  }

  next();
}

function parseMaxBytes(size: string): number {
  const match = size.match(/^(\d+)(mb|kb)?$/i);
  if (!match) return 5 * 1024 * 1024;
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'mb').toLowerCase();
  if (unit === 'kb') return num * 1024;
  return num * 1024 * 1024;
}

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Remove default disclosure headers
  res.removeHeader('X-Powered-By');

  // Apply standard security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }

  // Apply strict headers only in production
  if (IS_PROD) {
    for (const [key, value] of Object.entries(PROD_HEADERS)) {
      res.setHeader(key, value);
    }
  }

  next();
}

// ── HTTPS redirect ───────────────────────────────────────────────────
export function httpsRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!IS_PROD) {
    next();
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  if (proto !== 'https') {
    const host = req.headers['host'] || req.hostname;
    res.redirect(301, `https://${host}${req.originalUrl}`);
    return;
  }

  next();
}

// ── CORS configuration ───────────────────────────────────────────────
export const CORS_OPTIONS = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    // In production, require origin for browser-based requests
    if (!origin) {
      if (IS_PROD) {
        callback(new Error('Origin header required in production mode'));
        return;
      }
      callback(null, true);
      return;
    }

    // Normalize and validate origin
    let normalizedOrigin = origin;
    try {
      const parsed = new URL(origin);
      normalizedOrigin = parsed.origin;
    } catch {
      callback(new Error(`Invalid origin format: '${origin}'`));
      return;
    }

    // Exact match against allowed origins
    if (CORS_ORIGINS.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    // Wildcard subdomain support for allowed domains
    const isSubdomainAllowed = CORS_ORIGINS.some((allowed) => {
      if (allowed.startsWith('*.')) {
        const baseDomain = allowed.slice(2);
        const hostname = new URL(origin).hostname;
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return false;
    });

    if (isSubdomainAllowed) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin '${origin}' not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID'],
  exposedHeaders: ['X-Request-Id', 'X-Server-Time'],
  maxAge: 86400, // 24 hours
};
