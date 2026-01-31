
import json
from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

with open('c:/git/Innovate-25-/backend/storage/corridors.json', 'r') as f:
    data = json.load(f)

# Suggested: Zone 9 (zone_8)
z9 = next(z for z in data if z['id'] == 'zone_8')
# Implemented: Zone 7 (zone_6)
z7 = next(z for z in data if z['id'] == 'zone_6')

def get_centroid(coords):
    pts = coords[0]
    lats = [p[1] for p in pts]
    lons = [p[0] for p in pts]
    return sum(lons)/len(lons), sum(lats)/len(lats)

z9_lon, z9_lat = get_centroid(z9['geometry']['coordinates'])
z7_lon, z7_lat = get_centroid(z7['geometry']['coordinates'])

print(f"Zone 9 Centroid: {z9_lon}, {z9_lat}")
print(f"Zone 7 Centroid: {z7_lon}, {z7_lat}")

dist_centers = haversine(z9_lon, z9_lat, z7_lon, z7_lat)
print(f"Distance between centroids: {dist_centers:.4f} km")

# Min distance to any vertex
min_dist = float('inf')
for p7 in z7['geometry']['coordinates'][0]:
    d = haversine(z9_lon, z9_lat, p7[0], p7[1])
    if d < min_dist:
        min_dist = d
print(f"Min distance from Z9 center to Z7 perimeter: {min_dist:.4f} km")
