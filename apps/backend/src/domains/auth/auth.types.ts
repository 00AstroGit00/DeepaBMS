export type AuthProvider = 'pin' | 'oauth2' | 'oidc' | 'saml';

export type MfaMethod = 'totp' | 'sms' | 'email';

export type GrantType = 'authorization_code' | 'client_credentials' | 'refresh_token' | 'implicit';

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  refreshToken: string;
  deviceInfo: DeviceInfo | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  hashedKey: string;
  name: string;
  tenantId: string;
  userId: string | null;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface ServiceAccount {
  id: string;
  name: string;
  tenantId: string;
  roles: string[];
  token: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface MfaRegistration {
  id: string;
  userId: string;
  tenantId: string;
  method: MfaMethod;
  secret: string;
  verified: boolean;
  createdAt: string;
}

export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  allowedGrants: GrantType[];
  name: string;
  tenantId: string;
  isActive: boolean;
  createdAt: string;
}

export interface IdentityProvider {
  id: string;
  provider: AuthProvider;
  clientId: string;
  clientSecretEncrypted: string;
  issuer: string;
  tenantId: string;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: string;
}

export interface LoginAttempt {
  success: boolean;
  userId?: string;
  method: AuthProvider;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
  failureReason?: string;
  timestamp: string;
}

export interface RefreshTokenPayload {
  jti: string;
  sessionId: string;
  userId: string;
  tenantId: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
