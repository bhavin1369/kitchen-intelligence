"""
Purchase & Inventory Optimization Service:
1. Ingredient Requirement Calculation (Recipe Explosion from AI Demand Forecasts)
2. Purchase Recommendation Engine (Formula: max(0, Required + Safety - Usable))
3. Usable stock calculation excluding expired batches
4. Purchase Order generation & FEFO stock receiving
"""
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional
import numpy as np
from app.extensions import db
from app.models import (
    Ingredient, InventoryBatch, StockMovement,
    Recipe, MenuItem, Forecast, Purchase, PurchaseItem
)
from app.services.inventory_service import convert_quantity, receive_batch
from app.services.forecast_service import generate_forecasts


def calculate_ingredient_requirements(
    days_ahead: int = 3,
    start_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Explodes forecasted menu demand into total raw ingredient requirements across all dishes.
    Handles multiple dishes sharing the same ingredient with unit conversions and shrinkage loss.
    """
    if start_date is None:
        start_date = date.today() + timedelta(days=1)
    end_date = start_date + timedelta(days=days_ahead)

    # 1. Fetch forecasted demand for this window
    forecast_records = (
        Forecast.query
        .filter(Forecast.forecast_date >= start_date, Forecast.forecast_date < end_date)
        .all()
    )

    # If no forecasts exist for this horizon, dynamically generate them via the ML engine
    if not forecast_records:
        generate_forecasts(start_date=start_date, days_ahead=days_ahead)
        forecast_records = (
            Forecast.query
            .filter(Forecast.forecast_date >= start_date, Forecast.forecast_date < end_date)
            .all()
        )

    # Aggregate forecasted portions per menu item over the horizon
    dish_forecasts: Dict[int, float] = {}
    for f in forecast_records:
        dish_forecasts[f.menu_item_id] = dish_forecasts.get(f.menu_item_id, 0.0) + f.predicted_quantity

    total_forecasted_portions = sum(dish_forecasts.values())

    # 2. Explode Bill of Materials (BOM) across all dishes
    # ingredient_id -> { total_required, contributing_dishes: [] }
    ingredient_requirements: Dict[int, Dict[str, Any]] = {}

    for dish_id, portions in dish_forecasts.items():
        if portions <= 0:
            continue
        dish = db.session.get(MenuItem, dish_id)
        if not dish:
            continue

        recipes = Recipe.query.filter_by(menu_item_id=dish.id).all()
        for rec in recipes:
            ing = rec.ingredient
            if not ing:
                continue

            # Convert recipe portion quantity to ingredient's standard base unit
            base_portion_qty = convert_quantity(rec.quantity, rec.unit, ing.unit)

            # Account for preparation shrinkage / trimming loss
            loss_factor = 1.0 + ((rec.prep_loss_percentage or 0.0) / 100.0)
            required_dish_qty = round(portions * base_portion_qty * loss_factor, 3)

            if ing.id not in ingredient_requirements:
                ingredient_requirements[ing.id] = {
                    "ingredientId": ing.id,
                    "ingredientName": ing.name,
                    "sku": ing.sku,
                    "category": ing.category,
                    "unit": ing.unit,
                    "unitCost": ing.unit_cost,
                    "totalRequired": 0.0,
                    "contributingDishes": []
                }

            ingredient_requirements[ing.id]["totalRequired"] = round(
                ingredient_requirements[ing.id]["totalRequired"] + required_dish_qty, 3
            )
            ingredient_requirements[ing.id]["contributingDishes"].append({
                "dishName": dish.name,
                "portions": round(portions, 1),
                "portionQuantity": rec.quantity,
                "recipeUnit": rec.unit,
                "dishRequirement": required_dish_qty,
                "baseUnit": ing.unit
            })

    return {
        "startDate": start_date.isoformat(),
        "daysAhead": days_ahead,
        "totalForecastedPortions": round(total_forecasted_portions, 1),
        "requirements": ingredient_requirements
    }


def generate_purchase_recommendations(
    days_ahead: int = 3,
    start_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Implements the Purchase Recommendation Engine:
    Purchase Quantity = Max(0, Required Quantity + Safety Stock - Usable Stock)

    Rules:
    - Considers stock from all active usable batches.
    - Excludes expired batches (expiry_date < today) from usable stock.
    - Uses safety stock = reorder_point (configurable par buffer).
    - Estimates purchase costs and groups by preferred supplier.
    """
    today = date.today()
    if start_date is None:
        start_date = today + timedelta(days=1)

    req_data = calculate_ingredient_requirements(days_ahead=days_ahead, start_date=start_date)
    requirements_map = req_data["requirements"]

    ingredients = Ingredient.query.order_by(Ingredient.category.asc(), Ingredient.name.asc()).all()

    recommendations: List[Dict[str, Any]] = []
    supplier_groups: Dict[str, Dict[str, Any]] = {}
    total_estimated_po_cost = 0.0
    items_needing_reorder = 0
    urgent_alerts_count = 0

    for ing in ingredients:
        # 1. Calculate usable stock from active non-expired batches
        active_batches = InventoryBatch.query.filter_by(
            ingredient_id=ing.id,
            status="active"
        ).order_by(InventoryBatch.expiry_date.asc()).all()

        usable_stock = 0.0
        expired_stock = 0.0
        nearest_expiry = None
        near_expiry_batches = 0

        for b in active_batches:
            if b.expiry_date < today:
                expired_stock += b.remaining_quantity
            else:
                usable_stock += b.remaining_quantity
                if nearest_expiry is None or b.expiry_date < nearest_expiry:
                    nearest_expiry = b.expiry_date
                if (b.expiry_date - today).days <= 2:
                    near_expiry_batches += 1

        usable_stock = round(usable_stock, 2)
        expired_stock = round(expired_stock, 2)

        # 2. Required quantity from AI demand forecast
        req_info = requirements_map.get(ing.id, {})
        required_qty = req_info.get("totalRequired", 0.0)
        contributing = req_info.get("contributingDishes", [])

        # 3. Safety Stock / Reorder Point
        safety_stock = round(ing.reorder_point, 2)

        # 4. Purchase Recommendation Formula:
        # Purchase Quantity = Maximum of zero and (Required Quantity + Safety Stock - Usable Stock)
        deficit = (required_qty + safety_stock) - usable_stock
        recommended_purchase = max(0.0, round(deficit, 2))

        # 5. Estimated Purchase Cost
        est_cost = round(recommended_purchase * ing.unit_cost, 2)

        # 6. Determine Stock Status
        if usable_stock <= 0.0:
            stock_status = "out_of_stock"
            urgent_alerts_count += 1
        elif usable_stock < required_qty:
            stock_status = "critical_shortage"
            urgent_alerts_count += 1
        elif usable_stock <= safety_stock or recommended_purchase > 0:
            stock_status = "low_stock"
        else:
            stock_status = "sufficient"

        if recommended_purchase > 0:
            items_needing_reorder += 1
            total_estimated_po_cost += est_cost

        item_rec = {
            "ingredientId": ing.id,
            "sku": ing.sku,
            "name": ing.name,
            "category": ing.category,
            "unit": ing.unit,
            "unitCost": ing.unit_cost,
            "currentStock": round(ing.current_stock, 2),
            "usableStock": usable_stock,
            "expiredStock": expired_stock,
            "requiredQuantity": round(required_qty, 2),
            "safetyStock": safety_stock,
            "parLevel": ing.par_level,
            "recommendedPurchase": recommended_purchase,
            "approvedQuantity": recommended_purchase, # Defaults to recommended
            "estimatedCost": est_cost,
            "status": stock_status,
            "nearestExpiryDate": nearest_expiry.isoformat() if nearest_expiry else None,
            "daysToExpiry": (nearest_expiry - today).days if nearest_expiry else 999,
            "hasNearExpiry": near_expiry_batches > 0,
            "preferredSupplier": ing.preferred_supplier or "Local Wholesaler",
            "activeBatchCount": len(active_batches),
            "contributingDishes": contributing
        }
        recommendations.append(item_rec)

        # Group by supplier for consolidated purchase orders
        supplier = item_rec["preferredSupplier"]
        if supplier not in supplier_groups:
            supplier_groups[supplier] = {
                "supplierName": supplier,
                "itemsCount": 0,
                "totalRecommendedCost": 0.0,
                "items": []
            }

        supplier_groups[supplier]["items"].append(item_rec)
        if recommended_purchase > 0:
            supplier_groups[supplier]["itemsCount"] += 1
            supplier_groups[supplier]["totalRecommendedCost"] = round(
                supplier_groups[supplier]["totalRecommendedCost"] + est_cost, 2
            )

    return {
        "success": True,
        "horizonDays": days_ahead,
        "startDate": start_date.isoformat(),
        "totalForecastedPortions": req_data["totalForecastedPortions"],
        "totalEstimatedCost": round(total_estimated_po_cost, 2),
        "itemsNeedingReorder": items_needing_reorder,
        "urgentAlertsCount": urgent_alerts_count,
        "totalIngredientsTracked": len(ingredients),
        "recommendations": recommendations,
        "bySupplier": list(supplier_groups.values())
    }


def record_stock_consumption(
    ingredient_id: int,
    quantity: float,
    reason: str = "kitchen_prep",
    reference_id: Optional[str] = None,
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Consumes inventory using First-Expired, First-Out (FEFO) prioritizing earliest expiry dates.
    Updates batches, checks against negative inventory, and records stock movement.
    """
    from app.services.inventory_service import consume_ingredient_fefo
    ingredient = db.session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise ValueError("Ingredient not found.")
    if quantity <= 0:
        raise ValueError("Consumption quantity must be positive.")

    movements = consume_ingredient_fefo(
        ingredient=ingredient,
        required_qty=quantity,
        required_unit=ingredient.unit,
        reference_id=reference_id or f"MANUAL-{date.today().strftime('%m%d')}",
        reference_type=reason,
        user_id=user_id,
        notes=f"Stock consumption for {reason}"
    )
    db.session.commit()

    return {
        "success": True,
        "message": f"Successfully consumed {quantity} {ingredient.unit} of '{ingredient.name}' via FEFO.",
        "newCurrentStock": ingredient.current_stock,
        "movementsCreated": len(movements)
    }
