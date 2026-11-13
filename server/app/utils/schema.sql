-- AI-Powered Kitchen Intelligence System: Complete SQLite Relational Schema
PRAGMA foreign_keys = ON;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'chef', 'manager', 'staff')) NOT NULL DEFAULT 'staff',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Categories (for Menu & Ingredients)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('menu', 'ingredient')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    lead_time_days INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ingredients Master
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    default_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    unit TEXT CHECK(unit IN ('kg', 'g', 'l', 'ml', 'pcs', 'dozen')) NOT NULL,
    current_stock REAL NOT NULL DEFAULT 0.0,
    par_level REAL NOT NULL DEFAULT 0.0,
    cost_per_unit REAL NOT NULL DEFAULT 0.0,
    shelf_life_days INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inventory Batches (Tracks Expiry via FEFO)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    initial_quantity REAL NOT NULL,
    remaining_quantity REAL NOT NULL,
    purchase_cost_per_unit REAL NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT CHECK(status IN ('active', 'depleted', 'expired', 'discarded')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_batch_expiry ON inventory_batches(expiry_date, status);

-- 6. Inventory Transactions (Stock Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES inventory_batches(id) ON DELETE SET NULL,
    transaction_type TEXT CHECK(transaction_type IN ('purchase', 'sales_consumption', 'waste', 'manual_adjustment')) NOT NULL,
    quantity REAL NOT NULL,
    cost REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    selling_price REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0.0,
    is_available INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Recipes (Bill of Materials with Yield Adjustment)
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    prep_loss_percentage REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, ingredient_id)
);

-- 9. Sales Orders & Items (POS Records)
CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    order_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'upi', 'credit')) DEFAULT 'cash',
    status TEXT CHECK(status IN ('completed', 'cancelled', 'refunded')) DEFAULT 'completed',
    created_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales_orders(order_timestamp);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
);

-- 10. Food Waste Logs
CREATE TABLE IF NOT EXISTS waste_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date DATE NOT NULL,
    item_type TEXT CHECK(item_type IN ('raw_ingredient', 'prepared_item')) NOT NULL,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE SET NULL,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES inventory_batches(id) ON DELETE SET NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    financial_loss REAL NOT NULL,
    reason TEXT CHECK(reason IN ('expired', 'over_prep', 'burnt_damaged', 'quality_rejection', 'plate_waste')) NOT NULL,
    notes TEXT,
    logged_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_logs(log_date);

-- 11. Smart Purchase Orders & Items
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    delivery_due_date DATE,
    total_estimated_cost REAL NOT NULL DEFAULT 0.0,
    status TEXT CHECK(status IN ('draft', 'generated', 'approved', 'received', 'cancelled')) DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    recommended_quantity REAL NOT NULL,
    approved_quantity REAL NOT NULL,
    unit_cost REAL NOT NULL,
    subtotal REAL NOT NULL
);

-- 12. Indian Calendar & Local Demand Events
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date DATE NOT NULL,
    event_name TEXT NOT NULL,
    event_type TEXT CHECK(event_type IN ('national_holiday', 'religious_festival', 'sports_event', 'local_fair', 'payday_weekend')) NOT NULL,
    expected_demand_impact REAL DEFAULT 1.0,
    is_recurring INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_event_date ON calendar_events(event_date);

-- 13. AI Forecast Records
CREATE TABLE IF NOT EXISTS forecast_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forecast_date DATE NOT NULL,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    predicted_quantity REAL NOT NULL,
    actual_quantity REAL,
    confidence_lower REAL,
    confidence_upper REAL,
    baseline_ma_quantity REAL,
    factors_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forecast_date, menu_item_id)
);
CREATE INDEX IF NOT EXISTS idx_forecast_date ON forecast_entries(forecast_date);

-- 14. System Configuration & Thresholds
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

