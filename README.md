# AI-Powered Kitchen Intelligence System

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.5+-orange.svg)](https://scikit-learn.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enterprise-ready, AI/ML-driven operations platform engineered for commercial kitchens, Indian canteens, catering services, and multi-station restaurants. The system synchronizes daily point-of-sale (POS) data, forecasts future customer demand with confidence intervals, performs recipe Bill of Materials (BOM) explosion, optimizes raw ingredient purchasing via deficit algorithms, manages inventory batches via First-Expired, First-Out (FEFO), minimizes food waste through AI leftover upcycling, and benchmarks environmental carbon and water footprints.

---

## Table of Contents

1. [System Architecture & Modules](#system-architecture--modules)
2. [End-to-End Operational Lifecycle](#end-to-end-operational-lifecycle)
3. [Technology Stack](#technology-stack)
4. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
5. [Quickstart & Local Installation](#quickstart--local-installation)
6. [Automated Test Suite (42 Unit & Integration Tests)](#automated-test-suite)
7. [Comprehensive REST API Reference](#comprehensive-rest-api-reference)
8. [Audit & Domain CSV Exports](#audit--domain-csv-exports)
9. [Database Backup & Disaster Recovery Runbook](#database-backup--disaster-recovery-runbook)
10. [Production Deployment (Docker & Nginx)](#production-deployment)
11. [Known Limitations & Future Roadmap](#known-limitations--future-roadmap)

---

## System Architecture & Modules

The system is organized into modular frontend and backend domains:

```text
kitchen-intelligence/
├── client/                     # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/layout/  # Sidebar, Navbar, Responsive Shell
│   │   ├── context/            # AuthContext (JWT session & role switching)
│   │   ├── pages/              # 13 Production Views:
│   │   │   ├── DashboardPage.jsx           # Real-time Executive Command Center
│   │   │   ├── SalesPage.jsx               # POS Daily Sales Ledger & CSV Bulk Upload
│   │   │   ├── MenuPage.jsx                # Menu Items, Categories & Gross Margin Engine
│   │   │   ├── RecipePage.jsx              # Recipe Bill of Materials (BOM) & Portion Costing
│   │   │   ├── ForecastPage.jsx            # ML Food Demand Forecasting & 95% CIs
│   │   │   ├── InventoryPage.jsx           # Multi-Batch Stock Ledger, Par Levels & FEFO Alerts
│   │   │   ├── PurchasePlannerPage.jsx     # AI Deficit Calculation & PO Generation
│   │   │   ├── WasteManagementPage.jsx     # Dual-Mode Food Waste Logging & Risk Analysis
│   │   │   ├── LeftoverSuggestionsPage.jsx # AI Leftover-to-Recipe Upcycling & Guardrails
│   │   │   ├── ActionPlanPage.jsx          # Daily Kitchen Action Plan & Station Preps
│   │   │   ├── EnvironmentalImpactPage.jsx # FAO/WRAP Carbon & Water Footprint Tracker
│   │   │   ├── AnalyticsPage.jsx           # Audit-Ready CSV Export Center & Backups
│   │   │   └── SettingsPage.jsx            # Kitchen Profile & Regional Festival Toggles
│   │   ├── services/api.js     # Axios API Client with JWT Bearer Interceptors
│   │   └── App.jsx             # React Router v7 Declarative Routing
│   └── vite.config.js          # Vite Reverse Proxy to Flask API
│
├── server/                     # Python Flask REST API & Machine Learning Engine
│   ├── app/
│   │   ├── __init__.py         # Flask App Factory (CORS, Error Handlers, Blueprints)
│   │   ├── config.py           # Database URI & SQLite WAL Connection Listener
│   │   ├── models/             # 12 Relational SQLAlchemy Models (User, Sale, Recipe...)
│   │   ├── routes/             # REST API Blueprints with RBAC Protection
│   │   ├── services/           # Domain Logic (FEFO, ML Forecasting, XAI, Waste...)
│   │   └── utils/              # Auth, JWT claims, Indian festivals calendar
│   ├── instance/
│   │   └── kitchen_intelligence.db # Persistent SQLite DB in WAL Mode
│   ├── backups/                # Online transaction-consistent SQLite snapshots
│   ├── backup_db.py            # Point-in-time online backup CLI
│   ├── restore_db.py           # Verified backup restoration CLI
│   ├── wsgi.py                 # Production WSGI entry point (Gunicorn / Waitress)
│   ├── requirements.txt        # Pinned Python package dependencies
│   └── test_*.py               # Automated Unit & E2E Integration Test Suites
│
├── deploy/                     # Production Deployment Configurations
│   ├── nginx.conf              # Production Nginx reverse proxy & SPA static server
│   ├── Dockerfile.server       # Multi-stage Python 3.11 production container
│   └── Dockerfile.client       # Node 20 build stage & Nginx Alpine runtime
└── docker-compose.yml          # Containerized turnkey deployment orchestration
```

---

## End-to-End Operational Lifecycle

The system unites kitchen operations into a continuous feedback loop:

```
[POS Sales Entry / CSV Import]
         │
         ▼
[FEFO Stock Deduction] ──► [Real-Time Inventory Batches]
         │                                │
         ▼                                ▼
[ML Model Retraining]              [Expiry Monitoring]
         │                                │
         ▼                                ▼
[Demand Forecasting (7-14d)] ──► [Surplus Risk Classification]
         │                                │
         ▼                                ▼
[Recipe BOM Explosion]             [AI Leftover Upcycling]
         │                                │
         ▼                                ▼
[Purchase Deficit Engine]          [Food Waste Logging]
         │                                │
         ▼                                ▼
[Purchase Order Draft & Receipt]   [FAO Environmental Tracker]
         │                                │
         └─────────────► [Kitchen Daily Action Plan] ◄┘
```

1. **Sales Recording**: Cashier or staff enters daily orders or imports POS CSV files.
2. **FEFO Consumption**: Ingredient stock is automatically deducted from active batches with the earliest expiration date.
3. **Machine Learning Forecasting**: Scikit-Learn Random Forest Regressor combines 90-day sales history, weekday seasonality, rolling moving averages, and Indian calendar festival multipliers (+15% to +35%) to forecast daily demand with 95% confidence intervals.
4. **Recipe Explosion**: Forecasted portion demands are converted into raw ingredients via recipe Bills of Materials (BOM).
5. **Purchase Deficit Optimization**: The recommendation engine applies the formula:
   $$\text{Purchase Qty} = \max(0, \text{Required Qty} + \text{Safety Stock} - \text{Usable Stock})$$
   Expired batches are automatically excluded from usable stock.
6. **Procurement & Receiving**: Kitchen managers generate consolidated Purchase Orders (POs) and receive shipments directly into new FEFO inventory batches with assigned shelf life.
7. **Waste Logging & Risk Prevention**: Leftover dishes and expired stock are audited with standard reason codes (Overproduction, Spoilage, Preparation Trimming).
8. **AI Leftover Upcycling**: Surplus and near-expiry ingredients are matched against recipe databases with food-safety shelf-life validation.
9. **Environmental Accounting**: Quantifies avoided food waste, carbon footprint ($\text{kg CO}_2\text{e}$), and water footprint (liters) using FAO and Water Footprint Network conversion factors.
10. **Daily Action Plan**: Synthesizes forecasts, morning prep station tasks, FEFO priorities, and procurement into an executive kitchen briefing.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, Vite, React Router v7 |
| **Styling & Design System** | Tailwind CSS (Forest Green `#166534`, Warm Linen `#fdfbf7`, Gold `#d97706`) |
| **Data Visualization** | Recharts (Composed Area/Bar/Line charts, Pie Charts) |
| **Icons & UI** | Lucide React |
| **Backend Framework** | Python 3.11 / 3.14, Flask REST API |
| **Security & Auth** | PyJWT (HMAC-SHA256, 24h expiration), Werkzeug `generate_password_hash` (PBKDF2-SHA256) |
| **Database & ORM** | SQLite in WAL (Write-Ahead Logging) Mode with `PRAGMA synchronous=NORMAL`, Flask-SQLAlchemy 3.1 |
| **Machine Learning** | Scikit-Learn (Random Forest, Gradient Boosting), Pandas, NumPy, Joblib |
| **Production Servers** | Gunicorn (Linux), Waitress (Windows), Nginx (Reverse Proxy) |

---

## Role-Based Access Control (RBAC)

The application implements four roles with endpoint protection:

| Operation / Capability | Admin | Kitchen Manager | Head Chef | Kitchen Staff |
|---|:---:|:---:|:---:|:---:|
| **POS Sales Recording** | Yes | Yes | Yes | Yes |
| **Inventory Stock Viewing & FEFO Alerts** | Yes | Yes | Yes | Yes |
| **Food Waste Logging** | Yes | Yes | Yes | Yes |
| **Daily Action Plan Task Sign-off** | Yes | Yes | Yes | Yes |
| **Menu Items & Recipe BOM Creation** | Yes | Yes | Yes | Restricted |
| **Menu Item Deletion** | Yes | Yes | Restricted | Restricted |
| **Purchase Order Creation (PO)** | Yes | Yes | Yes | Restricted |
| **Purchase Order Receipt into Batches** | Yes | Yes | Restricted | Restricted |
| **ML Model Retraining** | Yes | Yes | Restricted | Restricted |
| **Database Point-in-Time Backups** | Yes | Yes | Restricted | Restricted |
| **Database Restoration** | Yes | Restricted | Restricted | Restricted |

### Pre-Seeded Demonstration Accounts

| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| **Store / Kitchen Manager** | `manager_priya` | `manager123` |
| **Head Chef** | `chef_vikram` | `chef123` |
| **Kitchen Staff** | `staff_rahul` | `staff123` |

---

## Quickstart & Local Installation

### Prerequisites
- Node.js (v18+ or v20+) and npm
- Python (v3.11+ or v3.14)

### 1. Clone Repository
```bash
git clone https://github.com/bhavin1369/kitchen-intelligence.git
cd kitchen-intelligence
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Run server (default port 5000)
python wsgi.py
```
*Health Check:* `http://localhost:5000/api/v1/health`

### 3. Frontend Setup
```bash
cd ../client
cp .env.example .env

# Install packages
npm install

# Start Vite dev server
npm run dev
```
*Open application in browser:* `http://localhost:5173`

---

## Automated Test Suite

The test suite contains **42 unit and integration tests** verifying all business rules, database integrity, machine learning algorithms, and real-world pilot cycles.

### Run All 42 Tests
```bash
cd server
python -m unittest discover -s . -p "test_*.py"
```

### Test Coverage Breakdown

| Test Suite | Test Count | Domain Covered |
|---|:---:|---|
| `test_api.py` | 7 | General REST endpoints, health, user registration & login, menu CRUD |
| `test_phase3_integration.py` | 4 | Recipe BOM costing, sales CRUD, CSV bulk upload, dish margin calculation |
| `test_ml_forecast.py` | 5 | ML training pipeline, 7-day demand projections, Day-of-Week baseline comparison |
| `test_phase5_inventory_purchase.py` | 8 | BOM explosion, FEFO batch prioritization, deficit formula $\max(0, \text{Req}+\text{Safe}-\text{Stock})$ |
| `test_phase6_food_waste.py` | 6 | Waste logging, financial loss, expiry alert categorization, AI leftover matching |
| `test_phase7_unique_ai.py` | 6 | Indian festival demand lift, XAI feature rankings, FAO environmental tracker, action plans |
| `test_phase8_e2e_pilot.py` | 6 | RBAC role restrictions (403), unit conversions, hot SQLite backups, complete 11-step E2E lifecycle |
| **Total** | **42** | **100% Pass Rate** |

---

## Comprehensive REST API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication (`/api/v1/auth`)
- `POST /register`: Register user with role (`admin`, `manager`, `chef`, `staff`).
- `POST /login`: Authenticate credentials, returns signed JWT Bearer token.
- `POST /logout`: Invalidate local session.
- `GET /me`: Returns profile and active role of authenticated user (`@jwt_required`).

### Menu & Recipes (`/api/v1`)
- `GET /menu`: List dishes with category, dietary preference, and price filters.
- `POST /menu`: Create new dish (`@roles_required("admin", "manager", "chef")`).
- `PUT /menu/<id>`: Update dish details or availability status.
- `DELETE /menu/<id>`: Soft/hard delete dish (`@roles_required("admin", "manager")`).
- `GET /recipes/<dish_id>`: Retrieve itemized BOM ingredients and cost per serving.
- `POST /recipes`: Add raw ingredient to dish recipe with portion quantity and unit.
- `DELETE /recipes/<id>`: Remove ingredient from recipe.

### Sales (`/api/v1/sales`)
- `GET /`: Retrieve sales ledger with date range and dish filters.
- `POST /`: Record daily POS order; automatically triggers FEFO ingredient deduction.
- `PUT /<id>`: Update existing sale order.
- `DELETE /<id>`: Cancel sale order (`@roles_required("admin", "manager")`).
- `POST /upload-csv`: Bulk import sales orders from POS CSV spreadsheet.
- `GET /export/csv`: Download sales history ledger as RFC-4180 CSV.

### Demand Forecasting & AI (`/api/v1/forecasts`)
- `GET /`: Generate forward demand forecasts with 95% confidence intervals and festival contexts.
- `POST /train`: Retrain Scikit-Learn models on historical data (`@roles_required("admin", "manager")`).
- `GET /evaluation`: Fetch model evaluation metrics (MAE, RMSE, R2, Baseline comparison).
- `GET /calendar`: Query Indian festivals and public holidays for the forecast horizon.
- `GET /export/csv`: Download forecasted portion quantities as CSV.
- `GET /evaluation/export/csv`: Download model evaluation metrics as CSV.

### Inventory & Batches (`/api/v1/inventory`)
- `GET /ingredients`: List all raw materials with current usable stock, par levels, and unit costs.
- `POST /ingredients`: Register new SKU (`@roles_required("admin", "manager")`).
- `PUT /ingredients/<id>`: Update SKU details, par levels, or reorder points.
- `GET /batches`: Retrieve active and expired inventory batches.
- `POST /batches`: Directly receive new inventory batch with lot number and expiration date.
- `POST /consume`: Manually consume stock with FEFO priority.
- `POST /adjust`: Record cycle count adjustments with audit movement log.
- `GET /dashboard`: Inventory executive posture (total valuation, near-expiry count, low-stock count).
- `GET /movements`: Full immutable stock ledger history.
- `GET /export/csv`: Download inventory SKU valuation and stock report as CSV.

### Purchases & Optimization (`/api/v1/purchases`)
- `GET /requirements`: Recipe BOM requirement explosion for forecasted demand.
- `GET /recommendations`: Deficit purchase recommendations based on $\max(0, \text{Req} + \text{Safety} - \text{Usable})$.
- `GET /`: List all purchase orders (draft, approved, received).
- `POST /`: Create draft purchase order (`@roles_required("admin", "manager", "chef")`).
- `PUT /<id>`: Update PO status (`draft` $\to$ `approved`).
- `POST /<id>/receive`: Mark PO as delivered; automatically instantiates new FEFO batches and updates ingredient stock.
- `DELETE /<id>`: Cancel draft PO (`@roles_required("admin", "manager")`).
- `GET /export/csv`: Download purchase orders history as CSV.

### Food Waste Management (`/api/v1/waste`)
- `GET /`: Retrieve food waste audit logs.
- `POST /`: Record food waste event for raw ingredients (deducts stock via FEFO) or prepared dishes; calculates financial loss.
- `GET /summary`: Aggregated financial loss and physical volume lost by reason category.
- `GET /analytics`: Monthly shrinkage trends and top wasted SKUs.
- `GET /expiry-alerts`: Batches categorized as Critical ($\le 48\text{h}$), Warning ($\le 5\text{d}$), and Fresh.
- `GET /risk-analysis`: Predictive risk categorization (High, Medium, Low) for projected surplus.
- `GET /leftovers/suggestions`: AI leftover-to-recipe recommendations prioritizing near-expiry items.
- `GET /export/csv`: Download complete food waste audit log as CSV.

### Environmental Impact (`/api/v1/environmental`)
- `GET /impact`: Calculates avoided waste, carbon emissions ($\text{kg CO}_2\text{e}$), and water footprint (liters) benchmarked against unoptimized kitchens using FAO and WRAP conversion factors.

### Daily Action Plan (`/api/v1/action-plan`)
- `GET /`: Generates daily kitchen operational plan: menu portion targets, morning station prep tasks, FEFO consumption directives, and urgent procurements.
- `PUT /<date>`: Update prep task completion statuses and manager sign-off notes.
- `POST /<date>/reset`: Regenerate plan for target date (`@roles_required("admin", "manager")`).

### Executive Reports & Backups (`/api/v1/reports`)
- `GET /dashboard`: Executive command center KPIs (today's sales, predicted orders, stock valuation, critical alerts).
- `GET /sales`: Sales analytics and category revenue breakdown.
- `GET /financial`: P&L rollup: gross sales, Food Cost COGS (from recipe BOMs), gross profit margin, waste loss.
- `GET /financial/export/csv`: Download executive financial summary as CSV.
- `POST /backup`: Perform point-in-time SQLite online backup (`@roles_required("admin", "manager")`).
- `GET /backups`: List existing verified backup snapshots (`@roles_required("admin", "manager")`).
- `POST /restore`: Restore database from verified backup file (`@roles_required("admin")`).

---

## Audit & Domain CSV Exports

All domain modules support instant, UTF-8 RFC-4180 compliant CSV downloads accessible from the UI's **Executive Analytics & Export Center** (`/analytics`) or via dedicated REST endpoints:

1. **Executive Financial Summary**: `GET /api/v1/reports/financial/export/csv`
2. **Sales History Ledger**: `GET /api/v1/reports/sales/export/csv`
3. **Demand Forecasts & Bounds**: `GET /api/v1/reports/forecasts/export/csv?days=14`
4. **Machine Learning Model Validation**: `GET /api/v1/reports/model-performance/export/csv`
5. **Inventory Valuation & SKUs**: `GET /api/v1/reports/inventory/export/csv`
6. **Purchase Orders (PO) Audit**: `GET /api/v1/reports/purchases/export/csv`
7. **Food Waste & Spoilage Log**: `GET /api/v1/waste/export/csv`

---

## Database Backup & Disaster Recovery Runbook

The application uses SQLite's official **Online Backup API** (`sqlite3.Connection.backup`), allowing point-in-time snapshots to be generated while the kitchen is actively recording orders without file locks or transaction concurrency errors.

### 1. Manual Backup via CLI
```bash
cd server
python backup_db.py
```
Output:
```text
[*] Initiating Kitchen Intelligence Database Backup...
[+] Backup successfully generated: backup_kitchen_intelligence_20261113_214027.db (1132.0 KB)
[+] Integrity check: ok
```
Backups are saved to `server/backups/`. The script automatically maintains the 10 most recent snapshots.

### 2. Manual Restoration via CLI
```bash
cd server
python restore_db.py backups/backup_kitchen_intelligence_20261113_214027.db
```
The restore script:
1. Validates source backup integrity using `PRAGMA integrity_check;`.
2. Takes an emergency safety snapshot (`kitchen_intelligence.db.pre_restore.bak`).
3. Restores the database file safely.

### 3. Backup via REST API / UI
Administrators and managers can trigger backups with one click in the **Executive Analytics & Export Center** view (`/analytics`) or via:
```bash
curl -X POST http://localhost:5000/api/v1/reports/backup \
     -H "Authorization: Bearer <ADMIN_OR_MANAGER_JWT_TOKEN>"
```

---

## Production Deployment

### Option A: Turnkey Docker Compose Deployment

The project includes container configurations with health checks and persistent volume storage:

```bash
# Build and launch both frontend and backend
docker-compose up -d --build
```
- Frontend UI is exposed on `http://localhost:80`
- Backend API is accessible on `http://localhost:5000`
- SQLite database and backups persist in Docker named volumes `backend_data` and `backend_backups`.

### Option B: Linux Server Deployment (Nginx + Gunicorn)

1. **Build Frontend**:
   ```bash
   cd client
   npm ci
   npm run build
   # Static files are emitted to client/dist/
   ```
2. **Deploy Nginx**:
   Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/kitchen-intelligence` and point the root to the `client/dist/` directory.
3. **Run Gunicorn**:
   ```bash
   cd server
   gunicorn --bind 127.0.0.1:5000 --workers 4 --threads 2 --timeout 90 wsgi:app
   ```

### Option C: Windows Server Deployment (Waitress)

`wsgi.py` includes built-in support for the multi-threaded Waitress WSGI server:
```powershell
cd server
pip install waitress
python wsgi.py
```

---

## Known Limitations & Future Roadmap

### Known Limitations
- **Single-Node SQLite Storage**: Designed for single kitchens or localized deployments. For high-volume multi-location franchises, PostgreSQL should be configured via the `DATABASE_URL` environment variable.
- **Batch Re-allocation**: Batches are strictly consumed via FEFO. Manual override of batch deduction during POS orders requires adjusting stock post-sale.
- **Cold-Start for New Dishes**: Newly created dishes without 14 days of historical sales rely on category baseline and day-of-week averages until sufficient sales history accumulates.

### Future Enhancements
- **Dynamic Pricing Engine**: Automated price adjustments for dishes utilizing near-expiry ingredients during low-occupancy off-peak hours.
- **Supplier EDI & WhatsApp Integration**: Direct transmission of purchase orders to vegetable, dairy, and spice vendors via WhatsApp Business API or EDI.
- **Kitchen Display System (KDS)**: Real-time ticket management screen for line cooks showing prep timers and station allocations.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
