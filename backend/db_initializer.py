import os
import json
import uuid
import random
import math

try:
    from .auth import hash_password
except ImportError:
    from auth import hash_password

try:
    from .db_helper import db_load, db_save
except ImportError:
    from db_helper import db_load, db_save

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
    {"name": "Tomato", "price": 45.0},
    {"name": "Onion", "price": 40.0},
    {"name": "Potato", "price": 30.0},
    {"name": "Green Chilli", "price": 55.0},
    {"name": "Brinjal", "price": 30.0},
    {"name": "Okra", "price": 40.0},
    {"name": "Cabbage", "price": 25.0},
    {"name": "Cauliflower", "price": 40.0},
    {"name": "Spinach", "price": 25.0},
    {"name": "Bottle Gourd", "price": 22.0},
    {"name": "Capsicum", "price": 50.0},
    {"name": "Cucumber", "price": 25.0},
    {"name": "Peas", "price": 60.0},
    {"name": "Beans", "price": 45.0},
    {"name": "Radish", "price": 25.0},
    {"name": "Ginger", "price": 100.0}
]

FARMER_NAMES = [
    # Group 1
    "K. Srinivasa Rao", "M. Koteswara Rao", "Ch. Anjaneyulu",
    "V. Ramachandra Naidu", "K. Venkataswamy", "B. Nagendra Prasad",
    "S. Malla Reddy", "Y.S. Prasad Reddy", "G. Satyanarayana",
    "P. Venkatramaiah", "T. Chennakesavulu", "D. Audiseshaiah",
    # Group 2
    "N. Kiran Kumar", "B. Rajasekhar Reddy", "T. Subbarami Reddy",
    "K. Atchannaidu", "M. Buddha Prasad", "K. Parthasarathy",
    "P. Narayana", "D. Narendra Kumar", "G. Koteswara Rao",
    "V. Sobhanadreeswara", "Ch. Ayyanna Patrudu", "P. Pulla Rao",
    # Group 3
    "K. Srinivasulu", "M. Satish Kumar", "N. Prasad Rao",
    "B. Gopala Krishna", "T. Venkateswarlu", "K. Rajesh Naidu",
    "Y. Venu Gopal", "S. Venkat Reddy", "R. Ramachandra Rao",
    "A. Revanth Naidu", "N. Lokesh Naidu", "J. Prabhakar Rao",
    # Group 4
    "K. Shiva Prasad", "B. Ravi Shankar", "M. Ramakrishna",
    "G. Srinivasa Reddy", "V. Mohan Rao", "T. Venkatesh",
    "P. Satish Reddy", "D. Subba Rao", "K. Apparao",
    "S. Raghava Rao", "A. Srinivasa Raju", "Ch. Harikiran",
    # Group 5
    "M. Sambasiva Rao", "G. Veera Bhadram", "K. Koteswara Rao",
    "J. Ramana Murthy", "B. Satyanarayana Murthy", "V. Lakshmana Rao",
    "P. Narasimha Rao", "T. Ramaswamy", "K. Balaji",
    "M. Narayana Swamy", "S. Krishna Murthy", "R. Chalapathi Rao",
    # Group 6
    "A. Venkatrami Reddy", "Y.S. Avinash Reddy", "Ch. Venkaiah Chowdary",
    "K. Bhaskar Rao", "M. Prasada Rao", "D. Venkateswara Rao",
    "S. Janardhan Rao", "G. Mallikarjuna Rao", "P. Jagadeeshwar Rao",
    "T. Adi Narayana", "B. Veerabhadra Rao", "V. Rama Rao"
]

STREETS = ["Gandhi Road", "Bazar Street", "Raja Lane", "Subhash Marg", "Farm Road", "Temple View"]
VILLAGES = ["Mamidipudi", "Rayapudi", "Penugonda", "Karakambadi", "Puttur", "Nandyal Rural", "Reddypalli", "Vontimitta", "Dowleswaram", "Denduluru", "Maddipadu", "Indukurpet"]

def seed_db():
    print("[Seeder] Checking database files...")
    
    # 1. Load or initialize users
    users = db_load("users", {"farmers": {}, "consumers": {}})
    users_modified = False
 
    # Force re-seeding if we have fewer than 72 farmers to expand database
    if not users.get("farmers") or len(users.get("farmers")) < 72:
        print("[Seeder] Seeding default farmers (expanding to 72)...")
        hashed_pwd = hash_password("password123")
        
        # Clear existing farmers to rebuild expanded list cleanly
        users["farmers"] = {}
        
        farmer_idx = 0
        for dist in DISTRICTS_DATA:
            for i in range(6):
                farmer_name = FARMER_NAMES[farmer_idx % len(FARMER_NAMES)]
                # Add suffix to email and mobile to make them unique
                email = f"farmer.{farmer_name.lower().replace(' ', '').replace('.', '')}.{i+1}@agrismart.com"
                mobile = f"9000100{dist['id']:02d}{i+1}"
                uid = str(uuid.uuid4())
                
                users["farmers"][email] = {
                    "id": uid,
                    "name": farmer_name,
                    "email": email,
                    "password": hashed_pwd,
                    "mobile": mobile,
                    "crops": []
                }
                farmer_idx += 1
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
        db_save("users", users)
        print("[Seeder] users seeded successfully.")
    else:
        print("[Seeder] users already populated.")
 
    # 2. Load or initialize crops
    crops = db_load("crops", [])
 
    # Force re-seeding if crops list is empty or matches old small seeder
    if not crops or len(crops) < 280:
        print("[Seeder] Seeding default crops (expanding to 288 listings)...")
        crops = [] # Reset crops list
        
        # We will iterate through each registered farmer and create 4 crop listings
        farmers_list = list(users["farmers"].values())
        farmer_idx = 0
        for dist in DISTRICTS_DATA:
            for i in range(6):
                farmer = farmers_list[farmer_idx]
                
                # Select 4 distinct vegetables for this farmer
                veg_sample = random.sample(VEGETABLES_POOL, 4)
                
                for v_idx, veg in enumerate(veg_sample):
                    # Apply slight offset to district coordinates (+/- 1-4 km)
                    lat_offset = random.uniform(-0.04, 0.04)
                    lon_offset = random.uniform(-0.04, 0.04)
                    
                    street = random.choice(STREETS)
                    village = VILLAGES[farmer_idx % len(VILLAGES)]
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
                farmer_idx += 1
        
        db_save("crops", crops)
        print("[Seeder] crops seeded successfully.")
    else:
        print("[Seeder] crops already populated.")
