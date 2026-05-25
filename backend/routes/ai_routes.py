import os
import json
from googletrans import Translator
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai")

translator = Translator()

class ChatRequest(BaseModel):
    message: str
    context: str = "general"

def translate_to_english(text: str):
    try:
        detection = translator.detect(text)
        if detection.lang != 'en':
            translated = translator.translate(text, dest='en')
            return translated.text, detection.lang
        return text, 'en'
    except Exception:
        return text, 'en'

def translate_from_english(text: str, target_lang: str):
    try:
        if target_lang != 'en':
            translated = translator.translate(text, dest=target_lang)
            return translated.text
        return text
    except Exception:
        return text

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    # Internal translation for multi-language support (Point 1 & 2)
    english_msg, detected_lang = translate_to_english(req.message)
    msg_lower = english_msg.lower()
    
    # Advanced Context-Aware Intent Matching
    response = None
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
        response = "our Voice Assistant is super smart! You can use it in both dashboards to add crops, select quantities, or navigate. Just say something like 'Add 500 kg of Tomato in Guntur'."
    elif any(k in msg_lower for k in ["best crop", "trend", "recommend", "suggestion"]):
        response = "Our 'Recommended Near You' section on the Home page uses AI to suggest the best crops to buy or sell based on historical trends and your location."
    else:
        # Fallback requirement
        response = "I didn’t quite understand, please rephrase. You can ask me about selling crops, predicted prices, delivery options, or how to buy!"
    
    # Translate back to user's language
    final_response = translate_from_english(response, detected_lang)
    
    return {
        "success": True, 
        "reply": final_response, 
        "detected_lang": detected_lang
    }
