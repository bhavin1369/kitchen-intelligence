import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)

# Load environment variables from .env if present
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "kitchen-intel-super-secret-key-production-grade-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "kitchen-intel-super-secret-jwt-key-32-chars-long-2026")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
    
    DATABASE_PATH = os.environ.get("DATABASE_PATH", str(INSTANCE_DIR / "kitchen_intelligence.db"))
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine options for SQLite WAL mode
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False, "timeout": 15}
    }

    DEBUG = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")
    CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
