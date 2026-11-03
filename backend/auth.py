"""
auth.py — Simple file-based user store with JWT tokens.
Users are persisted to users.json next to this file.
"""
import os
import json
import uuid
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt  # pyre-ignore[21]
import jwt  # PyJWT

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "ag-veg-system-secret-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
BCRYPT_ROUNDS = 10  # Optimized for performance

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")

# ── Database helper integration ──────────────────────────────────────────
def _load_users(force: bool = False) -> Dict[str, Dict[str, Dict[str, Any]]]:
    try:
        from .db_helper import db_load
    except ImportError:
        from db_helper import db_load
    return db_load("users", {"farmers": {}, "consumers": {}})

def _save_users(data: Dict[str, Dict[str, Dict[str, Any]]]):
    try:
        from .db_helper import db_save
    except ImportError:
        from db_helper import db_save
    db_save("users", data)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None

# ── Farmer Auth ───────────────────────────────────────────────────────────

def farmer_signup(name: str, email: str, password: str, mobile: str) -> dict:
    store = _load_users()
    if not email and not mobile:
        return {"error": "Email or Mobile Number is required"}
        
    for key, user in store["farmers"].items():
        if email and (key == email or user.get("email") == email):
            return {"error": "Email already registered"}
        if mobile and user.get("mobile") == mobile:
            return {"error": "Mobile already registered"}
            
    uid = str(uuid.uuid4())
    key = email if email else mobile
    store["farmers"][key] = {
        "id": uid,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "mobile": mobile,
        "crops": [],
    }
    _save_users(store)
    return {"id": uid, "name": name, "email": email, "mobile": mobile}

def farmer_login(identifier: str, password: str) -> dict:
    store = _load_users()
    user = store["farmers"].get(identifier)
    
    if user is None:
        for u in store["farmers"].values():
            if u.get("mobile") == identifier or u.get("email") == identifier:
                user = u
                break
                
    if user is None:
        return {"error": "Invalid credentials"}
        
    if not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
        
    uid = str(user.get("id", ""))
    uname = str(user.get("name", ""))
    umob = str(user.get("mobile", ""))
    uemail = str(user.get("email", ""))
    
    token = create_token({"sub": uid, "email": uemail, "role": "farmer", "mobile": umob})
    return {"token": token, "farmer_id": uid, "name": uname, "mobile": umob, "email": uemail}

# ── Consumer Auth ─────────────────────────────────────────────────────────

def consumer_signup(name: str, email: str, password: str, mobile: str = "", location: str = "") -> dict:
    store = _load_users()
    if not email and not mobile:
        return {"error": "Email or Mobile is required"}
        
    for key, user in store["consumers"].items():
        if email and (key == email or user.get("email") == email):
            return {"error": "Email already registered"}
        if mobile and user.get("mobile") == mobile:
            return {"error": "Mobile already registered"}
            
    uid = str(uuid.uuid4())
    key = email if email else mobile
    store["consumers"][key] = {
        "id": uid,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "mobile": mobile,
        "location": location,
    }
    _save_users(store)
    return {"id": uid, "name": name, "email": email}

def consumer_login(identifier: str, password: str) -> dict:
    store = _load_users()
    user = store["consumers"].get(identifier)
    
    if user is None:
        for u in store["consumers"].values():
            if u.get("mobile") == identifier or u.get("email") == identifier:
                user = u
                break
                
    if user is None:
        return {"error": "Invalid credentials"}
        
    if not verify_password(password, str(user.get("password", ""))):
        return {"error": "Invalid credentials"}
        
    uid = str(user.get("id", ""))
    uname = str(user.get("name", ""))
    umob = str(user.get("mobile", ""))
    loc = str(user.get("location", "Guntur"))
    uemail = str(user.get("email", ""))
    
    token = create_token({"sub": uid, "email": uemail, "role": "consumer", "mobile": umob})
    return {"token": token, "consumer_id": uid, "name": uname, "mobile": umob, "location": loc, "email": uemail}
