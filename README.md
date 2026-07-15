# 🏨 DeepaBMS

> **A comprehensive Hospitality Business Management System for Restaurants, Bars, Hotels, and Hospitality Enterprises.**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-22.x-brightgreen)
[![Build](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/build.yml/badge.svg)](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/build.yml)
[![Test](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/test.yml/badge.svg)](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/test.yml)
[![Security](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/security.yml/badge.svg)](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/security.yml)
[![Release Gates](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/release-gates.yml/badge.svg)](https://github.com/00AstroGit00/DeepaBMS/actions/workflows/release-gates.yml)

DeepaBMS is an enterprise-grade Business Management System (BMS) designed specifically for the hospitality industry. It provides an integrated platform for managing restaurant operations, bar inventory, hotel rooms, finance, GST reporting, employee management, analytics, and business intelligence from a single dashboard.

---

# ✨ Features

## 📊 Executive Dashboard

- Real-time business overview
- Daily, Weekly, Monthly & Yearly revenue
- Profit & Loss summary
- Sales analytics
- Cash flow monitoring
- GST summary
- Business KPIs
- Occupancy statistics
- Inventory alerts
- Financial insights

---

## 🍽 Restaurant Management

- Sales management
- Table order tracking
- Department-wise revenue
- Food inventory
- Purchase management
- Expense recording
- Sales history
- Category reports

---

## 🍺 Bar Management

Designed specifically for liquor businesses.

### Features

- Bottle stock management
- Loose stock (ML) management
- Peg calculations
- Brand-wise inventory
- Supplier management
- Purchase history
- Sales tracking
- Excise-ready inventory
- Wastage tracking
- Stock reconciliation

---

## 🏨 Hotel Management

- Room management
- Occupancy tracking
- Booking records
- Revenue tracking
- Guest management
- Room availability
- Hotel analytics

---

## 📦 Inventory Management

- Item management
- Categories
- Stock In
- Stock Out
- Low stock alerts
- Purchase records
- Supplier details
- Inventory valuation
- Movement history

---

## 💰 Financial Management

- Day Book
- Cash Book
- Bank Book
- Income
- Expenses
- Credit Management
- Vendor Payments
- Customer Credits
- Cash Position
- Profit & Loss
- Financial Reports

---

## 📈 Reports

Generate professional reports including:

- Daily Report
- Monthly Report
- Yearly Report
- Sales Report
- Purchase Report
- Inventory Report
- GST Report
- Day Book
- Cash Book
- Credit Report
- Supplier Report
- Employee Report
- Hotel Report
- Bar Report
- Analytics Report

---

## 📤 Export Support

Export reports in multiple formats:

- PDF
- Excel
- CSV
- Printable Reports

---

## 👥 User Management

- User Authentication
- Role-based Access
- Business Settings
- User Profiles
- Secure Login

---

## 📊 Analytics

Business intelligence dashboard with:

- Revenue Trends
- Sales Analytics
- Profit Analysis
- Department Performance
- Stock Analytics
- Customer Insights
- Financial Charts
- Interactive Graphs

---

# 📁 Project Structure

```
DeepaBMS/
│
├── .github/
│   └── workflows/
│
├── apps/
│   ├── backend/
│   └── windows/
│
├── assets/
│
├── docs/
│
├── extracted_modules/
│
├── scripts/
│
├── src/
│   ├── components/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── types/
│   └── assets/
│
├── tests/
│
├── App.tsx
├── package.json
└── README.md
```

---

# 🖥 Application Modules

- Dashboard
- Sales
- Inventory
- Bar
- Hotel
- Banking
- Reports
- Analytics
- Day Book
- Credits
- Employees
- Settings
- Users

---

# ⚙ Technology Stack

## Frontend

- React Native
- Expo
- TypeScript
- JavaScript

## Backend

- Node.js
- Express.js

## Desktop

- Electron (Windows)

## Development

- ESLint
- Prettier
- Jest
- Jest Expo

---

# 🚀 Getting Started

## Prerequisites

- Node.js 22.x (LTS)
- npm or Yarn
- Expo CLI
- Git
- Docker (for container deployment)
- Helm + kubectl (for Kubernetes deployment)

---

## Clone Repository

```bash
git clone https://github.com/00AstroGit00/DeepaBMS.git
cd DeepaBMS
```

---

## Install Dependencies

```bash
# Mobile app
npm install

# Backend
cd apps/backend && npm install && cd ../..
```

---

## Development

### Mobile App
```bash
npm start          # Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
```

### Backend API
```bash
cd apps/backend
cp .env.example .env  # Configure JWT_SECRET
npm run dev            # Start dev server on port 3000
```

---

## Backend Production Build

```bash
cd apps/backend
npm run build                    # Compile TypeScript
cp src/schema.sql dist/schema.sql  # Copy schema
JWT_SECRET=<your-secret> npm start  # Start server
```

### Docker (Production)
```bash
docker build -t deepa-bms-backend -f apps/backend/Dockerfile.prod ./apps/backend
docker run -d -p 3000:3000 \
  -v sqlite-data:/app/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=<your-secret> \
  deepa-bms-backend
```

### Docker Compose (Full Stack)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Kubernetes (Helm)
```bash
helm install deepa-bms ./helm/deepa-bms --set secrets.jwtSecret=<your-secret>
```

---

# 🧪 Available Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
npm run lint:fix
npm run format
npm run ts:check
npm test
```

---

# 📱 Supported Platforms

- ✅ Android
- ✅ iOS
- ✅ Windows
- ✅ Web

---

# 🔒 Core Business Capabilities

- Restaurant Management
- Bar Management
- Hotel Management
- Inventory Control
- Employee Management
- Financial Accounting
- GST Reporting
- Credit Management
- Banking
- Analytics
- Business Intelligence
- Report Generation
- Data Export

---

# 📊 Business Reports

DeepaBMS can generate reports for:

- Sales
- Purchases
- Expenses
- Inventory
- Profit & Loss
- GST
- Cash Flow
- Daily Book
- Hotel Revenue
- Bar Revenue
- Employee Performance
- Vendor Analysis
- Customer Credits
- Banking

---

# 🎯 Future Roadmap

- POS Integration
- Barcode Scanning
- QR Ordering
- Cloud Backup
- Multi-Branch Support
- AI Business Insights
- Mobile Notifications
- WhatsApp Invoice Sharing
- Advanced GST Automation
- Payroll Management
- Kitchen Display System (KDS)
- Online Ordering Integration

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/new-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push the branch.

```bash
git push origin feature/new-feature
```

5. Open a Pull Request.

---

# 📄 License

Licensed under the [MIT License](./LICENSE).

Copyright (c) 2026 DeepaBMS. See the [LICENSE](./LICENSE) file for the full text.

---

# 👨‍💻 Author

**AstroGit**

GitHub: https://github.com/00AstroGit00

---

# ⭐ Support

If you find this project useful:

- ⭐ Star the repository
- 🍴 Fork the repository
- 🐛 Report issues
- 💡 Suggest new features

---

## Built for the Hospitality Industry

DeepaBMS is designed to simplify and modernize the management of restaurants, bars, hotels, and hospitality businesses by combining operations, finance, inventory, analytics, and reporting into one unified platform.
