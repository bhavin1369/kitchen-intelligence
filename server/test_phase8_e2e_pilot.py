import unittest
import json
import io
import csv
from datetime import datetime, date, timedelta
from werkzeug.security import check_password_hash

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models import (
    User, Kitchen, MenuItem, Ingredient, Recipe,
    Sale, SaleItem, InventoryBatch, StockMovement,
    Purchase, PurchaseItem, WasteRecord, Forecast
)
from app.services.inventory_service import convert_quantity, receive_batch, consume_ingredient_fefo
from backup_db import perform_database_backup, list_backups
from restore_db import restore_database


class Phase8PilotE2ETestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.client = cls.app.test_client()

    def setUp(self):
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    # ==========================================
    # 1. AUTHENTICATION & RBAC PERMISSIONS
    # ==========================================
    def test_01_authentication_and_rbac_permissions(self):
        """Test registration, secure password hashing, JWT tokens, and role-based permissions"""
        timestamp = int(datetime.now().timestamp() * 1000)

        # 1. Register admin user
        admin_payload = {
            "username": f"admin_{timestamp}",
            "email": f"admin_{timestamp}@kitchen.test",
            "password": "SecureAdminPassword123!",
            "fullName": "Executive Kitchen Admin",
            "role": "admin"
        }
        res_admin = self.client.post("/api/v1/auth/register", json=admin_payload)
        self.assertEqual(res_admin.status_code, 201)
        admin_data = res_admin.get_json()
        admin_token = admin_data["data"]["token"]
        self.assertIsNotNone(admin_token)
        self.assertEqual(admin_data["data"]["user"]["role"], "admin")

        # 2. Register staff user
        staff_payload = {
            "username": f"staff_{timestamp}",
            "email": f"staff_{timestamp}@kitchen.test",
            "password": "StaffPassword123!",
            "fullName": "Kitchen Line Staff",
            "role": "staff"
        }
        res_staff = self.client.post("/api/v1/auth/register", json=staff_payload)
        self.assertEqual(res_staff.status_code, 201)
        staff_data = res_staff.get_json()
        staff_token = staff_data["data"]["token"]
        self.assertEqual(staff_data["data"]["user"]["role"], "staff")

        # 3. Test secure password hashing
        admin_db = User.query.filter_by(username=admin_payload["username"]).first()
        self.assertIsNotNone(admin_db)
        self.assertTrue(check_password_hash(admin_db.password_hash, admin_payload["password"]))
        self.assertNotEqual(admin_db.password_hash, admin_payload["password"])

        # 4. Access /me with tokens
        res_me_admin = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res_me_admin.status_code, 200)
        self.assertEqual(res_me_admin.get_json()["data"]["role"], "admin")

        res_me_staff = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {staff_token}"})
        self.assertEqual(res_me_staff.status_code, 200)
        self.assertEqual(res_me_staff.get_json()["data"]["role"], "staff")

        # 5. Test RBAC: Staff trying to retrain ML model should be blocked (403 Forbidden)
        res_staff_train = self.client.post(
            "/api/v1/forecasts/train",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        self.assertEqual(res_staff_train.status_code, 403)
        self.assertIn("Forbidden", res_staff_train.get_json()["message"])

        # 6. Test invalid token
        res_bad_tok = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_garbage_token"})
        self.assertEqual(res_bad_tok.status_code, 401)

    # ==========================================
    # 2. UNIT CONVERSIONS & RECIPE BOM
    # ==========================================
    def test_02_unit_conversions_and_recipe_calculations(self):
        """Test unit conversion engine and recipe BOM calculations"""
        # Mass conversions
        self.assertEqual(convert_quantity(500, "g", "kg"), 0.5)
        self.assertEqual(convert_quantity(2.5, "kg", "g"), 2500.0)

        # Volume conversions
        self.assertEqual(convert_quantity(750, "ml", "l"), 0.75)
        self.assertEqual(convert_quantity(3.0, "l", "ml"), 3000.0)

        # Unit / Count conversions
        self.assertEqual(convert_quantity(24, "pcs", "dozen"), 2.0)
        self.assertEqual(convert_quantity(1.5, "dozen", "pcs"), 18.0)

        # Identical units
        self.assertEqual(convert_quantity(10.5, "kg", "kg"), 10.5)

        # Incompatible units should raise ValueError
        with self.assertRaises(ValueError):
            convert_quantity(100, "g", "l")

        # Test recipe costing
        dish = MenuItem.query.filter_by(name="Gujarati Thali").first()
        if not dish:
            dish = MenuItem.query.first()
        self.assertIsNotNone(dish)
        calculated_cost, margin = dish.calculate_cost_and_margin()
        self.assertGreater(calculated_cost, 0.0)
        self.assertGreater(dish.cost_price, 0.0)
        self.assertIsNotNone(dish.margin_percent)

    # ==========================================
    # 3. INVENTORY & EXPIRY ALERTS
    # ==========================================
    def test_03_inventory_updates_and_expiry_alerts(self):
        """Test inventory batch creation, expiry date classification, and FEFO alerts"""
        # Create dedicated test ingredient
        ing_sku = f"TEST-EXP-{int(datetime.now().timestamp())}"
        test_ing = Ingredient(
            sku=ing_sku,
            name=f"Fresh Cream {ing_sku}",
            category="Dairy",
            unit="l",
            current_stock=0.0,
            par_level=10.0,
            reorder_point=4.0,
            unit_cost=180.0,
            shelf_life_days=5
        )
        db.session.add(test_ing)
        db.session.commit()

        today = date.today()

        # Batch 1: Expiring in 1 day (Critical <=48h)
        b1 = receive_batch(
            ingredient=test_ing,
            batch_number=f"B1-{ing_sku}",
            quantity=3.0,
            unit="l",
            unit_cost=180.0,
            received_date=today - timedelta(days=4),
            expiry_date=today + timedelta(days=1),
            supplier_name="Dairy Best",
            reference_id="TEST-PO-01"
        )

        # Batch 2: Expiring in 5 days (Warning <=5d)
        b2 = receive_batch(
            ingredient=test_ing,
            batch_number=f"B2-{ing_sku}",
            quantity=5.0,
            unit="l",
            unit_cost=180.0,
            received_date=today,
            expiry_date=today + timedelta(days=5),
            supplier_name="Dairy Best",
            reference_id="TEST-PO-02"
        )
        db.session.commit()

        # Verify stock sum
        self.assertEqual(test_ing.current_stock, 8.0)

        # Test expiry alerts endpoint
        res = self.client.get("/api/v1/waste/expiry-alerts")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("critical", data)
        self.assertIn("warning", data)

        # Verify FEFO consumption: should consume from B1 (earlier expiry) first
        deducted = consume_ingredient_fefo(test_ing, 2.0, "l", reference_id="TEST-PREP-01")
        db.session.commit()
        self.assertEqual(len(deducted), 1)
        self.assertEqual(deducted[0].batch.batch_number, f"B1-{ing_sku}")
        self.assertEqual(abs(deducted[0].quantity), 2.0)
        self.assertEqual(b1.remaining_quantity, 1.0)
        self.assertEqual(b2.remaining_quantity, 5.0)

    # ==========================================
    # 4. CSV EXPORTS & CSV UPLOAD
    # ==========================================
    def test_04_csv_exports_and_sales_upload(self):
        """Test multi-domain CSV exports and CSV sales bulk upload"""
        # 1. Test Sales CSV Export
        res_sales_csv = self.client.get("/api/v1/reports/sales/export/csv")
        self.assertEqual(res_sales_csv.status_code, 200)
        self.assertEqual(res_sales_csv.content_type, "text/csv; charset=utf-8")
        csv_text = res_sales_csv.data.decode("utf-8")
        self.assertIn("Sale_ID", csv_text)
        self.assertIn("Menu_Item", csv_text)

        # 2. Test Forecasts CSV Export
        res_fc_csv = self.client.get("/api/v1/reports/forecasts/export/csv?days=7")
        self.assertEqual(res_fc_csv.status_code, 200)
        fc_text = res_fc_csv.data.decode("utf-8")
        self.assertIn("Forecast_Date", fc_text)
        self.assertIn("Predicted_Portions", fc_text)

        # 3. Test Model Performance CSV Export
        res_ev_csv = self.client.get("/api/v1/reports/model-performance/export/csv")
        self.assertEqual(res_ev_csv.status_code, 200)
        ev_text = res_ev_csv.data.decode("utf-8")
        self.assertIn("Model_Name", ev_text)
        self.assertIn("MAE", ev_text)

        # 4. Test Inventory Valuation CSV Export
        res_inv_csv = self.client.get("/api/v1/reports/inventory/export/csv")
        self.assertEqual(res_inv_csv.status_code, 200)
        inv_text = res_inv_csv.data.decode("utf-8")
        self.assertIn("SKU", inv_text)
        self.assertIn("Total_Valuation_INR", inv_text)

        # 5. Test Purchases CSV Export
        res_po_csv = self.client.get("/api/v1/reports/purchases/export/csv")
        self.assertEqual(res_po_csv.status_code, 200)
        po_text = res_po_csv.data.decode("utf-8")
        self.assertIn("PO_Number", po_text)

        # 6. Test Food Waste CSV Export
        res_waste_csv = self.client.get("/api/v1/waste/export/csv")
        self.assertEqual(res_waste_csv.status_code, 200)
        waste_text = res_waste_csv.data.decode("utf-8")
        self.assertIn("Log Number", waste_text)

        # 7. Test Financial Summary CSV Export
        res_fin_csv = self.client.get("/api/v1/reports/financial/export/csv")
        self.assertEqual(res_fin_csv.status_code, 200)
        fin_text = res_fin_csv.data.decode("utf-8")
        self.assertIn("Gross Monthly Revenue", fin_text)

        # 8. Test Sales CSV Upload
        dish = MenuItem.query.first()
        csv_content = (
            "order_number,date,item_name,quantity,unit_price,payment_method,meal_period\n"
            f"CSV-PILOT-01,2026-11-13,{dish.name},5,{dish.price},UPI,Lunch\n"
        )
        data = {
            "file": (io.BytesIO(csv_content.encode("utf-8")), "pilot_sales.csv")
        }
        res_upload = self.client.post("/api/v1/sales/upload-csv", data=data, content_type="multipart/form-data")
        self.assertEqual(res_upload.status_code, 200)
        self.assertTrue(res_upload.get_json()["success"])

    # ==========================================
    # 5. DATABASE BACKUP & RESTORATION
    # ==========================================
    def test_05_database_backup_and_recovery(self):
        """Test point-in-time online SQLite backup creation, listing, and integrity verification"""
        backup_result = perform_database_backup()
        self.assertTrue(backup_result["success"])
        self.assertIn("backup_kitchen_intelligence_", backup_result["filename"])
        self.assertEqual(backup_result["integrityCheck"], "ok")
        self.assertGreater(backup_result["sizeKb"], 0)

        # Test listing backups
        backups = list_backups()
        self.assertGreater(len(backups), 0)
        self.assertTrue(any(b["filename"] == backup_result["filename"] for b in backups))

    # ==========================================
    # 6. COMPLETE END-TO-END OPERATIONAL PIPELINE
    # ==========================================
    def test_06_complete_end_to_end_operational_pipeline(self):
        """
        Complete Real-World Kitchen Cycle:
        Sales Entry -> Model Retraining -> Demand Forecast -> Recipe BOM Explosion ->
        Purchase Recommendations -> PO Creation -> PO Receipt into FEFO Batches ->
        POS Sale Consumption -> Food Waste Logging -> Environmental Accounting.
        """
        # Step A: Create dish with recipe BOM
        ts = int(datetime.now().timestamp())
        dish_name = f"Paneer Kathi Roll {ts}"
        dish = MenuItem(
            name=dish_name,
            category="Snacks",
            price=140.0,
            cost_price=45.0,
            is_available=True,
            is_veg=True,
            kitchen_id=1
        )
        db.session.add(dish)
        db.session.flush()

        # Add ingredients for this dish
        ing_roll_paneer = Ingredient(
            sku=f"ING-PAN-{ts}",
            name=f"Cottage Cheese {ts}",
            category="Dairy",
            unit="kg",
            current_stock=0.0,
            par_level=15.0,
            reorder_point=5.0,
            unit_cost=320.0,
            shelf_life_days=5
        )
        ing_roll_roti = Ingredient(
            sku=f"ING-ROT-{ts}",
            name=f"Paratha Base {ts}",
            category="Bakery",
            unit="pcs",
            current_stock=0.0,
            par_level=50.0,
            reorder_point=20.0,
            unit_cost=8.0,
            shelf_life_days=3
        )
        db.session.add_all([ing_roll_paneer, ing_roll_roti])
        db.session.flush()

        # Recipe: 0.1 kg paneer + 1 pcs paratha per serving
        rec1 = Recipe(menu_item_id=dish.id, ingredient_id=ing_roll_paneer.id, quantity=0.1, unit="kg")
        rec2 = Recipe(menu_item_id=dish.id, ingredient_id=ing_roll_roti.id, quantity=1.0, unit="pcs")
        db.session.add_all([rec1, rec2])
        db.session.commit()

        # Step B: Record historical sales so ML model sees sales history
        for day_offset in range(14, 0, -1):
            s_d = datetime.combine(date.today() - timedelta(days=day_offset), datetime.min.time()) + timedelta(hours=13)
            sale = Sale(
                order_number=f"E2E-HIST-{ts}-{day_offset}",
                order_timestamp=s_d,
                total_amount=140.0 * 20,
                status="completed",
                payment_method="UPI",
                channel="Dine-in",
                kitchen_id=1
            )
            db.session.add(sale)
            db.session.flush()
            s_item = SaleItem(sale_id=sale.id, menu_item_id=dish.id, quantity=20, unit_price=140.0, subtotal=2800.0)
            db.session.add(s_item)
        db.session.commit()

        # Step C: Generate Demand Forecast for dish
        res_fc = self.client.get(f"/api/v1/forecasts?menuItemId={dish.id}&days=3")
        self.assertEqual(res_fc.status_code, 200)
        fc_data = res_fc.get_json()
        self.assertTrue(fc_data["success"])
        forecast_items = fc_data.get("itemForecasts") or fc_data.get("forecasts", [])
        self.assertGreater(len(forecast_items), 0)
        predicted_portions = sum(f.get("predicted", f.get("predictedQuantity", 0)) for f in forecast_items)
        self.assertGreater(predicted_portions, 0)

        # Step D: BOM Requirement Explosion for the forecasted demand
        res_reqs = self.client.get("/api/v1/purchases/requirements?days=3")
        self.assertEqual(res_reqs.status_code, 200)
        req_data = res_reqs.get_json()
        self.assertTrue(req_data["success"])

        # Step E: Purchase Recommendations (Purchase Qty = Max(0, Req + Safety - Usable))
        res_recs = self.client.get("/api/v1/purchases/recommendations?days=3")
        self.assertEqual(res_recs.status_code, 200)
        recs_data = res_recs.get_json()
        self.assertTrue(recs_data["success"])

        # Step F: Create Purchase Order (PO) draft
        po_payload = {
            "supplierName": "Metro Cash & Carry",
            "notes": "E2E Automated Procurement Run",
            "expectedDeliveryDate": (date.today() + timedelta(days=1)).isoformat(),
            "items": [
                {
                    "ingredientId": ing_roll_paneer.id,
                    "quantity": 10.0,
                    "unit": "kg",
                    "unitCost": 320.0
                },
                {
                    "ingredientId": ing_roll_roti.id,
                    "quantity": 50.0,
                    "unit": "pcs",
                    "unitCost": 8.0
                }
            ]
        }
        res_po = self.client.post("/api/v1/purchases", json=po_payload)
        self.assertEqual(res_po.status_code, 201)
        po_id = res_po.get_json()["data"]["id"]

        # Step G: Receive PO into active FEFO batches
        res_recv = self.client.post(f"/api/v1/purchases/{po_id}/receive")
        self.assertEqual(res_recv.status_code, 200)

        # Refresh ingredients from DB
        db.session.refresh(ing_roll_paneer)
        db.session.refresh(ing_roll_roti)
        self.assertEqual(ing_roll_paneer.current_stock, 10.0)
        self.assertEqual(ing_roll_roti.current_stock, 50.0)

        # Step H: Record POS Sale -> Automatic FEFO ingredient deduction
        sale_payload = {
            "menuItemId": dish.id,
            "quantity": 15,
            "unitPrice": 140.0,
            "paymentMethod": "UPI",
            "mealPeriod": "Dinner"
        }
        res_sale = self.client.post("/api/v1/sales", json=sale_payload)
        self.assertEqual(res_sale.status_code, 201)

        # Check that stock was automatically deducted via FEFO
        db.session.refresh(ing_roll_paneer)
        db.session.refresh(ing_roll_roti)
        # 15 rolls * 0.1 kg = 1.5 kg consumed -> 10.0 - 1.5 = 8.5 kg remaining
        self.assertAlmostEqual(ing_roll_paneer.current_stock, 8.5, places=2)
        # 15 rolls * 1 pcs = 15 pcs consumed -> 50.0 - 15 = 35 pcs remaining
        self.assertEqual(ing_roll_roti.current_stock, 35.0)

        # Step I: Record food waste event
        waste_payload = {
            "itemType": "dish",
            "itemId": dish.id,
            "quantity": 2,
            "reason": "overproduction",
            "notes": "Unsold rolls at end of dinner service"
        }
        res_waste = self.client.post("/api/v1/waste", json=waste_payload)
        self.assertEqual(res_waste.status_code, 201)
        waste_data = res_waste.get_json()["data"]
        # Financial loss = 2 * cost_price (45.0) = 90.0
        self.assertEqual(waste_data["financialLoss"], 90.0)

        # Step J: Check Environmental Impact Tracker
        res_env = self.client.get("/api/v1/environmental/impact?days=7")
        self.assertEqual(res_env.status_code, 200)
        env_raw = res_env.get_json()
        env_data = env_raw.get("summary") or env_raw
        self.assertIn("actualWasteLoggedKg", env_data)
        self.assertIn("actualCO2eKg", env_data)
        self.assertIn("actualWaterLiters", env_data)

        # Step K: Check Daily Action Plan
        today_str = date.today().isoformat()
        res_plan = self.client.get(f"/api/v1/action-plan?date={today_str}")
        self.assertEqual(res_plan.status_code, 200)
        plan_raw = res_plan.get_json()
        plan_data = plan_raw.get("data") or plan_raw
        self.assertIn("menuTargets", plan_data)
        self.assertIn("prepTasks", plan_data)
        self.assertIn("fefoPriorities", plan_data)


if __name__ == "__main__":
    unittest.main()
