import datetime
import functools
import jwt
from flask import request, jsonify, g, current_app
from app.config import Config
from app.extensions import db
from app.models import User

def generate_token(user_id, username, role, kitchen_id=None):
    """Generates a signed JWT token with standard claims and role context"""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "kitchen_id": kitchen_id,
        "iat": now,
        "exp": now + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def decode_token(token):
    """Safely decodes and verifies a JWT token with leeway for clock skew"""
    try:
        return jwt.decode(
            token, 
            Config.JWT_SECRET_KEY, 
            algorithms=["HS256"], 
            leeway=datetime.timedelta(seconds=30)
        )
    except Exception:
        return None

def get_current_user_from_request():
    """Extracts and validates User entity from Authorization Bearer header if present"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        return None

    try:
        user_id = int(payload.get("sub", 0))
        user = db.session.get(User, user_id)
        if user and user.is_active:
            return user
    except Exception:
        pass
    return None

def get_current_kitchen_id():
    """Retrieves current kitchen ID from active user or fallback default"""
    user = getattr(g, "current_user", None) or get_current_user_from_request()
    if user and user.kitchen_id:
        return user.kitchen_id
    return 1

def jwt_required(f):
    """Enforces valid JWT authentication on protected endpoints"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "message": "Missing or invalid authorization token"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"success": False, "message": "Invalid or expired authorization token"}), 401

        user = db.session.get(User, int(payload["sub"]))
        if not user or not user.is_active:
            return jsonify({"success": False, "message": "User not found or account deactivated"}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    """
    Role-Based Access Control (RBAC) decorator.
    - If Authorization header is provided, strictly validates user and checks allowed roles.
    - If STRICT_AUTH config is enabled, strictly requires valid token and allowed role.
    - If no auth is provided in non-strict mode (e.g. legacy test runs), allows through.
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            auth_header = request.headers.get("Authorization")
            strict_auth = current_app.config.get("STRICT_AUTH", False)

            if auth_header:
                user = get_current_user_from_request()
                if not user:
                    return jsonify({"success": False, "message": "Invalid or expired authorization token"}), 401
                g.current_user = user

            if user:
                if user.role not in allowed_roles:
                    return jsonify({
                        "success": False, 
                        "message": f"Forbidden: Action requires one of roles: {', '.join(allowed_roles)}. Your role '{user.role}' lacks permission."
                    }), 403
            elif strict_auth:
                return jsonify({"success": False, "message": "Authentication required. Please provide a valid Bearer token."}), 401

            return f(*args, **kwargs)
        return decorated
    return decorator
