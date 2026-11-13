from datetime import datetime, timezone, date, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from app.extensions import db
from app.models import Sale, SaleItem, MenuItem
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
    menu_item_id = request.args.get("menuItemId") or request.args.get("menu_item_id")
    period = request.args.get("period", "all").lower() # daily, weekly, monthly, all
    start_date_str = request.args.get("startDate") or request.args.get("start_date")
    end_date_str = request.args.get("endDate") or request.args.get("end_date")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    query = Sale.query

    # Period filters
    today = date.today()
    if period == "daily" or period == "today":
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        query = query.filter(Sale.order_timestamp >= today_start, Sale.order_timestamp <= today_end)
    elif period == "weekly" or period == "week":
        week_start = datetime.combine(today - timedelta(days=7), datetime.min.time())
        query = query.filter(Sale.order_timestamp >= week_start)
    elif period == "monthly" or period == "month":
        month_start = datetime.combine(today - timedelta(days=30), datetime.min.time())
        query = query.filter(Sale.order_timestamp >= month_start)
    elif start_date_str:
        try:
            s_dt = datetime.strptime(start_date_str, "%Y-%m-%d")
            query = query.filter(Sale.order_timestamp >= s_dt)
        except ValueError:
            pass
        if end_date_str:
            try:
                e_dt = datetime.combine(datetime.strptime(end_date_str, "%Y-%m-%d"), datetime.max.time())
                query = query.filter(Sale.order_timestamp <= e_dt)
            except ValueError:
                pass

    # Filter by specific menu item
    if menu_item_id and str(menu_item_id).lower() != "all":
        query = query.join(SaleItem).filter(SaleItem.menu_item_id == int(menu_item_id))

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

    total_count = query.distinct().count()
    sales = query.distinct().order_by(Sale.order_timestamp.desc()).offset(offset).limit(limit).all()

    # Aggregate summaries for the filtered set
    total_revenue = sum(s.total_amount for s in sales if s.status != "cancelled")
    total_portions = sum(sum(item.quantity for item in s.items) for s in sales)
    avg_ticket = round(total_revenue / len(sales), 2) if sales else 0.0

    return jsonify({
        "success": True,
        "total": total_count,
        "totalRevenue": round(total_revenue, 2),
        "totalPortions": total_portions,
        "averageTicketSize": avg_ticket,
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
    if "customerName" in data or "customer_name" in data:
        sale.customer_name = data.get("customerName") or data.get("customer_name")
    if "channel" in data:
        sale.channel = data["channel"]
    if "paymentMethod" in data or "payment_method" in data:
        sale.payment_method = data.get("paymentMethod") or data.get("payment_method")
    if "notes" in data:
        sale.notes = data["notes"]

    # Support editing date
    date_str = data.get("salesDate") or data.get("date")
    if date_str:
        try:
            d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            t_part = sale.order_timestamp.time() if sale.order_timestamp else datetime.now(timezone.utc).time()
            sale.order_timestamp = datetime.combine(d_obj, t_part)
        except Exception:
            pass

    # Support editing items & quantities
    if "items" in data and data["items"]:
        # Update line items and recalculate totals
        SaleItem.query.filter_by(sale_id=sale.id).delete()
        subtotal = 0.0
        for it in data["items"]:
            m_id = it.get("menuItemId") or it.get("menu_item_id")
            q = int(it.get("quantity", 1))
            menu_item = db.session.get(MenuItem, m_id)
            if menu_item:
                sub = round(menu_item.price * q, 2)
                subtotal += sub
                si = SaleItem(
                    sale_id=sale.id,
                    menu_item_id=menu_item.id,
                    quantity=q,
                    unit_price=menu_item.price,
                    subtotal=sub
                )
                db.session.add(si)
        tax = round(subtotal * 0.05, 2)
        sale.subtotal = round(subtotal, 2)
        sale.tax = tax
        sale.total_amount = round(subtotal + tax, 2)

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

    ord_num = sale.order_number
    db.session.delete(sale)
    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Sale order {ord_num} deleted successfully."
    }), 200


@sales_bp.route("/upload-csv", methods=["POST"])
def upload_sales_csv():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded in form field 'file'."}), 400

    file = request.files["file"]
    if not file or not file.filename.endswith(".csv"):
        return jsonify({"success": False, "message": "Please upload a valid .csv file."}), 400

    try:
        content = file.stream.read().decode("utf-8-sig")
        result = parse_and_import_sales_csv(content)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully imported {result['ordersImported']} sales orders from CSV.",
            "data": result
        }), 200
    except ValueError as ve:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"CSV import error: {str(e)}"}), 500
