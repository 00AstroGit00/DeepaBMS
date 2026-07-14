# DeepaBMS Repository Overview

## Project Identity
- **Name**: DeepaBMS (Deepa Business Management System)
- **Version**: 1.0.0
- **Description**: Enterprise-grade Hospitality Business Management System for Restaurants, Bars, Hotels, and Hospitality Enterprises
- **Business**: Deepa Restaurant & Tourist Home, Cherpulassery, Palakkad, Kerala
- **Total Source**: ~73,414 lines across all modules

## Directory Structure
```
DeepaBMS/
├── App.tsx                    # Entry point
├── app.json                   # Expo configuration
├── package.json               # Root dependencies & scripts
├── tsconfig.json              # TypeScript config (strict)
├── babel.config.js            # Expo Babel preset
├── eslint.config.js           # ESLint flat config
├── .prettierrc                # Prettier formatting rules
├── .gitignore
├── .github/workflows/         # CI/CD pipelines
│   └── build-artifacts.yml    # Android APK + Windows EXE
├── src/                       # Main application source
│   ├── App.tsx → src/ context split
│   ├── Login.tsx              # PIN + biometric authentication
│   ├── Layout.tsx             # Navigation shell (sidebar/tab)
│   ├── components/            # Shared UI components
│   │   ├── Primitives.tsx     # 14 reusable UI primitives
│   │   ├── Charts.tsx         # BarChart, HBarChart, DonutLegend
│   │   └── ErrorBoundary.tsx  # Class-based error boundary
│   ├── context/               # State management
│   │   ├── StoreContext.tsx   # Main store (736 lines)
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── ThemeContext.tsx   # Theme (light/dark)
│   │   └── store/             # Store internals
│   │       ├── types.ts       # All TypeScript types
│   │       ├── rootReducer.ts # Combined reducer
│   │       ├── buildSeed.ts   # Demo data generator
│   │       ├── selectors.ts   # Derived data selectors
│   │       └── reducers/      # 10 domain reducers
│   ├── screens/               # 13 screen modules
│   │   ├── Dashboard.tsx      # Executive dashboard
│   │   ├── DayBook.tsx        # Day book (cash/bank journal)
│   │   ├── Sales.tsx          # Sales register
│   │   ├── Hotel.tsx          # Room management
│   │   ├── Bar.tsx            # Liquor management
│   │   ├── Inventory.tsx      # F&B inventory
│   │   ├── Credits.tsx        # Customer/vendor credits
│   │   ├── Banking.tsx        # Bank accounts & statements
│   │   ├── Employees.tsx      # Staff management
│   │   ├── Reports.tsx        # Report generation
│   │   ├── Users.tsx          # User management
│   │   ├── Settings.tsx       # Business settings
│   │   └── Analytics.tsx      # Business intelligence
│   └── utils/                 # Utility modules (13 files)
│       ├── helpers.ts         # Date, currency, ID utilities
│       ├── security.ts        # Constant-time PIN comparison
│       ├── biometrics.ts      # Biometric auth
│       ├── ThermalPrinter.ts  # Thermal receipt printing
│       ├── fileExporter.ts    # CSV/PDF export
│       ├── ledgerBuilders.ts  # 8 report generators
│       ├── templateRenderers.ts # PDF/Excel/CSV templates
│       ├── bankStatementParser.ts # Bank statement CSV parser
│       ├── payroll.ts         # Payroll computation
│       ├── mediaPicker.ts     # Image/document picker
│       ├── useElectron.ts     # Electron IPC bridge
│       └── useLayout.ts       # Responsive layout hook
├── apps/                      # Secondary applications
│   ├── backend/               # Express REST API
│   │   ├── src/index.ts       # Bootstrap + middleware stack (~100 lines)
│   │   ├── src/bootstrap.ts   # Seed orchestrator (topo-sort + dependency resolution)
│   │   ├── src/db.ts          # SQLite database
│   │   ├── src/schema.sql     # Database schema (20 tables)
│   │   ├── src/middleware/     # Auth, validation, security middleware
│   │   ├── src/domains/       # 8 domain route modules (auth, sales, rooms, inventory, liquor, employees, sync, audit)
│   │   ├── src/seed/          # Seed module framework + domain seeds
│   │   ├── src/tests/         # Integration tests (supertest)
│   │   ├── Dockerfile         # Container build
│   │   └── package.json       # Backend dependencies
│   └── windows/               # Electron desktop app
│       ├── main.js            # Electron main process
│       ├── preload.js         # Context bridge
│       ├── fix-paths.js       # Web build path fixer
│       ├── desktop.css        # Desktop-specific CSS
│       └── package.json       # Electron dependencies
├── scripts/                   # Shell scripts
│   ├── build/                 # Build scripts
│   ├── db/                    # Database backup/restore
│   ├── env/                   # Environment setup
│   ├── test/                  # Test runner
│   └── lib/                   # Shared library
├── tests/                     # Test reports
├── docs/                      # Documentation
│   ├── DEVELOPMENT.md         # Developer setup guide
│   └── engineering/           # Engineering knowledge base
├── assets/                    # Icons & images
├── docker-compose.yml         # Multi-service deployment
├── deploy-bms.bat             # Windows deployment
└── jest-setup.js              # Jest mock setup
```
