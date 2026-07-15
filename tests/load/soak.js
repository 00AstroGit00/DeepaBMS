import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const memoryTrend = new Trend('memory_usage');

export const options = {
  vus: 30,
  duration: '4h',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE = 'http://localhost:3000';

export default function () {
  group('health', function () {
    const res = http.get(`${BASE}/health/live`);
    check(res, { 'live status 200': (r) => r.status === 200 });
    failureRate.add(res.status !== 200);
  });

  group('metrics', function () {
    const res = http.get(`${BASE}/metrics`);
    check(res, { 'metrics status 200': (r) => r.status === 200 });
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

  sleep(5);
}
