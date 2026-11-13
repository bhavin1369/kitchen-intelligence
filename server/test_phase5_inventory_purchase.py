"""
Automated Test Suite for Phase 5 — Smart Inventory and Purchase Optimization.
Verifies:
1. Ingredient requirement calculation across dishes (BOM recipe explosion)
2. Handling of shared ingredients across multiple menu items (e.g. Basmati Rice, Potatoes, Milk, Butter)
3. Unit conversions (g -> kg, ml -> l) and prep loss shrinkage
4. Purchase recommendation engine: Purchase Qty = Max(0, Required + Safety - Usable)
5. Strict exclusion of expired batches from usable stock
6. Purchase Order lifecycle: Draft -> Ordered -> Received
7. Atomic stock intake & batch creation upon PO receipt
8. FEFO stock consumption and negative stock prevention
9. REST API endpoints for inventory and purchase optimization
"""
import unittest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.models import (
    Ingredient, InventoryBatch, StockMovement,
    Recipe, MenuItem, Forecast, Purchase, PurchaseItem
)
from app.services.purchase_service import (
    calculate_ingredient_requirements,
    generate_purchase_recommendations,
    record_stock_consumption
)
from app.services.inventory_service import receive_batch, consume_ingredient_fefo


class Phase5InventoryPurchaseTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_ingredient_requirements_calculation_and_shared_ingredients(self):
        """Verify BOM explosion and shared ingredient aggregation across multiple dishes"""
        res = calculate_ingredient_requirements(days_ahead=3)
        self.assertIn("requirements", res)
        self.assertGreater(res["totalForecastedPortions"], 0)
        reqs = res["requirements"]

        # Check for shared ingredients
        # 1. Potatoes are used in: Gujarati Thali, Vegetable Pulao, Sandwich, Dosa
        potato_ing = Ingredient.query.filter(Ingredient.name.ilike("%Potato%")).first()
        self.assertIsNotNone(potato_ing, "Potato ingredient must exist")
        self.assertIn(potato_ing.id, reqs, "Potato must be present in requirements")
        potato_req = reqs[potato_ing.id]
        self.assertGreater(potato_req["totalRequired"], 0)
        contributing_dishes = [d["dishName"] for d in potato_req["contributingDishes"]]
        self.assertGreaterEqual(len(contributing_dishes), 2, "Potato should be shared across multiple dishes")

        # 2. Basmati Rice is used in Gujarati Thali and Vegetable Pulao
        rice_ing = Ingredient.query.filter(Ingredient.name.ilike("%Rice%")).first()
        self.assertIsNotNone(rice_ing, "Rice ingredient must exist")
        self.assertIn(rice_ing.id, reqs, "Rice must be present in requirements")
        rice_req = reqs[rice_ing.id]
        rice_dishes = [d["dishName"] for d in rice_req["contributingDishes"]]
        self.assertIn("Gujarati Thali", rice_dishes)
        self.assertIn("Vegetable Pulao", rice_dishes)

        # 3. Unit conversion check (Recipe quantity is in grams, aggregated total is in kg)
        for item in potato_req["contributingDishes"]:
            if item["recipeUnit"] == "g":
                self.assertEqual(item["baseUnit"], "kg")
                expected_kg = item["portionQuantity"] / 1000.0
                self.assertAlmostEqual(item["dishRequirement"] / item["portions"], expected_kg, delta=0.01)

    def test_02_purchase_recommendation_formula(self):
        """
        Verify: Purchase Quantity = Max(0, Required Quantity + Safety Stock - Usable Stock)
        """
        data = generate_purchase_recommendations(days_ahead=3)
        self.assertTrue(data["success"])
        self.assertIn("recommendations", data)
        self.assertIn("bySupplier", data)
        self.assertGreater(len(data["recommendations"]), 0)

        for rec in data["recommendations"]:
            usable = rec["usableStock"]
            required = rec["requiredQuantity"]
            safety = rec["safetyStock"]
            expected_purchase = max(0.0, round((required + safety) - usable, 2))

            self.assertAlmostEqual(
                rec["recommendedPurchase"],
                expected_purchase,
                delta=0.05,
                msg=f"Failed formula check for {rec['name']}: req={required}, safety={safety}, usable={usable}"
            )

            # Check estimated cost calculation
            expected_cost = round(rec["recommendedPurchase"] * rec["unitCost"], 2)
            self.assertAlmostEqual(rec["estimatedCost"], expected_cost, delta=0.05)

            # Check status mapping
            if usable <= 0:
                self.assertEqual(rec["status"], "out_of_stock")
            elif usable < required:
                self.assertEqual(rec["status"], "critical_shortage")

    def test_03_expired_stock_strict_exclusion(self):
        """Verify that expired batches are strictly excluded from usable stock in purchase recommendations"""
        # Find an ingredient
        ing = Ingredient.query.filter_by(name="Paneer (Cottage Cheese)").first()
        if not ing:
            ing = Ingredient.query.first()

        today = date.today()
        # Add an expired batch
        expired_batch = InventoryBatch(
            ingredient_id=ing.id,
            batch_number=f"EXP-TEST-{today.strftime('%m%d')}",
            initial_quantity=50.0,
            remaining_quantity=50.0,
            unit=ing.unit,
            unit_cost=ing.unit_cost,
            received_date=today - timedelta(days=20),
            expiry_date=today - timedelta(days=5), # Expired 5 days ago!
            supplier_name="Test Supplier",
            status="active"
        )
        db.session.add(expired_batch)
        db.session.commit()

        try:
            data = generate_purchase_recommendations(days_ahead=3)
            rec = next((r for r in data["recommendations"] if r["ingredientId"] == ing.id), None)
            self.assertIsNotNone(rec)

            # The expired batch must be recorded in expiredStock, NOT usableStock
            self.assertGreaterEqual(rec["expiredStock"], 50.0)

            # Usable stock must not include the 50.0 kg expired batch
            active_usable_sum = sum(
                b.remaining_quantity for b in InventoryBatch.query.filter_by(ingredient_id=ing.id, status="active").all()
                if b.expiry_date >= today
            )
            self.assertAlmostEqual(rec["usableStock"], round(active_usable_sum, 2), delta=0.01)
        finally:
            # Clean up test batch
            db.session.delete(expired_batch)
            db.session.commit()

    def test_04_purchase_order_lifecycle_and_stock_receipt(self):
        """Test PO creation, status transitions, and automatic stock + batch intake upon receiving"""
        # Select an ingredient for the PO
        ing = Ingredient.query.filter_by(name="Basmati Rice").first()
        if not ing:
            ing = Ingredient.query.first()

        initial_stock = ing.current_stock
        order_qty = 25.0
        unit_cost = ing.unit_cost

        # 1. Create Draft PO
        po_payload = {
            "supplierName": ing.preferred_supplier or "Metro Cash & Carry",
            "contact": "+91 98765 43210",
            "leadTime": "24 hours",
            "notes": "Automated Phase 5 Test PO",
            "items": [
                {
                    "ingredientId": ing.id,
                    "recommendedPurchase": order_qty,
                    "approvedQuantity": order_qty,
                    "unit": ing.unit,
                    "unitCost": unit_cost,
                    "requiredQuantity": 15.0,
                    "usableStock": initial_stock
                }
            ]
        }
        res_create = self.client.post("/api/v1/purchases", json=po_payload)
        self.assertEqual(res_create.status_code, 201)
        created_po = res_create.get_json()["data"]
        po_id = created_po["id"]
        self.assertEqual(created_po["status"], "draft")
        self.assertAlmostEqual(created_po["totalEstimatedCost"], order_qty * unit_cost, delta=0.1)

        # 2. Mark as Ordered / Dispatched
        res_update = self.client.put(f"/api/v1/purchases/{po_id}", json={"status": "ordered"})
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.get_json()["data"]["status"], "ordered")

        # 3. Receive Delivery into Inventory
        res_receive = self.client.post(f"/api/v1/purchases/{po_id}/receive")
        self.assertEqual(res_receive.status_code, 200)
        receive_data = res_receive.get_json()
        self.assertTrue(receive_data["success"])
        self.assertEqual(receive_data["data"]["status"], "received")

        # Verify ingredient current_stock was incremented
        db.session.refresh(ing)
        self.assertAlmostEqual(ing.current_stock, initial_stock + order_qty, delta=0.01)

        # Verify a StockMovement audit log was recorded referencing the PO
        movement = StockMovement.query.filter_by(reference_id=created_po["poNumber"]).first()
        self.assertIsNotNone(movement, "A stock movement referencing the PO must exist")
        self.assertEqual(movement.movement_type, "purchase")
        self.assertEqual(movement.quantity, order_qty)

        # Verify a new InventoryBatch exists linked to that movement
        batch = movement.batch
        self.assertIsNotNone(batch, "An inventory batch must be linked to the movement")
        self.assertEqual(batch.ingredient_id, ing.id)
        self.assertEqual(batch.remaining_quantity, order_qty)
        self.assertEqual(batch.status, "active")
        self.assertGreater(batch.expiry_date, date.today())

        # 4. Idempotency test: Receiving again must return 400 error
        res_receive_again = self.client.post(f"/api/v1/purchases/{po_id}/receive")
        self.assertEqual(res_receive_again.status_code, 400)

    def test_05_fefo_stock_consumption(self):
        """Test consuming stock via FEFO (First-Expired, First-Out) with negative inventory protection"""
        # Create an isolated test ingredient to avoid pre-existing seeded batches
        test_ing = Ingredient(
            name="FEFO Test Ingredient",
            sku="ING-FEFO-01",
            category="Dairy",
            unit="kg",
            unit_cost=150.0,
            current_stock=0.0,
            reorder_point=5.0
        )
        db.session.add(test_ing)
        db.session.commit()

        today = date.today()
        # Batch 1 expires in 3 days
        batch_earlier = receive_batch(
            ingredient=test_ing,
            batch_number=f"FEFO-1-{today.strftime('%m%d')}",
            quantity=10.0,
            unit=test_ing.unit,
            unit_cost=test_ing.unit_cost,
            received_date=today,
            expiry_date=today + timedelta(days=3), # Expires sooner
            supplier_name="Test Dairy"
        )
        # Batch 2 expires in 10 days
        batch_later = receive_batch(
            ingredient=test_ing,
            batch_number=f"FEFO-2-{today.strftime('%m%d')}",
            quantity=10.0,
            unit=test_ing.unit,
            unit_cost=test_ing.unit_cost,
            received_date=today,
            expiry_date=today + timedelta(days=10), # Expires later
            supplier_name="Test Dairy"
        )
        db.session.commit()

        self.assertEqual(test_ing.current_stock, 20.0)

        # Consume 5 kg
        consume_res = self.client.post("/api/v1/inventory/consume", json={
            "ingredientId": test_ing.id,
            "quantity": 5.0,
            "reason": "kitchen_prep"
        })
        self.assertEqual(consume_res.status_code, 200)

        # Verify the earlier-expiring batch was consumed first
        db.session.refresh(batch_earlier)
        db.session.refresh(batch_later)
        db.session.refresh(test_ing)
        self.assertEqual(batch_earlier.remaining_quantity, 5.0)
        self.assertEqual(batch_later.remaining_quantity, 10.0)
        self.assertEqual(test_ing.current_stock, 15.0)

        # Verify negative stock error when requesting more than available stock
        excess_consume_res = self.client.post("/api/v1/inventory/consume", json={
            "ingredientId": test_ing.id,
            "quantity": 999999.0,
            "reason": "excess_test"
        })
        self.assertNotEqual(excess_consume_res.status_code, 200)

        # Clean up
        db.session.delete(test_ing)
        db.session.commit()

    def test_06_rest_api_endpoints_contract(self):
        """Verify REST API contracts for recommendations, requirements, and inventory dashboard"""
        # 1. Purchase Recommendations endpoint
        res_recs = self.client.get("/api/v1/purchases/recommendations?days=3")
        self.assertEqual(res_recs.status_code, 200)
        recs_data = res_recs.get_json()
        self.assertTrue(recs_data["success"])
        self.assertIn("horizonDays", recs_data)
        self.assertIn("totalEstimatedCost", recs_data)
        self.assertIn("itemsNeedingReorder", recs_data)
        self.assertIsInstance(recs_data["recommendations"], list)
        self.assertIsInstance(recs_data["bySupplier"], list)

        # 2. Ingredient Requirements endpoint
        res_reqs = self.client.get("/api/v1/purchases/requirements?days=3")
        self.assertEqual(res_reqs.status_code, 200)
        reqs_data = res_reqs.get_json()
        self.assertTrue(reqs_data["success"])
        self.assertIn("requirements", reqs_data["data"])

        # 3. Inventory Dashboard endpoint
        res_dash = self.client.get("/api/v1/inventory/dashboard")
        self.assertEqual(res_dash.status_code, 200)
        dash_data = res_dash.get_json()
        self.assertTrue(dash_data["success"])
        self.assertIn("totalInventoryValue", dash_data)
        self.assertIn("lowStockCount", dash_data)
        self.assertIn("nearExpiryBatchesCount", dash_data)
        self.assertIn("totalIngredients", dash_data)


if __name__ == "__main__":
    unittest.main()
