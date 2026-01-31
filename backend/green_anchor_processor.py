import os
import geopandas as gpd

# Absolute path to data file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "existing_green_zones_delhi.geojson")

# Minimum area to qualify as a GREEN ANCHOR
# 50,000 sqm ≈ 5 hectares → meaningful parks / forests only
MIN_AREA_SQM = 150_000


def generate_green_anchors():
    # Safety: file existence
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Green zones file not found at: {DATA_PATH}")
        return gpd.GeoDataFrame()

    # Read GeoJSON
    gdf = gpd.read_file(DATA_PATH)
    if gdf.empty:
        print("[WARN] Green zones file is empty")
        return gpd.GeoDataFrame()

    # Ensure CRS is set (assume WGS84 if missing)
    if gdf.crs is None:
        gdf.set_crs(epsg=4326, inplace=True)

    # Keep only valid polygon geometries
    gdf = gdf[gdf.geometry.type.isin(["Polygon", "MultiPolygon"])]

    # Project to meters for accurate area calculation
    gdf = gdf.to_crs(epsg=3857)

    # Calculate area
    gdf["area_sqm"] = gdf.geometry.area

    # Filter only LARGE green areas (real anchors)
    gdf = gdf[gdf["area_sqm"] >= MIN_AREA_SQM]

    # Project back to lat/lon for downstream processing
    gdf = gdf.to_crs(epsg=4326)

    # Assign stable anchor IDs (important for corridors)
    gdf = gdf.reset_index(drop=True)
    gdf["anchor_id"] = gdf.index.astype(str)

    print(f"[INFO] Green anchors identified: {len(gdf)}")

    return gdf
