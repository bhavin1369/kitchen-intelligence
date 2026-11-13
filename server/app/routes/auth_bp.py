from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash, generate_password_hash
from app.utils.db import query_one, query_all, execute_insert
from app.utils.auth import generate_token, jwt_required, roles_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400

    user = query_one(
        "SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?;",
        (username, username)
    )

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

    if not user["is_active"]:
        return jsonify({"success": False, "message": "Account has been deactivated"}), 403

    token = generate_token(user["id"], user["username"], user["role"])
    return jsonify({
        "success": True,
        "message": "Login successful",
        "data": {
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            }
        }
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user():
    user = g.current_user
    return jsonify({
        "success": True,
        "data": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"]
        }
    }), 200

@auth_bp.route("/users", methods=["GET"])
@jwt_required
@roles_required("admin")
def list_users():
    users = query_all("SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC;")
    return jsonify({"success": True, "data": users}), 200

@auth_bp.route("/users", methods=["POST"])
@jwt_required
@roles_required("admin")
def create_user():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "staff").strip()

    if not username or not email or not password:
        return jsonify({"success": False, "message": "Username, email, and password are required"}), 400

    if role not in ("admin", "chef", "manager", "staff"):
        return jsonify({"success": False, "message": "Invalid role specified"}), 400

    existing = query_one("SELECT id FROM users WHERE username = ? OR email = ?;", (username, email))
    if existing:
        return jsonify({"success": False, "message": "Username or email already exists"}), 409

    pwd_hash = generate_password_hash(password)
    user_id = execute_insert(
        "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?);",
        (username, email, pwd_hash, role)
    )

    return jsonify({
        "success": True,
        "message": f"User {username} created successfully",
        "data": {"id": user_id, "username": username, "email": email, "role": role}
    }), 210

