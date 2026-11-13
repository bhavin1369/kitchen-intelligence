from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Ingredient, InventoryBatch, StockMovement
from app.services.inventory_service import receive_batch, consume_ingredient_fefo, convert_quantity

inventory_bp = Blueprint("inventory_bp", __name__)

# ==================== INGREDIENTS ====================

@inventory_bp.route("/ingredients", methods=["GET"])
def get_ingredients():
    category = request.args.get("category")
    low_stock_only = request.args.get("low_stock", "").lower() in ("true", "1")
    search = request.args.get("search", "").strip()

    query = Ingredient.query
    if category and category.lower() != "all":
        query = query.filter(Ingredient.category.ilike(category))
    if search:
        query = query.filter(
            (Ingredient.name.ilike(f"%{search}%")) |
            (Ingredient.sku.ilike(f"%{search}%")) |
            (Ingredient.preferred_supplier.ilike(f"%{search}%"))
        )

    ingredients = query.order_by(Ingredient.name.asc()).all()
    if low_stock_only:
        ingredients = [i for i in ingredients if i.current_stock <= i.reorder_point]

    return jsonify({
        "success": True,
        "total": len(ingredients),
        "data": [i.to_dict(include_batches=False) for i in ingredients]
    }), 200


@inventory_bp.route("/ingredients/<int:ing_id>", methods=["GET"])
def get_ingredient_detail(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404
    return jsonify({"success": True, "data": ingredient.to_dict(include_batches=True)}), 200


@inventory_bp.route("/ingredients", methods=["POST"])
def create_ingredient():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    category = data.get("category", "Produce").strip()
    unit = data.get("unit", "kg").strip().lower()
    par_level = float(data.get("parLevel") or data.get("par_level") or 10.0)
    reorder_point = float(data.get("reorderPoint") or data.get("reorder_point") or 5.0)
    unit_cost = float(data.get("unitCost") or data.get("unit_cost") or 50.0)
    shelf_life = int(data.get("shelfLifeDays") or data.get("shelf_life_days") or 7)
    supplier = data.get("preferredSupplier") or data.get("preferred_supplier") or "General Market"

    if not name:
        return jsonify({"success": False, "message": "Ingredient name is required."}), 400
    if unit not in ("kg", "g", "l", "ml", "pcs", "dozen"):
        return jsonify({"success": False, "message": f"Unsupported unit '{unit}'."}), 400

    sku = data.get("sku") or f"ING-{name[:3].upper()}-{Ingredient.query.count()+1:02d}"

    ingredient = Ingredient(
        sku=sku,
        name=name,
        category=category,
        unit=unit,
        current_stock=0.0,
        par_level=par_level,
        reorder_point=reorder_point,
        unit_cost=unit_cost,
        shelf_life_days=shelf_life,
        preferred_supplier=supplier
    )
    db.session.add(ingredient)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Ingredient '{name}' created successfully.",
        "data": ingredient.to_dict()
    }), 201


@inventory_bp.route("/ingredients/<int:ing_id>", methods=["PUT"])
def update_ingredient(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404

    data = request.get_json() or {}
    if "name" in data:
        ingredient.name = data["name"].strip()
    if "category" in data:
        ingredient.category = data["category"].strip()
    if "parLevel" in data or "par_level" in data:
        ingredient.par_level = float(data.get("parLevel") or data.get("par_level"))
    if "reorderPoint" in data or "reorder_point" in data:
        ingredient.reorder_point = float(data.get("reorderPoint") or data.get("reorder_point"))
    if "unitCost" in data or "unit_cost" in data:
        ingredient.unit_cost = float(data.get("unitCost") or data.get("unit_cost"))
    if "shelfLifeDays" in data or "shelf_life_days" in data:
        ingredient.shelf_life_days = int(data.get("shelfLifeDays") or data.get("shelf_life_days"))
    if "preferredSupplier" in data or "preferred_supplier" in data:
        ingredient.preferred_supplier = data.get("preferredSupplier") or data.get("preferred_supplier")

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Ingredient '{ingredient.name}' updated.",
        "data": ingredient.to_dict()
    }), 200


# ==================== BATCHES (FEFO TRACKING) ====================

