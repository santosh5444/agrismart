"""
diag.py - Diagnostic script to find the exact startup error
"""
import sys
import traceback

print("=== DIAGNOSTIC: Importing data_loader ===")
try:
    import data_loader  # pyre-ignore[21]
    print(f"  OK: {len(data_loader.DISTRICTS)} districts, {len(data_loader.VEGETABLES)} vegetables")
except Exception:
    print("  FAILED:")
    traceback.print_exc()
    sys.exit(1)

print("\n=== DIAGNOSTIC: Importing ml_model ===")
try:
    from ml_model.train import load_model, train_model  # pyre-ignore[21]
    model, encoders = load_model()
    if model is None:
        print("  No saved model - training now...")
        model, encoders, mae = train_model(data_loader.prices_df, data_loader.production_df)
        print(f"  Training OK: MAE={mae:.2f}")
    else:
        print("  OK: Loaded existing model")
except Exception:
    print("  FAILED:")
    traceback.print_exc()
    sys.exit(1)

print("\n=== DIAGNOSTIC: Importing all routes ===")
try:
    from routes.auth_routes import router as a  # pyre-ignore[21]
    from routes.farmer_routes import router as f  # pyre-ignore[21]
    from routes.data_routes import router as d, set_state  # pyre-ignore[21]
    from routes.ai_routes import router as ai  # pyre-ignore[21]
    print("  OK: All routes imported")
except Exception:
    print("  FAILED:")
    traceback.print_exc()
    sys.exit(1)

print("\n=== ALL CHECKS PASSED - Server should start ===")
