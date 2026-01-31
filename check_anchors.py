import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.green_anchor_processor import generate_green_anchors

print("Running generate_green_anchors...")
try:
    gdf = generate_green_anchors()
    print(f"Result Count: {len(gdf)}")
    if not gdf.empty:
        # gdf has 'area_sqm' column from our processor
        areas = gdf['area_sqm']
        print(f"Min Area: {areas.min()}")
        print(f"Max Area: {areas.max()}")
        print(f"Count < 50,000: {sum(areas < 50000)}")
        print("Sample Areas (first 5):", areas.head().tolist())

except Exception as e:
    print(f"Error: {e}")
