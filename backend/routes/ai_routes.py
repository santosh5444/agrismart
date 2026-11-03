import os
import json
import asyncio
from fastapi import APIRouter, Request
from pydantic import BaseModel

try:
    from googletrans import Translator
    translator = Translator()
except Exception:
    translator = None

router = APIRouter(prefix="/api/ai")

_state = {}

def set_state(**kwargs):
    for k, v in kwargs.items():
        _state[k] = v
        if k.endswith("_fn"):
            _state[k[:-3]] = v

class ChatRequest(BaseModel):
    message: str
    context: str = "general"

def _sync_translate_to_en(text: str):
    if not translator or not text:
        return text, 'en'
    try:
        detection = translator.detect(text)
        lang = getattr(detection, 'lang', 'en')
        if lang and lang != 'en':
            translated = translator.translate(text, dest='en')
            return getattr(translated, 'text', text), lang
        return text, 'en'
    except Exception:
        return text, 'en'

def _sync_translate_from_en(text: str, target_lang: str):
    if not translator or not text or target_lang == 'en':
        return text
    try:
        translated = translator.translate(text, dest=target_lang)
        return getattr(translated, 'text', text)
    except Exception:
        return text

async def translate_to_english_async(text: str):
    try:
        return await asyncio.wait_for(asyncio.to_thread(_sync_translate_to_en, text), timeout=1.5)
    except Exception:
        return text, 'en'

