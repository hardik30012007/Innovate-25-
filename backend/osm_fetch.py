import requests

OVERPASS_URL = "http://overpass-api.de/api/interpreter"

DELHI_BBOX = (28.40, 76.80, 28.90, 77.40)

def fetch_green_osm_data():
    query = f"""
    [out:json][timeout:25];
    (
      way["leisure"="park"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
      way["leisure"="garden"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
      way["landuse"="forest"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
      way["landuse"="grass"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
      way["natural"="wood"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
      way["natural"="grassland"]({DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]});
    );
    out body;
    >;
    out skel qt;
    """
    response = requests.post(OVERPASS_URL, data=query)
    return response.json()
