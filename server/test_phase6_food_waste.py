"""
Automated Test Suite for Phase 6 — Food Waste Management.
Verifies:
1. Waste recording for raw ingredients (stock deduction, movement log, financial loss)
2. Waste recording for prepared food items (overproduction, dish cost calculation)
3. Waste analytics (total loss, daily & monthly trends, reason distribution, top wasted items)
4. Expiry alerts & FEFO action directives
5. Predictive waste risk analysis (shelf-life vs ML demand forecast, transparent explanations & disclaimer)
6. AI leftover-to-recipe suggestions with strict food safety constraints (no expired ingredients)
7. CSV report export endpoint
"""
import unittest
from datetime import date, datetime, timedelta
from app import create_app
from app.extensions import db
from app.models import WasteRecord, Ingredient, MenuItem, InventoryBatch, StockMovement
from app.services.waste_service import (
    record_waste_entry,
    get_waste_analytics,
    get_expiry_alerts,
    get_waste_risk_analysis,
    get_leftover_recipe_suggestions,
    export_waste_records_csv
)


class Phase6FoodWasteTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_record_ingredient_waste(self):
        """Test recording ingredient waste, verifying stock deduction, loss calculation, and audit trail"""
        ing = Ingredient.query.filter(Ingredient.name.ilike("%Tomato%")).first()
        if not ing:
            ing = Ingredient.query.first()

        initial_stock = ing.current_stock
        waste_qty = 2.0
        expected_loss = round(waste_qty * ing.unit_cost, 2)

        res = record_waste_entry(
            item_type="ingredient",
            ingredient_id=ing.id,
            quantity=waste_qty,
            unit=ing.unit,
            reason="Spoilage",
            logged_by="Chef Vikram",
            notes="Overripe stock identified during morning check"
        )
        self.assertTrue(res["success"])
        data = res["data"]
        self.assertEqual(data["itemType"], "ingredient")
        self.assertEqual(data["reason"], "Spoilage")
        self.assertEqual(data["quantityLost"], waste_qty)
        self.assertAlmostEqual(data["financialLoss"], expected_loss, delta=0.05)

        # Verify stock was decremented
        db.session.refresh(ing)
        self.assertAlmostEqual(ing.current_stock, initial_stock - waste_qty, delta=0.01)

        # Verify stock movement was recorded
        movement = StockMovement.query.filter_by(
            ingredient_id=ing.id,
            movement_type="waste"
        ).order_by(StockMovement.id.desc()).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, -waste_qty)

    def test_02_record_prepared_item_waste(self):
        """Test recording waste for prepared food items (overproduction)"""
        dish = MenuItem.query.filter(MenuItem.name.ilike("%Thali%")).first()
        if not dish:
            dish = MenuItem.query.first()

        waste_portions = 4.0
        expected_cost_per_serving = dish.cost_price or (dish.price * 0.35)
        expected_loss = round(waste_portions * expected_cost_per_serving, 2)

        res = record_waste_entry(
            item_type="prepared_item",
            menu_item_id=dish.id,
            quantity=waste_portions,
            unit="portions",
            reason="Overproduction",
            logged_by="Sous Chef",
            notes="Unsold lunch buffer"
        )
        self.assertTrue(res["success"])
        data = res["data"]
        self.assertEqual(data["itemType"], "prepared_item")
        self.assertEqual(data["reason"], "Overproduction")
        self.assertEqual(data["quantityLost"], waste_portions)
        self.assertAlmostEqual(data["financialLoss"], expected_loss, delta=0.1)

    def test_03_waste_analytics_and_trends(self):
        """Test analytics calculations: total losses, volume, trends, and reasons"""
        analytics = get_waste_analytics(days=30)
        self.assertTrue(analytics["success"])
        self.assertGreater(analytics["totalFinancialLoss"], 0)
        self.assertGreater(analytics["totalQuantityLost"], 0)
        self.assertGreater(analytics["totalRecordsCount"], 0)
        self.assertIn("wasteToSalesRatio", analytics)

        # Reason breakdown verification
        self.assertIsInstance(analytics["reasonBreakdown"], list)
        reasons = [r["reason"] for r in analytics["reasonBreakdown"]]
        self.assertTrue(any("Spoilage" in r or "Overproduction" in r or "Expiry" in r for r in reasons))

        # Time series trends verification
        self.assertIsInstance(analytics["dailyTrends"], list)
        self.assertGreaterEqual(len(analytics["dailyTrends"]), 7)

        # Top wasted items verification
        self.assertIsInstance(analytics["topWastedItems"], list)
        self.assertGreater(len(analytics["topWastedItems"]), 0)

    def test_04_expiry_alerts_and_fefo_actions(self):
        """Test identification of expired and near-expiry batches with FEFO recommendations"""
        alerts = get_expiry_alerts()
        self.assertTrue(alerts["success"])
        self.assertIn("expiredCount", alerts)
        self.assertIn("criticalCount", alerts)
        self.assertIn("warningCount", alerts)
        self.assertIn("freshCount", alerts)
        self.assertIn("totalValueAtRisk", alerts)

        # Check action directives
        for item in alerts["critical"]:
            self.assertEqual(item["status"], "critical")
            self.assertIn("FEFO", item["recommendation"])

        for item in alerts["expired"]:
            self.assertEqual(item["status"], "expired")
            self.assertIn("Disposal", item["recommendation"])

    def test_05_predictive_waste_risk_analysis(self):
        """
        Verify waste risk categories (HIGH, MEDIUM, LOW), transparent reasoning,
        and explicit predictive disclaimer.
        """
        risk_data = get_waste_risk_analysis(horizon_days=5)
        self.assertTrue(risk_data["success"])
        self.assertIn("totalIngredientsEvaluated", risk_data)
        self.assertIn("disclaimer", risk_data)
        # Verify explicit disclaimer constraint
        self.assertIn("predictive", risk_data["disclaimer"].lower())
        self.assertIn("does not claim", risk_data["disclaimer"].lower())

        assessments = risk_data["data"]
        self.assertGreater(len(assessments), 0)

        for item in assessments:
            self.assertIn(item["riskLevel"], ("HIGH", "MEDIUM", "LOW"))
            self.assertIn("explanation", item)
            self.assertGreater(len(item["explanation"]), 15, "Explanation must be transparent and descriptive")

    def test_06_leftover_recipe_suggestions_food_safety(self):
        """
        Verify AI Leftover-to-Recipe Suggestions and strict food safety validation:
        Expired batches must NEVER be recommended for recipe consumption.
        """
        # Ensure a known expired batch exists to test safety guardrail
        ing = Ingredient.query.first()
        today = date.today()
        expired_batch = InventoryBatch(
            ingredient_id=ing.id,
            batch_number=f"SAFETY-TEST-{today.strftime('%m%d')}",
            initial_quantity=10.0,
            remaining_quantity=10.0,
            unit=ing.unit,
            unit_cost=ing.unit_cost,
            received_date=today - timedelta(days=20),
            expiry_date=today - timedelta(days=2), # EXPIRED 2 DAYS AGO
            supplier_name="Test Supplier",
            status="active"
        )
        db.session.add(expired_batch)
        db.session.commit()

        try:
            suggestions_data = get_leftover_recipe_suggestions()
            self.assertTrue(suggestions_data["success"])

            # 1. Food safety violation prevention check
            self.assertGreaterEqual(suggestions_data["foodSafetyViolationsPrevented"], 1)
            violations = suggestions_data["safetyWarnings"]
            expired_batches_flagged = [v["batchNumber"] for v in violations]
            self.assertIn(expired_batch.batch_number, expired_batches_flagged)

            # 2. Recipe suggestions check
            recipes = suggestions_data["suggestedRecipes"]
            self.assertGreater(len(recipes), 0)
            for r in recipes:
                self.assertIn("feasibilityScore", r)
                self.assertIn("rescuedSurplusMatches", r)
                self.assertIn("foodSafetyStatus", r)
                self.assertEqual(r["foodSafetyStatus"], "100% Certified Safe")
                # Ensure no expired batch was ever matched for recipe consumption
                self.assertNotIn(expired_batch.batch_number, str(r))
        finally:
            db.session.delete(expired_batch)
            db.session.commit()

    def test_07_rest_api_and_csv_export(self):
        """Verify REST API endpoints and CSV export"""
        # 1. Analytics endpoint
        res_ana = self.client.get("/api/v1/waste/analytics?days=30")
        self.assertEqual(res_ana.status_code, 200)

        # 2. Expiry alerts endpoint
        res_exp = self.client.get("/api/v1/waste/expiry-alerts")
        self.assertEqual(res_exp.status_code, 200)

        # 3. Risk analysis endpoint
        res_risk = self.client.get("/api/v1/waste/risk-analysis?horizon=5")
        self.assertEqual(res_risk.status_code, 200)

        # 4. Leftover suggestions endpoint
        res_leftovers = self.client.get("/api/v1/waste/leftovers/suggestions")
        self.assertEqual(res_leftovers.status_code, 200)

        # 5. CSV export endpoint
        res_csv = self.client.get("/api/v1/waste/export/csv")
        self.assertEqual(res_csv.status_code, 200)
        self.assertIn("text/csv", res_csv.headers["Content-Type"])
        csv_text = res_csv.get_data(as_text=True)
        self.assertIn("Log Number", csv_text)
        self.assertIn("Financial Loss", csv_text)
        self.assertIn("Reason", csv_text)


if __name__ == "__main__":
    unittest.main()
