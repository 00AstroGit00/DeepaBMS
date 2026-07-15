import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, run } from '../../db';
import { signToken, verifyRefreshToken } from '../../middleware/auth';
import { AuthRepository } from './auth.repository';
import * as T from './auth.types';

const REFRESH_TOKEN_BYTES = 40;
const API_KEY_PREFIX_BYTES = 6;
const API_KEY_SECRET_BYTES = 32;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function generateRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function generateApiKeySecret(): { prefix: string; secret: string; fullKey: string } {
  const prefix = crypto.randomBytes(API_KEY_PREFIX_BYTES).toString('base64url');
  const secret = crypto.randomBytes(API_KEY_SECRET_BYTES).toString('base64url');
  return { prefix, secret, fullKey: `${prefix}.${secret}` };
}

const now = (): string => new Date().toISOString();

export const AuthService = {
  async loginWithPin(
    pin: string,
    deviceInfo?: T.DeviceInfo,
  ): Promise<{ token: string; refreshToken: string; user: any }> {
    const users = await query('SELECT * FROM users WHERE active = 1');
    let matchedUser: any = null;
    for (const u of users) {
      const valid = await bcrypt.compare(pin, u.pin_hash);
      if (valid) {
        matchedUser = u;
        break;
      }
    }
    if (!matchedUser) {
      throw new Error('Invalid lockscreen security PIN');
    }

    const tenantId =
      matchedUser.tenant_id ||
      process.env.SINGLE_TENANT_ID ||
      '00000000-0000-0000-0000-000000000000';

    const token = signToken({
      id: matchedUser.id,
      name: matchedUser.name,
      role: matchedUser.role,
      employeeId: matchedUser.employee_id || undefined,
      tenantId,
    });

    const session = await this.createSession(matchedUser.id, tenantId, deviceInfo || null);

    return {
      token,
      refreshToken: session.refreshToken,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        employeeId: matchedUser.employee_id || undefined,
      },
    };
  },

  async loginWithOAuth2(
    code: string,
    provider: string,
    redirectUri: string,
  ): Promise<{ token: string; refreshToken: string; user: any }> {
    const providers = await AuthRepository.findActiveProvidersByTenant(
      process.env.SINGLE_TENANT_ID || '00000000-0000-0000-0000-000000000000',
    );
    const idp = providers.find((p) => p.provider === provider);
    if (!idp) {
      throw new Error(`OAuth2 provider '${provider}' not configured`);
    }
    throw new Error(`OAuth2 login for '${provider}' not fully implemented — token exchange endpoint pending`);
  },

  async createSession(
    userId: string,
    tenantId: string,
    deviceInfo: T.DeviceInfo | null,
  ): Promise<T.Session> {
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    return AuthRepository.createSession({
      userId,
      tenantId,
      refreshToken,
      deviceInfo,
      expiresAt,
    });
  },

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      const session = await AuthRepository.findSessionByRefreshToken(refreshToken);
      if (!session) {
        throw new Error('Invalid refresh token');
      }
      if (session.revokedAt) {
        throw new Error('Session has been revoked');
      }
      if (new Date(session.expiresAt) < new Date()) {
        throw new Error('Refresh token expired');
      }

      const users = await query('SELECT * FROM users WHERE id = ?', [session.userId]);
      if (!users.length) {
        throw new Error('User not found');
      }
      const user = users[0];

      const accessToken = signToken({
        id: user.id,
        name: user.name,
        role: user.role,
        employeeId: user.employee_id || undefined,
        tenantId: session.tenantId,
      });

      await AuthRepository.revokeSession(session.id);
      const newSession = await this.createSession(user.id, session.tenantId, session.deviceInfo);

      return { accessToken, refreshToken: newSession.refreshToken };
    }

    const users = await query('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (!users.length) {
      throw new Error('User not found');
    }
    const user = users[0];

    const accessToken = signToken({
      id: user.id,
      name: user.name,
      role: user.role,
      employeeId: user.employee_id || undefined,
      tenantId: payload.tenantId,
    });

    await AuthRepository.revokeSession(payload.sessionId);
    const newSession = await this.createSession(user.id, payload.tenantId, null);

    return { accessToken, refreshToken: newSession.refreshToken };
  },

  async revokeSession(sessionId: string): Promise<void> {
    await AuthRepository.revokeSession(sessionId);
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await AuthRepository.revokeAllUserSessions(userId);
  },

  async validateApiKey(apiKey: string): Promise<T.ApiKey> {
    const parts = apiKey.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid API key format');
    }
    const [prefix] = parts;
    const stored = await AuthRepository.findApiKeyByPrefix(prefix);
    if (!stored) {
      throw new Error('API key not found');
    }
    if (stored.revokedAt) {
      throw new Error('API key has been revoked');
    }
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
      throw new Error('API key has expired');
    }
    const valid = await bcrypt.compare(apiKey, stored.hashedKey);
    if (!valid) {
      throw new Error('Invalid API key');
    }
    return stored;
  },

  async generateApiKey(
    name: string,
    userId: string | null,
    tenantId: string,
    scopes: string[],
    expiresAt: string | null,
  ): Promise<{ apiKey: T.ApiKey; fullKey: string }> {
    const { prefix, secret, fullKey } = generateApiKeySecret();
    const hashedKey = await bcrypt.hash(fullKey, 10);
    const apiKey = await AuthRepository.createApiKey({
      keyPrefix: prefix,
      hashedKey,
      name,
      tenantId,
      userId,
      scopes,
      expiresAt,
    });
    return { apiKey, fullKey };
  },

  async registerMfaMethod(
    userId: string,
    tenantId: string,
    method: T.MfaMethod,
  ): Promise<T.MfaRegistration> {
    const secret = crypto.randomBytes(20).toString('hex');
    return AuthRepository.createMfaRegistration({ userId, tenantId, method, secret });
  },

  async verifyMfaCode(userId: string, code: string, method: T.MfaMethod): Promise<boolean> {
    const registration = await AuthRepository.findVerifiedMfaByUserAndMethod(userId, method);
    if (!registration) {
      throw new Error(`No verified ${method} registration found`);
    }
    const expected = registration.secret;
    const isValid = code === expected;
    if (!isValid) {
      throw new Error('Invalid MFA code');
    }
    return true;
  },

  async createServiceAccount(
    name: string,
    tenantId: string,
    roles: string[],
  ): Promise<{ serviceAccount: T.ServiceAccount; token: string }> {
    const token = `svc-${crypto.randomBytes(24).toString('base64url')}`;
    const serviceAccount = await AuthRepository.createServiceAccount({
      name,
      tenantId,
      roles,
      token,
    });
    return { serviceAccount, token };
  },

  async getActiveSessions(userId: string): Promise<T.Session[]> {
    return AuthRepository.findAllSessionsByUser(userId);
  },

  async getApiKeys(tenantId: string): Promise<T.ApiKey[]> {
    return AuthRepository.findAllApiKeysByTenant(tenantId);
  },

  async getServiceAccounts(tenantId: string): Promise<T.ServiceAccount[]> {
    return AuthRepository.findAllServiceAccountsByTenant(tenantId);
  },

  async revokeApiKey(id: string): Promise<void> {
    await AuthRepository.revokeApiKey(id);
  },

  async revokeServiceAccount(id: string): Promise<void> {
    await AuthRepository.revokeServiceAccount(id);
  },
};
