from flask import Blueprint, request, jsonify
from app.services.explainable_ai_service import (
    get_feature_importances,
    get_dish_explanation,
    get_model_evaluation_detailed
)

xai_bp = Blueprint("xai_bp", __name__)


@xai_bp.route("/feature-importance", methods=["GET"])
def feature_importance():
    """Returns measured feature importance ranking from trained Random Forest model"""
    try:
        data = get_feature_importances()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@xai_bp.route("/dish-explanation/<int:menu_item_id>", methods=["GET"])
def dish_explanation(menu_item_id):
    """Returns drivers, weekday effects, and 95% Confidence Interval for a menu item"""
    try:
        data = get_dish_explanation(menu_item_id)
        return jsonify(data), 200
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@xai_bp.route("/model-evaluation", methods=["GET"])
def model_evaluation():
    """Returns full test set actual vs predicted curves and evaluation metrics"""
    try:
        data = get_model_evaluation_detailed()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

