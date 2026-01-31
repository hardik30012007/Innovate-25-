import sys
import os

# Add the current directory to sys.path so we can import from backend
sys.path.append(os.getcwd())

from backend.osm_fetch import fetch_osm_green
from backend.green_anchor_processor import generate_green_anchors

print("Fetching OSM data...")
data = fetch_osm_green()
print(f"Raw Elements: {len(data.get('elements', []))}")

print("Generating Green Anchors...")
gdf = generate_green_anchors()
print(f"Green Anchors: {len(gdf)}")
if not gdf.empty:
    print(f"Areas: {gdf.geometry.area.tolist()}")