async def translate_from_english_async(text: str, target_lang: str):
    try:
        return await asyncio.wait_for(asyncio.to_thread(_sync_translate_from_en, text, target_lang), timeout=1.5)
    except Exception:
        return text

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    import datetime
    # Internal translation for multi-language support
    english_msg, detected_lang = await translate_to_english_async(req.message)
    msg_lower = english_msg.lower()
    
    # Identify vegetable and district matches
    matched_veg = None
    matched_dist = None
    
    vegs_list = _state.get("VEGETABLES", [])
    dists_list = _state.get("DISTRICTS", [])
    
    for v in vegs_list:
        if v.lower() in msg_lower:
            matched_veg = v
            break
            
    for d in dists_list:
        if d.lower() in msg_lower:
            matched_dist = d
            break

    response = None

    # Determine intent:
    is_recommendation = any(k in msg_lower for k in ["recommend", "what to grow", "should i grow", "best crop to plant", "suitable crop", "cultivate"])
    is_prediction = any(k in msg_lower for k in ["predict", "future", "forecast", "will be", "next month", "months", "year"])
    is_price_query = any(k in msg_lower for k in ["price", "cost", "how much", "rate"])

    if is_recommendation:
        recs_fn = _state.get("get_recommendations")
        dist_name = matched_dist or "Guntur"
        if recs_fn:
            try:
                recs = recs_fn(dist_name, top_n=5)
                crops_str = ", ".join([f"**{r['vegetable']}** (Avg: ₹{r['avg_price']:.2f}/kg)" for r in recs])
                response = f"Based on agricultural yield and prices in **{dist_name}**, the top recommended crops are: {crops_str}."
            except Exception as e:
                response = f"I'm unable to load recommendations for {dist_name} right now. Please try again."
        else:
            response = f"Platform recommendation data is currently loading. Please try again."

    elif matched_veg and (is_prediction or is_price_query):
        dist_name = matched_dist or "Guntur"
        if is_prediction:
            model = _state.get("model")
            encoders = _state.get("encoders")
            predict_fn = _state.get("predict_price")
            vegs_df = _state.get("vegs_df")
            
            if model is not None and encoders is not None and predict_fn is not None:
                # Find monthly forecast index
                now = datetime.datetime.now()
                pred_month = now.month + 1
                pred_year = now.year
                if pred_month > 12:
                    pred_month -= 12
                    pred_year += 1
                
                # Retrieve base avg yield / area
                avg_yield, avg_area = 20.0, 2000.0
                if vegs_df is not None:
                    mask = (vegs_df["vegetable"].str.lower() == matched_veg.lower()) & (vegs_df["district"].str.lower() == dist_name.lower())
                    row = vegs_df[mask]
                    if not row.empty:
                        avg_yield = float(row["avg_yield"].iloc[0])
                        avg_area = float(row["avg_area"].iloc[0])
                
                try:
                    price = predict_fn(model, encoders, matched_veg, dist_name, pred_month, pred_year, avg_yield, avg_area)
                    response = f"Our AI model predicts the price of **{matched_veg}** in **{dist_name}** next month will be approximately **₹{price:.2f}/kg**."
                except Exception:
                    response = f"Failed to calculate prediction for {matched_veg} in {dist_name}."
            else:
                response = "AI Prediction model is currently loading/training. Please try again."
        else:
            # Current price lookup
            prices_df = _state.get("prices_df")
            if prices_df is not None:
                v_mask = prices_df['vegetable'].str.lower() == matched_veg.lower()
                d_mask = prices_df['district'].str.lower() == dist_name.lower()
                veg_data = prices_df[v_mask & d_mask]
                
                if not veg_data.empty:
                    if "date_updated" in veg_data.columns:
                        latest_row = veg_data.sort_values("date_updated", ascending=False).iloc[0]
                        price = round(float(latest_row['price_per_kg_inr']), 2)
                    else:
                        price = round(float(veg_data.iloc[0]['price_per_kg_inr']), 2)
                    response = f"The current average price for **{matched_veg}** in **{dist_name}** is **₹{price:.2f}/kg**."
                else:
                    response = f"I couldn't find active pricing records for {matched_veg} in {dist_name}."
            else:
                response = "Prices database is currently offline. Please try again in a few seconds."

    # General intent matches if specific query isn't resolved
    if not response:
        if any(k in msg_lower for k in ["price", "cost", "how much", "rate"]):
            response = "You can check current market and predicted prices in our Price Predictor section. We use Random Forest ML models to give you the most accurate price based on location and season."
        elif any(k in msg_lower for k in ["sell", "list", "farmer", "add crop"]):
            response = "To sell your crops, go to the Farmer Dashboard. You can easily add your harvest details, specify your price per kg, and even use voice commands to list items instantly!"
        elif any(k in msg_lower for k in ["buy", "cart", "consumer", "purchase", "shopping"]):
            response = "Browsing fresh vegetables is easy in the Consumer Dashboard/Home page. Just click 'Cart' on any listing. You can choose Home Delivery or Self-Pickup at checkout."
        elif any(k in msg_lower for k in ["delivery", "pickup", "shipping", "transport"]):
            response = "We offer both Self-Pickup and Home Delivery options. Delivery charges are calculated based on an optimized logic to keep costs minimal, and you can see farmer details if you prefer Self-Pickup."
        elif any(k in msg_lower for k in ["hello", "hi", "hey", "greetings"]):
            response = "Hello! I am the AgriSmart AI Assistant. I can help you find prices, list crops, manage your orders, or answer questions about our platform. How can I help today?"
        elif any(k in msg_lower for k in ["what is this", "about agrismart", "platform", "help"]):
            response = "AgriSmart is an AI-powered agriculture marketplace connecting farmers and consumers. We provide ML-driven price predictions, voice navigation, and seamless purchasing to ensure fair trade."
        elif any(k in msg_lower for k in ["voice", "speak", "microphone"]):
            response = "Our Voice Assistant is super smart! You can use it in both dashboards to add crops, select quantities, or navigate. Just say something like 'Add 500 kg of Tomato in Guntur'."
        elif any(k in msg_lower for k in ["best crop", "trend", "recommend", "suggestion"]):
            response = "Our 'Recommended Near You' section on the Home page uses AI to suggest the best crops to buy or sell based on historical trends and your location."
        else:
            # Fallback
            response = "I didn’t quite understand, please rephrase. You can ask me about selling crops, predicted prices, delivery options, or how to buy!"

    # Translate back to user's language
    final_response = await translate_from_english_async(response, detected_lang)
    
    return {
        "success": True, 
        "reply": final_response, 
        "detected_lang": detected_lang
    }
