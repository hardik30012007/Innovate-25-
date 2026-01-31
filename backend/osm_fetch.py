import requests

OVERPASS_URL = "http://overpass-api.de/api/interpreter"

# Delhi bounding box (south, west, north, east)
DELHI_BBOX = (28.40, 76.80, 28.90, 77.40)


def fetch_green_osm_data():
    bbox = f"{DELHI_BBOX[0]},{DELHI_BBOX[1]},{DELHI_BBOX[2]},{DELHI_BBOX[3]}"

    query = f"""
    [out:json][timeout:25];
    (
      way["landuse"="forest"]({bbox});
      way["natural"="wood"]({bbox});
      relation["boundary"="protected_area"]({bbox});
    );
    out body;
    >;
    out skel qt;
    """

    response = requests.post(OVERPASS_URL, data=query)
    response.raise_for_status()
    return response.json()
