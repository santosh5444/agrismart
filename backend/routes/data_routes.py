import os
import re
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

try:
    from ..translation_utils import translate_from_english, translate_to_english
except ImportError:
    from translation_utils import translate_from_english, translate_to_english

router = APIRouter(prefix="/api")

# Internal state shared with other modules (usually injected from app.py)
_state = {}

def set_state(**kwargs):
    for k, v in kwargs.items():
        _state[k] = v
        if k.endswith("_fn"):
            _state[k[:-3]] = v


class VoiceRequest(BaseModel):
    text: str
    context_district: str = "Guntur"

def parse_voice_command(text: str, context_district: str):
    """
    Primitive NLP to map voice text to actions.
    """
    text = text.lower()
    
    # Detect language (basic heuristic)
    detected_lang = 'en'
    if any(char for char in text if ord(char) > 127):
        detected_lang = 'te' # Assume Telugu for AP context
        text = translate_to_english(text)

    # 1. Prediction: "Price of tomato in 2 months"
    pred_match = re.search(r'(predict|future|what will be) (?:the )?(?:price of )?(\w+)(?: in (\w+))?', text)
    if pred_match:
        veg = pred_match.group(2).capitalize()
        dist = (pred_match.group(3) or context_district).capitalize()
        speech = f"I'm opening the prediction tool for {veg} in {dist}."
        return {
            "intent": "predict",
            "data": {"vegetable": veg, "district": dist},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }

    # 2. Get Price: "Price of onion in Guntur"
    price_match = re.search(r'(price|cost|how much) of (\w+)(?: in (\w+))?', text)
    if price_match:
        veg_name = price_match.group(2).lower()
        dist_name = (price_match.group(3) or context_district).lower()
        
        final_veg = veg_name.capitalize()
        final_dist = dist_name.capitalize()
        for v in _state.get("VEGETABLES", []):
            if v.lower() == veg_name:
                final_veg = v
                break
        
        try:
            prices_df = _state["prices_df"]
            v_mask = prices_df['vegetable'].str.lower() == final_veg.lower()
            d_mask = prices_df['district'].str.lower() == final_dist.lower()
            veg_data = prices_df[v_mask & d_mask]
            
            if not veg_data.empty:
                price = int(veg_data.iloc[0]['avg_price'])
                speech = f"The current price for {final_veg} in {final_dist} is about {price} rupees per kg."
                return {
                    "intent": "get_price",
                    "data": {"vegetable": final_veg, "district": final_dist, "price": price},
                    "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
                }
        except: pass
        fail_speech = f"I couldn't find a recent price for {final_veg} in {final_dist}."
        return {
            "intent": "get_price",
            "speech": translate_from_english(fail_speech, detected_lang) if detected_lang != 'en' else fail_speech
        }

    # 3. Navigate: "Go to settings"
    nav_match = re.search(r'(go to|navigation|open|show|visit) (\w+)', text)
    if nav_match:
        page = nav_match.group(2).lower()
        mapping = {"home": "/", "dashboard": "/farmer/details", "details": "/farmer/details", "settings": "/settings", "profile": "/settings", "market": "/home"}
        target = mapping.get(page, "/farmer/details")
        speech = f"Sure, opening {page}."
        return {
            "intent": "navigate",
            "data": {"path": target},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }
        
    # 4. Add to Cart: "Add tomato to cart"
    if "cart" in text or "buy" in text or "purchase" in text:
        veg_match = re.search(r'(?:buy|purchase|add)\s*(?:\d+)?\s*(?:kg)?\s*(?:of)?\s+([A-Za-z]+)', text)
        found_veg = "vegetable"
        if veg_match: found_veg = veg_match.group(1).capitalize()
        speech = f"Opened cart for {found_veg}."
        return {
            "intent": "add_to_cart",
            "data": {"vegetable": found_veg},
            "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
        }
    
    # Fallback
    speech = "I didn't quite catch that. You can say: 'Price of onion in Guntur' or 'Go to settings'."
    return {
        "intent": "unknown",
        "speech": translate_from_english(speech, detected_lang) if detected_lang != 'en' else speech
    }

