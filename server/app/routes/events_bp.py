from datetime import datetime, date
from flask import Blueprint, request, jsonify
from app.services.event_service import (
    get_all_events,
    create_kitchen_event,
    update_kitchen_event,
    delete_kitchen_event,
    get_historical_event_impact
)

events_bp = Blueprint("events_bp", __name__)


@events_bp.route("", methods=["GET"])
def list_events():
    """Returns list of registered festivals, holidays, and custom kitchen events"""
    include_past = request.args.get("includePast", "true").lower() == "true"
    events = get_all_events(include_past=include_past)
    return jsonify({
        "success": True,
        "total": len(events),
        "data": events
    }), 200


@events_bp.route("", methods=["POST"])
def add_event():
    """Adds a custom regional festival or local kitchen event"""
    data = request.get_json() or {}
    title = data.get("title")
    d_str = data.get("eventDate") or data.get("event_date")
    evt_type = data.get("eventType") or data.get("event_type", "festival")
    impact = float(data.get("expectedImpact") or data.get("expected_impact") or 1.25)
    extra_portions = float(data.get("expectedExtraPortions") or data.get("expected_extra_portions") or 0.0)
    target_dish_id = data.get("targetMenuItemId") or data.get("target_menu_item_id")
    notes = data.get("notes", "")

    if not title or not d_str:
        return jsonify({"success": False, "message": "Title and eventDate are required."}), 400

    try:
        event_d = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
        res = create_kitchen_event(
            title=title,
            event_date=event_d,
            event_type=evt_type,
            expected_impact=impact,
            expected_extra_portions=extra_portions,
            target_menu_item_id=int(target_dish_id) if target_dish_id else None,
            notes=notes
        )
        return jsonify({"success": True, "message": f"Event '{title}' registered.", "data": res}), 201
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@events_bp.route("/<int:event_id>", methods=["PUT"])
def edit_event(event_id):
    data = request.get_json() or {}
    try:
        res = update_kitchen_event(event_id, data)
        return jsonify({"success": True, "message": "Event updated.", "data": res}), 200
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@events_bp.route("/<int:event_id>", methods=["DELETE"])
def remove_event(event_id):
    success = delete_kitchen_event(event_id)
    if not success:
        return jsonify({"success": False, "message": "Event not found."}), 404
    return jsonify({"success": True, "message": "Event removed."}), 200


@events_bp.route("/historical-impact", methods=["GET"])
def historical_impact():
    """Returns empirical demand pattern analysis during past Indian festivals vs normal days"""
    try:
        data = get_historical_event_impact()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
