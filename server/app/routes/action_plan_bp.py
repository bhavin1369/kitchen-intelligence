from datetime import datetime, date
from flask import Blueprint, request, jsonify
from app.services.action_plan_service import (
    get_or_create_daily_action_plan,
    update_daily_action_plan,
    reset_daily_action_plan
)

action_plan_bp = Blueprint("action_plan_bp", __name__)


@action_plan_bp.route("", methods=["GET"])
def get_action_plan():
    """Retrieves or generates the Kitchen Daily Action Plan for a given date"""
    d_str = request.args.get("date")
    target_d = None
    if d_str:
        try:
            target_d = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    try:
        plan = get_or_create_daily_action_plan(target_d)
        return jsonify({"success": True, "data": plan}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@action_plan_bp.route("/<string:date_str>", methods=["PUT"])
def update_action_plan(date_str):
    """Updates portion targets, prep task checkmarks, purchase notes, and sign-off"""
    try:
        target_d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}), 400

    data = request.get_json() or {}
    try:
        plan = update_daily_action_plan(target_d, data)
        return jsonify({"success": True, "message": "Action plan updated.", "data": plan}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@action_plan_bp.route("/<string:date_str>/reset", methods=["POST"])
def reset_action_plan(date_str):
    """Resets action plan and re-executes AI demand models and BOM explosion"""
    try:
        target_d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}), 400

    try:
        plan = reset_daily_action_plan(target_d)
        return jsonify({"success": True, "message": "Action plan refreshed from live AI models.", "data": plan}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
