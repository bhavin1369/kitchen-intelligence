import os
import sys
import time
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
DEFAULT_DB = INSTANCE_DIR / "kitchen_intelligence.db"
BACKUP_DIR = BASE_DIR / "backups"

def perform_database_backup(db_path=None, backup_dir=None, max_keep=10):
    """
    Safely creates an online, transaction-consistent SQLite backup snapshot.
    Uses SQLite's online backup API so read/write queries can continue without locking errors.
    """
    source_path = Path(db_path) if db_path else DEFAULT_DB
    dest_dir = Path(backup_dir) if backup_dir else BACKUP_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)

    if not source_path.exists():
        raise FileNotFoundError(f"Source database file not found at: {source_path}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"backup_kitchen_intelligence_{timestamp}.db"
    backup_file = dest_dir / backup_filename

    # Perform online SQLite backup
    src_conn = sqlite3.connect(str(source_path))
    dst_conn = sqlite3.connect(str(backup_file))
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    dst_conn.close()
    src_conn.close()

    # Verify backup integrity
    verify_conn = sqlite3.connect(str(backup_file))
    cursor = verify_conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    check_result = cursor.fetchone()
    verify_conn.close()

    if not check_result or check_result[0] != "ok":
        backup_file.unlink(missing_ok=True)
        raise RuntimeError(f"Database backup integrity check failed: {check_result}")

    size_kb = round(backup_file.stat().st_size / 1024, 2)

    # Prune old backups keeping only max_keep most recent
    existing = sorted(dest_dir.glob("backup_kitchen_intelligence_*.db"), key=os.path.getmtime)
    if len(existing) > max_keep:
        for old in existing[:-max_keep]:
            try:
                old.unlink()
            except Exception:
                pass

    return {
        "success": True,
        "backupFile": str(backup_file),
        "filename": backup_filename,
        "sizeKb": size_kb,
        "timestamp": datetime.now().isoformat(),
        "integrityCheck": "ok"
    }

def list_backups(backup_dir=None):
    dest_dir = Path(backup_dir) if backup_dir else BACKUP_DIR
    if not dest_dir.exists():
        return []

    files = sorted(dest_dir.glob("backup_kitchen_intelligence_*.db"), key=os.path.getmtime, reverse=True)
    return [
        {
            "filename": f.name,
            "path": str(f),
            "sizeKb": round(f.stat().st_size / 1024, 2),
            "createdAt": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        }
        for f in files
    ]

if __name__ == "__main__":
    print("[*] Initiating Kitchen Intelligence Database Backup...")
    try:
        res = perform_database_backup()
        print(f"[+] Backup successfully generated: {res['filename']} ({res['sizeKb']} KB)")
        print(f"[+] Integrity check: {res['integrityCheck']}")
    except Exception as e:
        print(f"[-] Backup failed: {e}", file=sys.stderr)
        sys.exit(1)

