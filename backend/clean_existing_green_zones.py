import geopandas as gpd

INPUT_FILE = "backend/data/existing_green_zones_delhi.geojson"
OUTPUT_FILE = "backend/data/official_ecological_green_zones.geojson"

# -----------------------------
# CONFIG (TUNE ONCE)
# -----------------------------
MIN_AREA_HECTARES = 25          # policy-scale threshold
SIMPLIFY_TOLERANCE = 40         # meters

# -----------------------------
# LOAD DATA
# -----------------------------
gdf = gpd.read_file(INPUT_FILE)
print(f"Loaded {len(gdf)} raw polygons")

# -----------------------------
# AREA FILTERING
# -----------------------------
# Convert to meters for accurate area calculation
gdf = gdf.to_crs(epsg=3857)

# Calculate area in hectares
gdf["area_ha"] = gdf.geometry.area / 10_000

# Keep only large zones
gdf = gdf[gdf["area_ha"] >= MIN_AREA_HECTARES]
print(f"After area filter: {len(gdf)} polygons")

# -----------------------------
# SPATIAL CLEANING
# -----------------------------
# Merge touching polygons (ecological continuity)
merged = gdf.unary_union

# Split into connected components
gdf = gpd.GeoDataFrame(
    geometry=[merged],
    crs="EPSG:3857"
).explode(index_parts=False).reset_index(drop=True)

# Recalculate area post-merge
gdf["area_ha"] = gdf.geometry.area / 10_000

# Enforce threshold again (CRITICAL)
gdf = gdf[gdf["area_ha"] >= MIN_AREA_HECTARES]
print(f"After spatial merge: {len(gdf)} zones")

# -----------------------------
# SIMPLIFY GEOMETRY
# -----------------------------
gdf["geometry"] = gdf.geometry.simplify(
    tolerance=SIMPLIFY_TOLERANCE,
    preserve_topology=True
)

# -----------------------------
# ADD POLICY METADATA
# -----------------------------
gdf["authority"] = "official"
gdf["zone_type"] = "ecological_green_zone"
gdf["policy_relevant"] = True

# -----------------------------
# EXPORT CLEAN FILE
# -----------------------------
gdf = gdf.to_crs(epsg=4326)
gdf.to_file(OUTPUT_FILE, driver="GeoJSON")

print("✅ CLEAN FILE SAVED:")
print(OUTPUT_FILE)
print("Zones (final):", len(gdf))
print("Min area (ha):", round(gdf.area_ha.min(), 2))
