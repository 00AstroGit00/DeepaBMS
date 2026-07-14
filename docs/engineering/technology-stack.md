> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.

# DeepaBMS Technology Stack

## Frontend (Mobile + Web)
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.74.5 | Mobile/Web UI framework |
| Expo | SDK 51 | React Native toolchain & services |
| TypeScript | 5.3.3 | Type safety |
| React | 18.2.0 | UI runtime |
| react-native-web | 0.19.13 | Web platform support |

## State Management
| Technology | Purpose |
|---|---|
| React Context + useReducer | Global state (no third-party lib) |
| 10 domain-specific reducers | Sales, txns, bank, hotel, inventory, liquor, credits, employees, misc |
| Selectors | Derived data (cashInHand, bankBalance, etc.) |

## UI Components
| Library | Purpose |
|---|---|
| @expo/vector-icons | Ionicons icon set |
| expo-print | Thermal/PDF printing |
| expo-file-system | File operations |
| expo-sharing | Share files |
| expo-image-picker | Camera/gallery |
| expo-document-picker | Document selection |
| expo-local-authentication | Biometric (fingerprint/face) |

## Storage
| Technology | Purpose |
|---|---|
| @react-native-async-storage/async-storage | Local state persistence |
| SQLite3 (backend) | Server database |

## Backend (apps/backend/)
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.19.2 | HTTP framework |
| TypeScript | 5.4.5 | Type safety |
| sqlite3 | 5.1.7 | Database driver |
| jsonwebtoken | 9.0.2 | JWT auth tokens |
| bcryptjs | 2.4.3 | Password hashing (declared but unused) |
| cors | 2.8.5 | CORS middleware |
| morgan | 1.10.0 | HTTP logging |
| express-rate-limit | 7.2.0 | Rate limiting |
| dotenv | 16.4.5 | Environment configuration |

## Desktop (apps/windows/)
| Technology | Version | Purpose |
|---|---|---|
| Electron | 29.3.0 | Desktop shell |
| electron-builder | 24.13.3 | Windows installer (NSIS/MSI) |
| electron-updater | 6.1.7 | Auto-update |
| Chrome | Embedded | Web rendering |

## Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | Multi-service orchestration |
| PostgreSQL 15 | Relational database (optional) |
| Nginx (stable-alpine) | Web serving |
| Cloudflare Tunnel (cloudflared) | Secure public HTTPS tunnel |
| GitHub Actions | CI/CD pipelines |

## Code Quality
| Tool | Version | Purpose |
|---|---|---|
| ESLint | 9.39.4 | Linting (flat config) |
| Prettier | 3.9.4 | Formatting |
| TypeScript (strict) | 5.3.3 | Type checking |
| Jest | 29.x | Unit testing |
| jest-expo | ~51.0.0 | Expo Jest preset |

## Deployment Artifacts
| Artifact | Format |
|---|---|
| Android APK | `.apk` (assembleRelease) |
| Android AAB | `.aab` (via EAS) |
| Windows Installer | `.exe` (NSIS/MSI) |
| Docker Image | `node:18-alpine` based |

## Network Matrix
| Service | Protocol | Port |
|---|---|---|
| PostgreSQL | TCP | 5432 |
| Express Backend | HTTP | 3000 |
| Nginx Web | HTTP | 80 |
| Metro Bundler | HTTP | 8081 (dev) |
| Cloudflare Tunnel | HTTPS | Dynamic |
