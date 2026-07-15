import crypto from 'crypto';
import { query, run } from '../../db';
import { PLANS } from './subscription.service';

// ── License Key Format ─────────────────────────────────────────────────────
// Format: DBMS-{PLAN_CODE}-{TENANT_HASH}-{EXPIRY_EPOCH_B36}-{CHECKSUM}
// Example: DBMS-ENT-A3F7B2C1-LZXYZ123-4A9B
//
// The checksum is a 4-char HMAC-SHA256 prefix over the first 4 segments,
// keyed with LICENSE_SIGNING_KEY environment variable.

const SIGNING_KEY = process.env.LICENSE_SIGNING_KEY || 'deepabms-default-license-key-v2';
const PLAN_CODES: Record<string, string> = {
  starter: 'STR',
  professional: 'PRO',
  enterprise: 'ENT',
  custom: 'CST',
};
const CODE_TO_PLAN: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_CODES).map(([k, v]) => [v, k]),
);

// ── License Feature Control ───────────────────────────────────────────────

export interface LicenseFeature {
  feature: string;
  enabled: boolean;
  limits?: Record<string, number>;
}

// ── Offline License Validation ────────────────────────────────────────────

export interface OfflineLicense {
  tenantId: string;
  licenseKey: string;
  plan: string;
  issuedAt: string;
  expiresAt: string;
  features: LicenseFeature[];
  signature: string;
}

// ── License DB Schema ─────────────────────────────────────────────────────
// The licenses table is created lazily on first use via initLicenseTable().

