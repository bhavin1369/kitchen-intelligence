"""
Automated Test Suite for AI-Based Food Demand Forecasting (Phase 4).
Verifies:
1. Data preprocessing & zero-leakage feature engineering
2. India-specific calendar & festival regressors
3. Chronological train/test split
4. Baseline vs Random Forest vs Gradient Boosting model evaluation
5. Forward demand inference & 95% confidence bounds
6. SQLite forecast persistence
7. Flask REST API endpoints
"""
import unittest
from datetime import date, timedelta
from app import create_app
from app.extensions import db
from app.models import Forecast, MenuItem, Sale
from app.ml.calendar_utils import get_calendar_features, get_upcoming_indian_events
from app.ml.preprocessor import build_feature_dataset, get_chronological_splits, FEATURE_COLUMNS
from app.ml.models import train_and_evaluate_models, BaselineDemandModel
from app.services.forecast_service import generate_forecasts, get_model_evaluation

class MLForecastTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_calendar_features(self):
        """Test Indian calendar and festival feature extraction"""
        # Test Diwali 2026 (Nov 8, 2026)
        diwali_date = date(2026, 11, 8)
        feats = get_calendar_features(diwali_date)
        self.assertEqual(feats["is_indian_festival"], 1)
        self.assertEqual(feats["is_weekend"], 1) # Sunday
        self.assertIn("Diwali", feats["festival_name"])

        # Test Republic Day (Jan 26)
        rep_day = date(2026, 1, 26)
        rep_feats = get_calendar_features(rep_day)
        self.assertEqual(rep_feats["is_public_holiday"], 1)

        # Test upcoming events window
        events = get_upcoming_indian_events(date(2026, 11, 1), date(2026, 11, 15))
        self.assertGreaterEqual(len(events), 1)

    def test_02_preprocessor_and_zero_leakage(self):
        """Test continuous time series creation, lag/rolling features, and chronological split"""
        df, meta = build_feature_dataset()
        self.assertTrue(meta["is_sufficient"], f"Dataset insufficient: {meta.get('warning')}")
        self.assertFalse(df.empty)
        self.assertGreaterEqual(meta["distinct_dates_count"], 14)

        # Check all required features exist
        for col in FEATURE_COLUMNS:
            self.assertIn(col, df.columns)
            self.assertEqual(df[col].isna().sum(), 0, f"Feature '{col}' contains NaN values!")

        # Chronological split check
        train_df, test_df, split_meta = get_chronological_splits(df, test_ratio=0.20)
        self.assertGreater(len(train_df), 0)
        self.assertGreater(len(test_df), 0)
        self.assertLess(train_df["date"].max(), test_df["date"].min(), "Temporal data leakage detected in split!")

    def test_03_model_training_and_evaluation(self):
        """Test model training pipeline, Random Forest vs Baseline comparison, and serialization"""
        res = train_and_evaluate_models()
        self.assertTrue(res["success"])
        meta = res["modelMetadata"]

        # Check version and metrics
        self.assertIn("version", meta)
        eval_data = meta["evaluation"]
        rf_metrics = eval_data["randomForest"]
        base_metrics = eval_data["baseline"]
        gb_metrics = eval_data["gradientBoosting"]

        self.assertIn("mae", rf_metrics)
        self.assertIn("rmse", rf_metrics)
        self.assertIn("r2", rf_metrics)
        self.assertGreater(rf_metrics["mae"], 0)
        self.assertGreater(rf_metrics["rmse"], 0)

        # Check feature ranking
        ranking = meta["featureImportances"]
        self.assertEqual(len(ranking), len(FEATURE_COLUMNS))
        self.assertGreater(ranking[0]["importance"], 0)

        # Verify comparison points for UI chart
        self.assertGreater(len(meta["comparisonPoints"]), 0)

    def test_04_forward_demand_generation_and_confidence_bounds(self):
        """Test generating next-7-day and 14-day forecasts with 95% CI bounds and DB persistence"""
        res = generate_forecasts(days_ahead=7)
        self.assertTrue(res["success"])
        self.assertEqual(res["daysAhead"], 7)
        self.assertGreater(res["totalPredictedVolume"], 0)
        self.assertGreater(res["nextDayPredictedVolume"], 0)

        # Check individual item forecasts
        items = res["itemForecasts"]
        self.assertGreater(len(items), 0)
        for it in items[:10]:
            self.assertGreater(it["predicted"], 0)
            self.assertLessEqual(it["lower"], it["predicted"])
            self.assertGreaterEqual(it["upper"], it["predicted"])

        # Check SQLite persistence in Forecast table
        count_in_db = Forecast.query.count()
        self.assertGreater(count_in_db, 0)

    def test_05_rest_api_endpoints(self):
        """Test Flask REST endpoints for forecast generation, retraining, evaluation, and calendar"""
        # 1. GET /api/v1/forecasts
        res_fc = self.client.get("/api/v1/forecasts?days=7")
        self.assertEqual(res_fc.status_code, 200)
        data_fc = res_fc.get_json()
        self.assertTrue(data_fc["success"])
        self.assertIn("chartSeries", data_fc)
        self.assertEqual(len(data_fc["chartSeries"]), 7)

        # 2. GET /api/v1/forecasts/evaluation
        res_ev = self.client.get("/api/v1/forecasts/evaluation")
        self.assertEqual(res_ev.status_code, 200)
        data_ev = res_ev.get_json()
        self.assertTrue(data_ev["success"])
        self.assertIn("evaluation", data_ev["data"])

        # 3. GET /api/v1/forecasts/calendar
        res_cal = self.client.get("/api/v1/forecasts/calendar?days=30")
        self.assertEqual(res_cal.status_code, 200)

        # 4. POST /api/v1/forecasts/train (retraining)
        res_tr = self.client.post("/api/v1/forecasts/train")
        self.assertEqual(res_tr.status_code, 200)
        self.assertTrue(res_tr.get_json()["success"])

if __name__ == "__main__":
    unittest.main()
