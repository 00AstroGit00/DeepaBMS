import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE = 'http://localhost:3000';

export default function () {
  const live = http.get(`${BASE}/health/live`);
  check(live, { 'live status 200': (r) => r.status === 200 });
  failureRate.add(live.status !== 200);

  const health = http.get(`${BASE}/health`);
  check(health, { 'health status 200': (r) => r.status === 200 });
  failureRate.add(health.status !== 200);

  sleep(1);
}
