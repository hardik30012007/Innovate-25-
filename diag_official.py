
import json
from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 
    return c * r

# Load Suggested Corridors
with open('c:/git/Innovate-25-/backend/storage/corridors.json', 'r') as f:
    corridors = json.load(f)

# Suggested: Zone 9 (zone_8), Zone 6 (zone_5)
z9 = next(z for z in corridors if z['id'] == 'zone_8')
z6 = next(z for z in corridors if z['id'] == 'zone_5')

def get_centroid(coords):
    pts = coords[0]
    lats = [p[1] for p in pts]
    lons = [p[0] for p in pts]
    return sum(lons)/len(lons), sum(lats)/len(lats)

z9_lon, z9_lat = get_centroid(z9['geometry']['coordinates'])
z6_lon, z6_lat = get_centroid(z6['geometry']['coordinates'])

# Load Official Green Zones
with open('c:/git/Innovate-25-/data/existing_green_zones_delhi.geojson', 'r') as f:
    official = json.load(f)

print(f"Checking {len(official['features'])} features in official GeoJSON...")

z9_min = float('inf')
z6_min = float('inf')

for f in official['features']:
    geom = f['geometry']
    coords = []
    if geom['type'] == 'Polygon':
        coords = geom['coordinates'][0]
    elif geom['type'] == 'MultiPolygon':
        coords = geom['coordinates'][0][0]
    
    for p in coords:
        d9 = haversine(z9_lon, z9_lat, p[0], p[1])
        if d9 < z9_min: z9_min = d9
        
        d6 = haversine(z6_lon, z6_lat, p[0], p[1])
        if d6 < z6_min: z6_min = d6

print(f"Zone 9 Min Dist to Official: {z9_min:.4f} km")
print(f"Zone 6 Min Dist to Official: {z6_min:.4f} km")
