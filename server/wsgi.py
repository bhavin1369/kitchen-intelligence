import os
import sys
from pathlib import Path

# Add server directory to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in ("true", "1")

    if sys.platform == "win32" and not debug:
        try:
            from waitress import serve
            print(f"[*] Starting production Waitress WSGI server on http://{host}:{port}")
            serve(app, host=host, port=port, threads=6)
        except ImportError:
            print(f"[*] Starting Flask server on http://{host}:{port}")
            app.run(host=host, port=port, debug=debug)
    else:
        app.run(host=host, port=port, debug=debug)

