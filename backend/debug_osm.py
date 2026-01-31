from osm_fetch import fetch_osm_green
from green_anchor_processor import generate_green_anchors

print("Fetching OSM data...")
data = fetch_osm_green()
print(f"Raw Elements: {len(data.get('elements', []))}")

print("Generating Green Anchors...")
gdf = generate_green_anchors()
print(f"Green Anchors: {len(gdf)}")
if not gdf.empty:
    print(f"Areas: {gdf.geometry.area.tolist()}")
