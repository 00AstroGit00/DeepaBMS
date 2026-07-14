import request from 'supertest';
import { signToken } from '../src/middleware/auth';

const BASE = 'http://localhost:3000';
const VALID_TOKEN = signToken({
  id: 'u-test',
  name: 'Test User',
  role: 'owner',
});
const AUDITOR_TOKEN = signToken({
  id: 'u-audit',
  name: 'Auditor',
  role: 'auditor',
});
const CASHIER_TOKEN = signToken({
  id: 'u-cash',
  name: 'Cashier',
  role: 'cashier',
});

// Helper: generate an expired token
function expiredToken(): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: 'u-expired', name: 'Expired', role: 'owner' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '0s', issuer: 'deepa-bms', audience: 'deepa-bms-api' },
  );
}

describe('Auth Middleware', () => {
  describe('Missing token', () => {
    it('returns 401 for /api/sales without Authorization header', async () => {
      const res = await request(BASE).get('/api/sales');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/authorization/i);
    });

    it('returns 401 for /api/sync without Authorization header', async () => {
      const res = await request(BASE).post('/api/sync').send({ state: {} });
      expect(res.status).toBe(401);
    });
  });

  describe('Malformed token', () => {
    it('returns 401 for non-Bearer scheme', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', `Basic ${VALID_TOKEN}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for empty token', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
    });

    it('returns 403 for garbage token', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', 'Bearer not-a-valid-jwt');
      expect(res.status).toBe(403);
    });
  });

  describe('Expired token', () => {
    it('returns 401 for expired token', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', `Bearer ${expiredToken()}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  describe('Invalid signature', () => {
    it('returns 403 for token signed with wrong secret', async () => {
      const jwt = require('jsonwebtoken');
      const fakeToken = jwt.sign(
        { id: 'u-fake', name: 'Fake', role: 'owner' },
        'wrong-secret',
        { expiresIn: '1h', issuer: 'deepa-bms', audience: 'deepa-bms-api' },
      );
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', `Bearer ${fakeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/signature/i);
    });
  });

  describe('Role authorization', () => {
    it('allows owner to access /api/sales', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', `Bearer ${VALID_TOKEN}`);
      // 200 or empty array is success
      expect([200, 304]).toContain(res.status);
    });

    it('denies cashier from accessing /api/employees', async () => {
      const res = await request(BASE)
        .get('/api/employees')
        .set('Authorization', `Bearer ${CASHIER_TOKEN}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('allows auditor read-only access to /api/sales', async () => {
      const res = await request(BASE)
        .get('/api/sales')
        .set('Authorization', `Bearer ${AUDITOR_TOKEN}`);
      expect([200, 304]).toContain(res.status);
    });

    it('denies auditor from POST /api/sales', async () => {
      const res = await request(BASE)
        .post('/api/sales')
        .set('Authorization', `Bearer ${AUDITOR_TOKEN}`)
        .send({ id: 'test', date: '2026-01-01' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });
  });

  describe('Public endpoints', () => {
    it('allows POST /api/auth/login without token', async () => {
      const res = await request(BASE)
        .post('/api/auth/login')
        .send({ pin: 'wrong' });
      // Should get 401 (wrong PIN) not 401 (missing token)
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/PIN/i);
    });
  });

  describe('Sync endpoint', () => {
    it('denies sync without token', async () => {
      const res = await request(BASE).post('/api/sync').send({ state: {} });
      expect(res.status).toBe(401);
    });

    it('allows sync with valid owner token', async () => {
      const res = await request(BASE)
        .post('/api/sync')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({ state: {} });
      // 200 or 400 (empty state) — but not 401/403
      expect([200, 400]).toContain(res.status);
    });
  });
});
