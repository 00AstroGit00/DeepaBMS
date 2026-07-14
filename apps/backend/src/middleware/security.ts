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
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
};

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
    if (!origin || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};
