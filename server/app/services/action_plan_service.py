"""
Kitchen Daily Action Plan Service (Phase 7):
Aggregates and synchronizes:
1. Expected Menu Demand (with ML confidence intervals & drivers)
2. Ingredients to Prepare (Mise-en-place BOM recipe explosion with prep loss)
3. Urgent Morning Purchases (Deficit reorder quantities)
4. Near-Expiry Stock (FEFO kitchen priority queue)
5. Important Waste-Risk Alerts (Surplus mitigation)

All recommendations are explainable, editable, and persisted in SQLite.
"""
from datetime import date, datetime, timedelta
import json
from typing import Dict, Any, List, Optional
from app.extensions import db
from app.models.unique_features import DailyActionPlan, KitchenEvent
from app.models import MenuItem, Ingredient, Recipe, Forecast, InventoryBatch
from app.services.forecast_service import generate_forecasts
from app.services.purchase_service import calculate_ingredient_requirements, generate_purchase_recommendations
from app.services.waste_service import get_expiry_alerts, get_waste_risk_analysis
from app.ml.calendar_utils import get_calendar_features


def get_or_create_daily_action_plan(plan_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Retrieves existing action plan for date or dynamically constructs one from
    ML forecast models, recipe BOM explosion, purchase recommendations, and expiry alerts.
    """
    if plan_date is None:
        plan_date = date.today()

    existing_plan = DailyActionPlan.query.filter_by(plan_date=plan_date).first()
    if existing_plan:
        return existing_plan.to_dict()

    # Dynamic Generation:
    # 1. Expected Menu Demand for plan_date
    forecasts = Forecast.query.filter_by(forecast_date=plan_date).all()
    if not forecasts:
        # Generate on the fly
        generate_forecasts(start_date=plan_date, days_ahead=1)
        forecasts = Forecast.query.filter_by(forecast_date=plan_date).all()

    cal_info = get_calendar_features(plan_date)
    event_note = (
        f"Special Event: {cal_info['event_label']}"
        if cal_info.get("event_label") and cal_info["event_label"] != "Regular Day"
        else "Standard daily operating schedule"
    )

    menu_targets = []
    for f in forecasts:
        dish = f.menu_item
        if not dish:
            continue
        ci_lower = f.confidence_lower or round(f.predicted_quantity * 0.85, 1)
        ci_upper = f.confidence_upper or round(f.predicted_quantity * 1.15, 1)
        menu_targets.append({
            "menuItemId": dish.id,
            "dishName": dish.name,
            "category": dish.category,
            "predictedPortions": round(f.predicted_quantity, 1),
            "adjustedPortions": round(f.predicted_quantity, 1), # Default to AI prediction, user editable
            "confidenceRange": f"{ci_lower} - {ci_upper} portions",
            "driverNote": (
                f"Boosted for {cal_info['event_label']}"
                if cal_info["is_indian_festival"] or cal_info["is_weekend"]
                else "Consistent 7-day weekday average"
            ),
            "status": "ready"
        })

    # 2. Ingredients to Prepare (Mise-en-place BOM explosion)
    req_data = calculate_ingredient_requirements(days_ahead=1, start_date=plan_date)
    raw_reqs = req_data.get("requirements", {})

    prep_tasks = []
    task_idx = 1
    for ing_id, req in raw_reqs.items():
        if req["totalRequired"] <= 0:
            continue
        prep_tasks.append({
            "taskId": task_idx,
            "ingredientId": ing_id,
            "name": req["ingredientName"],
            "category": req["category"],
            "requiredQuantity": req["totalRequired"],
            "unit": req["unit"],
            "contributingDishesCount": len(req.get("contributingDishes", [])),
            "completed": False,
            "assignedStation": (
                "Curry Station" if req["category"] in ("Dairy & Milk", "Spices & Oils")
                else "Vegetable Prep / Chopping" if req["category"] == "Vegetables"
                else "Grains / Steaming"
            ),
            "notes": f"Prepare for {req.get('contributingDishes', [{}])[0].get('dishName', 'menu')}"
        })
        task_idx += 1

    # 3. Urgent Purchases Needed
    recs_data = generate_purchase_recommendations(days_ahead=1, start_date=plan_date)
    urgent_purchases = []
    for rec in recs_data.get("recommendations", []):
        if rec["recommendedPurchase"] > 0:
            urgent_purchases.append({
                "ingredientId": rec["ingredientId"],
                "name": rec["name"],
                "neededQuantity": rec["recommendedPurchase"],
                "unit": rec["unit"],
                "usableStock": rec["usableStock"],
                "preferredSupplier": rec["preferredSupplier"],
                "estCost": rec["estimatedCost"],
                "urgency": "Urgent" if rec["status"] in ("out_of_stock", "critical_shortage") else "Standard"
            })

    # 4. Near-Expiry Stock (FEFO Priority Queue)
    exp_alerts = get_expiry_alerts()
    fefo_priorities = []
    for b in (exp_alerts.get("critical", []) + exp_alerts.get("warning", []))[:6]:
        fefo_priorities.append({
            "batchNumber": b["batchNumber"],
            "ingredientName": b["ingredientName"],
            "remainingQuantity": b["remainingQuantity"],
            "unit": b["unit"],
            "daysToExpiry": b["daysToExpiry"],
            "financialValue": b["financialValue"],
            "directive": b["recommendation"]
        })

    # 5. Waste Risk Alerts
    risk_data = get_waste_risk_analysis(horizon_days=3)
    risk_alerts = []
    for r in risk_data.get("data", []):
        if r["riskLevel"] in ("HIGH", "MEDIUM") and r["projectedSurplus"] > 0:
            risk_alerts.append({
                "ingredientName": r["name"],
                "riskLevel": r["riskLevel"],
                "projectedSurplus": r["projectedSurplus"],
                "unit": r["unit"],
                "valueAtRisk": r["surplusValueAtRisk"],
                "reason": r["explanation"]
            })

    # Persist in SQLite
    new_plan = DailyActionPlan(
        plan_date=plan_date,
        status="draft",
        menu_targets_json=json.dumps(menu_targets),
        prep_tasks_json=json.dumps(prep_tasks),
        urgent_purchases_json=json.dumps(urgent_purchases),
        fefo_priorities_json=json.dumps(fefo_priorities),
        risk_alerts_json=json.dumps(risk_alerts),
        manager_notes=f"Morning briefing generated. Calendar: {event_note}.",
        signed_off_by="Executive Chef"
    )
    db.session.add(new_plan)
    db.session.commit()

    return new_plan.to_dict()


def update_daily_action_plan(plan_date: date, update_data: Dict[str, Any]) -> Dict[str, Any]:
    """Updates an existing action plan with user customizations"""
    plan = DailyActionPlan.query.filter_by(plan_date=plan_date).first()
    if not plan:
        # Create first if not exists
        get_or_create_daily_action_plan(plan_date)
        plan = DailyActionPlan.query.filter_by(plan_date=plan_date).first()

    if "status" in update_data:
        plan.status = update_data["status"]
    if "menuTargets" in update_data:
        plan.menu_targets_json = json.dumps(update_data["menuTargets"])
    if "prepTasks" in update_data:
        plan.prep_tasks_json = json.dumps(update_data["prepTasks"])
    if "urgentPurchases" in update_data:
        plan.urgent_purchases_json = json.dumps(update_data["urgentPurchases"])
    if "fefoPriorities" in update_data:
        plan.fefo_priorities_json = json.dumps(update_data["fefoPriorities"])
    if "riskAlerts" in update_data:
        plan.risk_alerts_json = json.dumps(update_data["riskAlerts"])
    if "managerNotes" in update_data:
        plan.manager_notes = update_data["managerNotes"]
    if "signedOffBy" in update_data:
        plan.signed_off_by = update_data["signedOffBy"]

    db.session.commit()
    return plan.to_dict()


def reset_daily_action_plan(plan_date: date) -> Dict[str, Any]:
    """Clears customized action plan and re-runs AI models and BOM explosion"""
    plan = DailyActionPlan.query.filter_by(plan_date=plan_date).first()
    if plan:
        db.session.delete(plan)
        db.session.commit()
    return get_or_create_daily_action_plan(plan_date)
