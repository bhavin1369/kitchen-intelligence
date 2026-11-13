"""
Kitchen Intelligence Backend - Application Entrypoint
Provides entrypoint compatibility for `python app.py` as well as `python run.py`.
"""
import os
import sys
from pathlib import Path

# Ensure the server directory is in sys.path
SERVER_DIR = Path(__file__).resolve().parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")
    debug = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")
    print(f"[*] Starting Kitchen Intelligence Server on http://{host}:{port} (debug={debug})...")
    app.run(host=host, port=port, debug=debug)

