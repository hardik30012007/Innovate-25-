from flask import Flask, jsonify
from flask_cors import CORS
from green_zone_processor import process_green_zones
import os

app = Flask(__name__)
CORS(app)

DATA_PATH = "data/existing_green_zones_delhi.geojson"

@app.route("/generate-green-zones")
def generate_green_zones():
    gdf = process_green_zones()
    os.makedirs("data", exist_ok=True)
    gdf.to_file(DATA_PATH, driver="GeoJSON")
    return jsonify({"status": "success", "count": len(gdf)})

@app.route("/green-zones")
def get_green_zones():
    if not os.path.exists(DATA_PATH):
        return jsonify({"error": "Data file not found"}), 404
        
    with open(DATA_PATH, "r") as f:
        content = f.read()
        return app.response_class(content, mimetype='application/json')

from flask import send_file

@app.route("/green-zones")
def green_zones():
    return send_file(
        "data/official_ecological_green_zones.geojson",
        mimetype="application/json"
    )


if __name__ == "__main__":
    app.run(debug=True)
