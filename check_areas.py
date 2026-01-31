import os
import geopandas as gpd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "existing_green_zones_delhi.geojson")

if not os.path.exists(DATA_PATH):
    print(f"File not found: {DATA_PATH}")
else:
    gdf = gpd.read_file(DATA_PATH)
    print(f"Total polygons: {len(gdf)}")
    
    if not gdf.empty:
        # Ensure CRS is 3857 for area calc
        if gdf.crs != "EPSG:3857":
            gdf = gdf.to_crs(epsg=3857)
            
        areas = gdf.geometry.area
        print(f"Max Area: {areas.max():.2f} sqm")
        print(f"Min Area: {areas.min():.2f} sqm")
        print(f"Mean Area: {areas.mean():.2f} sqm")
        
        print("\nTop 10 largest areas:")
        print(areas.nlargest(10).to_string())
        
        count_50k = sum(areas >= 50000)
        print(f"\nPolygons >= 50,000 sqm: {count_50k}")
        
        count_10k = sum(areas >= 10000)
        print(f"Polygons >= 10,000 sqm: {count_10k}")
