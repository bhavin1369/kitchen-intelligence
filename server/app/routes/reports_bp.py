from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from app.extensions import db
from app.models import Ingredient, InventoryBatch
from app.utils.auth import roles_required
from app.services.reports_service import (
    get_dashboard_statistics,
    get_sales_summary_report,
    export_sales_csv,
    export_forecasts_csv,
    export_model_performance_csv,
    export_inventory_csv,
    export_purchases_csv,
    export_financial_summary_csv
)
from backup_db import perform_database_backup, list_backups
from restore_db import restore_database

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


@reports_bp.route("/financial", methods=["GET"])
def financial_summary():
    """Returns full executive financial rollup (revenue, cogs, margins, waste loss)"""
    summary = get_sales_summary_report()
    stats = get_dashboard_statistics()
    return jsonify({
        "success": True,
        "data": {
            **summary,
            "inventoryValuation": stats.get("totalInventoryValue", 0.0),
            "skusCount": stats.get("inventoryItemsCount", 0),
            "nearExpiryValueRisk": stats.get("nearExpiryLossRisk", 0.0)
        }
    }), 200


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


# ==================== CSV EXPORT ENDPOINTS ====================

@reports_bp.route("/sales/export/csv", methods=["GET"])
def export_sales_csv_endpoint():
    """Generates downloadable CSV for sales records"""
    start_d_str = request.args.get("startDate")
    end_d_str = request.args.get("endDate")
    menu_item_id = request.args.get("menuItemId")

    start_d = datetime.strptime(start_d_str, "%Y-%m-%d").date() if start_d_str else None
    end_d = datetime.strptime(end_d_str, "%Y-%m-%d").date() if end_d_str else None

    csv_data = export_sales_csv(start_date=start_d, end_date=end_d, menu_item_id=menu_item_id)
    filename = f"sales_history_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@reports_bp.route("/forecasts/export/csv", methods=["GET"])
def export_forecasts_csv_endpoint():
    """Generates downloadable CSV for demand projections"""
    days = int(request.args.get("days", 14))
    menu_item_id = request.args.get("menuItemId")
    csv_data = export_forecasts_csv(days=days, menu_item_id=menu_item_id)
    filename = f"demand_forecasts_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@reports_bp.route("/model-performance/export/csv", methods=["GET"])
def export_model_performance_csv_endpoint():
    """Generates downloadable CSV for ML model validation metrics"""
    csv_data = export_model_performance_csv()
    filename = f"model_performance_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@reports_bp.route("/inventory/export/csv", methods=["GET"])
def export_inventory_csv_endpoint():
    """Generates downloadable CSV for inventory valuation and stock levels"""
    category = request.args.get("category")
    csv_data = export_inventory_csv(category=category)
    filename = f"inventory_valuation_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@reports_bp.route("/purchases/export/csv", methods=["GET"])
def export_purchases_csv_endpoint():
    """Generates downloadable CSV for purchase orders and fulfillment"""
    status = request.args.get("status")
    csv_data = export_purchases_csv(status=status)
    filename = f"purchases_history_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@reports_bp.route("/financial/export/csv", methods=["GET"])
def export_financial_csv_endpoint():
    """Generates downloadable CSV for executive financial metrics"""
    csv_data = export_financial_summary_csv()
    filename = f"financial_summary_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== BACKUP & RESTORE ENDPOINTS ====================

@reports_bp.route("/backup", methods=["POST"])
@roles_required("admin", "manager")
def trigger_backup():
    """Creates an online point-in-time database snapshot (Admin/Manager only)"""
    try:
        result = perform_database_backup()
        return jsonify({
            "success": True,
            "message": "Database backup created successfully.",
            "data": result
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": f"Backup failed: {str(e)}"}), 500


@reports_bp.route("/backups", methods=["GET"])
@roles_required("admin", "manager")
def get_backups():
    """Lists available database backups (Admin/Manager only)"""
    try:
        backups = list_backups()
        return jsonify({
            "success": True,
            "total": len(backups),
            "data": backups
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to list backups: {str(e)}"}), 500


@reports_bp.route("/restore", methods=["POST"])
@roles_required("admin")
def trigger_restore():
    """Restores database from an existing verified backup file (Admin only)"""
    data = request.get_json() or {}
    backup_file = data.get("backupFile")
    if not backup_file:
        return jsonify({"success": False, "message": "backupFile parameter is required."}), 400

    try:
        result = restore_database(backup_file)
        return jsonify({
            "success": True,
            "message": "Database restored and verified successfully.",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Database restoration failed: {str(e)}"}), 500
