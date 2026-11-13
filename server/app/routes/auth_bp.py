import re
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models import User, Kitchen
from app.utils.auth import generate_token, jwt_required

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("fullName") or data.get("full_name") or username
    role = data.get("role", "staff").lower()

    if not username or len(username) < 3:
        return jsonify({"success": False, "message": "Username must be at least 3 characters long."}), 400
    if not email or "@" not in email:
        return jsonify({"success": False, "message": "Valid email address is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters long."}), 400

    if role not in ("admin", "chef", "manager", "staff"):
        role = "staff"

    # Check for existing username or email
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": f"Username '{username}' is already taken."}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": f"Email '{email}' is already registered."}), 409

    # Default to first kitchen
    kitchen = Kitchen.query.first()
    kitchen_id = kitchen.id if kitchen else None

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        full_name=full_name,
        role=role,
        kitchen_id=kitchen_id,
        is_active=True
    )
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id, user.username, user.role, kitchen_id=user.kitchen_id)
    return jsonify({
        "success": True,
        "message": "User registered successfully.",
        "data": {
            "token": token,
            "user": user.to_dict()
        }
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"success": False, "message": "Both username and password are required."}), 400

    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

    if not user.is_active:
        return jsonify({"success": False, "message": "User account has been deactivated."}), 403

    token = generate_token(user.id, user.username, user.role, kitchen_id=user.kitchen_id)
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "data": {
            "token": token,
            "user": user.to_dict()
        }
    }), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True, "message": "Logout successful."}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def me():
    return jsonify({
        "success": True,
        "data": g.current_user.to_dict()
    }), 200
