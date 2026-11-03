import json
import os
import threading
import uuid
import math
from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional, List

try:
    from ..db_helper import db_load, db_save
    from ..auth import decode_token
except ImportError:
    from db_helper import db_load, db_save
    from auth import decode_token

router = APIRouter(prefix="/api/farmer")

_db_lock = threading.Lock()

def _verify_farmer_auth(authorization: Optional[str], farmer_id: str = "", mobile: str = "") -> bool:
    if not authorization:
        return True
    try:
        token = authorization.replace("Bearer ", "").strip()
        decoded = decode_token(token)
        if not decoded:
            return False
        token_sub = str(decoded.get("sub", ""))
        token_mobile = str(decoded.get("mobile", ""))
        token_role = str(decoded.get("role", ""))
        if token_role and token_role != "farmer":
            return False
        if farmer_id and token_sub and token_sub != farmer_id:
            return False
        if mobile and token_mobile and token_mobile != mobile:
            return False
        return True
    except Exception:
        return False

def _load_crops():
    crops = db_load("crops", [])
    modified = False
    for c in crops:
        if "id" not in c or not c["id"]:
            c["id"] = str(uuid.uuid4())
            modified = True
    if modified:
        db_save("crops", crops)
    return crops

def _save_crops(data):
    db_save("crops", data)

def _normalize(value):
    return str(value or "").strip()

def _matches_farmer(crop, farmer_id: str = "", mobile: str = ""):
    crop_farmer_id = _normalize(crop.get("farmer_id"))
    crop_mobile = _normalize(crop.get("mobile"))
    wanted_farmer_id = _normalize(farmer_id)
    wanted_mobile = _normalize(mobile)
    return (
        (wanted_farmer_id and crop_farmer_id == wanted_farmer_id) or
        (wanted_mobile and crop_mobile == wanted_mobile)
    )

class FarmerDetailsRequest(BaseModel):
    farmer_id: str
    name: str = ""
    mobile: str = ""
    district: str
    vegetable: str
    quantity: float
    price: float = 0.0
    unit: str = "kg"
    street: str = ""
    city: str = ""
    pincode: str = ""
    lat: Optional[float] = None
    lon: Optional[float] = None

@router.post("/details")
def submit_farmer_details(req: FarmerDetailsRequest, authorization: Optional[str] = Header(None)):
    if req.price <= 0 or req.quantity <= 0 or not req.vegetable or not req.district:
        return {"success": False, "message": "Invalid listing data. Price and quantity must be positive."}
        
    if not _verify_farmer_auth(authorization, req.farmer_id, req.mobile):
        return {"success": False, "message": "Unauthorized farmer operation"}

    with _db_lock:
        crops = _load_crops()
        entry = req.dict()
        entry["id"] = entry.get("id") or str(uuid.uuid4())
        
        # Auth lookup fallback
        if not entry.get("name") or not entry.get("mobile"):
            try:
                users = db_load("users", {"farmers": {}, "consumers": {}})
                for profile in users.get("farmers", {}).values():
                    if profile.get("id") == req.farmer_id:
                        if not entry.get("name"): entry["name"] = profile.get("name", "")
                        if not entry.get("mobile"): entry["mobile"] = profile.get("mobile", "")
                        break
            except Exception as e:
                print(f"[Farmer Routes] Auth lookup fallback error: {e}")

        crops.append(entry)
        _save_crops(crops)
        return {"success": True, "message": "Crop details saved successfully", "entry": entry}

@router.put("/crops/{crop_id}")
def update_crop(crop_id: str, req: FarmerDetailsRequest, authorization: Optional[str] = Header(None)):
    if not _verify_farmer_auth(authorization, req.farmer_id, req.mobile):
        return {"success": False, "message": "Unauthorized farmer operation"}

    with _db_lock:
        crops = _load_crops()
        for i, c in enumerate(crops):
            if c.get("id") == crop_id and _matches_farmer(c, req.farmer_id, req.mobile):
                updated = req.dict()
                updated["id"] = crop_id
                updated["farmer_id"] = req.farmer_id
                crops[i] = updated
                _save_crops(crops)
                return {"success": True, "message": "Crop updated", "entry": updated}
        return {"success": False, "message": "Crop not found or unauthorized"}

@router.delete("/crops/{crop_id}")
def delete_crop(crop_id: str, farmer_id: str = "", mobile: str = "", authorization: Optional[str] = Header(None)):
    if not _verify_farmer_auth(authorization, farmer_id, mobile):
        return {"success": False, "message": "Unauthorized farmer operation"}

    with _db_lock:
        crops = _load_crops()
        filtered = [c for c in crops if not (c.get("id") == crop_id and _matches_farmer(c, farmer_id, mobile))]
        if len(crops) == len(filtered):
            return {"success": False, "message": "Crop not found or unauthorized"}
        _save_crops(filtered)
        return {"success": True, "message": "Crop deleted"}

