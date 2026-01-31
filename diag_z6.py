
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

z6_coords = next(z for z in data if z['id'] == 'zone_5')['geometry']['coordinates'][0]

impl_ids = ['zone_4', 'zone_6', 'zone_13']
impl_zones = [z for z in data if z['id'] in impl_ids]

min_overall = float('inf')
for iz in impl_zones:
    for p_impl in iz['geometry']['coordinates'][0]:
        for p6 in z6_coords:
            d = haversine(p6[0], p6[1], p_impl[0], p_impl[1])
            if d < min_overall:
                min_overall = d

print(f"Zone 6 Min Perimeter Distance: {min_overall:.4f} km ({min_overall*1000:.1f} m)")
