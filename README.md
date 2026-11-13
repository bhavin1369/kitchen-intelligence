# AI-Powered Kitchen Intelligence System

An AI/ML-driven operations platform for commercial kitchens, restaurants, and canteens. Predicts customer demand, optimizes raw ingredient purchasing, tracks batch-level expiry via FEFO, and minimizes food waste.

---

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, Lucide React, Axios, React Router v7
- **Backend**: Python 3.14, Flask REST API, Flask-CORS, PyJWT, Werkzeug
- **Database**: SQLite (WAL Mode, foreign keys enabled)
- **Machine Learning**: Scikit-Learn, Pandas, NumPy, Joblib

---

## Project Structure

```text
kitchen-intelligence/
├── client/                     # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/layout/  # Sidebar, Navbar, Layout
│   │   ├── components/ui/      # UI components & placeholders
│   │   ├── context/            # AuthContext (JWT session management)
│   │   ├── pages/              # 12 Core Pages (Dashboard, Sales, Menu, Forecast...)
│   │   ├── services/           # Axios API Client
│   │   ├── App.jsx             # React Router v7 Routes
│   │   └── main.jsx
│   └── vite.config.js          # Proxies /api -> http://127.0.0.1:5000
│
├── server/                     # Python Flask REST API
│   ├── app/
│   │   ├── __init__.py         # Flask App Factory (CORS, Error handlers)
│   │   ├── config.py           # Database URI & JWT secret configuration
│   │   ├── routes/             # REST Blueprints (auth, health, ...)
│   │   └── utils/
│   │       ├── db.py           # SQLite connection pool & helpers
│   │       ├── schema.sql      # 14 normalized SQLite tables
│   │       ├── seed.py         # Realistic Indian kitchen seed dataset
│   │       └── indian_calendar.py # Indian holiday & festival multipliers
│   ├── instance/
│   │   └── kitchen_intelligence.db # Shared SQLite Database
│   ├── requirements.txt
│   └── run.py                  # Backend server entry point (Port 5000)
│
├── start-backend.ps1           # One-click PowerShell script to launch backend
└── start-frontend.ps1          # One-click PowerShell script to launch frontend
```

---

## Getting Started

### 1. Launch the Backend API (Port 5000)
```powershell
cd d:\CP\kitchen-intelligence\server
.\venv\Scripts\python.exe run.py
```
*Health check endpoint:* `http://localhost:5000/api/v1/health`

### 2. Launch the Frontend UI (Port 5173)
```powershell
cd d:\CP\kitchen-intelligence\client
npm run dev
```
*Open in browser:* `http://localhost:5173`

---

## Demo Login Credentials

The database is pre-seeded with 4 role-based user accounts:

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access, user management, system settings |
| **Head Chef** | `chef_vikram` | `chef123` | Recipes, inventory, leftover suggestions, waste logs |
| **Store Manager** | `manager_priya` | `manager123` | POS orders, purchase orders, inventory, analytics |
| **Kitchen Staff** | `staff_rahul` | `staff123` | Quick waste logging, POS order entry |

---

## Seeded Database Inventory (WAL Mode)

The database includes realistic production data:
- **3,959** Historical Sales Orders (90 days with day-of-week seasonality)
- **9,780** Sales Order Item records
- **12** Signature Menu Items (Biryani, Paneer Butter Masala, Butter Chicken, Naan, etc.)
- **61** Recipe Bill of Materials (BOM) items with yield percentages
- **26** Raw Ingredients with par levels and shelf life
- **13** Inventory Batches (including near-expiry batches to test alerts)
- **21** Curated Indian Calendar Events & Festival demand multipliers
- **5** Verified Food Suppliers

