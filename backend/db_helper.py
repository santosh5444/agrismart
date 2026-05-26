import os
import json
from typing import Any

DATABASE_URL = os.environ.get("DATABASE_URL")

# Connect to PostgreSQL if DATABASE_URL is set
conn = None
if DATABASE_URL:
    try:
        import psycopg2
        # Auto-enforce SSL for Render Postgres DB connections
        if "sslmode" not in DATABASE_URL:
            conn_str = DATABASE_URL + ("&" if "?" in DATABASE_URL else "?") + "sslmode=require"
        else:
            conn_str = DATABASE_URL
            
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        
        # Create table if not exists
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS json_store (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)
        print("[DB Helper] Connected to PostgreSQL. Table json_store is ready.")
    except Exception as e:
        print(f"[DB Helper] PostgreSQL connection failed: {e}. Falling back to file-based database.")
        conn = None

def get_file_path(key: str) -> str:
    # Save files to backend root directory (e.g. backend/users.json, backend/crops.json)
    return os.path.join(os.path.dirname(__file__), f"{key}.json")

def db_load(key: str, default_val: Any) -> Any:
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT value FROM json_store WHERE key = %s", (key,))
                row = cur.fetchone()
                if row:
                    return json.loads(row[0])
                else:
                    # If not in DB yet, try migrating from local file
                    file_path = get_file_path(key)
                    val = default_val
                    if os.path.exists(file_path):
                        try:
                            with open(file_path, "r") as f:
                                val = json.load(f)
                            # Save to DB to complete migration
                            db_save(key, val)
                            print(f"[DB Helper] Migrated data for key '{key}' from file to PostgreSQL.")
                        except Exception as fe:
                            print(f"[DB Helper] Failed to migrate file for '{key}': {fe}")
                    return val
        except Exception as e:
            print(f"[DB Helper] DB load failed for '{key}': {e}. Falling back to file-based.")
            
    # File fallback
    file_path = get_file_path(key)
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"[DB Helper] File read failed for '{key}': {e}")
            return default_val
    return default_val

def db_save(key: str, value: Any) -> None:
    if conn:
        try:
            val_str = json.dumps(value, indent=2)
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO json_store (key, value)
                    VALUES (%s, %s)
                    ON CONFLICT (key)
                    DO UPDATE SET value = EXCLUDED.value
                """, (key, val_str))
            return
        except Exception as e:
            print(f"[DB Helper] DB save failed for '{key}': {e}. Falling back to file-based.")
            
    # File fallback
    file_path = get_file_path(key)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w") as f:
            json.dump(value, f, indent=2)
    except Exception as e:
        print(f"[DB Helper] File write failed for '{key}': {e}")
