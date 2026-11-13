import sys
from pathlib import Path

# Ensure venv site-packages is available as fallback for pure-python packages
_venv_site = Path(__file__).resolve().parent.parent / "venv" / "Lib" / "site-packages"
if _venv_site.exists() and str(_venv_site) not in sys.path:
    sys.path.append(str(_venv_site))

from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine
import sqlite3
from app.config import Config
from app.extensions import db

# Ensure SQLite enables foreign key constraints and WAL pragmas on all connections
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA busy_timeout=5000;")
            cursor.close()
        except Exception:
            pass

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Enable CORS for frontend client
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True
    )

    # Register Blueprints
    from app.routes.health_bp import health_bp
    from app.routes.auth_bp import auth_bp
    from app.routes.sales_bp import sales_bp
    from app.routes.menu_recipes_bp import menu_recipes_bp
    from app.routes.inventory_bp import inventory_bp
    from app.routes.waste_bp import waste_bp
    from app.routes.purchases_bp import purchases_bp
    from app.routes.reports_bp import reports_bp
    from app.routes.forecasts_bp import forecasts_bp
    from app.routes.events_bp import events_bp
    from app.routes.xai_bp import xai_bp
    from app.routes.environmental_bp import environmental_bp
    from app.routes.action_plan_bp import action_plan_bp

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(sales_bp, url_prefix="/api/v1/sales")
    app.register_blueprint(menu_recipes_bp, url_prefix="/api/v1")
    app.register_blueprint(inventory_bp, url_prefix="/api/v1/inventory")
    app.register_blueprint(waste_bp, url_prefix="/api/v1/waste")
    app.register_blueprint(purchases_bp, url_prefix="/api/v1/purchases")
    app.register_blueprint(reports_bp, url_prefix="/api/v1/reports")
    app.register_blueprint(forecasts_bp, url_prefix="/api/v1/forecasts")
    app.register_blueprint(events_bp, url_prefix="/api/v1/events")
    app.register_blueprint(xai_bp, url_prefix="/api/v1/xai")
    app.register_blueprint(environmental_bp, url_prefix="/api/v1/environmental")
    app.register_blueprint(action_plan_bp, url_prefix="/api/v1/action-plan")

    # Additional health alias at /api/health
    @app.route("/api/health")
    def api_health():
        return jsonify({"status": "healthy", "service": "Kitchen Intelligence Engine"}), 200

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "message": str(e.description if hasattr(e, "description") else "Bad request")}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"success": False, "message": "Internal server error"}), 500

    return app
