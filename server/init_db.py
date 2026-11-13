"""
Database initialization script for Kitchen Intelligence System.
Drops existing tables (if any), creates all 12 relational SQLite tables,
and enables WAL mode.
"""
import os
import sqlite3
from app import create_app
from app.extensions import db
from app.config import Config

def init_database():
    app = create_app()
    with app.app_context():
        print(f"[*] Initializing fresh database at: {Config.DATABASE_PATH}")
        db.drop_all()
        db.create_all()
        print("[+] All relational tables created successfully via SQLAlchemy ORM.")

        # Enable WAL mode & Foreign Keys in SQLite
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        conn.commit()
        conn.close()
        print("[+] SQLite configured with WAL mode and foreign key constraints enabled.")

if __name__ == "__main__":
    init_database()
