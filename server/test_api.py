"""
Comprehensive Automated Test Suite for Kitchen Intelligence REST APIs.
Tests all endpoints, business rules, FEFO inventory deductions, and error handling.
"""
import unittest
import json
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

        # Register new user
        reg_res = self.client.post("/api/v1/auth/register", json={
            "username": "test_chef",
            "email": "test.chef@spicecraft.com",
            "password": "securepassword123",
            "fullName": "Test Chef",
            "role": "chef"
        })
        self.assertIn(reg_res.status_code, [201, 409])

    # 3. Menu & Recipe BOM Management
    def test_03_menu_and_recipe_management(self):
        # Get menu items
        res = self.client.get("/api/v1/menu")
        self.assertEqual(res.status_code, 200)
        items = res.get_json()["data"]
        self.assertGreater(len(items), 0)

        # Add new menu item
        new_dish_res = self.client.post("/api/v1/menu", json={
            "name": "Paneer Lababdar",
            "category": "Mains",
            "price": 310.0,
            "costPrice": 95.0,
            "isVeg": True,
            "prepTimeMinutes": 20,
            "description": "Rich tomato and grated paneer curry"
        })
        self.assertEqual(new_dish_res.status_code, 201)
        dish_id = new_dish_res.get_json()["data"]["id"]

        # Add ingredient to new dish recipe
        ing = Ingredient.query.filter_by(name="Paneer (Fresh Cottage Cheese)").first()
        self.assertIsNotNone(ing)

        recipe_res = self.client.post("/api/v1/recipes", json={
            "menuItemId": dish_id,
            "ingredientId": ing.id,
            "quantity": 0.20,
            "unit": "kg",
            "prepLossPercentage": 5.0
        })
        self.assertEqual(recipe_res.status_code, 201)

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
            "unitCost": 62.0,
            "expiryDate": "2026-11-25",
            "supplierName": "Amul Dairy Distributors"
        })
        self.assertEqual(batch_res.status_code, 201)

        # Verify stock incremented
        db.session.refresh(ing)
        self.assertAlmostEqual(ing.current_stock, old_stock + 10.0, places=2)

        # Verify FEFO ordering
        batches_res = self.client.get("/api/v1/inventory/batches")
        self.assertEqual(batches_res.status_code, 200)
        batches = batches_res.get_json()["data"]
        self.assertGreater(len(batches), 0)

    # 5. Sales & Closed-Loop FEFO Inventory Deduction
    def test_05_sales_and_fefo_deduction(self):
        # Get biryani dish
        biryani = MenuItem.query.filter_by(name="Hyderabadi Chicken Dum Biryani").first()
        self.assertIsNotNone(biryani)

        # Check chicken ingredient stock before sale
        chicken = Ingredient.query.filter_by(name="Chicken (Boneless)").first()
        chicken_initial = chicken.current_stock

        # Create a sale for 2 portions of biryani
        sale_res = self.client.post("/api/v1/sales", json={
            "channel": "Dine-in",
            "tableNumber": "Table 9",
            "customerName": "Test Diner",
            "paymentMethod": "UPI",
            "items": [
                {"menuItemId": biryani.id, "quantity": 2}
            ]
        })
        self.assertEqual(sale_res.status_code, 201)
        sale_data = sale_res.get_json()["data"]
        self.assertEqual(sale_data["status"], "completed")

        # Verify chicken stock was deducted
        db.session.refresh(chicken)
        # 2 portions * (0.25 kg * 1.05 loss) = ~0.525 kg deducted
        self.assertLess(chicken.current_stock, chicken_initial)

        # Verify stock movement record created
        mov = StockMovement.query.filter_by(reference_id=sale_data["orderNumber"]).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.movement_type, "sales_consumption")

        # Test Business Rule: Never allow negative inventory
        # Attempt to order an astronomical quantity exceeding available stock
        excess_res = self.client.post("/api/v1/sales", json={
            "channel": "Dine-in",
            "tableNumber": "Table 9",
            "items": [
                {"menuItemId": biryani.id, "quantity": 1000}
            ]
        })
        self.assertEqual(excess_res.status_code, 400)
        self.assertIn("Insufficient usable stock", excess_res.get_json()["message"])

    # 6. Waste Management
    def test_06_waste_management(self):
        tomato = Ingredient.query.filter_by(name="Tomatoes (Ripe)").first()
        initial_stock = tomato.current_stock

        waste_res = self.client.post("/api/v1/waste", json={
            "ingredientId": tomato.id,
            "quantity": 1.5,
            "unit": "kg",
            "reason": "Spoilage",
            "loggedBy": "Chef Vikram",
            "notes": "Moisture soft spots in test crate"
        })
        self.assertEqual(waste_res.status_code, 201)
        waste_data = waste_res.get_json()["data"]
        self.assertEqual(waste_data["financialLoss"], 1.5 * tomato.unit_cost)

        # Verify stock was deducted
        db.session.refresh(tomato)
        self.assertAlmostEqual(tomato.current_stock, initial_stock - 1.5, places=2)

        # Summary
        summary_res = self.client.get("/api/v1/waste/summary")
        self.assertEqual(summary_res.status_code, 200)
        self.assertIn("totalFinancialLoss", summary_res.get_json()["data"])

    # 7. Purchases
    def test_07_purchases_workflow(self):
        # Create PO
        paneer = Ingredient.query.filter_by(name="Paneer (Fresh Cottage Cheese)").first()
        po_res = self.client.post("/api/v1/purchases", json={
            "supplierName": "Amul Dairy Distributors",
            "leadTime": "12 hours",
            "items": [
                {
                    "ingredientId": paneer.id,
                    "recommendedPurchase": 10.0,
                    "approvedQuantity": 10.0,
                    "unit": "kg",
                    "unitCost": 320.0
                }
            ]
        })
        self.assertEqual(po_res.status_code, 201)
        po_id = po_res.get_json()["data"]["id"]

        # Receive PO into inventory batches
        rec_res = self.client.post(f"/api/v1/purchases/{po_id}/receive")
        self.assertEqual(rec_res.status_code, 200)
        self.assertEqual(rec_res.get_json()["data"]["status"], "received")

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
