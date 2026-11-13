from flask import Blueprint, jsonify
from app.services.reports_service import get_dashboard_statistics, get_sales_summary_report
from app.models import Ingredient, InventoryBatch, MenuItem
from app.extensions import db
from datetime import date, timedelta

reports_bp = Blueprint("reports_bp", __name__)

@reports_bp.route("/dashboard", methods=["GET"])
def dashboard_stats():
    """Returns real-time dashboard stats for the executive command center"""
    stats = get_dashboard_statistics()
    return jsonify({"success": True, "data": stats}), 200


@reports_bp.route("/sales", methods=["GET"])
def sales_summary():
    """Returns sales analytics and category breakdown"""
    summary = get_sales_summary_report()
    return jsonify({"success": True, "data": summary}), 200


@reports_bp.route("/inventory", methods=["GET"])
def inventory_summary():
    """Returns inventory valuation and expiry posture"""
    ingredients = Ingredient.query.all()
    today = date.today()
    critical_date = today + timedelta(days=2)

    total_val = round(sum(i.current_stock * i.unit_cost for i in ingredients), 2)
    low_stock = [i.to_dict() for i in ingredients if i.current_stock <= i.reorder_point]

    batches = InventoryBatch.query.filter(
        InventoryBatch.status == "active",
        InventoryBatch.expiry_date <= critical_date,
        InventoryBatch.expiry_date >= today
    ).all()

    return jsonify({
        "success": True,
        "data": {
            "totalValuation": total_val,
            "totalSkus": len(ingredients),
            "lowStockCount": len(low_stock),
            "lowStockItems": low_stock,
            "nearExpiryCount": len(batches),
            "nearExpiryBatches": [b.to_dict() for b in batches]
        }
    }), 200

