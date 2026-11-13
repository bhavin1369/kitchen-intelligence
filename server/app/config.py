import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

# Load environment variables from .env if present
load_dotenv(BASE_DIR / ".env")

# Ensure absolute database path
DEFAULT_DB_FILE = INSTANCE_DIR / "kitchen_intelligence.db"
DB_PATH_ENV = os.environ.get("DATABASE_PATH")
if DB_PATH_ENV and os.path.isabs(DB_PATH_ENV):
    DATABASE_PATH = DB_PATH_ENV
elif DB_PATH_ENV:
    DATABASE_PATH = str(BASE_DIR / DB_PATH_ENV)
else:
    DATABASE_PATH = str(DEFAULT_DB_FILE)

DB_URI_ENV = os.environ.get("DATABASE_URL")
if DB_URI_ENV and not DB_URI_ENV.startswith("sqlite:///instance"):
    SQLALCHEMY_DATABASE_URI = DB_URI_ENV
else:
    # Use normalized absolute path for SQLite
    clean_path = DATABASE_PATH.replace("\\", "/")
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{clean_path}"

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "kitchen-intel-super-secret-key-production-grade-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "kitchen-intel-super-secret-jwt-key-32-chars-long-2026")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))

    DATABASE_PATH = DATABASE_PATH
    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Engine options for SQLite WAL mode
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False, "timeout": 15}
    }

    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")
    CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}

