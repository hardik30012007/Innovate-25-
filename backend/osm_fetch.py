import requests

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
BBOX = "28.40,76.80,28.90,77.40"  # Delhi

def fetch_osm_green():
    query = f"""
    [out:json][timeout:25];
    (
      way["leisure"="park"]({BBOX});
      way["landuse"="forest"]({BBOX});
      way["natural"="wood"]({BBOX});
      relation["boundary"="protected_area"]({BBOX});
    );
    out body;
    >;
    out skel qt;
    """
    response = requests.post(OVERPASS_URL, data=query)
    
    if response.status_code != 200:
        print(f"Overpass Error {response.status_code}: {response.text}")
        return {"elements": []}
    
    try:
        return response.json()
    except Exception as e:
        print("Overpass JSON Decode Error:", e)
        return {"elements": []}
