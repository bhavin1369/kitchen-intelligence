from flask import Blueprint, jsonify
from app.extensions import db
from app.models import (
    User, Kitchen, MenuItem, Ingredient, Recipe,
    Sale, InventoryBatch, StockMovement, Purchase, WasteRecord, Forecast
)

health_bp = Blueprint("health_bp", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    try:
        counts = {
            "users": User.query.count(),
            "kitchens": Kitchen.query.count(),
            "menu_items": MenuItem.query.count(),
            "ingredients": Ingredient.query.count(),
            "recipes": Recipe.query.count(),
            "sales": Sale.query.count(),
            "inventory_batches": InventoryBatch.query.count(),
            "stock_movements": StockMovement.query.count(),
            "purchases": Purchase.query.count(),
            "waste_records": WasteRecord.query.count(),
            "forecasts": Forecast.query.count()
        }
        return jsonify({
            "status": "healthy",
            "database": {
                "engine": "SQLite (WAL Mode)",
                "orm": "SQLAlchemy 2.x",
                "counts": counts
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "degraded",
            "error": str(e)
        }), 500
