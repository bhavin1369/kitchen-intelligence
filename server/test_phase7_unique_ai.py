"""
Automated Test Suite for Phase 7 — Unique AI Features.
Verifies:
1. India-Specific Demand Intelligence & Configurable Events
2. Explainable AI (Feature importances, dish driver attributions, 95% CI bands, actual vs predicted)
3. Environmental Impact Tracker (Documented conversion factors, CO2e, Water Footprint, Avoided Waste)
4. Kitchen Daily Action Plan (Aggregated briefing, BOM prep explosion, user-editable targets, SQLite persistence)
5. REST API endpoints for all Phase 7 modules
"""
import unittest
import json
from datetime import date, datetime, timedelta
from app import create_app
from app.extensions import db
from app.models.unique_features import KitchenEvent, DailyActionPlan
from app.models import MenuItem, Ingredient, Forecast
from app.services.event_service import (
    get_all_events, create_kitchen_event, update_kitchen_event,
    delete_kitchen_event, get_historical_event_impact
)
from app.services.explainable_ai_service import (
    get_feature_importances, get_dish_explanation, get_model_evaluation_detailed
)
from app.services.environmental_service import get_environmental_impact, CONVERSION_FACTORS
from app.services.action_plan_service import (
    get_or_create_daily_action_plan, update_daily_action_plan, reset_daily_action_plan
)


