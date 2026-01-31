import json
from flask import Flask, jsonify
from flask_cors import CORS

from green_anchor_processor import generate_green_anchors
from coordinate_generator.corridor_generator import generate_corridors
from storage_utils import load_corridors, save_corridors

app = Flask(__name__)
CORS(app)

# -----------------------------
# In-memory cache (hackathon-safe)
# -----------------------------
GREEN_ANCHORS_GDF = None
CORRIDORS_GEOJSON = None


# -----------------------------
# Health check
# -----------------------------
@app.route("/")
def index():
    return jsonify({"status": "Backend is running"})


# -----------------------------
# Green Anchors (GeoJSON)
# -----------------------------
@app.route("/green-zones")
def get_green_zones():
    global GREEN_ANCHORS_GDF

    if GREEN_ANCHORS_GDF is None:
        GREEN_ANCHORS_GDF = generate_green_anchors()

    return jsonify(json.loads(GREEN_ANCHORS_GDF.to_json()))


# Optional debug endpoint
@app.route("/green-anchors")
def green_anchors():
    return get_green_zones()


@app.route("/generate")
def generate():
    global GREEN_ANCHORS_GDF, CORRIDORS_GEOJSON

    GREEN_ANCHORS_GDF = generate_green_anchors()
    print("[INFO] ANCHORS FOUND:", len(GREEN_ANCHORS_GDF))

    # Use the new generator
    corridors_gdf = generate_corridors(GREEN_ANCHORS_GDF)
    
    corridors = []
    if not corridors_gdf.empty:
        # Convert GDF rows to list of dicts
        for idx, row in corridors_gdf.iterrows():
            corridors.append({
                "id": f"corridor_{row['from_anchor']}_{row['to_anchor']}",
                "distance_m": row['distance_m'],
                "score": 10, # Default score since logic is simpler
                "upvotes": 0,
                "geometry": row['geometry'].__geo_interface__ # Convert Shapely to GeoJSON dict
            })

    print("[INFO] CORRIDORS FOUND:", len(corridors))

    # Save for upvotes (list of dicts)
    save_corridors(corridors)

    # Convert to GeoJSON for frontend
    CORRIDORS_GEOJSON = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": c["geometry"],
                "properties": {
                    "id": c["id"],
                    "distance_m": c["distance_m"],
                    "score": c.get("score", 0),
                    "upvotes": c.get("upvotes", 0)
                }
            }
            for c in corridors
        ]
    }

    return jsonify({
        "status": "generated",
        "green_anchors": len(GREEN_ANCHORS_GDF),
        "corridors": len(corridors)
    })


# -----------------------------
# Get corridors (GeoJSON)
# -----------------------------
@app.route("/corridors")
def get_corridors():
    global CORRIDORS_GEOJSON

    if CORRIDORS_GEOJSON is None:
        # Auto-generate if not in cache
        generate()
        
    return jsonify(CORRIDORS_GEOJSON)


# -----------------------------
# Upvote corridor
# -----------------------------
@app.route("/upvote/<cid>", methods=["POST"])
def upvote(cid):
    corridors = load_corridors()

    for c in corridors:
        if c["id"] == cid:
            c["upvotes"] += 1
            break

    save_corridors(corridors)
    return jsonify({"status": "upvoted", "id": cid})


# -----------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5001)
