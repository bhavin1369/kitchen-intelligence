from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from app.extensions import db
from app.models import Forecast, MenuItem
from app.utils.auth import roles_required
from app.services.forecast_service import (
    generate_forecasts,
    get_model_evaluation,
    train_and_evaluate_models,
    get_calendar_events
)
from app.services.reports_service import export_forecasts_csv, export_model_performance_csv

forecasts_bp = Blueprint("forecasts_bp", __name__)


@forecasts_bp.route("", methods=["GET"])
def get_or_generate_forecasts():
    """
    Retrieves or generates dynamic forward demand forecasts for menu dishes.
    Accepts:
    - startDate: Optional ISO date (defaults to tomorrow)
    - days: Forecast horizon (e.g. 7, 14, 30; default 7)
    - menuItemId: Optional dish ID filter ('all' for all dishes)
    """
    menu_item_id_str = request.args.get("menuItemId") or request.args.get("menu_item_id")
    menu_item_id = None
    if menu_item_id_str and str(menu_item_id_str).lower() != "all":
        try:
            menu_item_id = int(menu_item_id_str)
        except ValueError:
            pass

    days_ahead = int(request.args.get("days", 7))
    days_ahead = max(1, min(60, days_ahead))

    start_date_str = request.args.get("startDate") or request.args.get("start_date")
    start_d = None
    if start_date_str:
        try:
            start_d = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    result = generate_forecasts(
        start_date=start_d,
        days_ahead=days_ahead,
        menu_item_id=menu_item_id
    )
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@forecasts_bp.route("/train", methods=["POST"])
@forecasts_bp.route("/retrain", methods=["POST"])
@roles_required("admin", "manager")
def retrain_model_endpoint():
    """
    Triggers ML pipeline retraining on historical sales in SQLite.
    Computes MAE, RMSE, R2, and feature importances for Baseline, Random Forest, and Gradient Boosting.
    """
    result = train_and_evaluate_models()
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@forecasts_bp.route("/evaluation", methods=["GET"])
def get_evaluation_endpoint():
    """Returns the latest ML model evaluation metrics and Baseline comparison"""
    result = get_model_evaluation()
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@forecasts_bp.route("/history", methods=["GET"])
def get_forecast_history():
    """Returns persisted forecast records from the SQLite forecasts table"""
    menu_item_id = request.args.get("menuItemId") or request.args.get("menu_item_id")
    start_date_str = request.args.get("startDate")
    end_date_str = request.args.get("endDate")

    query = Forecast.query

    if menu_item_id and str(menu_item_id).lower() != "all":
        query = query.filter_by(menu_item_id=int(menu_item_id))
    if start_date_str:
        try:
            s_d = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            query = query.filter(Forecast.forecast_date >= s_d)
        except ValueError:
            pass
    if end_date_str:
        try:
            e_d = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            query = query.filter(Forecast.forecast_date <= e_d)
        except ValueError:
            pass

    records = query.order_by(Forecast.forecast_date.asc()).limit(200).all()

    return jsonify({
        "success": True,
        "total": len(records),
        "data": [r.to_dict() for r in records]
    }), 200


@forecasts_bp.route("/calendar", methods=["GET"])
def get_calendar_endpoint():
    """Returns Indian festivals and gazetted public holidays for the requested window"""
    today = date.today()
    days = int(request.args.get("days", 30))
    events = get_calendar_events(today, today + timedelta(days=days))
    return jsonify({
        "success": True,
        "total": len(events),
        "data": events
    }), 200


@forecasts_bp.route("/export/csv", methods=["GET"])
def export_forecasts_csv_route():
    """Downloadable demand forecasts CSV"""
    days = int(request.args.get("days", 14))
    menu_item_id = request.args.get("menuItemId")
    csv_data = export_forecasts_csv(days=days, menu_item_id=menu_item_id)
    filename = f"demand_forecasts_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@forecasts_bp.route("/evaluation/export/csv", methods=["GET"])
def export_evaluation_csv_route():
    """Downloadable model evaluation metrics CSV"""
    csv_data = export_model_performance_csv()
    filename = f"model_evaluation_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
