
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

with open('c:/git/Innovate-25-/backend/storage/corridors.json', 'r') as f:
    data = json.load(f)

z9_coords = next(z for z in data if z['id'] == 'zone_8')['geometry']['coordinates'][0]
z7_coords = next(z for z in data if z['id'] == 'zone_6')['geometry']['coordinates'][0]

min_dist = float('inf')
for p9 in z9_coords:
    for p7 in z7_coords:
        d = haversine(p9[0], p9[1], p7[0], p7[1])
        if d < min_dist:
            min_dist = d

print(f"Absolute Min Distance (Perimeter to Perimeter): {min_dist:.4f} km ({min_dist*1000:.1f} m)")
