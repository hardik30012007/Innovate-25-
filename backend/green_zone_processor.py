import geopandas as gpd
from shapely.geometry import Polygon
from osm_fetch import fetch_green_osm_data


def process_green_zones():
    data = fetch_green_osm_data()

    nodes = {}
    polygons = []

    # 1️⃣ Store nodes
    for el in data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    # 2️⃣ Build polygons (ONLY forests / woods / protected)
    for el in data["elements"]:
        if el["type"] != "way" or "nodes" not in el:
            continue

        tags = el.get("tags", {})

        if not (
            tags.get("landuse") == "forest"
            or tags.get("natural") == "wood"
            or tags.get("boundary") == "protected_area"
        ):
            continue

        coords = [nodes[n] for n in el["nodes"] if n in nodes]
        if len(coords) < 4:
            continue

        if coords[0] != coords[-1]:
            coords.append(coords[0])

        poly = Polygon(coords)
        if not poly.is_valid:
            continue

        polygons.append(poly)

    if not polygons:
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:4326")

    # 3️⃣ Create GeoDataFrame
    gdf = gpd.GeoDataFrame(geometry=polygons, crs="EPSG:4326")

    # 🔥 4️⃣ MERGE EVERYTHING SPATIALLY
    merged = gdf.unary_union

    # 🔥 5️⃣ SPLIT INTO CONNECTED COMPONENTS
    gdf = gpd.GeoDataFrame(geometry=[merged], crs="EPSG:4326")
    gdf = gdf.explode(index_parts=False).reset_index(drop=True)

    # 6️⃣ Convert to meters
    gdf = gdf.to_crs(epsg=3857)

    # 🔒 7️⃣ HARD CITY-SCALE THRESHOLD (50 Ha)
    gdf = gdf[gdf.geometry.area >= 500000]  # 50 hectares
    
    if gdf.empty:
        print("⚠️ No areas found >= 50ha")
        return gdf

    # 8️⃣ Simplify
    gdf["geometry"] = gdf.geometry.simplify(
        tolerance=30,
        preserve_topology=True
    )

    # 9️⃣ Back to lat/lon
    gdf = gdf.to_crs(epsg=4326)

    return gdf
