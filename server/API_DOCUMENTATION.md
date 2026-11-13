# Kitchen Intelligence System — REST API Documentation (Phase 2)

**Base URL**: `http://127.0.0.1:5000/api/v1`  
**Authentication**: Bearer JWT Token (`Authorization: Bearer <TOKEN>`)  
**Data Format**: JSON (`Content-Type: application/json`)  
**Database**: SQLite with Write-Ahead Logging (WAL mode) & Foreign Key Constraints  

---

## Table of Contents
1. [Authentication (`/auth`)](#1-authentication)
2. [Sales Management (`/sales`)](#2-sales-management)
3. [Menu & Recipe BOM Management (`/menu`, `/recipes`)](#3-menu--recipe-bom-management)
4. [Smart Inventory & FEFO Batches (`/inventory`)](#4-smart-inventory--fefo-batches)
5. [Food Waste Management (`/waste`)](#5-food-waste-management)
6. [Purchase Orders (`/purchases`)](#6-purchase-orders)
7. [Reports & Analytics (`/reports`)](#7-reports--analytics)
8. [AI Demand Forecasts (`/forecasts`)](#8-ai-demand-forecasts)
9. [System Health (`/health`)](#9-system-health)

---

## 1. Authentication

### 1.1 Register User
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/register`
- **Request Body**:
```json
{
  "username": "chef_ananya",
  "email": "ananya@spicecraft.com",
  "password": "securepassword123",
  "fullName": "Ananya Iyer",
  "role": "chef"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 6,
      "username": "chef_ananya",
      "email": "ananya@spicecraft.com",
      "fullName": "Ananya Iyer",
      "role": "chef",
      "isActive": true
    }
  }
}
```

### 1.2 Login
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login`
- **Request Body**:
```json
{
  "username": "chef_vikram",
  "password": "chef123"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "username": "chef_vikram",
      "email": "chef.vikram@spicecraft.com",
      "fullName": "Vikram Sharma",
      "role": "chef",
      "isActive": true
    }
  }
}
```

### 1.3 User Profile
- **Method**: `GET`
- **Endpoint**: `/api/v1/auth/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`): Current authenticated user details.

---

## 2. Sales Management

### 2.1 Add Sale (With Closed-Loop FEFO Inventory Deduction)
- **Method**: `POST`
- **Endpoint**: `/api/v1/sales`
- **Business Logic**: Automatically explodes the ordered dishes into their Bill of Materials (BOM) raw ingredients, verifies stock sufficiency, deducts from the earliest expiring active batches (FEFO), and logs stock movements. If stock is insufficient, the transaction rolls back cleanly with a 400 error.
- **Request Body**:
```json
{
  "channel": "Dine-in",
  "tableNumber": "Table 5",
  "customerName": "Rohan Gupta",
  "paymentMethod": "UPI",
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2
    },
    {
      "menuItemId": 4,
      "quantity": 4
    }
  ]
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Order ORD-1046 recorded successfully and ingredients deducted via FEFO.",
  "data": {
    "id": 6,
    "orderNumber": "ORD-1046",
    "channel": "Dine-in",
    "tableNumber": "Table 5",
    "customerName": "Rohan Gupta",
    "paymentMethod": "UPI",
    "status": "completed",
    "subtotal": 1020.0,
    "tax": 51.0,
    "totalAmount": 1071.0,
    "items": [
      {
        "name": "Hyderabadi Chicken Dum Biryani",
        "quantity": 2,
        "unitPrice": 380.0,
        "subtotal": 760.0
      },
      {
        "name": "Garlic Butter Naan",
        "quantity": 4,
        "unitPrice": 65.0,
        "subtotal": 260.0
      }
    ]
  }
}
```

### 2.2 Get Sales History
- **Method**: `GET`
- **Endpoint**: `/api/v1/sales`
- **Query Parameters**:
  - `channel` (`Dine-in`, `Takeaway`, `Online`)
  - `status` (`completed`, `in-kitchen`, `cancelled`)
  - `search` (Search query for order number, table, or guest name)
  - `limit` (default: 50), `offset` (default: 0)

### 2.3 Upload Sales CSV
- **Method**: `POST`
- **Endpoint**: `/api/v1/sales/upload-csv`
- **Content-Type**: `multipart/form-data` (form field: `file`)
- **Headers in CSV**: `order_number, channel, table_number, item_name, quantity, payment_method, date`

---

## 3. Menu & Recipe BOM Management

### 3.1 Get Menu Catalog
- **Method**: `GET`
- **Endpoint**: `/api/v1/menu`
- **Query Parameters**: `category`, `diet` (`veg`, `nonveg`), `search`
- **Response** (`200 OK`): List of dishes with selling price, cost price, prep time, margin %, and status.

### 3.2 Add Menu Item
- **Method**: `POST`
- **Endpoint**: `/api/v1/menu`
- **Request Body**:
```json
{
  "name": "Paneer Lababdar",
  "category": "Mains",
  "price": 310.0,
  "costPrice": 95.0,
  "isVeg": true,
  "prepTimeMinutes": 20,
  "description": "Rich tomato and grated cottage cheese gravy."
}
```

### 3.3 Get Recipe Bill of Materials (BOM)
- **Method**: `GET`
- **Endpoint**: `/api/v1/recipes/<menu_item_id>`
- **Response** (`200 OK`): Dish details and list of required raw ingredients with portion quantities, units, and prep loss shrinkage %.

### 3.4 Add Ingredient to Recipe
- **Method**: `POST`
- **Endpoint**: `/api/v1/recipes`
- **Request Body**:
```json
{
  "menuItemId": 1,
  "ingredientId": 2,
  "quantity": 0.20,
  "unit": "kg",
  "prepLossPercentage": 3.0
}
```

---

## 4. Smart Inventory & FEFO Batches

### 4.1 Get Ingredients Master
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/ingredients`
- **Query Parameters**: `category`, `low_stock=true`, `search`
- **Response** (`200 OK`): Ingredients list with SKU, current stock, usable stock (non-expired), par level, reorder point, unit cost, and stock valuation.

### 4.2 Receive Delivery Batch (Stock-In)
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/batches`
- **Request Body**:
```json
{
  "ingredientId": 2,
  "batchNumber": "PAN-04",
  "quantity": 15.0,
  "unit": "kg",
  "unitCost": 320.0,
  "expiryDate": "2026-11-20",
  "supplierName": "Amul Dairy Distributors"
}
```

### 4.3 Get FEFO Batches
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/batches`
- **Query Parameters**: `status` (`active`, `depleted`, `expired`), `urgency` (`critical`, `warning`, `fresh`), `ingredientId`
- **Response** (`200 OK`): Batches sorted strictly by expiration date ascending, showing days to expiry and financial value at risk.

### 4.4 Stock Adjustment
- **Method**: `POST`
- **Endpoint**: `/api/v1/inventory/adjust`
- **Request Body**:
```json
{
  "ingredientId": 1,
  "newStock": 12.5,
  "notes": "Physical monthly inventory count"
}
```

### 4.5 Stock Movements History
- **Method**: `GET`
- **Endpoint**: `/api/v1/inventory/movements`
- **Query Parameters**: `ingredientId`, `type` (`purchase`, `sales_consumption`, `waste`, `manual_adjustment`)

---

## 5. Food Waste Management

### 5.1 Record Food Waste
- **Method**: `POST`
- **Endpoint**: `/api/v1/waste`
- **Business Logic**: Decrements inventory stock, marks batch if provided, logs a stock movement of type `waste`, and calculates the exact financial loss.
- **Request Body**:
```json
{
  "ingredientId": 4,
  "quantity": 2.5,
  "unit": "kg",
  "reason": "Spoilage",
  "notes": "Bottom box moisture condensation",
  "loggedBy": "Chef Vikram"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Waste recorded (WST-07): 2.5 kg of Tomatoes (Ripe) discarded. Financial loss: ₹100.0.",
  "data": {
    "id": 7,
    "logNumber": "WST-07",
    "quantityLost": 2.5,
    "financialLoss": 100.0,
    "reason": "Spoilage",
    "loggedBy": "Chef Vikram"
  }
}
```

### 5.2 Waste Summary
- **Method**: `GET`
- **Endpoint**: `/api/v1/waste/summary`
- **Response** (`200 OK`): Total financial loss, quantity discarded, and breakdown by cause (*Spoilage, Prep Trimming Loss, Overproduction, Storage Glitch*).

---

## 6. Purchase Orders

### 6.1 Create Purchase Order
- **Method**: `POST`
- **Endpoint**: `/api/v1/purchases`
- **Request Body**:
```json
{
  "supplierName": "Amul Dairy Distributors",
  "leadTime": "12 hours",
  "items": [
    {
      "ingredientId": 2,
      "recommendedPurchase": 15.0,
      "approvedQuantity": 15.0,
      "unit": "kg",
      "unitCost": 320.0
    }
  ]
}
```

### 6.2 Receive Purchase Order Items
- **Method**: `POST`
- **Endpoint**: `/api/v1/purchases/<id>/receive`
- **Business Logic**: Automatically creates `InventoryBatch` records for all line items in the PO and increments ingredient stock.

---

## 7. Reports & Analytics

### 7.1 Dashboard Statistics
- **Method**: `GET`
- **Endpoint**: `/api/v1/reports/dashboard`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "todaySales": 42850.0,
    "salesGrowth": 14.2,
    "predictedOrders": 148,
    "predictedOrderRange": "138 - 158",
    "totalInventoryValue": 148620.0,
    "inventoryItemsCount": 26,
    "lowStockCount": 4,
    "nearExpiryCount": 3,
    "nearExpiryLossRisk": 3420.0,
    "estimatedWasteCost": 1850.0,
    "wasteCostReduction": 32.4,
    "hourlySalesTrend": [...],
    "demandComparison": [...],
    "recentActivities": [...],
    "importantAlerts": [...]
  }
}
```

### 7.2 Sales Analytics & Category Breakdown
- **Method**: `GET`
- **Endpoint**: `/api/v1/reports/sales`
- **Response** (`200 OK`): Monthly P&L financials, COGS ratio, gross margin, and category percentage breakdown.

---

## 8. AI Demand Forecasts

### 8.1 Get Forecast Trajectory
- **Method**: `GET`
- **Endpoint**: `/api/v1/forecasts`
- **Query Parameters**: `menuItemId`, `days` (default: 14)
- **Response** (`200 OK`): Daily predicted quantities with lower and upper confidence bands (95% CI).

### 8.2 Retrain Model
- **Method**: `POST`
- **Endpoint**: `/api/v1/forecasts/retrain`

---

## 9. System Health

### 9.1 Database Health & Counts
- **Method**: `GET`
- **Endpoint**: `/api/v1/health`
- **Response** (`200 OK`):
```json
{
  "status": "healthy",
  "database": {
    "engine": "SQLite (WAL Mode)",
    "orm": "SQLAlchemy 2.x",
    "counts": {
      "users": 5,
      "kitchens": 1,
      "menu_items": 12,
      "ingredients": 26,
      "recipes": 29,
      "sales": 5,
      "inventory_batches": 26,
      "stock_movements": 5,
      "purchases": 2,
      "waste_records": 6,
      "forecasts": 22
    }
  }
}
```

