import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "storage", "corridors.json")

def load_corridors():
    try:
        with open(DB_PATH, "r") as f:
            return json.load(f)
    except:
        return []

def save_corridors(corridors):
    with open(DB_PATH, "w") as f:
        json.dump(corridors, f, indent=2)
