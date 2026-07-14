# DeepaBMS Architecture

## Application Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        App.tsx                                    │
│  ThemeProvider → StoreProvider → AuthProvider → StatusBar         │
│                                                   ↓              │
│                                          ErrorBoundary            │
│                                               ↓                  │
│                                          MainApp                  │
│                                          ├── Login.tsx            │
│                                          └── Layout.tsx           │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → dispatch(Action) → rootReducer → new GlobalState → re-render UI
                                            ↕
                                    AsyncStorage (persistence)
                                            ↕
                                    REST API sync (optional)
```

## Module Architecture

```
┌─────────────────────┐  ┌────────────────────────┐
│    Presentation      │  │     State Management    │
│  ┌─────────────────┐│  │  ┌────────────────────┐ │
│  │ Layout.tsx      ││  │  │ StoreContext.tsx   │ │
│  │ 13 Screen       ││  │  │ rootReducer.ts    │ │
│  │ Components      │◄─┼──┤ buildSeed.ts       │ │
│  │ Primitives.tsx  ││  │  │ selectors.ts      │ │
│  │ Charts.tsx      ││  │  └────────────────────┘ │
│  └─────────────────┘│  │  ┌────────────────────┐ │
└─────────────────────┘  │  │ AuthContext.tsx     │ │
                          │  │ ThemeContext.tsx    │ │
                          │  └────────────────────┘ │
                          └────────────────────────┘

┌─────────────────────┐  ┌────────────────────────┐
│      Utilities       │  │     Infrastructure     │
│  helpers.ts         │  │  apps/backend/ (API)   │
│  security.ts        │  │  apps/windows/ (Elect) │
│  payroll.ts         │  │  docker-compose.yml    │
│  ledgerBuilders.ts  │  │  .github/workflows/   │
│  templateRenderers  │  │  scripts/             │
│  bankStatementParser│  └────────────────────────┘
│  fileExporter.ts    │
│  mediaPicker.ts     │
│  ThermalPrinter.ts  │
│  useElectron.ts     │
│  useLayout.ts       │
└─────────────────────┘
```

## Authentication Flow

```
Login.tsx → selectUser → enterPIN → constantTimeEqual(pin, user.pin)
                                    ↕
                               dispatch(AUDIT)
                                    ↕
                               login(user) → AsyncStorage.setItem
                                    ↕
                               currentUser set → Layout renders
```

## Synchronization Flow

```
Client (StoreContext.tsx)                    Server (apps/backend/)
   │                                              │
   │  POST /api/sync {state}                     │
   │─────────────────────────────────────────────>│
   │                                              │
   │         withSyncLock (serialized queue)      │
   │              │                               │
   │         readMasterState()                    │
   │              │                               │
   │         mergeCollections() (LWW by date)     │
   │         mergeRooms() (priority-based)        │
   │              │                               │
   │         writeMasterState()                   │
   │              │                               │
   │  <───────────────────────────────────────────│
   │         merged state                         │
   │                                              │
   │  dispatch(HYDRATE, mergedState)              │
   │  setSyncStatus('synced')                     │
```

## Sync Triggers

| Trigger | Frequency | Description |
|---|---|---|
| After write actions | 200ms debounce | Automatic sync on data mutations |
| Periodic poll | 10s interval | Background state reconciliation |
| App foreground | On resume | Sync when app comes to foreground |
| Online event | On connectivity | Sync when network reconnects |
| Manual | On tap | SyncBadge press triggers syncNow() |

## Offline Architecture

The app is **offline-first**. All data is:
1. Stored locally in AsyncStorage (JSON-serialized GlobalState)
2. Written to local state immediately (optimistic)
3. Synced to server asynchronously

This means the app works fully without network connectivity and syncs when available.

## Navigation Architecture

```
Layout.tsx ─┬─ Desktop (>=768px): Sidebar (248px) + Content
            └─ Mobile (<768px): Top bar + Bottom tabs (5 tabs)

Sidebar Navigation (13 items):
  OVERVIEW: Dashboard
  DAILY OPS: DayBook, Sales, Hotel, Bar
  BACK OFFICE: Inventory, Credits, Banking, Employees
  ANALYSIS: Reports, Analytics
  SYSTEM: Users, Settings

Mobile Tabs (5):
  Dashboard, DayBook, Hotel, Bar, More(Settings)

Navigation Router:
  Custom 'navigation' object with navigate(tabName, params)
  Maps tabName → screen key via routeMap
```

## Backend Domain Architecture

As of P2-6, the backend follows a domain-oriented architecture. Business logic is organized into co-located route modules, not a monolithic `index.ts`.

```
apps/backend/src/
├── index.ts              # ~100 lines — thin orchestration (middleware + mount + bootstrap)
├── bootstrap.ts          # Seed orchestrator (topo-sort, dependency resolution)
├── db.ts                 # SQLite connection
├── schema.sql            # Database schema (20 tables)
├── middleware/            # Shared cross-cutting concerns
│   ├── auth.ts           # JWT — authenticate, authorize, signToken
│   ├── validate.ts       # 12-type validation engine + schemas
│   └── security.ts       # Headers, CORS, HTTPS redirect, structured logging
├── domains/              # One directory per business concern
│   ├── auth/             # POST /api/auth/login
│   ├── sales/            # GET/POST /api/sales
│   ├── rooms/            # GET /api/rooms
│   ├── inventory/        # GET /api/inventory
│   ├── liquor/           # GET /api/liquor
│   ├── employees/        # GET /api/employees
│   ├── sync/             # POST /api/sync (LWW merge)
│   └── audit/            # POST/GET /api/audit
├── seed/
│   ├── types.ts          # SeedModule interface, BootstrapOptions
│   └── auth.seed.ts      # User seeding (idempotent, bcrypt-hashed)
└── tests/                # Integration tests (supertest)
```

Each domain file owns its route handlers and middleware chain. Adding a new domain is a single `import` + `app.use()` in `index.ts`.

### Domain Seed Dependency Graph
```
auth (no deps)
  └── future: inventory → rooms → sales → ...
```

## Role-Based Access Control

| Role | Permissions |
|---|---|
| **owner** | All 12 permissions |
| **manager** | All except 'users' |
| **cashier** | daybook only (4-day max history) |
| **reception** | hotel, sales |
| **fnb** | sales, inventory, credits |
| **barstaff** | bar only |
| **accountant** | dashboard, daybook, credits, banking, reports |
