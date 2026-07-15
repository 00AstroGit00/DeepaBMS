import { query, run } from '../db';
import * as T from './security.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const SecurityRepository = {
  async ensureSecurityTables(): Promise<void> {
    const migrations: string[] = [
      `CREATE TABLE IF NOT EXISTS security_audit_events (
        id VARCHAR(50) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(10) NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
        actor_id VARCHAR(50) NOT NULL,
        actor_name VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(500),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS secret_rotation_log (
        id VARCHAR(50) PRIMARY KEY,
        secret_name VARCHAR(100) NOT NULL,
        rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rotated_by VARCHAR(100) NOT NULL,
        previous_hash VARCHAR(200) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'success' CHECK(status IN ('success','failed'))
      )`,
      `CREATE TABLE IF NOT EXISTS encryption_keys (
        id VARCHAR(50) PRIMARY KEY,
        algorithm VARCHAR(30) NOT NULL,
        key_ref VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        rotated_at TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS penetration_test_results (
        id VARCHAR(50) PRIMARY KEY,
        test_name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        severity VARCHAR(10) NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
        finding TEXT NOT NULL,
        remediation TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','accepted_risk','false_positive'))
      )`,
      `CREATE TABLE IF NOT EXISTS security_findings (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(10) NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
        component VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        remediation TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','accepted_risk','false_positive')),
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_isolation_tests (
        id VARCHAR(50) PRIMARY KEY,
        test_name VARCHAR(200) NOT NULL,
        result VARCHAR(10) NOT NULL CHECK(result IN ('pass','fail','warning','error','skipped')),
        details TEXT,
        tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];
    for (const sql of migrations) {
      try {
        await run(sql);
      } catch {
        /* table may already exist */
      }
    }
  },

  // ── Security Audit Events ──────────────────────────────────────

  async createAuditEvent(dto: Omit<T.SecurityAuditEvent, 'id' | 'timestamp'>): Promise<T.SecurityAuditEvent> {
    const id = uid('sae');
    await run(
      `INSERT INTO security_audit_events (id, event_type, severity, actor_id, actor_name, resource, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, dto.eventType, dto.severity, dto.actorId, dto.actorName, dto.resource, dto.resourceId, dto.details, dto.ipAddress, dto.userAgent],
    );
    return this.findAuditEventById(id) as Promise<T.SecurityAuditEvent>;
  },

  async findAuditEventById(id: string): Promise<T.SecurityAuditEvent | null> {
    const rows = await query('SELECT * FROM security_audit_events WHERE id = ?', [id]);
    return rows.length ? this.mapAuditEvent(rows[0]) : null;
  },

  async findAllAuditEvents(limit = 100, offset = 0): Promise<T.SecurityAuditEvent[]> {
    const rows = await query(
      'SELECT * FROM security_audit_events ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return rows.map((r: any) => this.mapAuditEvent(r));
  },

  async findAuditEventsBySeverity(severity: string, limit = 50): Promise<T.SecurityAuditEvent[]> {
    const rows = await query(
      'SELECT * FROM security_audit_events WHERE severity = ? ORDER BY timestamp DESC LIMIT ?',
      [severity, limit],
    );
    return rows.map((r: any) => this.mapAuditEvent(r));
  },

  async findAuditEventsByActor(actorId: string, limit = 50): Promise<T.SecurityAuditEvent[]> {
    const rows = await query(
      'SELECT * FROM security_audit_events WHERE actor_id = ? ORDER BY timestamp DESC LIMIT ?',
      [actorId, limit],
    );
    return rows.map((r: any) => this.mapAuditEvent(r));
  },

  mapAuditEvent(row: any): T.SecurityAuditEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      actorId: row.actor_id,
      actorName: row.actor_name,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details || '',
      ipAddress: row.ip_address || '',
      userAgent: row.user_agent || '',
      timestamp: row.timestamp,
    };
  },

  // ── Secret Rotation ───────────────────────────────────────────

  async logSecretRotation(dto: {
    secretName: string;
    rotatedBy: string;
    previousHash: string;
    status: 'success' | 'failed';
  }): Promise<T.SecretRotationRecord> {
    const id = uid('secr');
    await run(
      `INSERT INTO secret_rotation_log (id, secret_name, rotated_by, previous_hash, status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, dto.secretName, dto.rotatedBy, dto.previousHash, dto.status],
    );
    return this.findSecretRotationById(id) as Promise<T.SecretRotationRecord>;
  },

  async findSecretRotationById(id: string): Promise<T.SecretRotationRecord | null> {
    const rows = await query('SELECT * FROM secret_rotation_log WHERE id = ?', [id]);
    return rows.length ? this.mapSecretRotation(rows[0]) : null;
  },

  async findAllSecretRotations(limit = 50): Promise<T.SecretRotationRecord[]> {
    const rows = await query(
      'SELECT * FROM secret_rotation_log ORDER BY rotated_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((r: any) => this.mapSecretRotation(r));
  },

  async findRotationBySecretName(secretName: string): Promise<T.SecretRotationRecord[]> {
    const rows = await query(
      'SELECT * FROM secret_rotation_log WHERE secret_name = ? ORDER BY rotated_at DESC',
      [secretName],
    );
    return rows.map((r: any) => this.mapSecretRotation(r));
  },

  mapSecretRotation(row: any): T.SecretRotationRecord {
    return {
      id: row.id,
      secretName: row.secret_name,
      rotatedAt: row.rotated_at,
      rotatedBy: row.rotated_by,
      previousHash: row.previous_hash,
      status: row.status,
    };
  },

  // ── Encryption Keys ────────────────────────────────────────────

  async registerEncryptionKey(dto: {
    algorithm: string;
    keyRef: string;
    active: boolean;
  }): Promise<T.EncryptionKey> {
    const id = uid('enk');
    await run(
      `INSERT INTO encryption_keys (id, algorithm, key_ref, active)
       VALUES (?, ?, ?, ?)`,
      [id, dto.algorithm, dto.keyRef, dto.active ? 1 : 0],
    );
    return this.findEncryptionKeyById(id) as Promise<T.EncryptionKey>;
  },

  async findEncryptionKeyById(id: string): Promise<T.EncryptionKey | null> {
    const rows = await query('SELECT * FROM encryption_keys WHERE id = ?', [id]);
    return rows.length ? this.mapEncryptionKey(rows[0]) : null;
  },

  async findAllEncryptionKeys(): Promise<T.EncryptionKey[]> {
    const rows = await query('SELECT * FROM encryption_keys ORDER BY created_at DESC');
    return rows.map((r: any) => this.mapEncryptionKey(r));
  },

  async findActiveEncryptionKeys(): Promise<T.EncryptionKey[]> {
    const rows = await query('SELECT * FROM encryption_keys WHERE active = 1 ORDER BY created_at DESC');
    return rows.map((r: any) => this.mapEncryptionKey(r));
  },

  async deactivateEncryptionKey(id: string): Promise<void> {
    await run('UPDATE encryption_keys SET active = 0, rotated_at = ? WHERE id = ?', [now(), id]);
  },

  async activateEncryptionKey(id: string): Promise<void> {
    await run('UPDATE encryption_keys SET active = 1 WHERE id = ?', [id]);
  },

  mapEncryptionKey(row: any): T.EncryptionKey {
    return {
      id: row.id,
      algorithm: row.algorithm,
      keyRef: row.key_ref,
      active: !!row.active,
      createdAt: row.created_at,
      rotatedAt: row.rotated_at || null,
    };
  },

  // ── Penetration Tests ─────────────────────────────────────────

  async createPenetrationTestResult(dto: Omit<T.PenetrationTestResult, 'id'>): Promise<T.PenetrationTestResult> {
    const id = uid('pent');
    await run(
      `INSERT INTO penetration_test_results (id, test_name, category, severity, finding, remediation, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, dto.testName, dto.category, dto.severity, dto.finding, dto.remediation, dto.status],
    );
    return this.findPenetrationTestById(id) as Promise<T.PenetrationTestResult>;
  },

  async findPenetrationTestById(id: string): Promise<T.PenetrationTestResult | null> {
    const rows = await query('SELECT * FROM penetration_test_results WHERE id = ?', [id]);
    return rows.length ? this.mapPenetrationTest(rows[0]) : null;
  },

  async findAllPenetrationTests(limit = 50): Promise<T.PenetrationTestResult[]> {
    const rows = await query(
      'SELECT * FROM penetration_test_results ORDER BY id DESC LIMIT ?',
      [limit],
    );
    return rows.map((r: any) => this.mapPenetrationTest(r));
  },

  async findPenetrationTestsBySeverity(severity: string): Promise<T.PenetrationTestResult[]> {
    const rows = await query(
      'SELECT * FROM penetration_test_results WHERE severity = ? ORDER BY id DESC',
      [severity],
    );
    return rows.map((r: any) => this.mapPenetrationTest(r));
  },

  async findPenetrationTestsByCategory(category: string): Promise<T.PenetrationTestResult[]> {
    const rows = await query(
      'SELECT * FROM penetration_test_results WHERE category = ? ORDER BY id DESC',
      [category],
    );
    return rows.map((r: any) => this.mapPenetrationTest(r));
  },

  mapPenetrationTest(row: any): T.PenetrationTestResult {
    return {
      id: row.id,
      testName: row.test_name,
      category: row.category,
      severity: row.severity,
      finding: row.finding,
      remediation: row.remediation || '',
      status: row.status,
    };
  },

  // ── Security Findings ──────────────────────────────────────────

  async createSecurityFinding(dto: Omit<T.SecurityFinding, 'id' | 'discoveredAt' | 'resolvedAt'>): Promise<T.SecurityFinding> {
    const id = uid('sf');
    await run(
      `INSERT INTO security_findings (id, type, severity, component, description, remediation, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, dto.type, dto.severity, dto.component, dto.description, dto.remediation, dto.status],
    );
    return this.findSecurityFindingById(id) as Promise<T.SecurityFinding>;
  },

  async findSecurityFindingById(id: string): Promise<T.SecurityFinding | null> {
    const rows = await query('SELECT * FROM security_findings WHERE id = ?', [id]);
    return rows.length ? this.mapSecurityFinding(rows[0]) : null;
  },

  async findAllSecurityFindings(limit = 100, offset = 0): Promise<T.SecurityFinding[]> {
    const rows = await query(
      'SELECT * FROM security_findings ORDER BY discovered_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return rows.map((r: any) => this.mapSecurityFinding(r));
  },

  async findSecurityFindingsBySeverity(severity: string): Promise<T.SecurityFinding[]> {
    const rows = await query(
      'SELECT * FROM security_findings WHERE severity = ? ORDER BY discovered_at DESC',
      [severity],
    );
    return rows.map((r: any) => this.mapSecurityFinding(r));
  },

  async findOpenSecurityFindings(): Promise<T.SecurityFinding[]> {
    const rows = await query(
      "SELECT * FROM security_findings WHERE status IN ('open','in_progress') ORDER BY severity DESC, discovered_at DESC",
    );
    return rows.map((r: any) => this.mapSecurityFinding(r));
  },

  async updateSecurityFindingStatus(id: string, status: T.FindingStatus, resolvedAt?: string): Promise<void> {
    if (status === 'resolved' || resolvedAt) {
      await run('UPDATE security_findings SET status = ?, resolved_at = ? WHERE id = ?', [status, resolvedAt || now(), id]);
    } else {
      await run('UPDATE security_findings SET status = ? WHERE id = ?', [status, id]);
    }
  },

  mapSecurityFinding(row: any): T.SecurityFinding {
    return {
      id: row.id,
      type: row.type,
      severity: row.severity,
      component: row.component,
      description: row.description,
      remediation: row.remediation || '',
      status: row.status,
      discoveredAt: row.discovered_at,
      resolvedAt: row.resolved_at || null,
    };
  },

  // ── Tenant Isolation Tests ────────────────────────────────────

  async createIsolationTest(dto: Omit<T.TenantIsolationTest, 'id' | 'testedAt'>): Promise<T.TenantIsolationTest> {
    const id = uid('iso');
    await run(
      `INSERT INTO tenant_isolation_tests (id, test_name, result, details)
       VALUES (?, ?, ?, ?)`,
      [id, dto.testName, dto.result, dto.details],
    );
    return this.findIsolationTestById(id) as Promise<T.TenantIsolationTest>;
  },

  async findIsolationTestById(id: string): Promise<T.TenantIsolationTest | null> {
    const rows = await query('SELECT * FROM tenant_isolation_tests WHERE id = ?', [id]);
    return rows.length ? this.mapIsolationTest(rows[0]) : null;
  },

  async findAllIsolationTests(limit = 50): Promise<T.TenantIsolationTest[]> {
    const rows = await query(
      'SELECT * FROM tenant_isolation_tests ORDER BY tested_at DESC LIMIT ?',
      [limit],
    );
    return rows.map((r: any) => this.mapIsolationTest(r));
  },

  mapIsolationTest(row: any): T.TenantIsolationTest {
    return {
      id: row.id,
      testName: row.test_name,
      result: row.result,
      details: row.details || '',
      testedAt: row.tested_at,
    };
  },

  // ── Cleanup ───────────────────────────────────────────────────

  async cleanupOldEvents(retentionDays = 90): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    const result = await run('DELETE FROM security_audit_events WHERE timestamp < ?', [cutoff]);
    return result.changes;
  },
};
