"""
ML Models for Food Demand Forecasting:
1. Baseline: Historical Day-of-Week Moving Average
2. Primary Model: Scikit-learn RandomForestRegressor
3. Comparison Model: Scikit-learn GradientBoostingRegressor

Handles training, evaluation metrics calculation (MAE, RMSE, R2), feature importance extraction,
and model persistence via Joblib.
"""
import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

from app.ml.preprocessor import (
    FEATURE_COLUMNS,
    build_feature_dataset,
    get_chronological_splits
)

MODELS_DIR = Path(__file__).resolve().parent / "models_store"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_ARTIFACT_PATH = MODELS_DIR / "demand_forecast_model.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"


class BaselineDemandModel:
    """
    Day-of-Week historical moving average baseline.
    Predicts demand using the average sales for the given dish on that day of week,
    falling back to overall 7-day rolling average.
    """
    def __init__(self):
        self.dow_dish_means: Dict[Tuple[int, int], float] = {}
        self.overall_dish_means: Dict[int, float] = {}

    def fit(self, train_df: pd.DataFrame):
        # Compute mean per (menu_item_id, day_of_week)
        grouped_dow = train_df.groupby(["menu_item_id", "day_of_week"])["quantity"].mean()
        self.dow_dish_means = grouped_dow.to_dict()

        # Compute overall mean per dish
        grouped_dish = train_df.groupby("menu_item_id")["quantity"].mean()
        self.overall_dish_means = grouped_dish.to_dict()
        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        preds = []
        for _, row in df.iterrows():
            item_id = int(row.get("menu_item_id", 0))
            dow = int(row.get("day_of_week", 0))
            val = self.dow_dish_means.get((item_id, dow))
            if val is None or np.isnan(val):
                val = self.overall_dish_means.get(item_id, 5.0)
            preds.append(max(0.0, float(val)))
        return np.array(preds)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculates MAE, RMSE, R2, and MAPE metrics"""
    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))

    # MAPE: avoid div by zero
    mask = y_true > 0
    if np.sum(mask) > 0:
        mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)
    else:
        mape = 0.0

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 4),
        "mape": round(mape, 2)
    }


def train_and_evaluate_models() -> Dict[str, Any]:
    """
    Executes full ML training pipeline:
    1. Loads dataset from SQLite with zero-leakage feature engineering.
    2. Chronologically splits into train (80%) and test (20%).
    3. Fits Baseline, Random Forest, and Gradient Boosting models.
    4. Computes test set MAE, RMSE, R2, actual vs predicted distributions.
    5. Extracts Random Forest feature importances.
    6. Serializes model bundle and saves metadata JSON.
    """
    start_time = time.time()
    df, meta = build_feature_dataset()

    if not meta.get("is_sufficient"):
        return {
            "success": False,
            "message": meta.get("warning") or "Insufficient historical sales data.",
            "metadata": meta
        }

    # Chronological Split
    train_df, test_df, split_meta = get_chronological_splits(df, test_ratio=0.20)

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["quantity"].values
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["quantity"].values

    # 1. Baseline Model
    baseline = BaselineDemandModel()
    baseline.fit(train_df)
    baseline_preds = baseline.predict(test_df)
    baseline_metrics = compute_metrics(y_test, baseline_preds)

    # 2. Random Forest Regressor (Primary Model)
    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=3,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_preds = np.clip(rf.predict(X_test), 0, None)
    rf_metrics = compute_metrics(y_test, rf_preds)

    # 3. Gradient Boosting Regressor (Comparison Model)
    gb = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.08,
        min_samples_split=3,
        random_state=42
    )
    gb.fit(X_train, y_train)
    gb_preds = np.clip(gb.predict(X_test), 0, None)
    gb_metrics = compute_metrics(y_test, gb_preds)

    # Comparison improvement %
    mae_diff = baseline_metrics["mae"] - rf_metrics["mae"]
    pct_improvement = round((mae_diff / (baseline_metrics["mae"] or 1.0)) * 100, 1)

    # Feature Importances from Random Forest
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    feature_ranking = [
        {"feature": FEATURE_COLUMNS[i], "importance": round(float(importances[i]), 4)}
        for i in sorted_idx
    ]

    # Per-dish evaluation metrics on test set
    dish_breakdown = []
    for m_id, group in test_df.groupby("menu_item_id"):
        y_t = group["quantity"].values
        X_sub = group[FEATURE_COLUMNS]
        p_sub = np.clip(rf.predict(X_sub), 0, None)
        d_name = group["dish_name"].iloc[0] if "dish_name" in group else f"Dish #{m_id}"
        dish_mae = float(mean_absolute_error(y_t, p_sub))
        dish_rmse = float(np.sqrt(mean_squared_error(y_t, p_sub)))
        dish_breakdown.append({
            "menuItemId": int(m_id),
            "dishName": d_name,
            "testSamples": len(group),
            "mae": round(dish_mae, 2),
            "rmse": round(dish_rmse, 2),
            "avgActual": round(float(np.mean(y_t)), 1),
            "avgPredicted": round(float(np.mean(p_sub)), 1),
        })

    # Sample actual vs predicted points for chart
    comparison_points = []
    test_eval_df = test_df.copy()
    test_eval_df["predicted"] = np.round(rf_preds, 1)
    test_eval_df["baseline"] = np.round(baseline_preds, 1)

    # Aggregate by date across dishes for macro curve
    date_agg = test_eval_df.groupby("date").agg({
        "quantity": "sum",
        "predicted": "sum",
        "baseline": "sum"
    }).reset_index()

    for _, row in date_agg.iterrows():
        comparison_points.append({
            "date": row["date"].isoformat(),
            "actual": round(float(row["quantity"]), 1),
            "predicted": round(float(row["predicted"]), 1),
            "baseline": round(float(row["baseline"]), 1),
            "error": round(abs(float(row["quantity"]) - float(row["predicted"])), 1)
        })

    duration_sec = round(time.time() - start_time, 2)
    trained_at = datetime.now(timezone.utc).isoformat()
    version = f"v1.{int(time.time()) % 100000}"

    model_metadata = {
        "version": version,
        "algorithm": "Random Forest Regressor (with Indian Calendar & Lag Dynamics)",
        "comparisonAlgorithm": "Gradient Boosting Regressor",
        "baselineAlgorithm": "Historical Day-of-Week Moving Average",
        "trainedAt": trained_at,
        "trainingDurationSeconds": duration_sec,
        "dataset": {
            "totalSamples": len(df),
            "trainSamples": len(train_df),
            "testSamples": len(test_df),
            "minDate": meta["min_date"],
            "maxDate": meta["max_date"],
            "distinctDatesCount": meta["distinct_dates_count"],
            "dishesCount": meta["dish_count"],
            "splitCutoff": split_meta["cutoff_date"],
        },
        "evaluation": {
            "primaryModel": "Random Forest",
            "randomForest": rf_metrics,
            "gradientBoosting": gb_metrics,
            "baseline": baseline_metrics,
            "pctImprovementOverBaseline": pct_improvement,
            "status": "superior" if pct_improvement >= 0 else "comparable",
        },
        "featureImportances": feature_ranking,
        "dishBreakdown": dish_breakdown,
        "comparisonPoints": comparison_points,
    }

    # Save artifact bundle using joblib
    bundle = {
        "model": rf,
        "gradient_boosting": gb,
        "baseline": baseline,
        "features": FEATURE_COLUMNS,
        "metadata": model_metadata,
        "latest_features_df": df
    }
    joblib.dump(bundle, MODEL_ARTIFACT_PATH)

    # Save human-readable JSON metadata
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)

    return {
        "success": True,
        "message": f"AI Demand Forecasting model {version} trained successfully on {len(df)} samples.",
        "modelMetadata": model_metadata
    }


def load_trained_model_bundle() -> Optional[Dict[str, Any]]:
    """Loads the serialized model bundle if present on disk"""
    if not MODEL_ARTIFACT_PATH.exists():
        return None
    try:
        return joblib.load(MODEL_ARTIFACT_PATH)
    except Exception as e:
        print(f"Error loading model bundle: {e}")
        return None


def get_latest_model_metadata() -> Optional[Dict[str, Any]]:
    """Reads model metadata from JSON cache or disk"""
    if not METADATA_PATH.exists():
        return None
    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