@router.post("/voice-command")
def api_voice_command(req: VoiceRequest):
    result = parse_voice_command(req.text, req.context_district)
    return {"success": True, **result}

@router.get("/model-info")
def get_model_info():
    try:
        from ..ml_model.train import INFO_PATH  # pyre-ignore[21]
    except ImportError:
        from ml_model.train import INFO_PATH  # pyre-ignore[21]
    if os.path.exists(INFO_PATH):
        with open(INFO_PATH, "r") as f:
            return {"success": True, "info": json.load(f)}
    return {"success": False, "message": "No model info available"}

class PredictRequest(BaseModel):
    vegetable: str
    district: str
    month: int = 6
    year: int = 2025
    quantity: Optional[float] = 0

@router.post("/predict-price")
def predict_price_api(req: PredictRequest):
    vegetable = req.vegetable
    district = req.district
    month = req.month
    year = req.year
    
    model = _state.get("model")
    encoders = _state.get("encoders")
    if model is None:
        return {"success": False, "message": "Model not trained yet."}

    vegs_df = _state["vegs_df"]
    mask = (
        (vegs_df["vegetable"].str.lower() == vegetable.lower()) &
        (vegs_df["district"].str.lower() == district.lower())
    )
    row = vegs_df[mask]
    avg_yield = float(row["avg_yield"].iloc[0]) if not row.empty else 20.0
    avg_area = float(row["avg_area"].iloc[0]) if not row.empty else 2000.0

    price = _state["predict_price"](
        model, encoders, vegetable, district, month, year, avg_yield, avg_area
    )
    return {"success": True, "predicted_price": price, "vegetable": vegetable, "district": district}

@router.get("/recommendations")
def get_recommendations(district: str = Query("Guntur")):
    recs = _state["get_recommendations"](district, top_n=8)
    model = _state.get("model")
    encoders = _state.get("encoders")
    import datetime
    current_month = datetime.datetime.now().month
    current_year = datetime.datetime.now().year

    result = []
    for r in recs:
        predicted_price = r.get("avg_price", 0)
        if model and encoders:
            try:
                predicted_price = _state["predict_price"](
                    model, encoders,
                    r["vegetable"], r["district"],
                    current_month, current_year,
                    r.get("avg_yield", 20), r.get("avg_area", 2000)
                )
            except Exception: pass
        result.append({
            "vegetable": str(r.get("vegetable") or "Unknown"),
            "district": str(r.get("district") or district),
            "lat": float(r.get("lat") or 0.0),
            "lon": float(r.get("lon") or 0.0),
            "avg_price": round(float(r.get("avg_price") or 0.0), 2),
            "predicted_price": round(float(predicted_price or 0.0), 2),
        })
    return {"success": True, "recommendations": result}

_district_cache = None
@router.get("/districts")
def get_districts():
    global _district_cache
    if _district_cache is not None:
        return _district_cache
    districts_df = _state["districts_df"]
    rows = districts_df[["district", "latitude", "longitude", "region"]].fillna("").to_dict("records")
    _district_cache = {"success": True, "districts": rows}
    return _district_cache

_veg_cache = None
@router.get("/vegetables-list")
def list_vegetables():
    global _veg_cache
    if _veg_cache is not None:
        return _veg_cache
    vegs = _state.get("VEGETABLES", [])
    vegs = [str(v) for v in vegs if v is not None]
    _veg_cache = {"success": True, "vegetables": vegs}
    return _veg_cache

@router.post("/train-model")
def trigger_training():
    try:
        from ..ml_model.train import train_model  # pyre-ignore[21]
    except ImportError:
        from ml_model.train import train_model  # pyre-ignore[21]
    prices_df = _state["prices_df"]
    production_df = _state["production_df"]
    model, encoders, mae = train_model(prices_df, production_df)
    _state["model"] = model
    _state["encoders"] = encoders
    return {"success": True, "message": f"Model trained. MAE = ₹{mae:.2f}/kg"}