@router.get("/crops")
def get_farmer_crops(farmer_id: str = "", mobile: str = ""):
    crops = _load_crops()
    farmer_crops = [c for c in crops if _matches_farmer(c, farmer_id, mobile)]
    return {"success": True, "crops": farmer_crops}

@router.get("/all-crops")
def get_all_crops():
    return {"success": True, "crops": _load_crops()}

def calculate_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
    except ValueError:
        return None
    R = 6371.0 # Radius of earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

class CheckoutItem(BaseModel):
    product_id: str
    farmer_id: str
    quantity: float
    price_per_kg: float

class CheckoutRequest(BaseModel):
    user_id: Optional[str] = "guest"
    items: List[CheckoutItem]
    delivery_type: str = "delivery"
    consumer_lat: Optional[float] = None
    consumer_lon: Optional[float] = None
    consumer_district: Optional[str] = None

@router.post("/checkout/validate")
def checkout_validate(req: CheckoutRequest):
    if not req.items: return {"success": False, "message": "Cart is empty"}
    crops = _load_crops()
    crop_map = {str(c.get("id")): c for c in crops}
    for item in req.items:
        c = crop_map.get(str(item.product_id))
        if not c: return {"success": False, "message": "Product not found"}
        if str(c.get("farmer_id")) != str(item.farmer_id):
            return {"success": False, "message": "Farmer mismatch"}
        if float(c.get("quantity", 0)) < item.quantity:
            return {"success": False, "message": f"Insufficient stock for {c.get('vegetable', 'item')}"}
        
        # Delivery / Pickup range enforcement
        c_lat = c.get("lat")
        c_lon = c.get("lon")
        if req.consumer_lat is not None and req.consumer_lon is not None and c_lat is not None and c_lon is not None:
            dist = calculate_distance(req.consumer_lat, req.consumer_lon, c_lat, c_lon)
            if req.delivery_type == "home_delivery" and (dist is None or dist > 10.0):
                return {"success": False, "message": f"Delivery only available within 10km. {c.get('vegetable')} is too far ({dist if dist is not None else 'unknown'} km)."}
            elif req.delivery_type == "pickup" and (dist is None or dist > 20.0):
                return {"success": False, "message": f"Self-pickup only available within 20km. {c.get('vegetable')} is too far ({dist if dist is not None else 'unknown'} km)."}
        elif req.consumer_district and c.get("district"):
            if req.consumer_district.strip().lower() != c.get("district").strip().lower():
                msg_type = "Delivery" if req.delivery_type == "home_delivery" else "Self-pickup"
                return {"success": False, "message": f"{msg_type} only available within same district. {c.get('vegetable')} is in {c.get('district')}."}
                    
    return {"success": True}

@router.post("/checkout/confirm")
def checkout_confirm(req: CheckoutRequest):
    with _db_lock:
        crops = _load_crops()
        crop_map = {str(c.get("id")): c for c in crops}
        
        # Re-validate everything including location checks
        for item in req.items:
            c = crop_map.get(str(item.product_id))
            if not c or str(c.get("farmer_id")) != str(item.farmer_id) or float(c.get("quantity", 0)) < item.quantity:
                return {"success": False, "message": "Validation failed during confirmation"}
            
            c_lat = c.get("lat")
            c_lon = c.get("lon")
            if req.consumer_lat is not None and req.consumer_lon is not None and c_lat is not None and c_lon is not None:
                dist = calculate_distance(req.consumer_lat, req.consumer_lon, c_lat, c_lon)
                if req.delivery_type == "home_delivery" and (dist is None or dist > 10.0):
                    return {"success": False, "message": "Delivery location outside 10km range limit during confirmation."}
                elif req.delivery_type == "pickup" and (dist is None or dist > 20.0):
                    return {"success": False, "message": "Self-pickup location outside 20km range limit during confirmation."}
            elif req.consumer_district and c.get("district"):
                if req.consumer_district.strip().lower() != c.get("district").strip().lower():
                    msg_type = "Delivery" if req.delivery_type == "home_delivery" else "Self-pickup"
                    return {"success": False, "message": f"{msg_type} location outside district boundary during confirmation."}
                        
        for item in req.items:
            c = crop_map.get(str(item.product_id))
            c["quantity"] = max(0.0, float(c.get("quantity", 0)) - float(item.quantity))
        _save_crops(crops)
    return {"success": True, "message": "Transaction complete"}
