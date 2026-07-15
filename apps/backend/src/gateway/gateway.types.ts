export type ApiVersion = 'v1' | 'v2';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  perTenant: boolean;
}

export interface TenantRoutingConfig {
  headerBased: boolean;
  subdomainBased: boolean;
  pathBased: boolean;
}

export interface RouteDefinition {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options';
  handler: string;
  version: ApiVersion;
  auth?: boolean;
  rateLimit?: RateLimitConfig;
  features?: string[];
}

export interface TracingConfig {
  enabled: boolean;
  sampleRate: number;
  propagationFormat: 'w3c' | 'b3' | 'datadog';
}

export interface GatewayConfig {
  versions: ApiVersion[];
  defaultVersion: ApiVersion;
  rateLimits: {
    global: RateLimitConfig;
    perRoute: Record<string, RateLimitConfig>;
  };
  features: {
    rateLimiting: boolean;
    versioning: boolean;
    tracing: boolean;
    tenantRouting: boolean;
    openapi: boolean;
  };
  tracing: TracingConfig;
}
