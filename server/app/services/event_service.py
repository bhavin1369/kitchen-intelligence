"""
India-Specific Demand Intelligence & Events Service (Phase 7):
- Configurable regional festivals, public holidays, and custom kitchen events.
- Historical demand patterns and impact analysis during Indian cultural events.
"""
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy import func
from app.extensions import db
from app.models.unique_features import KitchenEvent
from app.models import Sale, SaleItem, MenuItem
from app.ml.calendar_utils import FESTIVALS_MAP, FIXED_HOLIDAYS, get_calendar_features


def get_all_events(include_past: bool = True) -> List[Dict[str, Any]]:
    """Retrieves all registered custom and regional kitchen events"""
    query = KitchenEvent.query
    if not include_past:
        query = query.filter(KitchenEvent.event_date >= date.today())
    events = query.order_by(KitchenEvent.event_date.asc()).all()
    return [e.to_dict() for e in events]


def create_kitchen_event(
    title: str,
    event_date: date,
    event_type: str = "festival",
    expected_impact: float = 1.20,
    expected_extra_portions: float = 0.0,
    target_menu_item_id: Optional[int] = None,
    notes: str = ""
) -> Dict[str, Any]:
    """Adds a configurable festival or local kitchen event"""
    if not title:
        raise ValueError("Event title is required.")
    if expected_impact <= 0:
        raise ValueError("Expected impact multiplier must be positive.")

    event = KitchenEvent(
        title=title,
        event_date=event_date,
        event_type=event_type,
        expected_impact=expected_impact,
        expected_extra_portions=expected_extra_portions,
        target_menu_item_id=target_menu_item_id,
        notes=notes,
        is_active=True
    )
    db.session.add(event)
    db.session.commit()
    return event.to_dict()


def update_kitchen_event(event_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    event = db.session.get(KitchenEvent, event_id)
    if not event:
        raise ValueError("Event not found.")

    if "title" in data:
        event.title = data["title"]
    if "eventDate" in data or "event_date" in data:
        d_str = data.get("eventDate") or data.get("event_date")
        event.event_date = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
    if "eventType" in data or "event_type" in data:
        event.event_type = data.get("eventType") or data.get("event_type")
    if "expectedImpact" in data or "expected_impact" in data:
        event.expected_impact = float(data.get("expectedImpact") or data.get("expected_impact"))
    if "expectedExtraPortions" in data or "expected_extra_portions" in data:
        event.expected_extra_portions = float(data.get("expectedExtraPortions") or data.get("expected_extra_portions"))
    if "notes" in data:
        event.notes = data["notes"]
    if "isActive" in data or "is_active" in data:
        event.is_active = bool(data.get("isActive") if "isActive" in data else data.get("is_active"))

    db.session.commit()
    return event.to_dict()


def delete_kitchen_event(event_id: int) -> bool:
    event = db.session.get(KitchenEvent, event_id)
    if not event:
        return False
    db.session.delete(event)
    db.session.commit()
    return True


def get_historical_event_impact() -> Dict[str, Any]:
    """
    Analyzes historical sales patterns:
    Compares average daily dish demand on festival & holiday dates vs regular weekdays.
    """
    sales_records = (
        db.session.query(
            func.date(Sale.order_timestamp).label("sale_date"),
            SaleItem.menu_item_id,
            MenuItem.name.label("dish_name"),
            MenuItem.category,
            func.sum(SaleItem.quantity).label("daily_quantity")
        )
        .join(SaleItem, Sale.id == SaleItem.sale_id)
        .join(MenuItem, SaleItem.menu_item_id == MenuItem.id)
        .group_by("sale_date", SaleItem.menu_item_id)
        .all()
    )

    if not sales_records:
        return {
            "success": True,
            "dishesImpact": [],
            "overallFestivalMultiplier": 1.35,
            "message": "Limited historical sales data."
        }

    # Partition by festival day vs regular day
    dish_stats: Dict[str, Dict[str, List[float]]] = {}
    for r in sales_records:
        d_obj = datetime.strptime(r.sale_date, "%Y-%m-%d").date()
        cal = get_calendar_features(d_obj)
        is_event = bool(cal["is_indian_festival"] or cal["is_public_holiday"])

        dish_name = r.dish_name
        if dish_name not in dish_stats:
            dish_stats[dish_name] = {"category": r.category, "event_days": [], "regular_days": []}

        if is_event:
            dish_stats[dish_name]["event_days"].append(float(r.daily_quantity))
        else:
            dish_stats[dish_name]["regular_days"].append(float(r.daily_quantity))

    results = []
    total_reg_means = []
    total_evt_means = []

    for d_name, data in dish_stats.items():
        reg_mean = float(np.mean(data["regular_days"])) if data["regular_days"] else 15.0
        evt_mean = float(np.mean(data["event_days"])) if data["event_days"] else (reg_mean * 1.30)

        lift_pct = round(((evt_mean - reg_mean) / reg_mean) * 100, 1) if reg_mean > 0 else 0.0

        total_reg_means.append(reg_mean)
        total_evt_means.append(evt_mean)

        results.append({
            "dishName": d_name,
            "category": data["category"],
            "regularDayAvg": round(reg_mean, 1),
            "festivalDayAvg": round(evt_mean, 1),
            "demandLiftPercentage": lift_pct,
            "eventSampleDays": len(data["event_days"]),
            "regularSampleDays": len(data["regular_days"]),
            "behaviorInsight": (
                f"Surges +{lift_pct}% during Indian cultural events and festivals"
                if lift_pct > 15
                else f"Consistent daily demand (+{lift_pct}% change on festive dates)"
            )
        })

    overall_reg = float(np.mean(total_reg_means)) if total_reg_means else 1.0
    overall_evt = float(np.mean(total_evt_means)) if total_evt_means else 1.35
    overall_mult = round(overall_evt / overall_reg, 2) if overall_reg > 0 else 1.35

    results.sort(key=lambda x: x["demandLiftPercentage"], reverse=True)

    return {
        "success": True,
        "overallFestivalMultiplier": overall_mult,
        "overallAverageLift": round((overall_mult - 1.0) * 100, 1),
        "dishesImpact": results
    }

