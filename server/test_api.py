"""
Comprehensive Automated Test Suite for Kitchen Intelligence REST APIs.
Tests all endpoints, business rules, FEFO inventory deductions, and error handling.
"""
import unittest
import io
from app import create_app
from app.extensions import db
from app.models import (
    User, Kitchen, MenuItem, Ingredient, Recipe,
    Sale, InventoryBatch, StockMovement, WasteRecord, Purchase
)

class KitchenIntelligenceAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    # 1. Health & Status
    def test_01_health_check(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)
        self.assertGreater(data["database"]["counts"]["menu_items"], 0)

    # 2. Authentication
    def test_02_auth_workflow(self):
        # Login with seeded chef account
        login_res = self.client.post("/api/v1/auth/login", json={
            "username": "chef_vikram",
            "password": "chef123"
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.get_json()
        self.assertTrue(login_data["success"])
        token = login_data["data"]["token"]
        self.assertIsNotNone(token)

        # Access /me with token
        me_res = self.client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["data"]["username"], "chef_vikram")

        # Test invalid password
        bad_login = self.client.post("/api/v1/auth/login", json={
            "username": "chef_vikram",
            "password": "wrongpassword"
        })
        self.assertEqual(bad_login.status_code, 401)

    # 3. Menu & Recipe BOM Management
    def test_03_menu_and_recipe_management(self):
        # Get canteen menu items
        res = self.client.get("/api/v1/menu")
        self.assertEqual(res.status_code, 200)
        items = res.get_json()["data"]
        dish_names = [i["name"] for i in items]
        self.assertIn("Gujarati Thali", dish_names)
        self.assertIn("Dosa", dish_names)
        self.assertIn("Tea", dish_names)

        # Add new menu item
        new_dish_res = self.client.post("/api/v1/menu", json={
            "name": "Upma",
            "category": "South Indian",
            "price": 45.0,
            "costPrice": 14.0,
            "isVeg": True,
            "prepTimeMinutes": 10,
            "description": "Roasted semolina tempered with mustard, ginger and curry leaves"
        })
        self.assertEqual(new_dish_res.status_code, 201)
        dish_id = new_dish_res.get_json()["data"]["id"]

        # Toggle activation/deactivation
        toggle_res = self.client.put(f"/api/v1/menu/{dish_id}", json={
            "isAvailable": False
        })
        self.assertEqual(toggle_res.status_code, 200)
        self.assertFalse(toggle_res.get_json()["data"]["isAvailable"])

        # Add ingredient to recipe BOM
        ing = Ingredient.query.filter_by(name="Whole Wheat Flour (Atta)").first()
        self.assertIsNotNone(ing)

        recipe_res = self.client.post("/api/v1/recipes", json={
            "menuItemId": dish_id,
            "ingredientId": ing.id,
            "quantity": 0.15,
            "unit": "kg",
            "prepLossPercentage": 3.0
        })
        self.assertEqual(recipe_res.status_code, 201)
        recipe_id = recipe_res.get_json()["data"]["id"]

        # Update recipe quantity
        upd_rec = self.client.put(f"/api/v1/recipes/{recipe_id}", json={
            "quantity": 0.18
        })
        self.assertEqual(upd_rec.status_code, 200)
        self.assertEqual(upd_rec.get_json()["data"]["quantityPerPortion"], 0.18)

        # Inspect BOM
        bom_res = self.client.get(f"/api/v1/recipes/{dish_id}")
        self.assertEqual(bom_res.status_code, 200)
        self.assertEqual(len(bom_res.get_json()["ingredients"]), 1)

    # 4. Inventory & FEFO Batches
    def test_04_inventory_and_batches(self):
        # Get ingredients
        res = self.client.get("/api/v1/inventory/ingredients")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]
        self.assertGreater(len(data), 0)

        # Receive new batch
        ing = Ingredient.query.filter_by(name="Whole Milk").first()
        old_stock = ing.current_stock

        batch_res = self.client.post("/api/v1/inventory/batches", json={
            "ingredientId": ing.id,
            "batchNumber": "TEST-MLK-99",
            "quantity": 10.0,
            "unit": "l",
            "unitCost": 60.0,
            "expiryDate": "2026-11-25",
            "supplierName": "Amul Dairy Distributors"
        })
        self.assertEqual(batch_res.status_code, 201)

        # Verify stock incremented
        db.session.refresh(ing)
        self.assertAlmostEqual(ing.current_stock, old_stock + 10.0, places=2)

    # 5. Sales & Closed-Loop FEFO Inventory Deduction
    def test_05_sales_and_fefo_deduction(self):
        # Get Gujarati Thali dish
        thali = MenuItem.query.filter_by(name="Gujarati Thali").first()
        self.assertIsNotNone(thali)

        # Check Atta ingredient stock before sale
        atta = Ingredient.query.filter_by(name="Whole Wheat Flour (Atta)").first()
        atta_initial = atta.current_stock

        # Create a sale for 2 portions of Gujarati Thali
        sale_res = self.client.post("/api/v1/sales", json={
            "channel": "Dine-in",
            "tableNumber": "Table 3",
            "customerName": "Ketan Shah",
            "paymentMethod": "UPI",
            "salesDate": "2026-11-13",
            "items": [
                {"menuItemId": thali.id, "quantity": 2}
            ]
        })
        self.assertEqual(sale_res.status_code, 201)
        sale_data = sale_res.get_json()["data"]
        sale_id = sale_data["id"]
        self.assertEqual(sale_data["status"], "completed")

        # Verify Atta stock was deducted
        db.session.refresh(atta)
        self.assertLess(atta.current_stock, atta_initial)

        # Verify stock movement record created
        mov = StockMovement.query.filter_by(reference_id=sale_data["orderNumber"]).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.movement_type, "sales_consumption")

        # Test Editing Sale
        edit_res = self.client.put(f"/api/v1/sales/{sale_id}", json={
            "customerName": "Ketan C. Shah",
            "tableNumber": "Table 5"
        })
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.get_json()["data"]["customerName"], "Ketan C. Shah")

        # Test filtering sales by period and menu item
        filter_res = self.client.get(f"/api/v1/sales?menuItemId={thali.id}&period=all")
        self.assertEqual(filter_res.status_code, 200)
        self.assertGreater(filter_res.get_json()["total"], 0)

        # Test Business Rule: Never allow negative inventory
        excess_res = self.client.post("/api/v1/sales", json={
            "channel": "Dine-in",
            "items": [
                {"menuItemId": thali.id, "quantity": 5000}
            ]
        })
        self.assertEqual(excess_res.status_code, 400)
        self.assertIn("Insufficient usable stock", excess_res.get_json()["message"])

        # Test Delete Sale
        del_res = self.client.delete(f"/api/v1/sales/{sale_id}")
        self.assertEqual(del_res.status_code, 200)

    # 6. CSV Sales History Upload & Validation
    def test_06_sales_csv_upload(self):
        import time
        t_id = int(time.time())
        # Valid CSV
        valid_csv = (
            f"order_number,date,item_name,quantity,channel,table_number,customer_name,payment_method\n"
            f"CSV-{t_id}-1,2026-11-12,Dosa,1,Dine-in,Table 2,Aarav,UPI\n"
            f"CSV-{t_id}-2,2026-11-12,Tea,1,Takeaway,,Bhavin,Cash\n"
        )
        csv_file = io.BytesIO(valid_csv.encode("utf-8"))
        res = self.client.post("/api/v1/sales/upload-csv", data={
            "file": (csv_file, "sales_canteen.csv")
        }, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.get_json()["data"]["ordersImported"], 1)

        # Invalid CSV (missing quantity and item_name)
        bad_csv = "random_col1,random_col2\n1,2\n"
        bad_file = io.BytesIO(bad_csv.encode("utf-8"))
        bad_res = self.client.post("/api/v1/sales/upload-csv", data={
            "file": (bad_file, "bad_sales.csv")
        }, content_type="multipart/form-data")
        self.assertEqual(bad_res.status_code, 400)
        self.assertIn("missing required columns", bad_res.get_json()["message"])

    # 7. Waste Management
    def test_07_waste_management(self):
        tomato = Ingredient.query.filter_by(name="Tomatoes (Ripe)").first()
        if tomato.current_stock < 5.0:
            tomato.current_stock = 15.0
            db.session.commit()
        initial_stock = tomato.current_stock

        waste_res = self.client.post("/api/v1/waste", json={
            "ingredientId": tomato.id,
            "quantity": 1.0,
            "unit": "kg",
            "reason": "Spoilage",
            "loggedBy": "Chef Vikram",
            "notes": "Moisture soft spots in test crate"
        })
        self.assertEqual(waste_res.status_code, 201)

        # Verify stock was deducted
        db.session.refresh(tomato)
        self.assertAlmostEqual(tomato.current_stock, initial_stock - 1.0, places=2)

    # 8. Reports & Dashboard Statistics
    def test_08_reports_dashboard(self):
        res = self.client.get("/api/v1/reports/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()["data"]

        # Verify all 10 required dashboard fields exist
        self.assertIn("todaySales", data)
        self.assertIn("predictedOrders", data)
        self.assertIn("totalInventoryValue", data)
        self.assertIn("lowStockCount", data)
        self.assertIn("nearExpiryCount", data)
        self.assertIn("estimatedWasteCost", data)
        self.assertIn("hourlySalesTrend", data)
        self.assertIn("demandComparison", data)
        self.assertIn("recentActivities", data)
        self.assertIn("importantAlerts", data)

if __name__ == "__main__":
    unittest.main()
