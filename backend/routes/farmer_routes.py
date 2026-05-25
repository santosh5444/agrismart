"""
routes/farmer_routes.py — Farmer crop details API.
"""
import json
import os
import threading
import uuid
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/farmer")

USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "users.json")
CROPS_FILE = os.path.join(os.path.dirname(__file__), "..", "crops.json")

_db_lock = threading.Lock()

def _load_crops():
    if os.path.exists(CROPS_FILE):
        with open(CROPS_FILE, "r") as f:
            data = json.load(f)
            modified = False
            for c in data:
                if "id" not in c or not c["id"]:
                    c["id"] = str(uuid.uuid4())
                    modified = True
            if modified:
                with open(CROPS_FILE, "w") as fw:
                    json.dump(data, fw, indent=2)
            return data
    return []

def _save_crops(data):
    with open(CROPS_FILE, "w") as f:
        json.dump(data, f, indent=2)

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
def submit_farmer_details(req: FarmerDetailsRequest):
    if req.price <= 0 or req.quantity <= 0 or not req.vegetable or not req.district:
        return {"success": False, "message": "Invalid listing data. Price and quantity must be positive."}
        
    crops = _load_crops()
    entry = req.dict()
    entry["id"] = entry.get("id") or str(uuid.uuid4())
    
    # Auth lookup fallback
    if not entry.get("name") or not entry.get("mobile"):
        try:
            if os.path.exists(USERS_FILE):
                with open(USERS_FILE, "r") as f:
                    users = json.load(f)
                for profile in users.get("farmers", {}).values():
                    if profile.get("id") == req.farmer_id:
                        if not entry.get("name"): entry["name"] = profile.get("name", "")
                        if not entry.get("mobile"): entry["mobile"] = profile.get("mobile", "")
                        break
        except: pass

    crops.append(entry)
    _save_crops(crops)
    return {"success": True, "message": "Crop details saved successfully", "entry": entry}

@router.put("/crops/{crop_id}")
def update_crop(crop_id: str, req: FarmerDetailsRequest):
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
def delete_crop(crop_id: str, farmer_id: str = "", mobile: str = ""):
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

# ── Checkout Support ───────────────────────────────────────────────────

class CheckoutItem(BaseModel):
    product_id: str
    farmer_id: str
    quantity: float
    price_per_kg: float

class CheckoutRequest(BaseModel):
    user_id: Optional[str] = "guest"
    items: List[CheckoutItem]
    delivery_type: str = "delivery"

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
    return {"success": True}

@router.post("/checkout/confirm")
def checkout_confirm(req: CheckoutRequest):
    with _db_lock:
        crops = _load_crops()
        crop_map = {str(c.get("id")): c for c in crops}
        for item in req.items:
            c = crop_map.get(str(item.product_id))
            if not c or str(c.get("farmer_id")) != str(item.farmer_id) or float(c.get("quantity", 0)) < item.quantity:
                return {"success": False, "message": "Validation failed during confirmation"}
        for item in req.items:
            c = crop_map.get(str(item.product_id))
            c["quantity"] = max(0.0, float(c.get("quantity", 0)) - float(item.quantity))
        _save_crops(crops)
    return {"success": True, "message": "Transaction complete"}
