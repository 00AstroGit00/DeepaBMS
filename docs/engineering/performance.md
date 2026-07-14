# DeepaBMS Performance Audit

## Executive Summary
**Performance Score: 7/10** — Good for an SMB application. No critical bottlenecks, but several optimization opportunities exist.

---

## Bundle Size Analysis

### Estimated Bundle Composition
| Asset | Est. Size | Notes |
|---|---|---|
| React Native + Expo runtime | ~8MB | Base framework |
| Application code (73K lines) | ~1.5MB | TypeScript compiled |
| Assets (icons, images) | ~500KB | PNG icons + logo |
| **Total APK estimate** | **~25-40MB** | Expo managed workflow |

### Optimization Opportunities
| Issue | Impact | Effort |
|---|---|---|
| No tree-shaking of unused Expo modules | Medium | Low |
| Large inline seed data (buildSeed.ts) | Low | Medium |
| No image optimization in assets | Low | Low |
| Moment.js not used (custom helpers) | ✅ Good | — |

---

## Startup Performance

### Current Flow
```
App launch → ThemeProvider → StoreProvider → AuthProvider → AsyncStorage.read
    → Parse JSON state (500KB-2MB) → Dispatch HYDRATE
    → Optional server sync (POST 500KB-2MB)
```

### Bottlenecks
1. **AsyncStorage read blocks initial render** — must load full state before UI
2. **buildSeed() runs on every fresh launch** — 35 days of synthetic data (1028 lines)
3. **10s poll sync runs immediately** — first sync within 1.5s of ready

### Recommendations
- Lazy-load seed generation (only on first launch after clear)
- Split AsyncStorage into per-domain keys (reduce single read/write payload)
- Defer initial sync to after first paint

---

## Rendering Performance

### Known Issues
| Issue | Location | Severity |
|---|---|---|
| FlatLists without `getItemLayout` | Multiple screens | Medium |
| Large state context re-renders all consumers | StoreContext | Medium |
| Inline styles not extracted | All components | Low |
| No `React.memo` on screen components | All screens | Low |

### FlatList Concerns
- DayBook, Sales, Banking, Employees use FlatList without:
  - `getItemLayout` (fixed height would improve scroll perf)
  - `windowSize` tuning
  - `maxToRenderPerBatch` optimization
  - `removeClippedSubviews`

---

## Memory

| Aspect | Status |
|---|---|
| Entire GlobalState in memory | ⚠️ ~500KB-2MB JSON |
| Seed data loaded on every fresh start | ⚠️ |
| 500-entry audit log cap | ✅ |
| Image attachments stored as base64 | ⚠️ 1.5MB per file limit |
| No image caching strategy | ⚠️ |

---

## Network Performance

| Aspect | Measurement |
|---|---|
| Sync payload size | ~200-500KB (full state) |
| Sync interval | 10s background + debounced writes |
| Sync timeout | 15s abort |
| Sync failure recover | 8s cooldown |

### Optimization Opportunities
- Incremental sync (send only changed records)
- Binary format (MessagePack) instead of JSON
- Compress sync payload (gzip)

---

## Database Queries (Server)

| Query | Location | Frequency |
|---|---|---|
| `SELECT * FROM sales ORDER BY date DESC` | GET /api/sales | On demand |
| `SELECT * FROM rooms` | GET /api/rooms | On demand |
| `SELECT * FROM inventory` | GET /api/inventory | On demand |
| Full state file read/write | POST /api/sync | Per sync |

### Indexes
6 indexes defined in schema.sql for frequently queried columns. Missing:
- `idx_bank_moves_date`
- `idx_liquor_audits_date`
- `idx_security_audit_log_user`

---

## Measurable Benchmarks

| Metric | Estimate | Target |
|---|---|---|
| Cold start time (no network) | <3s | <2s |
| AsyncStorage load (2MB) | ~500ms | <300ms |
| Sync upload (500KB) | <5s (4G) | <3s |
| Screen navigation | <100ms | <50ms |
| Report generation | <500ms | <200ms |
| FlatList scroll (1000 items) | Not measured | 60fps |

*Note: No profiling tools available in current environment.*
