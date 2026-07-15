import { query, run } from '../../db';
import * as T from './auth.types';

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const now = (): string => new Date().toISOString();

export const AuthRepository = {
  // ═══════════════════════════════════════════════════════════════
  // SESSIONS
  // ═══════════════════════════════════════════════════════════════

  async createSession(dto: {
    userId: string;
    tenantId: string;
    refreshToken: string;
    deviceInfo: T.DeviceInfo | null;
    expiresAt: string;
  }): Promise<T.Session> {
    const id = uid('sess');
    const deviceJson = dto.deviceInfo ? JSON.stringify(dto.deviceInfo) : null;
    await run(
      `INSERT INTO sessions (id, user_id, tenant_id, refresh_token, device_info, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.userId,
        dto.tenantId,
        dto.refreshToken,
        deviceJson,
        dto.expiresAt,
      ],
    );
    return this.findSessionById(id) as Promise<T.Session>;
  },

  async findSessionById(id: string): Promise<T.Session | null> {
    const rows = await query('SELECT * FROM sessions WHERE id = ?', [id]);
    return rows.length ? this.mapSession(rows[0]) : null;
  },

  async findSessionByRefreshToken(
    refreshToken: string,
  ): Promise<T.Session | null> {
    const rows = await query(
      'SELECT * FROM sessions WHERE refresh_token = ? AND revoked_at IS NULL',
      [refreshToken],
    );
    return rows.length ? this.mapSession(rows[0]) : null;
  },

  async findAllSessionsByUser(userId: string): Promise<T.Session[]> {
    const rows = await query(
      'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
      [userId],
    );
    return rows.map((r: any) => this.mapSession(r));
  },

  async revokeSession(id: string): Promise<void> {
    await run('UPDATE sessions SET revoked_at = ? WHERE id = ?', [now(), id]);
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await run(
      'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      [now(), userId],
    );
  },

  async cleanupExpiredSessions(): Promise<void> {
    await run(
      'DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)',
      [now(), now()],
    );
  },

  mapSession(row: any): T.Session {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      refreshToken: row.refresh_token,
      deviceInfo: row.device_info ? JSON.parse(row.device_info) : null,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at || null,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // API KEYS
  // ═══════════════════════════════════════════════════════════════

  async createApiKey(dto: {
    keyPrefix: string;
    hashedKey: string;
    name: string;
    tenantId: string;
    userId: string | null;
    scopes: string[];
    expiresAt: string | null;
  }): Promise<T.ApiKey> {
    const id = uid('apik');
    await run(
      `INSERT INTO api_keys (id, key_prefix, hashed_key, name, tenant_id, user_id, scopes, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.keyPrefix,
        dto.hashedKey,
        dto.name,
        dto.tenantId,
        dto.userId,
        JSON.stringify(dto.scopes),
        dto.expiresAt,
      ],
    );
    return this.findApiKeyById(id) as Promise<T.ApiKey>;
  },

  async findApiKeyById(id: string): Promise<T.ApiKey | null> {
    const rows = await query('SELECT * FROM api_keys WHERE id = ?', [id]);
    return rows.length ? this.mapApiKey(rows[0]) : null;
  },

  async findApiKeyByPrefix(keyPrefix: string): Promise<T.ApiKey | null> {
    const rows = await query(
      'SELECT * FROM api_keys WHERE key_prefix = ? AND revoked_at IS NULL',
      [keyPrefix],
    );
    return rows.length ? this.mapApiKey(rows[0]) : null;
  },

  async findAllApiKeysByTenant(tenantId: string): Promise<T.ApiKey[]> {
    const rows = await query(
      'SELECT * FROM api_keys WHERE tenant_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapApiKey(r));
  },

  async revokeApiKey(id: string): Promise<void> {
    await run('UPDATE api_keys SET revoked_at = ? WHERE id = ?', [now(), id]);
  },

  mapApiKey(row: any): T.ApiKey {
    return {
      id: row.id,
      keyPrefix: row.key_prefix,
      hashedKey: row.hashed_key,
      name: row.name,
      tenantId: row.tenant_id,
      userId: row.user_id || null,
      scopes: JSON.parse(row.scopes || '[]'),
      expiresAt: row.expires_at || null,
      createdAt: row.created_at,
      revokedAt: row.revoked_at || null,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVICE ACCOUNTS
  // ═══════════════════════════════════════════════════════════════

  async createServiceAccount(dto: {
    name: string;
    tenantId: string;
    roles: string[];
    token: string;
  }): Promise<T.ServiceAccount> {
    const id = uid('svca');
    await run(
      `INSERT INTO service_accounts (id, name, tenant_id, roles, token)
       VALUES (?, ?, ?, ?, ?)`,
      [id, dto.name, dto.tenantId, JSON.stringify(dto.roles), dto.token],
    );
    return this.findServiceAccountById(id) as Promise<T.ServiceAccount>;
  },

  async findServiceAccountById(id: string): Promise<T.ServiceAccount | null> {
    const rows = await query('SELECT * FROM service_accounts WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapServiceAccount(rows[0]) : null;
  },

  async findServiceAccountByToken(
    token: string,
  ): Promise<T.ServiceAccount | null> {
    const rows = await query(
      'SELECT * FROM service_accounts WHERE token = ? AND revoked_at IS NULL',
      [token],
    );
    return rows.length ? this.mapServiceAccount(rows[0]) : null;
  },

  async findAllServiceAccountsByTenant(
    tenantId: string,
  ): Promise<T.ServiceAccount[]> {
    const rows = await query(
      'SELECT * FROM service_accounts WHERE tenant_id = ? AND revoked_at IS NULL ORDER BY created_at DESC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapServiceAccount(r));
  },

  async revokeServiceAccount(id: string): Promise<void> {
    await run('UPDATE service_accounts SET revoked_at = ? WHERE id = ?', [
      now(),
      id,
    ]);
  },

  mapServiceAccount(row: any): T.ServiceAccount {
    return {
      id: row.id,
      name: row.name,
      tenantId: row.tenant_id,
      roles: JSON.parse(row.roles || '[]'),
      token: row.token,
      createdAt: row.created_at,
      revokedAt: row.revoked_at || null,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // MFA REGISTRATIONS
  // ═══════════════════════════════════════════════════════════════

  async createMfaRegistration(dto: {
    userId: string;
    tenantId: string;
    method: T.MfaMethod;
    secret: string;
  }): Promise<T.MfaRegistration> {
    const id = uid('mfa');
    await run(
      `INSERT INTO mfa_registrations (id, user_id, tenant_id, method, secret)
       VALUES (?, ?, ?, ?, ?)`,
      [id, dto.userId, dto.tenantId, dto.method, dto.secret],
    );
    return this.findMfaRegistrationById(id) as Promise<T.MfaRegistration>;
  },

  async findMfaRegistrationById(id: string): Promise<T.MfaRegistration | null> {
    const rows = await query('SELECT * FROM mfa_registrations WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapMfaRegistration(rows[0]) : null;
  },

  async findMfaRegistrationsByUser(
    userId: string,
  ): Promise<T.MfaRegistration[]> {
    const rows = await query(
      'SELECT * FROM mfa_registrations WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map((r: any) => this.mapMfaRegistration(r));
  },

  async findVerifiedMfaByUserAndMethod(
    userId: string,
    method: T.MfaMethod,
  ): Promise<T.MfaRegistration | null> {
    const rows = await query(
      'SELECT * FROM mfa_registrations WHERE user_id = ? AND method = ? AND verified = 1',
      [userId, method],
    );
    return rows.length ? this.mapMfaRegistration(rows[0]) : null;
  },

  async verifyMfaRegistration(id: string): Promise<void> {
    await run('UPDATE mfa_registrations SET verified = 1 WHERE id = ?', [id]);
  },

  async deleteMfaRegistration(id: string): Promise<void> {
    await run('DELETE FROM mfa_registrations WHERE id = ?', [id]);
  },

  mapMfaRegistration(row: any): T.MfaRegistration {
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      method: row.method,
      secret: row.secret,
      verified: !!row.verified,
      createdAt: row.created_at,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // OAUTH CLIENTS
  // ═══════════════════════════════════════════════════════════════

  async createOAuthClient(dto: {
    clientId: string;
    clientSecret: string;
    redirectUris: string[];
    allowedGrants: T.GrantType[];
    name: string;
    tenantId: string;
  }): Promise<T.OAuthClient> {
    const id = uid('oac');
    await run(
      `INSERT INTO oauth_clients (id, client_id, client_secret, redirect_uris, allowed_grants, name, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.clientId,
        dto.clientSecret,
        JSON.stringify(dto.redirectUris),
        JSON.stringify(dto.allowedGrants),
        dto.name,
        dto.tenantId,
      ],
    );
    return this.findOAuthClientById(id) as Promise<T.OAuthClient>;
  },

  async findOAuthClientById(id: string): Promise<T.OAuthClient | null> {
    const rows = await query('SELECT * FROM oauth_clients WHERE id = ?', [id]);
    return rows.length ? this.mapOAuthClient(rows[0]) : null;
  },

  async findOAuthClientByClientId(
    clientId: string,
  ): Promise<T.OAuthClient | null> {
    const rows = await query(
      'SELECT * FROM oauth_clients WHERE client_id = ? AND is_active = 1',
      [clientId],
    );
    return rows.length ? this.mapOAuthClient(rows[0]) : null;
  },

  async findAllOAuthClientsByTenant(
    tenantId: string,
  ): Promise<T.OAuthClient[]> {
    const rows = await query(
      'SELECT * FROM oauth_clients WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapOAuthClient(r));
  },

  async deactivateOAuthClient(id: string): Promise<void> {
    await run('UPDATE oauth_clients SET is_active = 0 WHERE id = ?', [id]);
  },

  mapOAuthClient(row: any): T.OAuthClient {
    return {
      id: row.id,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      redirectUris: JSON.parse(row.redirect_uris || '[]'),
      allowedGrants: JSON.parse(row.allowed_grants || '[]'),
      name: row.name,
      tenantId: row.tenant_id,
      isActive: !!row.is_active,
      createdAt: row.created_at,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY PROVIDERS
  // ═══════════════════════════════════════════════════════════════

  async createIdentityProvider(dto: {
    provider: T.AuthProvider;
    clientId: string;
    clientSecretEncrypted: string;
    issuer: string;
    tenantId: string;
    metadata: Record<string, any>;
  }): Promise<T.IdentityProvider> {
    const id = uid('idp');
    await run(
      `INSERT INTO identity_providers (id, provider, client_id, client_secret_encrypted, issuer, tenant_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.provider,
        dto.clientId,
        dto.clientSecretEncrypted,
        dto.issuer,
        dto.tenantId,
        JSON.stringify(dto.metadata),
      ],
    );
    return this.findByIdentityProviderById(id) as Promise<T.IdentityProvider>;
  },

  async findByIdentityProviderById(
    id: string,
  ): Promise<T.IdentityProvider | null> {
    const rows = await query('SELECT * FROM identity_providers WHERE id = ?', [
      id,
    ]);
    return rows.length ? this.mapIdentityProvider(rows[0]) : null;
  },

  async findActiveProvidersByTenant(
    tenantId: string,
  ): Promise<T.IdentityProvider[]> {
    const rows = await query(
      'SELECT * FROM identity_providers WHERE tenant_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [tenantId],
    );
    return rows.map((r: any) => this.mapIdentityProvider(r));
  },

  async deactivateIdentityProvider(id: string): Promise<void> {
    await run('UPDATE identity_providers SET is_active = 0 WHERE id = ?', [id]);
  },

  mapIdentityProvider(row: any): T.IdentityProvider {
    return {
      id: row.id,
      provider: row.provider,
      clientId: row.client_id,
      clientSecretEncrypted: row.client_secret_encrypted,
      issuer: row.issuer,
      tenantId: row.tenant_id,
      metadata: JSON.parse(row.metadata || '{}'),
      isActive: !!row.is_active,
      createdAt: row.created_at,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // SCHEMA MIGRATIONS (idempotent table creation)
  // ═══════════════════════════════════════════════════════════════

  async ensureIdentityTables(): Promise<void> {
    const migrations: string[] = [
      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        refresh_token VARCHAR(200) NOT NULL,
        device_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(50) PRIMARY KEY,
        key_prefix VARCHAR(10) NOT NULL,
        hashed_key VARCHAR(200) NOT NULL,
        name VARCHAR(100) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        user_id VARCHAR(50),
        scopes TEXT DEFAULT '[]',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS service_accounts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        roles TEXT DEFAULT '[]',
        token VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS mfa_registrations (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        method VARCHAR(10) NOT NULL CHECK(method IN ('totp', 'sms', 'email')),
        secret VARCHAR(200) NOT NULL,
        verified BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS oauth_clients (
        id VARCHAR(50) PRIMARY KEY,
        client_id VARCHAR(100) NOT NULL UNIQUE,
        client_secret VARCHAR(200) NOT NULL,
        redirect_uris TEXT DEFAULT '[]',
        allowed_grants TEXT DEFAULT '[]',
        name VARCHAR(100) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS identity_providers (
        id VARCHAR(50) PRIMARY KEY,
        provider VARCHAR(10) NOT NULL CHECK(provider IN ('pin', 'oauth2', 'oidc', 'saml')),
        client_id VARCHAR(200) NOT NULL,
        client_secret_encrypted VARCHAR(500) NOT NULL,
        issuer VARCHAR(200) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        metadata TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];
    for (const sql of migrations) {
      try {
        await run(sql);
      } catch {
        /* table already exists — swallow */
      }
    }
  },
};
