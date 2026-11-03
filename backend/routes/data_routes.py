import os
import re
import json
import math
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

_prediction_cache = {}
_recommendations_cache = {}

@router.post("/predict-price")
def predict_price_api(req: PredictRequest):
    vegetable = req.vegetable
    district = req.district
    month = req.month
    year = req.year
    
    cache_key = (vegetable.strip().lower(), district.strip().lower(), month, year)
    if cache_key in _prediction_cache:
        return {"success": True, "predicted_price": _prediction_cache[cache_key], "vegetable": vegetable, "district": district}

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
    _prediction_cache[cache_key] = price
    return {"success": True, "predicted_price": price, "vegetable": vegetable, "district": district}

@router.get("/recommendations")
def get_recommendations(district: str = Query("Guntur")):
    import datetime
    current_month = datetime.datetime.now().month
    current_year = datetime.datetime.now().year
    
    cache_key = (district.strip().lower(), current_month, current_year)
    if cache_key in _recommendations_cache:
        return {"success": True, "recommendations": _recommendations_cache[cache_key]}

    recs = _state["get_recommendations"](district, top_n=8)
    model = _state.get("model")
    encoders = _state.get("encoders")

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
    _recommendations_cache[cache_key] = result
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

@router.get("/vegetables")
def get_vegetables(
    name: Optional[str] = None,
    district: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None
):
    try:
        from .farmer_routes import _load_crops
    except ImportError:
        from routes.farmer_routes import _load_crops
    
    crops = _load_crops()
    filtered = []
    for c in crops:
        # 1. Filter by name (case-insensitive partial match)
        if name and name.strip():
            if name.strip().lower() not in str(c.get("vegetable", "")).lower():
                continue
        
        # 2. Filter by location (coordinates or district)
        c_lat = c.get("lat")
        c_lon = c.get("lon")
        
        # If user coordinates are provided, calculate distance
        dist = None
        if lat is not None and lon is not None and c_lat is not None and c_lon is not None:
            dist = calculate_distance(lat, lon, c_lat, c_lon)
            
        # 20km limit filtering if coordinates are available
        if lat is not None and lon is not None:
            if dist is None or dist > 20.0:
                continue
        # Otherwise, filter by district if provided
        elif district and district.strip():
            if district.strip().lower() not in str(c.get("district", "")).lower():
                continue
        
        filtered.append({
            "id": c.get("id"),
            "farmer_id": c.get("farmer_id"),
            "farmer_name": c.get("name"),
            "mobile": c.get("mobile"),
            "vegetable": c.get("vegetable"),
            "district": c.get("district"),
            "lat": c_lat,
            "lon": c_lon,
            "avg_price": c.get("price", 0.0), # mapped to avg_price in frontend
            "quantity": c.get("quantity", 0.0)
        })
        
    return {"success": True, "results": filtered}


@router.get("/price-trends")
def get_price_trends(vegetable: str = Query("Tomato"), district: str = Query("Guntur")):
    import datetime
    prices_df = _state.get("prices_df")
    model = _state.get("model")
    encoders = _state.get("encoders")
    vegs_df = _state.get("vegs_df")

    if prices_df is None:
        return {"success": False, "message": "Price data unavailable"}

    veg_norm = vegetable.strip()
    dist_norm = district.strip()

    # Filter historical prices
    mask = (
        (prices_df["vegetable"].str.lower() == veg_norm.lower()) &
        (prices_df["district"].str.lower() == dist_norm.lower())
    )
    veg_prices = prices_df[mask].copy()

    if veg_prices.empty:
        veg_prices = prices_df[prices_df["vegetable"].str.lower() == veg_norm.lower()].copy()

    if "date_updated" in veg_prices.columns:
        veg_prices["date_dt"] = pd.to_datetime(veg_prices["date_updated"])
        veg_prices = veg_prices.sort_values("date_dt")
        hist_slice = veg_prices.drop_duplicates(subset=["date_updated"]).tail(30)
    else:
        hist_slice = veg_prices.tail(30)

    historical = []
    for _, row in hist_slice.iterrows():
        d_str = str(row.get("date_updated", ""))[:10]
        p_val = round(float(row.get("price_per_kg_inr", row.get("avg_price", 30.0))), 1)
        historical.append({"date": d_str, "price": p_val})

    if not historical:
        base_p = 35.0
        today = datetime.date.today()
        for i in range(30, 0, -1):
            d = today - datetime.timedelta(days=i)
            historical.append({"date": d.isoformat(), "price": round(base_p + (i % 5 - 2), 1)})

    current_price = historical[-1]["price"]

    avg_yield, avg_area = 20.0, 2000.0
    if vegs_df is not None:
        v_mask = (vegs_df["vegetable"].str.lower() == veg_norm.lower()) & (vegs_df["district"].str.lower() == dist_norm.lower())
        v_row = vegs_df[v_mask]
        if not v_row.empty:
            avg_yield = float(v_row["avg_yield"].iloc[0])
            avg_area = float(v_row["avg_area"].iloc[0])

    forecast = []
    today = datetime.date.today()
    predict_fn = _state.get("predict_price")

    m_base = current_price
    if model and encoders and predict_fn:
        try:
            m_base = float(predict_fn(model, encoders, veg_norm, dist_norm, today.month, today.year, avg_yield, avg_area))
        except Exception:
            m_base = current_price

    for i in range(1, 31):
        f_date = today + datetime.timedelta(days=i)
        d_frac = i / 30.0
        day_of_year = f_date.timetuple().tm_yday
        seasonal_wave = math.sin(2 * math.pi * day_of_year / 365) * (m_base * 0.05)
        projected = (current_price * (1.0 - d_frac)) + (m_base * d_frac) + seasonal_wave
        forecast.append({"date": f_date.isoformat(), "price": round(max(5.0, projected), 1)})

    forecast_price_30d = forecast[-1]["price"]
    change_pct = round(((forecast_price_30d - current_price) / max(1.0, current_price)) * 100, 1)

    if change_pct > 3.0:
        trend = "rising"
        advisory = f"Prices for {veg_norm} in {dist_norm} are projected to rise by +{change_pct}% over the next 30 days due to seasonal demand. Favorable harvest window for farmers."
    elif change_pct < -3.0:
        trend = "falling"
        advisory = f"Prices for {veg_norm} in {dist_norm} are projected to ease by {change_pct}% over the next 30 days as harvest yields expand. Consumers can expect cheaper rates."
    else:
        trend = "stable"
        advisory = f"Prices for {veg_norm} in {dist_norm} are projected to remain steady near ₹{forecast_price_30d:.0f}/kg over the next month with consistent local arrivals."

    return {
        "success": True,
        "vegetable": veg_norm,
        "district": dist_norm,
        "current_price": current_price,
        "forecast_price_30d": forecast_price_30d,
        "change_pct": change_pct,
        "trend": trend,
        "advisory": advisory,
        "historical": historical,
        "forecast": forecast
    }
