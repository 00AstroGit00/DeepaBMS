export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['med<100'],
  },
};

export const KPIS = {
  p50LatencyMs: 100,
  p95LatencyMs: 500,
  p99LatencyMs: 1000,
  maxErrorRate: 0.01,
  minThroughputRpm: 100,
};
