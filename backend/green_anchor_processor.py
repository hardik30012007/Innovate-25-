import geopandas as gpd
from shapely.geometry import Polygon
from osm_fetch import fetch_osm_green

MIN_AREA_SQM = 10000  # 1 hectare

def generate_green_anchors():
    data = fetch_osm_green()
    nodes = {}
    polygons = []

    for el in data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    for el in data["elements"]:
        if el["type"] == "way" and "nodes" in el:
            coords = [nodes[n] for n in el["nodes"] if n in nodes]
            if len(coords) < 4:
                continue

            if coords[0] != coords[-1]:
                coords.append(coords[0])

            poly = Polygon(coords)
            if not poly.is_valid:
                continue

            polygons.append({"geometry": poly})

    gdf = gpd.GeoDataFrame(polygons, crs="EPSG:4326")

    if gdf.empty:
        return gdf

    gdf = gdf.to_crs(epsg=3857)
    gdf = gdf[gdf.geometry.area >= MIN_AREA_SQM]
    gdf = gdf.to_crs(epsg=4326)

    return gdf
