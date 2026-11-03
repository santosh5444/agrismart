import os
import json
import threading
from typing import Any

DATABASE_URL = os.environ.get("DATABASE_URL")

_file_lock = threading.Lock()
conn = None

def get_connection():
    global conn
    if not DATABASE_URL:
        return None
    try:
        if conn is not None and not conn.closed:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            return conn
    except Exception:
        conn = None

    try:
        import psycopg2
        conn_str = DATABASE_URL
        if "sslmode" not in DATABASE_URL:
            conn_str = DATABASE_URL + ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
            
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS json_store (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
        print("[DB Helper] Connected/Reconnected to PostgreSQL. Table json_store ready.")
        return conn
    except Exception as e:
        print(f"[DB Helper] PostgreSQL connection failed: {e}. Falling back to file storage.")
        conn = None
        return None

# Attempt initial connection
get_connection()

def get_file_path(key: str) -> str:
    return os.path.join(os.path.dirname(__file__), f"{key}.json")

def db_load(key: str, default_val: Any) -> Any:
    db_conn = get_connection()
    if db_conn:
        try:
            with db_conn.cursor() as cur:
                cur.execute("SELECT value FROM json_store WHERE key = %s", (key,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
                else:
                    file_path = get_file_path(key)
                    val = default_val
                    if os.path.exists(file_path):
                        try:
                            with open(file_path, "r", encoding="utf-8") as f:
                                val = json.load(f)
                            db_save(key, val)
                            print(f"[DB Helper] Migrated data for key '{key}' from file to PostgreSQL.")
                        except Exception as fe:
                            print(f"[DB Helper] Failed to migrate file for '{key}': {fe}")
                    return val
        except Exception as e:
            print(f"[DB Helper] DB load failed for '{key}': {e}. Falling back to file-based.")
            
    with _file_lock:
        file_path = get_file_path(key)
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[DB Helper] File read failed for '{key}': {e}")
                return default_val
        return default_val

def db_save(key: str, value: Any) -> None:
    db_conn = get_connection()
    if db_conn:
        try:
            val_str = json.dumps(value, indent=2)
            with db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO json_store (key, value)
                    VALUES (%s, %s)
                    ON CONFLICT (key)
                    DO UPDATE SET value = EXCLUDED.value
                """, (key, val_str))
            return
        except Exception as e:
            print(f"[DB Helper] DB save failed for '{key}': {e}. Falling back to file-based.")
            
    with _file_lock:
        file_path = get_file_path(key)
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(value, f, indent=2)
        except Exception as e:
            print(f"[DB Helper] File write failed for '{key}': {e}")
