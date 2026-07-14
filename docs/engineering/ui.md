# DeepaBMS UI Architecture

## Design System
- **Theme**: Material 3-inspired with brand maroon (#8B2E2E)
- **Modes**: Light + Dark (full token set, toggleable)
- **Responsive**: Desktop (≥768px sidebar), Mobile (bottom tabs)
- **Platform**: iOS, Android, Web, Windows (Electron)

## Theme Tokens (ThemeColors)
28 tokens across light/dark themes:
- bg, card, cardAlt, border (surfaces)
- text, sub, faint (typography)
- primary, primarySoft (brand)
- green, red, amber, blue, purple, teal (semantic)
- +Soft variants for each semantic color

## Component Hierarchy

```
App.tsx
├── ThemeProvider
│   └── StoreProvider
│       └── AuthProvider
│           └── ErrorBoundary
│               └── MainApp
│                   ├── Login.tsx (unauthenticated)
│                   └── Layout.tsx (authenticated)
│                       ├── [Desktop] Sidebar
│                       │   ├── Logo + Business Name
│                       │   ├── SyncBadge (compact)
│                       │   ├── UserCard + Logout
│                       │   ├── Navigation Menu (13 items, grouped)
│                       │   ├── CashInHand widget
│                       │   ├── SyncBadge (full)
│                       │   └── ThemeToggle
│                       ├── [Mobile] Top Header
│                       │   ├── Screen Title
│                       │   ├── SyncBadge (compact)
│                       │   └── User Badge + SignOut
│                       ├── Active Screen (13 screens)
│                       └── [Mobile] Bottom Tab Bar (5 tabs)
```

## Shared UI Primitives (Primitives.tsx — 14 components)

| Component | Props | Lines |
|---|---|---|
| Card | children, style | 23 |
| SectionTitle | children, right | 25 |
| Chip | label, active, onPress, color | 26 |
| Field | label, value, onChangeText, keyboardType, ... | 38 |
| Segmented | options, value, onChange | 38 |
| PrimaryButton | title, onPress, color, icon | 26 |
| Sheet | visible, onClose, title, children | 73 |
| Select | label, value, options, onChange, placeholder, color | 181 |
| EmptyState | icon, text | 20 |
| Badge | text, color, soft | 22 |
| Row | children, style | 14 |
| StatPill | label, value, color | 24 |

## Chart Components (Charts.tsx — 3 components)

| Component | Lines | Description |
|---|---|---|
| BarChart | 64 | Vertical bar chart |
| HBarChart | 72 | Horizontal bar chart |
| DonutLegend | 78 | Segmented bar + legend grid |

## Accessibility
- ErrorBoundary wraps entire app
- TouchableOpacity used for interactive elements
- accessibilityLabel on keypad buttons in Login
- Missing: accessibilityRole on many touchables
- Missing: screen reader support for charts

## Responsive Breakpoints
| Breakpoint | Layout |
|---|---|
| < 768px | Mobile: top bar + bottom tabs (5 tabs) |
| ≥ 768px | Tablet/Desktop: sidebar (248px) + content |
| ≥ 1024px | Desktop: max content width (1100px) |

## Screen Inventory

| Screen | View Modes | Modals/Sheets | Features |
|---|---|---|---|
| Dashboard | Scroll + KPIs | — | 7-day chart, expense HBar, donut legend |
| DayBook | FlatList + filters | Entry sheet (expense/income) | Date picker, attachment upload |
| Sales | FlatList + dept filter | — | Department sales, totals |
| Hotel | Tab (rooms/history) | Check-in/out sheets | Room grid, guest register |
| Bar | Tab (stock/variance) | Sell/Purchase/Audit sheets | Peg calculator, stock value |
| Inventory | FlatList + category filter | Stock move sheet | Low stock alerts, valuation |
| Credits | Tab (customer/vendor) | Entry sheet (+payment) | Ageing analysis |
| Banking | FlatList + account filter | Move sheet + statement import | Bank statement CSV parse |
| Employees | Tab (list/attendance/reviews) | Add/Edit sheets | Attendance grid, payroll |
| Reports | Scroll + report type select | — | 8 report types, 3 export formats |
| Users | FlatList | Add/Edit sheets | Role assignment, PIN |
| Settings | Scroll + sections | — | Theme, sync, backup, business info |
| Analytics | Scroll + charts | — | Revenue trends, dept perf, GST, occupancy |