@inventory_bp.route("/batches", methods=["GET"])
def get_batches():
    status = request.args.get("status") # active, depleted, expired
    urgency = request.args.get("urgency") # critical, warning, fresh
    ingredient_id = request.args.get("ingredientId") or request.args.get("ingredient_id")

    query = InventoryBatch.query
    if status and status.lower() != "all":
        query = query.filter_by(status=status)
    if ingredient_id:
        query = query.filter_by(ingredient_id=int(ingredient_id))

    # Strict FEFO ordering by expiration date
    batches = query.order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc()).all()

    if urgency:
        batches = [b for b in batches if b.shelf_life_status == urgency]

    return jsonify({
        "success": True,
        "total": len(batches),
        "data": [b.to_dict() for b in batches]
    }), 200


@inventory_bp.route("/batches", methods=["POST"])
def receive_new_batch():
    """Receive delivery batch into stock and create FEFO tracking record"""
    data = request.get_json() or {}
    ing_name_or_id = data.get("ingredientId") or data.get("ingredient_id") or data.get("ingredientName")
    batch_num = data.get("batchNumber") or data.get("batch_number")
    qty = float(data.get("quantity") or data.get("initialQuantity") or 0.0)
    unit = data.get("unit", "kg")
    cost = float(data.get("unitCost") or data.get("unit_cost") or 0.0)
    expiry_str = data.get("expiryDate") or data.get("expiry_date")
    supplier = data.get("supplierName") or data.get("supplier_name")

    if not ing_name_or_id:
        return jsonify({"success": False, "message": "Ingredient identifier is required."}), 400
    if not batch_num:
        return jsonify({"success": False, "message": "Batch number is required."}), 400
    if qty <= 0:
        return jsonify({"success": False, "message": "Quantity must be positive."}), 400
    if not expiry_str:
        return jsonify({"success": False, "message": "Expiry date is required."}), 400

    # Resolve ingredient
    if isinstance(ing_name_or_id, int) or (isinstance(ing_name_or_id, str) and ing_name_or_id.isdigit()):
        ingredient = db.session.get(Ingredient, int(ing_name_or_id))
    else:
        ingredient = Ingredient.query.filter(Ingredient.name.ilike(str(ing_name_or_id).strip())).first()

    if not ingredient:
        return jsonify({"success": False, "message": f"Ingredient '{ing_name_or_id}' not found."}), 404

    try:
        exp_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format for expiryDate (use YYYY-MM-DD)."}), 400

    rec_date = date.today()

    try:
        batch = receive_batch(
            ingredient=ingredient,
            batch_number=batch_num,
            quantity=qty,
            unit=unit,
            unit_cost=cost or ingredient.unit_cost,
            received_date=rec_date,
            expiry_date=exp_date,
            supplier_name=supplier or ingredient.preferred_supplier
        )
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Batch {batch_num} received successfully. Stock updated.",
            "data": batch.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


# ==================== STOCK MOVEMENTS & ADJUSTMENTS ====================

@inventory_bp.route("/adjust", methods=["POST"])
def adjust_stock():
    """Manual inventory stock adjustment with audit trail"""
    data = request.get_json() or {}
    ing_id = data.get("ingredientId") or data.get("ingredient_id")
    new_stock = float(data.get("newStock") or data.get("currentStock") or 0.0)
    notes = data.get("notes", "Physical stock take adjustment")

    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404
    if new_stock < 0:
        return jsonify({"success": False, "message": "Inventory cannot be negative."}), 400

    diff = round(new_stock - ingredient.current_stock, 4)
    ingredient.current_stock = new_stock

    movement = StockMovement(
        ingredient_id=ingredient.id,
        movement_type="manual_adjustment",
        quantity=diff,
        unit=ingredient.unit,
        unit_cost=ingredient.unit_cost,
        reference_type="audit",
        notes=notes,
        created_at=datetime.utcnow()
    )
    db.session.add(movement)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Stock for '{ingredient.name}' adjusted to {new_stock} {ingredient.unit}.",
        "data": ingredient.to_dict()
    }), 200


@inventory_bp.route("/movements", methods=["GET"])
def get_movements():
    ingredient_id = request.args.get("ingredientId") or request.args.get("ingredient_id")
    movement_type = request.args.get("type")
    limit = int(request.args.get("limit", 50))

    query = StockMovement.query
    if ingredient_id:
        query = query.filter_by(ingredient_id=int(ingredient_id))
    if movement_type and movement_type.lower() != "all":
        query = query.filter_by(movement_type=movement_type)

    movements = query.order_by(StockMovement.created_at.desc()).limit(limit).all()
    return jsonify({
        "success": True,
        "total": len(movements),
        "data": [m.to_dict() for m in movements]
    }), 200