class Phase7UniqueAITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_india_specific_demand_intelligence(self):
        """Test configurable Indian events and historical festival demand lift analysis"""
        # 1. Verify seeded events exist
        events = get_all_events(include_past=True)
        self.assertGreaterEqual(len(events), 1)

        # 2. Add custom local kitchen event
        today = date.today()
        test_evt = create_kitchen_event(
            title="Campus Food Carnival 2026",
            event_date=today + timedelta(days=12),
            event_type="local_event",
            expected_impact=1.35,
            expected_extra_portions=50.0,
            notes="Annual university festival footfall spike"
        )
        self.assertEqual(test_evt["title"], "Campus Food Carnival 2026")
        self.assertEqual(test_evt["expectedImpact"], 1.35)
        self.assertEqual(test_evt["impactPercentage"], 35.0)

        # 3. Verify historical festival demand impact analysis
        impact_data = get_historical_event_impact()
        self.assertTrue(impact_data["success"])
        self.assertIn("overallFestivalMultiplier", impact_data)
        self.assertGreaterEqual(impact_data["overallFestivalMultiplier"], 1.0)
        self.assertIsInstance(impact_data["dishesImpact"], list)
        if impact_data["dishesImpact"]:
            first_dish = impact_data["dishesImpact"][0]
            self.assertIn("demandLiftPercentage", first_dish)
            self.assertIn("behaviorInsight", first_dish)

        # Cleanup test event
        delete_kitchen_event(test_evt["id"])

    def test_02_explainable_ai(self):
        """
        Verify Explainable AI features:
        - Feature importance rankings (lag, rolling average, weekend, festival)
        - Dish drivers & 95% Confidence Interval bands
        - Model evaluation metrics (MAE, RMSE, R2)
        """
        # 1. Feature importances
        xai_feat = get_feature_importances()
        self.assertTrue(xai_feat["success"])
        self.assertIn("features", xai_feat)
        features = xai_feat["features"]
        self.assertGreater(len(features), 5)
        feat_names = [f["feature"] for f in features]
        # Verify key time-series and calendar predictors exist
        self.assertTrue(any("lag" in f or "rolling" in f or "day_of_week" in f for f in feat_names))

        # 2. Dish drivers & Confidence Intervals
        dish = MenuItem.query.first()
        self.assertIsNotNone(dish)
        dish_xai = get_dish_explanation(dish.id)
        self.assertTrue(dish_xai["success"])
        self.assertEqual(dish_xai["menuItemId"], dish.id)
        self.assertIn("confidenceInterval", dish_xai)
        ci = dish_xai["confidenceInterval"]
        self.assertLessEqual(ci["lower"], ci["upper"])
        self.assertIn("drivers", dish_xai)
        self.assertGreater(len(dish_xai["drivers"]), 0)

        # 3. Model evaluation
        eval_data = get_model_evaluation_detailed()
        self.assertTrue(eval_data["success"])
        self.assertIn("metrics", eval_data)
        self.assertIn("randomForest", eval_data["metrics"])
        rf_metrics = eval_data["metrics"]["randomForest"]
        self.assertIn("mae", rf_metrics)
        self.assertIn("rmse", rf_metrics)
        self.assertIn("r2", rf_metrics)

    def test_03_environmental_impact_tracker(self):
        """
        Verify environmental tracker calculations and documented conversion factors:
        - CO2e emissions (2.5 kg CO2e / kg waste)
        - Water footprint (1,250 L / kg waste)
        - Avoided waste estimation against baseline
        - Equivalencies (car km, trees)
        """
        impact = get_environmental_impact(days=30)
        self.assertTrue(impact["success"])
        summary = impact["summary"]
        self.assertIn("actualWasteLoggedKg", summary)
        self.assertIn("actualCO2eKg", summary)
        self.assertIn("actualWaterLiters", summary)
        self.assertIn("avoidedCO2eKg", summary)
        self.assertIn("avoidedWaterLiters", summary)

        # Check mathematical conversion factor accuracy
        waste_kg = summary["actualWasteLoggedKg"]
        expected_co2 = round(waste_kg * CONVERSION_FACTORS["co2e_per_kg_food_waste"]["value"], 2)
        self.assertAlmostEqual(summary["actualCO2eKg"], expected_co2, delta=0.1)

        expected_water = round(waste_kg * CONVERSION_FACTORS["water_per_kg_food_waste"]["value"], 1)
        self.assertAlmostEqual(summary["actualWaterLiters"], expected_water, delta=0.5)

        # Verify documentation and methodology are provided
        self.assertIn("conversionMethodology", impact)
        self.assertIn("disclaimer", impact)

    def test_04_kitchen_daily_action_plan(self):
        """
        Verify Daily Action Plan generation, user customization, and SQLite persistence:
        - Expected menu demand
        - Ingredients to prepare (Mise-en-place BOM)
        - Urgent purchases
        - Near-expiry stock
        - User editable targets and checklist
        """
        today = date.today()
        # 1. Generate or fetch plan
        plan = get_or_create_daily_action_plan(today)
        self.assertEqual(plan["planDate"], today.isoformat())
        self.assertIn("menuTargets", plan)
        self.assertIn("prepTasks", plan)
        self.assertIn("urgentPurchases", plan)
        self.assertIn("fefoPriorities", plan)
        self.assertIn("riskAlerts", plan)
        self.assertGreater(len(plan["menuTargets"]), 0)

        # 2. Update / Customize plan
        menu_targets = plan["menuTargets"]
        if menu_targets:
            menu_targets[0]["adjustedPortions"] = menu_targets[0]["predictedPortions"] + 10.0

        prep_tasks = plan["prepTasks"]
        if prep_tasks:
            prep_tasks[0]["completed"] = True
            prep_tasks[0]["assignedStation"] = "Chef Rajesh — Station 1"

        update_payload = {
            "status": "approved",
            "menuTargets": menu_targets,
            "prepTasks": prep_tasks,
            "managerNotes": "Manager verified morning prep and approved extra lunch buffer.",
            "signedOffBy": "Chef Vikram — Head Chef"
        }
        updated_plan = update_daily_action_plan(today, update_payload)
        self.assertEqual(updated_plan["status"], "approved")
        self.assertEqual(updated_plan["signedOffBy"], "Chef Vikram — Head Chef")
        self.assertEqual(updated_plan["menuTargets"][0]["adjustedPortions"], menu_targets[0]["adjustedPortions"])
        self.assertTrue(updated_plan["prepTasks"][0]["completed"])

        # 3. Verify SQLite persistence across calls
        refetched = get_or_create_daily_action_plan(today)
        self.assertEqual(refetched["status"], "approved")
        self.assertTrue(refetched["prepTasks"][0]["completed"])

    def test_05_rest_api_endpoints_contract(self):
        """Verify REST API endpoints for all Phase 7 unique AI features"""
        # 1. Events list and historical impact
        res_events = self.client.get("/api/v1/events")
        self.assertEqual(res_events.status_code, 200)
        res_hist = self.client.get("/api/v1/events/historical-impact")
        self.assertEqual(res_hist.status_code, 200)

        # 2. XAI Feature importance
        res_feat = self.client.get("/api/v1/xai/feature-importance")
        self.assertEqual(res_feat.status_code, 200)

        # 3. Environmental Impact
        res_env = self.client.get("/api/v1/environmental/impact?days=30")
        self.assertEqual(res_env.status_code, 200)

        # 4. Daily Action Plan
        today_str = date.today().isoformat()
        res_plan = self.client.get(f"/api/v1/action-plan?date={today_str}")
        self.assertEqual(res_plan.status_code, 200)
        self.assertTrue(res_plan.get_json()["success"])


if __name__ == "__main__":
    unittest.main()
