import datetime
import functools
import jwt
from flask import request, jsonify, g
from app.config import Config
from app.extensions import db
from app.models import User

def generate_token(user_id, username, role):
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def decode_token(token):
    try:
        return jwt.decode(
            token, 
            Config.JWT_SECRET_KEY, 
            algorithms=["HS256"], 
            leeway=datetime.timedelta(seconds=30)
        )
    except Exception:
        return None

def jwt_required(f):
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
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, "current_user") or not g.current_user:
                return jsonify({"success": False, "message": "Authentication required"}), 401
            if g.current_user.role not in allowed_roles:
                return jsonify({
                    "success": False, 
                    "message": f"Forbidden: Action requires one of roles: {', '.join(allowed_roles)}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
