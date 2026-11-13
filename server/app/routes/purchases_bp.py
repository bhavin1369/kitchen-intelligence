from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Purchase, PurchaseItem, Ingredient, InventoryBatch, StockMovement, Forecast, Recipe
from app.services.inventory_service import receive_batch

purchases_bp = Blueprint("purchases_bp", __name__)

@purchases_bp.route("", methods=["GET"])
def get_purchases():
    status = request.args.get("status")
    query = Purchase.query
    if status and status.lower() != "all":
        query = query.filter(Purchase.status.ilike(status))

    pos = query.order_by(Purchase.order_date.desc(), Purchase.id.desc()).all()
    return jsonify({
        "success": True,
        "total": len(pos),
        "data": [po.to_dict() for po in pos]
    }), 200


@purchases_bp.route("/<int:po_id>", methods=["GET"])
def get_purchase_detail(po_id):
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404
    return jsonify({"success": True, "data": po.to_dict()}), 200


@purchases_bp.route("", methods=["POST"])
def create_purchase():
    data = request.get_json() or {}
    supplier = data.get("supplierName") or data.get("supplier_name", "Local Supplier")
    items_data = data.get("items", [])
    lead_time = data.get("leadTime") or data.get("lead_time", "24 hours")
    contact = data.get("contact", "")
    notes = data.get("notes", "")

    if not supplier:
        return jsonify({"success": False, "message": "Supplier name is required."}), 400
    if not items_data:
        return jsonify({"success": False, "message": "Purchase order must have at least one line item."}), 400

    count = Purchase.query.count()
    po_number = data.get("poNumber") or f"PO-{100 + count + 1}"

    po = Purchase(
        po_number=po_number,
        supplier_name=supplier,
        contact=contact,
        lead_time=lead_time,
        order_date=date.today(),
        delivery_due_date=date.today() + timedelta(days=1),
        total_estimated_cost=0.0,
        status="draft",
        notes=notes
    )
    db.session.add(po)
    db.session.flush()

    total_cost = 0.0
    for it in items_data:
        ing_id = it.get("ingredientId") or it.get("ingredient_id")
        rec_qty = float(it.get("recommendedPurchase") or it.get("recommended_quantity") or 1.0)
        app_qty = float(it.get("approvedQuantity") or rec_qty)
        unit = it.get("unit", "kg")
        unit_cost = float(it.get("unitCost") or it.get("unit_cost") or 50.0)
        subtotal = round(app_qty * unit_cost, 2)
        total_cost += subtotal

        po_item = PurchaseItem(
            purchase_id=po.id,
            ingredient_id=ing_id,
            forecasted_demand=float(it.get("forecastedDemand", 0.0)),
            current_stock=float(it.get("currentStock", 0.0)),
            recommended_quantity=rec_qty,
            approved_quantity=app_qty,
            unit=unit,
            unit_cost=unit_cost,
            subtotal=subtotal
        )
        db.session.add(po_item)

    po.total_estimated_cost = round(total_cost, 2)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Purchase order {po.po_number} created.",
        "data": po.to_dict()
    }), 201


@purchases_bp.route("/<int:po_id>", methods=["PUT"])
def update_purchase_status(po_id):
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404

    data = request.get_json() or {}
    if "status" in data:
        po.status = data["status"]
    if "notes" in data:
        po.notes = data["notes"]

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Purchase order {po.po_number} status updated to '{po.status}'.",
        "data": po.to_dict()
    }), 200


@purchases_bp.route("/<int:po_id>/receive", methods=["POST"])
def receive_purchase_order(po_id):
    """
    Receives all items from an approved PO directly into FEFO inventory batches,
    updating stock and logging stock movements atomically.
    """
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404
    if po.status == "received":
        return jsonify({"success": False, "message": "This purchase order has already been received."}), 400

    received_batches = []
    today = date.today()

    try:
        for it in po.items:
            ing = it.ingredient
            if not ing:
                continue

            # Batch expiry based on shelf life
            shelf_days = ing.shelf_life_days or 7
            exp_date = today + timedelta(days=shelf_days)
            batch_num = f"{ing.name[:3].upper()}-{today.strftime('%m%d')}-{it.id}"

            batch = receive_batch(
                ingredient=ing,
                batch_number=batch_num,
                quantity=it.approved_quantity,
                unit=it.unit,
                unit_cost=it.unit_cost,
                received_date=today,
                expiry_date=exp_date,
                supplier_name=po.supplier_name,
                reference_id=po.po_number
            )
            received_batches.append(batch.batch_number)

        po.status = "received"
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"PO {po.po_number} marked received. {len(received_batches)} batches stocked in.",
            "batchesReceived": received_batches,
            "data": po.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to receive PO: {str(e)}"}), 500
