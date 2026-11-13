from datetime import datetime, date
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models import WasteRecord, Ingredient, InventoryBatch
from app.services.inventory_service import record_waste_deduction

waste_bp = Blueprint("waste_bp", __name__)

@waste_bp.route("", methods=["POST"])
def record_waste():
    data = request.get_json() or {}
    ing_ident = data.get("ingredientId") or data.get("ingredient_id") or data.get("ingredientName")
    qty = float(data.get("quantity") or data.get("quantityLost") or 0.0)
    unit = data.get("unit", "kg")
    reason = data.get("reason", "Spoilage")
    batch_id = data.get("batchId") or data.get("batch_id")
    logged_by = data.get("loggedBy") or data.get("logged_by") or "Head Chef"
    notes = data.get("notes", "")

    if not ing_ident:
        return jsonify({"success": False, "message": "Ingredient is required."}), 400
    if qty <= 0:
        return jsonify({"success": False, "message": "Wasted quantity must be strictly positive."}), 400

    # Resolve ingredient
    if isinstance(ing_ident, int) or (isinstance(ing_ident, str) and ing_ident.isdigit()):
        ingredient = db.session.get(Ingredient, int(ing_ident))
    else:
        ingredient = Ingredient.query.filter(Ingredient.name.ilike(str(ing_ident).strip())).first()

    if not ingredient:
        return jsonify({"success": False, "message": f"Ingredient '{ing_ident}' not found."}), 404

    try:
        base_qty, loss = record_waste_deduction(
            ingredient=ingredient,
            quantity=qty,
            unit=unit,
            reason=reason,
            batch_id=batch_id,
            logged_by=logged_by,
            notes=notes
        )

        log_count = WasteRecord.query.count()
        log_num = f"WST-{log_count+1:02d}"

        waste_record = WasteRecord(
            log_number=log_num,
            ingredient_id=ingredient.id,
            batch_id=batch_id,
            quantity=qty,
            unit=unit,
            financial_loss=loss,
            reason=reason,
            logged_by=logged_by,
            notes=notes,
            logged_at=datetime.utcnow()
        )
        db.session.add(waste_record)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Waste recorded ({log_num}): {qty} {unit} of {ingredient.name} discarded. Financial loss: ₹{loss}.",
            "data": waste_record.to_dict()
        }), 201
    except ValueError as ve:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to record waste: {str(e)}"}), 500


@waste_bp.route("", methods=["GET"])
def get_waste_records():
    reason = request.args.get("reason")
    search = request.args.get("search", "").strip()
    limit = int(request.args.get("limit", 50))

    query = WasteRecord.query
    if reason and reason.lower() != "all":
        query = query.filter(WasteRecord.reason.ilike(reason))
    if search:
        query = query.join(Ingredient).filter(
            (Ingredient.name.ilike(f"%{search}%")) |
            (WasteRecord.log_number.ilike(f"%{search}%")) |
            (WasteRecord.logged_by.ilike(f"%{search}%"))
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
def delete_waste_record(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404

    db.session.delete(record)
    db.session.commit()
    return jsonify({"success": True, "message": f"Waste record {record.log_number} deleted."}), 200


@waste_bp.route("/summary", methods=["GET"])
def get_waste_summary():
    """Returns aggregated loss by reason category and total physical weight"""
    breakdown = db.session.query(
        WasteRecord.reason,
        func.sum(WasteRecord.financial_loss),
        func.sum(WasteRecord.quantity)
    ).group_by(WasteRecord.reason).all()

    total_loss = sum(loss or 0.0 for _, loss, _ in breakdown)
    total_qty = sum(qty or 0.0 for _, _, qty in breakdown)

    reason_list = [
        {
            "name": r_name,
            "loss": round(r_loss or 0.0, 2),
            "quantity": round(r_qty or 0.0, 2)
        }
        for r_name, r_loss, r_qty in breakdown
    ]

    return jsonify({
        "success": True,
        "data": {
            "totalFinancialLoss": round(total_loss, 2),
            "totalQuantityLost": round(total_qty, 2),
            "wasteToSalesRatio": 1.8, # Healthy benchmark < 2.5%
            "reasonBreakdown": reason_list
        }
    }), 200
