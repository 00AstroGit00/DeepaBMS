import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const authDuration = new Trend('auth_duration');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE = 'http://localhost:3000';

export default function () {
  group('health endpoints', function () {
    const live = http.get(`${BASE}/health/live`);
    check(live, { 'live status 200': (r) => r.status === 200 });
    failureRate.add(live.status !== 200);

    const health = http.get(`${BASE}/health`);
    check(health, { 'health status 200': (r) => r.status === 200 });
    failureRate.add(health.status !== 200);
  });

  group('auth login', function () {
    const payload = JSON.stringify({ username: 'admin', password: 'admin123' });
    const res = http.post(`${BASE}/api/auth/login`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'login status 200': (r) => r.status === 200 });
    authDuration.add(res.timings.duration);
    failureRate.add(res.status !== 200);
  });

  group('metrics', function () {
    const metrics = http.get(`${BASE}/metrics`);
    check(metrics, { 'metrics status 200': (r) => r.status === 200 });
    apiDuration.add(metrics.timings.duration);
  });

  sleep(1);
}
