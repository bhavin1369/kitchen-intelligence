import datetime
from flask import Blueprint, jsonify
from app.utils.db import query_all, query_one

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    try:
        tables = [
            "users", "categories", "suppliers", "ingredients", 
            "inventory_batches", "menu_items", "recipes", 
            "sales_orders", "sales_order_items", "waste_logs", 
            "calendar_events", "purchase_orders"
        ]
        counts = {}
        for t in tables:
            row = query_one(f"SELECT COUNT(*) as c FROM {t};")
            counts[t] = row["c"] if row else 0

        return jsonify({
            "success": True,
            "status": "healthy",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "version": "1.0.0",
            "database": {
                "engine": "SQLite WAL",
                "counts": counts
            }
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }), 500

