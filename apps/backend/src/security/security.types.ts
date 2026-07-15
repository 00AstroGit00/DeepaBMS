export type SecurityEventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk' | 'false_positive';

export type TestResult = 'pass' | 'fail' | 'warning' | 'error' | 'skipped';

export interface SecurityAuditEvent {
  id: string;
  eventType: string;
  severity: SecurityEventSeverity;
  actorId: string;
  actorName: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface SecretRotationRecord {
  id: string;
  secretName: string;
  rotatedAt: string;
  rotatedBy: string;
  previousHash: string;
  status: 'success' | 'failed';
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keyRef: string;
  active: boolean;
  createdAt: string;
  rotatedAt: string | null;
}

export interface PenetrationTestResult {
  id: string;
  testName: string;
  category: string;
  severity: SecurityEventSeverity;
  finding: string;
  remediation: string;
  status: FindingStatus;
}

export interface SecurityFinding {
  id: string;
  type: string;
  severity: SecurityEventSeverity;
  component: string;
  description: string;
  remediation: string;
  status: FindingStatus;
  discoveredAt: string;
  resolvedAt: string | null;
}

export interface TenantIsolationTest {
  id: string;
  testName: string;
  result: TestResult;
  details: string;
  testedAt: string;
}

export interface SecurityAuditReport {
  id: string;
  timestamp: string;
  overallScore: number;
  checks: SecurityCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface SecurityCheckResult {
  check: string;
  result: TestResult;
  details: string;
  severity: SecurityEventSeverity;
  recommendation: string;
}

export interface ApiSecurityStatus {
  cors: { configured: boolean; origins: string[]; strict: boolean };
  headers: { securityHeaders: boolean; csp: boolean; hsts: boolean };
  rateLimiting: { enabled: boolean; windowMs: number; max: number };
  bodySizeLimit: string;
  httpsRedirect: boolean;
  jwt: { algorithm: string; issuer: string; audience: string; expiration: string };
}

export interface EncryptionStatus {
  keys: EncryptionKey[];
  activeKeyCount: number;
  lastRotation: string | null;
  algorithms: string[];
}
