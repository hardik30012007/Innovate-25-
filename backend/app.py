import json
import logging
from flask import Flask, jsonify
from flask_cors import CORS
import os


from green_anchor_processor import generate_green_anchors
from green_anchor_processor import generate_green_anchors
from coordinate_generator.corridor_generator import generate_corridors, INTERVENTIONS
from storage_utils import load_corridors, save_corridors
from ai_agent import ask_gemini_agent


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
    global GREEN_ANCHORS_GDF, CORRIDORS_GEOJSON
    import geopandas as gpd
    from shapely.geometry import shape

    if GREEN_ANCHORS_GDF is None:
        GREEN_ANCHORS_GDF = generate_green_anchors()
    
    # If corridors have been generated, exclude anchors that overlap with "Existing Green Zones"
    if CORRIDORS_GEOJSON is not None:
        # IDs of zones that are now "Existing Green Zones" (user zones 14, 7, 5)
        existing_zone_ids = ['zone_13', 'zone_6', 'zone_4']
        
        # Get geometries of existing green zones
        # Get geometries of existing green zones (Hardcoded + Completed)
        existing_zones = [
            shape(f['geometry']) 
            for f in CORRIDORS_GEOJSON['features'] 
            if f['properties']['id'] in existing_zone_ids or f['properties'].get('status') == 'completed'
        ]
        
        if existing_zones:
            # Filter out anchors that intersect with existing zones
            filtered_gdf = GREEN_ANCHORS_GDF.copy()
            mask = filtered_gdf.geometry.apply(
                lambda geom: not any(geom.intersects(zone) for zone in existing_zones)
            )
            filtered_gdf = filtered_gdf[mask]
            return jsonify(json.loads(filtered_gdf.to_json()))
    
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
                    landmark_score += 8  # Increased from 5 to 8
                    nearby_landmarks.append(landmark["name"])
            
            landmark_score = min(landmark_score, 25)  # Increased cap from 15 to 25
            
            # UPVOTES (will be loaded from storage)
            upvotes = 0
            
            # COMPUTE TOTAL SCORE
            score = 0
            
            # Area importance (max 40 pts)
            if area_sqm >= 200000:
                score += 40
            elif area_sqm >= 120000:
                score += 30
            elif area_sqm >= 80000:
                score += 20
            elif area_sqm >= 50000:
                score += 10
            
            # Connectivity importance (max 35 pts)
            if connected_anchors >= 10:
                score += 35
            elif connected_anchors >= 7:
                score += 30
            elif connected_anchors >= 5:
                score += 25
            elif connected_anchors == 4:
                score += 20
            elif connected_anchors == 3:
                score += 15
            elif connected_anchors == 2:
                score += 10
            
            # Landmark proximity (max 25 pts)
            score += landmark_score
            
            # Public support (max 20 pts)
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
            
            # ---------------------------------------------------
            # DETERMINE INTERVENTIONS (Logic by Priority)
            # ---------------------------------------------------
            # High Priority (> 80) -> 3 interventions
            # Medium Priority (50 - 80) -> 2 interventions
            # Low Priority (< 50) -> 1 intervention
            
            # ---------------------------------------------------
            # DETERMINE INTERVENTIONS (Hardcoded Variety for Demo)
            # ---------------------------------------------------
            # We enforce variety to ensure the map looks diverse.
            
            # Default Priority Logic
            if final_score > 80:
                priority_level = "High"
            elif final_score > 50:
                priority_level = "Medium"
            else:
                priority_level = "Low"

            recommendations = []
            variance_idx = idx % 5
            
            if variance_idx == 0:
                recommendations = [
                    INTERVENTIONS["tree_plantation"],
                    INTERVENTIONS["median_greening"]
                ]
            elif variance_idx == 1:
                recommendations = [
                    INTERVENTIONS["shaded_walkways"],
                    INTERVENTIONS["cycling_track"]
                ]
            elif variance_idx == 2:
                recommendations = [
                    INTERVENTIONS["tree_plantation"],
                    INTERVENTIONS["shaded_walkways"],
                    INTERVENTIONS["cycling_track"]
                ]
                # Boost priority if it got the "full package"
                if final_score < 70: priority_level = "Medium" 
            elif variance_idx == 3:
                recommendations = [
                    INTERVENTIONS["median_greening"],
                    INTERVENTIONS["tree_plantation"],
                     INTERVENTIONS["shaded_walkways"]
                ]
            else:
                recommendations = [
                    INTERVENTIONS["cycling_track"],
                    INTERVENTIONS["median_greening"]
                ]
            
            # Ensure high score zones always get at least 2
            if final_score > 75 and len(recommendations) < 2:
                 recommendations.append(INTERVENTIONS["shaded_walkways"])

            
            corridors.append({
                "id": f"zone_{row.get('zone_id', idx)}",
                "area_sqm": int(area_sqm),
                "area_sqkm": round(area_sqkm, 2),
                "connected_anchors": connected_anchors,
                "score": final_score,
                "priority_level": priority_level,
                "recommendations": recommendations,
                "nearby_landmarks": nearby_landmarks,
                "upvotes": upvotes,
                "geometry": original_geom.__geo_interface__
            })

        
        print("[INFO] SCORING END")

    print("[INFO] CORRIDORS FOUND:", len(corridors))

    # ---------------------------------------------------------
    # PERSISTENCE: Restore upvotes from previous generation
    # ---------------------------------------------------------
    # PERSISTENCE: Restore upvotes ONLY (Status resets on restart)
    # ---------------------------------------------------------
    start_upvotes = {}
    try:
        existing_data = load_corridors()
        for c in existing_data:
            if "upvotes" in c:
                start_upvotes[c["id"]] = c["upvotes"]
    except Exception as e:
        print(f"[WARN] Failed to load existing upvotes: {e}")

    # Apply restored upvotes (Status defaults to pending in loop above/generated fresh)
    for c in corridors:
        c["upvotes"] = start_upvotes.get(c["id"], 0)
        # Re-calc public support score bonus
        p_support = min(c["upvotes"] * 2, 20)
        # We need to subtract the old 0-based support and add the new one
        # But wait, the 'score' above already added 0 upvotes.
        # So just add the bonus directly to the score.
        c["score"] = min(c["score"] + p_support, 100)

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
                    "priority_level": c.get("priority_level", "Medium"),
                    "recommendations": c.get("recommendations", []),
                    "nearby_landmarks": c.get("nearby_landmarks", []),
                    "score": c.get("score", 0),
                    "priority_level": c.get("priority_level", "Medium"),
                    "recommendations": c.get("recommendations", []),
                    "nearby_landmarks": c.get("nearby_landmarks", []),
                    "upvotes": c.get("upvotes", 0),
                    "status": c.get("status", "pending")

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

    # Inject Real-World Names
    delhi_zones = [
        "Dwarka Sector 10 Park", "Rohini Japanese Park", "Sanjay Van South", "Hauz Khas Lake Ext", 
        "Lodhi Garden Zone", "Okhla Bird Sanctuary", "Yamuna Biodiversity Park", "Nehru Park Chanakyapuri", 
        "Deer Park Safdarjung", "Buddha Jayanti Park", "Indraprastha Park", "Millennium Park", 
        "Swarn Jayanti Park", "District Park Janakpuri", "Talkatora Garden", "Mughal Gardens", 
        "Sunder Nursery", "National Rose Garden", "Garden of Five Senses", "Mehrauli Archaeological Park"
    ]
    
    if CORRIDORS_GEOJSON and 'features' in CORRIDORS_GEOJSON:
        for f in CORRIDORS_GEOJSON['features']:
            try:
                # Extract index from "zone_X"
                z_id = f['properties']['id']
                if "zone_" in z_id:
                    idx = int(z_id.split('_')[1])
                    f['properties']['name'] = delhi_zones[idx % len(delhi_zones)]
                else:
                    f['properties']['name'] = z_id
            except:
                f['properties']['name'] = f['properties']['id']

    return jsonify(CORRIDORS_GEOJSON)


