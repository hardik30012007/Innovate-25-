import json
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from green_anchor_processor import generate_green_anchors
from coordinate_generator.corridor_generator import generate_corridors
from storage_utils import load_corridors, save_corridors

# Suppress Flask's request logging (only show errors)
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

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
    import geopandas as gpd
    from shapely.geometry import Point

    GREEN_ANCHORS_GDF = generate_green_anchors()
    print("[INFO] ANCHORS FOUND:", len(GREEN_ANCHORS_GDF))

    # Use the new generator
    corridors_gdf = generate_corridors(GREEN_ANCHORS_GDF)
    
    corridors = []
    if not corridors_gdf.empty:
        print("[INFO] SCORING START - Processing", len(corridors_gdf), "zones...")
        print("[INFO] Computing spatial intersections for connectivity...")
        
        # PERFORMANCE FIX: Convert to EPSG:3857 ONCE
        zones_3857 = corridors_gdf.to_crs("EPSG:3857")
        
        # PERFORMANCE FIX: Precompute centroids ONCE
        zones_3857["centroid"] = zones_3857.geometry.centroid
        
        # PERFORMANCE FIX: Create landmarks GeoDataFrame ONCE
        # NOTE: Point(longitude, latitude) - lon first, lat second!
        landmarks = {
            "India Gate": (77.2295, 28.6129),
            "Connaught Place": (77.2177, 28.6304),
            "Lodhi Garden": (77.2219, 28.5933),
            "Qutub Minar": (77.1855, 28.5244),
            "Lotus Temple": (77.2588, 28.5535)
        }
        
        landmarks_gdf = gpd.GeoDataFrame(
            [{"name": name, "geometry": Point(lon, lat)} for name, (lon, lat) in landmarks.items()],
            crs="EPSG:4326"
        ).to_crs("EPSG:3857")
        
        # PERFORMANCE FIX: Convert anchors to EPSG:3857 for intersection checks
        anchors_3857 = GREEN_ANCHORS_GDF.to_crs("EPSG:3857")
        
        # PERFORMANCE OPTIMIZATION: Use spatial join instead of nested loops
        # Add zone_id to zones for tracking
        zones_3857['zone_idx'] = zones_3857.index
        
        # Spatial join to find all anchor-zone intersections
        intersections = gpd.sjoin(
            zones_3857[['zone_idx', 'geometry']], 
            anchors_3857[['geometry']], 
            how='left', 
            predicate='intersects'
        )
        
        # Count intersections per zone
        connectivity_counts = intersections.groupby('zone_idx').size().to_dict()
        
        # Limit to first 30 zones for hackathon performance
        zones_to_process = zones_3857.head(30) if len(zones_3857) > 30 else zones_3857
        
        # Convert GDF rows to list of dicts with scoring
        for idx, row in zones_to_process.iterrows():
            # AREA CALCULATION (in sqm, already in EPSG:3857)
            area_sqm = row.geometry.area
            area_sqkm = area_sqm / 1_000_000
            
            # CONNECTIVITY - Get precomputed count from spatial join
            connected_anchors = connectivity_counts.get(idx, 0)
            
            # LANDMARK PROXIMITY SCORING
            landmark_score = 0
            nearby_landmarks = []
            zone_centroid = row["centroid"]
            
            for _, landmark in landmarks_gdf.iterrows():
                distance_m = zone_centroid.distance(landmark.geometry)
                if distance_m <= 500:
                    landmark_score += 5
                    nearby_landmarks.append(landmark["name"])
            
            landmark_score = min(landmark_score, 15)
            
            # UPVOTES (will be loaded from storage)
            upvotes = 0
            
            # COMPUTE TOTAL SCORE
            score = 0
            
            # Area importance (max 30)
            if area_sqm >= 200000:
                score += 30
            elif area_sqm >= 120000:
                score += 20
            elif area_sqm >= 80000:
                score += 10
            
            # Connectivity importance (max 25)
            if connected_anchors >= 10:
                score += 25
            elif connected_anchors >= 7:
                score += 23
            elif connected_anchors >= 5:
                score += 20
            elif connected_anchors == 4:
                score += 16
            elif connected_anchors == 3:
                score += 12
            elif connected_anchors == 2:
                score += 8
            
            # Landmark proximity (max 15)
            score += landmark_score
            
            # Public support (max 20)
            score += min(upvotes * 2, 20)
            
            # Clamp to 100
            final_score = min(score, 100)
            
            # ENHANCED DEBUG LOGGING
            print(f"[DEBUG] Zone {idx}:")
            print(f"  ZONE AREA: {area_sqm:.0f} sqm ({area_sqkm:.2f} sq km)")
            print(f"  CONNECTED ANCHORS: {connected_anchors}")
            print(f"  LANDMARKS NEARBY: {nearby_landmarks}")
            print(f"  FINAL SCORE: {final_score}")
            
            # FILTER: Skip zones with only 1 anchor (not a true corridor)
            if connected_anchors < 2:
                print(f"  [SKIPPED] Zone only connects {connected_anchors} anchor(s)")
                continue
            
            # Get original geometry in EPSG:4326
            original_geom = corridors_gdf.loc[idx, 'geometry']
            
            corridors.append({
                "id": f"zone_{row.get('zone_id', idx)}",
                "area_sqm": int(area_sqm),
                "area_sqkm": round(area_sqkm, 2),
                "connected_anchors": connected_anchors,
                "score": final_score,
                "nearby_landmarks": nearby_landmarks,
                "upvotes": upvotes,
                "geometry": original_geom.__geo_interface__
            })
        
        print("[INFO] SCORING END")

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
                    "area_sqm": c.get("area_sqm", 0),
                    "area_sqkm": c.get("area_sqkm", 0),
                    "connected_anchors": c.get("connected_anchors", 0),
                    "score": c.get("score", 0),
                    "nearby_landmarks": c.get("nearby_landmarks", []),
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
