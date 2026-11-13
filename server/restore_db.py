import os
import sys
import shutil
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
TARGET_DB = INSTANCE_DIR / "kitchen_intelligence.db"

def restore_database(backup_file_path, target_db_path=None):
    """
    Safely restores a verified SQLite backup snapshot to the active database file.
    Performs integrity check prior to overwriting the target.
    """
    backup_file = Path(backup_file_path)
    target_file = Path(target_db_path) if target_db_path else TARGET_DB

    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found at: {backup_file}")

    # Check integrity of source backup before restoration
    verify_conn = sqlite3.connect(str(backup_file))
    cursor = verify_conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    check = cursor.fetchone()
    verify_conn.close()

    if not check or check[0] != "ok":
        raise ValueError(f"Backup file integrity validation failed: {check}")

    target_file.parent.mkdir(parents=True, exist_ok=True)

    # If target exists, take a quick safety snapshot
    if target_file.exists():
        safety_file = target_file.with_suffix(".pre_restore.bak")
        shutil.copy2(target_file, safety_file)

    # Perform online restoration
    src_conn = sqlite3.connect(str(backup_file))
    dst_conn = sqlite3.connect(str(target_file))
    with dst_conn:
        src_conn.backup(dst_conn, pages=100)
    dst_conn.close()
    src_conn.close()

    return {
        "success": True,
        "restoredFrom": str(backup_file),
        "targetDatabase": str(target_file),
        "status": "restored_and_verified"
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python restore_db.py <path_to_backup.db>")
        sys.exit(1)

    backup_path = sys.argv[1]
    print(f"[*] Restoring database from: {backup_path}...")
    try:
        res = restore_database(backup_path)
        print(f"[+] Successfully restored database to {res['targetDatabase']}")
    except Exception as e:
        print(f"[-] Restore failed: {e}", file=sys.stderr)
        sys.exit(1)