async function initLicenseTable(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id          VARCHAR(50)  PRIMARY KEY,
      tenant_id   VARCHAR(50)  NOT NULL,
      license_key VARCHAR(200) NOT NULL UNIQUE,
      plan        VARCHAR(20)  NOT NULL,
      status      VARCHAR(20)  NOT NULL DEFAULT 'active',
      issued_at   TIMESTAMP    NOT NULL,
      expires_at  TIMESTAMP    NOT NULL,
      issued_by   VARCHAR(100),
      revoked_at  TIMESTAMP,
      revoked_by  VARCHAR(100),
      extended_at TIMESTAMP,
      extended_by VARCHAR(100),
      features    TEXT,
      notes       TEXT
    )
  `);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildChecksum(segments: string[]): string {
  const payload = segments.join('-');
  const hmac = crypto.createHmac('sha256', SIGNING_KEY);
  hmac.update(payload);
  return hmac.digest('hex').slice(0, 4).toUpperCase();
}

function tenantHash(tenantId: string): string {
  return crypto.createHash('sha256').update(tenantId).digest('hex').slice(0, 8).toUpperCase();
}

// ── Public API ────────────────────────────────────────────────────────────

export interface LicenseRecord {
  id: string;
  tenantId: string;
  licenseKey: string;
  plan: string;
  status: 'active' | 'expired' | 'revoked';
  issuedAt: string;
  expiresAt: string;
  issuedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  extendedAt: string | null;
  extendedBy: string | null;
  features: LicenseFeature[] | null;
  notes: string | null;
}

export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
  code?: string;
  license?: LicenseRecord;
  entitlements?: typeof PLANS[string];
}

export const LicenseService = {
  /** Generate a new signed license key for a tenant + plan */
  generateKey(tenantId: string, plan: string, expiresAt: Date): string {
    const planCode = PLAN_CODES[plan.toLowerCase()];
    if (!planCode) throw new Error(`Unknown plan: ${plan}`);

    const hash = tenantHash(tenantId);
    const expiryB36 = expiresAt.getTime().toString(36).toUpperCase();

    const segments = ['DBMS', planCode, hash, expiryB36];
    const checksum = buildChecksum(segments);

    return [...segments, checksum].join('-');
  },

  /** Verify the structural integrity of a license key without a DB lookup */
  verifyKeySignature(key: string): { valid: boolean; reason?: string; code?: string; plan?: string; tenantHash?: string; expiresAt?: Date } {
    const parts = key.split('-');
    if (parts.length !== 5) {
      return { valid: false, reason: 'Malformed license key: expected 5 segments', code: 'MALFORMED' };
    }

    const [prefix, planCode, hash, expiryB36, providedChecksum] = parts;

    if (prefix !== 'DBMS') {
      return { valid: false, reason: 'Invalid license prefix', code: 'BAD_PREFIX' };
    }

    const plan = CODE_TO_PLAN[planCode];
    if (!plan) {
      return { valid: false, reason: `Unknown plan code: ${planCode}`, code: 'UNKNOWN_PLAN' };
    }

    const expectedChecksum = buildChecksum([prefix, planCode, hash, expiryB36]);
    if (expectedChecksum !== providedChecksum) {
      return { valid: false, reason: 'License checksum mismatch — key may have been tampered with', code: 'CHECKSUM_MISMATCH' };
    }

    const expiryMs = parseInt(expiryB36, 36);
    if (isNaN(expiryMs)) {
      return { valid: false, reason: 'Invalid expiry encoding in license key', code: 'BAD_EXPIRY' };
    }

    const expiresAt = new Date(expiryMs);
    if (expiresAt < new Date()) {
      return { valid: false, reason: `License expired at ${expiresAt.toISOString()}`, code: 'EXPIRED' };
    }

    return { valid: true, plan, tenantHash: hash, expiresAt };
  },

  /** Issue and persist a new license for a tenant */
  async issueLicense(
    tenantId: string,
    plan: string,
    validDays: number,
    issuedBy?: string,
    notes?: string,
    features?: LicenseFeature[],
  ): Promise<LicenseRecord> {
    await initLicenseTable();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const licenseKey = this.generateKey(tenantId, plan, expiresAt);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await run(
      `INSERT INTO licenses
         (id, tenant_id, license_key, plan, status, issued_at, expires_at, issued_by, features, notes)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [id, tenantId, licenseKey, plan, now, expiresAt.toISOString(), issuedBy ?? null, features ? JSON.stringify(features) : null, notes ?? null],
    );

    return {
      id,
      tenantId,
      licenseKey,
      plan,
      status: 'active',
      issuedAt: now,
      expiresAt: expiresAt.toISOString(),
      issuedBy: issuedBy ?? null,
      revokedAt: null,
      revokedBy: null,
      extendedAt: null,
      extendedBy: null,
      features: features ?? null,
      notes: notes ?? null,
    };
  },

  /** Full validation: signature check + DB record + expiry + revocation status */
  async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
    // 1. Structural / cryptographic check
    const sigCheck = this.verifyKeySignature(licenseKey);
    if (!sigCheck.valid) {
      return { valid: false, reason: sigCheck.reason, code: sigCheck.code };
    }

    // 2. Persist-layer check
    await initLicenseTable();
    const rows = await query('SELECT * FROM licenses WHERE license_key = ?', [licenseKey]);
    if (rows.length === 0) {
      return { valid: false, reason: 'License not found in registry — may be unregistered or revoked', code: 'NOT_FOUND' };
    }

    const row = rows[0];
    if (row.status === 'revoked') {
      return { valid: false, reason: `License was revoked at ${row.revoked_at} by ${row.revoked_by}`, code: 'REVOKED' };
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) {
      await run("UPDATE licenses SET status = 'expired' WHERE license_key = ?", [licenseKey]);
      return { valid: false, reason: `License expired on ${expiresAt.toISOString()}`, code: 'EXPIRED' };
    }

    const license: LicenseRecord = {
      id: row.id,
      tenantId: row.tenant_id,
      licenseKey: row.license_key,
      plan: row.plan,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      issuedBy: row.issued_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      extendedAt: row.extended_at || null,
      extendedBy: row.extended_by || null,
      features: row.features ? JSON.parse(row.features) : null,
      notes: row.notes,
    };

    return {
      valid: true,
      license,
      entitlements: PLANS[row.plan] ?? PLANS.starter,
    };
  },

  /** Revoke a license by key */
  async revokeLicense(licenseKey: string, revokedBy: string): Promise<void> {
    await initLicenseTable();
    const now = new Date().toISOString();
    await run(
      "UPDATE licenses SET status = 'revoked', revoked_at = ?, revoked_by = ? WHERE license_key = ?",
      [now, revokedBy, licenseKey],
    );
  },

  /** Retrieve all licenses for a tenant */
  async getLicensesByTenant(tenantId: string): Promise<LicenseRecord[]> {
    await initLicenseTable();
    const rows = await query('SELECT * FROM licenses WHERE tenant_id = ? ORDER BY issued_at DESC', [tenantId]);
    return rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      licenseKey: row.license_key,
      plan: row.plan,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      issuedBy: row.issued_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      extendedAt: row.extended_at || null,
      extendedBy: row.extended_by || null,
      features: row.features ? JSON.parse(row.features) : null,
      notes: row.notes,
    }));
  },

  // ── Offline License Validation ─────────────────────────────────────

  generateOfflineLicense(tenantId: string, plan: string, validDays: number, features?: LicenseFeature[]): OfflineLicense {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const licenseKey = this.generateKey(tenantId, plan, expiresAt);
    const issuedAt = new Date().toISOString();

    const payload = `${tenantId}:${licenseKey}:${plan}:${issuedAt}:${expiresAt.toISOString()}`;
    const signature = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');

    return {
      tenantId,
      licenseKey,
      plan,
      issuedAt,
      expiresAt: expiresAt.toISOString(),
      features: features || [],
      signature,
    };
  },

  validateOfflineLicense(licenseKey: string, tenantId: string): { valid: boolean; reason?: string; code?: string; offline?: OfflineLicense } {
    const sigCheck = this.verifyKeySignature(licenseKey);
    if (!sigCheck.valid) {
      return { valid: false, reason: sigCheck.reason, code: sigCheck.code };
    }

    const expectedHash = tenantHash(tenantId);
    if (sigCheck.tenantHash !== expectedHash) {
      return { valid: false, reason: 'License key does not match the provided tenant', code: 'TENANT_MISMATCH' };
    }

    if (!sigCheck.expiresAt) {
      return { valid: false, reason: 'Could not determine expiry from license key', code: 'NO_EXPIRY' };
    }

    return {
      valid: true,
      offline: {
        tenantId,
        licenseKey,
        plan: sigCheck.plan || '',
        issuedAt: '',
        expiresAt: sigCheck.expiresAt.toISOString(),
        features: [],
        signature: '',
      },
    };
  },

  // ── License Usage Tracking ─────────────────────────────────────────

  async getLicenseUsage(licenseKey: string): Promise<{
    licenseKey: string;
    totalValidations: number;
    lastValidatedAt: string | null;
    devices: string[];
  }> {
    await run(`
      CREATE TABLE IF NOT EXISTS license_usage (
        license_key   VARCHAR(200) NOT NULL,
        validated_at  TIMESTAMP    NOT NULL,
        device_id     VARCHAR(200),
        ip_address    VARCHAR(50)
      )
    `);
    const rows = await query(
      'SELECT * FROM license_usage WHERE license_key = ? ORDER BY validated_at DESC',
      [licenseKey],
    );
    return {
      licenseKey,
      totalValidations: rows.length,
      lastValidatedAt: rows.length > 0 ? rows[0].validated_at : null,
      devices: [...new Set(rows.map((r: any) => r.device_id).filter(Boolean))],
    };
  },

  async recordLicenseValidation(licenseKey: string, deviceId?: string, ipAddress?: string): Promise<void> {
    await run(`
      CREATE TABLE IF NOT EXISTS license_usage (
        license_key   VARCHAR(200) NOT NULL,
        validated_at  TIMESTAMP    NOT NULL,
        device_id     VARCHAR(200),
        ip_address    VARCHAR(50)
      )
    `);
    await run(
      'INSERT INTO license_usage (license_key, validated_at, device_id, ip_address) VALUES (?, ?, ?, ?)',
      [licenseKey, new Date().toISOString(), deviceId || null, ipAddress || null],
    );
  },

  // ── License Extension ──────────────────────────────────────────────

  async extendLicense(licenseKey: string, days: number, extendedBy: string): Promise<LicenseRecord> {
    await initLicenseTable();
    const rows = await query('SELECT * FROM licenses WHERE license_key = ?', [licenseKey]);
    if (rows.length === 0) {
      throw new Error(`License ${licenseKey} not found`);
    }

    const row = rows[0];
    if (row.status === 'revoked') {
      throw new Error('Cannot extend a revoked license');
    }

    const currentExpiry = new Date(row.expires_at);
    const newExpiry = new Date(currentExpiry.getTime() + days * 86400000);
    const now = new Date().toISOString();

    if (row.status === 'expired') {
      await run(
        "UPDATE licenses SET status = 'active', expires_at = ?, extended_at = ?, extended_by = ? WHERE license_key = ?",
        [newExpiry.toISOString(), now, extendedBy, licenseKey],
      );
    } else {
      await run(
        'UPDATE licenses SET expires_at = ?, extended_at = ?, extended_by = ? WHERE license_key = ?',
        [newExpiry.toISOString(), now, extendedBy, licenseKey],
      );
    }

    const updated = await query('SELECT * FROM licenses WHERE license_key = ?', [licenseKey]);
    const u = updated[0];
    return {
      id: u.id,
      tenantId: u.tenant_id,
      licenseKey: u.license_key,
      plan: u.plan,
      status: u.status,
      issuedAt: u.issued_at,
      expiresAt: u.expires_at,
      issuedBy: u.issued_by,
      revokedAt: u.revoked_at,
      revokedBy: u.revoked_by,
      extendedAt: u.extended_at || null,
      extendedBy: u.extended_by || null,
      features: u.features ? JSON.parse(u.features) : null,
      notes: u.notes,
    };
  },

  // ── Expiring Licenses ──────────────────────────────────────────────

  async getExpiringLicenses(days: number): Promise<LicenseRecord[]> {
    await initLicenseTable();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    const rows = await query(
      "SELECT * FROM licenses WHERE status = 'active' AND expires_at <= ? ORDER BY expires_at ASC",
      [threshold.toISOString()],
    );
    return rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      licenseKey: row.license_key,
      plan: row.plan,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      issuedBy: row.issued_by,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      extendedAt: row.extended_at || null,
      extendedBy: row.extended_by || null,
      features: row.features ? JSON.parse(row.features) : null,
      notes: row.notes,
    }));
  },
};
