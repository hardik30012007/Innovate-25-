from flask import Flask, jsonify
from green_zone_processor import process_green_zones
import os

app = Flask(__name__)

DATA_PATH = "data/existing_green_zones_delhi.geojson"

@app.route("/generate-green-zones")
def generate_green_zones():
    gdf = process_green_zones()
    os.makedirs("data", exist_ok=True)
    gdf.to_file(DATA_PATH, driver="GeoJSON")
    return jsonify({"status": "success", "count": len(gdf)})

@app.route("/green-zones")
def get_green_zones():
    with open(DATA_PATH, "r") as f:
        return f.read()

if __name__ == "__main__":
    app.run(debug=True)
