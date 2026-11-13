from flask import Blueprint, request, jsonify
from app.services.environmental_service import get_environmental_impact

environmental_bp = Blueprint("environmental_bp", __name__)


@environmental_bp.route("/impact", methods=["GET"])
def environmental_impact():
    """
    Returns environmental metrics of food waste:
    - Actual CO2e emissions and water footprint
    - Avoided waste & emissions benchmarked against unoptimized kitchens
    - Car km and mature trees equivalency
    - Documented conversion factors
    """
    days = int(request.args.get("days", 30))
    try:
        data = get_environmental_impact(days=days)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
