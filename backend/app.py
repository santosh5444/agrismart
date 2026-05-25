import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .data_loader import (
        prices_df, production_df, vegs_df, districts_df,
        get_vegetable_locations, get_recommendations, get_all_veg_locations,
        get_farmers_by_vegetable,
        DISTRICTS, VEGETABLES,
    )
    from .ml_model.train import load_model, train_model, predict_price
    from .routes.auth_routes import router as auth_router
    from .routes.farmer_routes import router as farmer_router
    from .routes.data_routes import router as data_router, set_state
    from .routes.ai_routes import router as ai_router
except ImportError:
    from data_loader import (
        prices_df, production_df, vegs_df, districts_df,
        get_vegetable_locations, get_recommendations, get_all_veg_locations,
        get_farmers_by_vegetable,
        DISTRICTS, VEGETABLES,
    )
    from ml_model.train import load_model, train_model, predict_price
    from routes.auth_routes import router as auth_router
    from routes.farmer_routes import router as farmer_router
    from routes.data_routes import router as data_router, set_state
    from routes.ai_routes import router as ai_router

model, encoders = None, None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-train model if missing in background
    import threading
    def bg_train():
        try:
            global model, encoders
            m, e = load_model()
            if m is None:
                print("[Startup] Training model in background...")
                m, e, _ = train_model(prices_df, production_df)
            model, encoders = m, e
            set_state(model=model, encoders=encoders)
            print("[Startup] Background training complete.")
        except Exception as ex:
            print(f"[Startup] Background training failed: {ex}")

    threading.Thread(target=bg_train, daemon=True).start()

    # Inject state into data_routes
    set_state(
        prices_df=prices_df,
        production_df=production_df,
        vegs_df=vegs_df,
        model=model,
        encoders=encoders,
        get_veg_locations_fn=get_vegetable_locations,
        get_recommendations_fn=get_recommendations,
        predict_price_fn=predict_price,
        get_all_veg_locations_fn=get_all_veg_locations,
        get_farmers_by_vegetable_fn=get_farmers_by_vegetable,
        districts_df=districts_df,
        DISTRICTS=DISTRICTS,
        VEGETABLES=VEGETABLES,
    )
    print("[Startup] System ready.")
    yield
    print("[Shutdown] Goodbye.")

app = FastAPI(
    title="Smart Vegetable Availability & Price Transparency API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for robustness during transition
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(farmer_router)
app.include_router(data_router)
app.include_router(ai_router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Global exception caught: {str(exc)}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "type": type(exc).__name__}
    )

@app.get("/")
def root():
    return {
        "message": "Smart Vegetable Availability & Price Transparency API",
        "docs": "/docs",
        "status": "running",
    }

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[Startup] Listening on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