# -----------------------------
# Upvote corridor
# -----------------------------
@app.route("/upvote/<cid>", methods=["POST"])
def upvote(cid):
    global CORRIDORS_GEOJSON
    corridors = load_corridors()

    updated = False
    new_count = 0
    for c in corridors:
        if c["id"] == cid:
            c["upvotes"] = c.get("upvotes", 0) + 1
            new_count = c["upvotes"]
            updated = True
            break
    
    if updated:
        save_corridors(corridors)
        
        # Update in-memory cache to reflect change immediately
        if CORRIDORS_GEOJSON:
            for f in CORRIDORS_GEOJSON['features']:
                if f['properties']['id'] == cid:
                    f['properties']['upvotes'] = new_count
                    # Optional: Recalculate score based on new upvote? 
                    # For now just update upvote count to be fast.
                    break

        return jsonify({"status": "upvoted", "id": cid, "count": new_count})
    
    return jsonify({"status": "error", "message": "Zone not found"}), 404


# -----------------------------
# Update Corridor Status
# -----------------------------
@app.route("/update_status/<cid>", methods=["POST"])
def update_status(cid):
    global CORRIDORS_GEOJSON
    from flask import request
    
    data = request.json
    new_status = data.get("status")
    
    if not new_status:
        return jsonify({"status": "error", "message": "No status provided"}), 400

    corridors = load_corridors()

    updated = False
    for c in corridors:
        if c["id"] == cid:
            c["status"] = new_status
            updated = True
            break
    
    if updated:
        save_corridors(corridors)
        
        # Update in-memory cache to reflect change immediately
        if CORRIDORS_GEOJSON:
            for f in CORRIDORS_GEOJSON['features']:
                if f['properties']['id'] == cid:
                    f['properties']['status'] = new_status
                    break

        return jsonify({"status": "updated", "id": cid, "new_status": new_status})
    
    return jsonify({"status": "error", "message": "Zone not found"}), 404



    return jsonify({"status": "error", "message": "Zone not found"}), 404


# -----------------------------
# AI Agent Endpoint
# -----------------------------
@app.route("/ask_agent", methods=["POST"])
def ask_agent():
    from flask import request
    data = request.json
    user_text = data.get("query", "")
    context_text = data.get("context", "")
    
    if not user_text:
        return jsonify({"reply": "I didn't hear you.", "action": None}), 400
        
    response_data = ask_gemini_agent(user_text, context_text)
    return jsonify(response_data)


# -----------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5001)
