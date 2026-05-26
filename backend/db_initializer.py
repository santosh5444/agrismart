import os
import json
import uuid
import random
import math

try:
    from .auth import hash_password
except ImportError:
    from auth import hash_password

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")
CROPS_FILE = os.path.join(os.path.dirname(__file__), "crops.json")

# 12 Districts from districts_dataset.csv
DISTRICTS_DATA = [
    {"id": 1, "name": "Visakhapatnam", "lat": 17.6868, "lon": 83.2185},
    {"id": 2, "name": "Vijayawada", "lat": 16.5062, "lon": 80.648},
    {"id": 3, "name": "Guntur", "lat": 16.3067, "lon": 80.4365},
    {"id": 4, "name": "Chittoor", "lat": 13.2172, "lon": 79.1003},
    {"id": 5, "name": "Tirupati", "lat": 13.6288, "lon": 79.4192},
    {"id": 6, "name": "Kurnool", "lat": 15.8281, "lon": 78.0373},
    {"id": 7, "name": "Anantapur", "lat": 14.6819, "lon": 77.6006},
    {"id": 8, "name": "Kadapa", "lat": 14.4673, "lon": 78.8242},
    {"id": 9, "name": "Rajahmundry", "lat": 17.0005, "lon": 81.804},
    {"id": 10, "name": "Eluru", "lat": 16.7107, "lon": 81.0952},
    {"id": 11, "name": "Ongole", "lat": 15.5057, "lon": 80.0499},
    {"id": 12, "name": "Nellore", "lat": 14.4426, "lon": 79.9865}
]

VEGETABLES_POOL = [
    {"name": "Tomato", "price": 25.0},
    {"name": "Onion", "price": 35.0},
    {"name": "Potato", "price": 30.0},
    {"name": "Brinjal", "price": 24.0},
    {"name": "Capsicum", "price": 45.0},
    {"name": "Cucumber", "price": 20.0},
    {"name": "Cabbage", "price": 18.0},
    {"name": "Cauliflower", "price": 28.0},
    {"name": "Spinach", "price": 15.0},
    {"name": "Peas", "price": 50.0},
    {"name": "Beans", "price": 35.0},
    {"name": "Radish", "price": 22.0},
    {"name": "Ginger", "price": 90.0}
]

FARMER_NAMES = [
    "K. Srinivasa Rao", "M. Koteswara Rao", "Ch. Anjaneyulu",
    "V. Ramachandra Naidu", "K. Venkataswamy", "B. Nagendra Prasad",
    "S. Malla Reddy", "Y.S. Prasad Reddy", "G. Satyanarayana",
    "P. Venkatramaiah", "T. Chennakesavulu", "D. Audiseshaiah"
]

STREETS = ["Gandhi Road", "Bazar Street", "Raja Lane", "Subhash Marg", "Farm Road", "Temple View"]
VILLAGES = ["Mamidipudi", "Rayapudi", "Penugonda", "Karakambadi", "Puttur", "Nandyal Rural", "Reddypalli", "Vontimitta", "Dowleswaram", "Denduluru", "Maddipadu", "Indukurpet"]

def seed_db():
    print("[Seeder] Checking database files...")
    
    # 1. Load or initialize users.json
    users_modified = False
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r") as f:
                users = json.load(f)
        except Exception:
            users = {"farmers": {}, "consumers": {}}
    else:
        users = {"farmers": {}, "consumers": {}}

    if not users.get("farmers"):
        print("[Seeder] Seeding default farmers...")
        hashed_pwd = hash_password("password123")
        
        for idx, dist in enumerate(DISTRICTS_DATA):
            farmer_name = FARMER_NAMES[idx % len(FARMER_NAMES)]
            email = f"farmer.{dist['name'].lower().replace(' ', '')}@agrismart.com"
            mobile = f"90001000{idx+1:02d}"
            uid = str(uuid.uuid4())
            
            users["farmers"][email] = {
                "id": uid,
                "name": farmer_name,
                "email": email,
                "password": hashed_pwd,
                "mobile": mobile,
                "crops": []
            }
        users_modified = True

    if not users.get("consumers"):
        print("[Seeder] Seeding default consumer...")
        hashed_pwd = hash_password("password123")
        users["consumers"]["consumer@gmail.com"] = {
            "id": str(uuid.uuid4()),
            "name": "Satish Kumar",
            "email": "consumer@gmail.com",
            "password": hashed_pwd,
            "mobile": "9999999999",
            "location": "Guntur"
        }
        users_modified = True

    if users_modified:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, "w") as f:
            json.dump(users, f, indent=2)
        print("[Seeder] users.json seeded successfully.")
    else:
        print("[Seeder] users.json already populated.")

    # Reload users to get the mapping of farmer email to ID/name/mobile
    with open(USERS_FILE, "r") as f:
        users = json.load(f)

    # 2. Load or initialize crops.json
    crops_modified = False
    if os.path.exists(CROPS_FILE):
        try:
            with open(CROPS_FILE, "r") as f:
                crops = json.load(f)
        except Exception:
            crops = []
    else:
        crops = []

    if not crops:
        print("[Seeder] Seeding default crops...")
        
        # We will iterate through each registered farmer and create 2 crop listings
        farmers_list = list(users["farmers"].values())
        for idx, farmer in enumerate(farmers_list):
            dist = DISTRICTS_DATA[idx % len(DISTRICTS_DATA)]
            
            # Select 2 distinct vegetables for this farmer
            veg_sample = random.sample(VEGETABLES_POOL, 2)
            
            for v_idx, veg in enumerate(veg_sample):
                # Apply slight offset to district coordinates (+/- 1-4 km)
                # 0.01 deg is ~1.1 km. offset within +/- 0.04 deg -> +/- 4.4 km
                lat_offset = random.uniform(-0.04, 0.04)
                lon_offset = random.uniform(-0.04, 0.04)
                
                street = random.choice(STREETS)
                village = VILLAGES[idx % len(VILLAGES)]
                pincode = f"522{random.randint(100, 999)}"
                
                crops.append({
                    "id": str(uuid.uuid4()),
                    "farmer_id": farmer["id"],
                    "name": farmer["name"],
                    "mobile": farmer["mobile"],
                    "district": dist["name"],
                    "vegetable": veg["name"],
                    "quantity": float(random.randint(200, 1500)),
                    "price": float(veg["price"]),
                    "unit": "kg",
                    "street": street,
                    "city": village,
                    "pincode": pincode,
                    "lat": round(dist["lat"] + lat_offset, 5),
                    "lon": round(dist["lon"] + lon_offset, 5)
                })
        
        with open(CROPS_FILE, "w") as f:
            json.dump(crops, f, indent=2)
        print("[Seeder] crops.json seeded successfully.")
    else:
        print("[Seeder] crops.json already populated.")
