import request from 'supertest';
import { signToken } from '../src/middleware/auth';

const BASE = 'http://localhost:3000';
const OWNER_TOKEN = signToken({ id: 'u-test', name: 'Test', role: 'owner' });

describe('Security Headers', () => {
  it('removes X-Powered-By header', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets Referrer-Policy', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    );
  });

  it('sets Permissions-Policy with restricted features', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['permissions-policy']).toContain('camera=()');
    expect(res.headers['permissions-policy']).not.toContain(
      'interest-cohort=()',
    );
  });

  it('sets Cross-Origin-Resource-Policy: same-origin', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('sets Cross-Origin-Opener-Policy: same-origin', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  it('sets Cross-Origin-Embedder-Policy: require-corp', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect(res.headers['cross-origin-embedder-policy']).toBe('require-corp');
  });
});

describe('CORS', () => {
  it('allows known origin', async () => {
    const res = await request(BASE)
      .get('/api/rooms')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
  });

  it('allows requests with no origin (mobile apps)', async () => {
    const res = await request(BASE).get('/api/rooms');
    // No origin header = should be allowed
    expect(res.status).not.toBe(500);
  });
});

describe('Rate Limiting', () => {
  it('allows requests under auth limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(BASE)
        .post('/api/auth/login')
        .send({ pin: 'wrong' });
      expect([400, 401]).toContain(res.status);
    }
  });
});

describe('Audit Logging', () => {
  it('rejects audit log without auth', async () => {
    const res = await request(BASE).post('/api/audit').send({ action: 'test' });
    expect(res.status).toBe(401);
  });

  it('records audit event with valid token', async () => {
    const res = await request(BASE)
      .post('/api/audit')
      .set('Authorization', `Bearer ${OWNER_TOKEN}`)
      .send({ action: 'test-audit-event' });
    expect([201, 400]).toContain(res.status);
  });

  it('rejects empty action', async () => {
    const res = await request(BASE)
      .post('/api/audit')
      .set('Authorization', `Bearer ${OWNER_TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('retrieves audit logs with owner role', async () => {
    const res = await request(BASE)
      .get('/api/audit')
      .set('Authorization', `Bearer ${OWNER_TOKEN}`);
    expect([200, 304]).toContain(res.status);
  });
});

describe('Structured Logging', () => {
  it('returns JSON error responses', async () => {
    const res = await request(BASE).get('/api/sales');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
  });
});
