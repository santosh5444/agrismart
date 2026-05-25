"""
data_loader.py — Loads and merges all 5 datasets used by the system.
"""
import os
import pandas as pd  # pyre-ignore[21]
import numpy as np  # pyre-ignore[21]

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
# Fallback: if backend/data/ doesn't exist, look one level up (repo root)
# This supports Render deploys where CSVs live at the repo root
if not os.path.isdir(DATA_DIR):
    DATA_DIR = os.path.dirname(os.path.dirname(__file__))


def _load():
    districts = pd.read_csv(os.path.join(DATA_DIR, "districts_dataset.csv"))
    prices = pd.read_csv(os.path.join(DATA_DIR, "prices_3year_dataset.csv"))
    production = pd.read_csv(os.path.join(DATA_DIR, "veg_production_dataset.csv"))
    soil = pd.read_csv(os.path.join(DATA_DIR, "soil_dataset.csv"))
    weather = pd.read_csv(os.path.join(DATA_DIR, "weather_dataset.csv"))
    farmers_path = os.path.join(DATA_DIR, "farmers.csv")
    farmers = pd.read_csv(farmers_path) if os.path.exists(farmers_path) else pd.DataFrame()
    return districts, prices, production, soil, weather, farmers


districts_df, prices_df, production_df, soil_df, weather_df, farmers_df = _load()

# Normalise column names to lowercase / strip spaces
for _df in (districts_df, prices_df, production_df, soil_df, weather_df):
    _df.columns = [c.strip().lower().replace(" ", "_") for c in _df.columns]

# Normalise farmers_df if not empty
if not farmers_df.empty:
    farmers_df.columns = [c.strip().lower().replace(" ", "_") for c in farmers_df.columns]
    # Merge farmers with districts to get district name and lat/lon
    farmers_df = farmers_df.merge(
        districts_df[["district_id", "district", "latitude", "longitude"]],
        on="district_id",
        how="left"
    )

# ── Detect price dataset join key ──────────────────────────────────────────
# The price CSV might use 'district_id' or 'district' (name).
# We always want both after the merge.
if "district" not in prices_df.columns and "district_id" in prices_df.columns:
    prices_df = prices_df.merge(
        districts_df[["district_id", "district", "latitude", "longitude"]],
        on="district_id",
        how="left",
    )
elif "district_id" not in prices_df.columns and "district" in prices_df.columns:
    prices_df = prices_df.merge(
        districts_df[["district_id", "district", "latitude", "longitude"]],
        on="district",
        how="left",
    )
else:
    # Both columns present – just ensure lat/lon are attached
    if "latitude" not in prices_df.columns:
        prices_df = prices_df.merge(
            districts_df[["district_id", "district", "latitude", "longitude"]],
            on=["district_id", "district"],
            how="left",
        )

# ── Merge production with districts ───────────────────────────────────────
production_df = production_df.merge(
    districts_df[["district_id", "district", "latitude", "longitude"]],
    on="district_id",
    how="left",
)

# ── Build an enriched vegetable-location table ─────────────────────────────
# One row per (vegetable, district) with avg price, lat/lon, production stats
price_agg = (
    prices_df.groupby(["vegetable", "district"])
    .agg(avg_price=("price_per_kg_inr", "mean"), lat=("latitude", "first"), lon=("longitude", "first"))
    .reset_index()
)

prod_agg = (
    production_df.groupby(["vegetable", "district"])
    .agg(
        avg_yield=("yield_tons_per_hectare", "mean"),
        avg_area=("area_hectares", "mean"),
    )
    .reset_index()
)

vegs_df = price_agg.merge(prod_agg, on=["vegetable", "district"], how="left")

# ── District lookup (name → lat/lon) ──────────────────────────────────────
district_lookup = (
    districts_df.set_index("district")[["latitude", "longitude"]].to_dict("index")
)

VEGETABLES = sorted(prices_df["vegetable"].dropna().unique().tolist())
DISTRICTS = sorted(districts_df["district"].dropna().unique().tolist())


def get_vegetable_locations(name: str):
    """Return location rows for a vegetable (case-insensitive partial match)."""
    mask = vegs_df["vegetable"].str.lower().str.contains(name.lower(), na=False)
    rows = vegs_df[mask].copy()
    rows["avg_price"] = rows["avg_price"].round(2)
    return rows.to_dict("records")


def get_recommendations(district: str, top_n: int = 8):
    """
    Return top vegetables by suitability (Yield) and Price.
    Now considers the current season based on the month.
    """
    import datetime
    month = datetime.datetime.now().month
    
    # Map month to season
    if 6 <= month <= 10:
        season = "Kharif"
    elif month >= 11 or month <= 2:
        season = "Rabi"
    else:
        season = "Zaid"

    # Filter district
    mask = vegs_df["district"].str.lower() == district.lower()
    subset = vegs_df[mask].copy()
    if subset.empty:
        subset = vegs_df.copy()

    # Weather scoring (Simplified: we look for vegetables with high yield in this district)
    # In a real model, we'd use weather_df to find matching climates.
    # Here, we'll just prioritize vegetables with avg_yield > median.
    yield_median = subset["avg_yield"].median() or 1.0
    subset["score"] = subset["avg_yield"] / yield_median
    
    # Penalize price (lower price is better)
    price_mean = subset["avg_price"].mean() or 1.0
    subset["score"] = subset["score"] * (price_mean / (subset["avg_price"] + 1))
    
    # Sort by the composite score
    subset = subset.sort_values("score", ascending=False).head(top_n)
    
    # Attach weather/season info for the frontend
    results = subset.to_dict("records")
    for r in results:
        r["season"] = season
        
    return results


def get_all_veg_locations():
    """Return all vegetable-district location rows for map initialisation."""
    return vegs_df.dropna(subset=["lat", "lon"]).to_dict("records")


def get_farmers_by_vegetable(vegetable: str = "", district: str = "") -> list:
    """Return farmers from the CSV dataset that match the given vegetable/district filters."""
    if farmers_df.empty:
        return []
    
    result = farmers_df.copy()
    if vegetable:
        result = result[result["vegetables_grown"].str.lower().str.contains(vegetable.lower(), na=False)]
    if district:
        result = result[result["district"].str.lower().str.contains(district.lower(), na=False)]
    
    rows = []
    for _, row in result.iterrows():
        rows.append({
            "farmer_name": str(row.get("name", "")),
            "mobile": str(row.get("phone", "N/A")),
            "whatsapp": str(row.get("whatsapp", "")),
            "email": str(row.get("email", "")),
            "vegetable": str(row.get("vegetables_grown", "")),
            "district": str(row.get("district", "")),
            "lat": float(row.get("latitude", 16.0)),
            "lon": float(row.get("longitude", 80.0)),
            "land_acres": float(row.get("land_acres", 0)),
            "avg_price": 0,
            "type": "CSV Farmer",
            "source": "farmers_dataset"
        })
    return rows

