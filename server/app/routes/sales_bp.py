from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Sale, SaleItem
from app.services.sales_service import process_new_sale, parse_and_import_sales_csv
from app.utils.auth import jwt_required

sales_bp = Blueprint("sales_bp", __name__)

@sales_bp.route("", methods=["POST"])
def create_sale():
    data = request.get_json() or {}
    user_id = getattr(g, "current_user", None)
    user_id = user_id.id if user_id else None

    try:
        sale = process_new_sale(data, user_id=user_id)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Order {sale.order_number} recorded successfully and ingredients deducted via FEFO.",
            "data": sale.to_dict()
        }), 201
    except ValueError as ve:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@sales_bp.route("", methods=["GET"])
def get_sales():
    channel = request.args.get("channel")
    status = request.args.get("status")
    search = request.args.get("search", "").strip()
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    query = Sale.query

    if channel and channel.lower() != "all":
        query = query.filter(Sale.channel.ilike(channel))
    if status and status.lower() != "all":
        query = query.filter(Sale.status.ilike(status))
    if search:
        query = query.filter(
            (Sale.order_number.ilike(f"%{search}%")) |
            (Sale.customer_name.ilike(f"%{search}%")) |
            (Sale.table_number.ilike(f"%{search}%"))
        )

    total_count = query.count()
    sales = query.order_by(Sale.order_timestamp.desc()).offset(offset).limit(limit).all()

    return jsonify({
        "success": True,
        "total": total_count,
        "data": [s.to_dict() for s in sales]
    }), 200


@sales_bp.route("/<int:sale_id>", methods=["GET"])
def get_sale_detail(sale_id):
    sale = db.session.get(Sale, sale_id)
    if not sale:
        return jsonify({"success": False, "message": "Sale order not found."}), 404
    return jsonify({"success": True, "data": sale.to_dict()}), 200


@sales_bp.route("/<int:sale_id>", methods=["PUT"])
def update_sale(sale_id):
    sale = db.session.get(Sale, sale_id)
    if not sale:
        return jsonify({"success": False, "message": "Sale order not found."}), 404

    data = request.get_json() or {}
    if "status" in data:
        sale.status = data["status"]
    if "tableNumber" in data or "table_number" in data:
        sale.table_number = data.get("tableNumber") or data.get("table_number")
    if "channel" in data:
        sale.channel = data["channel"]
    if "paymentMethod" in data or "payment_method" in data:
        sale.payment_method = data.get("paymentMethod") or data.get("payment_method")

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Sale {sale.order_number} updated successfully.",
        "data": sale.to_dict()
    }), 200


@sales_bp.route("/<int:sale_id>", methods=["DELETE"])
def delete_sale(sale_id):
    sale = db.session.get(Sale, sale_id)
    if not sale:
        return jsonify({"success": False, "message": "Sale order not found."}), 404

    db.session.delete(sale)
    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Sale order {sale.order_number} deleted successfully."
    }), 200


@sales_bp.route("/upload-csv", methods=["POST"])
def upload_sales_csv():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded in form field 'file'."}), 400

    file = request.files["file"]
    if not file or not file.filename.endswith(".csv"):
        return jsonify({"success": False, "message": "Please upload a valid .csv file."}), 400

    try:
        content = file.stream.read().decode("utf-8")
        result = parse_and_import_sales_csv(content)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully imported {result['ordersImported']} orders from CSV.",
            "data": result
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"CSV import error: {str(e)}"}), 400
