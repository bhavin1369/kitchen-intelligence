from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response
from app.extensions import db
from app.models import WasteRecord, Ingredient, MenuItem, InventoryBatch
from app.utils.auth import roles_required
from app.services.waste_service import (
    record_waste_entry,
    get_waste_analytics,
    get_expiry_alerts,
    get_waste_risk_analysis,
    get_leftover_recipe_suggestions,
    export_waste_records_csv
)

waste_bp = Blueprint("waste_bp", __name__)


@waste_bp.route("", methods=["POST"])
def record_waste():
    """
    Records a food waste event for either raw ingredients or prepared dishes.
    Deducts stock via FEFO for raw ingredients and calculates financial loss.
    """
    data = request.get_json() or {}
    item_type_raw = data.get("itemType") or data.get("item_type", "ingredient")
    if str(item_type_raw).lower() in ("dish", "prepared", "prepared_item", "prepared_food"):
        item_type = "prepared_item"
    else:
        item_type = "ingredient"

    ing_id = data.get("ingredientId") or data.get("ingredient_id") or (data.get("itemId") if item_type == "ingredient" else None)
    menu_id = data.get("menuItemId") or data.get("menu_item_id") or (data.get("itemId") if item_type == "prepared_item" else None)
    item_name = data.get("itemName") or data.get("item_name")
    qty = float(data.get("quantity") or data.get("quantityLost") or 0.0)
    unit = data.get("unit", "kg")
    reason = data.get("reason", "Spoilage")
    batch_id = data.get("batchId") or data.get("batch_id")
    logged_by = data.get("loggedBy") or data.get("logged_by", "Head Chef")
    notes = data.get("notes", "")

    date_str = data.get("date") or data.get("loggedAt") or data.get("logged_at")
    log_d = None
    if date_str:
        try:
            log_d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    try:
        res = record_waste_entry(
            item_type=item_type,
            ingredient_id=int(ing_id) if ing_id else None,
            menu_item_id=int(menu_id) if menu_id else None,
            item_name=item_name,
            quantity=qty,
            unit=unit,
            reason=reason,
            batch_id=int(batch_id) if batch_id else None,
            log_date=log_d,
            logged_by=logged_by,
            notes=notes
        )
        return jsonify(res), 201
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to record waste: {str(e)}"}), 500


@waste_bp.route("", methods=["GET"])
def get_waste_records():
    """Retrieves waste records with filters"""
    reason = request.args.get("reason")
    item_type = request.args.get("itemType") or request.args.get("item_type")
    search = request.args.get("search", "").strip()
    limit = int(request.args.get("limit", 100))

    query = WasteRecord.query
    if reason and reason.lower() != "all":
        query = query.filter(WasteRecord.reason.ilike(reason))
    if item_type and item_type.lower() != "all":
        query = query.filter(WasteRecord.item_type.ilike(item_type))
    if search:
        query = query.filter(
            (WasteRecord.item_name.ilike(f"%{search}%")) |
            (WasteRecord.log_number.ilike(f"%{search}%")) |
            (WasteRecord.logged_by.ilike(f"%{search}%")) |
            (WasteRecord.notes.ilike(f"%{search}%"))
        )

    records = query.order_by(WasteRecord.logged_at.desc()).limit(limit).all()
    return jsonify({
        "success": True,
        "total": len(records),
        "data": [r.to_dict() for r in records]
    }), 200


@waste_bp.route("/<int:waste_id>", methods=["GET"])
def get_waste_detail(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404
    return jsonify({"success": True, "data": record.to_dict()}), 200


@waste_bp.route("/<int:waste_id>", methods=["PUT"])
def update_waste_record(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404

    data = request.get_json() or {}
    if "reason" in data:
        record.reason = data["reason"]
    if "notes" in data:
        record.notes = data["notes"]
    if "loggedBy" in data or "logged_by" in data:
        record.logged_by = data.get("loggedBy") or data.get("logged_by")

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Waste record {record.log_number} updated.",
        "data": record.to_dict()
    }), 200


@waste_bp.route("/<int:waste_id>", methods=["DELETE"])
@roles_required("admin", "manager")
def delete_waste_record(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404

    db.session.delete(record)
    db.session.commit()
    return jsonify({"success": True, "message": f"Waste record {record.log_number} deleted."}), 200


@waste_bp.route("/summary", methods=["GET"])
def get_waste_summary_endpoint():
    """Returns aggregated loss by reason category and total physical volume"""
    days = int(request.args.get("days", 30))
    data = get_waste_analytics(days=days)
    return jsonify({
        "success": True,
        "data": {
            "totalFinancialLoss": data["totalFinancialLoss"],
            "totalQuantityLost": data["totalQuantityLost"],
            "wasteToSalesRatio": data["wasteToSalesRatio"],
            "reasonBreakdown": data["reasonBreakdown"]
        }
    }), 200


@waste_bp.route("/analytics", methods=["GET"])
def get_waste_analytics_endpoint():
    """Returns in-depth waste analytics: daily trends, monthly history, top wasted SKUs"""
    days = int(request.args.get("days", 30))
    data = get_waste_analytics(days=days)
    return jsonify(data), 200


@waste_bp.route("/expiry-alerts", methods=["GET"])
def get_expiry_alerts_endpoint():
    """Returns ingredients & batches approaching expiry or already expired with FEFO actions"""
    alerts = get_expiry_alerts()
    return jsonify(alerts), 200


@waste_bp.route("/risk-analysis", methods=["GET"])
def get_waste_risk_analysis_endpoint():
    """
    Predictive Waste Risk Analysis:
    Combines shelf life and ML sales forecasts to determine High, Medium, and Low risk surplus.
    """
    horizon = int(request.args.get("horizon", 5))
    horizon = max(1, min(14, horizon))
    risk_data = get_waste_risk_analysis(horizon_days=horizon)
    return jsonify(risk_data), 200


@waste_bp.route("/leftovers/suggestions", methods=["GET"])
def get_leftover_suggestions_endpoint():
    """
    AI Leftover-to-Recipe Suggestions:
    Upcycles near-expiry ingredients with strict food-safety validation.
    """
    suggestions = get_leftover_recipe_suggestions()
    return jsonify(suggestions), 200


@waste_bp.route("/export/csv", methods=["GET"])
def export_waste_csv_endpoint():
    """Exports waste log records as downloadable CSV file"""
    reason = request.args.get("reason")
    item_type = request.args.get("itemType") or request.args.get("item_type")
    search = request.args.get("search")

    csv_data = export_waste_records_csv(reason=reason, item_type=item_type, search=search)
    filename = f"food_waste_report_{date.today().strftime('%Y%m%d')}.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
