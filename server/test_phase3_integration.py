import unittest
import json
import io
from datetime import date
from app import create_app
from app.extensions import db
from app.models import MenuItem, Recipe, Ingredient, Sale, SaleItem, InventoryBatch, StockMovement

class Phase3IntegrationTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_menu_management_crud(self):
        """Test Menu item creation, retrieval, availability toggling, update, and deletion"""
        # 1. Verify seeded canteen items
        res = self.client.get("/api/v1/menu")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(data["total"], 8)
        names = [item["name"] for item in data["data"]]
        self.assertIn("Gujarati Thali", names)
        self.assertIn("Paneer Butter Masala", names)
        self.assertIn("Tea", names)

        # 2. Create new dish
        new_dish_payload = {
            "name": "Masala Dosa Special",
            "category": "South Indian",
            "price": 95.0,
            "costPrice": 28.0,
            "prepTimeMinutes": 12,
            "isVeg": True,
            "description": "Extra crispy spiced potato dosa with gunpowder and pure ghee."
        }
        res_create = self.client.post("/api/v1/menu", json=new_dish_payload)
        self.assertEqual(res_create.status_code, 201)
        created_dish = res_create.get_json()["data"]
        dish_id = created_dish["id"]
        self.assertEqual(created_dish["name"], "Masala Dosa Special")
        self.assertEqual(created_dish["price"], 95.0)

        # 3. Toggle availability
        res_toggle = self.client.put(f"/api/v1/menu/{dish_id}", json={"isAvailable": False})
        self.assertEqual(res_toggle.status_code, 200)
        self.assertFalse(res_toggle.get_json()["data"]["isAvailable"])

        # 4. Update dish details
        res_update = self.client.put(f"/api/v1/menu/{dish_id}", json={"price": 105.0, "isAvailable": True})
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.get_json()["data"]["price"], 105.0)
        self.assertTrue(res_update.get_json()["data"]["isAvailable"])

        # 5. Delete dish
        res_del = self.client.delete(f"/api/v1/menu/{dish_id}")
        self.assertEqual(res_del.status_code, 200)
        res_check = self.client.get(f"/api/v1/menu/{dish_id}")
        self.assertEqual(res_check.status_code, 404)

    def test_02_recipe_management_bom_and_margin(self):
        """Test Recipe BOM creation, ingredient linkage, portion quantity updates, and cost recalculations"""
        # Find Tea dish
        tea = MenuItem.query.filter_by(name="Tea").first()
        self.assertIsNotNone(tea)

        # Fetch its recipe
        res = self.client.get(f"/api/v1/recipes/{tea.id}")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["ingredients"]), 3) # Milk, Tea leaves, Sugar

        # Add Cardamom as extra ingredient to Tea
        cardamom = Ingredient.query.filter_by(name="Garam Masala & Curry Spices Blend").first()
        res_add = self.client.post("/api/v1/recipes", json={
            "menuItemId": tea.id,
            "ingredientId": cardamom.id,
            "quantity": 0.002,
            "unit": "kg",
            "prepLossPercentage": 0.0
        })
        self.assertEqual(res_add.status_code, 201)
        added_recipe = res_add.get_json()["data"]
        recipe_id = added_recipe["id"]

        # Verify cost recalculation
        res_after = self.client.get(f"/api/v1/recipes/{tea.id}")
        self.assertGreater(res_after.get_json()["dish"]["costPrice"], 0)

        # Update recipe portion quantity
        res_put = self.client.put(f"/api/v1/recipes/{recipe_id}", json={
            "quantity": 0.004,
            "prepLossPercentage": 2.0
        })
        self.assertEqual(res_put.status_code, 200)
        self.assertEqual(res_put.get_json()["data"]["quantityPerPortion"], 0.004)

        # Delete recipe ingredient
        res_rem = self.client.delete(f"/api/v1/recipes/{recipe_id}")
        self.assertEqual(res_rem.status_code, 200)

    def test_03_sales_creation_and_fefo_persistence(self):
        """Test adding daily sale with custom date, verifying DB persistence & FEFO deduction"""
        thali = MenuItem.query.filter_by(name="Gujarati Thali").first()
        atta = Ingredient.query.filter_by(name="Whole Wheat Flour (Atta)").first()
        initial_atta_stock = atta.current_stock

        sale_payload = {
            "salesDate": "2026-11-13",
            "channel": "Dine-in",
            "tableNumber": "Table 5",
            "customerName": "Test Customer",
            "paymentMethod": "UPI",
            "items": [
                {"menuItemId": thali.id, "quantity": 1}
            ],
            "notes": "Mild spice"
        }

        res = self.client.post("/api/v1/sales", json=sale_payload)
        self.assertEqual(res.status_code, 201)
        sale_data = res.get_json()["data"]
        sale_id = sale_data["id"]
        self.assertEqual(sale_data["totalAmount"], round(thali.price * 1 * 1.05, 2))

        # Check stock deduction
        db.session.refresh(atta)
        self.assertLess(atta.current_stock, initial_atta_stock)

        # Retrieve sale to verify DB persistence
        res_get = self.client.get(f"/api/v1/sales/{sale_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.get_json()["data"]["customerName"], "Test Customer")
        self.assertEqual(res_get.get_json()["data"]["tableNumber"], "Table 5")

        # Edit sale
        res_edit = self.client.put(f"/api/v1/sales/{sale_id}", json={
            "customerName": "Updated Customer",
            "status": "completed",
            "tableNumber": "Table 9"
        })
        self.assertEqual(res_edit.status_code, 200)
        self.assertEqual(res_edit.get_json()["data"]["customerName"], "Updated Customer")

        # Delete sale
        res_del = self.client.delete(f"/api/v1/sales/{sale_id}")
        self.assertEqual(res_del.status_code, 200)
        res_del_check = self.client.get(f"/api/v1/sales/{sale_id}")
        self.assertEqual(res_del_check.status_code, 404)

    def test_04_sales_csv_upload_and_import(self):
        """Test CSV file upload and validation for sales orders"""
        import time
        t_id = int(time.time())
        csv_data = (
            f"order_number,date,item_name,quantity,channel,table_number,customer_name,payment_method\n"
            f"CSV-P3-{t_id}-1,2026-11-13,Tea,1,Dine-in,Table 1,Chai Lover,Cash\n"
            f"CSV-P3-{t_id}-2,2026-11-13,Sandwich,1,Takeaway,,Quick Snack,UPI\n"
        )
        data = {
            "file": (io.BytesIO(csv_data.encode("utf-8")), "canteen_sales.csv")
        }
        res = self.client.post("/api/v1/sales/upload-csv", data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 200)
        resp_data = res.get_json()
        self.assertTrue(resp_data["success"])
        self.assertEqual(resp_data["data"]["ordersImported"], 2)

    def test_05_sales_filtering_by_period_dish_and_date(self):
        """Test filtering sales by daily, weekly, monthly, menu item, and date range"""
        # Filter by menu item
        thali = MenuItem.query.filter_by(name="Gujarati Thali").first()
        res_dish = self.client.get(f"/api/v1/sales?menuItemId={thali.id}")
        self.assertEqual(res_dish.status_code, 200)
        data_dish = res_dish.get_json()
        self.assertTrue(data_dish["success"])

        # Filter by period = monthly
        res_month = self.client.get("/api/v1/sales?period=monthly")
        self.assertEqual(res_month.status_code, 200)
        self.assertTrue(res_month.get_json()["success"])

        # Filter by date range
        res_range = self.client.get("/api/v1/sales?startDate=2026-11-01&endDate=2026-11-13")
        self.assertEqual(res_range.status_code, 200)
        self.assertTrue(res_range.get_json()["success"])

if __name__ == "__main__":
    unittest.main()
