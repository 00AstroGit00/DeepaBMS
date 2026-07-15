import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');

export const options = {
  vus: 1,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE = 'http://localhost:3000';

function waitForHealth() {
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    const res = http.get(`${BASE}/health/live`);
    if (res.status === 200) {
      return true;
    }
    sleep(2);
  }
  return false;
}

export default function () {
  const healthy = waitForHealth();
  check(healthy, { 'backend recovered within 60s': (r) => r === true });

  if (healthy) {
    const live = http.get(`${BASE}/health/live`);
    check(live, { 'live status 200 after recovery': (r) => r.status === 200 });
    failureRate.add(live.status !== 200);

    const metrics = http.get(`${BASE}/metrics`);
    check(metrics, { 'metrics available after recovery': (r) => r.status === 200 });
  }

  sleep(1);
}
