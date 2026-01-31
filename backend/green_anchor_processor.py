import os
import geopandas as gpd
from shapely.geometry import Polygon

# Path to the local GeoJSON file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "existing_green_zones_delhi.geojson")

MIN_AREA_SQM = 10000  # 1 hectare

def generate_green_anchors():
    if not os.path.exists(DATA_PATH):
        print(f"Error: Data file not found at {DATA_PATH}")
        return gpd.GeoDataFrame()

    try:
        gdf = gpd.read_file(DATA_PATH)
    except Exception as e:
        print(f"Error reading GeoJSON: {e}")
        return gpd.GeoDataFrame()

    if gdf.empty:
        return gdf

    # Ensure we are working with Polygons
    # (The file might contain MultiPolygons, checking geometry type is good practice)
    
    # Filter by area
    # Assuming input is 4326, project to 3857 for area calculation
    if gdf.crs != "EPSG:3857":
         gdf = gdf.to_crs(epsg=3857)
    
    gdf = gdf[gdf.geometry.area >= MIN_AREA_SQM]
    
    # Project back to 4326 for output/process
    gdf = gdf.to_crs(epsg=4326)

    return gdf
