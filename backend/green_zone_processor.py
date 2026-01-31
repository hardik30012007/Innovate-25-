import geopandas as gpd
from shapely.geometry import Polygon
from osm_fetch import fetch_green_osm_data

def process_green_zones():
    data = fetch_green_osm_data()

    nodes = {}
    polygons = []

    for el in data["elements"]:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    for el in data["elements"]:
        if el["type"] == "way" and "nodes" in el:
            coords = [nodes[n] for n in el["nodes"] if n in nodes]
            if len(coords) > 3:
                polygons.append({
                    "geometry": Polygon(coords),
                    "source": "OSM",
                    "status": "Pre-existing Green Zone"
                })

    gdf = gpd.GeoDataFrame(polygons, crs="EPSG:4326")
    return gdf
