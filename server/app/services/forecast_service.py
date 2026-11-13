"""
Forecast Service: Orchestrates AI model training, forward demand inference,
confidence interval bounds, and SQLite persistence for the Kitchen Intelligence System.
"""
import json
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from app.extensions import db
from app.models import Forecast, MenuItem, Sale, SaleItem
from app.ml.calendar_utils import get_calendar_features, get_upcoming_indian_events
from app.ml.preprocessor import FEATURE_COLUMNS, build_feature_dataset
from app.ml.models import (
    train_and_evaluate_models,
    load_trained_model_bundle,
    get_latest_model_metadata
)

def ensure_model_trained() -> Dict[str, Any]:
    """Ensures a trained model exists; if not, triggers initial training"""
    meta = get_latest_model_metadata()
    bundle = load_trained_model_bundle()
    if meta is None or bundle is None:
        return train_and_evaluate_models()
    return {"success": True, "modelMetadata": meta}


def generate_forecasts(
    start_date: Optional[date] = None,
    days_ahead: int = 7,
    menu_item_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generates forward food demand predictions for active menu dishes using the trained ML model.
    Computes 95% confidence intervals and persists forecasts to the SQLite `forecasts` table.
    """
    # Ensure trained model is ready
    train_res = ensure_model_trained()
    if not train_res.get("success"):
        return train_res

    bundle = load_trained_model_bundle()
    if not bundle:
        return {
            "success": False,
            "message": "Model bundle could not be loaded."
        }

    rf_model = bundle["model"]
    baseline_model = bundle["baseline"]
    meta = bundle.get("metadata", {})
    rmse = meta.get("evaluation", {}).get("randomForest", {}).get("rmse", 3.0)

    # Determine start date
    if start_date is None:
        start_date = date.today() + timedelta(days=1)

    # Load active menu items
    menu_query = MenuItem.query.filter_by(is_available=True)
    if menu_item_id:
        menu_query = menu_query.filter_by(id=menu_item_id)
    menu_items = menu_query.all()
    if not menu_items:
        menu_items = MenuItem.query.all()

    # Load recent historical sales per dish to seed lag features
    recent_sales = (
        db.session.query(
            func_date := db.func.date(Sale.order_timestamp).label("sales_date"),
            SaleItem.menu_item_id,
            db.func.sum(SaleItem.quantity).label("qty")
        )
        .join(SaleItem, Sale.id == SaleItem.sale_id)
        .filter(Sale.status != "cancelled")
        .group_by(func_date, SaleItem.menu_item_id)
        .order_by(func_date.desc())
        .limit(200)
        .all()
    )

    # Organize recent history into a lookup: dish_id -> sorted list of (date, qty)
    history_lookup: Dict[int, Dict[date, float]] = {m.id: {} for m in menu_items}
    for r in recent_sales:
        if r.sales_date and r.menu_item_id in history_lookup:
            d_val = pd.to_datetime(r.sales_date).date()
            history_lookup[r.menu_item_id][d_val] = float(r.qty or 0.0)

    forecast_results = []
    generated_db_records = []

    # Iterative forward forecast per dish
    for dish in menu_items:
        # Working buffer of historical + predicted sales
        dish_history = dict(history_lookup.get(dish.id, {}))

        # Default historical average if no sales
        avg_dish_qty = float(np.mean(list(dish_history.values()))) if dish_history else 15.0

        for step in range(days_ahead):
            target_d = start_date + timedelta(days=step)
            cal = get_calendar_features(target_d)

            # Recursive lag lookups
            lag_1 = dish_history.get(target_d - timedelta(days=1), avg_dish_qty)
            lag_2 = dish_history.get(target_d - timedelta(days=2), avg_dish_qty)
            lag_7 = dish_history.get(target_d - timedelta(days=7), avg_dish_qty)

            # Rolling 7-day mean from preceding 7 days
            prior_7 = [
                dish_history.get(target_d - timedelta(days=i), avg_dish_qty)
                for i in range(1, 8)
            ]
            rolling_mean_7 = float(np.mean(prior_7))
            rolling_std_7 = float(np.std(prior_7))

            # Rolling 14-day mean
            prior_14 = [
                dish_history.get(target_d - timedelta(days=i), avg_dish_qty)
                for i in range(1, 15)
            ]
            rolling_mean_14 = float(np.mean(prior_14))

            # Feature dictionary
            row_features = {
                "menu_item_id": dish.id,
                "price": float(dish.price or 100.0),
                "is_veg": 1 if dish.is_veg else 0,
                "prep_time_minutes": int(dish.prep_time_minutes or 15),
                "day_of_week": cal["day_of_week"],
                "is_weekend": cal["is_weekend"],
                "month": cal["month"],
                "day_of_month": cal["day_of_month"],
                "quarter": cal["quarter"],
                "day_of_year": cal["day_of_year"],
                "is_public_holiday": cal["is_public_holiday"],
                "is_indian_festival": cal["is_indian_festival"],
                "days_to_nearest_festival": cal["days_to_nearest_festival"],
                "lag_1": lag_1,
                "lag_2": lag_2,
                "lag_7": lag_7,
                "rolling_mean_7": rolling_mean_7,
                "rolling_std_7": rolling_std_7,
                "rolling_mean_14": rolling_mean_14,
            }

            # Predict using Random Forest
            feat_df = pd.DataFrame([row_features])[FEATURE_COLUMNS]
            pred_qty = float(rf_model.predict(feat_df)[0])
            pred_qty = max(1.0, round(pred_qty, 1))

            # Baseline Prediction
            base_pred = float(baseline_model.predict(feat_df)[0])
            base_pred = max(1.0, round(base_pred, 1))

            # 95% Confidence Interval: +/- 1.96 * RMSE
            ci_half = 1.96 * rmse
            ci_lower = max(0.0, round(pred_qty - ci_half, 1))
            ci_upper = round(pred_qty + ci_half, 1)

            # Store in forward buffer for subsequent lag steps
            dish_history[target_d] = pred_qty

            factors = {
                "dayOfWeek": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][cal["day_of_week"]],
                "isWeekend": bool(cal["is_weekend"]),
                "isFestival": bool(cal["is_indian_festival"]),
                "festivalName": cal["festival_name"],
                "baselineAvg": base_pred
            }

            # Save / Upsert in SQLite database
            existing_f = Forecast.query.filter_by(
                forecast_date=target_d,
                menu_item_id=dish.id
            ).first()

            if existing_f:
                existing_f.predicted_quantity = pred_qty
                existing_f.baseline_quantity = base_pred
                existing_f.confidence_lower = ci_lower
                existing_f.confidence_upper = ci_upper
                existing_f.factors_json = json.dumps(factors)
                forecast_record = existing_f
            else:
                forecast_record = Forecast(
                    kitchen_id=dish.kitchen_id,
                    menu_item_id=dish.id,
                    forecast_date=target_d,
                    predicted_quantity=pred_qty,
                    baseline_quantity=base_pred,
                    confidence_lower=ci_lower,
                    confidence_upper=ci_upper,
                    factors_json=json.dumps(factors)
                )
                db.session.add(forecast_record)

            generated_db_records.append(forecast_record)

            forecast_results.append({
                "dishId": dish.id,
                "dishName": dish.name,
                "category": dish.category,
                "price": dish.price,
                "forecastDate": target_d.isoformat(),
                "day": target_d.strftime("%a (%b %d)"),
                "predicted": pred_qty,
                "baseline": base_pred,
                "lower": ci_lower,
                "upper": ci_upper,
                "factors": factors
            })

    db.session.commit()

    # Create daily aggregated trajectory for Recharts
    daily_aggregates = {}
    for r in forecast_results:
        f_date = r["forecastDate"]
        if f_date not in daily_aggregates:
            d_obj = datetime.strptime(f_date, "%Y-%m-%d").date()
            daily_aggregates[f_date] = {
                "date": f_date,
                "day": d_obj.strftime("%a %d %b"),
                "predicted": 0.0,
                "baseline": 0.0,
                "lower": 0.0,
                "upper": 0.0,
                "festival": r["factors"].get("festivalName"),
                "isWeekend": r["factors"].get("isWeekend"),
                "itemCount": 0
            }
        daily_aggregates[f_date]["predicted"] += r["predicted"]
        daily_aggregates[f_date]["baseline"] += r["baseline"]
        daily_aggregates[f_date]["lower"] += r["lower"]
        daily_aggregates[f_date]["upper"] += r["upper"]
        daily_aggregates[f_date]["itemCount"] += 1

    chart_series = []
    for d_k in sorted(daily_aggregates.keys()):
        agg = daily_aggregates[d_k]
        chart_series.append({
            "date": agg["date"],
            "day": agg["day"],
            "predicted": round(agg["predicted"], 1),
            "baseline": round(agg["baseline"], 1),
            "lower": round(agg["lower"], 1),
            "upper": round(agg["upper"], 1),
            "festival": agg["festival"],
            "isWeekend": agg["isWeekend"]
        })

    total_predicted = sum(r["predicted"] for r in forecast_results)
    next_day_forecast = sum(
        r["predicted"] for r in forecast_results
        if r["forecastDate"] == (start_date).isoformat()
    )

    return {
        "success": True,
        "modelVersion": meta.get("version", "v1.0.0"),
        "algorithm": meta.get("algorithm", "Random Forest Regressor"),
        "startDate": start_date.isoformat(),
        "daysAhead": days_ahead,
        "totalPredictedVolume": round(total_predicted, 1),
        "nextDayPredictedVolume": round(next_day_forecast, 1),
        "evaluationSummary": meta.get("evaluation", {}),
        "chartSeries": chart_series,
        "itemForecasts": forecast_results,
        "warning": meta.get("dataset", {}).get("warning")
    }


def get_model_evaluation() -> Dict[str, Any]:
    """Returns the latest ML model evaluation metrics and comparison stats"""
    ensure_model_trained()
    meta = get_latest_model_metadata()
    if not meta:
        return {
            "success": False,
            "message": "No model metadata found. Please trigger model training."
        }
    return {
        "success": True,
        "data": meta
    }


def get_calendar_events(start_d: date, end_d: date) -> List[Dict[str, Any]]:
    """Returns calendar holidays and Indian festivals in range"""
    return get_upcoming_indian_events(start_d, end_d)
