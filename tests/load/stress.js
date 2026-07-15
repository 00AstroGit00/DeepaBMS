import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 200 },
    { duration: '3m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '2m', target: 300 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    failed_requests: ['rate<0.05'],
  },
};

const BASE = 'http://localhost:3000';

export default function () {
  group('health', function () {
    const res = http.get(`${BASE}/health/live`);
    check(res, { 'live status 200': (r) => r.status === 200 });
    failureRate.add(res.status !== 200);
  });

  group('auth', function () {
    const payload = JSON.stringify({ username: 'admin', password: 'admin123' });
    const res = http.post(`${BASE}/api/auth/login`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'login status 200': (r) => r.status === 200 });
    failureRate.add(res.status !== 200);
  });

  sleep(0.5);
}
